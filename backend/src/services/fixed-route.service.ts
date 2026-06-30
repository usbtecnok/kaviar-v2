import crypto from 'crypto';

export const FIXED_ROUTE_ACTIVE_RESERVATION_STATUSES = ['confirmed'];
export const FIXED_ROUTE_STATUSES = ['active', 'paused', 'cancelled', 'archived'];
export const FIXED_ROUTE_TRIP_TYPES = ['one_way_outbound', 'one_way_return', 'round_trip'] as const;
export type FixedRouteTripType = typeof FIXED_ROUTE_TRIP_TYPES[number];
export const FIXED_ROUTE_DRIVER_RESERVATION_STATUSES = ['confirmed', 'cancelled_by_driver', 'completed', 'no_show'];

export function normalizeFixedRouteInviteCode(value?: string | null): string {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, '');
}

export function isFixedRouteInviteCode(value?: string | null): boolean {
  return normalizeFixedRouteInviteCode(value).startsWith('KFR-');
}

export function fixedRouteFeePercent(): number {
  const parsed = Number(process.env.FIXED_ROUTE_KAVIAR_FEE_PERCENT || '10');
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) return 10;
  return Math.round(parsed * 100) / 100;
}

export function calculateFixedRouteAmounts(priceCents: number, feePercent: number) {
  const kaviarFeeCents = Math.round(priceCents * feePercent / 100);
  return {
    price_cents: priceCents,
    kaviar_fee_percent: feePercent,
    kaviar_fee_cents: kaviarFeeCents,
    driver_net_cents: priceCents - kaviarFeeCents,
  };
}

export function cleanString(value: any, max: number): string {
  return String(value ?? '').trim().slice(0, max);
}

export function parseHHmm(value: any): string | null {
  const text = cleanString(value, 5);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(text)) return null;
  return text;
}

export function parseDaysOfWeek(value: any): number[] | null {
  if (!Array.isArray(value)) return null;
  const days = Array.from(new Set(value.map((item) => Number(item))));
  if (days.length === 0 || days.length > 7) return null;
  if (days.some((day) => !Number.isInteger(day) || day < 1 || day > 7)) return null;
  return days.sort((a, b) => a - b);
}

export function parseTripType(value: any): FixedRouteTripType | null {
  const normalized = String(value || '').trim();
  if (!normalized) return null;
  if (!FIXED_ROUTE_TRIP_TYPES.includes(normalized as FixedRouteTripType)) return null;
  return normalized as FixedRouteTripType;
}

export function isApprovedActiveCarDriver(driver: any): boolean {
  if (!driver) return false;
  if (driver.deleted_at || driver.banned_at || driver.suspended_at) return false;
  if (!['approved', 'active'].includes(String(driver.status || '').toLowerCase())) return false;
  return String(driver.vehicle_type || 'CAR').toUpperCase() === 'CAR';
}

export function buildPublicFixedRoutePayload(route: any, seatsAvailable: number) {
  const driverName = route.driver?.name ? String(route.driver.name).trim().split(/\s+/)[0] : null;
  return {
    code: route.invite_code,
    status: route.status,
    trip_type: route.trip_type || 'round_trip',
    title: route.title,
    description: route.description,
    origin_label: route.origin_label,
    destination_label: route.destination_label,
    departure_time: route.departure_time,
    return_time: route.return_time,
    days_of_week: route.days_of_week,
    seats_total: route.seats_total,
    seats_available: Math.max(0, seatsAvailable),
    price_per_passenger_cents: route.price_per_passenger_cents,
    driver: driverName ? { first_name: driverName } : null,
  };
}

export async function uniqueFixedRouteInviteCode(db: any): Promise<string> {
  for (let i = 0; i < 8; i += 1) {
    const code = `KFR-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
    const exists = await db.driver_fixed_routes.findUnique({ where: { invite_code: code } });
    if (!exists) return code;
  }
  throw new Error('Não foi possível gerar convite único de Rota Fixa');
}

export async function createFixedRouteEvent(db: any, data: {
  route_id: string;
  reservation_id?: string | null;
  actor_type: 'DRIVER' | 'PASSENGER' | 'ADMIN' | 'SYSTEM';
  actor_id?: string | null;
  action: string;
  metadata?: any;
}) {
  return db.driver_fixed_route_events.create({
    data: {
      route_id: data.route_id,
      reservation_id: data.reservation_id || null,
      actor_type: data.actor_type,
      actor_id: data.actor_id || null,
      action: data.action,
      metadata: data.metadata || undefined,
    },
  });
}

export async function confirmedSeats(db: any, routeId: string): Promise<number> {
  const result = await db.driver_fixed_route_reservations.aggregate({
    where: { route_id: routeId, status: { in: FIXED_ROUTE_ACTIVE_RESERVATION_STATUSES } },
    _sum: { seats_reserved: true },
  });
  return Number(result?._sum?.seats_reserved || 0);
}

export function mapRouteWithAvailability(route: any, reservedSeats: number) {
  return {
    ...route,
    seats_reserved: reservedSeats,
    seats_available: Math.max(0, Number(route.seats_total || 0) - reservedSeats),
  };
}
