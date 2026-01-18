import { Router } from 'express';
import { ApprovalController } from '../modules/admin/approval-controller';
import { authenticateAdmin } from '../middlewares/auth';
import { prisma } from '../lib/prisma';

const router = Router();
const approvalController = new ApprovalController();

// All admin routes require authentication
router.use(authenticateAdmin);

// Driver approval routes
router.get('/drivers', approvalController.getDrivers);
router.put('/drivers/:id/approve', approvalController.approveDriver);
router.put('/drivers/:id/reject', approvalController.rejectDriver);
router.delete('/drivers/:id', async (req, res) => {
  try {
    await prisma.drivers.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true, message: 'Driver deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete driver' });
  }
});

// Guide approval routes  
router.get('/guides', approvalController.getGuides);
router.put('/guides/:id/approve', approvalController.approveGuide);
router.put('/guides/:id/reject', approvalController.rejectGuide);

// Audit route
router.get('/rides/audit', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [audits, total] = await Promise.all([
      prisma.ride_admin_actions.findMany({
        take: limit,
        skip,
        orderBy: { created_at: 'desc' }
      }),
      prisma.ride_admin_actions.count()
    ]);

    res.json({
      success: true,
      data: audits,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(200).json({
      success: false,
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      error: 'Audit logs not available',
      code: 'AUDIT_UNAVAILABLE'
    });
  }
});

export { router as adminApprovalRoutes };
