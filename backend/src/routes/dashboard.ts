import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/admin/dashboard/overview
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const [
      totalDrivers,
      activeDrivers,
      pendingDrivers,
      totalPassengers,
      totalRides,
      totalNeighborhoods,
      activeNeighborhoods,
      neighborhoodsByCity
    ] = await Promise.all([
      prisma.drivers.count(),
      prisma.drivers.count({ where: { status: 'APPROVED' } }),
      prisma.drivers.count({ where: { status: 'PENDING' } }),
      prisma.passengers.count(),
      prisma.rides_v2.count(), // corridas reais (v2)
      prisma.neighborhoods.count(),
      prisma.neighborhoods.count({ where: { is_active: true } }),
      prisma.$queryRaw<Array<{ city: string; count: bigint }>>`
        SELECT city, COUNT(*) as count 
        FROM neighborhoods 
        GROUP BY city
      `
    ]);

    const cityCounts = neighborhoodsByCity.reduce((acc: Record<string, number>, row: any) => {
      acc[row.city] = Number(row.count);
      return acc;
    }, {});

    res.json({
      drivers: totalDrivers,
      activeDrivers,
      passengers: totalPassengers,
      rides: totalRides,
      communities: totalNeighborhoods,
      activeCommunities: activeNeighborhoods,
      neighborhoodsByCity: cityCounts,
      guides: 0,
      pending: {
        drivers: pendingDrivers,
        guides: 0
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard overview:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard overview' });
  }
});

// GET /api/admin/dashboard/territory
router.get('/territory', async (req: Request, res: Response) => {
  try {
    const [total, homebound, local, adjacent, external, homeboundReduced] = await Promise.all([
      prisma.rides_v2.count({ where: { status: 'completed' } }),
      prisma.rides_v2.count({ where: { status: 'completed', is_homebound: true } }),
      prisma.rides_v2.count({ where: { status: 'completed', territory_match: 'local' } }),
      prisma.rides_v2.count({ where: { status: 'completed', territory_match: 'adjacent' } }),
      prisma.rides_v2.count({ where: { status: 'completed', territory_match: 'external' } }),
      prisma.rides_v2.count({ where: { status: 'completed', is_homebound: true, territory_match: { in: ['local', 'adjacent'] } } }),
    ]);
    res.json({ success: true, data: { total, homebound, local, adjacent, external, homeboundReduced } });
  } catch (error) {
    console.error('[DASHBOARD_TERRITORY_ERROR]', error);
    res.status(500).json({ error: 'Failed to fetch territory metrics' });
  }
});

export default router;
