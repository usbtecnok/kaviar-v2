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
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    kaviar_group_posts: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    kaviar_group_post_reads: {
      findFirst: vi.fn(),
      upsert: vi.fn(),
    },
    passengers: {
      findUnique: vi.fn(),
    },
    drivers: {
      findUnique: vi.fn(),
    },
    rides_v2: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
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
const { default: passengerGroupsRoutes } = await import('../src/routes/passenger-groups');

const app = express();
app.use(express.json());
app.use('/api/admin/groups', adminGroupsRoutes);
app.use('/api/passengers', passengerGroupsRoutes);

function passengerAuth(id = 'passenger-1') {
  return `Bearer ${jwt.sign({ userType: 'PASSENGER', userId: id }, 'test-secret')}`;
}

function adminGroup() {
  return {
    id: 'group-1',
    public_name: 'Grupo KAVIAR Centro',
    description: 'Mobilidade por convite',
    type: 'private_group',
    status: 'active',
    territory_id: 'territory-1',
    neighborhood_id: 'neighborhood-1',
  };
}

function activeMembership() {
  return {
    id: 'member-1',
    group_id: 'group-1',
    passenger_id: 'passenger-1',
    status: 'active',
  };
}

function publishedPost(overrides: any = {}) {
  return {
    id: 'post-1',
    group_id: 'group-1',
    author_type: 'admin',
    author_admin_id: 'admin-1',
    author_member_id: null,
    author_display_name_snapshot: 'Admin',
    title: 'Comunicado',
    body: 'Mensagem do mural',
    category: 'general',
    is_pinned: false,
    status: 'published',
    published_at: new Date('2026-06-29T10:00:00.000Z'),
    expires_at: null,
    created_at: new Date('2026-06-29T10:00:00.000Z'),
    updated_at: new Date('2026-06-29T10:00:00.000Z'),
    _count: { reads: 0 },
    reads: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  authState.admin = { id: 'admin-1', email: 'admin@test.local', name: 'Admin', role: 'SUPER_ADMIN' };
  authState.scope = null;
  authState.passenger = { id: 'passenger-1', name: 'Passageiro', phone: '21999990000' };
  authState.driver = { id: 'driver-1', name: 'Motorista', phone: '21888880000' };
  prismaMock.kaviar_groups.findUnique.mockResolvedValue(adminGroup());
  prismaMock.kaviar_group_posts.findMany.mockResolvedValue([publishedPost()]);
  prismaMock.kaviar_group_posts.findFirst.mockResolvedValue(publishedPost());
  prismaMock.kaviar_group_posts.create.mockResolvedValue(publishedPost({ id: 'post-created' }));
  prismaMock.kaviar_group_posts.update.mockResolvedValue(publishedPost({ id: 'post-updated', is_pinned: true, status: 'archived' }));
  prismaMock.kaviar_group_members.findFirst.mockResolvedValue(activeMembership());
  prismaMock.kaviar_group_members.count.mockResolvedValue(1);
  prismaMock.kaviar_group_post_reads.upsert.mockResolvedValue({ id: 'read-1', post_id: 'post-1', member_id: 'member-1', read_at: new Date('2026-06-29T12:00:00.000Z') });
  auditMock.mockResolvedValue(undefined);
});

