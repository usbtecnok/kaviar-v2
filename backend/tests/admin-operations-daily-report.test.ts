import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    admins: { findUnique: vi.fn() },
    admin_territory_access: { findMany: vi.fn() },
    operational_territories: { findMany: vi.fn() },
    neighborhoods: { findMany: vi.fn() },
    rides_v2: {
      groupBy: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
      aggregate: vi.fn(),
    },
    ride_emergency_events: { count: vi.fn() },
    ride_settlements: { aggregate: vi.fn() },
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    $queryRaw: vi.fn(),
  },
}));

vi.mock('../src/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('../src/db', () => ({ pool: { query: vi.fn() } }));

let app: any;
let helpers: typeof import('../src/routes/admin-operations');

const tokenFor = (adminId: string) => jwt.sign(
  { userId: adminId, userType: 'ADMIN', email: `${adminId}@test.local` },
  process.env.JWT_SECRET!,
  { expiresIn: '1h' }
);

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret';
  process.env.ADMIN_JWT_SECRET = 'test-secret';
  helpers = await import('../src/routes/admin-operations');
  app = (await import('../src/app')).default;
});

beforeEach(() => {
  vi.clearAllMocks();

  prismaMock.admins.findUnique.mockResolvedValue({
    id: 'admin-1',
    email: 'admin@test.local',
    name: 'Admin Test',
    role: 'TERRITORIAL_MANAGER',
    is_active: true,
    password_changed_at: null,
  });
  prismaMock.admin_territory_access.findMany.mockResolvedValue([
    { territory_id: 'territory-a', access_level: 'full' },
  ]);
  prismaMock.operational_territories.findMany.mockImplementation(async (args: any) => {
    if (args?.where?.parent_id) return [];
    return [{ id: 'territory-a', name: 'Territorio A', city_name: 'Rio de Janeiro', uf: 'RJ' }];
  });
  prismaMock.neighborhoods.findMany.mockResolvedValue([{ id: 'neigh-1' }]);
  prismaMock.rides_v2.groupBy.mockResolvedValue([
    { status: 'completed', _count: 45 },
    { status: 'canceled_by_passenger', _count: 25 },
    { status: 'no_driver', _count: 105 },
    { status: 'requested', _count: 10 },
  ]);
  prismaMock.rides_v2.count.mockImplementation(async (args: any) => {
    const status = args?.where?.status;
    if (status === 'completed') return 45;
    if (status === 'no_driver') return 105;
    if (status?.in) return 25;
    return 0;
  });
  prismaMock.rides_v2.findMany.mockResolvedValue([
    { requested_at: new Date('2026-06-25T10:00:00.000Z'), offered_at: new Date('2026-06-25T10:02:00.000Z') },
    { requested_at: new Date('2026-06-25T11:00:00.000Z'), offered_at: new Date('2026-06-25T11:04:00.000Z') },
  ]);
  prismaMock.ride_settlements.aggregate.mockResolvedValue({
    _sum: { final_price: '1234.56', fee_amount: '222.22', driver_earnings: '1012.34' },
  });
  prismaMock.ride_emergency_events.count
    .mockResolvedValueOnce(4)
    .mockResolvedValueOnce(2);
});

