import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateAdmin, requireRole } from '../middlewares/auth';
import { applyTerritoryScope } from '../middlewares/territory-scope';
import { audit, auditCtx } from '../utils/audit';
import { createFixedRouteEvent } from '../services/fixed-route.service';

const router = Router();
const db = prisma as any;

const ADMIN_READ_ROLES = ['SUPER_ADMIN', 'TERRITORIAL_MANAGER', 'TERRITORIAL_OPERATOR'];
const ROUTE_STATUSES = ['active', 'paused', 'cancelled', 'archived'];
const TRIP_TYPES = ['one_way_outbound', 'one_way_return', 'round_trip'];

router.use(authenticateAdmin);
router.use(requireRole(ADMIN_READ_ROLES));
router.use(applyTerritoryScope);

function cleanText(value: any, max = 160): string {
  return String(value || '').trim().slice(0, max);
}

function parseIntParam(value: any, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
}

function maskPhone(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length < 6) return null;
  return `${digits.slice(0, 2)}******${digits.slice(-2)}`;
}

function role(req: Request): string {
  return String((req as any).admin?.role || '');
}

function isSuperAdmin(req: Request): boolean {
  return role(req) === 'SUPER_ADMIN';
}

function scopedTerritoryIds(req: Request): string[] {
  const scope = (req as any).territoryScope;
  return Array.isArray(scope?.territoryIds) ? scope.territoryIds : [];
}

function canReadRoute(req: Request, route: any): boolean {
  if (isSuperAdmin(req)) return true;
  if (!route?.territory_id) return false;
  return scopedTerritoryIds(req).includes(String(route.territory_id));
}

function ensureWritableBySuperAdmin(req: Request, res: Response): boolean {
  if (!isSuperAdmin(req)) {
    res.status(403).json({ success: false, error: 'Apenas SUPER_ADMIN pode alterar status de Rotas Fixas' });
    return false;
  }
  return true;
}

async function getScopedRouteOr404(req: Request, res: Response) {
  const route = await db.driver_fixed_routes.findUnique({
    where: { id: req.params.id },
    include: { driver: { select: { id: true, name: true, phone: true } } },
  });

  if (!route || !canReadRoute(req, route)) {
    res.status(404).json({ success: false, error: 'Rota fixa não encontrada' });
    return null;
  }
  return route;
}

function summarizeReservations(rows: any[]) {
  const summary = {
    confirmed_count: 0,
    no_show_count: 0,
    cancelled_count: 0,
    completed_count: 0,
    gross_revenue_cents: 0,
    kaviar_fee_cents: 0,
    driver_net_cents: 0,
  };

  for (const row of rows) {
    const status = String(row.status || '');
    if (status === 'confirmed') summary.confirmed_count += 1;
    else if (status === 'no_show') summary.no_show_count += 1;
    else if (status === 'completed') summary.completed_count += 1;
    else if (status.startsWith('cancelled')) summary.cancelled_count += 1;

    if (status !== 'cancelled_by_driver' && status !== 'cancelled_by_passenger') {
      summary.gross_revenue_cents += Number(row.price_cents || 0);
      summary.kaviar_fee_cents += Number(row.kaviar_fee_cents || 0);
      summary.driver_net_cents += Number(row.driver_net_cents || 0);
    }
  }

  return summary;
}

