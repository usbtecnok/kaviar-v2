import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, authState } = vi.hoisted(() => {
  const prismaMock: any = {
    driver_fixed_routes: {
      findFirst: vi.fn(),
    },
    driver_fixed_route_reservations: {
      findFirst: vi.fn(),
    },
    fixed_route_messages: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  };

  return {
    prismaMock,
    authState: {
      driver: { id: 'driver-1' },
      passenger: { id: 'passenger-1' },
    },
  };
});

vi.mock('../src/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('../src/middlewares/auth', () => ({
  authenticateDriver: (req: any, _res: any, next: any) => {
    req.driver = authState.driver;
    req.driverId = authState.driver.id;
    req.userId = authState.driver.id;
    next();
  },
  authenticatePassenger: (req: any, _res: any, next: any) => {
    req.passenger = authState.passenger;
    req.passengerId = authState.passenger.id;
    req.userId = authState.passenger.id;
    next();
  },
}));

const { driverFixedRouteMessagesRoutes, passengerFixedRouteMessagesRoutes } = await import('../src/routes/fixed-route-messages');

const app = express();
app.use(express.json());
app.use('/api/driver/fixed-routes', driverFixedRouteMessagesRoutes);
app.use('/api/passenger/fixed-route-reservations', passengerFixedRouteMessagesRoutes);

const routeOwned = {
  id: 'route-1',
  driver_id: 'driver-1',
  status: 'active',
};

const reservationOwned = {
  id: 'res-1',
  route_id: 'route-1',
  passenger_id: 'passenger-1',
  status: 'confirmed',
  route: {
    id: 'route-1',
    driver_id: 'driver-1',
    status: 'active',
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  authState.driver = { id: 'driver-1' };
  authState.passenger = { id: 'passenger-1' };

  prismaMock.driver_fixed_routes.findFirst.mockResolvedValue(routeOwned);
  prismaMock.driver_fixed_route_reservations.findFirst.mockResolvedValue(reservationOwned);
  prismaMock.fixed_route_messages.findMany.mockResolvedValue([]);
  prismaMock.fixed_route_messages.create.mockImplementation(async ({ data }: any) => ({
    id: 'msg-1',
    created_at: new Date('2026-06-30T00:00:00.000Z'),
    read_at: null,
    metadata: null,
    ...data,
  }));
});

describe('fixed route messages', () => {
  it('motorista dono da rota envia aviso', async () => {
    const res = await request(app)
      .post('/api/driver/fixed-routes/route-1/messages')
      .send({ message_code: 'LEAVING_SOON', message_text: 'Saio do ponto em breve.' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(prismaMock.fixed_route_messages.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        route_id: 'route-1',
        sender_type: 'DRIVER',
        sender_driver_id: 'driver-1',
        recipient_type: 'ROUTE_CONFIRMED_PASSENGERS',
      }),
    }));
  });

  it('motorista nao dono nao envia nem le', async () => {
    prismaMock.driver_fixed_routes.findFirst.mockResolvedValue(null);

    const readRes = await request(app).get('/api/driver/fixed-routes/route-1/messages');
    const writeRes = await request(app)
      .post('/api/driver/fixed-routes/route-1/messages')
      .send({ message_code: 'LEAVING_SOON' });

    expect(readRes.status).toBe(404);
    expect(writeRes.status).toBe(404);
  });

  it('passageiro com reserva le avisos da rota', async () => {
    prismaMock.fixed_route_messages.findMany.mockResolvedValue([
      {
        id: 'msg-route',
        route_id: 'route-1',
        reservation_id: null,
        sender_type: 'DRIVER',
        recipient_type: 'ROUTE_CONFIRMED_PASSENGERS',
        message_code: 'AT_MEETING_POINT',
        message_text: 'Estou no ponto combinado.',
        created_at: new Date('2026-06-30T00:00:00.000Z'),
        read_at: null,
        metadata: null,
      },
    ]);

    const res = await request(app).get('/api/passenger/fixed-route-reservations/res-1/messages');

    expect(res.status).toBe(200);
    expect(res.body.data.messages.length).toBe(1);
    expect(res.body.data.messages[0].message_code).toBe('AT_MEETING_POINT');
  });

  it('passageiro sem reserva nao le', async () => {
    prismaMock.driver_fixed_route_reservations.findFirst.mockResolvedValue(null);

    const res = await request(app).get('/api/passenger/fixed-route-reservations/res-1/messages');

    expect(res.status).toBe(404);
  });

  it('passageiro envia mensagem ao motorista da sua reserva', async () => {
    const res = await request(app)
      .post('/api/passenger/fixed-route-reservations/res-1/messages')
      .send({ message_code: 'ARRIVING_POINT' });

    expect(res.status).toBe(201);
    expect(prismaMock.fixed_route_messages.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        route_id: 'route-1',
        reservation_id: 'res-1',
        sender_type: 'PASSENGER',
        sender_passenger_id: 'passenger-1',
        recipient_type: 'DRIVER',
        recipient_driver_id: 'driver-1',
      }),
    }));
  });

  it('passageiro nao envia em reserva de outro passageiro', async () => {
    prismaMock.driver_fixed_route_reservations.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/passenger/fixed-route-reservations/res-other/messages')
      .send({ message_code: 'PASSENGER_CONFIRMED' });

    expect(res.status).toBe(404);
  });

  it('bloqueia texto maior que 500 caracteres', async () => {
    const longText = 'a'.repeat(501);

    const res = await request(app)
      .post('/api/driver/fixed-routes/route-1/messages')
      .send({ message_text: longText });

    expect(res.status).toBe(400);
  });

  it('rota archived bloqueia nova mensagem', async () => {
    prismaMock.driver_fixed_routes.findFirst.mockResolvedValue({ ...routeOwned, status: 'archived' });

    const res = await request(app)
      .post('/api/driver/fixed-routes/route-1/messages')
      .send({ message_code: 'ROUTE_CONFIRMED_TODAY' });

    expect(res.status).toBe(409);
  });

  it('nao retorna telefone completo nem dados sensiveis', async () => {
    prismaMock.fixed_route_messages.findMany.mockResolvedValue([
      {
        id: 'msg-1',
        route_id: 'route-1',
        reservation_id: 'res-1',
        sender_type: 'PASSENGER',
        recipient_type: 'DRIVER',
        message_code: 'ARRIVING_POINT',
        message_text: 'Estou chegando ao ponto combinado.',
        created_at: new Date('2026-06-30T00:00:00.000Z'),
        read_at: null,
        metadata: { any: 'value' },
        sender_passenger_phone: '21999999999',
      },
    ]);

    const res = await request(app).get('/api/driver/fixed-routes/route-1/reservations/res-1/messages');

    expect(res.status).toBe(200);
    const payload = JSON.stringify(res.body);
    expect(payload).not.toContain('phone');
    expect(payload).not.toContain('21999999999');
  });
});
