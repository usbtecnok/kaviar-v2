import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, authState, auditMock, createEventMock } = vi.hoisted(() => {
  const prismaMock: any = {
    driver_fixed_routes: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    driver_fixed_route_reservations: {
      findMany: vi.fn(),
    },
    driver_fixed_route_events: {
      findMany: vi.fn(),
    },
    operational_territories: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  };

  return {
    prismaMock,
    auditMock: vi.fn(),
    createEventMock: vi.fn(),
    authState: {
      admin: { id: 'admin-1', email: 'admin@test.local', role: 'SUPER_ADMIN' },
      scope: null as any,
    },
  };
});

vi.mock('../src/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('../src/middlewares/auth', () => ({
  authenticateAdmin: (req: any, _res: any, next: any) => {
    req.admin = authState.admin;
    next();
  },
  requireRole: (allowedRoles: string[]) => (req: any, res: any, next: any) => {
    if (!allowedRoles.includes(req.admin.role)) return res.status(403).json({ success: false, error: 'Acesso negado' });
    next();
  },
}));
vi.mock('../src/middlewares/territory-scope', () => ({
  applyTerritoryScope: (req: any, _res: any, next: any) => {
    req.territoryScope = authState.scope;
    next();
  },
}));
vi.mock('../src/utils/audit', () => ({
  audit: auditMock,
  auditCtx: (req: any) => ({
    adminId: req.admin?.id || 'admin-1',
    adminEmail: req.admin?.email || 'admin@test.local',
    ip: '127.0.0.1',
    ua: 'vitest',
  }),
}));
vi.mock('../src/services/fixed-route.service', () => ({
  createFixedRouteEvent: createEventMock,
}));

const { default: adminFixedRoutesRouter } = await import('../src/routes/admin-fixed-routes');

const app = express();
app.use(express.json());
app.use('/api/admin/fixed-routes', adminFixedRoutesRouter);

const baseRoute = {
  id: 'route-1',
  driver_id: 'driver-1',
  territory_id: 'territory-1',
  invite_code: 'KFR-ABCD',
  title: 'Centro x Zona Sul',
  description: 'Teste',
  origin_label: 'Centro',
  destination_label: 'Zona Sul',
  trip_type: 'round_trip',
  departure_time: '07:30',
  return_time: '18:00',
  days_of_week: ['mon', 'tue'],
  seats_total: 4,
  price_per_passenger_cents: 2500,
  kaviar_fee_percent: 15,
  status: 'active',
  created_at: new Date('2026-06-01T10:00:00.000Z'),
  updated_at: new Date('2026-06-01T10:00:00.000Z'),
  paused_at: null,
  cancelled_at: null,
  driver: { id: 'driver-1', name: 'Motorista 1', phone: '21987654321' },
};

beforeEach(() => {
  vi.clearAllMocks();
  authState.admin = { id: 'admin-1', email: 'admin@test.local', role: 'SUPER_ADMIN' };
  authState.scope = null;

  prismaMock.driver_fixed_routes.count.mockResolvedValue(1);
  prismaMock.driver_fixed_routes.findMany.mockResolvedValue([baseRoute]);
  prismaMock.driver_fixed_routes.findUnique.mockResolvedValue(baseRoute);
  prismaMock.driver_fixed_route_reservations.findMany.mockResolvedValue([]);
  prismaMock.driver_fixed_route_events.findMany.mockResolvedValue([]);
  prismaMock.operational_territories.findMany.mockResolvedValue([{ id: 'territory-1', name: 'RJ Centro' }]);
  prismaMock.operational_territories.findUnique.mockResolvedValue({ id: 'territory-1', name: 'RJ Centro' });
  prismaMock.driver_fixed_routes.update.mockImplementation(async ({ data }: any) => ({ ...baseRoute, ...data }));
  auditMock.mockResolvedValue(undefined);
  createEventMock.mockResolvedValue(undefined);
});

