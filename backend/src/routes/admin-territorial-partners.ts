import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';
import { authenticateAdmin } from '../middlewares/auth';
import { audit, auditCtx } from '../utils/audit';
import multer from 'multer';
import multerS3 from 'multer-s3';
import { S3Client } from '@aws-sdk/client-s3';
import path from 'path';

const router = Router();
const prisma = new PrismaClient();

const VALID_TYPES = ['association', 'condominium', 'business', 'community_leader', 'institution', 'other'];
const VALID_STATUSES = ['active', 'paused', 'inactive', 'archived'];

// Dashboard summary
router.get('/summary', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const active = await prisma.territorial_partners.count({ where: { status: 'active' } });
    const alerts = await prisma.territorial_partners.count({ where: { billing_status: { in: ['pending', 'overdue', 'blocked'] } } });

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthCommissions = await prisma.partner_commissions.aggregate({
      where: { created_at: { gte: monthStart } },
      _sum: { commission_amount: true },
      _count: true,
    });

    const pendingTotal = await prisma.partner_commissions.aggregate({
      where: { status: 'pending' },
      _sum: { commission_amount: true },
      _count: true,
    });

    const lastCommission = await prisma.partner_commissions.findFirst({
      orderBy: { created_at: 'desc' },
      include: { partner: { select: { name: true } } },
    });

    res.json({
      success: true,
      data: {
        active_partners: active,
        billing_alerts: alerts,
        month_commissions: monthCommissions._count,
        month_commission_value: monthCommissions._sum.commission_amount || 0,
        pending_count: pendingTotal._count,
        pending_value: pendingTotal._sum.commission_amount || 0,
        last_commission_partner: lastCommission?.partner?.name || null,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao buscar resumo' });
  }
});

// List all partners
router.get('/', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { status, partner_type } = req.query;
    const where: any = {};
    if (status) where.status = status;
    if (partner_type) where.partner_type = partner_type;

    const partners = await prisma.territorial_partners.findMany({
      where,
      include: { _count: { select: { drivers: true, commissions: true } } },
      orderBy: { created_at: 'desc' },
    });
    res.json({ success: true, data: partners });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao listar parceiros' });
  }
});

