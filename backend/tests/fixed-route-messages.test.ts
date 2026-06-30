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
      findMany: vi.fn(),
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

const pushMock = vi.hoisted(() => ({
  sendPushToDriver: vi.fn(),
  sendPushToPassenger: vi.fn(),
}));

vi.mock('../src/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('../src/services/push.service', () => pushMock);
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
  prismaMock.driver_fixed_route_reservations.findMany.mockImplementation(async (args: any) => {
    if (args?.select?.passenger_id) {
      return [{ passenger_id: 'passenger-1' }];
    }
    if (args?.select?.id && args?.select?.route_id) {
      return [{ id: 'res-1', route_id: 'route-1', status: 'confirmed' }];
    }
    return [];
  });
  prismaMock.fixed_route_messages.findMany.mockResolvedValue([]);
  prismaMock.fixed_route_messages.create.mockImplementation(async ({ data }: any) => ({
    id: 'msg-1',
    created_at: new Date('2026-06-30T00:00:00.000Z'),
    read_at: null,
    metadata: null,
    ...data,
  }));
  pushMock.sendPushToDriver.mockResolvedValue('sent');
  pushMock.sendPushToPassenger.mockResolvedValue('sent');
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
    expect(pushMock.sendPushToPassenger).toHaveBeenCalledWith(
      'passenger-1',
      'Aviso da sua Rota Fixa',
      'O motorista enviou uma atualização da rota.',
      expect.objectContaining({
        type: 'fixed_route_message',
        routeId: 'route-1',
        messageId: 'msg-1',
      }),
    );
  });

  it('aviso geral notifica apenas reservas confirmed', async () => {
    prismaMock.driver_fixed_route_reservations.findMany.mockResolvedValue([
      { passenger_id: 'passenger-confirmed-1' },
      { passenger_id: 'passenger-confirmed-2' },
    ]);

    const res = await request(app)
      .post('/api/driver/fixed-routes/route-1/messages')
      .send({ message_code: 'AT_MEETING_POINT' });

    expect(res.status).toBe(201);
    expect(prismaMock.driver_fixed_route_reservations.findMany).toHaveBeenCalledWith({
      where: { route_id: 'route-1', status: 'confirmed' },
      select: { passenger_id: true },
    });
    expect(pushMock.sendPushToPassenger).toHaveBeenCalledTimes(2);
    expect(pushMock.sendPushToPassenger).toHaveBeenNthCalledWith(
      1,
      'passenger-confirmed-1',
      'Aviso da sua Rota Fixa',
      'O motorista enviou uma atualização da rota.',
      expect.any(Object),
    );
    expect(pushMock.sendPushToPassenger).toHaveBeenNthCalledWith(
      2,
      'passenger-confirmed-2',
      'Aviso da sua Rota Fixa',
      'O motorista enviou uma atualização da rota.',
      expect.any(Object),
    );
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
    expect(pushMock.sendPushToDriver).toHaveBeenCalledWith(
      'driver-1',
      'Mensagem de passageiro',
      'Um passageiro enviou uma mensagem sobre a Rota Fixa.',
      expect.objectContaining({
        type: 'fixed_route_message',
        routeId: 'route-1',
        reservationId: 'res-1',
        messageId: 'msg-1',
      }),
    );
  });

  it('motorista envia mensagem direta e notifica apenas passageiro da reserva', async () => {
    const res = await request(app)
      .post('/api/driver/fixed-routes/route-1/reservations/res-1/messages')
      .send({ message_code: 'PLEASE_CONFIRM' });

    expect(res.status).toBe(201);
    expect(pushMock.sendPushToPassenger).toHaveBeenCalledTimes(1);
    expect(pushMock.sendPushToPassenger).toHaveBeenCalledWith(
      'passenger-1',
      'Mensagem do motorista',
      'Você recebeu uma mensagem sobre sua Rota Fixa.',
      expect.objectContaining({
        type: 'fixed_route_message',
        routeId: 'route-1',
        reservationId: 'res-1',
        messageId: 'msg-1',
      }),
    );
  });

  it('falha no push nao impede criacao da mensagem', async () => {
    pushMock.sendPushToPassenger.mockRejectedValueOnce(new Error('push down'));

    const res = await request(app)
      .post('/api/driver/fixed-routes/route-1/messages')
      .send({ message_code: 'LEAVING_SOON' });

    expect(res.status).toBe(201);
    expect(prismaMock.fixed_route_messages.create).toHaveBeenCalledTimes(1);
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
    expect(pushMock.sendPushToPassenger).not.toHaveBeenCalled();
  });

  it('rota cancelled bloqueia nova mensagem e nao dispara push', async () => {
    prismaMock.driver_fixed_routes.findFirst.mockResolvedValue({ ...routeOwned, status: 'cancelled' });

    const res = await request(app)
      .post('/api/driver/fixed-routes/route-1/messages')
      .send({ message_code: 'ROUTE_CONFIRMED_TODAY' });

    expect(res.status).toBe(409);
    expect(pushMock.sendPushToPassenger).not.toHaveBeenCalled();
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

  it('payload de notificacao nao contem telefone nem dados sensiveis', async () => {
    await request(app)
      .post('/api/driver/fixed-routes/route-1/reservations/res-1/messages')
      .send({ message_code: 'PLEASE_CONFIRM' });

    const payloadArg = pushMock.sendPushToPassenger.mock.calls[0]?.[3] || {};
    const payloadJson = JSON.stringify(payloadArg);
    expect(payloadJson).toContain('fixed_route_message');
    expect(payloadJson).not.toContain('phone');
    expect(payloadJson).not.toContain('name');
  });

  it('summary inclui aviso geral e mensagem direta do motorista', async () => {
    prismaMock.driver_fixed_route_reservations.findMany.mockImplementation(async (args: any) => {
      if (args?.select?.id && args?.select?.route_id) {
        return [{ id: 'res-1', route_id: 'route-1', status: 'confirmed' }];
      }
      return [{ passenger_id: 'passenger-1' }];
    });

    prismaMock.fixed_route_messages.findMany.mockResolvedValue([
      {
        id: 'msg-direct-latest',
        route_id: 'route-1',
        reservation_id: 'res-1',
        sender_type: 'DRIVER',
        recipient_type: 'PASSENGER',
        created_at: new Date('2026-06-30T10:30:00.000Z'),
      },
      {
        id: 'msg-broadcast-old',
        route_id: 'route-1',
        reservation_id: null,
        sender_type: 'DRIVER',
        recipient_type: 'ROUTE_CONFIRMED_PASSENGERS',
        created_at: new Date('2026-06-30T09:00:00.000Z'),
      },
    ]);

    const res = await request(app).get('/api/passenger/fixed-route-reservations/messages/summary');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toEqual(expect.objectContaining({
      reservation_id: 'res-1',
      route_id: 'route-1',
      last_message_id: 'msg-direct-latest',
      last_sender_type: 'DRIVER',
      has_driver_message: true,
    }));
  });

  it('summary nao inclui mensagens de outras reservas', async () => {
    prismaMock.driver_fixed_route_reservations.findMany.mockImplementation(async (args: any) => {
      if (args?.select?.id && args?.select?.route_id) {
        return [{ id: 'res-1', route_id: 'route-1', status: 'confirmed' }];
      }
      return [{ passenger_id: 'passenger-1' }];
    });

    prismaMock.fixed_route_messages.findMany.mockResolvedValue([
      {
        id: 'msg-other-reservation',
        route_id: 'route-1',
        reservation_id: 'res-other',
        sender_type: 'DRIVER',
        recipient_type: 'PASSENGER',
        created_at: new Date('2026-06-30T11:00:00.000Z'),
      },
      {
        id: 'msg-broadcast',
        route_id: 'route-1',
        reservation_id: null,
        sender_type: 'DRIVER',
        recipient_type: 'ROUTE_CONFIRMED_PASSENGERS',
        created_at: new Date('2026-06-30T10:00:00.000Z'),
      },
    ]);

    const res = await request(app).get('/api/passenger/fixed-route-reservations/messages/summary');

    expect(res.status).toBe(200);
    expect(res.body.data[0]).toEqual(expect.objectContaining({
      reservation_id: 'res-1',
      last_message_id: 'msg-broadcast',
      has_driver_message: true,
    }));
  });

  it('summary nao retorna telefone nem texto completo', async () => {
    prismaMock.driver_fixed_route_reservations.findMany.mockImplementation(async (args: any) => {
      if (args?.select?.id && args?.select?.route_id) {
        return [{ id: 'res-1', route_id: 'route-1', status: 'confirmed' }];
      }
      return [{ passenger_id: 'passenger-1' }];
    });

    prismaMock.fixed_route_messages.findMany.mockResolvedValue([
      {
        id: 'msg-1',
        route_id: 'route-1',
        reservation_id: 'res-1',
        sender_type: 'DRIVER',
        recipient_type: 'PASSENGER',
        message_text: 'Nao deveria aparecer',
        passenger_phone: '21999999999',
        created_at: new Date('2026-06-30T12:00:00.000Z'),
      },
    ]);

    const res = await request(app).get('/api/passenger/fixed-route-reservations/messages/summary');

    expect(res.status).toBe(200);
    const payload = JSON.stringify(res.body);
    expect(payload).not.toContain('phone');
    expect(payload).not.toContain('21999999999');
    expect(payload).not.toContain('Nao deveria aparecer');
  });
});
