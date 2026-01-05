import { Router } from 'express';
import { AdminController } from '../modules/admin/controller';
import { RideAdminController } from '../modules/admin/ride-controller';
import { DashboardController } from '../modules/admin/dashboard-controller';
import { DriverAdminController } from '../modules/admin/driver-admin-controller';
import { authenticateAdmin, requireRole } from '../middlewares/auth';

const router = Router();
const adminController = new AdminController();
const rideController = new RideAdminController();
const dashboardController = new DashboardController();
const driverAdminController = new DriverAdminController();

// Apply authentication and authorization to all admin routes
router.use(authenticateAdmin);
router.use(requireRole(['SUPER_ADMIN', 'OPERATOR']));

// Dashboard routes
router.get('/dashboard/metrics', dashboardController.getMetrics);
router.get('/dashboard/recent-rides', dashboardController.getRecentRides);
router.get('/dashboard/drivers-overview', dashboardController.getDriversOverview);

// Drivers routes
router.get('/drivers', adminController.getDrivers);
router.get('/drivers/:id', adminController.getDriverById);
router.get('/drivers/:id/verification', driverAdminController.getVerificationStatus);
router.put('/drivers/:id/approve', adminController.approveDriver);
router.put('/drivers/:id/suspend', adminController.suspendDriver);
router.put('/drivers/:id/reactivate', adminController.reactivateDriver);
router.put('/drivers/:id/documents/:docId/verify', driverAdminController.verifyDocument);
router.put('/drivers/:id/documents/:docId/reject', driverAdminController.rejectDocument);

// Passengers routes
router.get('/passengers', adminController.getPassengers);

// Communities routes
router.get('/communities', adminController.getCommunities);

// Rides routes
router.get('/rides/audit', rideController.getAuditLogs);
router.get('/rides', rideController.getRides);
router.get('/rides/:id', rideController.getRideById);
router.patch('/rides/:id/status', rideController.updateRideStatus);
router.post('/rides/:id/cancel', rideController.cancelRide);
router.post('/rides/:id/force-complete', requireRole(['SUPER_ADMIN']), rideController.forceCompleteRide);

export { router as adminRoutes };
