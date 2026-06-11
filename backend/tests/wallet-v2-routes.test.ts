import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

const mockQuery = vi.fn();

vi.mock('../src/db', () => ({ pool: { query: mockQuery, connect: vi.fn(() => ({ query: mockQuery, release: vi.fn() })) } }));

vi.mock('../src/middlewares/auth', () => ({
  authenticateDriver: (req: any, _res: any, next: any) => {
    if (!req.headers.authorization) {
      return _res.status(401).json({ error: 'Token ausente' });
    }
    (req as any).driverId = 'test-driver-1';
    next();
  },
}));

const { default: driverWalletV2Routes } = await import('../src/routes/driver-wallet-v2');

const app = express();
app.use(express.json());
app.use('/api/v2/drivers/me/wallet', driverWalletV2Routes);

beforeEach(() => mockQuery.mockReset());

describe('Wallet V2 Read Endpoints', () => {
  const auth = { Authorization: 'Bearer test-token' };

  it('GET /wallet sem auth retorna 401', async () => {
    const res = await request(app).get('/api/v2/drivers/me/wallet');
    expect(res.status).toBe(401);
  });

  it('GET /wallet com auth cria wallet e retorna saldo 0', async () => {
    mockQuery.mockResolvedValueOnce({}) // ensureWallet INSERT
      .mockResolvedValueOnce({ rows: [{ balance_cents: '0', reserved_cents: '0' }] }); // getBalance
    const res = await request(app).get('/api/v2/drivers/me/wallet').set(auth);
    expect(res.status).toBe(200);
    expect(res.body.data.balance_cents).toBe(0);
    expect(res.body.data.available_cents).toBe(0);
    expect(res.body.data.balance_display).toBe('R$ 0,00');
  });

  it('GET /wallet/packages retorna 3 pacotes', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [
      { id: 'saldo-20', label: 'R$ 20', amount_cents: '2000', sort_order: 1 },
      { id: 'saldo-50', label: 'R$ 50', amount_cents: '5000', sort_order: 2 },
      { id: 'saldo-100', label: 'R$ 100', amount_cents: '10000', sort_order: 3 },
    ]});
    const res = await request(app).get('/api/v2/drivers/me/wallet/packages').set(auth);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
    expect(res.body.data[0].id).toBe('saldo-20');
    expect(res.body.data[2].amount_cents).toBe(10000);
  });

  it('GET /wallet/ledger retorna lista vazia', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }) // entries
      .mockResolvedValueOnce({ rows: [{ total: '0' }] }); // count
    const res = await request(app).get('/api/v2/drivers/me/wallet/ledger').set(auth);
    expect(res.status).toBe(200);
    expect(res.body.data.entries).toHaveLength(0);
    expect(res.body.data.total).toBe(0);
  });

  it('GET /wallet/ledger respeita paginação', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total: '50' }] });
    const res = await request(app).get('/api/v2/drivers/me/wallet/ledger?limit=5&offset=10').set(auth);
    expect(res.status).toBe(200);
    expect(res.body.data.limit).toBe(5);
    expect(res.body.data.offset).toBe(10);
  });

  it('GET /wallet/recharges/:id inexistente retorna 404', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/v2/drivers/me/wallet/recharges/nonexistent-id').set(auth);
    expect(res.status).toBe(404);
  });

  it('GET /wallet/recharges/:id de outro motorista retorna 404', async () => {
    // Query filters by driver_id, so if recharge belongs to another driver, no rows returned
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/v2/drivers/me/wallet/recharges/other-driver-recharge').set(auth);
    expect(res.status).toBe(404);
  });

  it('health check - rota responde corretamente', async () => {
    mockQuery.mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ balance_cents: '5000', reserved_cents: '1000' }] });
    const res = await request(app).get('/api/v2/drivers/me/wallet').set(auth);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.available_cents).toBe(4000);
  });
});
