import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, authState, auditMock } = vi.hoisted(() => {
  const prismaMock: any = {
    kaviar_groups: {
      findUnique: vi.fn(),
    },
    kaviar_group_responsible_invites: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    rides_v2: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };

  return {
    prismaMock,
    auditMock: vi.fn(),
    authState: {
      admin: { id: 'admin-1', email: 'admin@test.local', name: 'Admin', role: 'SUPER_ADMIN' },
      scope: null as any,
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
}));

const { default: adminGroupsRoutes } = await import('../src/routes/admin-groups');

const app = express();
app.use(express.json());
app.use('/api/admin/groups', adminGroupsRoutes);

function group(overrides: any = {}) {
  return {
    id: 'group-1',
    public_name: 'Grupo KAVIAR Centro',
    territory_id: 'territory-1',
    neighborhood_id: 'neighborhood-1',
    ...overrides,
  };
}

function responsibleInvite(overrides: any = {}) {
  return {
    id: 'resp-invite-1',
    group_id: 'group-1',
    code: 'GKR-ABC123XYZ9',
    status: 'active',
    max_uses: 1,
    used_count: 0,
    invited_by_admin_id: 'admin-1',
    accepted_by_member_id: null,
    accepted_by_passenger_id: null,
    consent_text_version: null,
    consent_given_at: null,
    accepted_at: null,
    expires_at: new Date(Date.now() + 3600_000),
    revoked_at: null,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  authState.admin = { id: 'admin-1', email: 'admin@test.local', name: 'Admin', role: 'SUPER_ADMIN' };
  authState.scope = null;

  prismaMock.kaviar_groups.findUnique.mockResolvedValue(group());
  prismaMock.kaviar_group_responsible_invites.findUnique.mockResolvedValue(null);
  prismaMock.kaviar_group_responsible_invites.findMany.mockResolvedValue([]);
  prismaMock.kaviar_group_responsible_invites.create.mockResolvedValue(responsibleInvite());
  prismaMock.kaviar_group_responsible_invites.update.mockResolvedValue(
    responsibleInvite({ status: 'revoked', revoked_at: new Date() })
  );

  auditMock.mockResolvedValue(undefined);
});

describe('Convite de Responsável do Grupo - admin', () => {
  it('SUPER_ADMIN cria convite de responsável', async () => {
    const res = await request(app)
      .post('/api/admin/groups/group-1/responsible-invites')
      .send({ expires_at: new Date(Date.now() + 3600_000).toISOString() });

    expect(res.status).toBe(201);
    expect(prismaMock.kaviar_group_responsible_invites.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          group_id: 'group-1',
          status: 'active',
          max_uses: 1,
          used_count: 0,
          invited_by_admin_id: 'admin-1',
        }),
      })
    );
  });

  it('TERRITORIAL_MANAGER cria convite apenas dentro do escopo', async () => {
    authState.admin = { id: 'manager-1', email: 'manager@test.local', name: 'Manager', role: 'TERRITORIAL_MANAGER' };
    authState.scope = { territoryIds: ['territory-1'], neighborhoodIds: [], accessLevel: 'write' };

    const res = await request(app)
      .post('/api/admin/groups/group-1/responsible-invites')
      .send({ expires_at: new Date(Date.now() + 3600_000).toISOString() });

    expect(res.status).toBe(201);
  });

  it('TERRITORIAL_MANAGER fora do escopo recebe 403', async () => {
    authState.admin = { id: 'manager-1', email: 'manager@test.local', name: 'Manager', role: 'TERRITORIAL_MANAGER' };
    authState.scope = { territoryIds: ['territory-999'], neighborhoodIds: [], accessLevel: 'write' };

    const res = await request(app)
      .post('/api/admin/groups/group-1/responsible-invites')
      .send({ expires_at: new Date(Date.now() + 3600_000).toISOString() });

    expect(res.status).toBe(403);
    expect(prismaMock.kaviar_group_responsible_invites.create).not.toHaveBeenCalled();
  });

  it('convite criado tem max_uses 1 e used_count 0', async () => {
    const res = await request(app)
      .post('/api/admin/groups/group-1/responsible-invites')
      .send({ expires_at: new Date(Date.now() + 3600_000).toISOString() });

    expect(res.status).toBe(201);
    expect(res.body.data.max_uses).toBe(1);
    expect(res.body.data.used_count).toBe(0);
  });

  it('não permite expires_at no passado', async () => {
    const res = await request(app)
      .post('/api/admin/groups/group-1/responsible-invites')
      .send({ expires_at: new Date(Date.now() - 10_000).toISOString() });

    expect(res.status).toBe(400);
    expect(prismaMock.kaviar_group_responsible_invites.create).not.toHaveBeenCalled();
  });

  it('lista convites do grupo', async () => {
    prismaMock.kaviar_group_responsible_invites.findMany.mockResolvedValue([
      responsibleInvite({ id: 'resp-invite-1' }),
      responsibleInvite({ id: 'resp-invite-2', status: 'revoked' }),
    ]);

    const res = await request(app).get('/api/admin/groups/group-1/responsible-invites');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(prismaMock.kaviar_group_responsible_invites.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { group_id: 'group-1' } })
    );
  });

  it('revoga convite ativo', async () => {
    prismaMock.kaviar_group_responsible_invites.findUnique.mockResolvedValue(
      responsibleInvite({ group: group() })
    );

    const res = await request(app).patch('/api/admin/groups/group-1/responsible-invites/resp-invite-1/revoke');

    expect(res.status).toBe(200);
    expect(prismaMock.kaviar_group_responsible_invites.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'resp-invite-1' },
        data: expect.objectContaining({ status: 'revoked' }),
      })
    );
  });

  it('não revoga convite de outro grupo', async () => {
    prismaMock.kaviar_group_responsible_invites.findUnique.mockResolvedValue(
      responsibleInvite({ group_id: 'group-2', group: group({ id: 'group-2' }) })
    );

    const res = await request(app).patch('/api/admin/groups/group-1/responsible-invites/resp-invite-1/revoke');

    expect(res.status).toBe(404);
    expect(prismaMock.kaviar_group_responsible_invites.update).not.toHaveBeenCalled();
  });

  it('TERRITORIAL_OPERATOR não cria convite', async () => {
    authState.admin = { id: 'operator-1', email: 'operator@test.local', name: 'Operator', role: 'TERRITORIAL_OPERATOR' };

    const res = await request(app)
      .post('/api/admin/groups/group-1/responsible-invites')
      .send({ expires_at: new Date(Date.now() + 3600_000).toISOString() });

    expect(res.status).toBe(403);
    expect(prismaMock.kaviar_group_responsible_invites.create).not.toHaveBeenCalled();
  });

  it('não toca rides_v2', async () => {
    await request(app)
      .post('/api/admin/groups/group-1/responsible-invites')
      .send({ expires_at: new Date(Date.now() + 3600_000).toISOString() });

    expect(prismaMock.rides_v2.findMany).not.toHaveBeenCalled();
    expect(prismaMock.rides_v2.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.rides_v2.create).not.toHaveBeenCalled();
    expect(prismaMock.rides_v2.update).not.toHaveBeenCalled();
  });
});
