import { Router } from 'express';
import { ApprovalController } from '../modules/admin/approval-controller';
import { authenticateAdmin, requireRole } from '../middlewares/auth';

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

// Audit route (requires SUPER_ADMIN or OPERATOR)
router.get('/rides/audit', requireRole(['SUPER_ADMIN', 'OPERATOR']), async (req, res) => {
  res.json({
    success: true,
    data: [],
    pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    message: 'Audit logs endpoint - implementation pending'
  });
});

export { router as adminApprovalRoutes };
