import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, authState } = vi.hoisted(() => {
  const prismaMock: any = {
    municipal_authorizations: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    municipal_regulations: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    municipal_package_audit_logs: {
      create: vi.fn(),
    },
    operational_territories: {
      findMany: vi.fn(),
    },
  };

  return {
    prismaMock,
    authState: {
      admin: { id: 'admin-1', email: 'admin@test.local', role: 'SUPER_ADMIN' },
      scope: null as any,
    },
  };
});

vi.mock('../src/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('../src/middlewares/auth', () => ({
  authenticateAdmin: (req: any, _res: any, next: any) => {
    req.admin = authState.admin;
    req.userId = authState.admin.id;
    next();
  },
  allowReadAccess: (_req: any, _res: any, next: any) => next(),
  requireSuperAdmin: (req: any, res: any, next: any) => {
    if (req.admin?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, error: 'Acesso negado. Permissão insuficiente.' });
    }
    next();
  },
  requireRole: (allowedRoles: string[]) => (req: any, res: any, next: any) => {
    if (!allowedRoles.includes(req.admin?.role)) {
      return res.status(403).json({ success: false, error: 'Acesso negado. Permissão insuficiente.' });
    }
    next();
  },
}));
vi.mock('../src/middlewares/territory-scope', () => ({
  applyTerritoryScope: (req: any, _res: any, next: any) => {
    req.territoryScope = authState.scope;
    next();
  },
}));

const { default: adminMunicipalRoutes } = await import('../src/routes/admin-municipal');

const app = express();
app.use(express.json());
app.use('/api/admin', adminMunicipalRoutes);

const baseAuthorization = {
  id: 'auth-1',
  driver_id: 'driver-1',
  city: 'Santa Rita do Passa Quatro',
  state: 'SP',
  service_modality: 'CAR',
  source_driver_protocol_id: null,
  status: 'WAITING_CITY_HALL_REVIEW',
  authorization_number: null,
  authorization_document_url: null,
  authorization_valid_until: null,
  city_hall_notes: null,
  approved_by_admin_id: null,
  regulation: {
    id: 'reg-1',
    authorization_validity_months: null,
  },
};

beforeEach(() => {
  vi.clearAllMocks();

  authState.admin = { id: 'admin-1', email: 'admin@test.local', role: 'SUPER_ADMIN' };
  authState.scope = null;

  prismaMock.municipal_authorizations.findFirst.mockResolvedValue(baseAuthorization);
  prismaMock.municipal_authorizations.update.mockImplementation(async ({ data }: any) => ({
    ...baseAuthorization,
    ...data,
  }));
  prismaMock.municipal_authorizations.create.mockImplementation(async ({ data }: any) => ({
    ...baseAuthorization,
    id: 'auth-new',
    ...data,
    regulation: {
      id: 'reg-1',
      authorization_validity_months: null,
    },
  }));
  prismaMock.municipal_regulations.findFirst.mockResolvedValue({ id: 'reg-1' });
  prismaMock.municipal_regulations.findUnique.mockResolvedValue({ id: 'reg-1' });
  prismaMock.municipal_package_audit_logs.create.mockResolvedValue({ id: 'log-1' });
  prismaMock.operational_territories.findMany.mockResolvedValue([
    { city_name: 'Santa Rita do Passa Quatro', uf: 'SP' },
  ]);
});

