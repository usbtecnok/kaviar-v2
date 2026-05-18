import { Router, Request, Response } from 'express';
import { authenticateAdmin, requireSuperAdmin } from '../middlewares/auth';
import { audit, auditCtx } from '../utils/audit';
import { pool } from '../db';
import { z } from 'zod';
import * as bcrypt from 'bcryptjs';

const router = Router();
router.use(authenticateAdmin);
router.use(requireSuperAdmin);

const EDITABLE_FIELDS = ['base_fare', 'per_km', 'per_minute', 'minimum_fare', 'fee_local', 'fee_adjacent', 'fee_external', 'surcharge_external'] as const;

const updateSchema = z.object({
  base_fare: z.number().min(0).optional(),
  per_km: z.number().min(0).optional(),
  per_minute: z.number().min(0).optional(),
  minimum_fare: z.number().min(0).optional(),
  fee_local: z.number().min(0).max(100).optional(),
  fee_adjacent: z.number().min(0).max(100).optional(),
  fee_external: z.number().min(0).max(100).optional(),
  surcharge_external: z.number().min(0).optional(),
  password: z.string().min(1, 'Senha é obrigatória'),
  reason: z.string().min(10, 'Motivo deve ter pelo menos 10 caracteres'),
});

// GET /api/admin/pricing-profiles
router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT slug, name, base_fare, per_km, per_minute, minimum_fare,
              fee_local, fee_adjacent, fee_external, surcharge_external,
              credit_cost_local, credit_cost_external, updated_at
       FROM pricing_profiles WHERE is_active = true ORDER BY is_default ASC, slug`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao buscar perfis' });
  }
});

// PUT /api/admin/pricing-profiles/:slug
router.put('/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const ctx = auditCtx(req);

    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const { password, reason, ...fields } = parsed.data;

    // At least one field to update
    const updates = Object.entries(fields).filter(([_, v]) => v !== undefined);
    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'Nenhum campo para atualizar' });
    }

    // Re-authenticate admin
    const adminRow = await pool.query('SELECT password FROM admins WHERE id = $1', [ctx.adminId]);
    if (!adminRow.rows[0] || !(await bcrypt.compare(password, adminRow.rows[0].password))) {
      return res.status(401).json({ success: false, error: 'Senha incorreta' });
    }

    // Get current values
    const current = await pool.query('SELECT * FROM pricing_profiles WHERE slug = $1 AND is_active = true', [slug]);
    if (!current.rows[0]) {
      return res.status(404).json({ success: false, error: 'Perfil não encontrado' });
    }
    const oldValues: Record<string, number> = {};
    const newValues: Record<string, number> = {};
    for (const [key, val] of updates) {
      oldValues[key] = Number(current.rows[0][key]);
      newValues[key] = val as number;
    }

    // Build UPDATE
    const setClauses = updates.map(([key], i) => `${key} = $${i + 1}`);
    setClauses.push(`updated_at = now()`);
    const values = updates.map(([_, v]) => v);
    values.push(slug as any);

    await pool.query(
      `UPDATE pricing_profiles SET ${setClauses.join(', ')} WHERE slug = $${values.length} AND is_active = true`,
      values
    );

    // Audit
    await audit({
      adminId: ctx.adminId,
      adminEmail: ctx.adminEmail,
      action: 'update_pricing_profile',
      entityType: 'pricing_profile',
      entityId: slug,
      oldValue: oldValues,
      newValue: newValues,
      reason,
      ipAddress: ctx.ip,
      userAgent: ctx.ua,
    });

    // Return updated profile
    const updated = await pool.query(
      `SELECT slug, name, base_fare, per_km, per_minute, minimum_fare,
              fee_local, fee_adjacent, fee_external, surcharge_external,
              credit_cost_local, credit_cost_external, updated_at
       FROM pricing_profiles WHERE slug = $1`, [slug]
    );

    res.json({ success: true, data: updated.rows[0], message: 'Perfil atualizado com sucesso' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao atualizar perfil' });
  }
});

export default router;
