/**
 * Admin Retorno Familiar KAVIAR — Políticas + Aprovação (MVP)
 *
 * Toda ação de escrita exige senha do SUPER_ADMIN + motivo + auditoria.
 * Não altera: credit_balance, driver_credit_ledger, driver_credit_purchases.
 */

import { Router, Request, Response } from 'express';
import { authenticateAdmin, requireSuperAdmin } from '../middlewares/auth';
import { pool } from '../db';
import { z } from 'zod';
import * as bcrypt from 'bcryptjs';
import { audit, auditCtx } from '../utils/audit';

const router = Router();
router.use(authenticateAdmin);
router.use(requireSuperAdmin);

// --- Helpers ---

async function verifyAdminPassword(adminId: string, password: string): Promise<boolean> {
  const result = await pool.query('SELECT password FROM admins WHERE id = $1', [adminId]);
  if (!result.rows[0]) return false;
  return bcrypt.compare(password, result.rows[0].password);
}

// --- Schemas ---

const createPolicySchema = z.object({
  year: z.number().int().min(2024).max(2040),
  percent_rate: z.number().min(0.01).max(30, 'Percentual máximo: 30%'),
  max_per_driver_cents: z.number().int().min(100).nullable().optional(),
  fund_budget_cents: z.number().int().min(1000).nullable().optional(),
  request_start: z.string().min(1),
  request_end: z.string().min(1),
  payment_deadline: z.string().nullable().optional(),
  is_active: z.boolean().default(false),
  notes: z.string().nullable().optional(),
  password: z.string().min(1, 'Senha obrigatória'),
  reason: z.string().min(3, 'Motivo obrigatório'),
});

const updatePolicySchema = z.object({
  percent_rate: z.number().min(0.01).max(30, 'Percentual máximo: 30%').optional(),
  max_per_driver_cents: z.number().int().min(100).nullable().optional(),
  fund_budget_cents: z.number().int().min(1000).nullable().optional(),
  request_start: z.string().optional(),
  request_end: z.string().optional(),
  payment_deadline: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
  notes: z.string().nullable().optional(),
  password: z.string().min(1, 'Senha obrigatória'),
  reason: z.string().min(3, 'Motivo obrigatório'),
});

const reviewSchema = z.object({
  password: z.string().min(1, 'Senha obrigatória'),
  reason: z.string().min(3, 'Motivo obrigatório'),
  approved_amount_cents: z.number().int().min(0).optional(),
});

const markPaidSchema = z.object({
  password: z.string().min(1, 'Senha obrigatória'),
  reason: z.string().min(3, 'Motivo obrigatório'),
  paid_method: z.string().min(1, 'Método de pagamento obrigatório'),
  paid_reference: z.string().nullable().optional(),
});

// --- Policies ---

router.get('/policies', async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query('SELECT * FROM retorno_familiar_policy ORDER BY year DESC');
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ success: false, error: 'Erro ao listar políticas' }); }
});

