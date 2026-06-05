/**
 * Admin Territory Price Floors — CRUD + Governança (Fase 2A)
 *
 * Endpoints SUPER_ADMIN:
 *   GET    /api/admin/territory-floors?territory_id=xxx          — lista pisos (todos status)
 *   GET    /api/admin/territory-floors/pending                   — lista propostas pendentes
 *   GET    /api/admin/territory-floors/:id                       — busca um piso por ID
 *   POST   /api/admin/territory-floors                           — cria novo piso (active direto)
 *   PUT    /api/admin/territory-floors/:id                       — atualiza piso existente
 *   PUT    /api/admin/territory-floors/:id/approve               — aprova proposta
 *   PUT    /api/admin/territory-floors/:id/reject                — rejeita proposta
 *   PUT    /api/admin/territory-floors/:id/archive               — arquiva piso
 *   DELETE /api/admin/territory-floors/:id                       — desativa piso (soft delete)
 *
 * Acesso: SUPER_ADMIN apenas
 */

import { Router, Request, Response } from 'express';
import { authenticateAdmin, requireSuperAdmin } from '../middlewares/auth';
import { pool } from '../db';
import { z } from 'zod';
import { audit, auditCtx } from '../utils/audit';

const router = Router();
router.use(authenticateAdmin);
router.use(requireSuperAdmin);

// --- Constants ---

const MAX_FLOOR_PRICE = 200;
const MAX_SURCHARGE = 30;
const VALID_STATUSES = ['active', 'draft', 'pending_approval', 'rejected', 'archived'] as const;

// --- Schemas ---

const createFloorSchema = z.object({
  territory_id: z.string().uuid('territory_id deve ser UUID válido'),
  pricing_profile_id: z.string().uuid().nullable().optional(),
  origin_label: z.string().min(1, 'origin_label é obrigatório'),
  origin_neighborhood_id: z.string().nullable().optional(),
  dest_label: z.string().min(1, 'dest_label é obrigatório'),
  dest_neighborhood_id: z.string().nullable().optional(),
  floor_price: z.number().min(0.01, 'floor_price deve ser positivo').max(MAX_FLOOR_PRICE, `floor_price não pode exceder R$ ${MAX_FLOOR_PRICE}`),
  surcharge: z.number().min(0).max(MAX_SURCHARGE, `surcharge não pode exceder R$ ${MAX_SURCHARGE}`).default(0),
  notes: z.string().min(1, 'Motivo/observação é obrigatório'),
  status: z.enum(VALID_STATUSES).default('active'),
});

const updateFloorSchema = z.object({
  floor_price: z.number().min(0.01).max(MAX_FLOOR_PRICE, `floor_price não pode exceder R$ ${MAX_FLOOR_PRICE}`).optional(),
  surcharge: z.number().min(0).max(MAX_SURCHARGE, `surcharge não pode exceder R$ ${MAX_SURCHARGE}`).optional(),
  dest_label: z.string().min(1).optional(),
  dest_neighborhood_id: z.string().nullable().optional(),
  notes: z.string().min(1, 'Motivo da alteração é obrigatório'),
  is_active: z.boolean().optional(),
});

const reviewSchema = z.object({
  reason: z.string().min(3, 'Motivo é obrigatório (mín. 3 caracteres)'),
});

// --- Routes ---

