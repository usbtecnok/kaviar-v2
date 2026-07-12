import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';

const { prismaMock, authState } = vi.hoisted(() => {
  const prismaMock: any = {
    municipal_regulatory_cases: {
      findUnique: vi.fn(),
    },
    municipal_regulatory_driver_protocols: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    municipal_regulations: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    municipal_authorizations: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    municipal_package_audit_logs: {
      create: vi.fn(),
    },
    drivers: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    driver_documents: {
      findMany: vi.fn(),
    },
  };

  return {
    prismaMock,
    authState: {
      admin: { id: 'admin-1', email: 'admin@test.local', role: 'SUPER_ADMIN' },
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
  requireSuperAdmin: (req: any, res: any, next: any) => {
    if (req.admin?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, error: 'Acesso negado. Permissão insuficiente.' });
    }
    return next();
  },
}));

const { default: adminRegulatoryCitiesRoutes } = await import('../src/routes/admin-regulatory-cities');

const app = express();
app.use(express.json());
app.use('/api/admin', adminRegulatoryCitiesRoutes);

function makeKnownPrismaError(code: string, message: string, meta?: Record<string, unknown>) {
  const error = Object.create(Prisma.PrismaClientKnownRequestError.prototype);
  error.name = 'PrismaClientKnownRequestError';
  error.code = code;
  error.clientVersion = 'test';
  error.message = message;
  error.meta = meta || {};
  return error;
}

beforeEach(() => {
  vi.clearAllMocks();
  authState.admin = { id: 'admin-1', email: 'admin@test.local', role: 'SUPER_ADMIN' };

  prismaMock.municipal_regulatory_cases.findUnique.mockResolvedValue({
    id: 'case-1',
    city: 'Santa Rita do Passa Quatro',
    state: 'SP',
    department_name: 'Tributacao',
  });

  prismaMock.municipal_regulations.findFirst.mockResolvedValue({
    id: 'reg-1',
    city: 'Santa Rita do Passa Quatro',
    state: 'SP',
    service_modality: 'CAR',
    is_active: true,
    requirements: [],
  });

  prismaMock.drivers.findUnique.mockResolvedValue({ id: 'driver-1' });
  prismaMock.municipal_authorizations.findFirst.mockResolvedValue(null);
  prismaMock.municipal_authorizations.create.mockResolvedValue({
    id: 'auth-1',
    status: 'APPROVED_BY_CITY_HALL',
    approved_by_admin_id: 'admin-1',
  });
  prismaMock.municipal_package_audit_logs.create.mockResolvedValue({ id: 'audit-1' });

  prismaMock.municipal_regulatory_driver_protocols.findFirst.mockResolvedValue({
    id: 'protocol-1',
    case_id: 'case-1',
    driver_id: 'driver-1',
    service_modality: 'CAR',
    status: 'APPROVED',
    protocol_number: 'PR-123',
    submitted_at: new Date('2026-07-12T00:00:00.000Z'),
    approved_at: new Date('2026-07-12T01:00:00.000Z'),
  });

  prismaMock.municipal_regulatory_driver_protocols.findMany.mockResolvedValue([
    {
      id: 'protocol-1',
      case_id: 'case-1',
      driver_id: 'driver-1',
      service_modality: 'CAR',
      driver_name: 'Joao da Silva',
      cpf_last4: '8901',
      vehicle_plate: 'ABC1234',
      vehicle_type: 'CAR',
      protocol_number: 'PR-123',
      status: 'APPROVED',
      next_action: null,
      notes: null,
      submitted_at: new Date('2026-07-12T00:00:00.000Z'),
      approved_at: new Date('2026-07-12T01:00:00.000Z'),
      rejected_at: null,
      next_follow_up_at: null,
      created_at: new Date('2026-07-12T00:00:00.000Z'),
      updated_at: new Date('2026-07-12T00:00:00.000Z'),
    },
  ]);

  prismaMock.municipal_regulations.findMany.mockResolvedValue([
    { id: 'reg-1', service_modality: 'CAR' },
  ]);

  prismaMock.municipal_authorizations.findMany.mockResolvedValue([]);

  prismaMock.drivers.findMany.mockResolvedValue([]);
  prismaMock.driver_documents.findMany.mockResolvedValue([]);
});

