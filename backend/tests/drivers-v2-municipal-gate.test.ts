import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock } = vi.hoisted(() => {
  const prismaMock: any = {
    drivers: {
      findUnique: vi.fn(),
    },
    neighborhoods: {
      findUnique: vi.fn(),
    },
    driver_status: {
      upsert: vi.fn(),
    },
  };

  return { prismaMock };
});

const canDriverOperateInMunicipalityMock = vi.hoisted(() => vi.fn());
const resolveTerritoryMock = vi.hoisted(() => vi.fn());
const municipalGateEnabled = vi.hoisted(() => ({ value: true }));

vi.mock('../src/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('../src/middlewares/auth', () => ({
  authenticateDriver: (req: any, _res: any, next: any) => {
    req.driverId = 'driver-1';
    next();
  },
}));
vi.mock('../src/services/municipal-regulation.service', () => ({
  canDriverOperateInMunicipality: canDriverOperateInMunicipalityMock,
  mapServiceCategoryToMunicipalModality: (serviceCategory: string) =>
    serviceCategory === 'MOTO_PASSENGER' ? 'MOTO_PASSENGER' : 'CAR',
}));
vi.mock('../src/services/territory-resolver.service', () => ({
  resolveTerritory: resolveTerritoryMock,
}));
vi.mock('../src/services/dispatcher.service', () => ({
  dispatcherService: {
    dispatchRide: vi.fn(),
  },
}));
vi.mock('../src/services/offer-acceptance.service', () => ({
  acceptOfferInternal: vi.fn(),
}));
vi.mock('../src/services/credit.service', () => ({
  getCreditBalance: vi.fn(),
}));
vi.mock('../src/services/financial-summary.service', () => ({
  getDriverFinancialSummary: vi.fn(),
}));
vi.mock('../src/config', () => ({
  config: {
    driverEnforcement: {
      get municipalRegulatoryGateEnabled() {
        return municipalGateEnabled.value;
      },
    },
  },
}));

const { default: driversV2Routes } = await import('../src/routes/drivers-v2');

const app = express();
app.use(express.json());
app.use('/api/v2/drivers', driversV2Routes);

describe('drivers-v2 municipal gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    municipalGateEnabled.value = true;

    prismaMock.driver_status.upsert.mockResolvedValue({});
    prismaMock.neighborhoods.findUnique.mockResolvedValue(null);
    resolveTerritoryMock.mockResolvedValue({ resolved: false, neighborhood: null });

    canDriverOperateInMunicipalityMock.mockResolvedValue({
      allowed: true,
      reason: null,
      municipal: { hasRegulation: false, municipalStatus: 'NOT_REQUIRED' },
    });
  });

  it('bloqueia ficar online quando cidade/UF não podem ser resolvidas', async () => {
    prismaMock.drivers.findUnique.mockResolvedValue({
      vehicle_type: 'CAR',
      neighborhoods: null,
      driver_location: null,
    });

    const res = await request(app)
      .post('/api/v2/drivers/me/availability')
      .send({ availability: 'online' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('MUNICIPAL_LOCATION_REQUIRED');
    expect(res.body.message).toBe('Não foi possível confirmar sua cidade para validar a autorização municipal. Atualize sua localização ou procure o suporte KAVIAR.');
    expect(canDriverOperateInMunicipalityMock).not.toHaveBeenCalled();
    expect(prismaMock.driver_status.upsert).not.toHaveBeenCalled();
  });

  it('cidade resolvida sem regra municipal continua permitindo ficar online', async () => {
    prismaMock.drivers.findUnique.mockResolvedValue({
      vehicle_type: 'CAR',
      neighborhoods: {
        city: 'Cidade Livre',
        territory: { uf: 'SP' },
      },
      driver_location: null,
    });

    canDriverOperateInMunicipalityMock.mockResolvedValue({
      allowed: true,
      reason: null,
      municipal: { hasRegulation: false, municipalStatus: 'NOT_REQUIRED' },
    });

    const res = await request(app)
      .post('/api/v2/drivers/me/availability')
      .send({ availability: 'online' });

    expect(res.status).toBe(200);
    expect(canDriverOperateInMunicipalityMock).toHaveBeenCalledWith('driver-1', 'Cidade Livre', 'SP', 'CAR');
    expect(prismaMock.driver_status.upsert).toHaveBeenCalled();
  });

  it('cidade regulada continua bloqueando quando autorização municipal não está aprovada', async () => {
    prismaMock.drivers.findUnique.mockResolvedValue({
      vehicle_type: 'CAR',
      neighborhoods: {
        city: 'Santa Rita do Passa Quatro',
        territory: { uf: 'SP' },
      },
      driver_location: null,
    });

    canDriverOperateInMunicipalityMock.mockResolvedValue({
      allowed: false,
      reason: 'Aguardando autorização municipal aprovada e válida.',
      municipal: { hasRegulation: true, municipalStatus: 'DOCUMENTS_PENDING' },
    });

    const res = await request(app)
      .post('/api/v2/drivers/me/availability')
      .send({ availability: 'online' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('MUNICIPAL_AUTH_REQUIRED');
    expect(res.body.city).toBe('Santa Rita do Passa Quatro');
    expect(res.body.state).toBe('SP');
  });

  it('com gate desligado não bloqueia online mesmo sem cidade/UF resolvidas', async () => {
    municipalGateEnabled.value = false;

    prismaMock.drivers.findUnique.mockResolvedValue({
      vehicle_type: 'CAR',
      neighborhoods: null,
      driver_location: null,
    });

    const res = await request(app)
      .post('/api/v2/drivers/me/availability')
      .send({ availability: 'online' });

    expect(res.status).toBe(200);
    expect(canDriverOperateInMunicipalityMock).not.toHaveBeenCalled();
    expect(prismaMock.driver_status.upsert).toHaveBeenCalled();
  });
});
