/**
 * Admin Territory Price Floors — CRUD para pisos territoriais
 *
 * Endpoints:
 *   GET    /api/admin/territory-floors?territory_id=xxx  — lista pisos de um território
 *   GET    /api/admin/territory-floors/:id               — busca um piso por ID
 *   POST   /api/admin/territory-floors                   — cria novo piso
 *   PUT    /api/admin/territory-floors/:id               — atualiza piso existente
 *   DELETE /api/admin/territory-floors/:id               — desativa piso (soft delete)
 *
 * Acesso: SUPER_ADMIN apenas (Fase 1A)
 */

import { Router, Request, Response } from 'express';
import { authenticateAdmin, requireSuperAdmin } from '../middlewares/auth';
import { pool } from '../db';
import { z } from 'zod';
import { audit, auditCtx } from '../utils/audit';

const router = Router();
router.use(authenticateAdmin);
router.use(requireSuperAdmin);

// --- Schemas ---

const createFloorSchema = z.object({
  territory_id: z.string().uuid('territory_id deve ser UUID válido'),
  pricing_profile_id: z.string().uuid().nullable().optional(),
  origin_label: z.string().min(1, 'origin_label é obrigatório'),
  origin_neighborhood_id: z.string().nullable().optional(),
  dest_label: z.string().min(1, 'dest_label é obrigatório'),
  dest_neighborhood_id: z.string().nullable().optional(),
  floor_price: z.number().min(0.01, 'floor_price deve ser positivo'),
  surcharge: z.number().min(0).default(0),
  notes: z.string().nullable().optional(),
});

const updateFloorSchema = z.object({
  floor_price: z.number().min(0.01).optional(),
  surcharge: z.number().min(0).optional(),
  dest_label: z.string().min(1).optional(),
  dest_neighborhood_id: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
});

// --- Routes ---

// GET /api/admin/territory-floors?territory_id=xxx
router.get('/', async (req: Request, res: Response) => {
  try {
    const { territory_id } = req.query;

    if (!territory_id) {
      return res.status(400).json({
        success: false,
        error: 'territory_id é obrigatório como query parameter',
      });
    }

    const result = await pool.query(
      `SELECT id, territory_id, pricing_profile_id,
              origin_label, origin_neighborhood_id,
              dest_label, dest_neighborhood_id,
              floor_price, surcharge, notes,
              is_active, created_by, created_at, updated_at
       FROM territory_price_floors
       WHERE territory_id = $1
       ORDER BY origin_label, floor_price ASC`,
      [territory_id]
    );

    res.json({
      success: true,
      data: result.rows.map(normalizeRow),
      total: result.rows.length,
    });
  } catch (error) {
    console.error('[ADMIN_TERRITORY_FLOORS] List error:', error);
    res.status(500).json({ success: false, error: 'Erro ao listar pisos territoriais' });
  }
});