describe('admin regulatory cities - fase 5C', () => {
  it('bloqueia geração para perfil sem SUPER_ADMIN', async () => {
    authState.admin = { id: 'admin-2', email: 'manager@test.local', role: 'TERRITORIAL_MANAGER' };

    const res = await request(app)
      .post('/api/admin/regulatory/cities/case-1/driver-protocols/protocol-1/generate-authorization')
      .send({});

    expect(res.status).toBe(403);
    expect(prismaMock.municipal_authorizations.create).not.toHaveBeenCalled();
  });

  it('bloqueia geração quando protocolo não está aprovado', async () => {
    prismaMock.municipal_regulatory_driver_protocols.findFirst.mockResolvedValue({
      id: 'protocol-1',
      case_id: 'case-1',
      driver_id: 'driver-1',
      service_modality: 'CAR',
      status: 'PREPARING',
    });

    const res = await request(app)
      .post('/api/admin/regulatory/cities/case-1/driver-protocols/protocol-1/generate-authorization')
      .send({});

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('PROTOCOL_NOT_APPROVED');
    expect(prismaMock.municipal_authorizations.create).not.toHaveBeenCalled();
  });

  it('bloqueia geração quando protocolo não tem driver_id', async () => {
    prismaMock.municipal_regulatory_driver_protocols.findFirst.mockResolvedValue({
      id: 'protocol-1',
      case_id: 'case-1',
      driver_id: null,
      service_modality: 'CAR',
      status: 'APPROVED',
    });

    const res = await request(app)
      .post('/api/admin/regulatory/cities/case-1/driver-protocols/protocol-1/generate-authorization')
      .send({});

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('PROTOCOL_DRIVER_REQUIRED');
  });

  it('bloqueia geração quando protocolo não define modalidade', async () => {
    prismaMock.municipal_regulatory_driver_protocols.findFirst.mockResolvedValue({
      id: 'protocol-1',
      case_id: 'case-1',
      driver_id: 'driver-1',
      service_modality: null,
      status: 'APPROVED',
      protocol_number: 'PR-123',
    });

    const res = await request(app)
      .post('/api/admin/regulatory/cities/case-1/driver-protocols/protocol-1/generate-authorization')
      .send({});

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('PROTOCOL_MODALITY_REQUIRED');
  });

  it('bloqueia geração quando protocolo aprovado não possui número de protocolo', async () => {
    prismaMock.municipal_regulatory_driver_protocols.findFirst.mockResolvedValue({
      id: 'protocol-1',
      case_id: 'case-1',
      driver_id: 'driver-1',
      service_modality: 'CAR',
      status: 'APPROVED',
      protocol_number: null,
    });

    const res = await request(app)
      .post('/api/admin/regulatory/cities/case-1/driver-protocols/protocol-1/generate-authorization')
      .send({});

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('PROTOCOL_NUMBER_REQUIRED');
    expect(res.body.error).toBe('Informe o número do protocolo municipal antes de gerar a autorização operacional.');
    expect(prismaMock.municipal_authorizations.create).not.toHaveBeenCalled();
  });

  it('bloqueia geração quando modalidade é inválida', async () => {
    prismaMock.municipal_regulatory_driver_protocols.findFirst.mockResolvedValue({
      id: 'protocol-1',
      case_id: 'case-1',
      driver_id: 'driver-1',
      service_modality: 'BOAT',
      status: 'APPROVED',
      protocol_number: 'PR-123',
    });

    const res = await request(app)
      .post('/api/admin/regulatory/cities/case-1/driver-protocols/protocol-1/generate-authorization')
      .send({});

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('PROTOCOL_MODALITY_REQUIRED');
  });

  it('bloqueia geração quando não existe regra municipal ativa', async () => {
    prismaMock.municipal_regulations.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/admin/regulatory/cities/case-1/driver-protocols/protocol-1/generate-authorization')
      .send({});

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('MUNICIPAL_REGULATION_NOT_FOUND');
    expect(prismaMock.municipal_authorizations.create).not.toHaveBeenCalled();
  });

  it('gera autorização para protocolo aprovado com motorista/modalidade/regra válidos', async () => {
    const res = await request(app)
      .post('/api/admin/regulatory/cities/case-1/driver-protocols/protocol-1/generate-authorization')
      .send({});

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const createCall = prismaMock.municipal_authorizations.create.mock.calls[0][0];
    expect(createCall.data.status).toBe('APPROVED_BY_CITY_HALL');
    expect(createCall.data.approved_by_admin_id).toBe('admin-1');
    expect(createCall.data.service_modality).toBe('CAR');

    expect(prismaMock.municipal_package_audit_logs.create).toHaveBeenCalled();
  });

  it('ação repetida é idempotente quando autorização equivalente já está ativa', async () => {
    prismaMock.municipal_authorizations.findFirst.mockResolvedValue({
      id: 'auth-existing',
      status: 'APPROVED_BY_CITY_HALL',
      approved_by_admin_id: 'admin-1',
      authorization_valid_until: null,
    });

    const res = await request(app)
      .post('/api/admin/regulatory/cities/case-1/driver-protocols/protocol-1/generate-authorization')
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.data.idempotent).toBe(true);
    expect(prismaMock.municipal_authorizations.create).not.toHaveBeenCalled();
  });

  it('concorrência não duplica autorização (P2002) e retorna resultado idempotente', async () => {
    prismaMock.municipal_authorizations.create.mockRejectedValueOnce({ code: 'P2002' });
    prismaMock.municipal_authorizations.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'auth-concurrent',
        status: 'APPROVED_BY_CITY_HALL',
        approved_by_admin_id: 'admin-1',
        authorization_valid_until: null,
      });

    const res = await request(app)
      .post('/api/admin/regulatory/cities/case-1/driver-protocols/protocol-1/generate-authorization')
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.data.idempotent).toBe(true);
    expect(res.body.data.authorizationId).toBe('auth-concurrent');
  });

  it('não escolhe modalidade silenciosamente quando motorista tem múltiplas modalidades compatíveis', async () => {
    prismaMock.municipal_regulatory_driver_protocols.findFirst.mockResolvedValue(null);

    prismaMock.drivers.findUnique.mockResolvedValue({
      id: 'driver-1',
      name: 'Joao da Silva',
      document_cpf: '123.456.789-01',
      vehicle_plate: 'ABC1234',
      vehicle_type: 'CAR',
      neighborhoods: {
        city: 'Santa Rita do Passa Quatro',
        territory: { uf: 'SP' },
      },
      driver_modalities: [
        { modality: 'CAR', status: 'APPROVED', vehicle_plate: 'ABC1234' },
        { modality: 'MOTO_PASSENGER', status: 'APPROVED', vehicle_plate: null },
      ],
    });

    prismaMock.municipal_regulations.findMany.mockResolvedValue([
      { service_modality: 'CAR', requirements: [] },
      { service_modality: 'MOTO_PASSENGER', requirements: [] },
    ]);

    const res = await request(app)
      .post('/api/admin/regulatory/cities/case-1/driver-protocols/from-driver')
      .send({
        driverId: 'driver-1',
      });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('DRIVER_MODALITY_SELECTION_REQUIRED');
    expect(res.body.compatibleModalities).toEqual(['CAR', 'MOTO_PASSENGER']);
    expect(prismaMock.municipal_regulatory_driver_protocols.create).not.toHaveBeenCalled();
  });

  it('GET driver-protocols informa situação da autorização operacional sem expor dados sensíveis', async () => {
    prismaMock.municipal_authorizations.findMany.mockResolvedValue([
      {
        id: 'auth-1',
        driver_id: 'driver-1',
        service_modality: 'CAR',
        status: 'APPROVED_BY_CITY_HALL',
        approved_by_admin_id: 'admin-1',
        authorization_valid_until: null,
        authorization_document_url: 'https://private/secret.pdf',
      },
    ]);

    const res = await request(app)
      .get('/api/admin/regulatory/cities/case-1/driver-protocols');

    expect(res.status).toBe(200);
    const item = res.body?.data?.items?.[0];
    expect(item.authorizationOperational.state).toBe('ACTIVE');
    expect(item.authorizationOperational.label).toBe('Autorização municipal ativa');
    expect(item.authorization_document_url).toBeUndefined();
    expect(JSON.stringify(item)).not.toContain('https://private/secret.pdf');
    expect(JSON.stringify(item)).not.toContain('123.456.789-01');
  });

  it('GET driver-protocols mantém listagem quando coluna service_modality ainda não existe no banco (fallback de compatibilidade)', async () => {
    prismaMock.municipal_regulatory_driver_protocols.findMany
      .mockRejectedValueOnce(
        makeKnownPrismaError(
          'P2022',
          'The column `municipal_regulatory_driver_protocols.service_modality` does not exist in the current database.',
          { column: 'municipal_regulatory_driver_protocols.service_modality' },
        ),
      )
      .mockResolvedValueOnce([
        {
          id: 'protocol-legacy-1',
          case_id: 'case-1',
          driver_id: 'driver-1',
          driver_name: 'Joao da Silva',
          cpf_last4: '8901',
          vehicle_plate: 'ABC1234',
          vehicle_type: 'CAR',
          protocol_number: 'PR-LEGACY',
          status: 'APPROVED',
          next_action: null,
          notes: null,
          submitted_at: new Date('2026-07-12T00:00:00.000Z'),
          approved_at: new Date('2026-07-12T01:00:00.000Z'),
          rejected_at: null,
          next_follow_up_at: null,
          created_at: new Date('2026-07-12T00:00:00.000Z'),
          updated_at: new Date('2026-07-12T00:00:00.000Z'),
        },
      ]);

    prismaMock.municipal_authorizations.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/admin/regulatory/cities/case-1/driver-protocols');

    expect(res.status).toBe(200);
    expect(prismaMock.municipal_regulatory_driver_protocols.findMany).toHaveBeenCalledTimes(2);

    const firstCall = prismaMock.municipal_regulatory_driver_protocols.findMany.mock.calls[0][0];
    const secondCall = prismaMock.municipal_regulatory_driver_protocols.findMany.mock.calls[1][0];

    expect(firstCall.select.service_modality).toBe(true);
    expect(secondCall.select.service_modality).toBeUndefined();

    const item = res.body?.data?.items?.[0];
    expect(item.service_modality).toBeNull();
    expect(item.authorizationOperational).toBeDefined();
    expect(item.authorizationOperational.state).toBe('NOT_GENERATED');
    expect(item.authorizationOperational.reason).toContain('Defina a modalidade municipal no protocolo');
  });

  it('GET driver-protocols não engole P2022 de coluna não relacionada', async () => {
    prismaMock.municipal_regulatory_driver_protocols.findMany.mockRejectedValueOnce(
      makeKnownPrismaError(
        'P2022',
        'The column `municipal_regulatory_driver_protocols.protocol_number` does not exist in the current database.',
        { column: 'municipal_regulatory_driver_protocols.protocol_number' },
      ),
    );

    const res = await request(app)
      .get('/api/admin/regulatory/cities/case-1/driver-protocols');

    expect(res.status).toBe(500);
    expect(prismaMock.municipal_regulatory_driver_protocols.findMany).toHaveBeenCalledTimes(1);
  });

  it('GET driver-protocols não engole erro Prisma não relacionado', async () => {
    prismaMock.municipal_regulatory_driver_protocols.findMany.mockRejectedValueOnce(
      makeKnownPrismaError(
        'P1001',
        'Can\'t reach database server',
      ),
    );

    const res = await request(app)
      .get('/api/admin/regulatory/cities/case-1/driver-protocols');

    expect(res.status).toBe(500);
    expect(prismaMock.municipal_regulatory_driver_protocols.findMany).toHaveBeenCalledTimes(1);
  });
});