// Get partner detail with financial summary
router.get('/:id', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const partner = await prisma.territorial_partners.findUnique({
      where: { id: req.params.id },
      include: {
        drivers: { select: { id: true, name: true, phone: true, status: true, territorial_partner_linked_at: true } },
        users: { select: { id: true, email: true, name: true }, take: 1 },
      },
    });
    if (!partner) return res.status(404).json({ success: false, error: 'Não encontrado' });

    // Per-driver stats
    const driverIds = partner.drivers.map(d => d.id);
    let driverStats: Record<string, { rides: number; commissions: number; commission_value: number; commission_pending: number; last_ride_at: string | null }> = {};
    if (driverIds.length > 0) {
      const [rideCounts, commCounts, pendingCounts, lastRides] = await Promise.all([
        prisma.rides_v2.groupBy({ by: ['driver_id'], where: { driver_id: { in: driverIds }, status: 'completed' }, _count: true }),
        prisma.partner_commissions.groupBy({ by: ['driver_id'], where: { partner_id: req.params.id, driver_id: { in: driverIds } }, _count: true, _sum: { commission_amount: true } }),
        prisma.partner_commissions.groupBy({ by: ['driver_id'], where: { partner_id: req.params.id, driver_id: { in: driverIds }, status: 'pending' }, _sum: { commission_amount: true } }),
        prisma.rides_v2.findMany({ where: { driver_id: { in: driverIds }, status: 'completed' }, orderBy: { completed_at: 'desc' }, distinct: ['driver_id'], select: { driver_id: true, completed_at: true } }),
      ]);
      for (const r of rideCounts) { if (r.driver_id) driverStats[r.driver_id] = { rides: r._count, commissions: 0, commission_value: 0, commission_pending: 0, last_ride_at: null }; }
      for (const c of commCounts) {
        if (!c.driver_id) continue;
        if (!driverStats[c.driver_id]) driverStats[c.driver_id] = { rides: 0, commissions: 0, commission_value: 0, commission_pending: 0, last_ride_at: null };
        driverStats[c.driver_id].commissions = c._count;
        driverStats[c.driver_id].commission_value = Number(c._sum.commission_amount || 0);
      }
      for (const p of pendingCounts) {
        if (!p.driver_id) continue;
        if (!driverStats[p.driver_id]) driverStats[p.driver_id] = { rides: 0, commissions: 0, commission_value: 0, commission_pending: 0, last_ride_at: null };
        driverStats[p.driver_id].commission_pending = Number(p._sum.commission_amount || 0);
      }
      for (const lr of lastRides) {
        if (!lr.driver_id) continue;
        if (!driverStats[lr.driver_id]) driverStats[lr.driver_id] = { rides: 0, commissions: 0, commission_value: 0, commission_pending: 0, last_ride_at: null };
        driverStats[lr.driver_id].last_ride_at = lr.completed_at?.toISOString() || null;
      }
    }

    const driversWithStats = partner.drivers.map(d => ({
      ...d,
      linked_at: d.territorial_partner_linked_at,
      ...(driverStats[d.id] || { rides: 0, commissions: 0, commission_value: 0, commission_pending: 0, last_ride_at: null }),
    }));

    // Financial summary
    const commissionAgg = await prisma.partner_commissions.aggregate({
      where: { partner_id: req.params.id },
      _sum: { commission_amount: true, ride_final_price: true },
      _count: true,
    });
    const paidAgg = await prisma.partner_commissions.aggregate({
      where: { partner_id: req.params.id, status: 'paid' },
      _sum: { commission_amount: true },
    });

    const ridesCount = driverIds.length > 0
      ? await prisma.rides_v2.count({ where: { driver_id: { in: driverIds }, status: 'completed' } })
      : 0;

    res.json({
      success: true,
      data: {
        ...partner,
        drivers: driversWithStats,
        financial: {
          total_rides: ridesCount,
          total_commissions: commissionAgg._count,
          total_ride_value: commissionAgg._sum.ride_final_price || 0,
          commission_total: commissionAgg._sum.commission_amount || 0,
          commission_paid: paidAgg._sum.commission_amount || 0,
          commission_pending: Number(commissionAgg._sum.commission_amount || 0) - Number(paidAgg._sum.commission_amount || 0),
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao buscar parceiro' });
  }
});

async function generateReferralCode(name: string): Promise<string> {
  const base = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase().replace(/[^A-Z0-9 ]/g, '').trim().replace(/\s+/g, '-').slice(0, 20);
  let code = base;
  let suffix = 0;
  while (true) {
    const exists = await prisma.territorial_partners.findUnique({ where: { referral_code: code } });
    if (!exists) return code;
    suffix++;
    code = `${base}-${String(suffix).padStart(3, '0')}`;
  }
}

// Create partner
router.post('/', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { name, partner_type, address, responsible_name, responsible_role, responsible_phone, responsible_email, commission_percent, monthly_fee_cents, notes } = req.body;
    if (!name || !responsible_name) {
      return res.status(400).json({ success: false, error: 'Campos obrigatórios: name, responsible_name' });
    }
    const referral_code = await generateReferralCode(name);
    const partner = await prisma.territorial_partners.create({
      data: {
        name,
        partner_type: VALID_TYPES.includes(partner_type) ? partner_type : 'other',
        address, responsible_name,
        responsible_role: responsible_role || 'presidente',
        responsible_phone, responsible_email,
        commission_percent: commission_percent ?? 5,
        monthly_fee_cents, notes, referral_code,
        public_token: randomBytes(16).toString('hex'),
      },
    });
    res.status(201).json({ success: true, data: partner });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao criar parceiro' });
  }
});

// Generate referral code for existing partner without one
router.post('/:id/generate-code', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const partner = await prisma.territorial_partners.findUnique({ where: { id: req.params.id } });
    if (!partner) return res.status(404).json({ success: false, error: 'Não encontrado' });
    if (partner.referral_code) return res.json({ success: true, data: { referral_code: partner.referral_code } });

    const referral_code = await generateReferralCode(partner.name);
    const public_token = partner.public_token || randomBytes(16).toString('hex');
    await prisma.territorial_partners.update({ where: { id: req.params.id }, data: { referral_code, public_token } });

    const ctx = auditCtx(req);
    audit({ adminId: ctx.adminId, adminEmail: ctx.adminEmail, action: 'partner_code_generated', entityType: 'territorial_partner', entityId: req.params.id, newValue: { referral_code }, ipAddress: ctx.ip });

    res.json({ success: true, data: { referral_code } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao gerar código' });
  }
});

