import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class TourReportController {
  // GET /api/admin/tour-reports/summary
  getSummary = async (req: Request, res: Response) => {
    try {
      const [totalBookings, totalRevenue, activePackages, activePartners] = await Promise.all([
        prisma.tour_bookings.count(),
        prisma.tour_bookings.aggregate({
          _sum: { total_price: true }
        }),
        prisma.tour_packages.count({ where: { is_active: true } }),
        prisma.tour_partners.count({ where: { is_active: true } })
      ]);

      res.json({
        success: true,
        summary: {
          totalBookings,
          totalRevenue: totalRevenue._sum.total_price || 0,
          activePackages,
          activePartners
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };
}
