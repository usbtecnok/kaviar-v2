import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

const mockQuery = vi.fn();

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    ride_compensations: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('../src/middlewares/auth', () => ({
  authenticateDriver: (_req: any, _res: any, next: any) => {
    next();
  },
  authenticateAdmin: (_req: any, _res: any, next: any) => {
    (_req as any).adminId = 'admin-1';
    next();
  },
  requireRole: () => (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../src/db', () => ({
  pool: {
    query: mockQuery,
  },
}));

const { default: driverCreditsPurchaseRoutes } = await import('../src/routes/driver-credits-purchase');
const { default: adminCompensationsRoutes } = await import('../src/routes/admin-compensations');
const { default: commercePublicRoutes } = await import('../src/routes/commerce-public');

const app = express();
app.use(express.json());
app.use('/api/v2/drivers', driverCreditsPurchaseRoutes);
app.use('/api/admin/compensations', adminCompensationsRoutes);
app.use('/api/public/commerce', commercePublicRoutes);

describe('Legacy payment tombstones', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('GET /api/v2/drivers/me/credits/packages retorna 410 provider-neutral', async () => {
    const res = await request(app)
      .get('/api/v2/drivers/me/credits/packages')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(410);
    expect(res.body.error).toBe('LEGACY_PAYMENT_FLOW_REMOVED');
    expect(res.body.message).toBe('Use a recarga de saldo KAVIAR.');
  });

  it('POST /api/v2/drivers/me/credits/purchase retorna 410 provider-neutral', async () => {
    const res = await request(app)
      .post('/api/v2/drivers/me/credits/purchase')
      .set('Authorization', 'Bearer test-token')
      .send({ packageId: 'pkg-1' });

    expect(res.status).toBe(410);
    expect(res.body.error).toBe('LEGACY_PAYMENT_FLOW_REMOVED');
    expect(res.body.message).toBe('Use a recarga de saldo KAVIAR.');
  });

  it('POST /api/admin/compensations retorna 410 provider-neutral', async () => {
    const res = await request(app)
      .post('/api/admin/compensations')
      .send({ ride_id: 'ride-1' });

    expect(res.status).toBe(410);
    expect(res.body.error).toBe('COMPENSATION_PAYMENT_FLOW_NOT_AVAILABLE');
    expect(res.body.message).toBe('Fluxo financeiro de compensação temporariamente indisponível.');
  });

  it('POST /api/public/commerce/orders/:id/pay retorna 410 provider-neutral', async () => {
    const res = await request(app)
      .post('/api/public/commerce/orders/order-1/pay');

    expect(res.status).toBe(410);
    expect(res.body.error).toBe('PAYMENT_FLOW_NOT_AVAILABLE');
    expect(res.body.message).toBe('Pagamento online temporariamente indisponível.');
  });
});
