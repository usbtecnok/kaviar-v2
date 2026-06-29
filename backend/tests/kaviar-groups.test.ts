import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.JWT_SECRET = 'test-secret';

const { prismaMock, authState, auditMock } = vi.hoisted(() => {
  const prismaMock: any = {
    kaviar_groups: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    kaviar_group_invites: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    kaviar_group_members: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    passengers: {
      findUnique: vi.fn(),
    },
    drivers: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(async (callback: any) => callback(prismaMock)),
  };

  return {
    prismaMock,
    auditMock: vi.fn(),
    authState: {
      admin: { id: 'admin-1', email: 'admin@test.local', name: 'Admin', role: 'SUPER_ADMIN' },
      scope: null as any,
      passenger: { id: 'passenger-1', name: 'Passageiro', phone: '21999990000' },
      driver: { id: 'driver-1', name: 'Motorista', phone: '21888880000' },
    },
  };
});

vi.mock('../src/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('../src/utils/audit', () => ({
  audit: auditMock,
  auditCtx: (req: any) => ({
    adminId: req.admin?.id || 'admin-1',
    adminEmail: req.admin?.email || 'admin@test.local',
    ip: '127.0.0.1',
    ua: 'vitest',
  }),
}));
vi.mock('../src/middlewares/territory-scope', () => ({
  applyTerritoryScope: (req: any, _res: any, next: any) => {
    req.territoryScope = authState.scope;
    next();
  },
}));
vi.mock('../src/middlewares/auth', () => ({
  authenticateAdmin: (req: any, _res: any, next: any) => {
    req.admin = authState.admin;
    req.adminId = authState.admin.id;
    next();
  },
  requireRole: (allowedRoles: string[]) => (req: any, res: any, next: any) => {
    if (!allowedRoles.includes(req.admin.role)) return res.status(403).json({ success: false, error: 'Acesso negado' });
    next();
  },
  authenticatePassenger: (req: any, _res: any, next: any) => {
    req.passenger = authState.passenger;
    req.passengerId = authState.passenger.id;
    req.userId = authState.passenger.id;
    next();
  },
  authenticateDriver: (req: any, _res: any, next: any) => {
    req.driver = authState.driver;
    req.driverId = authState.driver.id;
    req.userId = authState.driver.id;
    next();
  },
}));

const { default: adminGroupsRoutes } = await import('../src/routes/admin-groups');
const { default: groupInvitesRoutes } = await import('../src/routes/group-invites');
const { default: passengerGroupsRoutes } = await import('../src/routes/passenger-groups');
const { default: driverGroupsRoutes } = await import('../src/routes/driver-groups');

const app = express();
app.use(express.json());
app.use('/api/admin/groups', adminGroupsRoutes);
app.use('/api/groups', groupInvitesRoutes);
app.use('/api/passengers', passengerGroupsRoutes);
app.use('/api/drivers', driverGroupsRoutes);

function passengerAuth(id = 'passenger-1') {
  return `Bearer ${jwt.sign({ userType: 'PASSENGER', userId: id }, 'test-secret')}`;
}

function activeInvite(overrides: any = {}) {
  return {
    id: 'invite-1',
    code: 'GKV-TEST',
    group_id: 'group-1',
    status: 'active',
    max_uses: null,
    used_count: 0,
    expires_at: new Date(Date.now() + 60_000),
    created_by_admin_id: 'admin-1',
    group: {
      id: 'group-1',
      public_name: 'Grupo KAVIAR Centro',
      description: 'Mobilidade por convite',
      territory_id: 'territory-1',
      neighborhood_id: 'neighborhood-1',
    },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  authState.admin = { id: 'admin-1', email: 'admin@test.local', name: 'Admin', role: 'SUPER_ADMIN' };
  authState.scope = null;
  authState.passenger = { id: 'passenger-1', name: 'Passageiro', phone: '21999990000' };
  authState.driver = { id: 'driver-1', name: 'Motorista', phone: '21888880000' };
  prismaMock.passengers.findUnique.mockResolvedValue(authState.passenger);
  prismaMock.drivers.findUnique.mockResolvedValue(authState.driver);
  prismaMock.kaviar_group_invites.findUnique.mockResolvedValue(activeInvite());
  prismaMock.kaviar_group_members.findFirst.mockResolvedValue(null);
  prismaMock.kaviar_group_members.create.mockResolvedValue({ id: 'member-1', group_id: 'group-1', status: 'active', user_type: 'passenger' });
  prismaMock.kaviar_group_invites.update.mockResolvedValue({ id: 'invite-1', used_count: 1 });
  auditMock.mockResolvedValue(undefined);
});

