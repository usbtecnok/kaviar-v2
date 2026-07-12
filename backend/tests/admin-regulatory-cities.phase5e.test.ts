import fs from 'node:fs';
import path from 'node:path';
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

const CASE = {
  id: 'case-1',
  city: 'Santa Rita do Passa Quatro',
  state: 'SP',
  department_name: 'Tributacao',
};

function baseProtocol(overrides: Record<string, any> = {}) {
  return {
    id: 'protocol-1',
    case_id: 'case-1',
    driver_id: 'driver-1',
    service_modality: 'CAR',
    cycle_number: 1,
    renewal_of_protocol_id: null,
    driver_name: 'Joao da Silva',
    cpf_last4: '8901',
    vehicle_plate: 'ABC1234',
    vehicle_type: 'CAR',
    protocol_number: 'PR-123',
    status: 'APPROVED',
    next_action: null,
    notes: 'historico',
    submitted_at: new Date('2026-07-10T12:00:00.000Z'),
    approved_at: new Date('2026-07-12T12:00:00.000Z'),
    rejected_at: null,
    next_follow_up_at: null,
    created_at: new Date('2026-07-10T00:00:00.000Z'),
    updated_at: new Date('2026-07-10T00:00:00.000Z'),
    ...overrides,
  };
}

function baseAuthorization(overrides: Record<string, any> = {}) {
  return {
    id: 'auth-1',
    driver_id: 'driver-1',
    service_modality: 'CAR',
    source_driver_protocol_id: null,
    status: 'APPROVED_BY_CITY_HALL',
    approved_by_admin_id: 'admin-1',
    authorization_valid_until: new Date('2026-07-20T00:00:00.000Z'),
    created_at: new Date('2026-07-12T00:00:00.000Z'),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  authState.admin = { id: 'admin-1', email: 'admin@test.local', role: 'SUPER_ADMIN' };

  prismaMock.municipal_regulatory_cases.findUnique.mockResolvedValue(CASE);
  prismaMock.drivers.findUnique.mockResolvedValue({ id: 'driver-1' });

  const currentProtocol = baseProtocol();

  prismaMock.municipal_regulatory_driver_protocols.findFirst.mockImplementation(async (args: any) => {
    if (args?.where?.id) return currentProtocol;
    if (args?.where?.renewal_of_protocol_id) return null;
    if (args?.where?.case_id && args?.where?.driver_id && args?.where?.service_modality) return currentProtocol;
    return null;
  });

  prismaMock.municipal_regulatory_driver_protocols.findMany.mockResolvedValue([currentProtocol]);
  prismaMock.municipal_regulatory_driver_protocols.create.mockResolvedValue(
    baseProtocol({ id: 'protocol-2', cycle_number: 2, renewal_of_protocol_id: 'protocol-1', protocol_number: null, approved_at: null, submitted_at: null }),
  );

  prismaMock.municipal_regulations.findFirst.mockResolvedValue({
    id: 'reg-1',
    city: CASE.city,
    state: CASE.state,
    service_modality: 'CAR',
    regulation_status: 'REGULATED',
    requires_city_approval: true,
    authorization_validity_months: 12,
    requirements: [],
  });
  prismaMock.municipal_regulations.findMany.mockResolvedValue([{ id: 'reg-1', service_modality: 'CAR' }]);

  prismaMock.municipal_authorizations.findMany.mockResolvedValue([]);
  prismaMock.municipal_authorizations.findFirst.mockResolvedValue(null);
  prismaMock.municipal_authorizations.create.mockResolvedValue({ id: 'auth-new', status: 'APPROVED_BY_CITY_HALL', approved_by_admin_id: 'admin-1' });
  prismaMock.municipal_package_audit_logs.create.mockResolvedValue({ id: 'audit-1' });

  prismaMock.drivers.findMany.mockResolvedValue([]);
  prismaMock.driver_documents.findMany.mockResolvedValue([]);
});

