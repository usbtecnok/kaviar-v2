import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    drivers: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    passengers: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('../src/lib/prisma', () => ({ prisma: prismaMock }));

const fetchMock = vi.fn();
(globalThis as any).fetch = fetchMock;

const { sendPushToDriver, sendPushToPassenger } = await import('../src/services/push.service');

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.drivers.findUnique.mockResolvedValue({ expo_push_token: 'ExponentPushToken[driver-token]' });
  prismaMock.passengers.findUnique.mockResolvedValue({ expo_push_token: 'ExponentPushToken[passenger-token]' });
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({ data: [{ id: 'ticket-1', status: 'ok' }] }),
  });
});

describe('push.service', () => {
  it('sendPushToPassenger retorna skipped quando passageiro não tem token', async () => {
    prismaMock.passengers.findUnique.mockResolvedValue({ expo_push_token: null });

    const result = await sendPushToPassenger('passenger-1', 'Titulo', 'Corpo', { type: 'fixed_route_message' });

    expect(result).toBe('skipped');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sendPushToPassenger chama provider quando token existe', async () => {
    const result = await sendPushToPassenger('passenger-1', 'Mensagem do motorista', 'Você recebeu uma mensagem sobre sua Rota Fixa.', {
      type: 'fixed_route_message',
      routeId: 'route-1',
    });

    expect(result).toBe('sent');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, options] = fetchMock.mock.calls[0];
    const payload = JSON.parse(options.body);
    expect(payload).toEqual(expect.objectContaining({
      title: 'Mensagem do motorista',
      body: 'Você recebeu uma mensagem sobre sua Rota Fixa.',
      sound: 'default',
      channelId: 'rides',
    }));
  });

  it('sendPushToPassenger retorna failed quando provider responde ticket error', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ id: 'ticket-2', status: 'error', details: { error: 'MessageRateExceeded' } }] }),
    });

    const result = await sendPushToPassenger('passenger-1', 'Mensagem', 'Corpo');

    expect(result).toBe('failed');
  });

  it('sendPushToDriver continua enviando normalmente', async () => {
    const result = await sendPushToDriver('driver-1', 'Nova corrida', 'Abra o app');

    expect(result).toBe('sent');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, options] = fetchMock.mock.calls[0];
    const payload = JSON.parse(options.body);
    expect(payload).toEqual(expect.objectContaining({
      sound: 'default',
      channelId: 'rides',
    }));
  });
});
