import { Router } from 'express';
import { complianceController } from '../controllers/compliance.controller';
import { authenticateDriver } from '../middlewares/auth';
import { authenticateAdmin } from '../middlewares/auth';

const router = Router();

// ===== ROTAS DO MOTORISTA =====
// Requerem autenticação de motorista

router.post(
  '/drivers/me/compliance/documents',
  authenticateDriver,
  complianceController.createDocument.bind(complianceController)
);

router.get(
  '/drivers/me/compliance/documents',
  authenticateDriver,
  complianceController.getMyDocuments.bind(complianceController)
);

router.get(
  '/drivers/me/compliance/status',
  authenticateDriver,
  complianceController.getMyStatus.bind(complianceController)
);

// ===== ROTAS DO ADMIN =====
// Requerem autenticação de admin

router.get(
  '/admin/compliance/documents/pending',
  authenticateAdmin,
  complianceController.getPendingDocuments.bind(complianceController)
);

router.get(
  '/admin/compliance/documents/expiring',
  authenticateAdmin,
  complianceController.getExpiringDocuments.bind(complianceController)
);

router.get(
  '/admin/compliance/drivers/:driverId/documents',
  authenticateAdmin,
  complianceController.getDriverDocuments.bind(complianceController)
);

router.post(
  '/admin/compliance/documents/:documentId/approve',
  authenticateAdmin,
  complianceController.approveDocument.bind(complianceController)
);

router.post(
  '/admin/compliance/documents/:documentId/reject',
  authenticateAdmin,
  complianceController.rejectDocument.bind(complianceController)
);

export default router;