function mapRouteListItem(route: any, reservedSeats: number, territoryMap: Map<string, string>) {
  const priceCents = Number(route.price_per_passenger_cents || 0);
  const feePercent = Number(route.kaviar_fee_percent || 0);
  const estimatedFeeCents = Math.round((priceCents * feePercent) / 100);

  return {
    id: route.id,
    invite_code: route.invite_code,
    title: route.title,
    origin_label: route.origin_label,
    destination_label: route.destination_label,
    trip_type: route.trip_type || 'round_trip',
    departure_time: route.departure_time,
    return_time: route.return_time,
    weekdays: route.days_of_week,
    seats_total: Number(route.seats_total || 0),
    seats_available: Math.max(0, Number(route.seats_total || 0) - reservedSeats),
    reserved_count: reservedSeats,
    price_cents: priceCents,
    kaviar_fee_percent: feePercent,
    kaviar_fee_cents: estimatedFeeCents,
    driver_net_cents: priceCents - estimatedFeeCents,
    status: route.status,
    created_at: route.created_at,
    updated_at: route.updated_at,
    driver_id: route.driver_id,
    driver_name: route.driver?.name || 'Motorista KAVIAR',
    driver_phone: maskPhone(route.driver?.phone),
    territory_id: route.territory_id || null,
    territory_name: route.territory_id ? territoryMap.get(route.territory_id) || null : null,
  };
}

async function auditAdminRouteAction(req: Request, action: string, routeId: string, oldValue: any, newValue: any) {
  const ctx = auditCtx(req as any);
  await audit({
    adminId: ctx.adminId,
    adminEmail: ctx.adminEmail,
    action,
    entityType: 'driver_fixed_routes',
    entityId: routeId,
    oldValue,
    newValue,
    ipAddress: ctx.ip,
    userAgent: ctx.ua,
  });
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = parseIntParam(req.query.limit, 50, 1, 200);
    const offset = parseIntParam(req.query.offset, 0, 0, 2000);
    const status = cleanText(req.query.status, 40);
    const tripType = cleanText(req.query.trip_type, 40);
    const search = cleanText(req.query.search, 120);

    const where: any = {};
    const andFilters: any[] = [];

    if (status) {
      if (!ROUTE_STATUSES.includes(status)) return res.status(400).json({ success: false, error: 'Status inválido' });
      andFilters.push({ status });
    }

    if (tripType) {
      if (!TRIP_TYPES.includes(tripType)) return res.status(400).json({ success: false, error: 'Tipo de rota inválido' });
      andFilters.push({ trip_type: tripType });
    }

    if (!isSuperAdmin(req)) {
      const territoryIds = scopedTerritoryIds(req);
      if (territoryIds.length === 0) {
        return res.json({ success: true, data: [], pagination: { limit, offset, total: 0 } });
      }
      andFilters.push({ territory_id: { in: territoryIds } });
    }

    if (search) {
      andFilters.push({
        OR: [
          { invite_code: { contains: search, mode: 'insensitive' } },
          { title: { contains: search, mode: 'insensitive' } },
          { origin_label: { contains: search, mode: 'insensitive' } },
          { destination_label: { contains: search, mode: 'insensitive' } },
          { driver: { name: { contains: search, mode: 'insensitive' } } },
        ],
      });
    }

    if (andFilters.length > 0) where.AND = andFilters;

    const [total, routes] = await Promise.all([
      db.driver_fixed_routes.count({ where }),
      db.driver_fixed_routes.findMany({
        where,
        include: { driver: { select: { id: true, name: true, phone: true } } },
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
      }),
    ]);

    const routeIds = routes.map((route: any) => route.id);
    const reservations = routeIds.length === 0
      ? []
      : await db.driver_fixed_route_reservations.findMany({
        where: { route_id: { in: routeIds }, status: 'confirmed' },
        select: { route_id: true, seats_reserved: true },
      });

    const reservedByRoute = new Map<string, number>();
    for (const reservation of reservations) {
      reservedByRoute.set(
        reservation.route_id,
        Number(reservedByRoute.get(reservation.route_id) || 0) + Number(reservation.seats_reserved || 0),
      );
    }

    const territoryIds = Array.from(new Set(routes.map((route: any) => route.territory_id).filter(Boolean)));
    const territories = territoryIds.length === 0
      ? []
      : await db.operational_territories.findMany({
        where: { id: { in: territoryIds } },
        select: { id: true, name: true },
      });
    const territoryMap = new Map<string, string>(territories.map((territory: any) => [territory.id, territory.name]));

    const data = routes.map((route: any) => mapRouteListItem(route, Number(reservedByRoute.get(route.id) || 0), territoryMap));

    return res.json({ success: true, data, pagination: { limit, offset, total } });
  } catch (error) {
    console.error('[ADMIN_FIXED_ROUTES_LIST_ERROR]', error);
    return res.status(500).json({ success: false, error: 'Erro ao listar Rotas Fixas' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const route = await getScopedRouteOr404(req, res);
    if (!route) return;

    const [reservations, events, territory] = await Promise.all([
      db.driver_fixed_route_reservations.findMany({
        where: { route_id: route.id },
        select: {
          id: true,
          status: true,
          passenger_id: true,
          seats_reserved: true,
          price_cents: true,
          kaviar_fee_cents: true,
          driver_net_cents: true,
          created_at: true,
          updated_at: true,
        },
      }),
      db.driver_fixed_route_events.findMany({
        where: { route_id: route.id },
        orderBy: { created_at: 'desc' },
        take: 50,
      }),
      route.territory_id
        ? db.operational_territories.findUnique({ where: { id: route.territory_id }, select: { id: true, name: true } })
        : null,
    ]);

    const metrics = summarizeReservations(reservations);
    const confirmedSeats = reservations
      .filter((reservation: any) => reservation.status === 'confirmed')
      .reduce((sum: number, reservation: any) => sum + Number(reservation.seats_reserved || 0), 0);

    return res.json({
      success: true,
      data: {
        route: {
          id: route.id,
          invite_code: route.invite_code,
          title: route.title,
          description: route.description,
          origin_label: route.origin_label,
          destination_label: route.destination_label,
          trip_type: route.trip_type || 'round_trip',
          departure_time: route.departure_time,
          return_time: route.return_time,
          weekdays: route.days_of_week,
          seats_total: Number(route.seats_total || 0),
          seats_available: Math.max(0, Number(route.seats_total || 0) - confirmedSeats),
          reserved_count: confirmedSeats,
          price_cents: Number(route.price_per_passenger_cents || 0),
          kaviar_fee_percent: Number(route.kaviar_fee_percent || 0),
          status: route.status,
          created_at: route.created_at,
          updated_at: route.updated_at,
          territory_id: route.territory_id || null,
          territory_name: territory?.name || null,
        },
        driver: {
          id: route.driver?.id || route.driver_id,
          name: route.driver?.name || 'Motorista KAVIAR',
          phone: maskPhone(route.driver?.phone),
        },
        metrics,
        events,
      },
    });
  } catch (error) {
    console.error('[ADMIN_FIXED_ROUTES_DETAIL_ERROR]', error);
    return res.status(500).json({ success: false, error: 'Erro ao buscar detalhe da Rota Fixa' });
  }
});

