import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateAdmin, requireRole } from '../middlewares/auth';
import { applyTerritoryScope } from '../middlewares/territory-scope';
import { requireTerritoryScope } from '../middlewares/require-territory-scope';

const router = Router();
router.use(authenticateAdmin);
router.use(requireRole(['TERRITORIAL_MANAGER', 'SUPER_ADMIN']));
router.use(applyTerritoryScope);
router.use(requireTerritoryScope);

// ─── GET /api/admin/manager/finance/summary ──────────────────────────────────
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const scope = (req as any).territoryScope;
    const territoryIds = scope?.territoryIds || [];
    const neighborhoodIds = scope?.neighborhoodIds || [];

    if (neighborhoodIds.length === 0) {
      return res.json({ success: true, data: { empty: true, message: 'Sem bairros vinculados ao território' } });
    }

    const period = (req.query.period as string) || '30d';
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    // Corridas completadas
    const ridesCount = await prisma.rides_v2.count({
      where: { status: 'completed', origin_neighborhood_id: { in: neighborhoodIds }, completed_at: { gte: since } },
    });

    // Settlements agregados
    const settlements = await prisma.ride_settlements.aggregate({
      where: { origin_neighborhood_id: { in: neighborhoodIds }, settled_at: { gte: since, not: null } },
      _sum: { final_price: true, fee_amount: true, driver_earnings: true },
      _count: true,
    });

    const gross = Number(settlements._sum.final_price || 0);
    const fees = Number(settlements._sum.fee_amount || 0);

    // Regra financeira ativa
    const rule = await prisma.territory_finance_rules.findFirst({
      where: { territory_id: { in: territoryIds }, is_active: true },
      select: { regional_share_percent: true, partner_commission_percent: true },
    });

    const regionalPercent = rule ? Number(rule.regional_share_percent) : 0;
    const regionalEstimated = fees * regionalPercent / 100;

    // Comissões de parceiros
    const partnerIds = (await prisma.territorial_partners.findMany({
      where: { territory_id: { in: territoryIds } }, select: { id: true },
    })).map(p => p.id);

    let partnerCommissions = 0;
    if (partnerIds.length > 0) {
      const comms = await prisma.partner_commissions.aggregate({
        where: { partner_id: { in: partnerIds }, created_at: { gte: since } },
        _sum: { commission_amount: true },
      });
      partnerCommissions = Number(comms._sum.commission_amount || 0);
    }

    const netEstimated = Math.max(0, Math.round((regionalEstimated - partnerCommissions) * 100) / 100);

    res.json({
      success: true,
      data: {
        period,
        rides_completed: ridesCount,
        gross_estimated: Math.round(gross * 100) / 100,
        platform_fee: Math.round(fees * 100) / 100,
        regional_estimated: Math.round(regionalEstimated * 100) / 100,
        partner_commissions: Math.round(partnerCommissions * 100) / 100,
        net_estimated: netEstimated,
        has_rule: !!rule,
        regional_percent: regionalPercent,
      },
    });
  } catch (error: any) {
    console.error('[MANAGER_FINANCE_SUMMARY]', error.message);
    res.status(500).json({ success: false, error: 'Erro ao buscar resumo financeiro' });
  }
});