// GET /api/admin/territory-floors/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT id, territory_id, pricing_profile_id,
              origin_label, origin_neighborhood_id,
              dest_label, dest_neighborhood_id,
              floor_price, surcharge, notes,
              is_active, created_by, created_at, updated_at
       FROM territory_price_floors
       WHERE id = $1`,
      [id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, error: 'Piso territorial não encontrado' });
    }

    res.json({ success: true, data: normalizeRow(result.rows[0]) });
  } catch (error) {
    console.error('[ADMIN_TERRITORY_FLOORS] Get error:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar piso territorial' });
  }
});

// POST /api/admin/territory-floors
router.post('/', async (req: Request, res: Response) => {
  try {
    const ctx = auditCtx(req);
    const parsed = createFloorSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.errors[0].message,
      });
    }

    const data = parsed.data;

    const result = await pool.query(
      `INSERT INTO territory_price_floors (
        territory_id, pricing_profile_id,
        origin_label, origin_neighborhood_id,
        dest_label, dest_neighborhood_id,
        floor_price, surcharge, notes,
        created_by, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now(),now())
      RETURNING id`,
      [
        data.territory_id,
        data.pricing_profile_id || null,
        data.origin_label,
        data.origin_neighborhood_id || null,
        data.dest_label,
        data.dest_neighborhood_id || null,
        data.floor_price,
        data.surcharge,
        data.notes || null,
        ctx.adminId,
      ]
    );

    const newId = result.rows[0].id;

    await audit({
      adminId: ctx.adminId,
      adminEmail: ctx.adminEmail,
      action: 'create_territory_floor',
      entityType: 'territory_price_floor',
      entityId: newId,
      newValue: data,
      ipAddress: ctx.ip,
      userAgent: ctx.ua,
    });

    console.log(`[ADMIN_TERRITORY_FLOORS] Created: id=${newId} territory=${data.territory_id} "${data.origin_label}→${data.dest_label}" floor=${data.floor_price}`);

    res.status(201).json({
      success: true,
      data: { id: newId },
      message: 'Piso territorial criado com sucesso',
    });
  } catch (error) {
    console.error('[ADMIN_TERRITORY_FLOORS] Create error:', error);
    res.status(500).json({ success: false, error: 'Erro ao criar piso territorial' });
  }
});

// PUT /api/admin/territory-floors/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ctx = auditCtx(req);
    const parsed = updateFloorSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.errors[0].message,
      });
    }

    const data = parsed.data;
    const updates = Object.entries(data).filter(([_, v]) => v !== undefined);

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'Nenhum campo para atualizar' });
    }

    // Build dynamic SET clause
    const setClauses: string[] = ['updated_at = now()'];
    const values: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of updates) {
      setClauses.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
    values.push(id);

    const result = await pool.query(
      `UPDATE territory_price_floors
       SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, floor_price, surcharge, dest_label, is_active`,
      values
    );

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, error: 'Piso territorial não encontrado' });
    }

    await audit({
      adminId: ctx.adminId,
      adminEmail: ctx.adminEmail,
      action: 'update_territory_floor',
      entityType: 'territory_price_floor',
      entityId: id,
      newValue: data,
      ipAddress: ctx.ip,
      userAgent: ctx.ua,
    });

    console.log(`[ADMIN_TERRITORY_FLOORS] Updated: id=${id} fields=${updates.map(([k]) => k).join(',')}`);

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Piso territorial atualizado',
    });
  } catch (error) {
    console.error('[ADMIN_TERRITORY_FLOORS] Update error:', error);
    res.status(500).json({ success: false, error: 'Erro ao atualizar piso territorial' });
  }
});

// DELETE /api/admin/territory-floors/:id (soft delete)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ctx = auditCtx(req);

    const result = await pool.query(
      `UPDATE territory_price_floors
       SET is_active = false, updated_at = now()
       WHERE id = $1 AND is_active = true
       RETURNING id, dest_label`,
      [id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, error: 'Piso territorial não encontrado ou já inativo' });
    }

    await audit({
      adminId: ctx.adminId,
      adminEmail: ctx.adminEmail,
      action: 'delete_territory_floor',
      entityType: 'territory_price_floor',
      entityId: id,
      ipAddress: ctx.ip,
      userAgent: ctx.ua,
    });

    console.log(`[ADMIN_TERRITORY_FLOORS] Deactivated: id=${id} dest="${result.rows[0].dest_label}"`);

    res.json({
      success: true,
      message: 'Piso territorial desativado',
    });
  } catch (error) {
    console.error('[ADMIN_TERRITORY_FLOORS] Delete error:', error);
    res.status(500).json({ success: false, error: 'Erro ao desativar piso territorial' });
  }
});

// --- Helpers ---

function normalizeRow(row: any) {
  return {
    id: row.id,
    territory_id: row.territory_id,
    pricing_profile_id: row.pricing_profile_id,
    origin_label: row.origin_label,
    origin_neighborhood_id: row.origin_neighborhood_id,
    dest_label: row.dest_label,
    dest_neighborhood_id: row.dest_neighborhood_id,
    floor_price: Number(row.floor_price),
    surcharge: Number(row.surcharge),
    total_floor: Math.round((Number(row.floor_price) + Number(row.surcharge)) * 100) / 100,
    notes: row.notes,
    is_active: row.is_active,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export default router;