describe('Mural do Grupo KAVIAR', () => {
  it('SUPER_ADMIN cria post em grupo', async () => {
    const res = await request(app)
      .post('/api/admin/groups/group-1/posts')
      .send({ title: 'Aviso', body: 'Texto do aviso', category: 'important', is_pinned: true });

    expect(res.status).toBe(201);
    expect(prismaMock.kaviar_group_posts.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        group_id: 'group-1',
        author_type: 'admin',
        author_admin_id: 'admin-1',
        title: 'Aviso',
        body: 'Texto do aviso',
        category: 'important',
        is_pinned: true,
        status: 'published',
      }),
    }));
    expect(prismaMock.rides_v2.findMany).not.toHaveBeenCalled();
    expect(prismaMock.rides_v2.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.rides_v2.create).not.toHaveBeenCalled();
    expect(prismaMock.rides_v2.update).not.toHaveBeenCalled();
  });

  it('lista posts admin com read_count agregado', async () => {
    prismaMock.kaviar_group_posts.findMany.mockResolvedValue([
      publishedPost({ id: 'post-1', _count: { reads: 3 } }),
      publishedPost({ id: 'post-2', _count: { reads: 0 }, is_pinned: true }),
    ]);

    const res = await request(app).get('/api/admin/groups/group-1/posts');

    expect(res.status).toBe(200);
    expect(res.body.data[0].read_count).toBe(3);
    expect(res.body.data[0].active_members_count).toBe(1);
    expect(prismaMock.kaviar_group_posts.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { group_id: 'group-1' },
      include: { _count: { select: { reads: true } } },
    }));
    expect(prismaMock.kaviar_group_members.count).toHaveBeenCalledWith({
      where: { group_id: 'group-1', status: 'active' },
    });
  });

  it('passageiro membro ativo lista posts publicados', async () => {
    prismaMock.kaviar_group_posts.findMany.mockResolvedValue([
      publishedPost({ id: 'post-published', reads: [{ read_at: new Date('2026-06-29T12:00:00.000Z') }] }),
      publishedPost({ id: 'post-archived', status: 'archived' }),
      publishedPost({ id: 'post-expired', expires_at: new Date('2026-06-28T10:00:00.000Z') }),
    ]);

    const res = await request(app)
      .get('/api/passengers/me/groups/group-1/posts')
      .set('Authorization', passengerAuth());

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe('post-published');
    expect(prismaMock.kaviar_group_posts.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        group_id: 'group-1',
        status: 'published',
      }),
    }));
  });

  it('passageiro fora do grupo recebe 403', async () => {
    prismaMock.kaviar_group_members.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/passengers/me/groups/group-1/posts')
      .set('Authorization', passengerAuth());

    expect(res.status).toBe(403);
  });

  it('passageiro marca como ciente', async () => {
    const res = await request(app)
      .post('/api/passengers/me/groups/group-1/posts/post-1/read')
      .set('Authorization', passengerAuth());

    expect(res.status).toBe(200);
    expect(prismaMock.kaviar_group_post_reads.upsert).toHaveBeenCalledTimes(1);
    expect(prismaMock.kaviar_group_post_reads.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        post_id_member_id: {
          post_id: 'post-1',
          member_id: 'member-1',
        },
      },
    }));
  });

  it('marcar como ciente duas vezes não duplica', async () => {
    await request(app)
      .post('/api/passengers/me/groups/group-1/posts/post-1/read')
      .set('Authorization', passengerAuth());

    const res = await request(app)
      .post('/api/passengers/me/groups/group-1/posts/post-1/read')
      .set('Authorization', passengerAuth());

    expect(res.status).toBe(200);
    expect(prismaMock.kaviar_group_post_reads.upsert).toHaveBeenCalledTimes(2);
  });

  it('post arquivado não aparece para passageiro', async () => {
    prismaMock.kaviar_group_posts.findMany.mockResolvedValue([
      publishedPost({ id: 'post-visible' }),
      publishedPost({ id: 'post-archived', status: 'archived' }),
    ]);

    const res = await request(app)
      .get('/api/passengers/me/groups/group-1/posts')
      .set('Authorization', passengerAuth());

    expect(res.status).toBe(200);
    expect(res.body.data.map((post: any) => post.id)).toEqual(['post-visible']);
  });

  it('post fixado aparece primeiro', async () => {
    prismaMock.kaviar_group_posts.findMany.mockResolvedValue([
      publishedPost({ id: 'post-normal', is_pinned: false, published_at: new Date('2026-06-29T12:00:00.000Z') }),
      publishedPost({ id: 'post-pinned', is_pinned: true, published_at: new Date('2026-06-29T11:00:00.000Z') }),
    ]);

    const res = await request(app).get('/api/admin/groups/group-1/posts');

    expect(res.status).toBe(200);
    expect(res.body.data[0].is_pinned).toBe(false);
    expect(prismaMock.kaviar_group_posts.findMany).toHaveBeenCalledWith(expect.objectContaining({
      orderBy: [
        { is_pinned: 'desc' },
        { published_at: 'desc' },
        { created_at: 'desc' },
      ],
    }));
  });

  it('post expirado não aparece para passageiro', async () => {
    prismaMock.kaviar_group_posts.findMany.mockResolvedValue([
      publishedPost({ id: 'post-expired', expires_at: new Date('2026-06-28T10:00:00.000Z') }),
      publishedPost({ id: 'post-visible' }),
    ]);

    const res = await request(app)
      .get('/api/passengers/me/groups/group-1/posts')
      .set('Authorization', passengerAuth());

    expect(res.status).toBe(200);
    expect(res.body.data.map((post: any) => post.id)).toEqual(['post-visible']);
  });

  it('não toca rides_v2', async () => {
    await request(app)
      .get('/api/passengers/me/groups/group-1/posts')
      .set('Authorization', passengerAuth());

    expect(prismaMock.rides_v2.findMany).not.toHaveBeenCalled();
    expect(prismaMock.rides_v2.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.rides_v2.create).not.toHaveBeenCalled();
    expect(prismaMock.rides_v2.update).not.toHaveBeenCalled();
  });
});
