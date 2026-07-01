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

function resolvePassengerIds(req: Request): { authUserId: string | null; passengerId: string | null } {
  const authUserId = (req as any).userId ? String((req as any).userId) : null;
  const passengerId = (req as any).passenger?.id
    ? String((req as any).passenger.id)
    : (req as any).passengerId
      ? String((req as any).passengerId)
      : authUserId;
  return { authUserId, passengerId };
}

// GET /api/passenger/notifications?limit=50
router.get('/', async (req: Request, res: Response) => {
  try {
    const { authUserId, passengerId } = resolvePassengerIds(req);
    if (!passengerId) {
      return res.status(401).json({ success: false, error: 'Passageiro não autenticado' });
    }

    const limit = Math.min(parseInt(String(req.query.limit || '50'), 10) || 50, 100);
    const items = await listNotifications('PASSENGER', passengerId, limit);
    console.info('[passenger_notifications_list]', {
      authUserId,
      resolvedPassengerId: passengerId,
      count: items.length,
      limit,
    });
    return res.json({ success: true, data: items });
  } catch (error: any) {
    console.error('[passenger_notifications_list_error]', { error: error?.message });
    return res.status(500).json({ success: false, error: 'Erro ao listar notificações' });
  }
});

// GET /api/passenger/notifications/unread-count
router.get('/unread-count', async (req: Request, res: Response) => {
  try {
    const { authUserId, passengerId } = resolvePassengerIds(req);
    if (!passengerId) {
      return res.status(401).json({ success: false, error: 'Passageiro não autenticado' });
    }

    const count = await getUnreadCount('PASSENGER', passengerId);
    console.info('[passenger_notifications_unread_count]', {
      authUserId,
      resolvedPassengerId: passengerId,
      count,
      limit: null,
    });
    return res.json({ success: true, data: { count } });
  } catch (error: any) {
    console.error('[passenger_notifications_unread_count_error]', { error: error?.message });
    return res.status(500).json({ success: false, error: 'Erro ao contar notificações' });
  }
});

// PATCH /api/passenger/notifications/read-all
router.patch('/read-all', async (req: Request, res: Response) => {
  try {
    const { passengerId } = resolvePassengerIds(req);
    if (!passengerId) {
      return res.status(401).json({ success: false, error: 'Passageiro não autenticado' });
    }
    const count = await markAllRead('PASSENGER', passengerId);
    return res.json({ success: true, data: { marked: count } });
  } catch (error: any) {
    console.error('[passenger_notifications_read_all_error]', { error: error?.message });
    return res.status(500).json({ success: false, error: 'Erro ao marcar notificações' });
  }
});

// PATCH /api/passenger/notifications/:id/read
router.patch('/:id/read', async (req: Request, res: Response) => {
  try {
    const { passengerId } = resolvePassengerIds(req);
    if (!passengerId) {
      return res.status(401).json({ success: false, error: 'Passageiro não autenticado' });
    }

    const { id } = req.params;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ success: false, error: 'ID obrigatório' });
    }
    const marked = await markNotificationRead(id, 'PASSENGER', passengerId);
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
