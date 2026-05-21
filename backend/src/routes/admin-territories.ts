import { Router, Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { authenticateAdmin, requireSuperAdmin } from '../middlewares/auth';
import { audit, auditCtx } from '../utils/audit';

const router = Router();
router.use(authenticateAdmin, requireSuperAdmin);

const VALID_LEVELS = ['country', 'state', 'city', 'region', 'operation'];
const VALID_STATUSES = ['planning', 'preparation', 'active', 'inactive'];
const ALLOWED_REGIONAL_ROLE = 'ANGEL_VIEWER';

// ─── Territories ─────────────────────────────────────────────────────────────

// GET /api/admin/territories
router.get('/', async (_req: Request, res: Response) => {
  try {
    const territories = await prisma.operational_territories.findMany({
      include: {
        _count: { select: { neighborhoods: true, territorial_partners: true, admin_access: true } },
        parent: { select: { id: true, name: true } },
      },
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
    });
    res.json({ success: true, data: territories });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao listar territórios' });
  }
});

// GET /api/admin/territories/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const territory = await prisma.operational_territories.findUnique({
      where: { id: req.params.id },
      include: {
        parent: { select: { id: true, name: true, level: true } },
        children: { select: { id: true, name: true, level: true, status: true } },
        neighborhoods: { select: { id: true, name: true, city: true, is_active: true }, orderBy: { name: 'asc' } },
        territorial_partners: { select: { id: true, name: true, partner_type: true, status: true, plan: true, responsible_name: true, responsible_phone: true } },
        admin_access: {
          include: { admin: { select: { id: true, name: true, email: true, role: true, is_active: true } } },
        },
      },
    });
    if (!territory) return res.status(404).json({ success: false, error: 'Território não encontrado' });
    res.json({ success: true, data: territory });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao buscar território' });
  }
});

const createTerritorySchema = z.object({
  name: z.string().min(2).max(100),
  level: z.enum(['country', 'state', 'city', 'region', 'operation'] as const),
  status: z.enum(['planning', 'preparation', 'active', 'inactive'] as const).default('planning'),
  parent_id: z.string().optional().nullable(),
  uf: z.string().max(2).optional().nullable(),
  city_name: z.string().optional().nullable(),
  center_lat: z.number().min(-90).max(90).optional().nullable(),
  center_lng: z.number().min(-180).max(180).optional().nullable(),
  notes: z.string().optional().nullable(),
});

// POST /api/admin/territories
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = createTerritorySchema.parse(req.body);

    if (data.parent_id) {
      const parent = await prisma.operational_territories.findUnique({ where: { id: data.parent_id } });
      if (!parent) return res.status(400).json({ success: false, error: 'Território pai não encontrado' });
    }

    const territory = await prisma.operational_territories.create({
      data: {
        name: data.name,
        level: data.level,
        status: data.status,
        parent_id: data.parent_id || null,
        uf: data.uf?.toUpperCase() || null,
        city_name: data.city_name || null,
        center_lat: data.center_lat ?? null,
        center_lng: data.center_lng ?? null,
        notes: data.notes || null,
        is_active: data.status === 'active',
      },
    });

    const ctx = auditCtx(req);
    audit({ adminId: ctx.adminId, adminEmail: ctx.adminEmail, action: 'create_territory', entityType: 'territory', entityId: territory.id, newValue: { name: data.name, level: data.level, status: data.status }, ipAddress: ctx.ip });

    res.status(201).json({ success: true, data: territory });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ success: false, error: error.errors[0].message });
    res.status(500).json({ success: false, error: 'Erro ao criar território' });
  }
});

const updateTerritorySchema = z.object({
  name: z.string().min(2).max(100).optional(),
  status: z.enum(['planning', 'preparation', 'active', 'inactive'] as const).optional(),
  uf: z.string().max(2).optional().nullable(),
  city_name: z.string().optional().nullable(),
  center_lat: z.number().min(-90).max(90).optional().nullable(),
  center_lng: z.number().min(-180).max(180).optional().nullable(),
  notes: z.string().optional().nullable(),
});

