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

// ─── GET /api/admin/manager/drivers/reputation ───────────────────────────────
router.get('/', async (req: Request, res: Response) => {
  try {
    const scope = (req as any).territoryScope;
    const neighborhoodIds = scope?.neighborhoodIds || [];

    if (neighborhoodIds.length === 0) {
      return res.json({ success: true, data: { summary: { total: 0, online: 0, avg_rating: 0, alerts: 0 }, drivers: [] } });
    }

    // Motoristas do território
    const drivers = await prisma.drivers.findMany({
      where: { neighborhood_id: { in: neighborhoodIds }, status: 'approved' },
      select: { id: true, name: true, neighborhood_id: true, vehicle_model: true, vehicle_color: true, last_active_at: true, active_since: true },
      take: 50,
      orderBy: { last_active_at: { sort: 'desc', nulls: 'last' } },
    });

    if (drivers.length === 0) {
      return res.json({ success: true, data: { summary: { total: 0, online: 0, avg_rating: 0, alerts: 0 }, drivers: [] } });
    }

    const driverIds = drivers.map(d => d.id);

    // Rating stats
    const ratingStats = await prisma.rating_stats.findMany({
      where: { entity_type: 'DRIVER', entity_id: { in: driverIds } },
      select: { entity_id: true, average_rating: true, total_ratings: true },
    });
    const ratingMap = Object.fromEntries(ratingStats.map(r => [r.entity_id, r]));

    // Online status
    const onlineStatuses = await prisma.driver_status.findMany({
      where: { driver_id: { in: driverIds } },
      select: { driver_id: true, availability: true },
    });
    const statusMap = Object.fromEntries(onlineStatuses.map(s => [s.driver_id, s.availability]));

    // Rides count per driver
    const rideCounts = await prisma.rides_v2.groupBy({
      by: ['driver_id'],
      where: { driver_id: { in: driverIds }, status: 'completed' },
      _count: true,
    });
    const rideMap = Object.fromEntries(rideCounts.map(r => [r.driver_id, r._count]));

    // Negative tags for attention drivers (avg < 3.5)
    const attentionIds = driverIds.filter(id => {
      const r = ratingMap[id];
      return r && Number(r.average_rating) < 3.5 && r.total_ratings >= 2;
    });

    let negTagsMap: Record<string, { tags: string[]; lastComment: string | null }> = {};
    if (attentionIds.length > 0) {
      const negRatings = await prisma.ratings.findMany({
        where: { entity_type: 'DRIVER', entity_id: { in: attentionIds }, score: { lte: 3 } },
        select: { entity_id: true, tags: true, comment: true },
        orderBy: { created_at: 'desc' },
        take: 50,
      });
      for (const r of negRatings) {
        if (!negTagsMap[r.entity_id]) negTagsMap[r.entity_id] = { tags: [], lastComment: null };
        const entry = negTagsMap[r.entity_id];
        if (r.tags) r.tags.split(',').forEach(t => { const tag = t.trim(); if (tag && !entry.tags.includes(tag)) entry.tags.push(tag); });
        if (r.comment && !entry.lastComment) entry.lastComment = r.comment.substring(0, 100);
      }
    }

    // Neighborhoods for display
    const neighborhoods = await prisma.neighborhoods.findMany({
      where: { id: { in: neighborhoodIds } },
      select: { id: true, name: true },
    });
    const neighMap = Object.fromEntries(neighborhoods.map(n => [n.id, n.name]));

    // Build response
    const driverList = drivers.map(d => {
      const rating = ratingMap[d.id];
      const avg = rating ? Number(rating.average_rating) : null;
      const neg = negTagsMap[d.id];
      return {
        id: d.id,
        name: d.name,
        neighborhood: neighMap[d.neighborhood_id || ''] || null,
        vehicle: [d.vehicle_model, d.vehicle_color].filter(Boolean).join(' ') || null,
        availability: statusMap[d.id] || 'offline',
        avg_rating: avg,
        total_ratings: rating?.total_ratings || 0,
        rides_completed: rideMap[d.id] || 0,
        last_active_at: d.last_active_at,
        active_since: d.active_since,
        attention: avg !== null && avg < 3.5,
        neg_tags: neg?.tags?.slice(0, 5) || [],
        last_neg_comment: neg?.lastComment || null,
      };
    });

    // Sort: attention first, then by rating desc
    driverList.sort((a, b) => {
      if (a.attention && !b.attention) return -1;
      if (!a.attention && b.attention) return 1;
      return (b.avg_rating || 0) - (a.avg_rating || 0);
    });

    const totalOnline = Object.values(statusMap).filter(s => s === 'online').length;
    const ratingsWithData = driverList.filter(d => d.avg_rating !== null);
    const avgTerritory = ratingsWithData.length > 0 ? Math.round(ratingsWithData.reduce((s, d) => s + (d.avg_rating || 0), 0) / ratingsWithData.length * 10) / 10 : 0;
    const alerts = driverList.filter(d => d.attention).length;

    res.json({
      success: true,
      data: {
        summary: { total: drivers.length, online: totalOnline, avg_rating: avgTerritory, alerts },
        drivers: driverList,
      },
    });
  } catch (error: any) {
    console.error('[MANAGER_REPUTATION]', error.message);
    res.status(500).json({ success: false, error: 'Erro ao buscar reputação' });
  }
});

export default router;
