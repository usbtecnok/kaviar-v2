import { Router, Request, Response } from 'express';
import { authenticateDriver } from '../middlewares/auth';
import {
  listNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllRead,
} from '../services/app-notifications.service';

const router = Router();

router.use(authenticateDriver);

function resolveDriverIds(req: Request): { authUserId: string | null; driverId: string | null } {
  const authUserId = (req as any).userId ? String((req as any).userId) : null;
  const driverId = (req as any).driver?.id
    ? String((req as any).driver.id)
    : (req as any).driverId
      ? String((req as any).driverId)
      : authUserId;
  return { authUserId, driverId };
}

// GET /api/driver/notifications?limit=50
router.get('/', async (req: Request, res: Response) => {
  try {
    const { authUserId, driverId } = resolveDriverIds(req);
    if (!driverId) {
      return res.status(401).json({ success: false, error: 'Motorista não autenticado' });
    }

    const limit = Math.min(parseInt(String(req.query.limit || '50'), 10) || 50, 100);
    const items = await listNotifications('DRIVER', driverId, limit);
    console.info('[driver_notifications_list]', {
      authUserId,
      resolvedDriverId: driverId,
      count: items.length,
      limit,
    });
    return res.json({ success: true, data: items });
  } catch (error: any) {
    console.error('[driver_notifications_list_error]', { error: error?.message });
    return res.status(500).json({ success: false, error: 'Erro ao listar notificações' });
  }
});

// GET /api/driver/notifications/unread-count
router.get('/unread-count', async (req: Request, res: Response) => {
  try {
    const { authUserId, driverId } = resolveDriverIds(req);
    if (!driverId) {
      return res.status(401).json({ success: false, error: 'Motorista não autenticado' });
    }

    const count = await getUnreadCount('DRIVER', driverId);
    console.info('[driver_notifications_unread_count]', {
      authUserId,
      resolvedDriverId: driverId,
      count,
      limit: null,
    });
    return res.json({ success: true, data: { count } });
  } catch (error: any) {
    console.error('[driver_notifications_unread_count_error]', { error: error?.message });
    return res.status(500).json({ success: false, error: 'Erro ao contar notificações' });
  }
});

// PATCH /api/driver/notifications/read-all
router.patch('/read-all', async (req: Request, res: Response) => {
  try {
    const { driverId } = resolveDriverIds(req);
    if (!driverId) {
      return res.status(401).json({ success: false, error: 'Motorista não autenticado' });
    }
    const count = await markAllRead('DRIVER', driverId);
    return res.json({ success: true, data: { marked: count } });
  } catch (error: any) {
    console.error('[driver_notifications_read_all_error]', { error: error?.message });
    return res.status(500).json({ success: false, error: 'Erro ao marcar notificações' });
  }
});

// PATCH /api/driver/notifications/:id/read
router.patch('/:id/read', async (req: Request, res: Response) => {
  try {
    const { driverId } = resolveDriverIds(req);
    if (!driverId) {
      return res.status(401).json({ success: false, error: 'Motorista não autenticado' });
    }

    const { id } = req.params;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ success: false, error: 'ID obrigatório' });
    }
    const marked = await markNotificationRead(id, 'DRIVER', driverId);
    if (!marked) {
      return res.status(404).json({ success: false, error: 'Notificação não encontrada' });
    }
    return res.json({ success: true });
  } catch (error: any) {
    console.error('[driver_notifications_read_error]', { error: error?.message });
    return res.status(500).json({ success: false, error: 'Erro ao marcar notificação' });
  }
});

export default router;
