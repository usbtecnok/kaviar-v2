import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticatePassenger } from '../middleware/auth';

const router = Router();

// GET /api/passengers/me/profile
router.get('/me/profile', authenticatePassenger, async (req: Request, res: Response) => {
  try {
    const passengerId = (req as any).passengerId;
    
    const passenger = await prisma.passengers.findUnique({
      where: { id: passengerId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        created_at: true
      }
    });
    
    if (!passenger) {
      return res.status(404).json({ success: false, error: 'Passageiro não encontrado' });
    }
    
    res.json({ success: true, profile: passenger });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/passengers/me/profile
router.put('/me/profile', authenticatePassenger, async (req: Request, res: Response) => {
  try {
    const passengerId = (req as any).passengerId;
    const { name, phone } = req.body;
    
    const updated = await prisma.passengers.update({
      where: { id: passengerId },
      data: {
        ...(name && { name }),
        ...(phone && { phone })
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true
      }
    });
    
    res.json({ success: true, profile: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