// Update partner
router.put('/:id', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { name, partner_type, address, responsible_name, responsible_role, responsible_phone, responsible_email, commission_percent, monthly_fee_cents, billing_due_day, billing_status, status, notes } = req.body;
    const VALID_BILLING = ['current', 'pending', 'overdue', 'blocked', 'canceled'];
    const partner = await prisma.territorial_partners.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(partner_type !== undefined && VALID_TYPES.includes(partner_type) && { partner_type }),
        ...(address !== undefined && { address }),
        ...(responsible_name !== undefined && { responsible_name }),
        ...(responsible_role !== undefined && { responsible_role }),
        ...(responsible_phone !== undefined && { responsible_phone }),
        ...(responsible_email !== undefined && { responsible_email }),
        ...(commission_percent !== undefined && { commission_percent }),
        ...(monthly_fee_cents !== undefined && { monthly_fee_cents }),
        ...(billing_due_day !== undefined && { billing_due_day }),
        ...(billing_status !== undefined && VALID_BILLING.includes(billing_status) && { billing_status }),
        ...(status !== undefined && VALID_STATUSES.includes(status) && { status }),
        ...(notes !== undefined && { notes }),
      },
    });
    res.json({ success: true, data: partner });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao atualizar parceiro' });
  }
});

// Change status
router.patch('/:id/status', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, error: `Status inválido. Válidos: ${VALID_STATUSES.join(', ')}` });
    }
    const partner = await prisma.territorial_partners.update({ where: { id: req.params.id }, data: { status } });
    res.json({ success: true, data: partner });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao atualizar status' });
  }
});

// Archive partner (safe - keeps all history)
router.post('/:id/archive', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    // Unlink all drivers
    await prisma.drivers.updateMany({ where: { territorial_partner_id: req.params.id }, data: { territorial_partner_id: null, territorial_partner_linked_at: null } });
    const partner = await prisma.territorial_partners.update({ where: { id: req.params.id }, data: { status: 'archived' } });

    const ctx = auditCtx(req);
    audit({ adminId: ctx.adminId, adminEmail: ctx.adminEmail, action: 'partner_archived', entityType: 'territorial_partner', entityId: req.params.id, newValue: { name: partner.name }, ipAddress: ctx.ip });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao arquivar parceiro' });
  }
});

// Delete partner (only if no real data)
router.delete('/:id', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const [commCount, payCount, linkedDrivers] = await Promise.all([
      prisma.partner_commissions.count({ where: { partner_id: req.params.id } }),
      prisma.partner_payments.count({ where: { partner_id: req.params.id } }),
      prisma.drivers.count({ where: { territorial_partner_id: req.params.id } }),
    ]);

    if (commCount > 0 || payCount > 0) {
      return res.status(400).json({ success: false, error: `Não é possível excluir: ${commCount} comissões e ${payCount} pagamentos registrados. Use "Arquivar" em vez disso.` });
    }
    if (linkedDrivers > 0) {
      return res.status(400).json({ success: false, error: `Não é possível excluir: ${linkedDrivers} motorista(s) vinculado(s). Desvincule primeiro ou use "Arquivar".` });
    }

    const partner = await prisma.territorial_partners.findUnique({ where: { id: req.params.id }, select: { name: true } });
    await prisma.partner_link_requests.deleteMany({ where: { partner_id: req.params.id } });
    await prisma.territorial_partners.delete({ where: { id: req.params.id } });

    const ctx = auditCtx(req);
    audit({ adminId: ctx.adminId, adminEmail: ctx.adminEmail, action: 'partner_deleted', entityType: 'territorial_partner', entityId: req.params.id, newValue: { name: partner?.name }, ipAddress: ctx.ip });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao excluir parceiro' });
  }
});

// Link driver to partner
router.post('/:id/drivers', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { driver_id } = req.body;
    if (!driver_id) return res.status(400).json({ success: false, error: 'driver_id obrigatório' });
    await prisma.drivers.update({ where: { id: driver_id }, data: { territorial_partner_id: req.params.id, territorial_partner_linked_at: new Date() } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao vincular motorista' });
  }
});

