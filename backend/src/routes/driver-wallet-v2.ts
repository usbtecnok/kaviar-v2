import { Router, Request, Response } from 'express';
import { authenticateDriver } from '../middlewares/auth';
import { pool } from '../db';
import { WalletService } from '../services/wallet-v2/wallet.service';
import { FeeSplitService } from '../services/wallet-v2/fee-split.service';
import { TerritoryLedgerService } from '../services/wallet-v2/territory-ledger.service';
import { PendingDebitService } from '../services/wallet-v2/pending-debit.service';
import crypto from 'crypto';
import { ensureAsaasCustomer, createPixPayment } from '../services/asaas.service';
import { createSumUpCheckout, getSumUpCheckout, isSumUpEnabled, SumUpError } from '../services/sumup-service';

const router = Router();
const walletService = new WalletService(pool);
const feeSplitService = new FeeSplitService(pool);
const territoryLedgerService = new TerritoryLedgerService(pool);
const pendingDebitService = new PendingDebitService(pool);

let cachedWalletV2Flag: { value: boolean; at: number } | null = null;
export async function isWalletV2Enabled(): Promise<boolean> {
  if (cachedWalletV2Flag && Date.now() - cachedWalletV2Flag.at < 60000) return cachedWalletV2Flag.value;
  let enabled = false;
  try {
    const r = await pool.query("SELECT enabled FROM feature_flags WHERE key = 'WALLET_V2_ENABLED' LIMIT 1");
    enabled = r.rows[0]?.enabled === true;
  } catch {
    enabled = process.env.WALLET_V2_ENABLED === 'true';
  }
  cachedWalletV2Flag = { value: enabled, at: Date.now() };
  return enabled;
}
export function _resetWalletV2Cache() { cachedWalletV2Flag = null; }

router.use(authenticateDriver);

// GET /api/v2/drivers/me/wallet
router.get('/', async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).driverId;
    await walletService.ensureWallet(driverId);
    const balance = await walletService.getBalance(driverId);
    res.json({
      success: true,
      data: {
        balance_cents: Number(balance.balance_cents),
        reserved_cents: Number(balance.reserved_cents),
        available_cents: Number(balance.available_cents),
        balance_display: `R$ ${(Number(balance.balance_cents) / 100).toFixed(2).replace('.', ',')}`,
      },
    });
  } catch (err) {
    console.error('[wallet-v2] GET /wallet error:', (err as Error).message);
    res.status(500).json({ success: false, error: 'Erro ao consultar saldo' });
  }
});

// GET /api/v2/drivers/me/wallet/packages
router.get('/packages', async (_req: Request, res: Response) => {
  try {
    const r = await pool.query('SELECT id, label, amount_cents, sort_order FROM recharge_packages WHERE is_active = true ORDER BY sort_order');

    let familyReturnPercent = 0;
    try {
      const flag = await pool.query("SELECT enabled FROM feature_flags WHERE key = 'FAMILY_RETURN_ENABLED' LIMIT 1");
      if (flag.rows[0]?.enabled) {
        familyReturnPercent = parseInt(process.env.FAMILY_RETURN_PERCENT || '0');
      }
    } catch {}

    res.json({
      success: true,
      data: r.rows.map(p => ({
        id: p.id,
        label: p.label,
        amount_cents: Number(p.amount_cents),
        family_return_percent: familyReturnPercent,
        family_return_cents: familyReturnPercent > 0 ? Math.floor(Number(p.amount_cents) * familyReturnPercent / 100) : 0,
      })),
      family_return: familyReturnPercent > 0 ? { percent: familyReturnPercent, message: 'Acumule no Retorno Familiar KAVIAR' } : null,
    });
  } catch (err) {
    console.error('[wallet-v2] GET /packages error:', (err as Error).message);
    res.status(500).json({ success: false, error: 'Erro ao listar pacotes' });
  }
});

// GET /api/v2/drivers/me/wallet/ledger?limit=20&offset=0
router.get('/ledger', async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).driverId;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const offset = Number(req.query.offset) || 0;

    const [entries, countResult] = await Promise.all([
      pool.query(
        'SELECT id, entry_type, balance_delta_cents, reserved_delta_cents, balance_after_cents, reason, reference_type, reference_id, created_at FROM wallet_ledger WHERE driver_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
        [driverId, limit, offset]
      ),
      pool.query('SELECT COUNT(*) as total FROM wallet_ledger WHERE driver_id = $1', [driverId]),
    ]);

    res.json({
      success: true,
      data: {
        entries: entries.rows.map(e => ({
          ...e,
          balance_delta_cents: Number(e.balance_delta_cents),
          reserved_delta_cents: Number(e.reserved_delta_cents),
          balance_after_cents: Number(e.balance_after_cents),
        })),
        total: Number(countResult.rows[0].total),
        limit,
        offset,
      },
    });
  } catch (err) {
    console.error('[wallet-v2] GET /ledger error:', (err as Error).message);
    res.status(500).json({ success: false, error: 'Erro ao listar lançamentos' });
  }
});

