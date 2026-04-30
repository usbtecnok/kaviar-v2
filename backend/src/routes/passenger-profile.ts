import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticatePassenger } from '../middlewares/auth';

const router = Router();

// GET /api/passengers/me/profile
router.get('/me/profile', authenticatePassenger, async (req: Request, res: Response) => {
  try {
    const passengerId = (req as any).passengerId;
    
    const passenger = await prisma.passengers.findUnique({
      where: { id: passengerId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        created_at: true
      }
    });
    
    if (!passenger) {
      return res.status(404).json({ success: false, error: 'Passageiro não encontrado' });
    }
    
    res.json({ success: true, profile: passenger });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/passengers/me/profile
router.put('/me/profile', authenticatePassenger, async (req: Request, res: Response) => {
  try {
    const passengerId = (req as any).passengerId;
    const { name, phone } = req.body;
    
    const updated = await prisma.passengers.update({
      where: { id: passengerId },
      data: {
        ...(name && { name }),
        ...(phone && { phone })
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true
      }
    });
    
    res.json({ success: true, profile: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/passengers/me/community-status
router.get('/me/community-status', authenticatePassenger, async (req: Request, res: Response) => {
  try {
    const passenger = (req as any).passenger;

    // Try community_id first
    if (passenger.community_id) {
      const community = await prisma.communities.findUnique({
        where: { id: passenger.community_id },
        select: { name: true, is_active: true },
      });
      if (community) {
        const driversOnline = await prisma.driver_status.count({
          where: { availability: 'online', driver: { community_id: passenger.community_id } },
        });
        console.log(`[community-status] passenger=${passenger.id}, community_id=${passenger.community_id}, community=${community.name}, driversOnline=${driversOnline}`);
        return res.json({
          success: true,
          data: { communityName: community.name, driversOnline, isActive: community.is_active },
        });
      }
    }

    // Fallback: passenger has no community_id — find nearest active community via neighborhood or any online drivers
    if (passenger.neighborhood_id) {
      const driversOnline = await prisma.driver_status.count({
        where: { availability: 'online', driver: { neighborhood_id: passenger.neighborhood_id } },
      });
      const neighborhood = await prisma.neighborhoods.findUnique({
        where: { id: passenger.neighborhood_id },
        select: { name: true },
      });
      console.log(`[community-status] passenger=${passenger.id}, fallback neighborhood=${passenger.neighborhood_id}, driversOnline=${driversOnline}`);
      if (driversOnline > 0) {
        return res.json({
          success: true,
          data: { communityName: neighborhood?.name || 'Sua região', driversOnline, isActive: true },
        });
      }
    }

    // Final fallback: count all online drivers (small-scale operation)
    const totalOnline = await prisma.driver_status.count({ where: { availability: 'online' } });
    console.log(`[community-status] passenger=${passenger.id}, no territory, totalOnline=${totalOnline}`);
    if (totalOnline > 0) {
      return res.json({
        success: true,
        data: { communityName: 'KAVIAR', driversOnline: totalOnline, isActive: true },
      });
    }

    return res.json({ success: true, data: null });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/passengers/me/showcase — vitrine local por comunidade/bairro
router.get('/me/showcase', authenticatePassenger, async (req: Request, res: Response) => {
  try {
    const passenger = (req as any).passenger;
    const now = new Date();

    // Territory filter: community → neighborhood → global
    let territoryFilter: any;
    if (passenger.community_id) {
      territoryFilter = { OR: [{ community_id: passenger.community_id }, { neighborhood_id: passenger.neighborhood_id }, { community_id: null, neighborhood_id: null }] };
    } else if (passenger.neighborhood_id) {
      territoryFilter = { OR: [{ neighborhood_id: passenger.neighborhood_id }, { community_id: null, neighborhood_id: null }] };
    } else {
      territoryFilter = { community_id: null, neighborhood_id: null };
    }

    const where = {
      is_active: true,
      approved_at: { not: null },
      OR: [{ starts_at: null }, { starts_at: { lte: now } }],
      AND: [
        { OR: [{ ends_at: null }, { ends_at: { gte: now } }] },
        territoryFilter,
        // Filtro de saldo: null = ilimitado, senão exposure_used < exposure_quota
        { OR: [{ exposure_quota: null }, { exposure_used: { lt: prisma.showcase_items.fields?.exposure_quota ?? 0 } }] },
      ],
    };

    // Rotação justa: buscar todos elegíveis, filtrar saldo em JS (Prisma não suporta field comparison)
    const allEligible = await prisma.showcase_items.findMany({
      where: {
        is_active: true,
        approved_at: { not: null },
        OR: [{ starts_at: null }, { starts_at: { lte: now } }],
        AND: [
          { OR: [{ ends_at: null }, { ends_at: { gte: now } }] },
          territoryFilter,
        ],
      },
      orderBy: [{ priority: 'desc' }, { exposure_used: 'asc' }, { last_shown_at: { sort: 'asc', nulls: 'first' } }, { created_at: 'asc' }],
      select: { id: true, title: true, description: true, icon: true, type: true, cta_label: true, cta_url: true, exposure_quota: true, exposure_used: true },
    });

    // Filter out items over quota
    const items = allEligible
      .filter(i => i.exposure_quota == null || i.exposure_used < i.exposure_quota)
      .slice(0, 3)
      .map(({ exposure_quota, exposure_used, ...rest }) => rest);

    return res.json({ success: true, data: items });
  } catch (error: any) {
    return res.status(500).json({ success: true, data: [] });
  }
});

// POST /api/passengers/me/showcase/:id/exposure
router.post('/me/showcase/:id/exposure', authenticatePassenger, async (req: Request, res: Response) => {
  try {
    const passenger = (req as any).passenger;
    const itemId = req.params.id;
    const rideId: string | null = req.body.ride_id || null;

    // Dedup: check existing
    if (rideId) {
      const exists = await prisma.showcase_events.findUnique({
        where: { item_id_passenger_id_ride_id_event_type: { item_id: itemId, passenger_id: passenger.id, ride_id: rideId, event_type: 'exposure' } },
      });
      if (exists) return res.json({ success: true, duplicate: true });
    } else {
      const windowStart = new Date(Date.now() - 30 * 60 * 1000);
      const exists = await prisma.showcase_events.findFirst({
        where: { item_id: itemId, passenger_id: passenger.id, event_type: 'exposure', ride_id: null, created_at: { gte: windowStart } },
      });
      if (exists) return res.json({ success: true, duplicate: true });
    }

    // Check quota
    const item = await prisma.showcase_items.findUnique({ where: { id: itemId }, select: { exposure_quota: true, exposure_used: true } });
    if (!item) return res.status(404).json({ success: false, error: 'Item não encontrado' });
    if (item.exposure_quota != null && item.exposure_used >= item.exposure_quota) {
      return res.json({ success: false, reason: 'no_quota' });
    }

    // Insert event + increment counters
    await prisma.$transaction([
      prisma.showcase_events.create({ data: { item_id: itemId, passenger_id: passenger.id, ride_id: rideId, event_type: 'exposure' } }),
      prisma.showcase_items.update({ where: { id: itemId }, data: { exposure_used: { increment: 1 }, last_shown_at: new Date() } }),
    ]);

    return res.json({ success: true });
  } catch (error: any) {
    // Unique constraint violation = duplicate, ignore
    if (error.code === 'P2002') return res.json({ success: true, duplicate: true });
    return res.status(500).json({ success: false, error: 'Erro ao registrar exposição' });
  }
});

// POST /api/passengers/me/showcase/:id/click
router.post('/me/showcase/:id/click', authenticatePassenger, async (req: Request, res: Response) => {
  try {
    const passenger = (req as any).passenger;
    const itemId = req.params.id;
    const rideId: string | null = req.body.ride_id || null;

    await prisma.$transaction([
      prisma.showcase_events.create({ data: { item_id: itemId, passenger_id: passenger.id, ride_id: rideId, event_type: 'click' } }),
      prisma.showcase_items.update({ where: { id: itemId }, data: { clicks_count: { increment: 1 } } }),
    ]);

    return res.json({ success: true });
  } catch (error: any) {
    if (error.code === 'P2002') return res.json({ success: true, duplicate: true });
    return res.status(500).json({ success: false, error: 'Erro ao registrar clique' });
  }
});

export default router;
