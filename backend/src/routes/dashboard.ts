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
      totalPassengers,
      totalRides,
      totalNeighborhoods,
      activeNeighborhoods,
      neighborhoodsByCity
    ] = await Promise.all([
      prisma.drivers.count(),
      prisma.drivers.count({ where: { status: 'APPROVED' } }),
      prisma.passengers.count(),
      Promise.resolve(0), // trips - tabela não existe
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
      neighborhoodsByCity: cityCounts
    });
  } catch (error) {
    console.error('Error fetching dashboard overview:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard overview' });
  }
});

export default router;
