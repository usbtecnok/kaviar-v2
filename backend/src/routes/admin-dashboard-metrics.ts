import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { allowReadAccess } from '../middleware/rbac';

const router = Router();

// GET /api/admin/dashboard/metrics
router.get('/metrics', allowReadAccess, async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      ridesTotal,
      ridesToday,
      driversOnline,
      driversTotal,
      revenueToday,
      passengersTotal
    ] = await Promise.all([
      // Total rides
      prisma.rides.count(),
      
      // Rides hoje
      prisma.rides.count({
        where: { created_at: { gte: today } }
      }),
      
      // Drivers online
      prisma.drivers.count({
        where: { 
          available: true,
          status: 'approved'
        }
      }),
      
      // Total drivers
      prisma.drivers.count({
        where: { status: 'approved' }
      }),
      
      // Revenue hoje
      prisma.rides.aggregate({
        where: {
          created_at: { gte: today },
          status: 'completed'
        },
        _sum: { platform_fee: true }
      }),
      
      // Total passengers
      prisma.passengers.count()
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
        revenue: {
          today: Number(revenueToday._sum.platform_fee || 0)
        },
        passengers: {
          total: passengersTotal
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