// Unlink driver from partner
router.delete('/:id/drivers/:driverId', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    await prisma.drivers.update({ where: { id: req.params.driverId }, data: { territorial_partner_id: null, territorial_partner_linked_at: null } });
    const ctx = auditCtx(req);
    audit({ adminId: ctx.adminId, adminEmail: ctx.adminEmail, action: 'partner_driver_unlinked', entityType: 'territorial_partner', entityId: req.params.id, newValue: { driver_id: req.params.driverId }, ipAddress: ctx.ip });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao desvincular motorista' });
  }
});

// Report for a partner (filtered by period)
router.get('/:id/report', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { period, from, to } = req.query;
    const now = new Date();
    let dateFrom: Date;
    let dateTo: Date = now;

    switch (period) {
      case 'today': dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break;
      case '7d': dateFrom = new Date(now.getTime() - 7 * 86400000); break;
      case 'month': dateFrom = new Date(now.getFullYear(), now.getMonth(), 1); break;
      case 'custom': dateFrom = new Date(from as string || now); dateTo = new Date(to as string || now); break;
      default: dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const partner = await prisma.territorial_partners.findUnique({
      where: { id: req.params.id },
      include: { drivers: { select: { id: true, name: true, status: true } } },
    });
    if (!partner) return res.status(404).json({ success: false, error: 'Não encontrado' });

    const driverIds = partner.drivers.map(d => d.id);
    const activeDrivers = partner.drivers.filter(d => d.status === 'approved').length;

    // Commissions in period
    const commissions = await prisma.partner_commissions.findMany({
      where: { partner_id: req.params.id, created_at: { gte: dateFrom, lte: dateTo } },
    });
    const totalGenerated = commissions.reduce((s, c) => s + Number(c.commission_amount), 0);
    const totalPending = commissions.filter(c => c.status === 'pending').reduce((s, c) => s + Number(c.commission_amount), 0);
    const totalPaid = commissions.filter(c => c.status === 'paid').reduce((s, c) => s + Number(c.commission_amount), 0);

    // Rides in period
    const ridesCount = driverIds.length > 0
      ? await prisma.rides_v2.count({ where: { driver_id: { in: driverIds }, status: 'completed', completed_at: { gte: dateFrom, lte: dateTo } } })
      : 0;

    // Per-driver summary
    let driverSummary: any[] = [];
    if (driverIds.length > 0) {
      const [rideCounts, lastRides] = await Promise.all([
        prisma.rides_v2.groupBy({ by: ['driver_id'], where: { driver_id: { in: driverIds }, status: 'completed', completed_at: { gte: dateFrom, lte: dateTo } }, _count: true }),
        prisma.rides_v2.findMany({ where: { driver_id: { in: driverIds }, status: 'completed' }, orderBy: { completed_at: 'desc' }, distinct: ['driver_id'], select: { driver_id: true, completed_at: true } }),
      ]);
      const rideMap: Record<string, number> = {};
      for (const r of rideCounts) { if (r.driver_id) rideMap[r.driver_id] = r._count; }
      const lastMap: Record<string, string> = {};
      for (const lr of lastRides) { if (lr.driver_id) lastMap[lr.driver_id] = lr.completed_at?.toISOString() || ''; }
      const commMap: Record<string, number> = {};
      for (const c of commissions) { commMap[c.driver_id] = (commMap[c.driver_id] || 0) + Number(c.commission_amount); }

      driverSummary = partner.drivers.map(d => ({
        name: d.name,
        rides: rideMap[d.id] || 0,
        commission: commMap[d.id] || 0,
        last_ride_at: lastMap[d.id] || null,
      })).sort((a, b) => b.rides - a.rides);
    }

    res.json({
      success: true,
      data: {
        partner_name: partner.name,
        partner_type: partner.partner_type,
        billing_status: partner.billing_status,
        commission_percent: partner.commission_percent,
        period: { from: dateFrom.toISOString(), to: dateTo.toISOString(), label: period || 'month' },
        total_drivers: partner.drivers.length,
        active_drivers: activeDrivers,
        total_rides: ridesCount,
        total_commission: Math.round(totalGenerated * 100) / 100,
        total_pending: Math.round(totalPending * 100) / 100,
        total_paid: Math.round(totalPaid * 100) / 100,
        drivers: driverSummary,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao gerar relatório' });
  }
});

// List link requests for a partner
router.get('/:id/link-requests', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const where: any = { partner_id: req.params.id };
    if (status) where.status = status;

    const requests = await prisma.partner_link_requests.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });

    // Enrich with driver names
    const driverIds = requests.map(r => r.driver_id);
    const drivers = driverIds.length > 0
      ? await prisma.drivers.findMany({ where: { id: { in: driverIds } }, select: { id: true, name: true, phone: true, status: true } })
      : [];
    const driverMap = Object.fromEntries(drivers.map(d => [d.id, d]));

    const enriched = requests.map(r => ({ ...r, driver: driverMap[r.driver_id] || null }));
    res.json({ success: true, data: enriched });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao listar requests' });
  }
});

