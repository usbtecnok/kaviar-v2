import { Router, Request, Response } from 'express';
import { checkAllNotifications } from '../services/notifications';
import { authenticateDriver } from '../middlewares/auth';

const router = Router();
router.use(authenticateDriver);

/**
 * GET /api/drivers/:driverId/notifications
 * Busca notificações pendentes para o motorista
 */
router.get('/:driverId/notifications', async (req: Request, res: Response) => {
  try {
    const { driverId } = req.params;
    if (driverId !== (req as any).driverId) {
      return res.status(403).json({ success: false, error: 'Acesso negado' });
    }
    const { lat, lng } = req.query;

    const notifications = await checkAllNotifications(
      driverId,
      lat ? Number(lat) : undefined,
      lng ? Number(lng) : undefined
    );

    res.json({
      success: true,
      data: {
        count: notifications.length,
        notifications
      }
    });

  } catch (error: any) {
    console.error('Erro ao buscar notificações:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar notificações'
    });
  }
});

export default router;
