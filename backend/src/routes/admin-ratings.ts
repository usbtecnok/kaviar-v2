import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateAdmin, allowReadAccess } from '../middlewares/auth';

const router = Router();
router.use(authenticateAdmin);

// GET /api/admin/ratings/overview
router.get('/overview', allowReadAccess, async (_req: Request, res: Response) => {
  try {
    // Driver ratings (entity_type = DRIVER, rated by passengers)
    const driverStats = await prisma.ratings.aggregate({
      where: { entity_type: 'DRIVER' },
      _avg: { score: true },
      _count: { score: true },
    });

    // Passenger ratings (entity_type = PASSENGER, rated by drivers)
    const passengerStats = await prisma.ratings.aggregate({
      where: { entity_type: 'PASSENGER' },
      _avg: { score: true },
      _count: { score: true },
    });

    // Negative tags (score <= 3)
    const negativeRatings = await prisma.ratings.findMany({
      where: { score: { lte: 3 }, tags: { not: null } },
      select: { tags: true },
    });
    const tagCounts: Record<string, number> = {};
    negativeRatings.forEach(r => {
      if (r.tags) r.tags.split(',').forEach(t => { const tag = t.trim(); if (tag) tagCounts[tag] = (tagCounts[tag] || 0) + 1; });
    });
    const topNegativeTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    // Drivers with attention (most negative ratings)
    const attentionDrivers = await prisma.ratings.groupBy({
      by: ['entity_id'],
      where: { entity_type: 'DRIVER', score: { lte: 3 } },
      _count: { score: true },
      _avg: { score: true },
      orderBy: { _count: { score: 'desc' } },
      take: 5,
    });
    const driverIds = attentionDrivers.map(d => d.entity_id);
    const drivers = driverIds.length > 0
      ? await prisma.drivers.findMany({ where: { id: { in: driverIds } }, select: { id: true, name: true } })
      : [];
    const driverMap = Object.fromEntries(drivers.map(d => [d.id, d.name]));

    // Fetch negative ratings details for attention drivers
    const negRatingsForDrivers = driverIds.length > 0
      ? await prisma.ratings.findMany({
          where: { entity_type: 'DRIVER', entity_id: { in: driverIds }, score: { lte: 3 } },
          select: { entity_id: true, tags: true, comment: true },
          orderBy: { created_at: 'desc' },
        })
      : [];
    const driverNegDetails: Record<string, { tags: Record<string, number>; lastComment: string | null }> = {};
    negRatingsForDrivers.forEach(r => {
      if (!driverNegDetails[r.entity_id]) driverNegDetails[r.entity_id] = { tags: {}, lastComment: null };
      const d = driverNegDetails[r.entity_id];
      if (r.tags) r.tags.split(',').forEach(t => { const tag = t.trim(); if (tag) d.tags[tag] = (d.tags[tag] || 0) + 1; });
      if (r.comment && !d.lastComment) d.lastComment = r.comment;
    });

    res.json({
      success: true,
      data: {
        driverAvg: driverStats._avg.score,
        driverTotal: driverStats._count.score,
        passengerAvg: passengerStats._avg.score,
        passengerTotal: passengerStats._count.score,
        totalRatings: driverStats._count.score + passengerStats._count.score,
        topNegativeTags,
        attentionDrivers: attentionDrivers.map(d => {
          const details = driverNegDetails[d.entity_id] || { tags: {}, lastComment: null };
          const topTags = Object.entries(details.tags).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t);
          return {
            id: d.entity_id,
            name: driverMap[d.entity_id] || d.entity_id,
            negCount: d._count.score,
            avgScore: d._avg.score,
            tags: topTags,
            lastComment: details.lastComment,
          };
        }),
      },
    });
  } catch (error: any) {
    console.error('[ADMIN_RATINGS_OVERVIEW]', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar overview de avaliações' });
  }
});

export default router;
