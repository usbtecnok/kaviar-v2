import { Router, Request, Response } from 'express';
import { authenticateDriver } from '../middlewares/auth';

const router = Router();

// GET /api/v2/drivers/me/credits/packages
router.get('/me/credits/packages', authenticateDriver, async (_req: Request, res: Response) => {
  return res.status(410).json({
    success: false,
    error: 'LEGACY_PAYMENT_FLOW_REMOVED',
    message: 'Use a recarga de saldo KAVIAR.',
  });
});

// POST /api/v2/drivers/me/credits/purchase
router.post('/me/credits/purchase', authenticateDriver, async (req: Request, res: Response) => {
  return res.status(410).json({
    success: false,
    error: 'LEGACY_PAYMENT_FLOW_REMOVED',
    message: 'Use a recarga de saldo KAVIAR.',
  });
});

// GET /api/v2/drivers/me/credits/purchases
router.get('/me/credits/purchases', authenticateDriver, async (req: Request, res: Response) => {
  return res.status(410).json({
    success: false,
    error: 'LEGACY_PAYMENT_FLOW_REMOVED',
    message: 'Use a recarga de saldo KAVIAR.',
  });
});

export default router;
