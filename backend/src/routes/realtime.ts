import { Router, Request, Response } from 'express';
import { realTimeService } from '../services/realtime.service';
import jwt from 'jsonwebtoken';

const router = Router();

const requireDriver = (req: Request, res: Response, next: Function) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;

    const userType = String(decoded.userType || decoded.user_type || decoded.role || '').toUpperCase();
    const userId = decoded.userId || decoded.id;

    if (userType !== 'DRIVER' || !userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    (req as any).driverId = userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const requirePassenger = (req: Request, res: Response, next: Function) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;

    const userType = String(decoded.userType || decoded.user_type || decoded.role || '').toUpperCase();
    const userId = decoded.userId || decoded.id;

    if (userType !== 'PASSENGER' || !userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    (req as any).passengerId = userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// 7.1 Canal do motorista
router.get('/driver', requireDriver, (req: Request, res: Response) => {
  const driverId = (req as any).driverId;
  realTimeService.connect(req, res, 'driver', driverId);
});

// 7.2 Canal da corrida (passageiro)
router.get('/rides/:ride_id', requirePassenger, (req: Request, res: Response) => {
  const { ride_id } = req.params;
  realTimeService.connect(req, res, 'passenger', ride_id);
});

// Endpoint de debug/stats
router.get('/stats', (req: Request, res: Response) => {
  const stats = realTimeService.getStats();
  res.json(stats);
});

export default router;
