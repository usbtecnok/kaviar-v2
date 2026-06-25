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

function minutesSince(date: Date): number {
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
}

function needsAttention(status: string, requestedAt: Date): { attention: boolean; reason: string | null } {
  const minutes = minutesSince(requestedAt);
  const thresholds: Record<string, number> = {
    requested: 3,
    offered: 5,
    arrived: 10,
    in_progress: 60,
  };
  const threshold = thresholds[status];
  if (!threshold || minutes < threshold) return { attention: false, reason: null };
  return { attention: true, reason: `${minutes} min em ${status}` };
}

router.get('/cockpit', async (req: Request, res: Response) => {
  try {
    const { start, label } = getPeriod('today');
    const admin = (req as any).admin;
    const canSeeEmergencyDetails = admin?.role === 'SUPER_ADMIN';
    const activeStatuses = ['requested', 'offered', 'accepted', 'arrived', 'in_progress'];

    const [
      rideGroups,
      activeRides,
      onlineDrivers,
      ridesWithOffer,
      demandRows,
      activeEmergencyCount,
      emergencyEvents,
    ] = await Promise.all([
      prisma.rides_v2.groupBy({
        by: ['status'],
        where: { requested_at: { gte: start } },
        _count: true,
      }),
      prisma.rides_v2.findMany({
        where: { status: { in: activeStatuses as any } },
        orderBy: { requested_at: 'desc' },
        take: 30,
        select: {
          id: true,
          status: true,
          origin_text: true,
          destination_text: true,
          requested_at: true,
          passenger: { select: { name: true } },
          driver: { select: { name: true } },
          origin_neighborhood: { select: { name: true } },
        },
      }),
      prisma.driver_status.findMany({
        where: { availability: { in: ['online', 'busy'] } },
        orderBy: { updated_at: 'desc' },
        take: 50,
        select: {
          availability: true,
          updated_at: true,
          driver: {
            select: {
              id: true,
              name: true,
              phone: true,
              status: true,
              secondary_base_label: true,
              last_location_updated_at: true,
              neighborhoods: { select: { name: true } },
              communities: { select: { name: true } },
            },
          },
        },
      }),
      prisma.rides_v2.findMany({
        where: { requested_at: { gte: start }, offered_at: { not: null } },
        select: { requested_at: true, offered_at: true },
      }),
      prisma.rides_v2.findMany({
        where: { status: 'no_driver', requested_at: { gte: start } },
        orderBy: { requested_at: 'desc' },
        take: 100,
        select: {
          id: true,
          requested_at: true,
          origin_text: true,
          origin_neighborhood: { select: { name: true } },
        },
      }),
      prisma.ride_emergency_events.count({ where: { status: 'active' } }),
      canSeeEmergencyDetails
        ? prisma.ride_emergency_events.findMany({
            where: { status: 'active' },
            orderBy: { created_at: 'desc' },
            take: 20,
            include: {
              ride: {
                select: {
                  id: true,
                  status: true,
                  passenger: { select: { name: true } },
                  driver: { select: { name: true } },
                },
              },
              _count: { select: { location_trail: true } },
            },
          })
        : Promise.resolve([]),
    ]);

    const byStatus: Record<string, number> = {};
    rideGroups.forEach(g => { byStatus[g.status] = g._count; });
    const avgToOfferSeconds = ridesWithOffer.length > 0
      ? Math.round(
          ridesWithOffer.reduce((sum, ride) => {
            return sum + ((ride.offered_at!.getTime() - ride.requested_at.getTime()) / 1000);
          }, 0) / ridesWithOffer.length
        )
      : null;

    const demandByRegion = new Map<string, { region: string; count: number; last_requested_at: Date | null }>();
    for (const ride of demandRows) {
      const region = ride.origin_neighborhood?.name || ride.origin_text || 'Região não informada';
      const current = demandByRegion.get(region) || { region, count: 0, last_requested_at: null };
      current.count += 1;
      if (!current.last_requested_at || ride.requested_at > current.last_requested_at) {
        current.last_requested_at = ride.requested_at;
      }
      demandByRegion.set(region, current);
    }

    res.json({
      success: true,
      generated_at: new Date(),
      period: { start, end: new Date(), label },
      cards: {
        drivers_online: onlineDrivers.filter(d => d.availability === 'online').length,
        active_rides: activeStatuses.reduce((sum, status) => sum + (byStatus[status] || 0), 0),
        no_driver_today: byStatus['no_driver'] || 0,
        canceled_today: (byStatus['canceled_by_passenger'] || 0) + (byStatus['canceled_by_driver'] || 0),
        active_emergencies: activeEmergencyCount,
        avg_to_offer_seconds: avgToOfferSeconds,
      },
      active_rides: activeRides.map(ride => {
        const attention = needsAttention(ride.status, ride.requested_at);
        return {
          id: ride.id,
          status: ride.status,
          origin_text: ride.origin_text,
          destination_text: ride.destination_text,
          passenger_name: ride.passenger?.name || null,
          driver_name: ride.driver?.name || null,
          region: ride.origin_neighborhood?.name || null,
          requested_at: ride.requested_at,
          minutes_since_request: minutesSince(ride.requested_at),
          attention: attention.attention,
          attention_reason: attention.reason,
        };
      }),
      online_drivers: onlineDrivers.map(status => ({
        id: status.driver.id,
        name: status.driver.name,
        phone: status.driver.phone,
        base: status.driver.secondary_base_label || status.driver.communities?.name || status.driver.neighborhoods?.name || null,
        availability: status.availability,
        driver_status: status.driver.status,
        last_seen_at: status.updated_at,
        last_location_at: status.driver.last_location_updated_at,
      })),
      demand_unserved: {
        total: demandRows.length,
        by_region: Array.from(demandByRegion.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 12),
        recent: demandRows.slice(0, 20).map(ride => ({
          id: ride.id,
          region: ride.origin_neighborhood?.name || ride.origin_text || 'Região não informada',
          requested_at: ride.requested_at,
        })),
      },
      emergencies: canSeeEmergencyDetails
        ? emergencyEvents.map(event => ({
            id: event.id,
            ride_id: event.ride_id,
            status: event.status,
            triggered_by_type: event.triggered_by_type,
            trigger_source: event.trigger_source,
            created_at: event.created_at,
            passenger_name: event.ride?.passenger?.name || null,
            driver_name: event.ride?.driver?.name || null,
            ride_status: event.ride?.status || null,
            trail_points: event._count.location_trail,
          }))
        : [],
    });
  } catch (err: any) {
    console.error('[OPS_COCKPIT]', err);
    res.status(500).json({ success: false, error: 'Erro ao carregar cockpit operacional' });
  }
});

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
