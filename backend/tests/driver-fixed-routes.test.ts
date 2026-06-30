import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, authState } = vi.hoisted(() => {
  const state = {
    routes: [] as any[],
    reservations: [] as any[],
    events: [] as any[],
    drivers: {
      driver1: { id: 'driver1', name: 'Ana Driver', status: 'approved', vehicle_type: 'CAR', password_changed_at: null },
      driver2: { id: 'driver2', name: 'Bia Driver', status: 'approved', vehicle_type: 'CAR', password_changed_at: null },
      pending: { id: 'pending', name: 'Pendente', status: 'pending', vehicle_type: 'CAR', password_changed_at: null },
      moto: { id: 'moto', name: 'Moto', status: 'approved', vehicle_type: 'MOTO', password_changed_at: null },
    } as Record<string, any>,
    passengers: {
      pass1: { id: 'pass1', name: 'Paulo Passageiro', status: 'approved', password_changed_at: null },
      pass2: { id: 'pass2', name: 'Maria Passageira', status: 'approved', password_changed_at: null },
    } as Record<string, any>,
  };

  const includeDriver = (route: any) => ({ ...route, driver: state.drivers[route.driver_id] ? { id: route.driver_id, name: state.drivers[route.driver_id].name } : null });
  const matchWhere = (item: any, where: any) => Object.entries(where || {}).every(([key, value]: any) => {
    if (value && typeof value === 'object' && 'in' in value) return value.in.includes(item[key]);
    if (value && typeof value === 'object' && 'not' in value) return item[key] !== value.not;
    return item[key] === value;
  });
  const aggregateSeats = (where: any) => state.reservations
    .filter((reservation) => matchWhere(reservation, where))
    .reduce((sum, reservation) => sum + Number(reservation.seats_reserved || 0), 0);

  const prismaMock: any = {
    drivers: { findUnique: vi.fn(({ where }: any) => Promise.resolve(state.drivers[where.id] || null)) },
    passengers: { findUnique: vi.fn(({ where }: any) => Promise.resolve(state.passengers[where.id] || null)) },
    driver_fixed_routes: {
      findUnique: vi.fn(({ where, include }: any) => {
        const route = state.routes.find((item) => item.id === where.id || item.invite_code === where.invite_code) || null;
        return Promise.resolve(route && include?.driver ? includeDriver(route) : route);
      }),
      findFirst: vi.fn(({ where }: any) => Promise.resolve(state.routes.find((route) => matchWhere(route, where)) || null)),
      findMany: vi.fn(({ where }: any = {}) => Promise.resolve(state.routes.filter((route) => matchWhere(route, where || {})).sort((a, b) => b.created_at.getTime() - a.created_at.getTime()))),
      create: vi.fn(({ data }: any) => {
        const route = { id: `route${state.routes.length + 1}`, created_at: new Date(), updated_at: new Date(), ...data };
        state.routes.push(route);
        return Promise.resolve(route);
      }),
      update: vi.fn(({ where, data }: any) => {
        const route = state.routes.find((item) => item.id === where.id);
        Object.assign(route, data, { updated_at: new Date() });
        return Promise.resolve(route);
      }),
    },
    driver_fixed_route_reservations: {
      findFirst: vi.fn(({ where }: any) => Promise.resolve(state.reservations.find((reservation) => matchWhere(reservation, where)) || null)),
      findMany: vi.fn(({ where, include }: any = {}) => Promise.resolve(state.reservations.filter((reservation) => matchWhere(reservation, where || {})).map((reservation) => include?.passenger ? { ...reservation, passenger: state.passengers[reservation.passenger_id] } : include?.route ? { ...reservation, route: includeDriver(state.routes.find((route) => route.id === reservation.route_id)) } : reservation))),
      create: vi.fn(({ data }: any) => {
        const reservation = { id: `reservation${state.reservations.length + 1}`, created_at: new Date(), updated_at: new Date(), reserved_at: new Date(), ...data };
        state.reservations.push(reservation);
        return Promise.resolve(reservation);
      }),
      update: vi.fn(({ where, data }: any) => {
        const reservation = state.reservations.find((item) => item.id === where.id);
        Object.assign(reservation, data, { updated_at: new Date() });
        return Promise.resolve(reservation);
      }),
      aggregate: vi.fn(({ where }: any) => Promise.resolve({ _sum: { seats_reserved: aggregateSeats(where) } })),
    },
    driver_fixed_route_events: {
      create: vi.fn(({ data }: any) => {
        const event = { id: `event${state.events.length + 1}`, created_at: new Date(), ...data };
        state.events.push(event);
        return Promise.resolve(event);
      }),
    },
    $queryRawUnsafe: vi.fn(() => Promise.resolve([])),
    $transaction: vi.fn((fn: any) => fn(prismaMock)),
  };
  return { prismaMock, authState: { userType: 'DRIVER', userId: 'driver1', state } };
});

