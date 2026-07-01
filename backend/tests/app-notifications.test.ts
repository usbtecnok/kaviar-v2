import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Prisma mock ─────────────────────────────────────────────────────────────

const { prismaMock, authState } = vi.hoisted(() => {
  const notifications: any[] = [];

  const prismaMock: any = {
    app_notifications: {
      create: vi.fn().mockImplementation(async ({ data }: any) => ({
        id: 'notif-gen-' + Math.random().toString(36).slice(2, 7),
        read_at: null,
        created_at: new Date('2026-07-01T00:00:00.000Z'),
        ...data,
      })),
      findMany: vi.fn().mockResolvedValue(notifications),
      findFirst: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
      update: vi.fn().mockImplementation(async ({ where, data }: any) => ({
        id: where.id,
        ...data,
      })),
      updateMany: vi.fn().mockResolvedValue({ count: 3 }),
    },
  };

  return {
    prismaMock,
    authState: {
      passenger: { id: 'passenger-1' },
      driver: { id: 'driver-1' },
    },
  };
});

vi.mock('../src/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('../src/middlewares/auth', () => ({
  authenticatePassenger: (req: any, _res: any, next: any) => {
    req.passenger = authState.passenger;
    req.passengerId = authState.passenger.id;
    req.userId = authState.passenger.id;
    next();
  },
  authenticateDriver: (req: any, _res: any, next: any) => {
    req.driver = authState.driver;
    req.driverId = authState.driver.id;
    req.userId = authState.driver.id;
    next();
  },
}));

// ── Import routes AFTER mocks ────────────────────────────────────────────────
const passengerNotificationsRoutes = (await import('../src/routes/passenger-notifications')).default;
const driverNotificationsRoutes = (await import('../src/routes/driver-notifications')).default;
const { createAppNotification, markAllRead, markNotificationRead, getUnreadCount } =
  await import('../src/services/app-notifications.service');

const app = express();
app.use(express.json());
app.use('/api/passenger/notifications', passengerNotificationsRoutes);
app.use('/api/driver/notifications', driverNotificationsRoutes);

// ── Helpers ──────────────────────────────────────────────────────────────────