router.get('/:id/reservations', async (req: Request, res: Response) => {
  try {
    const route = await getScopedRouteOr404(req, res);
    if (!route) return;

    const reservations = await db.driver_fixed_route_reservations.findMany({
      where: { route_id: route.id },
      include: { passenger: { select: { id: true, name: true, phone: true } } },
      orderBy: { created_at: 'desc' },
      take: Math.min(parseIntParam(req.query.limit, 200, 1, 500), 500),
      skip: parseIntParam(req.query.offset, 0, 0, 5000),
    });

    const data = reservations.map((reservation: any) => ({
      id: reservation.id,
      status: reservation.status,
      passenger_name: reservation.passenger?.name || 'Passageiro',
      passenger_phone: maskPhone(reservation.passenger?.phone),
      seats_reserved: Number(reservation.seats_reserved || 0),
      price_cents: Number(reservation.price_cents || 0),
      kaviar_fee_cents: Number(reservation.kaviar_fee_cents || 0),
      driver_net_cents: Number(reservation.driver_net_cents || 0),
      created_at: reservation.created_at,
      updated_at: reservation.updated_at,
    }));

    return res.json({ success: true, data });
  } catch (error) {
    console.error('[ADMIN_FIXED_ROUTES_RESERVATIONS_ERROR]', error);
    return res.status(500).json({ success: false, error: 'Erro ao listar reservas da Rota Fixa' });
  }
});

