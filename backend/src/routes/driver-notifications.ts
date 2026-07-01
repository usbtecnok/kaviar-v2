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

function did(req: Request): string {
  return (req as any).driverId || (req as any).driver?.id || (req as any).userId;
}

// GET /api/driver/notifications?limit=50
router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit || '50'), 10) || 50, 100);
    const items = await listNotifications('DRIVER', did(req), limit);
    return res.json({ success: true, data: items });
  } catch (error: any) {
    console.error('[driver_notifications_list_error]', { error: error?.message });
    return res.status(500).json({ success: false, error: 'Erro ao listar notificações' });
  }
});

// GET /api/driver/notifications/unread-count
router.get('/unread-count', async (req: Request, res: Response) => {
  try {
    const count = await getUnreadCount('DRIVER', did(req));
    return res.json({ success: true, data: { count } });
  } catch (error: any) {
    console.error('[driver_notifications_unread_count_error]', { error: error?.message });
    return res.status(500).json({ success: false, error: 'Erro ao contar notificações' });
  }
});

// PATCH /api/driver/notifications/read-all
router.patch('/read-all', async (req: Request, res: Response) => {
  try {
    const count = await markAllRead('DRIVER', did(req));
    return res.json({ success: true, data: { marked: count } });
  } catch (error: any) {
    console.error('[driver_notifications_read_all_error]', { error: error?.message });
    return res.status(500).json({ success: false, error: 'Erro ao marcar notificações' });
  }
});

// PATCH /api/driver/notifications/:id/read
router.patch('/:id/read', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ success: false, error: 'ID obrigatório' });
    }
    const marked = await markNotificationRead(id, 'DRIVER', did(req));
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
