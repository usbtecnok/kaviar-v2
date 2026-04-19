import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateAdmin, requireRole } from '../middlewares/auth';

const router = Router();
router.use(authenticateAdmin);
router.use(requireRole(['SUPER_ADMIN', 'OPERATOR']));

function getPeriod(p: string): { start: Date; label: string } {
  const now = new Date();
  if (p === '7d') return { start: new Date(now.getTime() - 7 * 86400000), label: '7 dias' };
  if (p === '30d') return { start: new Date(now.getTime() - 30 * 86400000), label: '30 dias' };
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return { start: today, label: 'Hoje' };
}

router.get('/monitor', async (req: Request, res: Response) => {
  try {
    const { start, label } = getPeriod(req.query.period as string || 'today');

    // Rides by status
    const rideGroups = await prisma.rides_v2.groupBy({
      by: ['status'],
      where: { requested_at: { gte: start } },
      _count: true,
    });
    const rc: Record<string, number> = {};
    rideGroups.forEach(g => { rc[g.status] = g._count; });

    const activeStatuses = ['requested', 'offered', 'accepted', 'arrived', 'in_progress'];
    const rides = {
      requested: rideGroups.reduce((s, g) => s + g._count, 0),
      completed: rc['completed'] || 0,
      canceled_by_passenger: rc['canceled_by_passenger'] || 0,
      canceled_by_driver: rc['canceled_by_driver'] || 0,
      no_driver: rc['no_driver'] || 0,
      active: activeStatuses.reduce((s, st) => s + (rc[st] || 0), 0),
    };

    // Offers by status
    const offerGroups = await prisma.ride_offers.groupBy({
      by: ['status'],
      where: { sent_at: { gte: start } },
      _count: true,
    });
    const oc: Record<string, number> = {};
    offerGroups.forEach(g => { oc[g.status] = g._count; });
    const offers = {
      total: offerGroups.reduce((s, g) => s + g._count, 0),
      accepted: oc['accepted'] || 0,
      rejected: oc['rejected'] || 0,
      expired: oc['expired'] || 0,
      canceled: oc['canceled'] || 0,
    };

    // Territory distribution (accepted offers only)
    const tierGroups = await prisma.ride_offers.groupBy({
      by: ['territory_tier'],
      where: { status: 'accepted', sent_at: { gte: start } },
      _count: true,
    });
    const territory: Record<string, number> = { COMMUNITY: 0, NEIGHBORHOOD: 0, OUTSIDE: 0 };
    tierGroups.forEach(g => { if (g.territory_tier) territory[g.territory_tier] = g._count; });

    // Timing: avg accept time
    const acceptedOffers = await prisma.ride_offers.findMany({
      where: { status: 'accepted', sent_at: { gte: start }, responded_at: { not: null } },
      select: { sent_at: true, responded_at: true },
    });
    const acceptTimes = acceptedOffers
      .filter(o => o.responded_at)
      .map(o => (o.responded_at!.getTime() - o.sent_at.getTime()) / 1000);
    const avgAccept = acceptTimes.length > 0 ? Math.round(acceptTimes.reduce((a, b) => a + b, 0) / acceptTimes.length) : null;

    // Timing: avg to first offer
    const ridesWithOffer = await prisma.rides_v2.findMany({
      where: { requested_at: { gte: start }, offered_at: { not: null } },
      select: { requested_at: true, offered_at: true },
    });
    const toOfferTimes = ridesWithOffer.map(r => (r.offered_at!.getTime() - r.requested_at.getTime()) / 1000);
    const avgToOffer = toOfferTimes.length > 0 ? Math.round(toOfferTimes.reduce((a, b) => a + b, 0) / toOfferTimes.length) : null;

    // Timing: avg to no_driver
    const noDriverRides = await prisma.rides_v2.findMany({
      where: { status: 'no_driver', requested_at: { gte: start } },
      select: { requested_at: true, updated_at: true },
    });
    const noDriverTimes = noDriverRides.map(r => (r.updated_at.getTime() - r.requested_at.getTime()) / 1000);
    const avgNoDriver = noDriverTimes.length > 0 ? Math.round(noDriverTimes.reduce((a, b) => a + b, 0) / noDriverTimes.length) : null;

    // Recent rides
    const recentRides = await prisma.rides_v2.findMany({
      where: { requested_at: { gte: start } },
      orderBy: { requested_at: 'desc' },
      take: 15,
      select: {
        id: true, status: true, origin_text: true, destination_text: true,
        requested_at: true, completed_at: true, updated_at: true,
        driver: { select: { name: true } },
        offers: { where: { status: 'accepted' }, select: { territory_tier: true, sent_at: true, responded_at: true }, take: 1 },
      },
    });

    const recent = recentRides.map(r => {
      const acceptedOffer = r.offers[0];
      const acceptSec = acceptedOffer?.responded_at && acceptedOffer?.sent_at
        ? Math.round((acceptedOffer.responded_at.getTime() - acceptedOffer.sent_at.getTime()) / 1000) : null;
      const endTime = r.completed_at || r.updated_at;
      const totalMin = endTime ? Math.round((endTime.getTime() - r.requested_at.getTime()) / 60000) : null;
      return {
        id: r.id,
        status: r.status,
        origin_text: r.origin_text,
        destination_text: r.destination_text,
        driver_name: r.driver?.name || null,
        territory_tier: acceptedOffer?.territory_tier || null,
        accept_time_seconds: acceptSec,
        total_time_minutes: totalMin,
        requested_at: r.requested_at,
        completed_at: r.completed_at,
      };
    });

    res.json({
      success: true,
      period: { start, end: new Date(), label },
      rides, offers, territory,
      timing: { avg_accept_seconds: avgAccept, avg_to_offer_seconds: avgToOffer, avg_to_no_driver_seconds: avgNoDriver },
      recent,
    });
  } catch (err: any) {
    console.error('[OPS_MONITOR]', err);
    res.status(500).json({ success: false, error: 'Erro ao carregar monitor' });
  }
});

