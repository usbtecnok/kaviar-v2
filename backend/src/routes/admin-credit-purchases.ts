import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { authenticateAdmin, allowFinanceAccess } from '../middlewares/auth';

const router = Router();

router.use(authenticateAdmin);
router.use(allowFinanceAccess);

// GET /api/admin/credit-purchases
router.get('/', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string;
    const driverId = req.query.driverId as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    let where = 'WHERE 1=1';
    const params: any[] = [];
    let idx = 1;

    if (status) { where += ` AND p.status = $${idx++}`; params.push(status); }
    if (driverId) { where += ` AND p.driver_id = $${idx++}`; params.push(driverId); }

    const countResult = await pool.query(
      `SELECT count(*) as total FROM driver_credit_purchases p ${where}`, params
    );
    const total = parseInt(countResult.rows[0].total);

    const { rows: purchases } = await pool.query(
      `SELECT p.id, p.driver_id, d.name as driver_name, d.phone as driver_phone,
              p.status, p.credits_amount, p.amount_cents, p.billing_type,
              p.asaas_payment_id, p.asaas_customer_id, p.external_reference,
              p.created_at, p.paid_at,
              cb.balance as driver_balance
       FROM driver_credit_purchases p
       LEFT JOIN drivers d ON d.id = p.driver_id
       LEFT JOIN credit_balance cb ON cb.driver_id = p.driver_id
       ${where}
       ORDER BY p.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      data: purchases.map((p: any) => ({
        ...p,
        amount_cents: parseInt(p.amount_cents),
        credits_amount: parseInt(p.credits_amount),
        driver_balance: p.driver_balance ? parseFloat(p.driver_balance) : 0,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (err: any) {
    console.error('[ADMIN_CREDIT_PURCHASES]', err);
    res.status(500).json({ success: false, error: 'Erro ao buscar compras' });
  }
});

// GET /api/admin/credit-purchases/summary
router.get('/summary', async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        count(*) FILTER (WHERE status = 'confirmed') as confirmed_count,
        count(*) FILTER (WHERE status = 'pending') as pending_count,
        coalesce(sum(amount_cents) FILTER (WHERE status = 'confirmed'), 0) as confirmed_total_cents,
        count(DISTINCT driver_id) FILTER (WHERE status = 'confirmed') as unique_buyers
      FROM driver_credit_purchases
    `);
    const s = rows[0];
    res.json({
      success: true,
      data: {
        confirmed: parseInt(s.confirmed_count),
        pending: parseInt(s.pending_count),
        totalRevenueCents: parseInt(s.confirmed_total_cents),
        uniqueBuyers: parseInt(s.unique_buyers),
      }
    });
  } catch (err: any) {
    console.error('[ADMIN_CREDIT_PURCHASES_SUMMARY]', err);
    res.status(500).json({ success: false, error: 'Erro ao buscar resumo' });
  }
});

// GET /api/admin/credit-purchases/:paymentId/webhooks
router.get('/:paymentId/webhooks', async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, event_type, status, asaas_payment_id, error, created_at, processed_at
       FROM asaas_webhook_events WHERE asaas_payment_id = $1 ORDER BY created_at`,
      [req.params.paymentId]
    );
    res.json({ success: true, data: rows });
  } catch (err: any) {
    console.error('[ADMIN_WEBHOOKS]', err);
    res.status(500).json({ success: false, error: 'Erro ao buscar webhooks' });
  }
});

export default router;
