import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateDriver } from '../middlewares/auth';
import {
  FIXED_ROUTE_DRIVER_RESERVATION_STATUSES,
  calculateFixedRouteAmounts,
  cleanString,
  confirmedSeats,
  createFixedRouteEvent,
  fixedRouteFeePercent,
  isApprovedActiveCarDriver,
  mapRouteWithAvailability,
  parseDaysOfWeek,
  parseHHmm,
  parseTripType,
  uniqueFixedRouteInviteCode,
} from '../services/fixed-route.service';

const router = Router();
const db = prisma as any;

router.use(authenticateDriver);

function driverId(req: Request) {
  return (req as any).driver?.id || (req as any).driverId || (req as any).userId;
}

function validateRouteBody(body: any, partial = false, existingRoute?: any) {
  const data: any = {};
  if (!partial || body.title !== undefined) {
    const title = cleanString(body.title, 120);
    if (!title) return { error: 'Título é obrigatório' };
    data.title = title;
  }
  if (body.description !== undefined) data.description = cleanString(body.description, 800) || null;
  if (!partial || body.origin_label !== undefined) {
    const origin = cleanString(body.origin_label, 160);
    if (!origin) return { error: 'Origem geral é obrigatória' };
    data.origin_label = origin;
  }
  if (!partial || body.destination_label !== undefined) {
    const destination = cleanString(body.destination_label, 160);
    if (!destination) return { error: 'Destino geral é obrigatório' };
    data.destination_label = destination;
  }

  if (!partial || body.trip_type !== undefined) {
    const tripType = parseTripType(body.trip_type || 'round_trip');
    if (!tripType) return { error: 'Tipo de rota inválido' };
    data.trip_type = tripType;
  }

  if (body.departure_time !== undefined) {
    if (body.departure_time === null || body.departure_time === '') {
      data.departure_time = null;
    } else {
      const departure = parseHHmm(body.departure_time);
      if (!departure) return { error: 'Horário de ida deve estar no formato HH:mm' };
      data.departure_time = departure;
    }
  }

  if (body.return_time !== undefined) {
    if (body.return_time === null || body.return_time === '') {
      data.return_time = null;
    } else {
      const returnTime = parseHHmm(body.return_time);
      if (!returnTime) return { error: 'Horário de volta deve estar no formato HH:mm' };
      data.return_time = returnTime;
    }
  }

  if (!partial || body.days_of_week !== undefined) {
    const days = parseDaysOfWeek(body.days_of_week);
    if (!days) return { error: 'Dias da semana devem ser números de 1 a 7' };
    data.days_of_week = days;
  }
  if (!partial || body.seats_total !== undefined) {
    const seats = Number(body.seats_total);
    if (!Number.isInteger(seats) || seats < 1 || seats > 4) return { error: 'Vagas devem ser entre 1 e 4' };
    data.seats_total = seats;
  }
  if (!partial || body.price_per_passenger_cents !== undefined) {
    const price = Number(body.price_per_passenger_cents);
    if (!Number.isInteger(price) || price <= 0) return { error: 'Valor por passageiro é obrigatório' };
    data.price_per_passenger_cents = price;
  }

  for (const key of ['suggested_price_cents', 'min_price_cents', 'max_price_cents']) {
    if (body[key] !== undefined) {
      const value = body[key] === null || body[key] === '' ? null : Number(body[key]);
      if (value !== null && (!Number.isInteger(value) || value < 0)) return { error: `${key} inválido` };
      data[key] = value;
    }
  }

  if (body.territory_id !== undefined) data.territory_id = cleanString(body.territory_id, 255) || null;
  if (body.neighborhood_id !== undefined) data.neighborhood_id = cleanString(body.neighborhood_id, 255) || null;

  const finalTripType = data.trip_type || existingRoute?.trip_type || 'round_trip';
  const finalDeparture = data.departure_time !== undefined ? data.departure_time : existingRoute?.departure_time;
  const finalReturn = data.return_time !== undefined ? data.return_time : existingRoute?.return_time;

  if (finalTripType === 'round_trip') {
    if (!finalDeparture || !finalReturn) return { error: 'Rota ida e volta exige horário de ida e de volta' };
    data.departure_time = finalDeparture;
    data.return_time = finalReturn;
  } else if (finalTripType === 'one_way_outbound') {
    if (!finalDeparture) return { error: 'Rota só ida exige horário de ida' };
    data.departure_time = finalDeparture;
    data.return_time = null;
  } else if (finalTripType === 'one_way_return') {
    if (!finalReturn) return { error: 'Rota só volta exige horário de volta' };
    data.departure_time = null;
    data.return_time = finalReturn;
  }

  return { data };
}