router.patch('/:id/pause', async (req: Request, res: Response) => {
  try {
    if (!ensureWritableBySuperAdmin(req, res)) return;
    const route = await getScopedRouteOr404(req, res);
    if (!route) return;
    if (route.status !== 'active') return res.status(409).json({ success: false, error: 'Somente rotas ativas podem ser pausadas' });

    const updated = await db.driver_fixed_routes.update({
      where: { id: route.id },
      data: { status: 'paused', paused_at: new Date() },
    });

    await createFixedRouteEvent(db, {
      route_id: route.id,
      actor_type: 'ADMIN',
      actor_id: (req as any).admin?.id,
      action: 'route_paused_by_admin',
      metadata: { role: role(req) },
    });

    await auditAdminRouteAction(req, 'fixed_route_admin_pause', route.id, { status: route.status }, { status: updated.status });

    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('[ADMIN_FIXED_ROUTES_PAUSE_ERROR]', error);
    return res.status(500).json({ success: false, error: 'Erro ao pausar Rota Fixa' });
  }
});

router.patch('/:id/reactivate', async (req: Request, res: Response) => {
  try {
    if (!ensureWritableBySuperAdmin(req, res)) return;
    const route = await getScopedRouteOr404(req, res);
    if (!route) return;
    if (route.status === 'archived') return res.status(409).json({ success: false, error: 'Rota arquivada não pode ser reativada no MVP' });
    if (route.status !== 'paused' && route.status !== 'cancelled') {
      return res.status(409).json({ success: false, error: 'Somente rotas pausadas ou canceladas podem ser reativadas' });
    }

    const updated = await db.driver_fixed_routes.update({
      where: { id: route.id },
      data: { status: 'active', paused_at: null, cancelled_at: null },
    });

    await createFixedRouteEvent(db, {
      route_id: route.id,
      actor_type: 'ADMIN',
      actor_id: (req as any).admin?.id,
      action: 'route_reactivated_by_admin',
      metadata: { role: role(req) },
    });

    await auditAdminRouteAction(req, 'fixed_route_admin_reactivate', route.id, { status: route.status }, { status: updated.status });

    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('[ADMIN_FIXED_ROUTES_REACTIVATE_ERROR]', error);
    return res.status(500).json({ success: false, error: 'Erro ao reativar Rota Fixa' });
  }
});

router.patch('/:id/archive', async (req: Request, res: Response) => {
  try {
    if (!ensureWritableBySuperAdmin(req, res)) return;
    const route = await getScopedRouteOr404(req, res);
    if (!route) return;
    if (route.status === 'archived') return res.status(409).json({ success: false, error: 'Rota já está arquivada' });
    if (route.status === 'active') {
      return res.status(409).json({ success: false, error: 'Pause ou cancele a rota antes de arquivar' });
    }
    if (route.status !== 'paused' && route.status !== 'cancelled') {
      return res.status(409).json({ success: false, error: 'Somente rotas pausadas ou canceladas podem ser arquivadas' });
    }

    const updated = await db.driver_fixed_routes.update({ where: { id: route.id }, data: { status: 'archived' } });

    await createFixedRouteEvent(db, {
      route_id: route.id,
      actor_type: 'ADMIN',
      actor_id: (req as any).admin?.id,
      action: 'route_archived_by_admin',
      metadata: { role: role(req) },
    });

    await auditAdminRouteAction(req, 'fixed_route_admin_archive', route.id, { status: route.status }, { status: updated.status });

    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('[ADMIN_FIXED_ROUTES_ARCHIVE_ERROR]', error);
    return res.status(500).json({ success: false, error: 'Erro ao arquivar Rota Fixa' });
  }
});

export default router;