// PATCH /api/admin/territories/:id
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const existing = await prisma.operational_territories.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, error: 'Território não encontrado' });

    const data = updateTerritorySchema.parse(req.body);
    const updates: any = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.status !== undefined) { updates.status = data.status; updates.is_active = data.status === 'active'; }
    if (data.uf !== undefined) updates.uf = data.uf?.toUpperCase() || null;
    if (data.city_name !== undefined) updates.city_name = data.city_name;
    if (data.center_lat !== undefined) updates.center_lat = data.center_lat;
    if (data.center_lng !== undefined) updates.center_lng = data.center_lng;
    if (data.notes !== undefined) updates.notes = data.notes;

    if (Object.keys(updates).length === 0) return res.status(400).json({ success: false, error: 'Nenhuma alteração' });

    const territory = await prisma.operational_territories.update({ where: { id: req.params.id }, data: updates });

    const ctx = auditCtx(req);
    const action = data.status ? (data.status === 'active' ? 'activate_territory' : data.status === 'inactive' ? 'deactivate_territory' : 'update_territory') : 'update_territory';
    audit({ adminId: ctx.adminId, adminEmail: ctx.adminEmail, action, entityType: 'territory', entityId: territory.id, oldValue: { status: existing.status }, newValue: updates, ipAddress: ctx.ip });

    res.json({ success: true, data: territory });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ success: false, error: error.errors[0].message });
    res.status(500).json({ success: false, error: 'Erro ao atualizar território' });
  }
});