describe('admin municipal permissions', () => {
  it('TERRITORIAL_MANAGER não pode definir APPROVED_BY_CITY_HALL', async () => {
    authState.admin = { id: 'manager-1', email: 'manager@test.local', role: 'TERRITORIAL_MANAGER' };
    authState.scope = { territoryIds: ['territory-sp'], neighborhoodIds: [], accessLevel: 'full' };

    const res = await request(app)
      .patch('/api/admin/drivers/driver-1/municipal-authorizations/auth-1/city-hall-decision')
      .send({ decision: 'APPROVED_BY_CITY_HALL' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Aprovação municipal final deve ser confirmada pelo Admin KAVIAR.');
    expect(prismaMock.municipal_authorizations.update).not.toHaveBeenCalled();
  });

  it('SUPER_ADMIN pode definir APPROVED_BY_CITY_HALL', async () => {
    const res = await request(app)
      .patch('/api/admin/drivers/driver-1/municipal-authorizations/auth-1/city-hall-decision')
      .send({ decision: 'APPROVED_BY_CITY_HALL' });

    expect(res.status).toBe(200);
    expect(prismaMock.municipal_authorizations.update).toHaveBeenCalled();

    const updateCall = prismaMock.municipal_authorizations.update.mock.calls[0][0];
    expect(updateCall.data.status).toBe('APPROVED_BY_CITY_HALL');
    expect(updateCall.data.approved_by_admin_id).toBe('admin-1');
  });

  it('TERRITORIAL_MANAGER não pode definir REJECTED_BY_CITY_HALL', async () => {
    authState.admin = { id: 'manager-1', email: 'manager@test.local', role: 'TERRITORIAL_MANAGER' };
    authState.scope = { territoryIds: ['territory-sp'], neighborhoodIds: [], accessLevel: 'full' };

    const res = await request(app)
      .patch('/api/admin/drivers/driver-1/municipal-authorizations/auth-1/city-hall-decision')
      .send({ decision: 'REJECTED_BY_CITY_HALL' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Decisão municipal final deve ser confirmada pelo Admin KAVIAR.');
    expect(prismaMock.municipal_authorizations.update).not.toHaveBeenCalled();
  });

  it('TERRITORIAL_MANAGER pode definir NEEDS_COMPLEMENT', async () => {
    authState.admin = { id: 'manager-1', email: 'manager@test.local', role: 'TERRITORIAL_MANAGER' };
    authState.scope = { territoryIds: ['territory-sp'], neighborhoodIds: [], accessLevel: 'full' };

    const res = await request(app)
      .patch('/api/admin/drivers/driver-1/municipal-authorizations/auth-1/city-hall-decision')
      .send({ decision: 'NEEDS_COMPLEMENT', city_hall_notes: 'Faltou documento municipal.' });

    expect(res.status).toBe(200);
    expect(prismaMock.municipal_authorizations.update).toHaveBeenCalled();

    const updateCall = prismaMock.municipal_authorizations.update.mock.calls[0][0];
    expect(updateCall.data.status).toBe('NEEDS_COMPLEMENT');
  });

  it('TERRITORIAL_MANAGER pode gerar pacote para prefeitura', async () => {
    authState.admin = { id: 'manager-1', email: 'manager@test.local', role: 'TERRITORIAL_MANAGER' };
    authState.scope = { territoryIds: ['territory-sp'], neighborhoodIds: [], accessLevel: 'full' };

    const res = await request(app)
      .post('/api/admin/drivers/driver-1/municipal-authorizations/auth-1/generate-package')
      .send({});

    expect(res.status).toBe(201);
    expect(prismaMock.municipal_authorizations.update).toHaveBeenCalled();

    const updateCall = prismaMock.municipal_authorizations.update.mock.calls[0][0];
    expect(updateCall.data.submitted_by_manager_id).toBe('manager-1');
  });

  it('POST manual atualiza apenas draft aberto existente', async () => {
    const openDraft = {
      ...baseAuthorization,
      id: 'draft-1',
      status: 'DOCUMENTS_PENDING',
      source_driver_protocol_id: null,
    };
    prismaMock.municipal_authorizations.findFirst.mockResolvedValueOnce(openDraft);

    const res = await request(app)
      .post('/api/admin/drivers/driver-1/municipal-authorizations')
      .send({ city: 'Santa Rita do Passa Quatro', state: 'SP', service_modality: 'CAR', status: 'IN_REVIEW_BY_KAVIAR' });

    expect(res.status).toBe(201);
    expect(prismaMock.municipal_authorizations.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.municipal_authorizations.create).not.toHaveBeenCalled();
  });

  it('POST manual retorna 409 quando já existe histórico e não há draft aberto', async () => {
    prismaMock.municipal_authorizations.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'hist-1' });

    const res = await request(app)
      .post('/api/admin/drivers/driver-1/municipal-authorizations')
      .send({ city: 'Santa Rita do Passa Quatro', state: 'SP', service_modality: 'CAR', status: 'DOCUMENTS_PENDING' });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('MUNICIPAL_AUTHORIZATION_HISTORY_EXISTS_USE_REGULATORY_FLOW');
    expect(prismaMock.municipal_authorizations.create).not.toHaveBeenCalled();
  });

  it('POST manual cria draft quando não existe histórico', async () => {
    prismaMock.municipal_authorizations.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const res = await request(app)
      .post('/api/admin/drivers/driver-1/municipal-authorizations')
      .send({ city: 'Santa Rita do Passa Quatro', state: 'SP', service_modality: 'CAR', status: 'DOCUMENTS_PENDING' });

    expect(res.status).toBe(201);
    expect(prismaMock.municipal_authorizations.create).toHaveBeenCalledTimes(1);
    const createCall = prismaMock.municipal_authorizations.create.mock.calls[0][0];
    expect(createCall.data.source_driver_protocol_id).toBeNull();
  });

  it('POST manual trata P2002 com idempotência via refetch de draft concorrente', async () => {
    prismaMock.municipal_authorizations.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'draft-concurrent' });
    prismaMock.municipal_authorizations.create.mockRejectedValueOnce({ code: 'P2002' });

    const res = await request(app)
      .post('/api/admin/drivers/driver-1/municipal-authorizations')
      .send({ city: 'Santa Rita do Passa Quatro', state: 'SP', service_modality: 'CAR', status: 'READY_FOR_CITY_HALL' });

    expect(res.status).toBe(201);
    expect(prismaMock.municipal_authorizations.update).toHaveBeenCalledTimes(1);
    const updateCall = prismaMock.municipal_authorizations.update.mock.calls[0][0];
    expect(updateCall.where.id).toBe('draft-concurrent');
  });
});
