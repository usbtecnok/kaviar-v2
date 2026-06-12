/**
 * Driver Retorno Familiar KAVIAR — Solicitação pelo motorista (MVP)
 *
 * Não altera: credit_balance, driver_credit_ledger, driver_credit_purchases.
 */

import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { authenticateDriver } from '../middlewares/auth';

const router = Router();
router.use(authenticateDriver);

const DISCLAIMER = 'O Retorno Familiar KAVIAR é um programa voluntário de reconhecimento, sujeito a regras vigentes, disponibilidade financeira e aprovação administrativa. Não constitui salário, comissão, 13º, obrigação automática ou direito adquirido.';

// GET /api/v2/drivers/me/retorno-familiar — status + valor estimado
router.get('/', async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).driverId;
    const year = new Date().getFullYear();

    // Check active policy
    const policyResult = await pool.query(
      'SELECT * FROM retorno_familiar_policy WHERE year = $1 AND is_active = true', [year]
    );
    if (!policyResult.rows[0]) {
      return res.json({ success: true, data: { available: false, message: 'Nenhum programa ativo no momento.', disclaimer: DISCLAIMER } });
    }
    const policy = policyResult.rows[0];

    // Check if within request window
    const today = new Date().toISOString().split('T')[0];
    const withinWindow = today >= policy.request_start && today <= policy.request_end;

    // Get driver purchases for the year
    const purchases = await pool.query(
      `SELECT SUM(amount_cents) as total_paid_cents, COUNT(*) as total_purchases
       FROM driver_credit_purchases
       WHERE driver_id = $1 AND status = 'confirmed' AND paid_at IS NOT NULL
         AND EXTRACT(YEAR FROM paid_at) = $2`,
      [driverId, year]
    );
    const totalPaidCents = parseInt(purchases.rows[0]?.total_paid_cents || '0');
    const totalPurchases = parseInt(purchases.rows[0]?.total_purchases || '0');

    if (totalPaidCents === 0) {
      return res.json({ success: true, data: { available: false, message: 'Nenhuma recarga confirmada neste ano.', disclaimer: DISCLAIMER } });
    }

    // Calculate estimated return
    const rate = Number(policy.percent_rate) / 100;
    let estimatedCents = Math.round(totalPaidCents * rate);
    if (policy.max_per_driver_cents && estimatedCents > Number(policy.max_per_driver_cents)) {
      estimatedCents = Number(policy.max_per_driver_cents);
    }

    // Check existing request
    const existingReq = await pool.query(
      'SELECT id, status, approved_amount_cents, review_reason, created_at FROM retorno_familiar_requests WHERE driver_id = $1 AND year = $2',
      [driverId, year]
    );

    res.json({
      success: true,
      data: {
        available: true,
        within_window: withinWindow,
        policy: {
          year: policy.year,
          percent_rate: Number(policy.percent_rate),
          request_start: policy.request_start,
          request_end: policy.request_end,
        },
        summary: {
          total_paid_cents: totalPaidCents,
          total_purchases: totalPurchases,
          estimated_return_cents: estimatedCents,
        },
        existing_request: existingReq.rows[0] || null,
        disclaimer: DISCLAIMER,
      },
    });
  } catch (e) {
    console.error('[DRIVER_RF_STATUS]', e);
    res.status(500).json({ success: false, error: 'Erro ao verificar status' });
  }
});

// POST /api/v2/drivers/me/retorno-familiar/request — solicitar retorno
router.post('/request', async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).driverId;
    const year = new Date().getFullYear();

    // Check active policy + window
    const policyResult = await pool.query(
      'SELECT * FROM retorno_familiar_policy WHERE year = $1 AND is_active = true', [year]
    );
    if (!policyResult.rows[0]) {
      return res.status(400).json({ success: false, error: 'Nenhum programa ativo no momento' });
    }
    const policy = policyResult.rows[0];

    const today = new Date().toISOString().split('T')[0];
    if (today < policy.request_start || today > policy.request_end) {
      return res.status(400).json({ success: false, error: `Período de solicitação: ${policy.request_start} a ${policy.request_end}` });
    }

    // Check eligibility
    const driver = await pool.query(
      'SELECT id, status, banned_at, deleted_at FROM drivers WHERE id = $1', [driverId]
    );
    if (!driver.rows[0] || !['approved', 'active'].includes(driver.rows[0].status) || driver.rows[0].banned_at || driver.rows[0].deleted_at) {
      return res.status(403).json({ success: false, error: 'Motorista não elegível' });
    }

    // Check duplicate
    const existing = await pool.query(
      'SELECT id FROM retorno_familiar_requests WHERE driver_id = $1 AND year = $2', [driverId, year]
    );
    if (existing.rows[0]) {
      return res.status(409).json({ success: false, error: 'Solicitação já enviada para este ano' });
    }

    // Calculate
    const purchases = await pool.query(
      `SELECT SUM(amount_cents) as total_paid_cents, COUNT(*) as total_purchases
       FROM driver_credit_purchases
       WHERE driver_id = $1 AND status = 'confirmed' AND paid_at IS NOT NULL
         AND EXTRACT(YEAR FROM paid_at) = $2`,
      [driverId, year]
    );
    const totalPaidCents = parseInt(purchases.rows[0]?.total_paid_cents || '0');
    const totalPurchases = parseInt(purchases.rows[0]?.total_purchases || '0');

    if (totalPaidCents === 0) {
      return res.status(400).json({ success: false, error: 'Nenhuma recarga confirmada neste ano' });
    }

    const rate = Number(policy.percent_rate) / 100;
    let calculatedCents = Math.round(totalPaidCents * rate);
    if (policy.max_per_driver_cents && calculatedCents > Number(policy.max_per_driver_cents)) {
      calculatedCents = Number(policy.max_per_driver_cents);
    }

    // Create request
    const result = await pool.query(
      `INSERT INTO retorno_familiar_requests (driver_id, policy_id, year, total_paid_cents, total_purchases, calculated_return_cents)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [driverId, policy.id, year, totalPaidCents, totalPurchases, calculatedCents]
    );

    console.log(`[DRIVER_RF_REQUEST] driver=${driverId} year=${year} paid=${totalPaidCents} return=${calculatedCents}`);

    res.status(201).json({
      success: true,
      data: { id: result.rows[0].id, status: 'requested', calculated_return_cents: calculatedCents },
      message: 'Solicitação enviada para análise',
      disclaimer: DISCLAIMER,
    });
  } catch (e: any) {
    if (e?.code === '23505') return res.status(409).json({ success: false, error: 'Solicitação já existe para este ano' });
    console.error('[DRIVER_RF_REQUEST]', e);
    res.status(500).json({ success: false, error: 'Erro ao enviar solicitação' });
  }
});

export default router;
