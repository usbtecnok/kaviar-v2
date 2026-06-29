import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateDriver } from '../middlewares/auth';

const router = Router();
const db = prisma as any;

router.get('/me/groups', authenticateDriver, async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).driver?.id || (req as any).driverId || (req as any).userId;
    if (!driverId) return res.status(401).json({ success: false, error: 'Motorista não autenticado' });

    const memberships = await db.kaviar_group_members.findMany({
      where: {
        driver_id: driverId,
        status: { not: 'removed' },
      },
      select: {
        id: true,
        role: true,
        status: true,
        invite_source: true,
        joined_at: true,
        created_at: true,
        group: {
          select: {
            id: true,
            public_name: true,
            status: true,
            community_id: true,
            neighborhood_id: true,
            territory_id: true,
          },
        },
      },
      orderBy: [{ joined_at: 'desc' }, { created_at: 'desc' }],
    });

    return res.json({ success: true, data: memberships });
  } catch (error) {
    console.error('[DRIVER_GROUPS_LIST_ERROR]', error);
    return res.status(500).json({ success: false, error: 'Erro ao listar grupos' });
  }
});

export default router;
