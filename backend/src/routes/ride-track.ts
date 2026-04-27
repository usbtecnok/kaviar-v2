import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

const TERMINAL = ['completed', 'canceled_by_passenger', 'canceled_by_driver', 'no_driver'];

const STATUS_LABEL: Record<string, string> = {
  accepted: 'Motorista a caminho',
  arrived: 'Motorista chegou',
  in_progress: 'Corrida em andamento',
  completed: 'Corrida finalizada',
};

router.get('/:token', async (req: Request, res: Response) => {
  try {
    const ride = await prisma.rides_v2.findFirst({
      where: { share_token: req.params.token },
      include: {
        driver: { select: { name: true, vehicle_model: true, vehicle_color: true, vehicle_plate: true, last_lat: true, last_lng: true } },
        passenger: { select: { name: true } },
        origin_neighborhood: { select: { name: true } },
        dest_neighborhood: { select: { name: true } },
      },
    });

    if (!ride) return res.status(404).json({ error: 'Link inválido ou expirado' });
    if (ride.share_expires_at && ride.share_expires_at < new Date()) {
      return res.status(404).json({ error: 'Link expirado' });
    }

    const isTerminal = TERMINAL.includes(ride.status);

    res.json({
      success: true,
      data: {
        status: ride.status,
        status_label: STATUS_LABEL[ride.status] || ride.status,
        is_active: !isTerminal,
        driver: ride.driver ? {
          first_name: ride.driver.name?.split(' ')[0] || 'Motorista',
          vehicle: [ride.driver.vehicle_model, ride.driver.vehicle_color].filter(Boolean).join(' '),
          plate: ride.driver.vehicle_plate,
          lat: isTerminal ? null : (ride.driver.last_lat ? Number(ride.driver.last_lat) : null),
          lng: isTerminal ? null : (ride.driver.last_lng ? Number(ride.driver.last_lng) : null),
        } : null,
        passenger_first_name: ride.passenger?.name?.split(' ')[0] || 'Passageiro',
        origin_neighborhood: ride.origin_neighborhood?.name || null,
        dest_neighborhood: ride.dest_neighborhood?.name || null,
        started_at: ride.started_at?.toISOString() || null,
      },
    });
  } catch (error: any) {
    console.error('[RIDE_TRACK_ERROR]', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