// GET /api/admin/territory-floors?territory_id=xxx&status=active
router.get('/', async (req: Request, res: Response) => {
  try {
    const { territory_id, status } = req.query;

    if (!territory_id) {
      return res.status(400).json({
        success: false,
        error: 'territory_id é obrigatório como query parameter',
      });
    }

    let query = `SELECT id, territory_id, pricing_profile_id,
              origin_label, origin_neighborhood_id,
              dest_label, dest_neighborhood_id,
              floor_price, surcharge, notes,
              status, is_active, submitted_by, reviewed_by, reviewed_at, review_reason,
              version, created_by, created_at, updated_at
       FROM territory_price_floors
       WHERE territory_id = $1`;
    const params: any[] = [territory_id];

    if (status && VALID_STATUSES.includes(status as any)) {
      query += ` AND status = $2`;
      params.push(status);
    }

    query += ` ORDER BY status ASC, origin_label ASC, floor_price ASC`;

    const result = await pool.query(query, params);

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

// GET /api/admin/territory-floors/pending — propostas pendentes de aprovação (todos os territórios)
router.get('/pending', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT tpf.id, tpf.territory_id, tpf.pricing_profile_id,
              tpf.origin_label, tpf.origin_neighborhood_id,
              tpf.dest_label, tpf.dest_neighborhood_id,
              tpf.floor_price, tpf.surcharge, tpf.notes,
              tpf.status, tpf.is_active, tpf.submitted_by, tpf.reviewed_by,
              tpf.reviewed_at, tpf.review_reason,
              tpf.version, tpf.created_by, tpf.created_at, tpf.updated_at,
              ot.name as territory_name
       FROM territory_price_floors tpf
       LEFT JOIN operational_territories ot ON ot.id::text = tpf.territory_id::text
       WHERE tpf.status = 'pending_approval'
       ORDER BY tpf.created_at ASC`
    );

    res.json({
      success: true,
      data: result.rows.map(row => ({
        ...normalizeRow(row),
        territory_name: row.territory_name || null,
      })),
      total: result.rows.length,
    });
  } catch (error) {
    console.error('[ADMIN_TERRITORY_FLOORS] Pending list error:', error);
    res.status(500).json({ success: false, error: 'Erro ao listar propostas pendentes' });
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
              status, is_active, submitted_by, reviewed_by, reviewed_at, review_reason,
              version, created_by, created_at, updated_at
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

// POST /api/admin/territory-floors — SUPER_ADMIN cria diretamente (default status = 'active')
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
        status, submitted_by, created_by, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,now(),now())
      RETURNING id, status`,
      [
        data.territory_id,
        data.pricing_profile_id || null,
        data.origin_label,
        data.origin_neighborhood_id || null,
        data.dest_label,
        data.dest_neighborhood_id || null,
        data.floor_price,
        data.surcharge,
        data.notes,
        data.status,
        ctx.adminId,
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

    console.log(`[ADMIN_TERRITORY_FLOORS] Created: id=${newId} territory=${data.territory_id} "${data.origin_label}→${data.dest_label}" floor=${data.floor_price} status=${data.status}`);

    res.status(201).json({
      success: true,
      data: { id: newId, status: result.rows[0].status },
      message: 'Piso territorial criado com sucesso',
    });
  } catch (error) {
    console.error('[ADMIN_TERRITORY_FLOORS] Create error:', error);
    res.status(500).json({ success: false, error: 'Erro ao criar piso territorial' });
  }
});

// PUT /api/admin/territory-floors/:id — edita piso existente
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
    const { notes: reason, ...fields } = data;
    const updates = Object.entries(fields).filter(([_, v]) => v !== undefined);

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

    // Increment version
    setClauses.push(`version = version + 1`);

    values.push(id);

    const result = await pool.query(
      `UPDATE territory_price_floors
       SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, floor_price, surcharge, dest_label, is_active, status, version`,
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
      newValue: { ...fields, reason },
      ipAddress: ctx.ip,
      userAgent: ctx.ua,
    });

    console.log(`[ADMIN_TERRITORY_FLOORS] Updated: id=${id} fields=${updates.map(([k]) => k).join(',')} reason="${reason}"`);

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

// PUT /api/admin/territory-floors/:id/approve — aprova proposta pendente
router.put('/:id/approve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ctx = auditCtx(req);
    const parsed = reviewSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }

    const { reason } = parsed.data;

    const result = await pool.query(
      `UPDATE territory_price_floors
       SET status = 'active', reviewed_by = $2, reviewed_at = now(),
           review_reason = $3, is_active = true, updated_at = now()
       WHERE id = $1 AND status = 'pending_approval'
       RETURNING id, territory_id, origin_label, dest_label, floor_price, submitted_by`,
      [id, ctx.adminId, reason]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, error: 'Proposta não encontrada ou não está pendente' });
    }

    const row = result.rows[0];

    await audit({
      adminId: ctx.adminId,
      adminEmail: ctx.adminEmail,
      action: 'approve_territory_floor',
      entityType: 'territory_price_floor',
      entityId: id,
      newValue: { status: 'active', reason, submitted_by: row.submitted_by },
      ipAddress: ctx.ip,
      userAgent: ctx.ua,
    });

    console.log(`[ADMIN_TERRITORY_FLOORS] Approved: id=${id} "${row.origin_label}→${row.dest_label}" floor=${row.floor_price} reason="${reason}"`);

    res.json({
      success: true,
      message: 'Proposta aprovada — piso territorial ativado',
      data: { id, status: 'active' },
    });
  } catch (error) {
    console.error('[ADMIN_TERRITORY_FLOORS] Approve error:', error);
    res.status(500).json({ success: false, error: 'Erro ao aprovar proposta' });
  }
});

