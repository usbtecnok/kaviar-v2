import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateDriver } from '../middleware/auth';

const router = Router();

// GET /api/drivers/me/availability
router.get('/me/availability', authenticateDriver, async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).driverId;
    
    const driver = await prisma.drivers.findUnique({
      where: { id: driverId },
      select: { available: true, status: true }
    });
    
    res.json({ 
      success: true, 
      available: driver?.available ?? true,
      status: driver?.status
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/drivers/me/availability
router.put('/me/availability', authenticateDriver, async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).driverId;
    const { available } = req.body;
    
    if (typeof available !== 'boolean') {
      return res.status(400).json({ success: false, error: 'available deve ser boolean' });
    }
    
    const updated = await prisma.drivers.update({
      where: { id: driverId },
      data: { 
        available,
        available_updated_at: new Date()
      },
      select: { available: true, status: true }
    });
    
    res.json({ success: true, available: updated.available });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
