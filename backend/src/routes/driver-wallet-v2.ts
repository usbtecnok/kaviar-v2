import { Router, Request, Response } from 'express';
import { authenticateDriver } from '../middlewares/auth';
import { pool } from '../db';
import { WalletService } from '../services/wallet-v2/wallet.service';

const router = Router();
const walletService = new WalletService(pool);

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
    res.json({
      success: true,
      data: r.rows.map(p => ({ id: p.id, label: p.label, amount_cents: Number(p.amount_cents) })),
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
      'SELECT id, amount_cents, status, payment_provider, created_at, confirmed_at FROM wallet_recharges WHERE id = $1 AND driver_id = $2',
      [req.params.id, driverId]
    );
    if (!r.rows[0]) return res.status(404).json({ success: false, error: 'Recarga não encontrada' });
    const row = r.rows[0];
    res.json({ success: true, data: { ...row, amount_cents: Number(row.amount_cents) } });
  } catch (err) {
    console.error('[wallet-v2] GET /recharges/:id error:', (err as Error).message);
    res.status(500).json({ success: false, error: 'Erro ao consultar recarga' });
  }
});

export default router;
