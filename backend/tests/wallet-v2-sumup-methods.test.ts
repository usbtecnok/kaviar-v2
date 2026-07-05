import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

const mockQuery = vi.fn();

vi.mock('../src/db', () => ({
  pool: {
    query: mockQuery,
    connect: vi.fn(() => ({ query: mockQuery, release: vi.fn() })),
  },
}));

vi.mock('../src/middlewares/auth', () => ({
  authenticateDriver: (req: any, res: any, next: any) => {
    if (!req.headers.authorization) {
      return res.status(401).json({ error: 'Token ausente' });
    }
    req.driverId = 'test-driver-1';
    next();
  },
}));

const mockCreateSumUpCheckout = vi.fn();
const mockProcessSumUpCheckout = vi.fn();
const mockGetSumUpCheckoutPaymentMethods = vi.fn();
const mockIsSumUpEnabled = vi.fn();
const mockGetSumUpMerchantPaymentMethods = vi.fn();
const mockHasSumUpPixPaymentMethod = vi.fn();

class TestSumUpError extends Error {
  statusCode: number;
  safeMessage: string;

  constructor(statusCode: number, safeMessage: string) {
    super(safeMessage);
    this.statusCode = statusCode;
    this.safeMessage = safeMessage;
  }
}

vi.mock('../src/services/sumup-service', () => ({
  createSumUpCheckout: (...args: any[]) => mockCreateSumUpCheckout(...args),
  processSumUpCheckout: (...args: any[]) => mockProcessSumUpCheckout(...args),
  getSumUpCheckoutPaymentMethods: (...args: any[]) => mockGetSumUpCheckoutPaymentMethods(...args),
  getSumUpMerchantPaymentMethods: (...args: any[]) => mockGetSumUpMerchantPaymentMethods(...args),
  hasSumUpPixPaymentMethod: (...args: any[]) => mockHasSumUpPixPaymentMethod(...args),
  isSumUpEnabled: () => mockIsSumUpEnabled(),
  SumUpError: TestSumUpError,
}));

const { default: driverWalletV2Routes, _resetWalletV2Cache } = await import('../src/routes/driver-wallet-v2');

const app = express();
app.use(express.json());
app.use('/api/v2/drivers/me/wallet', driverWalletV2Routes);

