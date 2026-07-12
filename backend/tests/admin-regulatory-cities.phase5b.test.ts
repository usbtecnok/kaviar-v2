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
    drivers: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    municipal_regulations: {
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
  requireSuperAdmin: (_req: any, _res: any, next: any) => next(),
}));

const { default: adminRegulatoryCitiesRoutes } = await import('../src/routes/admin-regulatory-cities');

const app = express();
app.use(express.json());
app.use('/api/admin', adminRegulatoryCitiesRoutes);

beforeEach(() => {
  vi.clearAllMocks();

  prismaMock.municipal_regulatory_cases.findUnique.mockResolvedValue({
    id: 'case-1',
    city: 'Santa Rita do Passa Quatro',
    state: 'SP',
  });

  prismaMock.municipal_regulatory_driver_protocols.findMany.mockResolvedValue([]);
  prismaMock.municipal_regulatory_driver_protocols.findFirst.mockResolvedValue(null);
  prismaMock.municipal_regulatory_driver_protocols.create.mockResolvedValue({ id: 'protocol-1', driver_id: 'driver-1' });

  prismaMock.drivers.findMany.mockResolvedValue([]);
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
    ],
  });

  prismaMock.municipal_regulations.findMany.mockResolvedValue([
    {
      service_modality: 'CAR',
      requirements: [
        { is_required: true, document_type: 'CNH' },
      ],
    },
  ]);

  prismaMock.driver_documents.findMany.mockResolvedValue([
    {
      driver_id: 'driver-1',
      type: 'CNH',
      status: 'SUBMITTED',
      document_url: 'https://private-url/doc.png',
      file_url: 'https://private-url/file.png',
    },
  ]);
});

describe('admin regulatory cities - fase 5B', () => {
  it('POST from-driver recalcula gate e bloqueia criação mesmo com payload manipulado no frontend', async () => {
    prismaMock.drivers.findUnique.mockResolvedValue({
      id: 'driver-1',
      name: 'Joao da Silva',
      document_cpf: '123.456.789-01',
      vehicle_plate: 'ABC1234',
      vehicle_type: 'CAR',
      neighborhoods: {
        city: 'Campinas',
        territory: { uf: 'SP' },
      },
      driver_modalities: [
        { modality: 'CAR', status: 'APPROVED', vehicle_plate: 'ABC1234' },
      ],
    });

    const res = await request(app)
      .post('/api/admin/regulatory/cities/case-1/driver-protocols/from-driver')
      .send({
        driverId: 'driver-1',
        compatibility: { compatible: true, status: 'COMPATIBLE' },
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('DRIVER_CITY_INCOMPATIBLE');
    expect(res.body.compatibility?.status).toBe('INCOMPATIBLE');
    expect(prismaMock.municipal_regulatory_driver_protocols.create).not.toHaveBeenCalled();
  });

  it('GET driver-candidates não expõe CPF completo no payload', async () => {
    prismaMock.drivers.findMany.mockResolvedValue([
      {
        id: 'driver-1',
        name: 'Joao da Silva',
        phone: '+55 (11) 98888-7777',
        status: 'approved',
        document_cpf: '123.456.789-01',
        vehicle_plate: 'ABC1234',
        vehicle_type: 'CAR',
        neighborhoods: {
          city: 'Santa Rita do Passa Quatro',
          territory: { uf: 'SP' },
        },
        driver_modalities: [
          { modality: 'CAR', status: 'APPROVED' },
        ],
      },
    ]);

    const res = await request(app)
      .get('/api/admin/regulatory/cities/case-1/driver-candidates')
      .query({ q: 'joa', limit: 25 });

    expect(res.status).toBe(200);
    const item = res.body?.data?.items?.[0];
    expect(item).toBeTruthy();
    expect(item.cpfLast4).toBe('8901');
    expect(item.document_cpf).toBeUndefined();
    expect(JSON.stringify(item)).not.toContain('123.456.789-01');
    expect(JSON.stringify(item)).not.toContain('12345678901');
  });

  it('GET driver-candidates não expõe document_url nem file_url no payload', async () => {
    prismaMock.drivers.findMany.mockResolvedValue([
      {
        id: 'driver-1',
        name: 'Joao da Silva',
        phone: '+55 (11) 98888-7777',
        status: 'approved',
        document_cpf: '123.456.789-01',
        vehicle_plate: 'ABC1234',
        vehicle_type: 'CAR',
        neighborhoods: {
          city: 'Santa Rita do Passa Quatro',
          territory: { uf: 'SP' },
        },
        driver_modalities: [
          { modality: 'CAR', status: 'APPROVED' },
        ],
      },
    ]);

    const res = await request(app)
      .get('/api/admin/regulatory/cities/case-1/driver-candidates')
      .query({ q: 'joa', limit: 25 });

    expect(res.status).toBe(200);
    const bodyAsText = JSON.stringify(res.body);
    expect(bodyAsText).not.toContain('document_url');
    expect(bodyAsText).not.toContain('file_url');
    expect(bodyAsText).not.toContain('https://private-url');
  });
});
