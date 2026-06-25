import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, authState } = vi.hoisted(() => ({
  prismaMock: {
    whatsapp_invite_logs: {
      count: vi.fn(),
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
  },
  authState: {
    admin: { id: 'super-admin', email: 'super@test.local', name: 'Super Admin', role: 'SUPER_ADMIN' },
    scope: null as any,
  },
}));

vi.mock('../src/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('../src/middlewares/auth', () => ({
  authenticateAdmin: (req: any, _res: any, next: any) => {
    req.admin = authState.admin;
    next();
  },
  requireRole: (allowedRoles: string[]) => (req: any, res: any, next: any) => {
    if (!allowedRoles.includes(req.admin.role)) {
      return res.status(403).json({ success: false, error: 'Acesso negado' });
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
vi.mock('../src/modules/whatsapp/whatsapp-client', () => ({
  getTwilioClient: vi.fn(),
  getWhatsAppFrom: vi.fn(),
  normalizeWhatsAppTo: vi.fn(),
}));
vi.mock('../src/utils/audit', () => ({ audit: vi.fn(), auditCtx: vi.fn() }));

const { default: adminWhatsappInvitesRoutes } = await import('../src/routes/admin-whatsapp-invites');

const app = express();
app.use(express.json());
app.use('/api/admin/whatsapp-invites', adminWhatsappInvitesRoutes);

function setAdmin(role: string, scope: any = null) {
  authState.admin = { id: `${role.toLowerCase()}-1`, email: `${role.toLowerCase()}@test.local`, name: role, role };
  authState.scope = scope;
}

describe('admin WhatsApp invite report scope', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAdmin('SUPER_ADMIN', null);
    prismaMock.whatsapp_invite_logs.count.mockResolvedValue(0);
    prismaMock.whatsapp_invite_logs.groupBy.mockResolvedValue([]);
    prismaMock.whatsapp_invite_logs.findMany.mockResolvedValue([]);
  });

  it('returns global scope and unfiltered aggregate counts for SUPER_ADMIN stats', async () => {
    prismaMock.whatsapp_invite_logs.count
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(52)
      .mockResolvedValueOnce(52);
    prismaMock.whatsapp_invite_logs.groupBy
      .mockResolvedValueOnce([{ invite_type: 'driver', _count: { _all: 43 } }, { invite_type: 'passenger', _count: { _all: 9 } }])
      .mockResolvedValueOnce([{ twilio_status: 'sent', _count: { _all: 52 } }]);

    const res = await request(app).get('/api/admin/whatsapp-invites/stats');

    expect(res.status).toBe(200);
    expect(res.body.scope).toEqual({ role: 'SUPER_ADMIN', global: true, territoryIdsApplied: [] });
    expect(res.body.data).toMatchObject({ today: 5, week: 52, month: 52 });
    expect(res.body.data.byType).toEqual({ driver: 43, passenger: 9 });
    expect(prismaMock.whatsapp_invite_logs.count).toHaveBeenCalledWith({ where: { created_at: { gte: expect.any(Date) } } });
    expect(prismaMock.whatsapp_invite_logs.count).not.toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ territory_id: expect.anything() }),
    }));
  });

  it('filters stats by territory for TERRITORIAL_MANAGER', async () => {
    setAdmin('TERRITORIAL_MANAGER', { territoryIds: ['territory-a'], neighborhoodIds: [], accessLevel: 'full' });

    const res = await request(app).get('/api/admin/whatsapp-invites/stats');

    expect(res.status).toBe(200);
    expect(res.body.scope).toEqual({ role: 'TERRITORIAL_MANAGER', global: false, territoryIdsApplied: ['territory-a'] });
    expect(prismaMock.whatsapp_invite_logs.count).toHaveBeenCalledWith({
      where: { territory_id: { in: ['territory-a'] }, created_at: { gte: expect.any(Date) } },
    });
  });

  it('does not apply territorial filters to SUPER_ADMIN logs and returns scope', async () => {
    prismaMock.whatsapp_invite_logs.findMany.mockResolvedValueOnce([
      { id: 'log-1', admin_id: 'maria', admin_role: 'TERRITORIAL_MANAGER', target_phone_normalized: '+5521999999999', invite_type: 'driver', channel: 'twilio_whatsapp', template_key: 'official_invite_driver', created_at: new Date('2026-06-25T12:00:00.000Z'), updated_at: new Date('2026-06-25T12:00:00.000Z') },
      { id: 'log-2', admin_id: 'fernanda', admin_role: 'TERRITORIAL_MANAGER', target_phone_normalized: '+5521888888888', invite_type: 'passenger', channel: 'twilio_whatsapp', template_key: 'official_invite_passenger', created_at: new Date('2026-06-25T11:00:00.000Z'), updated_at: new Date('2026-06-25T11:00:00.000Z') },
    ]);
    prismaMock.whatsapp_invite_logs.count.mockResolvedValueOnce(2);

    const res = await request(app).get('/api/admin/whatsapp-invites/logs?limit=50');

    expect(res.status).toBe(200);
    expect(res.body.scope).toEqual({ role: 'SUPER_ADMIN', global: true, territoryIdsApplied: [] });
    expect(res.body.data).toHaveLength(2);
    expect(prismaMock.whatsapp_invite_logs.findMany).toHaveBeenCalledWith({
      where: { created_at: { gte: expect.any(Date) } },
      orderBy: { created_at: 'desc' },
      skip: 0,
      take: 50,
    });
    expect(prismaMock.whatsapp_invite_logs.count).toHaveBeenCalledWith({ where: { created_at: { gte: expect.any(Date) } } });
    expect(prismaMock.whatsapp_invite_logs.findMany.mock.calls[0][0].where).not.toHaveProperty('territory_id');
  });

  it.each([
    ['today'],
    ['7d'],
    ['30d'],
  ])('applies %s period filter to SUPER_ADMIN logs without territory scope', async (period) => {
    await request(app).get(`/api/admin/whatsapp-invites/logs?limit=50&period=${period}`);

    const where = prismaMock.whatsapp_invite_logs.findMany.mock.calls[0][0].where;
    expect(where.created_at.gte).toBeInstanceOf(Date);
    expect(where).not.toHaveProperty('territory_id');
  });

  it('keeps territory scope when filtering TERRITORIAL_MANAGER logs by period', async () => {
    setAdmin('TERRITORIAL_MANAGER', { territoryIds: ['territory-a'], neighborhoodIds: [], accessLevel: 'full' });

    await request(app).get('/api/admin/whatsapp-invites/logs?limit=50&period=7d');

    expect(prismaMock.whatsapp_invite_logs.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        territory_id: { in: ['territory-a'] },
        created_at: { gte: expect.any(Date) },
      },
    }));
  });

  it('falls back to 30d for invalid log periods', async () => {
    await request(app).get('/api/admin/whatsapp-invites/logs?limit=50&period=invalid');

    const gte = prismaMock.whatsapp_invite_logs.findMany.mock.calls[0][0].where.created_at.gte;
    const ageDays = (Date.now() - gte.getTime()) / (24 * 60 * 60 * 1000);
    expect(ageDays).toBeGreaterThan(29);
    expect(ageDays).toBeLessThan(31);
  });
});