// PUT /api/admin/territory-floors/:id/reject — rejeita proposta pendente
router.put('/:id/reject', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ctx = auditCtx(req);
    const parsed = reviewSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }

    const { reason } = parsed.data;

    const result = await pool.query(
      `UPDATE territory_price_floors
       SET status = 'rejected', reviewed_by = $2, reviewed_at = now(),
           review_reason = $3, is_active = false, updated_at = now()
       WHERE id = $1 AND status = 'pending_approval'
       RETURNING id, territory_id, origin_label, dest_label, floor_price, submitted_by`,
      [id, ctx.adminId, reason]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, error: 'Proposta não encontrada ou não está pendente' });
    }

    const row = result.rows[0];

    await audit({
      adminId: ctx.adminId,
      adminEmail: ctx.adminEmail,
      action: 'reject_territory_floor',
      entityType: 'territory_price_floor',
      entityId: id,
      newValue: { status: 'rejected', reason, submitted_by: row.submitted_by },
      ipAddress: ctx.ip,
      userAgent: ctx.ua,
    });

    console.log(`[ADMIN_TERRITORY_FLOORS] Rejected: id=${id} "${row.origin_label}→${row.dest_label}" reason="${reason}"`);

    res.json({
      success: true,
      message: 'Proposta rejeitada',
      data: { id, status: 'rejected' },
    });
  } catch (error) {
    console.error('[ADMIN_TERRITORY_FLOORS] Reject error:', error);
    res.status(500).json({ success: false, error: 'Erro ao rejeitar proposta' });
  }
});

// PUT /api/admin/territory-floors/:id/archive — arquiva piso ativo
router.put('/:id/archive', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ctx = auditCtx(req);
    const parsed = reviewSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }

    const { reason } = parsed.data;

    const result = await pool.query(
      `UPDATE territory_price_floors
       SET status = 'archived', is_active = false, reviewed_by = $2,
           reviewed_at = now(), review_reason = $3, updated_at = now()
       WHERE id = $1 AND status = 'active'
       RETURNING id, dest_label`,
      [id, ctx.adminId, reason]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, error: 'Piso não encontrado ou não está ativo' });
    }

    await audit({
      adminId: ctx.adminId,
      adminEmail: ctx.adminEmail,
      action: 'archive_territory_floor',
      entityType: 'territory_price_floor',
      entityId: id,
      newValue: { status: 'archived', reason },
      ipAddress: ctx.ip,
      userAgent: ctx.ua,
    });

    console.log(`[ADMIN_TERRITORY_FLOORS] Archived: id=${id} dest="${result.rows[0].dest_label}" reason="${reason}"`);

    res.json({
      success: true,
      message: 'Piso territorial arquivado',
      data: { id, status: 'archived' },
    });
  } catch (error) {
    console.error('[ADMIN_TERRITORY_FLOORS] Archive error:', error);
    res.status(500).json({ success: false, error: 'Erro ao arquivar piso territorial' });
  }
});

// DELETE /api/admin/territory-floors/:id (soft delete — backward compat)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ctx = auditCtx(req);

    const result = await pool.query(
      `UPDATE territory_price_floors
       SET is_active = false, status = 'archived', updated_at = now()
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
    status: row.status || 'active',
    is_active: row.is_active,
    submitted_by: row.submitted_by || null,
    reviewed_by: row.reviewed_by || null,
    reviewed_at: row.reviewed_at || null,
    review_reason: row.review_reason || null,
    version: row.version || 1,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export default router;