describe('Grupo KAVIAR backend base', () => {
  it('cria grupo com tipo permitido', async () => {
    prismaMock.kaviar_groups.create.mockResolvedValue({ id: 'group-1', public_name: 'Grupo KAVIAR Centro', type: 'local_community', status: 'active' });

    const res = await request(app)
      .post('/api/admin/groups')
      .send({ public_name: 'Grupo KAVIAR Centro', type: 'local_community' });

    expect(res.status).toBe(201);
    expect(prismaMock.kaviar_groups.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ type: 'local_community', public_name: 'Grupo KAVIAR Centro' }),
    }));
  });

  it('rejeita tipo religious', async () => {
    const res = await request(app).post('/api/admin/groups').send({ public_name: 'Grupo KAVIAR', type: 'religious' });

    expect(res.status).toBe(400);
    expect(prismaMock.kaviar_groups.create).not.toHaveBeenCalled();
  });

  it('rejeita tipo inválido', async () => {
    const res = await request(app).post('/api/admin/groups').send({ public_name: 'Grupo KAVIAR', type: 'unknown' });

    expect(res.status).toBe(400);
    expect(prismaMock.kaviar_groups.create).not.toHaveBeenCalled();
  });

  it('bloqueia gestor territorial fora do escopo', async () => {
    authState.admin = { id: 'manager-1', email: 'manager@test.local', name: 'Manager', role: 'TERRITORIAL_MANAGER' };
    authState.scope = { territoryIds: ['territory-allowed'], neighborhoodIds: [], accessLevel: 'write' };
    prismaMock.kaviar_groups.findUnique.mockResolvedValue({ id: 'group-1', public_name: 'Grupo', territory_id: 'territory-outside', neighborhood_id: null });

    const res = await request(app).get('/api/admin/groups/group-1');

    expect(res.status).toBe(403);
  });

  it('não aceita convite expirado', async () => {
    prismaMock.kaviar_group_invites.findUnique.mockResolvedValue(activeInvite({ expires_at: new Date(Date.now() - 1_000) }));

    const res = await request(app)
      .post('/api/groups/invites/GKV-TEST/join')
      .set('Authorization', passengerAuth())
      .send({ consent: true });

    expect(res.status).toBe(410);
    expect(prismaMock.kaviar_group_members.create).not.toHaveBeenCalled();
  });

  it('não aceita convite revogado', async () => {
    prismaMock.kaviar_group_invites.findUnique.mockResolvedValue(activeInvite({ status: 'revoked' }));

    const res = await request(app)
      .post('/api/groups/invites/GKV-TEST/join')
      .set('Authorization', passengerAuth())
      .send({ consent: true });

    expect(res.status).toBe(410);
    expect(prismaMock.kaviar_group_members.create).not.toHaveBeenCalled();
  });

  it('não aceita convite com limite atingido', async () => {
    prismaMock.kaviar_group_invites.findUnique.mockResolvedValue(activeInvite({ max_uses: 2, used_count: 2 }));

    const res = await request(app)
      .post('/api/groups/invites/GKV-TEST/join')
      .set('Authorization', passengerAuth())
      .send({ consent: true });

    expect(res.status).toBe(410);
    expect(prismaMock.kaviar_group_members.create).not.toHaveBeenCalled();
  });

  it('exige consent=true para aceitar convite', async () => {
    const res = await request(app)
      .post('/api/groups/invites/GKV-TEST/join')
      .set('Authorization', passengerAuth())
      .send({ consent: false });

    expect(res.status).toBe(400);
    expect(prismaMock.kaviar_group_members.create).not.toHaveBeenCalled();
  });

  it('passageiro lista apenas seus grupos', async () => {
    prismaMock.kaviar_group_members.findMany.mockResolvedValue([]);

    const res = await request(app).get('/api/passengers/me/groups');

    expect(res.status).toBe(200);
    expect(prismaMock.kaviar_group_members.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { passenger_id: 'passenger-1', status: { not: 'removed' } },
    }));
  });

  it('motorista lista apenas seus grupos', async () => {
    prismaMock.kaviar_group_members.findMany.mockResolvedValue([]);

    const res = await request(app).get('/api/drivers/me/groups');

    expect(res.status).toBe(200);
    expect(prismaMock.kaviar_group_members.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { driver_id: 'driver-1', status: { not: 'removed' } },
    }));
  });

  it('aceite repetido é idempotente', async () => {
    prismaMock.kaviar_group_members.findFirst.mockResolvedValue({ id: 'member-1', group_id: 'group-1', status: 'active' });

    const res = await request(app)
      .post('/api/groups/invites/GKV-TEST/join')
      .set('Authorization', passengerAuth())
      .send({ consent: true });

    expect(res.status).toBe(200);
    expect(res.body.idempotent).toBe(true);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});