// GET /api/admin/territories/:id/finance (read-only)
router.get('/:id/finance', async (req: Request, res: Response) => {
  try {
    const territory = await prisma.operational_territories.findUnique({ where: { id: req.params.id } });
    if (!territory) return res.status(404).json({ success: false, error: 'Território não encontrado' });

    // Resolve neighborhood_ids for this territory
    const neighborhoods = await prisma.neighborhoods.findMany({
      where: { territory_id: req.params.id },
      select: { id: true },
    });
    const nIds = neighborhoods.map((n) => n.id);

    // Resolve partner_ids for this territory
    const partners = await prisma.territorial_partners.findMany({
      where: { territory_id: req.params.id },
      select: { id: true },
    });
    const pIds = partners.map((p) => p.id);

    // Resolve driver_ids in territory
    const drivers = await prisma.drivers.findMany({
      where: { neighborhood_id: { in: nIds } },
      select: { id: true },
    });
    const dIds = drivers.map((d) => d.id);

    // Rides
    const rideFilter = nIds.length > 0 ? { origin_neighborhood_id: { in: nIds } } : { id: '__none__' };
    const [ridesTotal, ridesCompleted, ridesCanceled, ridesNoDriver] = await Promise.all([
      prisma.rides_v2.count({ where: rideFilter }),
      prisma.rides_v2.count({ where: { ...rideFilter, status: 'completed' } }),
      prisma.rides_v2.count({ where: { ...rideFilter, status: { in: ['canceled_by_passenger', 'canceled_by_driver'] } } }),
      prisma.rides_v2.count({ where: { ...rideFilter, status: 'no_driver' } }),
    ]);

    // Entities
    const passengersCount = nIds.length > 0
      ? await prisma.passengers.count({ where: { neighborhood_id: { in: nIds } } })
      : 0;

    // Credits
    let creditsPurchased = 0;
    let creditsConsumed = 0;
    if (dIds.length > 0) {
      const purchased = await prisma.driver_credit_purchases.aggregate({
        where: { driver_id: { in: dIds }, status: 'confirmed' },
        _sum: { credits_amount: true },
      });
      creditsPurchased = purchased._sum.credits_amount || 0;

      const consumed = await prisma.driver_credit_ledger.aggregate({
        where: { driver_id: { in: dIds }, delta: { lt: 0 } },
        _sum: { delta: true },
      });
      creditsConsumed = Math.abs(Number(consumed._sum.delta || 0));
    }

    // Compensations
    const compensations = dIds.length > 0
      ? await prisma.ride_compensations.aggregate({
          where: { driver_id: { in: dIds } },
          _count: true,
          _sum: { amount_cents: true },
        })
      : { _count: 0, _sum: { amount_cents: 0 } };

    // Partner finance
    let commissionsTotal = 0;
    let paymentsTotal = 0;
    let mensalidadesTotal = 0;
    if (pIds.length > 0) {
      const comms = await prisma.partner_commissions.aggregate({
        where: { partner_id: { in: pIds } },
        _sum: { commission_amount: true },
      });
      commissionsTotal = Number(comms._sum.commission_amount || 0);

      const payments = await prisma.partner_payments.aggregate({
        where: { partner_id: { in: pIds } },
        _sum: { amount_cents: true },
      });
      paymentsTotal = payments._sum.amount_cents || 0;

      const mensalidades = await prisma.partner_member_payments.aggregate({
        where: { partner_id: { in: pIds } },
        _sum: { amount_cents: true },
      });
      mensalidadesTotal = mensalidades._sum.amount_cents || 0;
    }

    // Revenue estimate from settlements
    let grossEstimated = 0;
    if (nIds.length > 0) {
      const revenue = await prisma.ride_settlements.aggregate({
        where: { origin_neighborhood_id: { in: nIds }, settled_at: { not: null } },
        _sum: { final_price: true },
      });
      grossEstimated = Number(revenue._sum.final_price || 0);
    }

    res.json({
      success: true,
      data: {
        rides: { total: ridesTotal, completed: ridesCompleted, canceled: ridesCanceled, no_driver: ridesNoDriver },
        entities: { drivers: dIds.length, passengers: passengersCount, partners: pIds.length },
        credits: { purchased: creditsPurchased, consumed: creditsConsumed },
        revenue: { gross_estimated: grossEstimated },
        compensations: { total: compensations._count, amount_cents: compensations._sum.amount_cents || 0 },
        partner_finance: { commissions_total: commissionsTotal, payments_total: paymentsTotal, mensalidades_total: mensalidadesTotal },
        status: territory.status,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao buscar financeiro territorial' });
  }
});

// ─── Regional Admins ─────────────────────────────────────────────────────────

// GET /api/admin/territories/regional-admins
router.get('/regional-admins/list', async (_req: Request, res: Response) => {
  try {
    const admins = await prisma.admins.findMany({
      where: { territory_access: { some: {} } },
      select: {
        id: true, name: true, email: true, role: true, is_active: true, created_at: true,
        territory_access: { include: { territory: { select: { id: true, name: true, level: true, status: true } } } },
      },
      orderBy: { created_at: 'desc' },
    });
    res.json({ success: true, data: admins });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao listar admins regionais' });
  }
});

const createRegionalAdminSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  territory_id: z.string().min(1),
  access_level: z.enum(['full', 'read_only']).default('full'),
});

// POST /api/admin/territories/regional-admins
router.post('/regional-admins', async (req: Request, res: Response) => {
  try {
    const data = createRegionalAdminSchema.parse(req.body);

    const existingEmail = await prisma.admins.findUnique({ where: { email: data.email } });
    if (existingEmail) return res.status(409).json({ success: false, error: 'Email já cadastrado' });

    const territory = await prisma.operational_territories.findUnique({ where: { id: data.territory_id } });
    if (!territory) return res.status(400).json({ success: false, error: 'Território não encontrado' });

    const password = await bcrypt.hash(data.password, 12);

    const result = await prisma.$transaction(async (tx) => {
      const admin = await tx.admins.create({
        data: {
          name: data.name,
          email: data.email.toLowerCase(),
          password,
          role: ALLOWED_REGIONAL_ROLE,
          is_active: true,
          must_change_password: true,
        },
      });
      const access = await tx.admin_territory_access.create({
        data: { admin_id: admin.id, territory_id: data.territory_id, access_level: data.access_level },
      });
      return { admin, access };
    });

    const ctx = auditCtx(req);
    audit({ adminId: ctx.adminId, adminEmail: ctx.adminEmail, action: 'create_regional_admin', entityType: 'admin', entityId: result.admin.id, newValue: { name: data.name, email: data.email, territory: territory.name }, ipAddress: ctx.ip });

    res.status(201).json({ success: true, data: { id: result.admin.id, name: result.admin.name, email: result.admin.email, role: result.admin.role, territory: territory.name } });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ success: false, error: error.errors[0].message });
    res.status(500).json({ success: false, error: 'Erro ao criar admin regional' });
  }
});