// GET /api/v2/drivers/me/wallet/recharges/:id
router.get('/recharges/:id', async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).driverId;
    const r = await pool.query(
      'SELECT id, driver_id, amount_cents, status, payment_provider, external_id, created_at, confirmed_at FROM wallet_recharges WHERE id = $1 AND driver_id = $2',
      [req.params.id, driverId]
    );
    if (!r.rows[0]) return res.status(404).json({ success: false, error: 'Recarga não encontrada' });
    let row = r.rows[0];

    if (row.payment_provider === 'sumup' && row.status === 'pending' && row.external_id) {
      try {
        const checkout = await getSumUpCheckout(row.external_id);
        const status = String(checkout.status || '').toUpperCase();

        if (status === 'PAID') {
          const confirmed = await pool.query(
            "UPDATE wallet_recharges SET status = 'confirmed', confirmed_at = NOW(), updated_at = NOW() WHERE id = $1 AND status = 'pending' RETURNING id, driver_id, amount_cents",
            [row.id]
          );

          if (confirmed.rows[0]) {
            const wr = confirmed.rows[0];
            await walletService.ensureWallet(wr.driver_id);
            await walletService.creditRecharge(wr.driver_id, BigInt(wr.amount_cents), wr.id);

            try {
              const frPercent = parseInt(process.env.FAMILY_RETURN_PERCENT || '0');
              const frFlag = await pool.query("SELECT enabled FROM feature_flags WHERE key = 'FAMILY_RETURN_ENABLED' LIMIT 1");
              if (frFlag.rows[0]?.enabled === true && frPercent > 0) {
                const idemKey = `family_return_accrual:${wr.id}`;
                const exists = await pool.query('SELECT id FROM family_return_accruals WHERE idempotency_key = $1', [idemKey]);
                if (!exists.rows[0]) {
                  const accrued = Math.floor(Number(wr.amount_cents) * frPercent / 100);
                  await pool.query(
                    `INSERT INTO family_return_accruals (driver_id, recharge_id, source_amount_cents, accrued_amount_cents, percent, status, idempotency_key) VALUES ($1, $2::uuid, $3, $4, $5, 'accrued', $6)`,
                    [wr.driver_id, wr.id, wr.amount_cents, accrued, frPercent, idemKey]
                  );
                }
              }
            } catch (frErr: any) {
              console.error(`[WALLET_V2_SUMUP] Family return error:`, frErr.message);
            }

            try {
              await pendingDebitService.resolveOnRecharge(wr.driver_id, walletService, feeSplitService, territoryLedgerService);
            } catch (pendErr: any) {
              console.error(`[WALLET_V2_SUMUP] resolveOnRecharge error:`, pendErr.message);
            }
          }
        } else if (status === 'FAILED' || status === 'EXPIRED') {
          await pool.query(
            "UPDATE wallet_recharges SET status = 'expired', updated_at = NOW() WHERE id = $1 AND status = 'pending'",
            [row.id]
          );
        }

        const refreshed = await pool.query(
          'SELECT id, amount_cents, status, payment_provider, created_at, confirmed_at FROM wallet_recharges WHERE id = $1 AND driver_id = $2',
          [req.params.id, driverId]
        );
        row = refreshed.rows[0] || row;
      } catch (sumupErr) {
        if (sumupErr instanceof SumUpError) {
          return res.status(502).json({ success: false, error: 'Não foi possível verificar pagamento no momento.' });
        }
        throw sumupErr;
      }
    }

    res.json({ success: true, data: { ...row, amount_cents: Number(row.amount_cents) } });
  } catch (err) {
    console.error('[wallet-v2] GET /recharges/:id error:', (err as Error).message);
    res.status(500).json({ success: false, error: 'Erro ao consultar recarga' });
  }
});

