import { Router } from 'express';
import { authRoutes } from './auth';
import { passwordResetRoutes } from './password-reset';
import { adminRoutes } from './admin';
import { governanceRoutes } from './governance';
import geoRoutes from './geo';
import driversRoutes from './drivers';
import ridesRoutes from './rides';
import reputationRoutes from './reputation';
// import adminGeofenceRoutes from './admin-geofence';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'KAVIAR Backend is running',
    timestamp: new Date().toISOString(),
  });
});

// Auth routes (public)
router.use('/admin/auth', authRoutes);

// Password reset routes (public) - MUST be before /admin
router.use('/admin/auth', passwordResetRoutes);

// Admin routes (protected)
router.use('/admin', adminRoutes);

// Admin geofence routes
// router.use('/admin/geofence', adminGeofenceRoutes); // Commented out - route not available

// Governance routes
router.use('/governance', governanceRoutes);

// Geo routes
router.use('/geo', geoRoutes);

// Driver routes
router.use('/drivers', driversRoutes);

// Ride routes
router.use('/rides', ridesRoutes);

// Reputation routes
router.use('/reputation', reputationRoutes);

export { router as apiRoutes };
