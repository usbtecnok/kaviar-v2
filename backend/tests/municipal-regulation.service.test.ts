import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    municipal_regulations: { findFirst: vi.fn() },
    driver_documents: { findMany: vi.fn() },
    municipal_authorizations: { findFirst: vi.fn() },
    drivers: { findUnique: vi.fn() },
  },
}));

import { prisma } from '../src/lib/prisma';
import {
  canDriverOperateInMunicipality,
  getDriverMunicipalStatus,
  getMunicipalRegulation,
} from '../src/services/municipal-regulation.service';

const mockFindRegulation = prisma.municipal_regulations.findFirst as ReturnType<typeof vi.fn>;
const mockFindDocuments = prisma.driver_documents.findMany as ReturnType<typeof vi.fn>;
const mockFindAuthorization = prisma.municipal_authorizations.findFirst as ReturnType<typeof vi.fn>;
const mockFindDriver = prisma.drivers.findUnique as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('municipal regulation service', () => {
  it('getMunicipalRegulation retorna regra ativa da cidade/modalidade', async () => {
    mockFindRegulation.mockResolvedValue({ id: 'reg-1', city: 'Santa Rita do Passa Quatro', state: 'SP', service_modality: 'CAR', requirements: [] });

    const result = await getMunicipalRegulation('Santa Rita do Passa Quatro', 'sp', 'CAR');

    expect(result?.id).toBe('reg-1');
    expect(mockFindRegulation).toHaveBeenCalled();
  });

  it('getDriverMunicipalStatus retorna NOT_REQUIRED quando não há regra ativa', async () => {
    mockFindRegulation.mockResolvedValue(null);

    const result = await getDriverMunicipalStatus('driver-1', 'Cidade Livre', 'SP', 'CAR');

    expect(result.hasRegulation).toBe(false);
    expect(result.canOperateMunicipally).toBe(true);
    expect(result.municipalStatus).toBe('NOT_REQUIRED');
  });

  it('getDriverMunicipalStatus bloqueia quando status da regra é REQUIRES_CONFIRMATION', async () => {
    mockFindRegulation.mockResolvedValue({
      id: 'reg-2',
      city: 'Santa Rita do Passa Quatro',
      state: 'SP',
      service_modality: 'MOTO_PASSENGER',
      regulation_status: 'REQUIRES_CONFIRMATION',
      requires_city_approval: true,
      requirements: [],
    });
    mockFindAuthorization.mockResolvedValue(null);

    const result = await getDriverMunicipalStatus('driver-1', 'Santa Rita do Passa Quatro', 'SP', 'MOTO_PASSENGER');

    expect(result.hasRegulation).toBe(true);
    expect(result.canOperateMunicipally).toBe(false);
    expect(result.municipalStatus).toBe('REQUIRES_CONFIRMATION');
  });

  it('canDriverOperateInMunicipality bloqueia motorista não aprovado pela KAVIAR', async () => {
    mockFindDriver.mockResolvedValue({ id: 'driver-1', status: 'pending' });

    const result = await canDriverOperateInMunicipality('driver-1', 'Santa Rita do Passa Quatro', 'SP', 'CAR');

    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/KAVIAR/i);
  });

  it('canDriverOperateInMunicipality bloqueia quando autorização municipal ainda não está aprovada', async () => {
    mockFindDriver.mockResolvedValue({ id: 'driver-1', status: 'approved' });
    mockFindRegulation.mockResolvedValue({
      id: 'reg-1',
      city: 'Santa Rita do Passa Quatro',
      state: 'SP',
      service_modality: 'CAR',
      regulation_status: 'REGULATED',
      requires_city_approval: true,
      requirements: [],
    });
    mockFindDocuments.mockResolvedValue([]);
    mockFindAuthorization.mockResolvedValue({
      id: 'auth-1',
      status: 'DOCUMENTS_PENDING',
      authorization_valid_until: null,
      regulation: {
        id: 'reg-1',
        requires_city_approval: true,
        requirements: [],
      },
    });

    const result = await canDriverOperateInMunicipality('driver-1', 'Santa Rita do Passa Quatro', 'SP', 'CAR');

    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/autorização municipal/i);
  });

  it('canDriverOperateInMunicipality só libera quando aprovação final foi confirmada por Admin', async () => {
    mockFindDriver.mockResolvedValue({ id: 'driver-1', status: 'approved' });
    mockFindRegulation.mockResolvedValue({
      id: 'reg-1',
      city: 'Santa Rita do Passa Quatro',
      state: 'SP',
      service_modality: 'CAR',
      regulation_status: 'REGULATED',
      requires_city_approval: true,
      requirements: [],
    });
    mockFindDocuments.mockResolvedValue([]);

    mockFindAuthorization.mockResolvedValue({
      id: 'auth-2',
      status: 'APPROVED_BY_CITY_HALL',
      authorization_valid_until: null,
      approved_by_admin_id: 'admin-1',
      regulation: {
        id: 'reg-1',
        requires_city_approval: true,
        requirements: [],
      },
    });

    const result = await canDriverOperateInMunicipality('driver-1', 'Santa Rita do Passa Quatro', 'SP', 'CAR');

    expect(result.allowed).toBe(true);
    expect(result.reason).toBeNull();
  });

  it('canDriverOperateInMunicipality não libera aprovação sem confirmação do Admin', async () => {
    mockFindDriver.mockResolvedValue({ id: 'driver-1', status: 'approved' });
    mockFindRegulation.mockResolvedValue({
      id: 'reg-1',
      city: 'Santa Rita do Passa Quatro',
      state: 'SP',
      service_modality: 'CAR',
      regulation_status: 'REGULATED',
      requires_city_approval: true,
      requirements: [],
    });
    mockFindDocuments.mockResolvedValue([]);
    mockFindAuthorization.mockResolvedValue({
      id: 'auth-3',
      status: 'APPROVED_BY_CITY_HALL',
      authorization_valid_until: null,
      approved_by_admin_id: null,
      regulation: {
        id: 'reg-1',
        requires_city_approval: true,
        requirements: [],
      },
    });

    const result = await canDriverOperateInMunicipality('driver-1', 'Santa Rita do Passa Quatro', 'SP', 'CAR');

    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/autorização municipal/i);
  });

  it('canDriverOperateInMunicipality aceita status APPROVED/ACTIVE em caixa alta', async () => {
    mockFindDriver.mockResolvedValue({ id: 'driver-1', status: 'APPROVED' });
    mockFindRegulation.mockResolvedValue(null);

    const resultApproved = await canDriverOperateInMunicipality('driver-1', 'Cidade Livre', 'SP', 'CAR');

    expect(resultApproved.allowed).toBe(true);

    mockFindDriver.mockResolvedValue({ id: 'driver-1', status: 'ACTIVE' });
    const resultActive = await canDriverOperateInMunicipality('driver-1', 'Cidade Livre', 'SP', 'CAR');

    expect(resultActive.allowed).toBe(true);
  });
});
