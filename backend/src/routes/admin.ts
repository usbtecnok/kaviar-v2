import { Router } from 'express';
import { authenticateAdmin } from '../middlewares/auth';
import { prisma } from '../lib/prisma';
import { RideAdminController } from '../modules/admin/ride-controller';

const router = Router();
const rideController = new RideAdminController();

router.use(authenticateAdmin);

// GET /api/admin/passengers
router.get('/passengers', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [passengers, total] = await Promise.all([
      prisma.passengers.findMany({
        take: limit,
        skip,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          status: true,
          created_at: true
        }
      }),
      prisma.passengers.count()
    ]);

    res.json({
      success: true,
      data: passengers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar passageiros'
    });
  }
});

// GET /api/admin/rides - Using RideAdminController with filters
router.get('/rides', rideController.getRides);

// GET /api/admin/rides/:id - Using RideAdminController
router.get('/rides/:id', rideController.getRideById);

// PATCH /api/admin/rides/:id/status
router.patch('/rides/:id/status', rideController.updateRideStatus);

// POST /api/admin/rides/:id/cancel
router.post('/rides/:id/cancel', rideController.cancelRide);

// POST /api/admin/rides/:id/force-complete
router.post('/rides/:id/force-complete', rideController.forceCompleteRide);

// GET /api/admin/rides/audit
router.get('/rides/audit', rideController.getAuditLogs);

export { router as adminRoutes };
