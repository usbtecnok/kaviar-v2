import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

const prismaMock = {
  rides_v2: {
    findUnique: vi.fn(),
  },
  ride_compensations: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
};

vi.mock('../src/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('../src/db', () => ({ pool: { query: vi.fn() } }));
vi.mock('../src/config', () => ({ config: {} }));
vi.mock('../src/config/s3-upload', () => ({ getPresignedUrl: vi.fn() }));
vi.mock('../src/modules/whatsapp', () => ({ whatsappEvents: {} }));
vi.mock('../src/services/dispatcher.service', () => ({ dispatcherService: {} }));
vi.mock('../src/services/territory-resolver.service', () => ({ resolveTerritory: vi.fn() }));
vi.mock('../src/services/realtime.service', () => ({ realTimeService: {} }));
vi.mock('../src/services/pricing-engine', () => ({}));
vi.mock('../src/services/credit-cost.service', () => ({ calculateCreditCost: vi.fn() }));
vi.mock('../src/services/credit.service', () => ({ applyCreditDelta: vi.fn() }));
vi.mock('../src/services/wallet-shadow.service', () => ({ shadowCalculate: vi.fn() }));
vi.mock('../src/services/moto-passenger-flag.service', () => ({ isMotoPassengerEnabled: vi.fn() }));
vi.mock('../src/middlewares/auth', () => ({
  authenticatePassenger: (req: any, _res: any, next: any) => {
    req.passengerId = 'passenger-1';
    next();
  },
  authenticateDriver: (_req: any, _res: any, next: any) => next(),
  requireAuth: (_req: any, _res: any, next: any) => next(),
}));
vi.mock('../src/services/google-directions.service', () => ({ getRouteDistance: vi.fn() }));
vi.mock('../src/services/wallet-v2/wallet.service', () => ({ WalletService: class {} }));
vi.mock('../src/services/wallet-v2/fee-split.service', () => ({ FeeSplitService: class {} }));
vi.mock('../src/services/wallet-v2/territory-ledger.service', () => ({ TerritoryLedgerService: class {} }));
vi.mock('../src/services/wallet-v2/pending-debit.service', () => ({ PendingDebitService: class {} }));
vi.mock('../src/services/wallet-v2/wallet-settlement.service', () => ({ WalletSettlementService: class {} }));
vi.mock('../src/services/push.service', () => ({ sendPushToDriver: vi.fn(), sendPushToPassenger: vi.fn() }));
vi.mock('../src/routes/driver-wallet-v2', () => ({ isWalletV2Enabled: vi.fn(), _resetWalletV2Cache: vi.fn() }));

const { default: ridesV2Routes } = await import('../src/routes/rides-v2');

const app = express();
app.use(express.json());
app.use('/api/v2/rides', ridesV2Routes);

describe('Legacy compensation tombstone', () => {
  beforeEach(() => {
    prismaMock.rides_v2.findUnique.mockReset();
    prismaMock.ride_compensations.findUnique.mockReset();
    prismaMock.ride_compensations.create.mockReset();
  });

  it('POST /api/v2/rides/:ride_id/compensation retorna 410 sem executar provider', async () => {
    const res = await request(app).post('/api/v2/rides/ride-1/compensation');

    expect(res.status).toBe(410);
    expect(res.body.error).toBe('COMPENSATION_PAYMENT_FLOW_NOT_AVAILABLE');
    expect(res.body.message).toBe('Fluxo financeiro de compensação temporariamente indisponível.');
    expect(prismaMock.rides_v2.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.ride_compensations.create).not.toHaveBeenCalled();
  });
});
