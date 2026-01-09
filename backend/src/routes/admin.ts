import { Router } from 'express';
import { AdminController } from '../modules/admin/controller';
import { RideAdminController } from '../modules/admin/ride-controller';
import { DashboardController } from '../modules/admin/dashboard-controller';
import { DriverAdminController } from '../modules/admin/driver-admin-controller';
import { authenticateAdmin, requireRole } from '../middlewares/auth';
import { prisma } from '../config/database';
import { updateCommunityGeofence } from '../controllers/geofence';
import { createCommunity } from '../controllers/community';

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

// Communities routes - moved to admin-management.ts

// Community geofence management
router.patch('/communities/:id/geofence', updateCommunityGeofence);

// Geofence admin review endpoint
router.patch('/communities/:id/geofence-review', async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body as {
      centerLat?: number;
      centerLng?: number;
      minLat?: number;
      minLng?: number;
      maxLat?: number;
      maxLng?: number;
      isVerified?: boolean;
      reviewNotes?: string;
    };
    
    const { centerLat, centerLng, minLat, minLng, maxLat, maxLng, isVerified, reviewNotes } = body;
    
    // Validar dados de entrada
    if (centerLat && (isNaN(centerLat) || centerLat < -90 || centerLat > 90)) {
      return res.status(400).json({ success: false, error: 'centerLat inválido' });
    }
    
    if (centerLng && (isNaN(centerLng) || centerLng < -180 || centerLng > 180)) {
      return res.status(400).json({ success: false, error: 'centerLng inválido' });
    }
    
    // Verificar se comunidade existe
    const community = await prisma.community.findUnique({
      where: { id }
    });
    
    if (!community) {
      return res.status(404).json({ success: false, error: 'Comunidade não encontrada' });
    }
    
    // Verificar se geofence existe
    const existingGeofence = await prisma.communityGeofence.findUnique({
      where: { communityId: id }
    });
    
    if (!existingGeofence) {
      return res.status(404).json({ success: false, error: 'Geofence não encontrado' });
    }
    
    // Preparar dados para atualização
    const updateData: any = {};
    
    if (centerLat !== undefined) updateData.centerLat = centerLat;
    if (centerLng !== undefined) updateData.centerLng = centerLng;
    if (minLat !== undefined) updateData.minLat = minLat;
    if (minLng !== undefined) updateData.minLng = minLng;
    if (maxLat !== undefined) updateData.maxLat = maxLat;
    if (maxLng !== undefined) updateData.maxLng = maxLng;
    if (isVerified !== undefined) updateData.isVerified = isVerified;
    if (reviewNotes !== undefined) updateData.reviewNotes = reviewNotes;
    
    // Atualizar geofence
    const updatedGeofence = await prisma.communityGeofence.update({
      where: { communityId: id },
      data: updateData
    });
    
    res.json({ 
      success: true, 
      data: updatedGeofence,
      message: 'Geofence atualizado com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao atualizar geofence:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
});

// Rides routes
router.get('/rides/audit', rideController.getAuditLogs);
router.get('/rides', rideController.getRides);
router.get('/rides/:id', rideController.getRideById);
router.patch('/rides/:id/status', rideController.updateRideStatus);
router.post('/rides/:id/cancel', rideController.cancelRide);
router.post('/rides/:id/force-complete', requireRole(['SUPER_ADMIN']), rideController.forceCompleteRide);

export { router as adminRoutes };
