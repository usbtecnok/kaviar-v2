import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, authState } = vi.hoisted(() => {
  const prismaMock: any = {
    municipal_regulatory_cases: {
      findUnique: vi.fn(),
    },
    municipal_regulatory_driver_protocols: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
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

beforeEach(() => {
  vi.clearAllMocks();
  authState.admin = { id: 'admin-1', email: 'admin@test.local', role: 'SUPER_ADMIN' };

  prismaMock.municipal_regulatory_cases.findUnique.mockResolvedValue({
    id: 'case-1',
    city: 'Santa Rita do Passa Quatro',
    state: 'SP',
    department_name: 'Tributacao',
  });

  prismaMock.municipal_regulatory_driver_protocols.findFirst.mockResolvedValue({
    id: 'protocol-1',
    case_id: 'case-1',
    driver_id: 'driver-1',
    service_modality: 'CAR',
    status: 'APPROVED',
    protocol_number: 'PR-123',
    submitted_at: new Date('2026-07-10T12:00:00.000Z'),
    approved_at: new Date('2026-07-12T12:00:00.000Z'),
  });

  prismaMock.municipal_regulations.findFirst.mockResolvedValue({
    id: 'reg-1',
    city: 'Santa Rita do Passa Quatro',
    state: 'SP',
    service_modality: 'CAR',
    is_active: true,
    authorization_validity_months: 12,
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
      submitted_at: new Date('2026-07-10T00:00:00.000Z'),
      approved_at: new Date('2026-07-12T12:00:00.000Z'),
      rejected_at: null,
      next_follow_up_at: null,
      created_at: new Date('2026-07-10T00:00:00.000Z'),
      updated_at: new Date('2026-07-10T00:00:00.000Z'),
    },
  ]);

  prismaMock.municipal_regulations.findMany.mockResolvedValue([{ id: 'reg-1', service_modality: 'CAR' }]);
  prismaMock.municipal_authorizations.findMany.mockResolvedValue([]);

  prismaMock.drivers.findMany.mockResolvedValue([]);
  prismaMock.driver_documents.findMany.mockResolvedValue([]);
});

describe('admin regulatory cities - fase 5D', () => {
  it('calcula authorization_valid_until com validade de 12 meses', async () => {
    const res = await request(app)
      .post('/api/admin/regulatory/cities/case-1/driver-protocols/protocol-1/generate-authorization')
      .send({});

    expect(res.status).toBe(201);
    const createCall = prismaMock.municipal_authorizations.create.mock.calls[0][0];
    expect(createCall.data.authorization_valid_until).toEqual(new Date('2027-07-12T00:00:00.000Z'));
  });

  it('usa protocol.approved_at como base da validade', async () => {
    prismaMock.municipal_regulatory_driver_protocols.findFirst.mockResolvedValue({
      id: 'protocol-1',
      case_id: 'case-1',
      driver_id: 'driver-1',
      service_modality: 'CAR',
      status: 'APPROVED',
      protocol_number: 'PR-123',
      submitted_at: new Date('2026-01-01T12:00:00.000Z'),
      approved_at: new Date('2026-03-15T12:00:00.000Z'),
    });

    const res = await request(app)
      .post('/api/admin/regulatory/cities/case-1/driver-protocols/protocol-1/generate-authorization')
      .send({});

    expect(res.status).toBe(201);
    const createCall = prismaMock.municipal_authorizations.create.mock.calls[0][0];
    expect(createCall.data.authorization_valid_until).toEqual(new Date('2027-03-15T00:00:00.000Z'));
  });

  it('não usa submitted_at como base da validade', async () => {
    prismaMock.municipal_regulatory_driver_protocols.findFirst.mockResolvedValue({
      id: 'protocol-1',
      case_id: 'case-1',
      driver_id: 'driver-1',
      service_modality: 'CAR',
      status: 'APPROVED',
      protocol_number: 'PR-123',
      submitted_at: new Date('2026-01-31T23:30:00.000Z'),
      approved_at: new Date('2026-02-10T12:00:00.000Z'),
    });
    prismaMock.municipal_regulations.findFirst.mockResolvedValue({
      id: 'reg-1',
      authorization_validity_months: 1,
      requirements: [],
    });

    const res = await request(app)
      .post('/api/admin/regulatory/cities/case-1/driver-protocols/protocol-1/generate-authorization')
      .send({});

    expect(res.status).toBe(201);
    const createCall = prismaMock.municipal_authorizations.create.mock.calls[0][0];
    expect(createCall.data.authorization_valid_until).toEqual(new Date('2026-03-10T00:00:00.000Z'));
    expect(createCall.data.authorization_valid_until).not.toEqual(new Date('2026-02-28T00:00:00.000Z'));
  });

  it('gera authorization_valid_until nulo quando regra não define validade', async () => {
    prismaMock.municipal_regulations.findFirst.mockResolvedValue({
      id: 'reg-1',
      authorization_validity_months: null,
      requirements: [],
    });

    const res = await request(app)
      .post('/api/admin/regulatory/cities/case-1/driver-protocols/protocol-1/generate-authorization')
      .send({});

    expect(res.status).toBe(201);
    const createCall = prismaMock.municipal_authorizations.create.mock.calls[0][0];
    expect(createCall.data.authorization_valid_until).toBeNull();
  });

  it('bloqueia quando regra tem validade e approved_at está ausente', async () => {
    prismaMock.municipal_regulatory_driver_protocols.findFirst.mockResolvedValue({
      id: 'protocol-1',
      case_id: 'case-1',
      driver_id: 'driver-1',
      service_modality: 'CAR',
      status: 'APPROVED',
      protocol_number: 'PR-123',
      submitted_at: new Date('2026-07-12T00:00:00.000Z'),
      approved_at: null,
    });
    prismaMock.municipal_regulations.findFirst.mockResolvedValue({
      id: 'reg-1',
      authorization_validity_months: 6,
      requirements: [],
    });

    const res = await request(app)
      .post('/api/admin/regulatory/cities/case-1/driver-protocols/protocol-1/generate-authorization')
      .send({});

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('PROTOCOL_APPROVAL_DATE_REQUIRED_FOR_VALIDITY');
    expect(prismaMock.municipal_authorizations.create).not.toHaveBeenCalled();
  });

  it('bloqueia quando validade configurada é zero ou negativa', async () => {
    prismaMock.municipal_regulations.findFirst.mockResolvedValueOnce({
      id: 'reg-1',
      authorization_validity_months: 0,
      requirements: [],
    });

    const resZero = await request(app)
      .post('/api/admin/regulatory/cities/case-1/driver-protocols/protocol-1/generate-authorization')
      .send({});

    expect(resZero.status).toBe(409);
    expect(resZero.body.code).toBe('MUNICIPAL_AUTHORIZATION_VALIDITY_INVALID');

    prismaMock.municipal_regulations.findFirst.mockResolvedValueOnce({
      id: 'reg-1',
      authorization_validity_months: -3,
      requirements: [],
    });

    const resNegative = await request(app)
      .post('/api/admin/regulatory/cities/case-1/driver-protocols/protocol-1/generate-authorization')
      .send({});

    expect(resNegative.status).toBe(409);
    expect(resNegative.body.code).toBe('MUNICIPAL_AUTHORIZATION_VALIDITY_INVALID');
  });

  it('aplica clamp de 31/01/2026 + 1 mês para 28/02/2026', async () => {
    prismaMock.municipal_regulatory_driver_protocols.findFirst.mockResolvedValue({
      id: 'protocol-1',
      case_id: 'case-1',
      driver_id: 'driver-1',
      service_modality: 'CAR',
      status: 'APPROVED',
      protocol_number: 'PR-123',
      submitted_at: null,
      approved_at: new Date('2026-01-31T12:00:00.000Z'),
    });
    prismaMock.municipal_regulations.findFirst.mockResolvedValue({
      id: 'reg-1',
      authorization_validity_months: 1,
      requirements: [],
    });

    const res = await request(app)
      .post('/api/admin/regulatory/cities/case-1/driver-protocols/protocol-1/generate-authorization')
      .send({});

    expect(res.status).toBe(201);
    const createCall = prismaMock.municipal_authorizations.create.mock.calls[0][0];
    expect(createCall.data.authorization_valid_until).toEqual(new Date('2026-02-28T00:00:00.000Z'));
  });

  it('aplica clamp de 31/01/2024 + 1 mês para 29/02/2024', async () => {
    prismaMock.municipal_regulatory_driver_protocols.findFirst.mockResolvedValue({
      id: 'protocol-1',
      case_id: 'case-1',
      driver_id: 'driver-1',
      service_modality: 'CAR',
      status: 'APPROVED',
      protocol_number: 'PR-123',
      submitted_at: null,
      approved_at: new Date('2024-01-31T12:00:00.000Z'),
    });
    prismaMock.municipal_regulations.findFirst.mockResolvedValue({
      id: 'reg-1',
      authorization_validity_months: 1,
      requirements: [],
    });

    const res = await request(app)
      .post('/api/admin/regulatory/cities/case-1/driver-protocols/protocol-1/generate-authorization')
      .send({});

    expect(res.status).toBe(201);
    const createCall = prismaMock.municipal_authorizations.create.mock.calls[0][0];
    expect(createCall.data.authorization_valid_until).toEqual(new Date('2024-02-29T00:00:00.000Z'));
  });

  it('usa data civil de Sao Paulo para instante noturno (12/07 23:30 BRT) + 12 meses', async () => {
    prismaMock.municipal_regulatory_driver_protocols.findFirst.mockResolvedValue({
      id: 'protocol-1',
      case_id: 'case-1',
      driver_id: 'driver-1',
      service_modality: 'CAR',
      status: 'APPROVED',
      protocol_number: 'PR-123',
      submitted_at: null,
      approved_at: new Date('2026-07-13T02:30:00.000Z'),
    });
    prismaMock.municipal_regulations.findFirst.mockResolvedValue({
      id: 'reg-1',
      authorization_validity_months: 12,
      requirements: [],
    });

    const res = await request(app)
      .post('/api/admin/regulatory/cities/case-1/driver-protocols/protocol-1/generate-authorization')
      .send({});

    expect(res.status).toBe(201);
    const createCall = prismaMock.municipal_authorizations.create.mock.calls[0][0];
    expect(createCall.data.authorization_valid_until).toEqual(new Date('2027-07-12T00:00:00.000Z'));
  });

  it('usa data civil de Sao Paulo para instante de madrugada (12/07 00:30 BRT) + 12 meses', async () => {
    prismaMock.municipal_regulatory_driver_protocols.findFirst.mockResolvedValue({
      id: 'protocol-1',
      case_id: 'case-1',
      driver_id: 'driver-1',
      service_modality: 'CAR',
      status: 'APPROVED',
      protocol_number: 'PR-123',
      submitted_at: null,
      approved_at: new Date('2026-07-12T03:30:00.000Z'),
    });
    prismaMock.municipal_regulations.findFirst.mockResolvedValue({
      id: 'reg-1',
      authorization_validity_months: 12,
      requirements: [],
    });

    const res = await request(app)
      .post('/api/admin/regulatory/cities/case-1/driver-protocols/protocol-1/generate-authorization')
      .send({});

    expect(res.status).toBe(201);
    const createCall = prismaMock.municipal_authorizations.create.mock.calls[0][0];
    expect(createCall.data.authorization_valid_until).toEqual(new Date('2027-07-12T00:00:00.000Z'));
  });

  it('aplica clamp com timezone: 31/01/2026 23:30 BRT + 1 mês = 28/02/2026', async () => {
    prismaMock.municipal_regulatory_driver_protocols.findFirst.mockResolvedValue({
      id: 'protocol-1',
      case_id: 'case-1',
      driver_id: 'driver-1',
      service_modality: 'CAR',
      status: 'APPROVED',
      protocol_number: 'PR-123',
      submitted_at: null,
      approved_at: new Date('2026-02-01T02:30:00.000Z'),
    });
    prismaMock.municipal_regulations.findFirst.mockResolvedValue({
      id: 'reg-1',
      authorization_validity_months: 1,
      requirements: [],
    });

    const res = await request(app)
      .post('/api/admin/regulatory/cities/case-1/driver-protocols/protocol-1/generate-authorization')
      .send({});

    expect(res.status).toBe(201);
    const createCall = prismaMock.municipal_authorizations.create.mock.calls[0][0];
    expect(createCall.data.authorization_valid_until).toEqual(new Date('2026-02-28T00:00:00.000Z'));
  });

  it('aplica ano bissexto com timezone: 31/01/2024 23:30 BRT + 1 mês = 29/02/2024', async () => {
    prismaMock.municipal_regulatory_driver_protocols.findFirst.mockResolvedValue({
      id: 'protocol-1',
      case_id: 'case-1',
      driver_id: 'driver-1',
      service_modality: 'CAR',
      status: 'APPROVED',
      protocol_number: 'PR-123',
      submitted_at: null,
      approved_at: new Date('2024-02-01T02:30:00.000Z'),
    });
    prismaMock.municipal_regulations.findFirst.mockResolvedValue({
      id: 'reg-1',
      authorization_validity_months: 1,
      requirements: [],
    });

    const res = await request(app)
      .post('/api/admin/regulatory/cities/case-1/driver-protocols/protocol-1/generate-authorization')
      .send({});

    expect(res.status).toBe(201);
    const createCall = prismaMock.municipal_authorizations.create.mock.calls[0][0];
    expect(createCall.data.authorization_valid_until).toEqual(new Date('2024-02-29T00:00:00.000Z'));
  });

  it('GET retorna ACTIVE com validUntil e daysUntilExpiry', async () => {
    const activeValidUntil = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
    prismaMock.municipal_authorizations.findMany.mockResolvedValue([
      {
        id: 'auth-1',
        driver_id: 'driver-1',
        service_modality: 'CAR',
        status: 'APPROVED_BY_CITY_HALL',
        approved_by_admin_id: 'admin-1',
        authorization_valid_until: activeValidUntil,
      },
    ]);

    const res = await request(app).get('/api/admin/regulatory/cities/case-1/driver-protocols');

    expect(res.status).toBe(200);
    const operational = res.body?.data?.items?.[0]?.authorizationOperational;
    expect(operational.state).toBe('ACTIVE');
    expect(typeof operational.daysUntilExpiry).toBe('number');
    expect(operational.validUntil).toBeTruthy();
  });

  it('GET retorna EXPIRING_SOON', async () => {
    const expiringSoon = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    prismaMock.municipal_authorizations.findMany.mockResolvedValue([
      {
        id: 'auth-1',
        driver_id: 'driver-1',
        service_modality: 'CAR',
        status: 'APPROVED_BY_CITY_HALL',
        approved_by_admin_id: 'admin-1',
        authorization_valid_until: expiringSoon,
      },
    ]);

    const res = await request(app).get('/api/admin/regulatory/cities/case-1/driver-protocols');

    expect(res.status).toBe(200);
    const operational = res.body?.data?.items?.[0]?.authorizationOperational;
    expect(operational.state).toBe('EXPIRING_SOON');
    expect(operational.canGenerate).toBe(false);
  });

  it('GET mantém canGenerate=false para EXPIRING_SOON', async () => {
    const expiringSoon = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    prismaMock.municipal_authorizations.findMany.mockResolvedValue([
      {
        id: 'auth-expiring',
        driver_id: 'driver-1',
        service_modality: 'CAR',
        status: 'APPROVED_BY_CITY_HALL',
        approved_by_admin_id: 'admin-1',
        authorization_valid_until: expiringSoon,
      },
    ]);

    const res = await request(app).get('/api/admin/regulatory/cities/case-1/driver-protocols');

    expect(res.status).toBe(200);
    const operational = res.body?.data?.items?.[0]?.authorizationOperational;
    expect(operational.state).toBe('EXPIRING_SOON');
    expect(operational.canGenerate).toBe(false);
  });

  it('GET retorna EXPIRED e não permite canGenerate', async () => {
    const expired = new Date(Date.now() - 24 * 60 * 60 * 1000);
    prismaMock.municipal_authorizations.findMany.mockResolvedValue([
      {
        id: 'auth-1',
        driver_id: 'driver-1',
        service_modality: 'CAR',
        status: 'APPROVED_BY_CITY_HALL',
        approved_by_admin_id: 'admin-1',
        authorization_valid_until: expired,
      },
    ]);

    const res = await request(app).get('/api/admin/regulatory/cities/case-1/driver-protocols');

    expect(res.status).toBe(200);
    const operational = res.body?.data?.items?.[0]?.authorizationOperational;
    expect(operational.state).toBe('EXPIRED');
    expect(operational.canGenerate).toBe(false);
  });

  it('GET retorna EXPIRED com mensagem de renovação por novo ciclo regulatório', async () => {
    const expired = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    prismaMock.municipal_authorizations.findMany.mockResolvedValue([
      {
        id: 'auth-expired',
        driver_id: 'driver-1',
        service_modality: 'CAR',
        status: 'APPROVED_BY_CITY_HALL',
        approved_by_admin_id: 'admin-1',
        authorization_valid_until: expired,
      },
    ]);

    const res = await request(app).get('/api/admin/regulatory/cities/case-1/driver-protocols');

    expect(res.status).toBe(200);
    const operational = res.body?.data?.items?.[0]?.authorizationOperational;
    expect(operational.state).toBe('EXPIRED');
    expect(operational.reason).toContain('renovação exige novo ciclo regulatório');
    expect(operational.canGenerate).toBe(false);
  });

  it('GET não expõe URL privada/documentos sensíveis', async () => {
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

    const res = await request(app).get('/api/admin/regulatory/cities/case-1/driver-protocols');

    expect(res.status).toBe(200);
    const item = res.body?.data?.items?.[0];
    expect(JSON.stringify(item)).not.toContain('https://private/secret.pdf');
    expect(JSON.stringify(item)).not.toContain('123.456.789-01');
  });

  it('autorização existente vencida não é recriada pelo endpoint de geração', async () => {
    prismaMock.municipal_authorizations.findFirst.mockResolvedValue({
      id: 'auth-expired',
      status: 'APPROVED_BY_CITY_HALL',
      approved_by_admin_id: 'admin-1',
      authorization_valid_until: new Date('2020-01-01T00:00:00.000Z'),
    });

    const res = await request(app)
      .post('/api/admin/regulatory/cities/case-1/driver-protocols/protocol-1/generate-authorization')
      .send({});

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('AUTHORIZATION_ALREADY_EXISTS_REVIEW_REQUIRED');
    expect(prismaMock.municipal_authorizations.create).not.toHaveBeenCalled();
  });
});
