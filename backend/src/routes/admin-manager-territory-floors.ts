/**
 * Manager Territory Floors — Visualização + Propostas (Fase 2A)
 *
 * Endpoints TERRITORIAL_MANAGER:
 *   GET  /api/admin/manager/territory-floors          — tabela ativa do próprio território
 *   GET  /api/admin/manager/territory-floors/proposals — propostas enviadas pelo gestor
 *   POST /api/admin/manager/territory-floors/propose  — propor novo piso (status = pending_approval)
 *
 * Regras:
 *   - TERRITORIAL_MANAGER nunca cria com status = 'active'
 *   - TERRITORIAL_MANAGER não edita piso ativo diretamente
 *   - Toda proposta requer motivo (notes obrigatório)
 *   - Teto máximo: floor_price <= R$ 200, surcharge <= R$ 30
 *   - Escopo: apenas dados do próprio território (via territoryScope)
 */

import { Router, Request, Response } from 'express';
import { authenticateAdmin, requireRole } from '../middlewares/auth';
import { applyTerritoryScope } from '../middlewares/territory-scope';
import { requireTerritoryScope } from '../middlewares/require-territory-scope';
import { pool } from '../db';
import { z } from 'zod';
import { audit, auditCtx } from '../utils/audit';

const router = Router();

router.use(authenticateAdmin);
router.use(requireRole(['TERRITORIAL_MANAGER', 'SUPER_ADMIN']));
router.use(applyTerritoryScope);
router.use(requireTerritoryScope);

// --- Constants ---

const MAX_FLOOR_PRICE = 200;
const MAX_SURCHARGE = 30;

// --- Schemas ---

const proposeFloorSchema = z.object({
  origin_label: z.string().min(1, 'origin_label é obrigatório'),
  origin_neighborhood_id: z.string().nullable().optional(),
  dest_label: z.string().min(1, 'dest_label é obrigatório'),
  dest_neighborhood_id: z.string().nullable().optional(),
  floor_price: z.number().min(0.01, 'floor_price deve ser positivo').max(MAX_FLOOR_PRICE, `Preço máximo permitido: R$ ${MAX_FLOOR_PRICE}`),
  surcharge: z.number().min(0).max(MAX_SURCHARGE, `Acréscimo máximo: R$ ${MAX_SURCHARGE}`).default(0),
  notes: z.string().min(5, 'Motivo/justificativa é obrigatório (mín. 5 caracteres)'),
});

// --- Helpers ---

function getTerritoryIds(req: Request): string[] {
  const scope = (req as any).territoryScope;
  return scope?.territoryIds || [];
}

