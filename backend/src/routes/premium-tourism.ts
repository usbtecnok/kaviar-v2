import { Router } from 'express';
import { TourPackageController } from '../modules/admin/tour-package-controller';
import { TourBookingController } from '../modules/admin/tour-booking-controller';
import { TourPartnerController } from '../modules/admin/tour-partner-controller';
import { TourReportController } from '../modules/admin/tour-report-controller';
import { TourSettingsController } from '../modules/admin/tour-settings-controller';
import { TourController } from '../modules/governance/tour-controller';
import { authenticateAdmin } from '../middlewares/auth';
import { requirePremiumTourismEnabled } from '../middlewares/premium-tourism-flag';

const router = Router();

// Controllers
const tourPackageController = new TourPackageController();
const tourBookingController = new TourBookingController();
const tourPartnerController = new TourPartnerController();
const tourReportController = new TourReportController();
const tourSettingsController = new TourSettingsController();
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

// Tour Partners (Admin)
adminRouter.post('/tour-partners', tourPartnerController.createTourPartner);
adminRouter.get('/tour-partners', tourPartnerController.getAllTourPartners);
adminRouter.get('/tour-partners/:id', tourPartnerController.getTourPartner);
adminRouter.put('/tour-partners/:id', tourPartnerController.updateTourPartner);
adminRouter.patch('/tour-partners/:id/deactivate', tourPartnerController.deactivateTourPartner);

// Tour Reports (Admin)
adminRouter.get('/tour-reports/summary', tourReportController.getSummary);

// Tour Settings (Admin)
adminRouter.get('/tour-settings', tourSettingsController.getTourSettings);
adminRouter.put('/tour-settings', tourSettingsController.updateTourSettings);

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
