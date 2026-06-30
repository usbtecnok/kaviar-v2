import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticatePassenger } from '../middlewares/auth';
import {
  FIXED_ROUTE_ACTIVE_RESERVATION_STATUSES,
  buildPublicFixedRoutePayload,
  calculateFixedRouteAmounts,
  cleanString,
  confirmedSeats,
  createFixedRouteEvent,
  isFixedRouteInviteCode,
  mapRouteWithAvailability,
  normalizeFixedRouteInviteCode,
} from '../services/fixed-route.service';

const router = Router();
const db = prisma as any;

function passengerId(req: Request) {
  return (req as any).passenger?.id || (req as any).passengerId || (req as any).userId;
}

function codeParam(req: Request) {
  return normalizeFixedRouteInviteCode(req.params.code);
}

async function findRouteByCode(code: string) {
  if (!isFixedRouteInviteCode(code)) return null;
  return db.driver_fixed_routes.findUnique({
    where: { invite_code: code },
    include: { driver: { select: { id: true, name: true } } },
  });
}

router.get('/invites/:code', async (req: Request, res: Response) => {
  try {
    const route = await findRouteByCode(codeParam(req));
    if (!route) return res.status(404).json({ success: false, error: 'Convite de Rota Fixa não encontrado' });
    if (route.status === 'archived') return res.status(410).json({ success: false, error: 'Rota Fixa indisponível' });
    const reservedSeats = await confirmedSeats(db, route.id);
    return res.json({ success: true, data: buildPublicFixedRoutePayload(route, Number(route.seats_total || 0) - reservedSeats) });
  } catch (error) {
    console.error('[FIXED_ROUTE_INVITE_PREVIEW_ERROR]', error);
    return res.status(500).json({ success: false, error: 'Erro ao buscar convite de Rota Fixa' });
  }
});

router.post('/invites/:code/reserve', authenticatePassenger, async (req: Request, res: Response) => {
  try {
    const seatsReserved = Number(req.body?.seats_reserved ?? 1);
    if (seatsReserved !== 1) return res.status(400).json({ success: false, error: 'Neste MVP, a reserva é limitada a 1 vaga por passageiro.' });

    const code = codeParam(req);
    const route = await findRouteByCode(code);
    if (!route) return res.status(404).json({ success: false, error: 'Convite de Rota Fixa não encontrado' });
    if (route.status !== 'active') return res.status(410).json({ success: false, error: 'Rota Fixa indisponível para reserva' });

    const pId = passengerId(req);
    const result = await db.$transaction(async (tx: any) => {
      if (typeof tx.$queryRawUnsafe === 'function') {
        await tx.$queryRawUnsafe('SELECT id FROM "driver_fixed_routes" WHERE id = $1::uuid FOR UPDATE', route.id);
      }

      const latestRoute = await tx.driver_fixed_routes.findUnique({ where: { id: route.id } });
      if (!latestRoute || latestRoute.status !== 'active') throw Object.assign(new Error('Rota Fixa indisponível para reserva'), { statusCode: 410 });

      const existing = await tx.driver_fixed_route_reservations.findFirst({
        where: { route_id: latestRoute.id, passenger_id: pId, status: { in: FIXED_ROUTE_ACTIVE_RESERVATION_STATUSES } },
      });
      if (existing) return { idempotent: true, route: latestRoute, reservation: existing };

      const reservedSeats = await confirmedSeats(tx, latestRoute.id);
      if (reservedSeats + seatsReserved > latestRoute.seats_total) {
        throw Object.assign(new Error('Não há vagas disponíveis nesta Rota Fixa'), { statusCode: 409 });
      }

      const amounts = calculateFixedRouteAmounts(Number(latestRoute.price_per_passenger_cents) * seatsReserved, Number(latestRoute.kaviar_fee_percent));
      const reservation = await tx.driver_fixed_route_reservations.create({
        data: {
          route_id: latestRoute.id,
          passenger_id: pId,
          status: 'confirmed',
          seats_reserved: seatsReserved,
          ...amounts,
        },
      });
      await createFixedRouteEvent(tx, { route_id: latestRoute.id, reservation_id: reservation.id, actor_type: 'PASSENGER', actor_id: pId, action: 'reservation_created' });
      return { idempotent: false, route: latestRoute, reservation };
    });

    const reservedSeats = await confirmedSeats(db, result.route.id);
    return res.status(result.idempotent ? 200 : 201).json({
      success: true,
      idempotent: result.idempotent,
      data: {
        ...result.reservation,
        route: mapRouteWithAvailability(result.route, reservedSeats),
      },
    });
  } catch (error: any) {
    if (error?.statusCode) return res.status(error.statusCode).json({ success: false, error: error.message });
    console.error('[FIXED_ROUTE_RESERVE_ERROR]', error);
    return res.status(500).json({ success: false, error: 'Erro ao reservar vaga na Rota Fixa' });
  }
});

export default router;
