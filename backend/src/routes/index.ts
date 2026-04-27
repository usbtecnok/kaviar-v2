import { Router } from 'express';
import { authRoutes } from './auth';
import { passwordResetRoutes } from './password-reset';
import { adminRoutes } from './admin';
import { governanceRoutes } from './governance';
import geoRoutes from './geo';
import driversRoutes from './drivers';
// v1 rides routes deleted — all traffic uses /api/v2/rides
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

// Auth routes (public) - NOT under /admin to avoid authenticateAdmin middleware
router.use('/auth/admin', authRoutes);
router.use('/auth/admin', passwordResetRoutes);

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

// Ride routes — v1 removed, see rides-v2.ts
// router.use('/rides', ridesRoutes);

// Reputation routes
router.use('/reputation', reputationRoutes);

export { router as apiRoutes };
