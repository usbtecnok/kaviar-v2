/**
 * Admin Credit Packages — CRUD para pacotes de créditos
 *
 * Endpoints:
 *   GET    /api/admin/credit-packages          — lista todos pacotes (ativos + inativos)
 *   POST   /api/admin/credit-packages          — cria novo pacote (exige senha)
 *   PUT    /api/admin/credit-packages/:id      — edita pacote (exige senha)
 *   PUT    /api/admin/credit-packages/:id/activate   — ativa pacote (exige senha)
 *   PUT    /api/admin/credit-packages/:id/deactivate — desativa pacote (exige senha)
 *
 * Acesso: SUPER_ADMIN apenas
 * Segurança: Toda ação de escrita exige re-autenticação com senha
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

// --- Schemas ---

const createPackageSchema = z.object({
  id: z.string().min(3, 'ID deve ter pelo menos 3 caracteres').regex(/^[a-z0-9-]+$/, 'ID deve conter apenas letras minúsculas, números e hífens'),
  credits: z.number().int().min(1, 'Créditos deve ser pelo menos 1').max(500, 'Máximo 500 créditos'),
  price: z.number().min(0.01, 'Preço deve ser positivo').max(500, 'Preço máximo R$ 500'),
  active: z.boolean().default(true),
  password: z.string().min(1, 'Senha é obrigatória'),
  reason: z.string().min(3, 'Motivo deve ter pelo menos 3 caracteres'),
});

const updatePackageSchema = z.object({
  credits: z.number().int().min(1).max(500).optional(),
  price: z.number().min(0.01).max(500).optional(),
  active: z.boolean().optional(),
  password: z.string().min(1, 'Senha é obrigatória'),
  reason: z.string().min(3, 'Motivo deve ter pelo menos 3 caracteres'),
});

const passwordOnlySchema = z.object({
  password: z.string().min(1, 'Senha é obrigatória'),
  reason: z.string().min(3, 'Motivo deve ter pelo menos 3 caracteres'),
});

// --- Helpers ---

async function verifyAdminPassword(adminId: string, password: string): Promise<boolean> {
  const result = await pool.query('SELECT password FROM admins WHERE id = $1', [adminId]);
  if (!result.rows[0]) return false;
  return bcrypt.compare(password, result.rows[0].password);
}

// --- Routes ---

// GET /api/admin/credit-packages — lista todos pacotes
router.get('/', async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(`
      SELECT cp.id, cp.credits, cp.price, cp.active, cp.created_at,
             (SELECT COUNT(*) FROM driver_credit_purchases dcp WHERE dcp.package_id = cp.id) as purchase_count,
             (SELECT COUNT(*) FROM driver_credit_purchases dcp WHERE dcp.package_id = cp.id AND dcp.status = 'confirmed') as confirmed_count
      FROM credit_packages cp
      ORDER BY cp.active DESC, cp.credits ASC
    `);

    res.json({
      success: true,
      data: rows.map((r: any) => ({
        id: r.id,
        credits: r.credits,
        price: Number(r.price),
        priceCents: Math.round(Number(r.price) * 100),
        pricePerCredit: Math.round((Number(r.price) / r.credits) * 100) / 100,
        active: r.active,
        purchaseCount: parseInt(r.purchase_count || '0'),
        confirmedCount: parseInt(r.confirmed_count || '0'),
        createdAt: r.created_at,
      })),
    });
  } catch (error) {
    console.error('[ADMIN_CREDIT_PACKAGES] List error:', error);
    res.status(500).json({ success: false, error: 'Erro ao listar pacotes' });
  }
});

// POST /api/admin/credit-packages — cria novo pacote (exige senha)
router.post('/', async (req: Request, res: Response) => {
  try {
    const ctx = auditCtx(req);
    const parsed = createPackageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }

    const { password, reason, ...data } = parsed.data;

    // Re-authenticate
    if (!(await verifyAdminPassword(ctx.adminId, password))) {
      return res.status(401).json({ success: false, error: 'Senha incorreta' });
    }

    // Check ID unique
    const existing = await pool.query('SELECT id FROM credit_packages WHERE id = $1', [data.id]);
    if (existing.rows[0]) {
      return res.status(409).json({ success: false, error: 'ID já existe. Escolha outro identificador.' });
    }

    await pool.query(
      `INSERT INTO credit_packages (id, credits, price, active, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [data.id, data.credits, data.price, data.active]
    );

    await audit({
      adminId: ctx.adminId, adminEmail: ctx.adminEmail,
      action: 'create_credit_package', entityType: 'credit_package', entityId: data.id,
      newValue: { credits: data.credits, price: data.price, active: data.active },
      reason, ipAddress: ctx.ip, userAgent: ctx.ua,
    });

    console.log(`[ADMIN_CREDIT_PACKAGES] Created: id=${data.id} credits=${data.credits} price=${data.price} by=${ctx.adminId}`);

    res.status(201).json({ success: true, message: 'Pacote criado com sucesso', data: { id: data.id } });
  } catch (error) {
    console.error('[ADMIN_CREDIT_PACKAGES] Create error:', error);
    res.status(500).json({ success: false, error: 'Erro ao criar pacote' });
  }
});

// PUT /api/admin/credit-packages/:id — edita pacote (exige senha)
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ctx = auditCtx(req);
    const parsed = updatePackageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }

    const { password, reason, ...fields } = parsed.data;
    const updates = Object.entries(fields).filter(([_, v]) => v !== undefined);
    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'Nenhum campo para atualizar' });
    }

    // Re-authenticate
    if (!(await verifyAdminPassword(ctx.adminId, password))) {
      return res.status(401).json({ success: false, error: 'Senha incorreta' });
    }

    // Get current values for audit
    const current = await pool.query('SELECT id, credits, price, active FROM credit_packages WHERE id = $1', [id]);
    if (!current.rows[0]) {
      return res.status(404).json({ success: false, error: 'Pacote não encontrado' });
    }
    const oldValue = { credits: current.rows[0].credits, price: Number(current.rows[0].price), active: current.rows[0].active };

    // Build update
    const setClauses: string[] = [];
    const values: any[] = [];
    let idx = 1;
    for (const [key, value] of updates) {
      setClauses.push(`${key} = $${idx++}`);
      values.push(value);
    }
    values.push(id);

    await pool.query(
      `UPDATE credit_packages SET ${setClauses.join(', ')} WHERE id = $${idx}`,
      values
    );

    await audit({
      adminId: ctx.adminId, adminEmail: ctx.adminEmail,
      action: 'update_credit_package', entityType: 'credit_package', entityId: id,
      oldValue, newValue: fields, reason, ipAddress: ctx.ip, userAgent: ctx.ua,
    });

    console.log(`[ADMIN_CREDIT_PACKAGES] Updated: id=${id} fields=${updates.map(([k]) => k).join(',')} by=${ctx.adminId}`);

    res.json({ success: true, message: 'Pacote atualizado' });
  } catch (error) {
    console.error('[ADMIN_CREDIT_PACKAGES] Update error:', error);
    res.status(500).json({ success: false, error: 'Erro ao atualizar pacote' });
  }
});

// PUT /api/admin/credit-packages/:id/deactivate — desativa pacote (exige senha)
router.put('/:id/deactivate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ctx = auditCtx(req);
    const parsed = passwordOnlySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }

    const { password, reason } = parsed.data;

    if (!(await verifyAdminPassword(ctx.adminId, password))) {
      return res.status(401).json({ success: false, error: 'Senha incorreta' });
    }

    const result = await pool.query(
      `UPDATE credit_packages SET active = false WHERE id = $1 AND active = true RETURNING id, credits, price`,
      [id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, error: 'Pacote não encontrado ou já inativo' });
    }

    await audit({
      adminId: ctx.adminId, adminEmail: ctx.adminEmail,
      action: 'deactivate_credit_package', entityType: 'credit_package', entityId: id,
      oldValue: { active: true }, newValue: { active: false }, reason, ipAddress: ctx.ip, userAgent: ctx.ua,
    });

    console.log(`[ADMIN_CREDIT_PACKAGES] Deactivated: id=${id} by=${ctx.adminId}`);
    res.json({ success: true, message: 'Pacote desativado' });
  } catch (error) {
    console.error('[ADMIN_CREDIT_PACKAGES] Deactivate error:', error);
    res.status(500).json({ success: false, error: 'Erro ao desativar pacote' });
  }
});

// PUT /api/admin/credit-packages/:id/activate — reativa pacote (exige senha)
router.put('/:id/activate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ctx = auditCtx(req);
    const parsed = passwordOnlySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }

    const { password, reason } = parsed.data;

    if (!(await verifyAdminPassword(ctx.adminId, password))) {
      return res.status(401).json({ success: false, error: 'Senha incorreta' });
    }

    const result = await pool.query(
      `UPDATE credit_packages SET active = true WHERE id = $1 AND active = false RETURNING id, credits, price`,
      [id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, error: 'Pacote não encontrado ou já ativo' });
    }

    await audit({
      adminId: ctx.adminId, adminEmail: ctx.adminEmail,
      action: 'activate_credit_package', entityType: 'credit_package', entityId: id,
      oldValue: { active: false }, newValue: { active: true }, reason, ipAddress: ctx.ip, userAgent: ctx.ua,
    });

    console.log(`[ADMIN_CREDIT_PACKAGES] Activated: id=${id} by=${ctx.adminId}`);
    res.json({ success: true, message: 'Pacote reativado' });
  } catch (error) {
    console.error('[ADMIN_CREDIT_PACKAGES] Activate error:', error);
    res.status(500).json({ success: false, error: 'Erro ao reativar pacote' });
  }
});

export default router;
