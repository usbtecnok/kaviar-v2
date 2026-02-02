import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { allowReadAccess } from '../middleware/rbac';

const router = Router();

// GET /api/admin/audit-logs - Usa ride_admin_actions como proxy
router.get('/audit-logs', allowReadAccess, async (req: Request, res: Response) => {
  try {
    const { admin_id, start_date, end_date, limit = '50' } = req.query;
    
    const where: any = {};
    
    if (admin_id) where.admin_id = admin_id;
    if (start_date || end_date) {
      where.created_at = {};
      if (start_date) where.created_at.gte = new Date(start_date as string);
      if (end_date) where.created_at.lte = new Date(end_date as string);
    }
    
    const logs = await prisma.ride_admin_actions.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: parseInt(limit as string),
      select: {
        id: true,
        admin_id: true,
        action: true,
        ride_id: true,
        reason: true,
        created_at: true
      }
    });
    
    const total = await prisma.ride_admin_actions.count({ where });
    
    res.json({
      success: true,
      logs,
      pagination: {
        total,
        limit: parseInt(limit as string),
        showing: logs.length
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