router.post('/policies', async (req: Request, res: Response) => {
  try {
    const ctx = auditCtx(req);
    const parsed = createPolicySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    const { password, reason, ...data } = parsed.data;

    if (!(await verifyAdminPassword(ctx.adminId, password)))
      return res.status(401).json({ success: false, error: 'Senha incorreta' });

    const existing = await pool.query('SELECT id FROM retorno_familiar_policy WHERE year = $1', [data.year]);
    if (existing.rows[0]) return res.status(409).json({ success: false, error: `Política para ${data.year} já existe` });

    const result = await pool.query(
      `INSERT INTO retorno_familiar_policy (year, percent_rate, max_per_driver_cents, fund_budget_cents, request_start, request_end, payment_deadline, is_active, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
      [data.year, data.percent_rate, data.max_per_driver_cents || null, data.fund_budget_cents || null, data.request_start, data.request_end, data.payment_deadline || null, data.is_active, data.notes || null, ctx.adminId]
    );

    await audit({ adminId: ctx.adminId, adminEmail: ctx.adminEmail, action: 'create_retorno_familiar_policy', entityType: 'retorno_familiar_policy', entityId: result.rows[0].id, newValue: data, reason, ipAddress: ctx.ip, userAgent: ctx.ua });
    res.status(201).json({ success: true, data: { id: result.rows[0].id }, message: 'Política criada' });
  } catch (e) { console.error('[RF_POLICY_CREATE]', e); res.status(500).json({ success: false, error: 'Erro ao criar política' }); }
});

router.put('/policies/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ctx = auditCtx(req);
    const parsed = updatePolicySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    const { password, reason, ...fields } = parsed.data;

    if (!(await verifyAdminPassword(ctx.adminId, password)))
      return res.status(401).json({ success: false, error: 'Senha incorreta' });

    const current = await pool.query('SELECT * FROM retorno_familiar_policy WHERE id = $1', [id]);
    if (!current.rows[0]) return res.status(404).json({ success: false, error: 'Política não encontrada' });

    const updates = Object.entries(fields).filter(([_, v]) => v !== undefined);
    if (updates.length === 0) return res.status(400).json({ success: false, error: 'Nada para atualizar' });

    const setClauses = updates.map(([k], i) => `${k} = $${i + 1}`);
    setClauses.push(`updated_at = NOW()`);
    const values = updates.map(([_, v]) => v);
    values.push(id);

    await pool.query(`UPDATE retorno_familiar_policy SET ${setClauses.join(', ')} WHERE id = $${values.length}`, values);
    await audit({ adminId: ctx.adminId, adminEmail: ctx.adminEmail, action: 'update_retorno_familiar_policy', entityType: 'retorno_familiar_policy', entityId: id, oldValue: { year: current.rows[0].year }, newValue: fields, reason, ipAddress: ctx.ip, userAgent: ctx.ua });
    res.json({ success: true, message: 'Política atualizada' });
  } catch (e) { console.error('[RF_POLICY_UPDATE]', e); res.status(500).json({ success: false, error: 'Erro ao atualizar' }); }
});

// --- Report ---

router.get('/report', async (req: Request, res: Response) => {
  try {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();

    const policy = await pool.query('SELECT * FROM retorno_familiar_policy WHERE year = $1', [year]);
    if (!policy.rows[0]) return res.json({ success: true, data: { policy: null, eligible: [], warnings: [] } });
    const p = policy.rows[0];

    // Eligible drivers with confirmed purchases in the year (paid_at NOT NULL)
    const { rows: eligible } = await pool.query(`
      SELECT d.id, d.name, d.email, d.phone, d.status, d.pix_key, d.pix_key_type, d.banned_at,
             SUM(dcp.amount_cents) as total_paid_cents,
             COUNT(dcp.id) as total_purchases
      FROM drivers d
      JOIN driver_credit_purchases dcp ON dcp.driver_id = d.id
      WHERE dcp.status = 'confirmed'
        AND dcp.paid_at IS NOT NULL
        AND EXTRACT(YEAR FROM dcp.paid_at) = $1
        AND d.status IN ('approved', 'active')
        AND d.banned_at IS NULL
        AND d.deleted_at IS NULL
      GROUP BY d.id, d.name, d.email, d.phone, d.status, d.pix_key, d.pix_key_type, d.banned_at
      ORDER BY total_paid_cents DESC
    `, [year]);

    // Warnings: confirmed purchases without paid_at
    const { rows: warnings } = await pool.query(`
      SELECT dcp.id, dcp.driver_id, d.name as driver_name, dcp.amount_cents, dcp.credits_amount, dcp.created_at
      FROM driver_credit_purchases dcp
      JOIN drivers d ON d.id = dcp.driver_id
      WHERE dcp.status = 'confirmed'
        AND dcp.paid_at IS NULL
        AND EXTRACT(YEAR FROM dcp.created_at) = $1
    `, [year]);

    // Existing requests
    const { rows: requests } = await pool.query(
      'SELECT driver_id, status, approved_amount_cents FROM retorno_familiar_requests WHERE year = $1', [year]
    );
    const requestMap = Object.fromEntries(requests.map(r => [r.driver_id, r]));

    const rate = Number(p.percent_rate) / 100;
    const maxCents = p.max_per_driver_cents ? Number(p.max_per_driver_cents) : null;

    const enriched = eligible.map((d: any) => {
      const totalPaid = parseInt(d.total_paid_cents);
      let calculated = Math.round(totalPaid * rate);
      if (maxCents && calculated > maxCents) calculated = maxCents;
      return {
        ...d,
        total_paid_cents: totalPaid,
        total_purchases: parseInt(d.total_purchases),
        calculated_return_cents: calculated,
        has_pix: !!d.pix_key,
        existing_request: requestMap[d.id] || null,
      };
    });

    // Total approved so far
    const approvedTotal = requests.filter(r => ['approved', 'paid'].includes(r.status)).reduce((s, r) => s + (r.approved_amount_cents || 0), 0);

    res.json({
      success: true,
      data: {
        policy: p,
        eligible: enriched,
        warnings: warnings.map((w: any) => ({
          ...w,
          message: 'Compra confirmada sem data de pagamento — revisão manual necessária',
        })),
        fund_summary: {
          budget_cents: p.fund_budget_cents ? Number(p.fund_budget_cents) : null,
          approved_total_cents: approvedTotal,
          remaining_cents: p.fund_budget_cents ? Number(p.fund_budget_cents) - approvedTotal : null,
        },
      },
    });
  } catch (e) { console.error('[RF_REPORT]', e); res.status(500).json({ success: false, error: 'Erro ao gerar relatório' }); }
});

// --- Requests management ---

router.get('/requests', async (req: Request, res: Response) => {
  try {
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    const status = req.query.status as string;

    let query = `SELECT r.*, d.name as driver_name, d.email as driver_email, d.pix_key, d.pix_key_type
      FROM retorno_familiar_requests r
      JOIN drivers d ON d.id = r.driver_id`;
    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (year) { conditions.push(`r.year = $${idx++}`); params.push(year); }
    if (status) { conditions.push(`r.status = $${idx++}`); params.push(status); }
    if (conditions.length) query += ` WHERE ${conditions.join(' AND ')}`;
    query += ' ORDER BY r.created_at DESC';

    const { rows } = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ success: false, error: 'Erro ao listar solicitações' }); }
});

router.put('/requests/:id/approve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ctx = auditCtx(req);
    const parsed = reviewSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    const { password, reason, approved_amount_cents } = parsed.data;

    if (!(await verifyAdminPassword(ctx.adminId, password)))
      return res.status(401).json({ success: false, error: 'Senha incorreta' });

    const req_row = await pool.query('SELECT * FROM retorno_familiar_requests WHERE id = $1', [id]);
    if (!req_row.rows[0]) return res.status(404).json({ success: false, error: 'Solicitação não encontrada' });
    const r = req_row.rows[0];
    if (!['requested', 'in_review'].includes(r.status))
      return res.status(400).json({ success: false, error: `Status atual (${r.status}) não permite aprovação` });

    const amount = approved_amount_cents ?? r.calculated_return_cents;

    // Check fund budget
    const policy = await pool.query('SELECT fund_budget_cents FROM retorno_familiar_policy WHERE id = $1', [r.policy_id]);
    if (policy.rows[0]?.fund_budget_cents) {
      const { rows: approvedRows } = await pool.query(
        `SELECT COALESCE(SUM(approved_amount_cents), 0) as total FROM retorno_familiar_requests WHERE policy_id = $1 AND status IN ('approved','paid')`, [r.policy_id]
      );
      const remaining = Number(policy.rows[0].fund_budget_cents) - Number(approvedRows[0]?.total || 0);
      if (amount > remaining)
        return res.status(400).json({ success: false, error: `Fundo insuficiente. Disponível: R$ ${(remaining / 100).toFixed(2)}` });
    }

    await pool.query(
      `UPDATE retorno_familiar_requests SET status = 'approved', approved_amount_cents = $2, reviewed_by = $3, reviewed_at = NOW(), review_reason = $4, updated_at = NOW() WHERE id = $1`,
      [id, amount, ctx.adminId, reason]
    );

    await audit({ adminId: ctx.adminId, adminEmail: ctx.adminEmail, action: 'approve_retorno_familiar', entityType: 'retorno_familiar_request', entityId: id, oldValue: { status: r.status }, newValue: { status: 'approved', approved_amount_cents: amount }, reason, ipAddress: ctx.ip, userAgent: ctx.ua });
    res.json({ success: true, message: 'Solicitação aprovada' });
  } catch (e) { console.error('[RF_APPROVE]', e); res.status(500).json({ success: false, error: 'Erro ao aprovar' }); }
});

router.put('/requests/:id/reject', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ctx = auditCtx(req);
    const parsed = reviewSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    const { password, reason } = parsed.data;

    if (!(await verifyAdminPassword(ctx.adminId, password)))
      return res.status(401).json({ success: false, error: 'Senha incorreta' });

    const req_row = await pool.query('SELECT status FROM retorno_familiar_requests WHERE id = $1', [id]);
    if (!req_row.rows[0]) return res.status(404).json({ success: false, error: 'Não encontrada' });
    if (!['requested', 'in_review'].includes(req_row.rows[0].status))
      return res.status(400).json({ success: false, error: 'Status não permite rejeição' });

    await pool.query(
      `UPDATE retorno_familiar_requests SET status = 'rejected', reviewed_by = $2, reviewed_at = NOW(), review_reason = $3, updated_at = NOW() WHERE id = $1`,
      [id, ctx.adminId, reason]
    );

    await audit({ adminId: ctx.adminId, adminEmail: ctx.adminEmail, action: 'reject_retorno_familiar', entityType: 'retorno_familiar_request', entityId: id, newValue: { status: 'rejected' }, reason, ipAddress: ctx.ip, userAgent: ctx.ua });
    res.json({ success: true, message: 'Solicitação rejeitada' });
  } catch (e) { res.status(500).json({ success: false, error: 'Erro ao rejeitar' }); }
});

router.put('/requests/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ctx = auditCtx(req);
    const parsed = reviewSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    const { password, reason } = parsed.data;

    if (!(await verifyAdminPassword(ctx.adminId, password)))
      return res.status(401).json({ success: false, error: 'Senha incorreta' });

    const result = await pool.query(
      `UPDATE retorno_familiar_requests SET status = 'canceled', reviewed_by = $2, reviewed_at = NOW(), review_reason = $3, updated_at = NOW() WHERE id = $1 AND status NOT IN ('paid','canceled') RETURNING id`,
      [id, ctx.adminId, reason]
    );
    if (!result.rows[0]) return res.status(404).json({ success: false, error: 'Não encontrada ou já finalizada' });

    await audit({ adminId: ctx.adminId, adminEmail: ctx.adminEmail, action: 'cancel_retorno_familiar', entityType: 'retorno_familiar_request', entityId: id, newValue: { status: 'canceled' }, reason, ipAddress: ctx.ip, userAgent: ctx.ua });
    res.json({ success: true, message: 'Solicitação cancelada' });
  } catch (e) { res.status(500).json({ success: false, error: 'Erro ao cancelar' }); }
});

router.put('/requests/:id/mark-paid', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ctx = auditCtx(req);
    const parsed = markPaidSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    const { password, reason, paid_method, paid_reference } = parsed.data;

    if (!(await verifyAdminPassword(ctx.adminId, password)))
      return res.status(401).json({ success: false, error: 'Senha incorreta' });

    const req_row = await pool.query(
      `SELECT r.status, r.driver_id, d.pix_key, d.pix_key_type
       FROM retorno_familiar_requests r
       JOIN drivers d ON d.id = r.driver_id
       WHERE r.id = $1`, [id]
    );
    if (!req_row.rows[0]) return res.status(404).json({ success: false, error: 'Não encontrada' });
    if (req_row.rows[0].status !== 'approved')
      return res.status(400).json({ success: false, error: 'Só é possível marcar como pago solicitações aprovadas' });

    // Validação Pix para pagamento via pix_manual
    if (paid_method === 'pix_manual') {
      const { pix_key, pix_key_type } = req_row.rows[0];
      if (!pix_key) {
        return res.status(400).json({ success: false, error: 'O motorista não possui chave Pix cadastrada. Atualize os dados antes de registrar pagamento via Pix.' });
      }
      if (!pix_key_type) {
        return res.status(400).json({ success: false, error: 'O motorista possui chave Pix, mas o tipo da chave não está informado. Atualize os dados antes de registrar pagamento via Pix.' });
      }
      if (!paid_reference) {
        return res.status(400).json({ success: false, error: 'Referência/comprovante é obrigatória para pagamento via Pix manual.' });
      }
    }

    await pool.query(
      `UPDATE retorno_familiar_requests SET status = 'paid', paid_at = NOW(), paid_method = $2, paid_reference = $3, paid_by = $4, updated_at = NOW() WHERE id = $1`,
      [id, paid_method, paid_reference || null, ctx.adminId]
    );

    await audit({ adminId: ctx.adminId, adminEmail: ctx.adminEmail, action: 'mark_paid_retorno_familiar', entityType: 'retorno_familiar_request', entityId: id, newValue: { status: 'paid', paid_method, paid_reference }, reason, ipAddress: ctx.ip, userAgent: ctx.ua });
    res.json({ success: true, message: 'Pagamento registrado' });
  } catch (e) { console.error('[RF_MARK_PAID]', e); res.status(500).json({ success: false, error: 'Erro ao registrar pagamento' }); }
});

export default router;