describe('admin operations daily report helpers', () => {
  it('uses explicit America/Sao_Paulo operational day bounds', () => {
    const bounds = helpers.getSaoPauloDayBounds('2026-06-25');

    expect(bounds.start.toISOString()).toBe('2026-06-25T03:00:00.000Z');
    expect(bounds.end.toISOString()).toBe('2026-06-26T03:00:00.000Z');
  });

  it('rejects invalid dates', () => {
    expect(() => helpers.getSaoPauloDayBounds('2026-02-31')).toThrow('Data inválida');
    expect(() => helpers.getSaoPauloDayBounds('25-06-2026')).toThrow('Data inválida');
  });

  it('keeps raw driver phone only for operational roles', () => {
    expect(helpers.shouldReturnRawOperationalDriverPhone('SUPER_ADMIN')).toBe(true);
    expect(helpers.shouldReturnRawOperationalDriverPhone('OPERATOR')).toBe(true);
    expect(helpers.shouldReturnRawOperationalDriverPhone('TERRITORIAL_MANAGER')).toBe(true);
    expect(helpers.shouldReturnRawOperationalDriverPhone('TERRITORIAL_OPERATOR')).toBe(true);
    expect(helpers.shouldReturnRawOperationalDriverPhone('FINANCE')).toBe(false);
  });

  it('blocks scoped admins from rides without origin territory or outside scope', () => {
    const scope = { territoryIds: ['territory-a'] };

    expect(helpers.canScopedAdminAccessRideTerritory(null, null)).toBe(true);
    expect(helpers.canScopedAdminAccessRideTerritory(scope, null)).toBe(false);
    expect(helpers.canScopedAdminAccessRideTerritory(scope, 'territory-a')).toBe(true);
    expect(helpers.canScopedAdminAccessRideTerritory(scope, 'territory-b')).toBe(false);
  });

  it('aggregates daily metrics without screen-list limits', () => {
    const payload = helpers.buildDailyReportPayload({
      date: '2026-06-25',
      start: new Date('2026-06-25T03:00:00.000Z'),
      end: new Date('2026-06-26T03:00:00.000Z'),
      territory: { territories: [], active_territory_id: null, active_territory: null, scope_label: 'Visualizando todos os territorios' },
      requestedGroups: [
        { status: 'completed', _count: 45 },
        { status: 'no_driver', _count: 105 },
        { status: 'requested', _count: 10 },
      ],
      completedCount: 45,
      canceledCount: 25,
      noDriverCount: 105,
      emergencyRegisteredCount: 3,
      activeEmergencyCount: 1,
      settlementSums: { final_price: '1200.50', fee_amount: '216.09', driver_earnings: '984.41' },
      offerTimings: [
        { requested_at: new Date('2026-06-25T10:00:00.000Z'), offered_at: new Date('2026-06-25T10:02:00.000Z') },
        { requested_at: new Date('2026-06-25T11:00:00.000Z'), offered_at: new Date('2026-06-25T11:04:00.000Z') },
      ],
    });

    expect(payload.metrics.requested_rides).toBe(160);
    expect(payload.metrics.no_driver_or_no_offer_rides).toBe(105);
    expect(payload.metrics.final_revenue_cents).toBe(120050);
    expect(payload.metrics.kaviar_fee_cents).toBe(21609);
    expect(payload.metrics.driver_earnings_cents).toBe(98441);
    expect(payload.metrics.avg_to_offer_seconds).toBe(180);
    expect(payload.scope_rules.cross_territory).toContain('território de origem');
  });
});

describe('GET /api/admin/operations/daily-report', () => {
  it('returns daily aggregates for an authorized territorial manager using ride_settlements for finance', async () => {
    const res = await request(app)
      .get('/api/admin/operations/daily-report?date=2026-06-25&territory_id=territory-a')
      .set('Authorization', `Bearer ${tokenFor('admin-1')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.metrics).toMatchObject({
      requested_rides: 185,
      completed_rides: 45,
      canceled_rides: 25,
      no_driver_or_no_offer_rides: 105,
      emergencies_registered: 4,
      active_emergencies: 2,
      final_revenue_cents: 123456,
      kaviar_fee_cents: 22222,
      driver_earnings_cents: 101234,
      avg_to_offer_seconds: 180,
    });

    expect(prismaMock.rides_v2.aggregate).not.toHaveBeenCalled();
    expect(prismaMock.ride_settlements.aggregate).toHaveBeenCalledWith(expect.objectContaining({
      _sum: { final_price: true, fee_amount: true, driver_earnings: true },
    }));
    expect(prismaMock.ride_settlements.aggregate.mock.calls[0][0].where.ride.is).toMatchObject({
      status: 'completed',
      origin_neighborhood_id: { in: ['neigh-1'] },
    });
  });

  it('returns 403 for a territory outside the manager scope', async () => {
    const res = await request(app)
      .get('/api/admin/operations/daily-report?date=2026-06-25&territory_id=territory-b')
      .set('Authorization', `Bearer ${tokenFor('admin-1')}`);

    expect(res.status).toBe(403);
    expect(prismaMock.ride_settlements.aggregate).not.toHaveBeenCalled();
  });
});
