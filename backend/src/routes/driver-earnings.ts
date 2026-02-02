import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateDriver } from '../middleware/auth';

const router = Router();

// GET /api/drivers/me/earnings?start_date=2026-01-01&end_date=2026-01-31
router.get('/me/earnings', authenticateDriver, async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).driverId;
    const { start_date, end_date } = req.query;
    
    const where: any = {
      driver_id: driverId,
      status: 'COMPLETED'
    };
    
    if (start_date) {
      where.created_at = { gte: new Date(start_date as string) };
    }
    if (end_date) {
      where.created_at = { ...where.created_at, lte: new Date(end_date as string) };
    }
    
    const rides = await prisma.rides.findMany({
      where,
      select: {
        id: true,
        created_at: true,
        price: true,
        platform_fee: true,
        driver_amount: true
      },
      orderBy: { created_at: 'desc' }
    });
    
    const total_earnings = rides.reduce((sum, r) => sum + (Number(r.driver_amount) || 0), 0);
    const total_rides = rides.length;
    const avg_earnings = total_rides > 0 ? total_earnings / total_rides : 0;
    
    res.json({
      success: true,
      summary: {
        total_earnings,
        total_rides,
        avg_earnings,
        period: { start_date, end_date }
      },
      rides
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