async function getOwnRoute(req: Request, res: Response) {
  const route = await db.driver_fixed_routes.findFirst({ where: { id: req.params.id, driver_id: driverId(req) } });
  if (!route) {
    res.status(404).json({ success: false, error: 'Rota fixa não encontrada' });
    return null;
  }
  return route;
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const routes = await db.driver_fixed_routes.findMany({
      where: { driver_id: driverId(req), status: { not: 'archived' } },
      orderBy: { created_at: 'desc' },
      take: Math.min(Number(req.query.limit) || 100, 200),
    });
    const data = await Promise.all(routes.map(async (route: any) => mapRouteWithAvailability(route, await confirmedSeats(db, route.id))));
    return res.json({ success: true, data });
  } catch (error) {
    console.error('[DRIVER_FIXED_ROUTES_LIST_ERROR]', error);
    return res.status(500).json({ success: false, error: 'Erro ao listar rotas fixas' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const driver = (req as any).driver;
    if (!isApprovedActiveCarDriver(driver)) {
      return res.status(403).json({ success: false, error: 'Apenas motoristas aprovados e ativos com carro podem criar Rotas Fixas.' });
    }
    const built = validateRouteBody(req.body, false);
    if ('error' in built) return res.status(400).json({ success: false, error: built.error });

    const route = await db.driver_fixed_routes.create({
      data: {
        ...built.data,
        driver_id: driverId(req),
        status: 'active',
        invite_code: await uniqueFixedRouteInviteCode(db),
        kaviar_fee_percent: fixedRouteFeePercent(),
      },
    });
    await createFixedRouteEvent(db, { route_id: route.id, actor_type: 'DRIVER', actor_id: driverId(req), action: 'route_created' });
    return res.status(201).json({ success: true, data: mapRouteWithAvailability(route, 0) });
  } catch (error) {
    console.error('[DRIVER_FIXED_ROUTES_CREATE_ERROR]', error);
    return res.status(500).json({ success: false, error: 'Erro ao criar rota fixa' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const route = await getOwnRoute(req, res);
    if (!route) return;
    return res.json({ success: true, data: mapRouteWithAvailability(route, await confirmedSeats(db, route.id)) });
  } catch (error) {
    console.error('[DRIVER_FIXED_ROUTES_DETAIL_ERROR]', error);
    return res.status(500).json({ success: false, error: 'Erro ao buscar rota fixa' });
  }
});

router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const route = await getOwnRoute(req, res);
    if (!route) return;
    if (route.status === 'cancelled' || route.status === 'archived') return res.status(409).json({ success: false, error: 'Rota fixa não pode ser editada neste status' });
    const built = validateRouteBody(req.body, true, route);
    if ('error' in built) return res.status(400).json({ success: false, error: built.error });
    if (built.data.seats_total !== undefined) {
      const reservedSeats = await confirmedSeats(db, route.id);
      if (built.data.seats_total < reservedSeats) {
        return res.status(409).json({ success: false, error: 'Vagas totais não podem ser menores que as reservas confirmadas' });
      }
    }
    const updated = await db.driver_fixed_routes.update({ where: { id: route.id }, data: built.data });
    await createFixedRouteEvent(db, { route_id: route.id, actor_type: 'DRIVER', actor_id: driverId(req), action: 'route_updated', metadata: { changed_fields: Object.keys(built.data) } });
    return res.json({ success: true, data: mapRouteWithAvailability(updated, await confirmedSeats(db, route.id)) });
  } catch (error) {
    console.error('[DRIVER_FIXED_ROUTES_UPDATE_ERROR]', error);
    return res.status(500).json({ success: false, error: 'Erro ao atualizar rota fixa' });
  }
});

router.patch('/:id/pause', async (req: Request, res: Response) => {
  try {
    const route = await getOwnRoute(req, res);
    if (!route) return;
    if (route.status === 'archived') return res.status(409).json({ success: false, error: 'Rota arquivada não pode ser pausada' });
    if (route.status !== 'active') return res.status(409).json({ success: false, error: 'Somente rotas ativas podem ser pausadas' });
    const updated = await db.driver_fixed_routes.update({ where: { id: route.id }, data: { status: 'paused', paused_at: new Date() } });
    await createFixedRouteEvent(db, { route_id: route.id, actor_type: 'DRIVER', actor_id: driverId(req), action: 'route_paused' });
    return res.json({ success: true, data: mapRouteWithAvailability(updated, await confirmedSeats(db, route.id)) });
  } catch (error) {
    console.error('[DRIVER_FIXED_ROUTES_PAUSE_ERROR]', error);
    return res.status(500).json({ success: false, error: 'Erro ao pausar rota fixa' });
  }
});