describe('admin regulatory cities - fase 5E', () => {
  it('migration/model permite ciclo 2', () => {
    const schema = fs.readFileSync(path.resolve(process.cwd(), 'prisma/schema.prisma'), 'utf8');
    expect(schema).toContain('cycle_number      Int       @default(1)');
    expect(schema).toContain('renewal_of_protocol_id String? @db.Uuid');
    expect(schema).toContain('@@unique([case_id, driver_id, service_modality, cycle_number])');
  });

  it('histórico existente é ciclo 1', async () => {
    const res = await request(app).get('/api/admin/regulatory/cities/case-1/driver-protocols');
    expect(res.status).toBe(200);
    expect(res.body.data.items[0].cycleNumber).toBe(1);
    expect(res.body.data.items[0].renewalOfProtocolId).toBeNull();
  });

  it('start-renewal EXPIRING_SOON cria ciclo 2', async () => {
    prismaMock.municipal_authorizations.findMany.mockResolvedValue([baseAuthorization({ authorization_valid_until: new Date('2026-07-20T00:00:00.000Z') })]);

    const res = await request(app)
      .post('/api/admin/regulatory/cities/case-1/driver-protocols/protocol-1/start-renewal')
      .send({});

    expect(res.status).toBe(201);
    const createCall = prismaMock.municipal_regulatory_driver_protocols.create.mock.calls[0][0];
    expect(createCall.data.cycle_number).toBe(2);
  });

  it('start-renewal EXPIRED cria ciclo 2', async () => {
    prismaMock.municipal_authorizations.findMany.mockResolvedValue([baseAuthorization({ authorization_valid_until: new Date('2020-01-01T00:00:00.000Z') })]);

    const res = await request(app)
      .post('/api/admin/regulatory/cities/case-1/driver-protocols/protocol-1/start-renewal')
      .send({});

    expect(res.status).toBe(201);
    expect(res.body.data.cycleNumber).toBe(2);
  });

  it('start-renewal ACTIVE bloqueia com MUNICIPAL_RENEWAL_NOT_DUE', async () => {
    prismaMock.municipal_authorizations.findMany.mockResolvedValue([baseAuthorization({ authorization_valid_until: null })]);

    const res = await request(app)
      .post('/api/admin/regulatory/cities/case-1/driver-protocols/protocol-1/start-renewal')
      .send({});

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('MUNICIPAL_RENEWAL_NOT_DUE');
  });

  it('start-renewal INACTIVE bloqueia com MUNICIPAL_RENEWAL_REVIEW_REQUIRED', async () => {
    prismaMock.municipal_authorizations.findMany.mockResolvedValue([
      baseAuthorization({ status: 'DOCUMENTS_PENDING', approved_by_admin_id: null, authorization_valid_until: null }),
    ]);

    const res = await request(app)
      .post('/api/admin/regulatory/cities/case-1/driver-protocols/protocol-1/start-renewal')
      .send({});

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('MUNICIPAL_RENEWAL_REVIEW_REQUIRED');
  });

  it('start-renewal do ciclo 2 bloqueia quando só ciclo 1 possui autorização', async () => {
    prismaMock.municipal_regulatory_driver_protocols.findFirst.mockImplementation(async (args: any) => {
      if (args?.where?.id) return baseProtocol({ id: 'protocol-2', cycle_number: 2, renewal_of_protocol_id: 'protocol-1' });
      if (args?.where?.case_id && args?.where?.driver_id && args?.where?.service_modality) {
        return baseProtocol({ id: 'protocol-2', cycle_number: 2, renewal_of_protocol_id: 'protocol-1' });
      }
      if (args?.where?.renewal_of_protocol_id) return null;
      return null;
    });
    prismaMock.municipal_authorizations.findMany.mockResolvedValue([
      baseAuthorization({ source_driver_protocol_id: 'protocol-1', authorization_valid_until: new Date('2020-01-01T00:00:00.000Z') }),
    ]);

    const res = await request(app)
      .post('/api/admin/regulatory/cities/case-1/driver-protocols/protocol-2/start-renewal')
      .send({});

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('MUNICIPAL_RENEWAL_CURRENT_CYCLE_NOT_AUTHORIZED');
  });

  it('protocolo histórico não inicia renovação', async () => {
    const currentProtocol = baseProtocol();
    prismaMock.municipal_regulatory_driver_protocols.findFirst.mockImplementation(async (args: any) => {
      if (args?.where?.id) return baseProtocol({ id: 'protocol-1', cycle_number: 1 });
      if (args?.where?.case_id && args?.where?.driver_id && args?.where?.service_modality) return baseProtocol({ id: 'protocol-2', cycle_number: 2, renewal_of_protocol_id: 'protocol-1' });
      return null;
    });
    prismaMock.municipal_authorizations.findMany.mockResolvedValue([baseAuthorization({ authorization_valid_until: new Date('2020-01-01T00:00:00.000Z') })]);

    const res = await request(app)
      .post('/api/admin/regulatory/cities/case-1/driver-protocols/protocol-1/start-renewal')
      .send({});

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('PROTOCOL_NOT_LATEST_CYCLE');
    expect(currentProtocol.id).toBe('protocol-1');
  });

  it('novo protocolo não copia protocol_number', async () => {
    prismaMock.municipal_authorizations.findMany.mockResolvedValue([baseAuthorization({ authorization_valid_until: new Date('2020-01-01T00:00:00.000Z') })]);

    await request(app)
      .post('/api/admin/regulatory/cities/case-1/driver-protocols/protocol-1/start-renewal')
      .send({});

    const createCall = prismaMock.municipal_regulatory_driver_protocols.create.mock.calls[0][0];
    expect(createCall.data.protocol_number).toBeNull();
  });

  it('novo protocolo não copia approved_at', async () => {
    prismaMock.municipal_authorizations.findMany.mockResolvedValue([baseAuthorization({ authorization_valid_until: new Date('2020-01-01T00:00:00.000Z') })]);

    await request(app)
      .post('/api/admin/regulatory/cities/case-1/driver-protocols/protocol-1/start-renewal')
      .send({});

    const createCall = prismaMock.municipal_regulatory_driver_protocols.create.mock.calls[0][0];
    expect(createCall.data.approved_at).toBeNull();
  });

  it('novo protocolo referencia renewal_of_protocol_id', async () => {
    prismaMock.municipal_authorizations.findMany.mockResolvedValue([baseAuthorization({ authorization_valid_until: new Date('2020-01-01T00:00:00.000Z') })]);

    await request(app)
      .post('/api/admin/regulatory/cities/case-1/driver-protocols/protocol-1/start-renewal')
      .send({});

    const createCall = prismaMock.municipal_regulatory_driver_protocols.create.mock.calls[0][0];
    expect(createCall.data.renewal_of_protocol_id).toBe('protocol-1');
  });

  it('repetição de start-renewal é idempotente', async () => {
    prismaMock.municipal_regulatory_driver_protocols.findFirst.mockImplementation(async (args: any) => {
      if (args?.where?.id) return baseProtocol();
      if (args?.where?.case_id && args?.where?.driver_id && args?.where?.service_modality) return baseProtocol();
      if (args?.where?.renewal_of_protocol_id) return baseProtocol({ id: 'protocol-2', cycle_number: 2, renewal_of_protocol_id: 'protocol-1' });
      return null;
    });

    const res = await request(app)
      .post('/api/admin/regulatory/cities/case-1/driver-protocols/protocol-1/start-renewal')
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.data.idempotent).toBe(true);
  });

  it('P2002 no start retorna ciclo existente', async () => {
    prismaMock.municipal_authorizations.findMany.mockResolvedValue([baseAuthorization({ authorization_valid_until: new Date('2020-01-01T00:00:00.000Z') })]);
    prismaMock.municipal_regulatory_driver_protocols.create.mockRejectedValue({ code: 'P2002' });
    prismaMock.municipal_regulatory_driver_protocols.findFirst.mockImplementation(async (args: any) => {
      if (args?.where?.id) return baseProtocol();
      if (args?.where?.case_id && args?.where?.driver_id && args?.where?.service_modality) return baseProtocol();
      if (args?.where?.renewal_of_protocol_id) return baseProtocol({ id: 'protocol-2', cycle_number: 2, renewal_of_protocol_id: 'protocol-1' });
      return null;
    });

    const res = await request(app)
      .post('/api/admin/regulatory/cities/case-1/driver-protocols/protocol-1/start-renewal')
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.data.idempotent).toBe(true);
    expect(res.body.data.protocolId).toBe('protocol-2');
  });

  it('GET expõe cycleNumber/isRenewal/isLatestCycle', async () => {
    prismaMock.municipal_regulatory_driver_protocols.findMany.mockResolvedValue([
      baseProtocol({ id: 'protocol-2', cycle_number: 2, renewal_of_protocol_id: 'protocol-1' }),
      baseProtocol({ id: 'protocol-1', cycle_number: 1 }),
    ]);

    const res = await request(app).get('/api/admin/regulatory/cities/case-1/driver-protocols');

    expect(res.status).toBe(200);
    expect(res.body.data.items[0]).toHaveProperty('cycleNumber');
    expect(res.body.data.items[0]).toHaveProperty('isRenewal');
    expect(res.body.data.items[0]).toHaveProperty('isLatestCycle');
  });

  it('GET só habilita renovação no latest cycle correto', async () => {
    prismaMock.municipal_regulatory_driver_protocols.findMany.mockResolvedValue([
      baseProtocol({ id: 'protocol-2', cycle_number: 2, renewal_of_protocol_id: 'protocol-1', created_at: new Date('2026-07-13T00:00:00.000Z') }),
      baseProtocol({ id: 'protocol-1', cycle_number: 1, created_at: new Date('2026-07-10T00:00:00.000Z') }),
    ]);
    prismaMock.municipal_authorizations.findMany.mockResolvedValue([
      baseAuthorization({ id: 'auth-2', source_driver_protocol_id: 'protocol-2', authorization_valid_until: new Date('2020-01-01T00:00:00.000Z'), created_at: new Date('2026-07-13T00:00:00.000Z') }),
      baseAuthorization({ id: 'auth-1', source_driver_protocol_id: 'protocol-1', authorization_valid_until: new Date('2020-01-01T00:00:00.000Z'), created_at: new Date('2026-07-10T00:00:00.000Z') }),
    ]);

    const res = await request(app).get('/api/admin/regulatory/cities/case-1/driver-protocols');

    const cycle2 = res.body.data.items.find((item: any) => item.id === 'protocol-2');
    const cycle1 = res.body.data.items.find((item: any) => item.id === 'protocol-1');
    expect(cycle2.renewalOperational.canStartRenewal).toBe(true);
    expect(cycle1.renewalOperational.canStartRenewal).toBe(false);
  });

  it('GET não habilita renovação no ciclo 2 quando só existe autorização do ciclo 1', async () => {
    prismaMock.municipal_regulatory_driver_protocols.findMany.mockResolvedValue([
      baseProtocol({ id: 'protocol-2', cycle_number: 2, renewal_of_protocol_id: 'protocol-1', created_at: new Date('2026-07-13T00:00:00.000Z') }),
      baseProtocol({ id: 'protocol-1', cycle_number: 1, created_at: new Date('2026-07-10T00:00:00.000Z') }),
    ]);
    prismaMock.municipal_authorizations.findMany.mockResolvedValue([
      baseAuthorization({ id: 'auth-1', source_driver_protocol_id: 'protocol-1', authorization_valid_until: new Date('2020-01-01T00:00:00.000Z') }),
    ]);

    const res = await request(app).get('/api/admin/regulatory/cities/case-1/driver-protocols');

    const cycle2 = res.body.data.items.find((item: any) => item.id === 'protocol-2');
    expect(cycle2.renewalOperational.canStartRenewal).toBe(false);
    expect(cycle2.renewalOperational.reason).toContain('ciclo regulatório atual');
  });

  it('ciclo histórico não pode gerar autorização', async () => {
    prismaMock.municipal_regulatory_driver_protocols.findFirst.mockImplementation(async (args: any) => {
      if (args?.where?.id) return baseProtocol({ id: 'protocol-1', cycle_number: 1 });
      if (args?.where?.case_id && args?.where?.driver_id && args?.where?.service_modality) return baseProtocol({ id: 'protocol-2', cycle_number: 2, renewal_of_protocol_id: 'protocol-1' });
      return null;
    });

    const res = await request(app)
      .post('/api/admin/regulatory/cities/case-1/driver-protocols/protocol-1/generate-authorization')
      .send({});

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('PROTOCOL_NOT_LATEST_CYCLE');
  });

  it('renovação APPROVED cria NOVA autorização', async () => {
    prismaMock.municipal_regulatory_driver_protocols.findFirst.mockImplementation(async (args: any) => {
      if (args?.where?.id) return baseProtocol({ id: 'protocol-2', cycle_number: 2, renewal_of_protocol_id: 'protocol-1' });
      if (args?.where?.case_id && args?.where?.driver_id && args?.where?.service_modality) return baseProtocol({ id: 'protocol-2', cycle_number: 2, renewal_of_protocol_id: 'protocol-1' });
      return null;
    });
    prismaMock.municipal_authorizations.findMany.mockResolvedValue([
      baseAuthorization({ id: 'auth-1', source_driver_protocol_id: 'protocol-1', authorization_valid_until: new Date('2020-01-01T00:00:00.000Z') }),
    ]);

    const res = await request(app)
      .post('/api/admin/regulatory/cities/case-1/driver-protocols/protocol-2/generate-authorization')
      .send({});

    expect(res.status).toBe(201);
    expect(prismaMock.municipal_authorizations.create).toHaveBeenCalledTimes(1);
  });

  it('autorização anterior não é atualizada', async () => {
    prismaMock.municipal_regulatory_driver_protocols.findFirst.mockImplementation(async (args: any) => {
      if (args?.where?.id) return baseProtocol({ id: 'protocol-2', cycle_number: 2, renewal_of_protocol_id: 'protocol-1' });
      if (args?.where?.case_id && args?.where?.driver_id && args?.where?.service_modality) return baseProtocol({ id: 'protocol-2', cycle_number: 2, renewal_of_protocol_id: 'protocol-1' });
      return null;
    });
    prismaMock.municipal_authorizations.findMany.mockResolvedValue([
      baseAuthorization({ id: 'auth-old', source_driver_protocol_id: 'protocol-1', authorization_valid_until: new Date('2020-01-01T00:00:00.000Z') }),
    ]);

    const res = await request(app)
      .post('/api/admin/regulatory/cities/case-1/driver-protocols/protocol-2/generate-authorization')
      .send({});

    expect(res.status).toBe(201);
    expect(prismaMock.municipal_authorizations.update).toBeUndefined();
  });

  it('nova autorização usa source_driver_protocol_id do ciclo 2', async () => {
    prismaMock.municipal_regulatory_driver_protocols.findFirst.mockImplementation(async (args: any) => {
      if (args?.where?.id) return baseProtocol({ id: 'protocol-2', cycle_number: 2, renewal_of_protocol_id: 'protocol-1' });
      if (args?.where?.case_id && args?.where?.driver_id && args?.where?.service_modality) return baseProtocol({ id: 'protocol-2', cycle_number: 2, renewal_of_protocol_id: 'protocol-1' });
      return null;
    });
    prismaMock.municipal_authorizations.findMany.mockResolvedValue([
      baseAuthorization({ id: 'auth-old', source_driver_protocol_id: 'protocol-1', authorization_valid_until: new Date('2020-01-01T00:00:00.000Z') }),
    ]);

    await request(app)
      .post('/api/admin/regulatory/cities/case-1/driver-protocols/protocol-2/generate-authorization')
      .send({});

    const createCall = prismaMock.municipal_authorizations.create.mock.calls[0][0];
    expect(createCall.data.source_driver_protocol_id).toBe('protocol-2');
  });

  it('nova autorização calcula nova validade pela 5D', async () => {
    prismaMock.municipal_regulatory_driver_protocols.findFirst.mockImplementation(async (args: any) => {
      if (args?.where?.id) {
        return baseProtocol({
          id: 'protocol-2',
          cycle_number: 2,
          renewal_of_protocol_id: 'protocol-1',
          approved_at: new Date('2026-07-12T23:30:00.000Z'),
        });
      }
      if (args?.where?.case_id && args?.where?.driver_id && args?.where?.service_modality) {
        return baseProtocol({ id: 'protocol-2', cycle_number: 2, renewal_of_protocol_id: 'protocol-1' });
      }
      return null;
    });
    prismaMock.municipal_authorizations.findMany.mockResolvedValue([
      baseAuthorization({ id: 'auth-old', source_driver_protocol_id: 'protocol-1', authorization_valid_until: new Date('2020-01-01T00:00:00.000Z') }),
    ]);

    const res = await request(app)
      .post('/api/admin/regulatory/cities/case-1/driver-protocols/protocol-2/generate-authorization')
      .send({});

    expect(res.status).toBe(201);
    const createCall = prismaMock.municipal_authorizations.create.mock.calls[0][0];
    expect(createCall.data.authorization_valid_until).toEqual(new Date('2027-07-12T00:00:00.000Z'));
  });

  it('repetição da geração é idempotente por source_driver_protocol_id', async () => {
    prismaMock.municipal_regulatory_driver_protocols.findFirst.mockImplementation(async (args: any) => {
      if (args?.where?.id) return baseProtocol({ id: 'protocol-2', cycle_number: 2, renewal_of_protocol_id: 'protocol-1' });
      if (args?.where?.case_id && args?.where?.driver_id && args?.where?.service_modality) return baseProtocol({ id: 'protocol-2', cycle_number: 2, renewal_of_protocol_id: 'protocol-1' });
      return null;
    });
    prismaMock.municipal_authorizations.findMany.mockResolvedValue([
      baseAuthorization({ id: 'auth-2', source_driver_protocol_id: 'protocol-2', authorization_valid_until: null, created_at: new Date('2026-07-13T00:00:00.000Z') }),
    ]);

    const res = await request(app)
      .post('/api/admin/regulatory/cities/case-1/driver-protocols/protocol-2/generate-authorization')
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.data.idempotent).toBe(true);
  });

  it('renovação ignora autorização mais nova não relacionada ao ciclo anterior', async () => {
    prismaMock.municipal_regulatory_driver_protocols.findFirst.mockImplementation(async (args: any) => {
      if (args?.where?.id) return baseProtocol({ id: 'protocol-2', cycle_number: 2, renewal_of_protocol_id: 'protocol-1' });
      if (args?.where?.case_id && args?.where?.driver_id && args?.where?.service_modality) return baseProtocol({ id: 'protocol-2', cycle_number: 2, renewal_of_protocol_id: 'protocol-1' });
      return null;
    });
    prismaMock.municipal_authorizations.findMany.mockResolvedValue([
      baseAuthorization({ id: 'auth-unrelated-active', source_driver_protocol_id: 'protocol-x', authorization_valid_until: null, created_at: new Date('2026-07-14T00:00:00.000Z') }),
      baseAuthorization({ id: 'auth-prev-expired', source_driver_protocol_id: 'protocol-1', authorization_valid_until: new Date('2020-01-01T00:00:00.000Z'), created_at: new Date('2026-07-10T00:00:00.000Z') }),
    ]);

    const res = await request(app)
      .post('/api/admin/regulatory/cities/case-1/driver-protocols/protocol-2/generate-authorization')
      .send({});

    expect(res.status).toBe(201);
    expect(prismaMock.municipal_authorizations.create).toHaveBeenCalledTimes(1);
  });

  it('renovação bloqueia quando não existe autorização do ciclo anterior correspondente', async () => {
    prismaMock.municipal_regulatory_driver_protocols.findFirst.mockImplementation(async (args: any) => {
      if (args?.where?.id) return baseProtocol({ id: 'protocol-2', cycle_number: 2, renewal_of_protocol_id: 'protocol-1' });
      if (args?.where?.case_id && args?.where?.driver_id && args?.where?.service_modality) return baseProtocol({ id: 'protocol-2', cycle_number: 2, renewal_of_protocol_id: 'protocol-1' });
      return null;
    });
    prismaMock.municipal_authorizations.findMany.mockResolvedValue([
      baseAuthorization({ id: 'auth-unrelated', source_driver_protocol_id: 'protocol-x', authorization_valid_until: new Date('2020-01-01T00:00:00.000Z') }),
    ]);

    const res = await request(app)
      .post('/api/admin/regulatory/cities/case-1/driver-protocols/protocol-2/generate-authorization')
      .send({});

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('MUNICIPAL_RENEWAL_CURRENT_CYCLE_NOT_AUTHORIZED');
  });

  it('renovação bloqueia quando cycle>1 não referencia ciclo anterior', async () => {
    prismaMock.municipal_regulatory_driver_protocols.findFirst.mockImplementation(async (args: any) => {
      if (args?.where?.id) return baseProtocol({ id: 'protocol-2', cycle_number: 2, renewal_of_protocol_id: null });
      if (args?.where?.case_id && args?.where?.driver_id && args?.where?.service_modality) return baseProtocol({ id: 'protocol-2', cycle_number: 2, renewal_of_protocol_id: null });
      return null;
    });

    const res = await request(app)
      .post('/api/admin/regulatory/cities/case-1/driver-protocols/protocol-2/generate-authorization')
      .send({});

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('MUNICIPAL_RENEWAL_PREVIOUS_CYCLE_REQUIRED');
  });

  it('P2002 na autorização retorna idempotente', async () => {
    prismaMock.municipal_regulatory_driver_protocols.findFirst.mockImplementation(async (args: any) => {
      if (args?.where?.id) return baseProtocol({ id: 'protocol-2', cycle_number: 2, renewal_of_protocol_id: 'protocol-1' });
      if (args?.where?.case_id && args?.where?.driver_id && args?.where?.service_modality) return baseProtocol({ id: 'protocol-2', cycle_number: 2, renewal_of_protocol_id: 'protocol-1' });
      return null;
    });
    prismaMock.municipal_authorizations.findMany.mockResolvedValue([
      baseAuthorization({ id: 'auth-old', source_driver_protocol_id: 'protocol-1', authorization_valid_until: new Date('2020-01-01T00:00:00.000Z') }),
    ]);
    prismaMock.municipal_authorizations.create.mockRejectedValue({ code: 'P2002' });
    prismaMock.municipal_authorizations.findFirst.mockResolvedValue(
      baseAuthorization({ id: 'auth-2', source_driver_protocol_id: 'protocol-2', authorization_valid_until: null }),
    );

    const res = await request(app)
      .post('/api/admin/regulatory/cities/case-1/driver-protocols/protocol-2/generate-authorization')
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.data.idempotent).toBe(true);
  });

  it('nova autorização ACTIVE passa a ser selecionada pelo motor', async () => {
    prismaMock.municipal_regulatory_driver_protocols.findMany.mockResolvedValue([
      baseProtocol({ id: 'protocol-2', cycle_number: 2, renewal_of_protocol_id: 'protocol-1', created_at: new Date('2026-07-13T00:00:00.000Z') }),
      baseProtocol({ id: 'protocol-1', cycle_number: 1 }),
    ]);
    prismaMock.municipal_authorizations.findMany.mockResolvedValue([
      baseAuthorization({ id: 'auth-new', source_driver_protocol_id: 'protocol-2', authorization_valid_until: null, created_at: new Date('2026-07-13T00:00:00.000Z') }),
      baseAuthorization({ id: 'auth-old', source_driver_protocol_id: 'protocol-1', authorization_valid_until: new Date('2020-01-01T00:00:00.000Z'), created_at: new Date('2026-07-10T00:00:00.000Z') }),
    ]);

    const res = await request(app).get('/api/admin/regulatory/cities/case-1/driver-protocols');
    const cycle2 = res.body.data.items.find((item: any) => item.id === 'protocol-2');

    expect(cycle2.authorizationOperational.state).toBe('ACTIVE');
  });

  it('autorização antiga EXPIRED permanece no banco', async () => {
    const oldAuth = baseAuthorization({ id: 'auth-old', source_driver_protocol_id: 'protocol-1', authorization_valid_until: new Date('2020-01-01T00:00:00.000Z') });
    prismaMock.municipal_authorizations.findMany.mockResolvedValue([oldAuth]);

    await request(app)
      .post('/api/admin/regulatory/cities/case-1/driver-protocols/protocol-1/start-renewal')
      .send({});

    expect(prismaMock.municipal_authorizations.delete).toBeUndefined();
  });

  it('EXPIRING_SOON antiga + nova ACTIVE seleciona nova', async () => {
    prismaMock.municipal_regulatory_driver_protocols.findMany.mockResolvedValue([
      baseProtocol({ id: 'protocol-2', cycle_number: 2, renewal_of_protocol_id: 'protocol-1', created_at: new Date('2026-07-13T00:00:00.000Z') }),
      baseProtocol({ id: 'protocol-1', cycle_number: 1 }),
    ]);
    prismaMock.municipal_authorizations.findMany.mockResolvedValue([
      baseAuthorization({ id: 'auth-new', source_driver_protocol_id: 'protocol-2', authorization_valid_until: null, created_at: new Date('2026-07-13T00:00:00.000Z') }),
      baseAuthorization({ id: 'auth-old-expiring', source_driver_protocol_id: 'protocol-1', authorization_valid_until: new Date('2026-07-20T00:00:00.000Z'), created_at: new Date('2026-07-12T00:00:00.000Z') }),
    ]);

    const res = await request(app).get('/api/admin/regulatory/cities/case-1/driver-protocols');
    const cycle2 = res.body.data.items.find((item: any) => item.id === 'protocol-2');

    expect(cycle2.authorizationOperational.state).toBe('ACTIVE');
  });

  it('fallback legado source null associa ciclo 1 apenas em leitura', async () => {
    prismaMock.municipal_regulatory_driver_protocols.findMany.mockResolvedValue([
      baseProtocol({ id: 'protocol-2', cycle_number: 2, renewal_of_protocol_id: 'protocol-1', created_at: new Date('2026-07-13T00:00:00.000Z') }),
      baseProtocol({ id: 'protocol-1', cycle_number: 1 }),
    ]);
    prismaMock.municipal_authorizations.findMany.mockResolvedValue([
      baseAuthorization({ id: 'auth-legacy', source_driver_protocol_id: null, authorization_valid_until: new Date('2020-01-01T00:00:00.000Z') }),
    ]);

    const res = await request(app).get('/api/admin/regulatory/cities/case-1/driver-protocols');
    const cycle1 = res.body.data.items.find((item: any) => item.id === 'protocol-1');
    const cycle2 = res.body.data.items.find((item: any) => item.id === 'protocol-2');

    expect(cycle1.authorizationOperational.authorizationId).toBe('auth-legacy');
    expect(cycle2.authorizationOperational.authorizationId).toBeNull();
  });

  it('fallback legado source null habilita renovação no ciclo 1 quando vencida', async () => {
    prismaMock.municipal_regulatory_driver_protocols.findMany.mockResolvedValue([baseProtocol({ id: 'protocol-1', cycle_number: 1 })]);
    prismaMock.municipal_authorizations.findMany.mockResolvedValue([
      baseAuthorization({ id: 'auth-legacy', source_driver_protocol_id: null, authorization_valid_until: new Date('2020-01-01T00:00:00.000Z') }),
    ]);

    const res = await request(app).get('/api/admin/regulatory/cities/case-1/driver-protocols');
    const cycle1 = res.body.data.items.find((item: any) => item.id === 'protocol-1');

    expect(cycle1.renewalOperational.canStartRenewal).toBe(true);
  });

  it('não expõe URLs/documentos sensíveis', async () => {
    const res = await request(app).get('/api/admin/regulatory/cities/case-1/driver-protocols');
    const item = res.body.data.items[0];

    expect(item).not.toHaveProperty('authorization_document_url');
    expect(item).not.toHaveProperty('protocol_receipt_url');
    expect(item).not.toHaveProperty('cpf');
  });
});
