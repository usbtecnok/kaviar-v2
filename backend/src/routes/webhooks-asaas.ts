import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { applyCreditDelta } from '../services/credit.service';
import { sendPushToDriver } from '../services/push.service';

const router = Router();
const WEBHOOK_TOKEN = process.env.ASAAS_WEBHOOK_TOKEN || '';

// IPs oficiais do Asaas (https://docs.asaas.com/docs/webhooks)
const ASAAS_ALLOWED_IPS = new Set([
  '54.94.19.48', '54.207.148.92', '54.94.145.49',
  '54.207.47.78', '54.94.171.142', '18.229.231.232',
  '54.94.183.101',
]);

// POST /api/webhooks/asaas
router.post('/asaas', async (req: Request, res: Response) => {
  // Validar IP de origem
  const clientIp = (req.ip || req.socket.remoteAddress || '').replace('::ffff:', '');
  if (process.env.NODE_ENV === 'production' && !ASAAS_ALLOWED_IPS.has(clientIp)) {
    console.warn(`[ASAAS_WEBHOOK] Blocked IP: ${clientIp}`);
    return res.status(200).json({ received: true });
  }

  // Validar token
  const incomingToken = req.headers['asaas-access-token'] as string;
  if (!WEBHOOK_TOKEN || incomingToken !== WEBHOOK_TOKEN) {
    console.warn('[ASAAS_WEBHOOK] Invalid token');
    return res.status(200).json({ received: true });
  }

  const { event, payment } = req.body;
  const paymentId = payment?.id;

  // Log event for audit
  let eventId: string | null = null;
  try {
    const ins = await pool.query(
      `INSERT INTO asaas_webhook_events (event_type, asaas_payment_id, payload, status)
       VALUES ($1, $2, $3, 'received') RETURNING id`,
      [event, paymentId, JSON.stringify(req.body)]
    );
    eventId = ins.rows[0].id;
  } catch (logErr) {
    console.error('[ASAAS_WEBHOOK] Failed to log event:', logErr);
  }

  // Only process payment confirmations
  if (!['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'].includes(event) || !paymentId) {
    return res.status(200).json({ received: true });
  }

  try {
    // ── Compensation flow ──
    const comp = await pool.query(
      'SELECT * FROM ride_compensations WHERE asaas_payment_id = $1',
      [paymentId]
    );
    if (comp.rows[0]) {
      const c = comp.rows[0];
      if (c.status === 'paid') {
        console.log(`[ASAAS_WEBHOOK] Compensation already paid: ${paymentId}`);
        if (eventId) await pool.query("UPDATE asaas_webhook_events SET status = 'duplicate', processed_at = NOW() WHERE id = $1", [eventId]);
        return res.status(200).json({ received: true });
      }
      await pool.query(
        `UPDATE ride_compensations SET status = 'paid', paid_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [c.id]
      );
      const creditResult = await applyCreditDelta(
        c.driver_id, c.credits_amount,
        `compensation:ride:${c.ride_id}`, 'system:compensation', `comp:${c.id}`
      );
      console.log(`[ASAAS_WEBHOOK] Compensation paid id=${c.id} driver=${c.driver_id} credits=${c.credits_amount} balance=${creditResult.balance} alreadyProcessed=${creditResult.alreadyProcessed}`);
      if (!creditResult.alreadyProcessed) {
        sendPushToDriver(c.driver_id, 'Compensação recebida', 'O passageiro cancelou após sua chegada e a compensação foi paga. +1 crédito foi adicionado à sua conta KAVIAR.')
          .catch((pushErr) => console.warn('[ASAAS_WEBHOOK] Failed to send compensation push:', pushErr));
      }
      if (eventId) await pool.query("UPDATE asaas_webhook_events SET status = 'processed', processed_at = NOW() WHERE id = $1", [eventId]);
      return res.status(200).json({ received: true });
    }

    // ── Commerce order flow ──
    const commerceOrder = await pool.query(
      'SELECT id, commerce_account_id, payment_status, commerce_net_cents FROM commerce_orders WHERE asaas_payment_id = $1',
      [paymentId]
    );
    if (commerceOrder.rows[0]) {
      const co = commerceOrder.rows[0];
      if (co.payment_status === 'paid') {
        console.log(`[ASAAS_WEBHOOK] Commerce order already paid: ${paymentId}`);
        if (eventId) await pool.query("UPDATE asaas_webhook_events SET status = 'duplicate', processed_at = NOW() WHERE id = $1", [eventId]);
        return res.status(200).json({ received: true });
      }
      // Transaction: mark paid + credit wallet
      await pool.query('BEGIN');
      try {
        await pool.query("UPDATE commerce_orders SET payment_status = 'paid', paid_at = NOW(), updated_at = NOW() WHERE id = $1", [co.id]);
        // Ensure wallet exists
        await pool.query(`INSERT INTO commerce_wallets (commerce_account_id) VALUES ($1) ON CONFLICT (commerce_account_id) DO NOTHING`, [co.commerce_account_id]);
        // Credit pending balance
        await pool.query(`UPDATE commerce_wallets SET pending_balance_cents = pending_balance_cents + $1, total_received_cents = total_received_cents + $1, updated_at = NOW() WHERE commerce_account_id = $2`, [co.commerce_net_cents, co.commerce_account_id]);
        // Get balance after
        const bal = await pool.query('SELECT pending_balance_cents + available_balance_cents as total FROM commerce_wallets WHERE commerce_account_id = $1', [co.commerce_account_id]);
        // Transaction log
        await pool.query(`INSERT INTO commerce_wallet_transactions (commerce_account_id, order_id, type, amount_cents, balance_after_cents, description) VALUES ($1, $2, 'ORDER_CREDIT', $3, $4, $5)`, [co.commerce_account_id, co.id, co.commerce_net_cents, bal.rows[0]?.total || 0, `Pedido pago via Pix`]);
        await pool.query('COMMIT');
        console.log(`[ASAAS_WEBHOOK] Commerce order paid: ${co.id} net=${co.commerce_net_cents}`);
      } catch (txErr) {
        await pool.query('ROLLBACK');
        throw txErr;
      }
      if (eventId) await pool.query("UPDATE asaas_webhook_events SET status = 'processed', processed_at = NOW() WHERE id = $1", [eventId]);
      return res.status(200).json({ received: true });
    }

    // ── Wallet V2 recharge flow ──
    const walletRecharge = await pool.query(
      "SELECT * FROM wallet_recharges WHERE external_id = $1 AND payment_provider = 'asaas'",
      [paymentId]
    );
    if (walletRecharge.rows[0]) {
      const wr = walletRecharge.rows[0];
      if (wr.status === 'confirmed') {
        console.log(`[ASAAS_WEBHOOK_V2] Already confirmed: ${paymentId}`);
        if (eventId) await pool.query("UPDATE asaas_webhook_events SET status = 'duplicate', processed_at = NOW() WHERE id = $1", [eventId]);
        return res.status(200).json({ received: true });
      }
      await pool.query("UPDATE wallet_recharges SET status = 'confirmed', confirmed_at = NOW(), updated_at = NOW() WHERE id = $1", [wr.id]);
      const { WalletService } = require('../services/wallet-v2/wallet.service');
      const { FeeSplitService } = require('../services/wallet-v2/fee-split.service');
      const { TerritoryLedgerService } = require('../services/wallet-v2/territory-ledger.service');
      const { PendingDebitService } = require('../services/wallet-v2/pending-debit.service');
      const walletSvc = new WalletService(pool);
      const feeSplitSvc = new FeeSplitService(pool);
      const ledgerSvc = new TerritoryLedgerService(pool);
      const pendingSvc = new PendingDebitService(pool);
      await walletSvc.ensureWallet(wr.driver_id);
      await walletSvc.creditRecharge(wr.driver_id, BigInt(wr.amount_cents), wr.id);
      // ── Recharge Bonus ──
      try {
        const bonusPercent = parseInt(process.env.RECHARGE_BONUS_PERCENT || '0');
        const campaignEnd = process.env.RECHARGE_BONUS_CAMPAIGN_END;
        const bonusFlag = await pool.query("SELECT enabled FROM feature_flags WHERE key = 'RECHARGE_BONUS_ENABLED' LIMIT 1");
        const bonusEnabled = bonusFlag.rows[0]?.enabled === true;
        if (bonusEnabled && bonusPercent > 0 && (!campaignEnd || new Date() <= new Date(campaignEnd))) {
          const bonusCents = BigInt(Math.floor(Number(wr.amount_cents) * bonusPercent / 100));
          if (bonusCents > BigInt(0)) {
            const bonusResult = await walletSvc.creditRechargeBonus(wr.driver_id, bonusCents, wr.id);
            if (!bonusResult.already_processed) {
              console.log(`[ASAAS_WEBHOOK_V2] Bonus credited driver=${wr.driver_id} bonus=${bonusCents} recharge=${wr.id}`);
            }
          }
        }
      } catch (bonusErr: any) { console.error(`[ASAAS_WEBHOOK_V2] Bonus error:`, bonusErr.message); }
      // Resolve pending debits after credit
      try {
        const resolved = await pendingSvc.resolveOnRecharge(wr.driver_id, walletSvc, feeSplitSvc, ledgerSvc);
        if (resolved > 0) console.log(`[ASAAS_WEBHOOK_V2] Resolved ${resolved} pending debit(s) for driver=${wr.driver_id}`);
      } catch (pendErr: any) { console.error(`[ASAAS_WEBHOOK_V2] resolveOnRecharge error:`, pendErr.message); }
      console.log(`[ASAAS_WEBHOOK_V2] Recharge confirmed id=${wr.id} driver=${wr.driver_id} amount=${wr.amount_cents}`);
      if (eventId) await pool.query("UPDATE asaas_webhook_events SET status = 'processed', processed_at = NOW() WHERE id = $1", [eventId]);
      return res.status(200).json({ received: true });
    }

    // ── Credit purchase flow ──
    // Find purchase
    const purchase = await pool.query(
      'SELECT * FROM driver_credit_purchases WHERE asaas_payment_id = $1',
      [paymentId]
    );

    if (!purchase.rows[0]) {
      console.warn(`[ASAAS_WEBHOOK] Purchase not found for payment ${paymentId}`);
      if (eventId) await pool.query("UPDATE asaas_webhook_events SET status = 'ignored', error = 'purchase_not_found', processed_at = NOW() WHERE id = $1", [eventId]);
      return res.status(200).json({ received: true });
    }

    const p = purchase.rows[0];

    // Skip if already confirmed (idempotent)
    if (p.status === 'confirmed') {
      console.log(`[ASAAS_WEBHOOK] Already confirmed: ${paymentId}`);
      if (eventId) await pool.query("UPDATE asaas_webhook_events SET status = 'duplicate', processed_at = NOW() WHERE id = $1", [eventId]);
      return res.status(200).json({ received: true });
    }

    // Update purchase status
    await pool.query(
      `UPDATE driver_credit_purchases SET status = 'confirmed', paid_at = NOW(), updated_at = NOW(), raw_payload = $1 WHERE id = $2`,
      [JSON.stringify(req.body), p.id]
    );

    // Credit the driver (idempotent via key)
    const result = await applyCreditDelta(
      p.driver_id,
      p.credits_amount,
      `purchase:PIX:${p.id}`,
      'system:asaas',
      `asaas:${paymentId}`
    );

    console.log(`[ASAAS_WEBHOOK] Credited driver=${p.driver_id} credits=${p.credits_amount} balance=${result.balance} alreadyProcessed=${result.alreadyProcessed}`);

    if (eventId) await pool.query("UPDATE asaas_webhook_events SET status = 'processed', processed_at = NOW() WHERE id = $1", [eventId]);
  } catch (err: any) {
    console.error(`[ASAAS_WEBHOOK] Processing error for ${paymentId}:`, err);
    if (eventId) await pool.query("UPDATE asaas_webhook_events SET status = 'error', error = $1, processed_at = NOW() WHERE id = $2", [err.message, eventId]);
  }

  res.status(200).json({ received: true });
});

export default router;
