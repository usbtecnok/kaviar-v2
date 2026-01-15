import { Router } from 'express';
import { TourPackageController } from '../modules/admin/tour-package-controller';
import { TourBookingController } from '../modules/admin/tour-booking-controller';
import { TourController } from '../modules/governance/tour-controller';
import { authenticateAdmin, requireRole } from '../middlewares/auth';
import { requirePremiumTourismEnabled } from '../middlewares/premium-tourism-flag';

const router = Router();

// Controllers
const tourPackageController = new TourPackageController();
const tourBookingController = new TourBookingController();
const tourController = new TourController();

// Apply feature flag middleware to all routes
router.use(requirePremiumTourismEnabled);

// Admin routes (require authentication)
const adminRouter = Router();
adminRouter.use(authenticateAdmin);
// adminRouter.use(requireRole(['SUPER_ADMIN', 'OPERATOR']));

// Tour Packages (Admin)
adminRouter.post('/tour-packages', tourPackageController.createTourPackage);
adminRouter.get('/tour-packages', tourPackageController.getAllTourPackages);
adminRouter.get('/tour-packages/:id', tourPackageController.getTourPackage);
adminRouter.put('/tour-packages/:id', tourPackageController.updateTourPackage);
adminRouter.patch('/tour-packages/:id/deactivate', tourPackageController.deactivateTourPackage);

// Tour Bookings (Admin)
adminRouter.get('/tour-bookings', tourBookingController.getAllTourBookings);
adminRouter.post('/tour-bookings/:id/confirm', tourBookingController.confirmTourBooking);
adminRouter.patch('/tour-bookings/:id/status', tourBookingController.updateTourBookingStatus);

// Governance routes (public API)
const governanceRouter = Router();

// Tour Packages (Public)
governanceRouter.get('/tour-packages', tourController.getActiveTourPackages);
governanceRouter.post('/tour-bookings', tourController.createTourBooking);

// Mount routers
router.use('/admin', adminRouter);
router.use('/governance', governanceRouter);

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'premium-tourism',
    features: {
      tour_packages: true,
      tour_bookings: true,
      status_transitions: true
    },
    timestamp: new Date().toISOString()
  });
});

export { router as premiumTourismRoutes };
