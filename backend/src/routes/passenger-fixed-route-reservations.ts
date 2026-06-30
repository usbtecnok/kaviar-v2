import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticatePassenger } from '../middlewares/auth';
import { cleanString, confirmedSeats, createFixedRouteEvent, mapRouteWithAvailability } from '../services/fixed-route.service';

const router = Router();
const db = prisma as any;

router.use(authenticatePassenger);

function passengerId(req: Request) {
  return (req as any).passenger?.id || (req as any).passengerId || (req as any).userId;
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const reservations = await db.driver_fixed_route_reservations.findMany({
      where: { passenger_id: passengerId(req) },
      include: { route: { include: { driver: { select: { id: true, name: true } } } } },
      orderBy: { created_at: 'desc' },
      take: Math.min(Number(req.query.limit) || 100, 200),
    });
    const data = await Promise.all(reservations.map(async (reservation: any) => ({
      ...reservation,
      route: mapRouteWithAvailability(reservation.route, await confirmedSeats(db, reservation.route_id)),
    })));
    return res.json({ success: true, data });
  } catch (error) {
    console.error('[PASSENGER_FIXED_ROUTE_RESERVATIONS_LIST_ERROR]', error);
    return res.status(500).json({ success: false, error: 'Erro ao listar reservas de Rotas Fixas' });
  }
});

router.patch('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const reservation = await db.driver_fixed_route_reservations.findFirst({ where: { id: req.params.id, passenger_id: passengerId(req) } });
    if (!reservation) return res.status(404).json({ success: false, error: 'Reserva não encontrada' });
    if (reservation.status !== 'confirmed') return res.status(409).json({ success: false, error: 'Reserva não pode ser cancelada neste status' });

    const updated = await db.driver_fixed_route_reservations.update({
      where: { id: reservation.id },
      data: {
        status: 'cancelled_by_passenger',
        cancelled_at: new Date(),
        cancel_reason: cleanString(req.body?.cancel_reason, 300) || null,
      },
    });
    await createFixedRouteEvent(db, { route_id: reservation.route_id, reservation_id: reservation.id, actor_type: 'PASSENGER', actor_id: passengerId(req), action: 'reservation_cancelled_by_passenger' });
    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('[PASSENGER_FIXED_ROUTE_RESERVATION_CANCEL_ERROR]', error);
    return res.status(500).json({ success: false, error: 'Erro ao cancelar reserva' });
  }
});

export default router;
