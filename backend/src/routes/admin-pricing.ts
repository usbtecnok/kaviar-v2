import { Router, Request, Response } from 'express';
import { authenticateAdmin, requireSuperAdmin } from '../middlewares/auth';
import { audit, auditCtx } from '../utils/audit';
import { pool } from '../db';
import { z } from 'zod';
import * as bcrypt from 'bcryptjs';

import { resolveTerritory } from '../services/territory-resolver.service';
import * as pricingEngine from '../services/pricing-engine';

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

// POST /api/admin/pricing-profiles/simulate
router.post('/simulate', async (req: Request, res: Response) => {
  try {
    const { origin_lat, origin_lng, dest_lat, dest_lng, driver_neighborhood_id } = req.body;
    if (!origin_lat || !origin_lng || !dest_lat || !dest_lng) {
      return res.status(400).json({ success: false, error: 'origin_lat, origin_lng, dest_lat, dest_lng são obrigatórios' });
    }

    const profile = await pricingEngine.resolveProfile(origin_lat, origin_lng);
    const distance_km = Math.round(pricingEngine.haversineKm(origin_lat, origin_lng, dest_lat, dest_lng) * 100) / 100;

    const [originRes, destRes] = await Promise.all([
      resolveTerritory(origin_lng, origin_lat),
      resolveTerritory(dest_lng, dest_lat),
    ]);
    const originNeighborhoodId = originRes.neighborhood?.id || null;
    const destNeighborhoodId = destRes.neighborhood?.id || null;

    // Route territory (visão do passageiro / preço)
    const route_territory = pricingEngine.classifyRouteFromIds(originNeighborhoodId, destNeighborhoodId);

    // Driver territory (visão do motorista / taxa + crédito)
    const driver_territory = driver_neighborhood_id
      ? pricingEngine.classifyWithDriver(driver_neighborhood_id, originNeighborhoodId, destNeighborhoodId)
      : route_territory;

    const raw = profile.base_fare + distance_km * profile.per_km;
    let price = Math.round(Math.max(raw, profile.minimum_fare) * 100) / 100;
    const surcharge_applied = route_territory === 'external' && profile.surcharge_external > 0 ? profile.surcharge_external : 0;
    price = Math.round((price + surcharge_applied) * 100) / 100;

    const fee_percent = pricingEngine.feeForTerritory(profile, driver_territory as any);
    const fee_amount = Math.round(price * fee_percent / 100 * 100) / 100;
    const driver_earnings = Math.round((price - fee_amount) * 100) / 100;
    const { cost: credit_cost } = pricingEngine.creditForTerritory(profile, driver_territory as any);
    const credit_value = credit_cost * 2.00;
    const driver_net_after_credit = Math.round((driver_earnings - credit_value) * 100) / 100;

    res.json({
      success: true,
      data: {
        pricing_profile: profile.slug,
        route_territory,
        driver_territory: driver_neighborhood_id ? driver_territory : null,
        distance_km,
        price,
        surcharge_applied,
        fee_percent,
        fee_amount,
        driver_earnings,
        credit_cost,
        credit_value,
        driver_net_after_credit,
        origin_neighborhood: originRes.neighborhood?.name || null,
        dest_neighborhood: destRes.neighborhood?.name || null,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro na simulação' });
  }
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

const createSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),
  name: z.string().min(1, 'Nome é obrigatório'),
  base_fare: z.number().min(0),
  per_km: z.number().min(0),
  per_minute: z.number().min(0),
  minimum_fare: z.number().min(0),
  fee_local: z.number().min(0).max(100),
  fee_adjacent: z.number().min(0).max(100),
  fee_external: z.number().min(0).max(100),
  surcharge_external: z.number().min(0),
  credit_cost_local: z.number().int().min(0),
  credit_cost_external: z.number().int().min(0),
  max_dispatch_km: z.number().min(0),
  center_lat: z.number().min(-90).max(90).nullable().optional(),
  center_lng: z.number().min(-180).max(180).nullable().optional(),
  radius_km: z.number().min(0).nullable().optional(),
  password: z.string().min(1, 'Senha é obrigatória'),
  reason: z.string().min(10, 'Motivo deve ter pelo menos 10 caracteres'),
});

// POST /api/admin/pricing-profiles
router.post('/', async (req: Request, res: Response) => {
  try {
    const ctx = auditCtx(req);
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const { password, reason, ...fields } = parsed.data;

    // Re-authenticate admin
    const adminRow = await pool.query('SELECT password FROM admins WHERE id = $1', [ctx.adminId]);
    if (!adminRow.rows[0] || !(await bcrypt.compare(password, adminRow.rows[0].password))) {
      return res.status(401).json({ success: false, error: 'Senha incorreta' });
    }

    // Check slug unique
    const existing = await pool.query('SELECT id FROM pricing_profiles WHERE slug = $1', [fields.slug]);
    if (existing.rows[0]) {
      return res.status(409).json({ success: false, error: 'Slug já existe' });
    }

    await pool.query(
      `INSERT INTO pricing_profiles (slug, name, base_fare, per_km, per_minute, minimum_fare,
        fee_local, fee_adjacent, fee_external, surcharge_external,
        credit_cost_local, credit_cost_external, max_dispatch_km,
        center_lat, center_lng, radius_km, is_default, is_active, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,false,true,now())`,
      [fields.slug, fields.name, fields.base_fare, fields.per_km, fields.per_minute, fields.minimum_fare,
       fields.fee_local, fields.fee_adjacent, fields.fee_external, fields.surcharge_external,
       fields.credit_cost_local, fields.credit_cost_external, fields.max_dispatch_km,
       fields.center_lat || null, fields.center_lng || null, fields.radius_km || null]
    );

    await audit({
      adminId: ctx.adminId, adminEmail: ctx.adminEmail,
      action: 'create_pricing_profile', entityType: 'pricing_profile', entityId: fields.slug,
      newValue: fields, reason, ipAddress: ctx.ip, userAgent: ctx.ua,
    });

    res.status(201).json({ success: true, message: 'Perfil criado com sucesso' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao criar perfil' });
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