function normalizeRow(row: any) {
  return {
    id: row.id,
    territory_id: row.territory_id,
    origin_label: row.origin_label,
    origin_neighborhood_id: row.origin_neighborhood_id,
    dest_label: row.dest_label,
    dest_neighborhood_id: row.dest_neighborhood_id,
    floor_price: Number(row.floor_price),
    surcharge: Number(row.surcharge),
    total_floor: Math.round((Number(row.floor_price) + Number(row.surcharge)) * 100) / 100,
    notes: row.notes,
    status: row.status || 'active',
    version: row.version || 1,
    reviewed_at: row.reviewed_at || null,
    review_reason: row.review_reason || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// --- Routes ---

// GET /api/admin/manager/territory-floors — tabela ativa do próprio território (somente leitura)
router.get('/', async (req: Request, res: Response) => {
  try {
    const territoryIds = getTerritoryIds(req);

    if (territoryIds.length === 0) {
      return res.json({ success: true, data: [], total: 0 });
    }

    // Build IN clause for multiple territory IDs
    const placeholders = territoryIds.map((_, i) => `$${i + 1}`).join(',');

    const result = await pool.query(
      `SELECT id, territory_id, origin_label, origin_neighborhood_id,
              dest_label, dest_neighborhood_id,
              floor_price, surcharge, notes,
              status, version, created_at, updated_at
       FROM territory_price_floors
       WHERE territory_id IN (${placeholders})
         AND is_active = true
         AND status = 'active'
       ORDER BY origin_label ASC, floor_price ASC`,
      territoryIds
    );

    res.json({
      success: true,
      data: result.rows.map(normalizeRow),
      total: result.rows.length,
    });
  } catch (error) {
    console.error('[MANAGER_TERRITORY_FLOORS] List error:', error);
    res.status(500).json({ success: false, error: 'Erro ao listar pisos territoriais' });
  }
});

// GET /api/admin/manager/territory-floors/proposals — propostas enviadas pelo gestor
router.get('/proposals', async (req: Request, res: Response) => {
  try {
    const admin = (req as any).admin;
    const territoryIds = getTerritoryIds(req);

    if (territoryIds.length === 0) {
      return res.json({ success: true, data: [], total: 0 });
    }

    const placeholders = territoryIds.map((_, i) => `$${i + 1}`).join(',');

    const result = await pool.query(
      `SELECT id, territory_id, origin_label, origin_neighborhood_id,
              dest_label, dest_neighborhood_id,
              floor_price, surcharge, notes,
              status, version, reviewed_at, review_reason,
              created_at, updated_at
       FROM territory_price_floors
       WHERE territory_id IN (${placeholders})
         AND submitted_by = $${territoryIds.length + 1}
         AND status IN ('pending_approval', 'rejected', 'draft')
       ORDER BY created_at DESC`,
      [...territoryIds, admin.id]
    );

    res.json({
      success: true,
      data: result.rows.map(normalizeRow),
      total: result.rows.length,
    });
  } catch (error) {
    console.error('[MANAGER_TERRITORY_FLOORS] Proposals error:', error);
    res.status(500).json({ success: false, error: 'Erro ao listar propostas' });
  }
});

// POST /api/admin/manager/territory-floors/propose — propor novo piso territorial
router.post('/propose', async (req: Request, res: Response) => {
  try {
    const admin = (req as any).admin;
    const ctx = auditCtx(req);
    const territoryIds = getTerritoryIds(req);

    if (territoryIds.length === 0) {
      return res.status(403).json({ success: false, error: 'Sem território vinculado' });
    }

    const parsed = proposeFloorSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.errors[0].message,
      });
    }

    const data = parsed.data;
    const territoryId = territoryIds[0]; // usa o primeiro território vinculado

    const result = await pool.query(
      `INSERT INTO territory_price_floors (
        territory_id,
        origin_label, origin_neighborhood_id,
        dest_label, dest_neighborhood_id,
        floor_price, surcharge, notes,
        status, submitted_by, created_by,
        created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending_approval',$9,$10,now(),now())
      RETURNING id`,
      [
        territoryId,
        data.origin_label,
        data.origin_neighborhood_id || null,
        data.dest_label,
        data.dest_neighborhood_id || null,
        data.floor_price,
        data.surcharge,
        data.notes,
        admin.id,
        admin.id,
      ]
    );

    const newId = result.rows[0].id;

    await audit({
      adminId: ctx.adminId,
      adminEmail: ctx.adminEmail,
      action: 'propose_territory_floor',
      entityType: 'territory_price_floor',
      entityId: newId,
      newValue: { ...data, territory_id: territoryId, status: 'pending_approval' },
      ipAddress: ctx.ip,
      userAgent: ctx.ua,
    });

    console.log(`[MANAGER_TERRITORY_FLOORS] Proposed: id=${newId} by=${admin.id} territory=${territoryId} "${data.origin_label}→${data.dest_label}" floor=${data.floor_price}`);

    res.status(201).json({
      success: true,
      data: { id: newId, status: 'pending_approval' },
      message: 'Proposta enviada para aprovação do administrador',
    });
  } catch (error) {
    console.error('[MANAGER_TERRITORY_FLOORS] Propose error:', error);
    res.status(500).json({ success: false, error: 'Erro ao enviar proposta' });
  }
});

export default router;