// GET /api/admin/operations/demand-gaps — demanda reprimida (corridas sem motorista)
router.get('/demand-gaps', async (req: Request, res: Response) => {
  try {
    const { start, label } = getPeriod(req.query.period as string || '7d');
    const realOnly = req.query.real !== 'false'; // default: filter out likely test rides

    const where: any = { status: 'no_driver', requested_at: { gte: start } };
    if (realOnly) {
      where.passenger_app_version = { not: null }; // exclude API-only / no-app rides
    }

    const rows = await prisma.rides_v2.findMany({
      where,
      select: {
        requested_at: true,
        origin_neighborhood: { select: { name: true } },
      },
    });

    const total = rows.length;

    // Por bairro de origem
    const byNeighborhood: Record<string, { count: number; hours: number[] }> = {};
    const byHour: Record<number, number> = {};
    const byDow: Record<number, number> = {};

    for (const r of rows) {
      const name = r.origin_neighborhood?.name || 'Sem bairro';
      const h = r.requested_at.getHours();
      const dow = r.requested_at.getDay();

      if (!byNeighborhood[name]) byNeighborhood[name] = { count: 0, hours: [] };
      byNeighborhood[name].count++;
      byNeighborhood[name].hours.push(h);

      byHour[h] = (byHour[h] || 0) + 1;
      byDow[dow] = (byDow[dow] || 0) + 1;
    }

    const dowNames = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

    const neighborhoods = Object.entries(byNeighborhood)
      .map(([name, d]) => {
        const freq: Record<number, number> = {};
        d.hours.forEach(h => { freq[h] = (freq[h] || 0) + 1; });
        const peak_hour = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
        return { neighborhood: name, count: d.count, peak_hour: peak_hour ? Number(peak_hour[0]) : null };
      })
      .sort((a, b) => b.count - a.count);

    const hours = Object.entries(byHour)
      .map(([h, count]) => ({ hour: Number(h), count }))
      .sort((a, b) => a.hour - b.hour);

    const days = Object.entries(byDow)
      .map(([d, count]) => ({ day: dowNames[Number(d)], count }))
      .sort((a, b) => Number(a.day) - Number(b.day));

    res.json({
      success: true,
      period: { start, label },
      filter: { real_only: realOnly },
      total_no_driver: total,
      by_origin_neighborhood: neighborhoods,
      by_hour: hours,
      by_day_of_week: days,
    });
  } catch (err: any) {
    console.error('[DEMAND_GAPS]', err);
    res.status(500).json({ success: false, error: 'Erro ao carregar demanda reprimida' });
  }
});

export default router;
