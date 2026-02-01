import { Router } from 'express';
import { authenticateAdmin, requireSuperAdmin, allowReadAccess, requireRole } from '../middlewares/auth';
import { prisma } from '../lib/prisma';
import { RideAdminController } from '../modules/admin/ride-controller';
import {
  getVirtualFenceCenter,
  updateVirtualFenceCenter,
  deleteVirtualFenceCenter
} from '../controllers/admin/virtualFenceCenter.controller';
import * as passengerFavoritesController from '../controllers/admin/passengerFavorites.controller';
import * as driverSecondaryBaseController from '../controllers/admin/driverSecondaryBase.controller';
import * as featureFlagsController from '../controllers/admin/featureFlags.controller';
import * as betaMonitorController from '../controllers/admin/betaMonitor.controller';

const router = Router();
const rideController = new RideAdminController();

router.use(authenticateAdmin);

// GET /api/admin/passengers
router.get('/passengers', allowReadAccess, async (req, res) => {
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
router.get('/rides', allowReadAccess, rideController.getRides);

// GET /api/admin/rides/:id - Using RideAdminController
router.get('/rides/:id', allowReadAccess, rideController.getRideById);

// PATCH /api/admin/rides/:id/status
router.patch('/rides/:id/status', requireSuperAdmin, rideController.updateRideStatus);

// POST /api/admin/rides/:id/cancel
router.post('/rides/:id/cancel', requireSuperAdmin, rideController.cancelRide);

// POST /api/admin/rides/:id/force-complete
router.post('/rides/:id/force-complete', requireSuperAdmin, rideController.forceCompleteRide);

// GET /api/admin/rides/audit
router.get('/rides/audit', allowReadAccess, rideController.getAuditLogs);

// Virtual Fence Center Management (SUPER_ADMIN and OPERATOR only)
const requireOperatorOrSuperAdmin = requireRole(['SUPER_ADMIN', 'OPERATOR']);

// GET /api/admin/drivers/:driverId/virtual-fence-center
router.get('/drivers/:driverId/virtual-fence-center', allowReadAccess, getVirtualFenceCenter);

// PUT /api/admin/drivers/:driverId/virtual-fence-center
router.put('/drivers/:driverId/virtual-fence-center', requireOperatorOrSuperAdmin, updateVirtualFenceCenter);

// DELETE /api/admin/drivers/:driverId/virtual-fence-center
router.delete('/drivers/:driverId/virtual-fence-center', requireOperatorOrSuperAdmin, deleteVirtualFenceCenter);

// Passenger Favorite Locations Management
// GET /api/admin/passengers/:passengerId/favorites
router.get('/passengers/:passengerId/favorites', allowReadAccess, passengerFavoritesController.getFavorites);

// PUT /api/admin/passengers/:passengerId/favorites
router.put('/passengers/:passengerId/favorites', requireOperatorOrSuperAdmin, passengerFavoritesController.upsertFavorite);

// DELETE /api/admin/passengers/:passengerId/favorites/:favoriteId
router.delete('/passengers/:passengerId/favorites/:favoriteId', requireOperatorOrSuperAdmin, passengerFavoritesController.deleteFavorite);

// Driver Secondary Base Management
// GET /api/admin/drivers/:driverId/secondary-base
router.get('/drivers/:driverId/secondary-base', allowReadAccess, driverSecondaryBaseController.getSecondaryBase);

// PUT /api/admin/drivers/:driverId/secondary-base
router.put('/drivers/:driverId/secondary-base', requireOperatorOrSuperAdmin, driverSecondaryBaseController.updateSecondaryBase);

// DELETE /api/admin/drivers/:driverId/secondary-base
router.delete('/drivers/:driverId/secondary-base', requireOperatorOrSuperAdmin, driverSecondaryBaseController.deleteSecondaryBase);

// Feature Flags Management
// GET /api/admin/feature-flags/:key
router.get('/feature-flags/:key', allowReadAccess, featureFlagsController.getFeatureFlag);

// PUT /api/admin/feature-flags/:key
router.put('/feature-flags/:key', requireOperatorOrSuperAdmin, featureFlagsController.updateFeatureFlag);

// GET /api/admin/feature-flags/:key/allowlist
router.get('/feature-flags/:key/allowlist', allowReadAccess, featureFlagsController.getAllowlist);

// POST /api/admin/feature-flags/:key/allowlist
router.post('/feature-flags/:key/allowlist', requireOperatorOrSuperAdmin, featureFlagsController.addToAllowlist);

// DELETE /api/admin/feature-flags/:key/allowlist/:passengerId
router.delete('/feature-flags/:key/allowlist/:passengerId', requireOperatorOrSuperAdmin, featureFlagsController.removeFromAllowlist);

// Beta Monitor routes
const betaMonitor = new betaMonitorController.BetaMonitorController();

// GET /api/admin/beta-monitor/:featureKey/checkpoints
router.get('/beta-monitor/:featureKey/checkpoints', allowReadAccess, betaMonitor.getCheckpoints.bind(betaMonitor));

// GET /api/admin/beta-monitor/:featureKey/checkpoints/:id
router.get('/beta-monitor/:featureKey/checkpoints/:id', allowReadAccess, betaMonitor.getCheckpointDetail.bind(betaMonitor));

// POST /api/admin/beta-monitor/:featureKey/run
router.post('/beta-monitor/:featureKey/run', requireOperatorOrSuperAdmin, betaMonitor.runCheckpoint.bind(betaMonitor));

export { router as adminRoutes };