describe('admin fixed routes', () => {
  it('lista com paginação e filtros válidos', async () => {
    const res = await request(app).get('/api/admin/fixed-routes?status=active&trip_type=round_trip&limit=10&offset=0&search=centro');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination.total).toBe(1);
    expect(prismaMock.driver_fixed_routes.findMany).toHaveBeenCalled();
    expect(res.body.data[0].driver_phone).toBe('21******21');
  });

  it('rejeita filtro de status inválido', async () => {
    const res = await request(app).get('/api/admin/fixed-routes?status=invalid');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Status inválido/);
  });

  it('rejeita filtro de trip_type inválido', async () => {
    const res = await request(app).get('/api/admin/fixed-routes?trip_type=foo');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Tipo de rota inválido/);
  });

  it('manager territorial sem scope recebe lista vazia', async () => {
    authState.admin = { id: 'mgr-1', email: 'mgr@test.local', role: 'TERRITORIAL_MANAGER' };
    authState.scope = { territoryIds: [], neighborhoodIds: [], accessLevel: 'read' };

    const res = await request(app).get('/api/admin/fixed-routes');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.pagination.total).toBe(0);
    expect(prismaMock.driver_fixed_routes.findMany).not.toHaveBeenCalled();
  });

  it('manager territorial não enxerga detalhe fora do scope', async () => {
    authState.admin = { id: 'mgr-1', email: 'mgr@test.local', role: 'TERRITORIAL_MANAGER' };
    authState.scope = { territoryIds: ['territory-allowed'], neighborhoodIds: [], accessLevel: 'read' };
    prismaMock.driver_fixed_routes.findUnique.mockResolvedValue({ ...baseRoute, territory_id: 'territory-outside' });

    const res = await request(app).get('/api/admin/fixed-routes/route-1');

    expect(res.status).toBe(404);
  });

  it('manager territorial não enxerga rota sem territory_id', async () => {
    authState.admin = { id: 'mgr-1', email: 'mgr@test.local', role: 'TERRITORIAL_MANAGER' };
    authState.scope = { territoryIds: ['territory-1'], neighborhoodIds: [], accessLevel: 'read' };
    prismaMock.driver_fixed_routes.findUnique.mockResolvedValue({ ...baseRoute, territory_id: null });

    const res = await request(app).get('/api/admin/fixed-routes/route-1');

    expect(res.status).toBe(404);
  });

  it('super admin pode ver detalhe sem territory_id', async () => {
    prismaMock.driver_fixed_routes.findUnique.mockResolvedValue({ ...baseRoute, territory_id: null });

    const res = await request(app).get('/api/admin/fixed-routes/route-1');

    expect(res.status).toBe(200);
    expect(res.body.data.route.territory_id).toBeNull();
  });

  it('lista reservas com telefone mascarado', async () => {
    prismaMock.driver_fixed_route_reservations.findMany.mockResolvedValue([
      {
        id: 'res-1',
        status: 'confirmed',
        seats_reserved: 2,
        price_cents: 5000,
        kaviar_fee_cents: 750,
        driver_net_cents: 4250,
        created_at: new Date('2026-06-01T10:00:00.000Z'),
        updated_at: new Date('2026-06-01T10:00:00.000Z'),
        passenger: { id: 'p1', name: 'Passageiro 1', phone: '21999991234' },
      },
    ]);

    const res = await request(app).get('/api/admin/fixed-routes/route-1/reservations');

    expect(res.status).toBe(200);
    expect(res.body.data[0].passenger_phone).toBe('21******34');
  });

  it('somente super admin pode pausar', async () => {
    authState.admin = { id: 'mgr-1', email: 'mgr@test.local', role: 'TERRITORIAL_MANAGER' };

    const res = await request(app).patch('/api/admin/fixed-routes/route-1/pause').send({});

    expect(res.status).toBe(403);
    expect(prismaMock.driver_fixed_routes.update).not.toHaveBeenCalled();
  });

  it('pausa rota ativa e audita', async () => {
    prismaMock.driver_fixed_routes.findUnique.mockResolvedValue({ ...baseRoute, status: 'active' });

    const res = await request(app).patch('/api/admin/fixed-routes/route-1/pause').send({});

    expect(res.status).toBe(200);
    expect(prismaMock.driver_fixed_routes.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'route-1' },
      data: expect.objectContaining({ status: 'paused' }),
    }));
    expect(createEventMock).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: 'route_paused_by_admin' }));
    expect(auditMock).toHaveBeenCalledWith(expect.objectContaining({ action: 'fixed_route_admin_pause' }));
  });

  it('não pausa rota não ativa', async () => {
    prismaMock.driver_fixed_routes.findUnique.mockResolvedValue({ ...baseRoute, status: 'paused' });

    const res = await request(app).patch('/api/admin/fixed-routes/route-1/pause').send({});

    expect(res.status).toBe(409);
  });

  it('reativa rota pausada', async () => {
    prismaMock.driver_fixed_routes.findUnique.mockResolvedValue({ ...baseRoute, status: 'paused' });

    const res = await request(app).patch('/api/admin/fixed-routes/route-1/reactivate').send({});

    expect(res.status).toBe(200);
    expect(prismaMock.driver_fixed_routes.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'active', paused_at: null, cancelled_at: null }),
    }));
    expect(auditMock).toHaveBeenCalledWith(expect.objectContaining({ action: 'fixed_route_admin_reactivate' }));
  });

  it('bloqueia reativação de rota arquivada', async () => {
    prismaMock.driver_fixed_routes.findUnique.mockResolvedValue({ ...baseRoute, status: 'archived' });

    const res = await request(app).patch('/api/admin/fixed-routes/route-1/reactivate').send({});

    expect(res.status).toBe(409);
  });

  it('arquiva rota pausada', async () => {
    prismaMock.driver_fixed_routes.findUnique.mockResolvedValue({ ...baseRoute, status: 'paused' });

    const res = await request(app).patch('/api/admin/fixed-routes/route-1/archive').send({});

    expect(res.status).toBe(200);
    expect(prismaMock.driver_fixed_routes.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'archived' }),
    }));
    expect(auditMock).toHaveBeenCalledWith(expect.objectContaining({ action: 'fixed_route_admin_archive' }));
  });

  it('bloqueia arquivamento de rota ativa', async () => {
    prismaMock.driver_fixed_routes.findUnique.mockResolvedValue({ ...baseRoute, status: 'active' });

    const res = await request(app).patch('/api/admin/fixed-routes/route-1/archive').send({});

    expect(res.status).toBe(409);
  });
});