describe('Wallet V2 SumUp payment method flow', () => {
  const auth = { Authorization: 'Bearer test-token' };

  beforeEach(() => {
    mockQuery.mockReset();
    mockCreateSumUpCheckout.mockReset();
    mockProcessSumUpCheckout.mockReset();
    mockGetSumUpCheckoutPaymentMethods.mockReset();
    mockIsSumUpEnabled.mockReset();
    mockGetSumUpMerchantPaymentMethods.mockReset();
    mockHasSumUpPixPaymentMethod.mockReset();
    _resetWalletV2Cache();

    mockIsSumUpEnabled.mockReturnValue(true);
    mockCreateSumUpCheckout.mockResolvedValue({
      id: 'sumup_checkout_1',
      checkout_reference: 'wallet_v2:test',
      hosted_checkout_url: 'https://checkout.sumup.com/hc/Q1',
      status: 'PENDING',
    });
    mockGetSumUpCheckoutPaymentMethods.mockResolvedValue([{ id: 'qr_code_pix' }]);
    mockProcessSumUpCheckout.mockResolvedValue({
      id: 'sumup_checkout_1',
      status: 'PENDING',
      qr_code_pix: {
        artefacts: [
          { name: 'barcode', location: 'https://api.sumup.com/v0.1/artefacts/qr/content' },
          { name: 'code', content: '000201PIX' },
        ],
      },
    });
    mockGetSumUpMerchantPaymentMethods.mockResolvedValue([{ id: 'qr_code_pix' }]);
    mockHasSumUpPixPaymentMethod.mockReturnValue(true);
  });

  it('bloqueia provider asaas com 410', async () => {
    const res = await request(app)
      .post('/api/v2/drivers/me/wallet/recharge')
      .set(auth)
      .send({ package_id: 'saldo-20', payment_provider: 'asaas' });

    expect(res.status).toBe(410);
    expect(res.body.error).toBe('Pix pelo Asaas indisponível. Use Pix pela SumUp.');
    expect(mockCreateSumUpCheckout).not.toHaveBeenCalled();
  });

  it('bloqueia payment_method=card com mensagem clara', async () => {
    const res = await request(app)
      .post('/api/v2/drivers/me/wallet/recharge')
      .set(auth)
      .send({ package_id: 'saldo-50', payment_provider: 'sumup', payment_method: 'card' });

    expect(res.status).toBe(503);
    expect(res.body.error).toBe('Recarga por cartão está temporariamente indisponível. Use Pix.');
    expect(mockCreateSumUpCheckout).not.toHaveBeenCalled();
    expect(mockGetSumUpMerchantPaymentMethods).not.toHaveBeenCalled();
  });

  it('processa checkout SumUp com payment_type=qr_code_pix para payment_method=pix', async () => {
    mockGetSumUpCheckoutPaymentMethods.mockResolvedValue([{ id: 'card' }]);
    mockQuery
      .mockResolvedValueOnce({ rows: [{ enabled: true }] })
      .mockResolvedValueOnce({ rows: [{ id: 'saldo-20', amount_cents: '2000', label: 'R$ 20' }] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ c: '0' }] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    const res = await request(app)
      .post('/api/v2/drivers/me/wallet/recharge')
      .set(auth)
      .send({ package_id: 'saldo-20', payment_provider: 'sumup', payment_method: 'pix' });

    expect(res.status).toBe(200);
    expect(res.body.data.payment_provider).toBe('sumup');
    expect(res.body.data.payment_method).toBe('pix');
    expect(res.body.data.pix.payment_type).toBe('qr_code_pix');
    expect(res.body.data.wallet_credit_cents).toBe(2000);
    expect(res.body.data.charged_amount_cents).toBe(2000);
    expect(mockGetSumUpMerchantPaymentMethods).toHaveBeenCalledTimes(1);
    expect(mockCreateSumUpCheckout).toHaveBeenCalledTimes(1);
    expect(mockGetSumUpCheckoutPaymentMethods).toHaveBeenCalledTimes(1);
    expect(mockProcessSumUpCheckout).toHaveBeenCalledWith('sumup_checkout_1', { payment_type: 'qr_code_pix' });
  });

  it('retorna 503 e expira recarga quando PUT qr_code_pix falha', async () => {
    mockGetSumUpCheckoutPaymentMethods.mockResolvedValue([{ id: 'card' }]);
    mockProcessSumUpCheckout.mockRejectedValue(new TestSumUpError(422, 'Checkout não pôde ser processado pelo provedor.'));
    mockQuery
      .mockResolvedValueOnce({ rows: [{ enabled: true }] })
      .mockResolvedValueOnce({ rows: [{ id: 'saldo-20', amount_cents: '2000', label: 'R$ 20' }] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ c: '0' }] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    const res = await request(app)
      .post('/api/v2/drivers/me/wallet/recharge')
      .set(auth)
      .send({ package_id: 'saldo-20', payment_provider: 'sumup', payment_method: 'pix' });

    expect(res.status).toBe(503);
    expect(res.body.error).toBe('Pix pela SumUp indisponível no momento. Tente novamente em instantes.');
    const expireCall = mockQuery.mock.calls.find((call: any[]) =>
      typeof call[0] === 'string' &&
      call[0].includes("UPDATE wallet_recharges SET status='expired'")
    );
    expect(expireCall).toBeTruthy();
  });

  it('retorna 503 quando payment_method=pix não está disponível no merchant SumUp', async () => {
    mockGetSumUpMerchantPaymentMethods.mockResolvedValue([{ id: 'card' }]);

    const res = await request(app)
      .post('/api/v2/drivers/me/wallet/recharge')
      .set(auth)
      .send({ package_id: 'saldo-20', payment_provider: 'sumup', payment_method: 'pix' });

    expect(res.status).toBe(503);
    expect(res.body.error).toBe('Pix pela SumUp indisponível no momento. Tente novamente em instantes.');
    expect(mockCreateSumUpCheckout).not.toHaveBeenCalled();

    const insertSql = mockQuery.mock.calls.find((call: any[]) =>
      typeof call[0] === 'string' && call[0].includes('INSERT INTO wallet_recharges')
    );
    expect(insertSql).toBeFalsy();
  });
});