// Approve link request
router.post('/:id/link-requests/:requestId/approve', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).admin?.id || 'unknown';
    const request = await prisma.partner_link_requests.findUnique({ where: { id: req.params.requestId } });
    if (!request || request.partner_id !== req.params.id) return res.status(404).json({ success: false, error: 'Request não encontrado' });
    if (request.status === 'approved') return res.status(400).json({ success: false, error: 'Request já aprovado' });

    await prisma.$transaction([
      prisma.partner_link_requests.update({ where: { id: req.params.requestId }, data: { status: 'approved', reviewed_at: new Date(), reviewed_by: adminId } }),
      prisma.drivers.update({ where: { id: request.driver_id }, data: { territorial_partner_id: req.params.id, territorial_partner_linked_at: new Date() } }),
    ]);

    const ctx = auditCtx(req);
    audit({ adminId: ctx.adminId, adminEmail: ctx.adminEmail, action: 'partner_link_approved', entityType: 'partner_link_request', entityId: req.params.requestId, newValue: { partner_id: req.params.id, driver_id: request.driver_id }, ipAddress: ctx.ip });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao aprovar request' });
  }
});

// Reject link request
router.post('/:id/link-requests/:requestId/reject', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).admin?.id || 'unknown';
    const request = await prisma.partner_link_requests.findUnique({ where: { id: req.params.requestId } });
    if (!request || request.partner_id !== req.params.id) return res.status(404).json({ success: false, error: 'Request não encontrado' });
    if (request.status !== 'pending') return res.status(400).json({ success: false, error: 'Request já processado' });

    await prisma.partner_link_requests.update({ where: { id: req.params.requestId }, data: { status: 'rejected', reviewed_at: new Date(), reviewed_by: adminId } });

    const ctx = auditCtx(req);
    audit({ adminId: ctx.adminId, adminEmail: ctx.adminEmail, action: 'partner_link_rejected', entityType: 'partner_link_request', entityId: req.params.requestId, newValue: { partner_id: req.params.id, driver_id: request.driver_id }, ipAddress: ctx.ip });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao rejeitar request' });
  }
});

// List commissions for a partner
router.get('/:id/commissions', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const where: any = { partner_id: req.params.id };
    if (status) where.status = status;

    const commissions = await prisma.partner_commissions.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: 100,
    });
    res.json({ success: true, data: commissions });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao listar comissões' });
  }
});

// Mark commissions as paid (batch)
router.post('/:id/commissions/mark-paid', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { commission_ids } = req.body;
    const adminId = (req as any).admin?.id || 'unknown';

    if (!commission_ids?.length) {
      return res.status(400).json({ success: false, error: 'commission_ids obrigatório' });
    }

    await prisma.partner_commissions.updateMany({
      where: { id: { in: commission_ids }, partner_id: req.params.id, status: 'pending' },
      data: { status: 'paid', paid_at: new Date(), paid_by: adminId },
    });

    const ctx = auditCtx(req);
    audit({
      adminId: ctx.adminId,
      adminEmail: ctx.adminEmail,
      action: 'partner_commission_paid',
      entityType: 'territorial_partner',
      entityId: req.params.id,
      newValue: { commission_ids, count: commission_ids.length },
      ipAddress: ctx.ip,
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao marcar como pago' });
  }
});