vi.mock('../src/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('../src/middlewares/auth', () => ({
  authenticateDriver: async (req: any, res: any, next: any) => {
    if (authState.userType !== 'DRIVER') return res.status(403).json({ success: false, error: 'Acesso negado' });
    const driver = authState.state.drivers[authState.userId];
    if (!driver) return res.status(401).json({ success: false, error: 'Token inválido' });
    req.driver = driver;
    req.driverId = driver.id;
    req.userId = driver.id;
    next();
  },
  authenticatePassenger: async (req: any, res: any, next: any) => {
    if (authState.userType !== 'PASSENGER') return res.status(403).json({ success: false, error: 'Acesso negado' });
    const passenger = authState.state.passengers[authState.userId];
    if (!passenger) return res.status(401).json({ success: false, error: 'Token inválido' });
    req.passenger = passenger;
    req.passengerId = passenger.id;
    req.userId = passenger.id;
    next();
  },
}));

const { default: driverFixedRoutes } = await import('../src/routes/driver-fixed-routes');
const { default: fixedRouteInvites } = await import('../src/routes/fixed-route-invites');
const { default: passengerReservations } = await import('../src/routes/passenger-fixed-route-reservations');

const app = express();
app.use(express.json());
app.use('/api/driver/fixed-routes', driverFixedRoutes);
app.use('/api/fixed-routes', fixedRouteInvites);
app.use('/api/passenger/fixed-route-reservations', passengerReservations);

const validRoute = {
  title: 'Barra para Centro',
  trip_type: 'round_trip',
  origin_label: 'Barra da Tijuca',
  destination_label: 'Centro',
  departure_time: '08:00',
  return_time: '18:00',
  days_of_week: [1, 2, 3, 4, 5],
  seats_total: 2,
  price_per_passenger_cents: 2500,
  description: 'Viagem programada em horário combinado.',
};

async function createRoute(driver = 'driver1', overrides: any = {}) {
  authState.userType = 'DRIVER';
  authState.userId = driver;
  return request(app).post('/api/driver/fixed-routes').send({ ...validRoute, ...overrides });
}

async function reserve(code: string, passenger = 'pass1') {
  authState.userType = 'PASSENGER';
  authState.userId = passenger;
  return request(app).post(`/api/fixed-routes/invites/${encodeURIComponent(code)}/reserve`).send({ seats_reserved: 1 });
}