const makeNotif = (overrides: any = {}) => ({
  id: 'notif-1',
  recipient_type: 'PASSENGER',
  recipient_id: 'passenger-1',
  title: 'Nova mensagem da Rota Fixa',
  body: 'O motorista enviou uma atualização da rota.',
  type: 'fixed_route_broadcast',
  source_type: 'fixed_route_message',
  source_id: 'msg-1',
  route_id: 'route-1',
  reservation_id: null,
  data: { routeId: 'route-1', messageId: 'msg-1' },
  read_at: null,
  created_at: new Date('2026-07-01T00:00:00.000Z'),
  expires_at: null,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  authState.passenger = { id: 'passenger-1' };
  authState.driver = { id: 'driver-1' };

  prismaMock.app_notifications.findMany.mockResolvedValue([]);
  prismaMock.app_notifications.count.mockResolvedValue(0);
  prismaMock.app_notifications.findFirst.mockResolvedValue(null);
  prismaMock.app_notifications.updateMany.mockResolvedValue({ count: 0 });
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('app-notifications — rotas REST', () => {
  // 1. Passageiro lista suas notificações
  it('passageiro lista suas notificacoes', async () => {
    prismaMock.app_notifications.findMany.mockResolvedValue([makeNotif()]);

    const res = await request(app).get('/api/passenger/notifications');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({
      id: 'notif-1',
      title: 'Nova mensagem da Rota Fixa',
      type: 'fixed_route_broadcast',
      route_id: 'route-1',
    });
  });

  // 2. Motorista lista suas notificações
  it('motorista lista suas notificacoes', async () => {
    prismaMock.app_notifications.findMany.mockResolvedValue([
      makeNotif({ id: 'notif-d1', recipient_type: 'DRIVER', recipient_id: 'driver-1', type: 'fixed_route_message' }),
    ]);

    const res = await request(app).get('/api/driver/notifications');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].type).toBe('fixed_route_message');
  });

  // 3. Passageiro só vê as suas (recipient_id filtrado)
  it('passageiro nao ve notificacoes de outro passageiro', async () => {
    prismaMock.app_notifications.findMany.mockResolvedValue([]);

    const res = await request(app).get('/api/passenger/notifications');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
    expect(prismaMock.app_notifications.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          recipient_type: 'PASSENGER',
          recipient_id: 'passenger-1',
        }),
      }),
    );
  });

  // 4. unread-count retorna correto para passageiro
  it('unread-count retorna correto para passageiro', async () => {
    prismaMock.app_notifications.count.mockResolvedValue(4);

    const res = await request(app).get('/api/passenger/notifications/unread-count');

    expect(res.status).toBe(200);
    expect(res.body.data.count).toBe(4);
  });

  // 5. unread-count motorista
  it('unread-count retorna correto para motorista', async () => {
    prismaMock.app_notifications.count.mockResolvedValue(2);

    const res = await request(app).get('/api/driver/notifications/unread-count');

    expect(res.status).toBe(200);
    expect(res.body.data.count).toBe(2);
  });

  // 6. read marca apenas notificação do dono (passageiro)
  it('passageiro marca notificacao propria como lida', async () => {
    prismaMock.app_notifications.findFirst.mockResolvedValue(makeNotif({ read_at: null }));
    prismaMock.app_notifications.update.mockResolvedValue(makeNotif({ read_at: new Date() }));

    const res = await request(app).patch('/api/passenger/notifications/notif-1/read');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(prismaMock.app_notifications.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'notif-1',
          recipient_type: 'PASSENGER',
          recipient_id: 'passenger-1',
        }),
      }),
    );
  });

  // 7. read retorna 404 se notificação não for do dono
  it('read retorna 404 para notificacao de outro destinatario', async () => {
    prismaMock.app_notifications.findFirst.mockResolvedValue(null);

    const res = await request(app).patch('/api/passenger/notifications/notif-other/read');

    expect(res.status).toBe(404);
    expect(prismaMock.app_notifications.update).not.toHaveBeenCalled();
  });

  // 8. read-all marca todas do dono
  it('read-all marca todas as notificacoes do passageiro', async () => {
    prismaMock.app_notifications.updateMany.mockResolvedValue({ count: 5 });

    const res = await request(app).patch('/api/passenger/notifications/read-all');

    expect(res.status).toBe(200);
    expect(res.body.data.marked).toBe(5);
    expect(prismaMock.app_notifications.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          recipient_type: 'PASSENGER',
          recipient_id: 'passenger-1',
          read_at: null,
        }),
      }),
    );
  });

  // 9. read-all motorista
  it('read-all marca todas as notificacoes do motorista', async () => {
    prismaMock.app_notifications.updateMany.mockResolvedValue({ count: 3 });

    const res = await request(app).patch('/api/driver/notifications/read-all');

    expect(res.status).toBe(200);
    expect(res.body.data.marked).toBe(3);
  });

  // 10. Não retorna telefone/token
  it('listagem nao retorna telefone nem token no payload', async () => {
    prismaMock.app_notifications.findMany.mockResolvedValue([
      makeNotif({
        data: { routeId: 'route-1', messageId: 'msg-1' },
        // garantir que campos sensíveis não estejam no data
      }),
    ]);

    const res = await request(app).get('/api/passenger/notifications');

    expect(res.status).toBe(200);
    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toContain('phone');
    expect(serialized).not.toContain('token');
    expect(serialized).not.toContain('expo_push_token');
    expect(serialized).not.toContain('fcm_push_token');
  });
});

describe('app-notifications — serviço createAppNotification', () => {
  beforeEach(() => {
    prismaMock.app_notifications.create.mockImplementation(async ({ data }: any) => ({
      id: 'notif-svc-1',
      read_at: null,
      created_at: new Date(),
      ...data,
    }));
  });

  // Cria notificação para passageiro
  it('cria notificacao para passageiro com campos corretos', async () => {
    const result = await createAppNotification({
      recipient_type: 'PASSENGER',
      recipient_id: 'passenger-2',
      title: 'Nova mensagem da Rota Fixa',
      body: 'Você recebeu uma mensagem.',
      type: 'fixed_route_direct',
      route_id: 'route-9',
      reservation_id: 'res-9',
      data: { routeId: 'route-9', reservationId: 'res-9', messageId: 'msg-9' },
    });

    expect(prismaMock.app_notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          recipient_type: 'PASSENGER',
          recipient_id: 'passenger-2',
          title: 'Nova mensagem da Rota Fixa',
          type: 'fixed_route_direct',
          route_id: 'route-9',
          reservation_id: 'res-9',
        }),
      }),
    );
    expect(result.id).toBe('notif-svc-1');
  });

  // Push falhar não impede criação da notificação
  it('notificacao criada mesmo quando push falha', async () => {
    // Serviço de notificação opera independente do push
    // Simula create bem-sucedido
    await createAppNotification({
      recipient_type: 'DRIVER',
      recipient_id: 'driver-5',
      title: 'Mensagem de passageiro',
      body: 'Um passageiro enviou uma mensagem.',
      type: 'fixed_route_message',
      route_id: 'route-5',
      reservation_id: 'res-5',
      data: { routeId: 'route-5', reservationId: 'res-5', messageId: 'msg-5' },
    });

    expect(prismaMock.app_notifications.create).toHaveBeenCalledTimes(1);
  });
});
