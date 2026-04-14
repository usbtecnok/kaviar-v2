import { Router, Request, Response } from 'express';
import { realTimeService } from '../services/realtime.service';
import { authenticateDriver, authenticatePassenger, authenticateAdmin } from '../middlewares/auth';

const router = Router();

// 7.1 Canal do motorista
router.get('/driver', authenticateDriver, (req: Request, res: Response) => {
  const driverId = (req as any).driverId;
  realTimeService.connect(req, res, 'driver', driverId);
});

// 7.2 Canal da corrida (passageiro)
router.get('/rides/:ride_id', authenticatePassenger, (req: Request, res: Response) => {
  const { ride_id } = req.params;
  realTimeService.connect(req, res, 'passenger', ride_id);
});

// Stats (admin only)
router.get('/stats', authenticateAdmin, (req: Request, res: Response) => {
  res.json(realTimeService.getStats());
});

export default router;
