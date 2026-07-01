import { Router, Request, Response } from 'express';
import { authenticatePassenger } from '../middlewares/auth';
import {
  listNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllRead,
} from '../services/app-notifications.service';

const router = Router();

router.use(authenticatePassenger);

function pid(req: Request): string {
  return (req as any).passengerId || (req as any).passenger?.id || (req as any).userId;
}

// GET /api/passenger/notifications?limit=50
router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit || '50'), 10) || 50, 100);
    const items = await listNotifications('PASSENGER', pid(req), limit);
    return res.json({ success: true, data: items });
  } catch (error: any) {
    console.error('[passenger_notifications_list_error]', { error: error?.message });
    return res.status(500).json({ success: false, error: 'Erro ao listar notificações' });
  }
});

// GET /api/passenger/notifications/unread-count
router.get('/unread-count', async (req: Request, res: Response) => {
  try {
    const count = await getUnreadCount('PASSENGER', pid(req));
    return res.json({ success: true, data: { count } });
  } catch (error: any) {
    console.error('[passenger_notifications_unread_count_error]', { error: error?.message });
    return res.status(500).json({ success: false, error: 'Erro ao contar notificações' });
  }
});

// PATCH /api/passenger/notifications/read-all
router.patch('/read-all', async (req: Request, res: Response) => {
  try {
    const count = await markAllRead('PASSENGER', pid(req));
    return res.json({ success: true, data: { marked: count } });
  } catch (error: any) {
    console.error('[passenger_notifications_read_all_error]', { error: error?.message });
    return res.status(500).json({ success: false, error: 'Erro ao marcar notificações' });
  }
});

// PATCH /api/passenger/notifications/:id/read
router.patch('/:id/read', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ success: false, error: 'ID obrigatório' });
    }
    const marked = await markNotificationRead(id, 'PASSENGER', pid(req));
    if (!marked) {
      return res.status(404).json({ success: false, error: 'Notificação não encontrada' });
    }
    return res.json({ success: true });
  } catch (error: any) {
    console.error('[passenger_notifications_read_error]', { error: error?.message });
    return res.status(500).json({ success: false, error: 'Erro ao marcar notificação' });
  }
});

export default router;
