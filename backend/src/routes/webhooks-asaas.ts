import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { applyCreditDelta } from '../services/credit.service';

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