describe('driver fixed routes backend MVP', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.userType = 'DRIVER';
    authState.userId = 'driver1';
    authState.state.routes = [];
    authState.state.reservations = [];
    authState.state.events = [];
    process.env.FIXED_ROUTE_KAVIAR_FEE_PERCENT = '10';
  });

  it('motorista aprovado cria rota fixa', async () => {
    const res = await createRoute();
    expect(res.status).toBe(201);
    expect(res.body.data.invite_code).toMatch(/^KFR-/);
    expect(res.body.data.kaviar_fee_percent).toBe(10);
  });

  it('motorista nao aprovado nao cria', async () => {
    const res = await createRoute('pending');
    expect(res.status).toBe(403);
  });

  it('motorista de moto nao cria no MVP', async () => {
    const res = await createRoute('moto');
    expect(res.status).toBe(403);
  });

  it('lista so rotas do proprio motorista (archived oculto)', async () => {
    await createRoute('driver1', { title: 'Minha rota' });
    await createRoute('driver2', { title: 'Outra rota' });
    authState.userType = 'DRIVER';
    authState.userId = 'driver1';
    const res = await request(app).get('/api/driver/fixed-routes');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe('Minha rota');
  });

  it('cria rota so ida sem return_time', async () => {
    const res = await createRoute('driver1', { trip_type: 'one_way_outbound', departure_time: '07:30', return_time: undefined });
    expect(res.status).toBe(201);
    expect(res.body.data.trip_type).toBe('one_way_outbound');
    expect(res.body.data.departure_time).toBe('07:30');
    expect(res.body.data.return_time).toBeNull();
  });

  it('cria rota so volta sem departure_time', async () => {
    const res = await createRoute('driver1', { trip_type: 'one_way_return', departure_time: undefined, return_time: '18:00' });
    expect(res.status).toBe(201);
    expect(res.body.data.trip_type).toBe('one_way_return');
    expect(res.body.data.return_time).toBe('18:00');
    expect(res.body.data.departure_time).toBeNull();
  });

  it('cria ida e volta com os dois horarios', async () => {
    const res = await createRoute('driver1', { trip_type: 'round_trip', departure_time: '08:00', return_time: '18:00' });
    expect(res.status).toBe(201);
    expect(res.body.data.trip_type).toBe('round_trip');
    expect(res.body.data.departure_time).toBe('08:00');
    expect(res.body.data.return_time).toBe('18:00');
  });

  it('bloqueia round_trip sem horario de ida', async () => {
    const res = await createRoute('driver1', { trip_type: 'round_trip', departure_time: undefined, return_time: '18:00' });
    expect(res.status).toBe(400);
  });

  it('bloqueia round_trip sem horario de volta', async () => {
    const res = await createRoute('driver1', { trip_type: 'round_trip', departure_time: '08:00', return_time: undefined });
    expect(res.status).toBe(400);
  });

  it('bloqueia one_way_outbound sem departure_time', async () => {
    const res = await createRoute('driver1', { trip_type: 'one_way_outbound', departure_time: undefined, return_time: undefined });
    expect(res.status).toBe(400);
  });

  it('bloqueia one_way_return sem return_time', async () => {
    const res = await createRoute('driver1', { trip_type: 'one_way_return', departure_time: undefined, return_time: undefined });
    expect(res.status).toBe(400);
  });

  it('preview publico por KFR retorna dados seguros com trip_type', async () => {
    const created = await createRoute();
    const res = await request(app).get(`/api/fixed-routes/invites/${created.body.data.invite_code}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ origin_label: 'Barra da Tijuca', destination_label: 'Centro', seats_available: 2 });
    expect(res.body.data).toHaveProperty('trip_type');
    expect(JSON.stringify(res.body.data)).not.toContain('phone');
  });

  it('passageiro reserva vaga e calcula taxa KAVIAR 10%', async () => {
    const created = await createRoute();
    const res = await reserve(created.body.data.invite_code);
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('confirmed');
    expect(res.body.data.price_cents).toBe(2500);
    expect(res.body.data.kaviar_fee_cents).toBe(250);
    expect(res.body.data.driver_net_cents).toBe(2250);
  });

  it('reserva nao ultrapassa vagas', async () => {
    const created = await createRoute('driver1', { seats_total: 1 });
    expect((await reserve(created.body.data.invite_code, 'pass1')).status).toBe(201);
    const second = await reserve(created.body.data.invite_code, 'pass2');
    expect(second.status).toBe(409);
  });

  it('reserva duplicada do mesmo passageiro e idempotente', async () => {
    const created = await createRoute();
    expect((await reserve(created.body.data.invite_code, 'pass1')).status).toBe(201);
    const duplicate = await reserve(created.body.data.invite_code, 'pass1');
    expect(duplicate.status).toBe(200);
    expect(duplicate.body.idempotent).toBe(true);
  });

  it('passageiro cancela propria reserva', async () => {
    const created = await createRoute();
    const reserved = await reserve(created.body.data.invite_code, 'pass1');
    authState.userType = 'PASSENGER';
    authState.userId = 'pass1';
    const res = await request(app).patch(`/api/passenger/fixed-route-reservations/${reserved.body.data.id}/cancel`).send({ cancel_reason: 'Mudanca de plano' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('cancelled_by_passenger');
  });

  it('passageiro nao cancela reserva de outro', async () => {
    const created = await createRoute();
    const reserved = await reserve(created.body.data.invite_code, 'pass1');
    authState.userType = 'PASSENGER';
    authState.userId = 'pass2';
    const res = await request(app).patch(`/api/passenger/fixed-route-reservations/${reserved.body.data.id}/cancel`).send({});
    expect(res.status).toBe(404);
  });

  it('motorista lista reservas da propria rota', async () => {
    const created = await createRoute();
    await reserve(created.body.data.invite_code, 'pass1');
    authState.userType = 'DRIVER';
    authState.userId = 'driver1';
    const res = await request(app).get(`/api/driver/fixed-routes/${created.body.data.id}/reservations`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('motorista nao acessa rota de outro motorista', async () => {
    const created = await createRoute('driver2');
    authState.userType = 'DRIVER';
    authState.userId = 'driver1';
    const res = await request(app).get(`/api/driver/fixed-routes/${created.body.data.id}`);
    expect(res.status).toBe(404);
  });

  it('rota pausada nao aceita reserva', async () => {
    const created = await createRoute();
    authState.userType = 'DRIVER';
    authState.userId = 'driver1';
    await request(app).patch(`/api/driver/fixed-routes/${created.body.data.id}/pause`).send({});
    const res = await reserve(created.body.data.invite_code, 'pass1');
    expect(res.status).toBe(410);
  });

  it('reativa rota cancelada', async () => {
    const created = await createRoute();
    authState.userType = 'DRIVER';
    authState.userId = 'driver1';
    await request(app).patch(`/api/driver/fixed-routes/${created.body.data.id}/cancel`).send({});
    const res = await request(app).patch(`/api/driver/fixed-routes/${created.body.data.id}/reactivate`).send({});
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('active');
  });

  it('reativa rota pausada', async () => {
    const created = await createRoute();
    authState.userType = 'DRIVER';
    authState.userId = 'driver1';
    await request(app).patch(`/api/driver/fixed-routes/${created.body.data.id}/pause`).send({});
    const res = await request(app).patch(`/api/driver/fixed-routes/${created.body.data.id}/reactivate`).send({});
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('active');
  });

  it('arquiva rota cancelada', async () => {
    const created = await createRoute();
    authState.userType = 'DRIVER';
    authState.userId = 'driver1';
    await request(app).patch(`/api/driver/fixed-routes/${created.body.data.id}/cancel`).send({});
    const res = await request(app).patch(`/api/driver/fixed-routes/${created.body.data.id}/archive`).send({});
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('archived');
  });

  it('rota archived nao aparece na lista normal', async () => {
    const created = await createRoute('driver1', { title: 'Vai arquivar' });
    authState.userType = 'DRIVER';
    authState.userId = 'driver1';
    await request(app).patch(`/api/driver/fixed-routes/${created.body.data.id}/cancel`).send({});
    await request(app).patch(`/api/driver/fixed-routes/${created.body.data.id}/archive`).send({});
    const list = await request(app).get('/api/driver/fixed-routes');
    expect(list.status).toBe(200);
    expect(list.body.data.find((r: any) => r.id === created.body.data.id)).toBeUndefined();
  });

  it('rota archived nao aceita reserva - preview retorna 410', async () => {
    const created = await createRoute();
    authState.userType = 'DRIVER';
    authState.userId = 'driver1';
    await request(app).patch(`/api/driver/fixed-routes/${created.body.data.id}/cancel`).send({});
    await request(app).patch(`/api/driver/fixed-routes/${created.body.data.id}/archive`).send({});
    const res = await request(app).get(`/api/fixed-routes/invites/${created.body.data.invite_code}`);
    expect(res.status).toBe(410);
    expect(JSON.stringify(res.body)).not.toContain('phone');
  });

  it('nao permite arquivar rota ativa diretamente', async () => {
    const created = await createRoute();
    authState.userType = 'DRIVER';
    authState.userId = 'driver1';
    const res = await request(app).patch(`/api/driver/fixed-routes/${created.body.data.id}/archive`).send({});
    expect(res.status).toBe(409);
  });

  it('archived nao pode ser reativada no MVP', async () => {
    const created = await createRoute();
    authState.userType = 'DRIVER';
    authState.userId = 'driver1';
    await request(app).patch(`/api/driver/fixed-routes/${created.body.data.id}/cancel`).send({});
    await request(app).patch(`/api/driver/fixed-routes/${created.body.data.id}/archive`).send({});
    const res = await request(app).patch(`/api/driver/fixed-routes/${created.body.data.id}/reactivate`).send({});
    expect(res.status).toBe(409);
  });

  it('codigo KFR aceita normalizacao com espacos e lowercase', async () => {
    const created = await createRoute();
    const spaced = created.body.data.invite_code.toLowerCase().replace('KFR-', ' kfr- ');
    const res = await request(app).get(`/api/fixed-routes/invites/${encodeURIComponent(spaced)}`);
    expect(res.status).toBe(200);
    expect(res.body.data.code).toBe(created.body.data.invite_code);
  });

  it('motorista altera status de reserva da propria rota', async () => {
    const created = await createRoute();
    const reserved = await reserve(created.body.data.invite_code, 'pass1');
    authState.userType = 'DRIVER';
    authState.userId = 'driver1';
    const res = await request(app).patch(`/api/driver/fixed-routes/${created.body.data.id}/reservations/${reserved.body.data.id}/status`).send({ status: 'no_show' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('no_show');
  });
});