// ─── GET /api/admin/manager/finance/payouts ──────────────────────────────────
router.get('/payouts', async (req: Request, res: Response) => {
  try {
    const scope = (req as any).territoryScope;
    const territoryIds = scope?.territoryIds || [];

    if (territoryIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const payouts = await prisma.territory_payouts.findMany({
      where: { territory_id: { in: territoryIds } },
      select: {
        id: true,
        reference_month: true,
        calculated_amount: true,
        approved_amount: true,
        status: true,
        paid_at: true,
        payment_method: true,
        receipt_url: true,
        notes: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
      take: 12,
    });

    res.json({ success: true, data: payouts });
  } catch (error: any) {
    console.error('[MANAGER_FINANCE_PAYOUTS]', error.message);
    res.status(500).json({ success: false, error: 'Erro ao buscar repasses' });
  }
});

// POST /api/admin/manager/finance/payouts/:id/request — Gestor solicita repasse
router.post('/payouts/:id/request', async (req: Request, res: Response) => {
  try {
    const admin = (req as any).admin;
    const scope = (req as any).territoryScope;
    const territoryIds = scope?.territoryIds || [];

    const payout = await prisma.territory_payouts.findFirst({ where: { id: req.params.id, territory_id: { in: territoryIds } } });
    if (!payout) return res.status(404).json({ success: false, error: 'Repasse não encontrado' });
    if (payout.status !== 'calculated') return res.status(400).json({ success: false, error: 'Repasse não está disponível para solicitação' });

    const meta = { requested_at: new Date().toISOString(), requested_by: admin.id };
    await prisma.territory_payouts.update({ where: { id: payout.id }, data: { status: 'requested', notes: JSON.stringify(meta) } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Erro ao solicitar repasse' });
  }
});

// POST /api/admin/manager/finance/payouts/:id/confirm-received — Gestor confirma recebimento
router.post('/payouts/:id/confirm-received', async (req: Request, res: Response) => {
  try {
    const admin = (req as any).admin;
    const scope = (req as any).territoryScope;
    const territoryIds = scope?.territoryIds || [];

    const payout = await prisma.territory_payouts.findFirst({ where: { id: req.params.id, territory_id: { in: territoryIds } } });
    if (!payout) return res.status(404).json({ success: false, error: 'Repasse não encontrado' });
    if (payout.status !== 'paid') return res.status(400).json({ success: false, error: 'Repasse precisa estar pago para confirmar recebimento' });

    const existing = payout.notes ? JSON.parse(payout.notes) : {};
    const meta = { ...existing, received_at: new Date().toISOString(), received_by: admin.id };
    await prisma.territory_payouts.update({ where: { id: payout.id }, data: { status: 'received', notes: JSON.stringify(meta) } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Erro ao confirmar recebimento' });
  }
});

// ─── GET /api/admin/manager/finance/rules ────────────────────────────────────
router.get('/rules', async (req: Request, res: Response) => {
  try {
    const scope = (req as any).territoryScope;
    const territoryIds = scope?.territoryIds || [];

    if (territoryIds.length === 0) {
      return res.json({ success: true, data: null });
    }

    const rule = await prisma.territory_finance_rules.findFirst({
      where: { territory_id: { in: territoryIds }, is_active: true },
      select: {
        matrix_share_percent: true,
        regional_share_percent: true,
        partner_commission_percent: true,
        valid_from: true,
        description: true,
      },
    });

    res.json({ success: true, data: rule });
  } catch (error: any) {
    console.error('[MANAGER_FINANCE_RULES]', error.message);
    res.status(500).json({ success: false, error: 'Erro ao buscar regra financeira' });
  }
});

// ─── Team Members ───────────────────────────────────────────────────────────

// GET /api/admin/manager/finance/team
router.get('/team', async (req: Request, res: Response) => {
  try {
    const admin = (req as any).admin;
    const where: any = {};
    if (admin.role !== 'SUPER_ADMIN') where.manager_admin_id = admin.id;
    const members = await prisma.manager_team_members.findMany({ where, orderBy: { created_at: 'desc' } });
    res.json({ success: true, data: members });
  } catch { res.status(500).json({ success: false, error: 'Erro ao listar equipe' }); }
});

// POST /api/admin/manager/finance/team
router.post('/team', async (req: Request, res: Response) => {
  try {
    const admin = (req as any).admin;
    const scope = (req as any).territoryScope;
    const { name, phone, role_type, notes, cpf, address, city, state, zipcode, pix_key, pix_key_type } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Nome obrigatório' });
    const territory_id = scope?.territoryIds?.[0] || null;
    const member = await prisma.manager_team_members.create({ data: { manager_admin_id: admin.id, territory_id, name, phone: phone || null, role_type: role_type || 'outro', notes: notes || null, cpf: cpf || null, address: address || null, city: city || null, state: state || null, zipcode: zipcode || null, pix_key: pix_key || null, pix_key_type: pix_key_type || null } });
    res.status(201).json({ success: true, data: member });
  } catch { res.status(500).json({ success: false, error: 'Erro ao cadastrar membro' }); }
});

// PATCH /api/admin/manager/finance/team/:id
router.patch('/team/:id', async (req: Request, res: Response) => {
  try {
    const admin = (req as any).admin;
    const where: any = { id: req.params.id };
    if (admin.role !== 'SUPER_ADMIN') where.manager_admin_id = admin.id;
    const existing = await prisma.manager_team_members.findFirst({ where });
    if (!existing) return res.status(404).json({ success: false, error: 'Membro não encontrado' });
    const { name, phone, role_type, status, notes, cpf, address, city, state, zipcode, pix_key, pix_key_type, contract_status, contract_version, contract_notes } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (phone !== undefined) data.phone = phone || null;
    if (role_type !== undefined) data.role_type = role_type;
    if (status !== undefined && ['active', 'pending', 'inactive'].includes(status)) data.status = status;
    if (notes !== undefined) data.notes = notes || null;
    if (cpf !== undefined) data.cpf = cpf || null;
    if (address !== undefined) data.address = address || null;
    if (city !== undefined) data.city = city || null;
    if (state !== undefined) data.state = state || null;
    if (zipcode !== undefined) data.zipcode = zipcode || null;
    if (pix_key !== undefined) data.pix_key = pix_key || null;
    if (pix_key_type !== undefined) data.pix_key_type = pix_key_type || null;
    if (contract_status !== undefined && ['pending', 'delivered', 'signed', 'waived'].includes(contract_status)) {
      data.contract_status = contract_status;
      if (contract_status === 'signed' && !existing.contract_signed_at) data.contract_signed_at = new Date();
    }
    if (contract_version !== undefined) data.contract_version = contract_version || null;
    if (contract_notes !== undefined) data.contract_notes = contract_notes || null;
    const updated = await prisma.manager_team_members.update({ where: { id: existing.id }, data });
    res.json({ success: true, data: updated });
  } catch { res.status(500).json({ success: false, error: 'Erro ao atualizar membro' }); }
});

export default router;
