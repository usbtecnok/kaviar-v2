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

export default router;