router.patch('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const route = await getOwnRoute(req, res);
    if (!route) return;
    if (route.status === 'archived') return res.status(409).json({ success: false, error: 'Rota arquivada não pode ser cancelada' });
    if (route.status === 'cancelled') return res.status(409).json({ success: false, error: 'Rota já está cancelada' });
    const updated = await db.driver_fixed_routes.update({ where: { id: route.id }, data: { status: 'cancelled', cancelled_at: new Date() } });
    await createFixedRouteEvent(db, { route_id: route.id, actor_type: 'DRIVER', actor_id: driverId(req), action: 'route_cancelled' });
    return res.json({ success: true, data: mapRouteWithAvailability(updated, await confirmedSeats(db, route.id)) });
  } catch (error) {
    console.error('[DRIVER_FIXED_ROUTES_CANCEL_ERROR]', error);
    return res.status(500).json({ success: false, error: 'Erro ao cancelar rota fixa' });
  }
});

router.patch('/:id/reactivate', async (req: Request, res: Response) => {
  try {
    const route = await getOwnRoute(req, res);
    if (!route) return;
    if (route.status === 'archived') return res.status(409).json({ success: false, error: 'Rota arquivada não pode ser reativada neste MVP' });
    if (route.status !== 'cancelled' && route.status !== 'paused') {
      return res.status(409).json({ success: false, error: 'Somente rotas pausadas ou canceladas podem ser reativadas' });
    }

    const updated = await db.driver_fixed_routes.update({
      where: { id: route.id },
      data: { status: 'active', paused_at: null, cancelled_at: null },
    });
    await createFixedRouteEvent(db, { route_id: route.id, actor_type: 'DRIVER', actor_id: driverId(req), action: 'route_reactivated' });
    return res.json({ success: true, data: mapRouteWithAvailability(updated, await confirmedSeats(db, route.id)) });
  } catch (error) {
    console.error('[DRIVER_FIXED_ROUTES_REACTIVATE_ERROR]', error);
    return res.status(500).json({ success: false, error: 'Erro ao reativar rota fixa' });
  }
});

router.patch('/:id/archive', async (req: Request, res: Response) => {
  try {
    const route = await getOwnRoute(req, res);
    if (!route) return;
    if (route.status === 'archived') {
      return res.status(409).json({ success: false, error: 'Rota já está arquivada' });
    }
    if (route.status === 'active') {
      return res.status(409).json({ success: false, error: 'Pause ou cancele a rota antes de arquivar' });
    }

    const updated = await db.driver_fixed_routes.update({ where: { id: route.id }, data: { status: 'archived' } });
    await createFixedRouteEvent(db, { route_id: route.id, actor_type: 'DRIVER', actor_id: driverId(req), action: 'route_archived' });
    return res.json({ success: true, data: mapRouteWithAvailability(updated, await confirmedSeats(db, route.id)) });
  } catch (error) {
    console.error('[DRIVER_FIXED_ROUTES_ARCHIVE_ERROR]', error);
    return res.status(500).json({ success: false, error: 'Erro ao arquivar rota fixa' });
  }
});

router.get('/:id/reservations', async (req: Request, res: Response) => {
  try {
    const route = await getOwnRoute(req, res);
    if (!route) return;
    const reservations = await db.driver_fixed_route_reservations.findMany({
      where: { route_id: route.id },
      include: { passenger: { select: { id: true, name: true } } },
      orderBy: { created_at: 'desc' },
    });
    return res.json({ success: true, data: reservations });
  } catch (error) {
    console.error('[DRIVER_FIXED_ROUTES_RESERVATIONS_ERROR]', error);
    return res.status(500).json({ success: false, error: 'Erro ao listar reservas' });
  }
});

router.patch('/:id/reservations/:reservationId/status', async (req: Request, res: Response) => {
  try {
    const route = await getOwnRoute(req, res);
    if (!route) return;
    const status = cleanString(req.body?.status, 40);
    if (!FIXED_ROUTE_DRIVER_RESERVATION_STATUSES.includes(status)) return res.status(400).json({ success: false, error: 'Status de reserva inválido' });
    const reservation = await db.driver_fixed_route_reservations.findFirst({ where: { id: req.params.reservationId, route_id: route.id } });
    if (!reservation) return res.status(404).json({ success: false, error: 'Reserva não encontrada' });
    const data: any = { status };
    if (status === 'cancelled_by_driver') {
      data.cancelled_at = new Date();
      data.cancel_reason = cleanString(req.body?.cancel_reason, 300) || null;
    }
    const updated = await db.driver_fixed_route_reservations.update({ where: { id: reservation.id }, data });
    await createFixedRouteEvent(db, { route_id: route.id, reservation_id: reservation.id, actor_type: 'DRIVER', actor_id: driverId(req), action: 'reservation_status_changed_by_driver', metadata: { status } });
    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('[DRIVER_FIXED_ROUTES_RESERVATION_STATUS_ERROR]', error);
    return res.status(500).json({ success: false, error: 'Erro ao atualizar reserva' });
  }
});

export default router;
