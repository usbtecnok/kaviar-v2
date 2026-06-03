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

export default router;
