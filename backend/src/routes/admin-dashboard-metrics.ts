import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateAdmin, allowReadAccess } from '../middlewares/auth';
import { applyTerritoryScope } from '../middlewares/territory-scope';

const router = Router();
router.use(authenticateAdmin);

// GET /api/admin/dashboard/metrics
router.get('/metrics', allowReadAccess, applyTerritoryScope, async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const scope = (req as any).territoryScope;
    const neighborhoodFilter = scope ? { neighborhood_id: { in: scope.neighborhoodIds } } : {};
    const rideNeighborhoodFilter = scope ? { origin_neighborhood_id: { in: scope.neighborhoodIds } } : {};

    const [
      ridesTotal,
      ridesToday,
      driversOnline,
      driversTotal,
      passengersTotal
    ] = await Promise.all([
      prisma.rides_v2.count({ where: rideNeighborhoodFilter }),
      
      prisma.rides_v2.count({
        where: { requested_at: { gte: today }, ...rideNeighborhoodFilter }
      }),
      
      prisma.driver_status.count({
        where: { availability: 'online', driver: neighborhoodFilter }
      }),
      
      prisma.drivers.count({
        where: { status: 'approved', ...neighborhoodFilter }
      }),
      
      prisma.passengers.count({ where: neighborhoodFilter })
    ]);

    res.json({
      success: true,
      metrics: {
        rides: {
          total: ridesTotal,
          today: ridesToday
        },
        drivers: {
          online: driversOnline,
          total: driversTotal,
          offline: driversTotal - driversOnline
        },
        passengers: {
          total: passengersTotal
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

export default router;
