import { Router, Request, Response } from 'express';
import { checkAllNotifications } from '../services/notifications';

const router = Router();

/**
 * GET /api/drivers/:driverId/notifications
 * Busca notificações pendentes para o motorista
 */
router.get('/:driverId/notifications', async (req: Request, res: Response) => {
  try {
    const { driverId } = req.params;
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
