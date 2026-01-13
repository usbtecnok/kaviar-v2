import { Router } from 'express';
import { ApprovalController } from '../modules/admin/approval-controller';
import { authenticateAdmin } from '../middlewares/auth';

const router = Router();
const approvalController = new ApprovalController();

// All admin routes require authentication
router.use(authenticateAdmin);

// Driver approval routes
router.get('/drivers', approvalController.getDrivers);
router.put('/drivers/:id/approve', approvalController.approveDriver);
router.put('/drivers/:id/reject', approvalController.rejectDriver);

// Guide approval routes  
router.get('/guides', approvalController.getGuides);
router.put('/guides/:id/approve', approvalController.approveGuide);
router.put('/guides/:id/reject', approvalController.rejectGuide);

export { router as adminApprovalRoutes };