// Create partner user (admin creates login for the partner)
router.post('/:id/users', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email) return res.status(400).json({ success: false, error: 'name e email obrigatórios' });

    // Prevent duplicate: one user per partner
    const existing = await prisma.partner_users.findFirst({ where: { partner_id: req.params.id } });
    if (existing) return res.status(409).json({ success: false, error: 'Este parceiro já possui acesso criado' });

    const bcrypt = require('bcryptjs');
    const { randomBytes } = require('crypto');
    const tempPassword = password || randomBytes(4).toString('hex') + '!A1';
    const password_hash = await bcrypt.hash(tempPassword, 10);
    const user = await prisma.partner_users.create({ data: { partner_id: req.params.id, name, email: email.toLowerCase().trim(), password_hash } });
    const ctx = auditCtx(req);
    audit({ adminId: ctx.adminId, adminEmail: ctx.adminEmail, action: 'partner_user_created', entityType: 'partner_user', entityId: user.id, newValue: { partner_id: req.params.id, email }, ipAddress: ctx.ip });
    res.status(201).json({ success: true, data: { id: user.id, name: user.name, email: user.email, temp_password: tempPassword } });
  } catch (error: any) {
    if (error?.code === 'P2002') return res.status(400).json({ success: false, error: 'Email já cadastrado' });
    res.status(500).json({ success: false, error: 'Erro ao criar usuário' });
  }
});

// Admin reset password for partner user
router.post('/:id/reset-password', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const user = await prisma.partner_users.findFirst({ where: { partner_id: req.params.id } });
    if (!user) return res.status(404).json({ success: false, error: 'Parceiro não possui acesso criado' });

    const bcrypt = require('bcryptjs');
    const { randomBytes } = require('crypto');
    const tempPassword = randomBytes(4).toString('hex') + '!A1';
    const password_hash = await bcrypt.hash(tempPassword, 10);
    await prisma.partner_users.update({ where: { id: user.id }, data: { password_hash } });

    const ctx = auditCtx(req);
    audit({ adminId: ctx.adminId, adminEmail: ctx.adminEmail, action: 'partner_password_reset', entityType: 'partner_user', entityId: user.id, newValue: { partner_id: req.params.id }, ipAddress: ctx.ip });

    res.json({ success: true, data: { email: user.email, temp_password: tempPassword } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao redefinir senha' });
  }
});

// List payments for a partner
router.get('/:id/payments', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const payments = await prisma.partner_payments.findMany({
      where: { partner_id: req.params.id },
      orderBy: { paid_at: 'desc' },
    });
    res.json({ success: true, data: payments });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao listar pagamentos' });
  }
});

// Register monthly payment
router.post('/:id/payments', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { amount_cents, reference_month, paid_at, receipt_url, notes } = req.body;
    const adminId = (req as any).admin?.id || 'unknown';

    if (!amount_cents || !paid_at) {
      return res.status(400).json({ success: false, error: 'amount_cents e paid_at obrigatórios' });
    }

    const payment = await prisma.partner_payments.create({
      data: {
        partner_id: req.params.id,
        amount_cents: Number(amount_cents),
        reference_month: reference_month || null,
        paid_at: new Date(paid_at),
        receipt_url: receipt_url || null,
        notes: notes || null,
        registered_by: adminId,
      },
    });

    // Update last_payment_at on partner
    await prisma.territorial_partners.update({
      where: { id: req.params.id },
      data: { last_payment_at: new Date(paid_at) },
    });

    const ctx = auditCtx(req);
    audit({
      adminId: ctx.adminId,
      adminEmail: ctx.adminEmail,
      action: 'partner_payment_registered',
      entityType: 'territorial_partner',
      entityId: req.params.id,
      newValue: { amount_cents, reference_month, paid_at },
      ipAddress: ctx.ip,
    });

    res.status(201).json({ success: true, data: payment });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao registrar pagamento' });
  }
});

// Upload partner logo
const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-2' });
const logoBucket = 'kaviar-frontend-847895361928';
const logoBaseUrl = 'https://kaviar.com.br';

const uploadLogo = multer({
  storage: multerS3({
    s3,
    bucket: logoBucket,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req: Request, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `partner-logos/${req.params.id}${ext}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|jpg|png|webp)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Apenas imagens JPEG, PNG ou WebP (máx 2MB)'));
  },
});

router.post('/:id/logo', authenticateAdmin, uploadLogo.single('logo'), async (req: Request, res: Response) => {
  try {
    const file = req.file as any;
    if (!file) return res.status(400).json({ success: false, error: 'Arquivo obrigatório' });
    const logo_url = `${logoBaseUrl}/${file.key}`;
    await prisma.territorial_partners.update({ where: { id: req.params.id }, data: { logo_url } });
    res.json({ success: true, data: { logo_url } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao fazer upload da logo' });
  }
});

export default router;