// PATCH /api/admin/territories/regional-admins/:id
router.patch('/regional-admins/:id', async (req: Request, res: Response) => {
  try {
    const { is_active } = req.body;
    if (typeof is_active !== 'boolean') return res.status(400).json({ success: false, error: 'is_active obrigatório' });

    const admin = await prisma.admins.findUnique({ where: { id: req.params.id } });
    if (!admin) return res.status(404).json({ success: false, error: 'Admin não encontrado' });
    if (admin.role === 'SUPER_ADMIN') return res.status(403).json({ success: false, error: 'Não é possível alterar SUPER_ADMIN' });

    await prisma.admins.update({ where: { id: req.params.id }, data: { is_active } });

    const ctx = auditCtx(req);
    audit({ adminId: ctx.adminId, adminEmail: ctx.adminEmail, action: is_active ? 'activate_regional_admin' : 'deactivate_regional_admin', entityType: 'admin', entityId: req.params.id, newValue: { is_active }, ipAddress: ctx.ip });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao atualizar admin' });
  }
});

// POST /api/admin/territories/regional-admins/:id/territories
router.post('/regional-admins/:id/territories', async (req: Request, res: Response) => {
  try {
    const { territory_id, access_level } = req.body;
    if (!territory_id) return res.status(400).json({ success: false, error: 'territory_id obrigatório' });

    const admin = await prisma.admins.findUnique({ where: { id: req.params.id } });
    if (!admin) return res.status(404).json({ success: false, error: 'Admin não encontrado' });
    if (admin.role === 'SUPER_ADMIN') return res.status(403).json({ success: false, error: 'SUPER_ADMIN não precisa de vínculo territorial' });

    const territory = await prisma.operational_territories.findUnique({ where: { id: territory_id } });
    if (!territory) return res.status(400).json({ success: false, error: 'Território não encontrado' });

    const existing = await prisma.admin_territory_access.findUnique({
      where: { admin_id_territory_id: { admin_id: req.params.id, territory_id } },
    });
    if (existing) return res.status(409).json({ success: false, error: 'Vínculo já existe' });

    await prisma.admin_territory_access.create({
      data: { admin_id: req.params.id, territory_id, access_level: access_level || 'full' },
    });

    const ctx = auditCtx(req);
    audit({ adminId: ctx.adminId, adminEmail: ctx.adminEmail, action: 'link_admin_territory', entityType: 'admin_territory_access', entityId: req.params.id, newValue: { territory: territory.name, access_level: access_level || 'full' }, ipAddress: ctx.ip });

    res.status(201).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao vincular território' });
  }
});

// DELETE /api/admin/territories/regional-admins/:id/territories/:territoryId
router.delete('/regional-admins/:id/territories/:territoryId', async (req: Request, res: Response) => {
  try {
    const existing = await prisma.admin_territory_access.findUnique({
      where: { admin_id_territory_id: { admin_id: req.params.id, territory_id: req.params.territoryId } },
    });
    if (!existing) return res.status(404).json({ success: false, error: 'Vínculo não encontrado' });

    await prisma.admin_territory_access.delete({
      where: { admin_id_territory_id: { admin_id: req.params.id, territory_id: req.params.territoryId } },
    });

    const ctx = auditCtx(req);
    audit({ adminId: ctx.adminId, adminEmail: ctx.adminEmail, action: 'unlink_admin_territory', entityType: 'admin_territory_access', entityId: req.params.id, newValue: { territory_id: req.params.territoryId }, ipAddress: ctx.ip });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao remover vínculo' });
  }
});

// DELETE /api/admin/territories/:id (safe delete)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const territory = await prisma.operational_territories.findUnique({ where: { id: req.params.id } });
    if (!territory) return res.status(404).json({ success: false, error: 'Território não encontrado' });

    const [neighborhoods, partners, admins, children] = await Promise.all([
      prisma.neighborhoods.count({ where: { territory_id: req.params.id } }),
      prisma.territorial_partners.count({ where: { territory_id: req.params.id } }),
      prisma.admin_territory_access.count({ where: { territory_id: req.params.id } }),
      prisma.operational_territories.count({ where: { parent_id: req.params.id } }),
    ]);

    if (neighborhoods + partners + admins + children > 0) {
      return res.status(409).json({
        success: false,
        error: 'Este território possui vínculos e não pode ser deletado. Você pode inativá-lo.',
        details: { neighborhoods, partners, admins, children },
      });
    }

    await prisma.operational_territories.delete({ where: { id: req.params.id } });

    const ctx = auditCtx(req);
    audit({ adminId: ctx.adminId, adminEmail: ctx.adminEmail, action: 'delete_territory', entityType: 'territory', entityId: req.params.id, oldValue: { name: territory.name, level: territory.level }, ipAddress: ctx.ip });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao deletar território' });
  }
});

export default router;