// POST /api/v2/drivers/me/wallet/recharge
router.post('/recharge', async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).driverId;
    const requestedProvider = req.body?.payment_provider === 'asaas' ? 'asaas' : 'sumup';
    const provider = isSumUpEnabled() && requestedProvider !== 'asaas' ? 'sumup' : 'asaas';

    if (!(await isWalletV2Enabled())) {
      return res.status(403).json({ success: false, error: 'Recarga V2 não disponível' });
    }

    const { package_id } = req.body;
    if (!package_id) return res.status(400).json({ success: false, error: 'package_id obrigatório' });

    const pkg = await pool.query('SELECT id, amount_cents, label FROM recharge_packages WHERE id = $1 AND is_active = true', [package_id]);
    if (!pkg.rows[0]) return res.status(400).json({ success: false, error: 'Pacote inválido ou inativo' });

    // Anti-spam: retornar existente se pending recente do mesmo pacote
    const recent = await pool.query(
      "SELECT id, amount_cents, pix_qr_code, pix_copy_paste, pix_expires_at, payment_provider FROM wallet_recharges WHERE driver_id=$1 AND package_id=$2 AND status='pending' AND external_id IS NOT NULL AND created_at > NOW() - INTERVAL '10 minutes' LIMIT 1",
      [driverId, package_id]
    );
    if (recent.rows[0] && provider === 'asaas') {
      const r = recent.rows[0];
      return res.json({ success: true, data: { rechargeId: r.id, amount_cents: Number(r.amount_cents), payment_provider: r.payment_provider || 'asaas', pix: { qrCode: r.pix_qr_code, copyPaste: r.pix_copy_paste, expiresAt: r.pix_expires_at } } });
    }

    // Anti-spam: max 3 pending válidas
    const countRes = await pool.query(
      "SELECT COUNT(*) as c FROM wallet_recharges WHERE driver_id=$1 AND status='pending' AND external_id IS NOT NULL AND (payment_provider = 'sumup' OR pix_expires_at > NOW())",
      [driverId]
    );
    if (Number(countRes.rows[0].c) >= 3) {
      return res.status(429).json({ success: false, error: 'Aguarde recargas pendentes expirarem' });
    }

    const rechargeId = crypto.randomUUID();
    const amountCents = Number(pkg.rows[0].amount_cents);

    // Insert pending (antes de chamar provider)
    await pool.query(
      "INSERT INTO wallet_recharges (id, driver_id, package_id, amount_cents, status, payment_provider, external_id, created_at, updated_at) VALUES ($1,$2,$3,$4,'pending',$5,NULL,NOW(),NOW())",
      [rechargeId, driverId, package_id, amountCents, provider]
    );

    if (provider === 'sumup') {
      try {
        const checkout = await createSumUpCheckout({
          checkout_reference: `wallet_v2:${rechargeId}`,
          amount: Math.round((amountCents / 100) * 100) / 100,
          currency: 'BRL',
          description: `KAVIAR: Recarga saldo ${pkg.rows[0].label}`,
          hosted_checkout: { enabled: true },
        });

        const checkoutUrl = checkout.hosted_checkout_url || checkout.checkout_url;
        if (!checkoutUrl) {
          await pool.query("UPDATE wallet_recharges SET status='expired', updated_at=NOW() WHERE id=$1", [rechargeId]);
          return res.status(502).json({ success: false, error: 'Checkout indisponível no momento. Tente novamente.' });
        }

        await pool.query(
          "UPDATE wallet_recharges SET external_id=$2, updated_at=NOW() WHERE id=$1",
          [rechargeId, checkout.id]
        );

        return res.json({
          success: true,
          data: {
            rechargeId,
            amount_cents: amountCents,
            payment_provider: 'sumup',
            checkout: {
              id: checkout.id,
              checkout_reference: checkout.checkout_reference || null,
              url: checkoutUrl,
              status: checkout.status || null,
            },
          },
        });
      } catch (sumupErr) {
        await pool.query("UPDATE wallet_recharges SET status='expired', updated_at=NOW() WHERE id=$1", [rechargeId]);
        if (sumupErr instanceof SumUpError) {
          const status = sumupErr.statusCode === 429 ? 429 : (sumupErr.statusCode >= 500 ? 502 : 400);
          return res.status(status).json({ success: false, error: sumupErr.safeMessage });
        }
        console.error(`[WALLET_RECHARGE_SUMUP_FAIL] driver=${driverId} recharge=${rechargeId}`);
        return res.status(502).json({ success: false, error: 'Erro ao criar checkout de pagamento. Tente novamente.' });
      }
    }

    // Provider padrão: Asaas
    try {
      const customerId = await ensureAsaasCustomer(driverId);
      const pix = await createPixPayment(customerId, amountCents, `wallet_v2:${rechargeId}`, `KAVIAR: Recarga saldo ${pkg.rows[0].label}`);

      await pool.query(
        "UPDATE wallet_recharges SET external_id=$2, pix_qr_code=$3, pix_copy_paste=$4, pix_expires_at=$5, updated_at=NOW() WHERE id=$1",
        [rechargeId, pix.paymentId, pix.qrCode, pix.copyPaste, pix.expirationDate]
      );

      res.json({ success: true, data: { rechargeId, amount_cents: amountCents, payment_provider: 'asaas', pix: { qrCode: pix.qrCode, copyPaste: pix.copyPaste, expiresAt: pix.expirationDate } } });
    } catch (asaasErr) {
      await pool.query("UPDATE wallet_recharges SET status='expired', updated_at=NOW() WHERE id=$1", [rechargeId]);
      console.error(`[WALLET_RECHARGE_ASAAS_FAIL] driver=${driverId} recharge=${rechargeId}`, (asaasErr as Error).message?.slice(0, 100));
      res.status(502).json({ success: false, error: 'Erro ao criar cobrança Pix. Tente novamente.' });
    }
  } catch (err) {
    console.error('[wallet-v2] POST /recharge error:', (err as Error).message);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

export default router;
