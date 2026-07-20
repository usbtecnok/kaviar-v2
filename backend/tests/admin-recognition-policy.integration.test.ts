import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const DB_URL =
  process.env.DATABASE_URL ||
  'postgresql://finance:finance@127.0.0.1:55432/finance_phase1c_a2_test?schema=public';
const JWT_SECRET = 'rp-integration-secret';

process.env.DATABASE_URL = DB_URL;
process.env.JWT_SECRET = JWT_SECRET;
process.env.ADMIN_JWT_SECRET = JWT_SECRET;

const ids = {
  superAdmin: 'rp-super-admin',
  financeAdmin: 'rp-finance-admin',
  territory: 'rp-territory-sp',
  territory2: 'rp-territory-rj',
  costCenter1: 'rp-cc-001',
  costCenter2: 'rp-cc-002',
};

let app: express.Express;
let prisma: any;
let pool: any;
let seq = 0;

function nextCode() {
  seq += 1;
  return `TRP.${String(seq).padStart(4, '0')}`;
}

function tokenFor(adminId: string) {
  return jwt.sign({ userId: adminId, userType: 'ADMIN', email: `${adminId}@test.local` }, JWT_SECRET, { expiresIn: '1h' });
}

function authHeader(adminId: string) {
  return { Authorization: `Bearer ${tokenFor(adminId)}` };
}

async function ensureAuditTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id SERIAL PRIMARY KEY,
      admin_id TEXT NOT NULL,
      admin_email TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      old_value JSONB,
      new_value JSONB,
      reason TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

async function assertSeedPoliciesIntact() {
  const seedCodes = [
    'ride_revenue.default',
    'prepaid_driver_credits.default',
    'manager_payments.default',
    'commercial_payments.default',
    'other.default',
  ];
  for (const code of seedCodes) {
    const p = await prisma.financial_recognition_policies.findUnique({ where: { code }, select: { code: true, status: true, policy: true } });
    expect(p, `Seed policy ${code} não encontrada`).not.toBeNull();
    expect(p!.status, `Seed policy ${code} não deve estar APPROVED`).toBe('DRAFT');
    expect(p!.policy, `Seed policy ${code} não deve estar classificada`).toBe('UNCLASSIFIED');
  }
}

async function createPolicyFixture(overrides: any = {}) {
  return prisma.financial_recognition_policies.create({
    data: {
      id: `frp-fixture-${seq + 1}`,
      code: nextCode(),
      subject: 'OTHER',
      scope_type: 'GLOBAL',
      territory_id: null,
      cost_center_id: null,
      city: null,
      state: null,
      policy: 'GROSS_PRINCIPAL',
      status: 'DRAFT',
      effective_from: new Date('2026-01-01'),
      effective_until: null,
      reason: 'Fixture para testes de integração',
      notes: null,
      approved_by_admin_id: null,
      approved_at: null,
      created_by_admin_id: ids.superAdmin,
      updated_by_admin_id: ids.superAdmin,
      ...overrides,
    },
  });
}

async function latestAudit(action: string, entityId: string) {
  const result = await pool.query(
    'SELECT admin_id, action, entity_type, entity_id, old_value, new_value FROM admin_audit_logs WHERE action = $1 AND entity_id = $2 ORDER BY id DESC LIMIT 1',
    [action, entityId],
  );
  return result.rows[0] || null;
}

async function cleanupTestFixtures() {
  await pool.query('DELETE FROM admin_audit_logs WHERE admin_id = ANY($1::text[])', [[ids.superAdmin, ids.financeAdmin]]);
  await prisma.financial_recognition_policies.deleteMany({
    where: {
      OR: [
        { id: { startsWith: 'frp-fixture-' } },
        { code: { startsWith: 'TRP.' } },
      ],
    },
  });
  await prisma.financial_cost_centers.deleteMany({ where: { id: { in: [ids.costCenter1, ids.costCenter2] } } });
  await prisma.operational_territories.deleteMany({ where: { id: { in: [ids.territory, ids.territory2] } } });
  await prisma.admins.deleteMany({ where: { id: { in: [ids.superAdmin, ids.financeAdmin] } } });
}

beforeAll(async () => {
  const appModule = await import('../src/app');
  const prismaModule = await import('../src/lib/prisma');
  const dbModule = await import('../src/db');
  app = appModule.default;
  prisma = prismaModule.prisma;
  pool = dbModule.pool;
  await prisma.$connect();
  await ensureAuditTable();
  await cleanupTestFixtures();
  await prisma.admins.createMany({
    data: [
      { id: ids.superAdmin, name: 'RP Super Admin', email: 'rp-super@test.local', password: 'x', role: 'SUPER_ADMIN', is_active: true, must_change_password: false },
      { id: ids.financeAdmin, name: 'RP Finance Admin', email: 'rp-finance@test.local', password: 'x', role: 'FINANCE', is_active: true, must_change_password: false },
    ],
  });
  await prisma.operational_territories.create({
    data: { id: ids.territory, name: 'SP Test', level: 'city', status: 'active', city_name: 'São Paulo', uf: 'SP', is_active: true },
  });
  await prisma.operational_territories.create({
    data: { id: ids.territory2, name: 'RJ Test', level: 'city', status: 'active', city_name: 'Rio de Janeiro', uf: 'RJ', is_active: true },
  });
  await prisma.financial_cost_centers.createMany({
    data: [
      { id: ids.costCenter1, code: 'CC.TEST.001', name: 'Cost Center Test 1', type: 'DEPARTMENT', is_active: true, created_by_admin_id: ids.superAdmin, updated_by_admin_id: ids.superAdmin },
      { id: ids.costCenter2, code: 'CC.TEST.002', name: 'Cost Center Test 2', type: 'DEPARTMENT', is_active: true, created_by_admin_id: ids.superAdmin, updated_by_admin_id: ids.superAdmin },
    ],
  });
});

afterAll(async () => {
  await cleanupTestFixtures();
  await prisma.$disconnect();
});

// ─── Criação ─────────────────────────────────────────────────────────────────
describe('admin recognition policy — criação', () => {
  it('cria policy DRAFT via SUPER_ADMIN', async () => {
    const res = await request(app)
      .post('/api/admin/finance/recognition-policies')
      .set(authHeader(ids.superAdmin))
      .send({
        code: nextCode(),
        subject: 'RIDE_REVENUE',
        scope_type: 'GLOBAL',
        policy: 'GROSS_PRINCIPAL',
        effective_from: '2026-01-01',
        reason: 'Teste de criação',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('DRAFT');
    expect(res.body.data.approved_by_admin).toBeNull();
    expect(res.body.data.approved_at).toBeNull();
  });

  it('rejeita status no body', async () => {
    const res = await request(app)
      .post('/api/admin/finance/recognition-policies')
      .set(authHeader(ids.superAdmin))
      .send({
        code: nextCode(),
        subject: 'OTHER',
        scope_type: 'GLOBAL',
        policy: 'GROSS_PRINCIPAL',
        effective_from: '2026-01-01',
        reason: 'Test',
        status: 'APPROVED',
      });

    expect(res.status).toBe(400);
  });

  it('rejeita approved_by_admin_id no body', async () => {
    const res = await request(app)
      .post('/api/admin/finance/recognition-policies')
      .set(authHeader(ids.superAdmin))
      .send({
        code: nextCode(),
        subject: 'OTHER',
        scope_type: 'GLOBAL',
        policy: 'GROSS_PRINCIPAL',
        effective_from: '2026-01-01',
        reason: 'Test',
        approved_by_admin_id: ids.superAdmin,
      });

    expect(res.status).toBe(400);
  });

  it('rejeita approved_at no body', async () => {
    const res = await request(app)
      .post('/api/admin/finance/recognition-policies')
      .set(authHeader(ids.superAdmin))
      .send({
        code: nextCode(),
        subject: 'OTHER',
        scope_type: 'GLOBAL',
        policy: 'GROSS_PRINCIPAL',
        effective_from: '2026-01-01',
        reason: 'Test',
        approved_at: new Date().toISOString(),
      });

    expect(res.status).toBe(400);
  });

  it('rejeita escopo TERRITORY sem territory_id', async () => {
    const res = await request(app)
      .post('/api/admin/finance/recognition-policies')
      .set(authHeader(ids.superAdmin))
      .send({
        code: nextCode(),
        subject: 'OTHER',
        scope_type: 'TERRITORY',
        policy: 'GROSS_PRINCIPAL',
        effective_from: '2026-01-01',
        reason: 'Test',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('territory_id');
  });

  it('rejeita escopo CITY sem state', async () => {
    const res = await request(app)
      .post('/api/admin/finance/recognition-policies')
      .set(authHeader(ids.superAdmin))
      .send({
        code: nextCode(),
        subject: 'OTHER',
        scope_type: 'CITY',
        policy: 'GROSS_PRINCIPAL',
        effective_from: '2026-01-01',
        reason: 'Test',
        city: 'São Paulo',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('state');
  });

  it('rejeita escopo GLOBAL com territory_id', async () => {
    const res = await request(app)
      .post('/api/admin/finance/recognition-policies')
      .set(authHeader(ids.superAdmin))
      .send({
        code: nextCode(),
        subject: 'OTHER',
        scope_type: 'GLOBAL',
        policy: 'GROSS_PRINCIPAL',
        effective_from: '2026-01-01',
        reason: 'Test',
        territory_id: ids.territory,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('territory_id');
  });

  it('rejeita effective_until anterior a effective_from', async () => {
    const res = await request(app)
      .post('/api/admin/finance/recognition-policies')
      .set(authHeader(ids.superAdmin))
      .send({
        code: nextCode(),
        subject: 'OTHER',
        scope_type: 'GLOBAL',
        policy: 'GROSS_PRINCIPAL',
        effective_from: '2026-06-01',
        effective_until: '2026-01-01',
        reason: 'Test',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('effective_until');
  });

  it('rejeita code duplicado', async () => {
    const code = nextCode();
    await createPolicyFixture({ code });

    const res = await request(app)
      .post('/api/admin/finance/recognition-policies')
      .set(authHeader(ids.superAdmin))
      .send({
        code,
        subject: 'OTHER',
        scope_type: 'GLOBAL',
        policy: 'GROSS_PRINCIPAL',
        effective_from: '2026-01-01',
        reason: 'Test',
      });

    expect(res.status).toBe(409);
  });

  it('FINANCE não pode criar', async () => {
    const res = await request(app)
      .post('/api/admin/finance/recognition-policies')
      .set(authHeader(ids.financeAdmin))
      .send({
        code: nextCode(),
        subject: 'OTHER',
        scope_type: 'GLOBAL',
        policy: 'GROSS_PRINCIPAL',
        effective_from: '2026-01-01',
        reason: 'Test',
      });

    expect(res.status).toBe(403);
  });

  it('sem autenticação → 401', async () => {
    const res = await request(app)
      .post('/api/admin/finance/recognition-policies')
      .send({ code: nextCode(), subject: 'OTHER', scope_type: 'GLOBAL', policy: 'GROSS_PRINCIPAL', effective_from: '2026-01-01', reason: 'x' });

    expect(res.status).toBe(401);
  });
});

// ─── Edição de DRAFT ─────────────────────────────────────────────────────────
describe('admin recognition policy — edição DRAFT', () => {
  it('edita DRAFT com SUPER_ADMIN e optimistic locking', async () => {
    const policy = await createPolicyFixture();

    const res = await request(app)
      .patch(`/api/admin/finance/recognition-policies/${policy.id}`)
      .set(authHeader(ids.superAdmin))
      .send({ expected_updated_at: policy.updated_at.toISOString(), reason: 'Motivo atualizado' });

    expect(res.status).toBe(200);
    expect(res.body.data.reason).toBe('Motivo atualizado');
  });

  it('rejeita edição de policy APPROVED', async () => {
    const policy = await createPolicyFixture({
      status: 'APPROVED',
      approved_by_admin_id: ids.superAdmin,
      approved_at: new Date(),
      effective_from: new Date('2020-01-01'),
      effective_until: new Date('2020-12-31'),
    });

    const res = await request(app)
      .patch(`/api/admin/finance/recognition-policies/${policy.id}`)
      .set(authHeader(ids.superAdmin))
      .send({ expected_updated_at: policy.updated_at.toISOString(), reason: 'Tentativa' });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('DRAFT');
  });

  it('optimistic locking retorna 409 com expected_updated_at errado', async () => {
    const policy = await createPolicyFixture();

    const res = await request(app)
      .patch(`/api/admin/finance/recognition-policies/${policy.id}`)
      .set(authHeader(ids.superAdmin))
      .send({ expected_updated_at: new Date('2020-01-01').toISOString(), reason: 'Conflito' });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('expected_updated_at');
  });

  it('FINANCE não pode editar', async () => {
    const policy = await createPolicyFixture();

    const res = await request(app)
      .patch(`/api/admin/finance/recognition-policies/${policy.id}`)
      .set(authHeader(ids.financeAdmin))
      .send({ expected_updated_at: policy.updated_at.toISOString(), reason: 'Test' });

    expect(res.status).toBe(403);
  });

  it('rejeita campos de aprovação no body do PATCH', async () => {
    const policy = await createPolicyFixture();

    const res = await request(app)
      .patch(`/api/admin/finance/recognition-policies/${policy.id}`)
      .set(authHeader(ids.superAdmin))
      .send({
        expected_updated_at: policy.updated_at.toISOString(),
        approved_by_admin_id: ids.superAdmin,
      });

    expect(res.status).toBe(400);
  });

  it('rejeita status no body do PATCH', async () => {
    const policy = await createPolicyFixture();

    const res = await request(app)
      .patch(`/api/admin/finance/recognition-policies/${policy.id}`)
      .set(authHeader(ids.superAdmin))
      .send({ expected_updated_at: policy.updated_at.toISOString(), status: 'APPROVED' });

    expect(res.status).toBe(400);
  });
});

// ─── Aprovação ────────────────────────────────────────────────────────────────
describe('admin recognition policy — aprovação', () => {
  it('aprova DRAFT classificada e preenche approved_by_admin e approved_at', async () => {
    const policy = await createPolicyFixture({ policy: 'GROSS_PRINCIPAL' });

    const res = await request(app)
      .post(`/api/admin/finance/recognition-policies/${policy.id}/approve`)
      .set(authHeader(ids.superAdmin))
      .send({ expected_updated_at: policy.updated_at.toISOString(), reason: 'Aprovação de teste' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('APPROVED');
    expect(res.body.data.approved_by_admin).not.toBeNull();
    expect(res.body.data.approved_by_admin.id).toBe(ids.superAdmin);
    expect(res.body.data.approved_at).not.toBeNull();
    expect(res.body.data.reason).toBe('Aprovação de teste');
  });

  it('rejeita aprovação de UNCLASSIFIED', async () => {
    const policy = await createPolicyFixture({ policy: 'UNCLASSIFIED' });

    const res = await request(app)
      .post(`/api/admin/finance/recognition-policies/${policy.id}/approve`)
      .set(authHeader(ids.superAdmin))
      .send({ expected_updated_at: policy.updated_at.toISOString(), reason: 'Test' });

    expect(res.status).toBe(422);
    expect(res.body.error).toContain('UNCLASSIFIED');
  });

  it('rejeita aprovação de policy não-DRAFT', async () => {
    const policy = await createPolicyFixture({ status: 'REVOKED', approved_by_admin_id: ids.superAdmin, approved_at: new Date() });

    const res = await request(app)
      .post(`/api/admin/finance/recognition-policies/${policy.id}/approve`)
      .set(authHeader(ids.superAdmin))
      .send({ expected_updated_at: policy.updated_at.toISOString(), reason: 'Test' });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('DRAFT');
  });

  it('rejeita conflito de vigência — mesma sobreposição de datas', async () => {
    const subject = 'COMMERCIAL_PAYMENTS';
    // Create and approve first policy
    const first = await createPolicyFixture({
      subject,
      policy: 'GROSS_PRINCIPAL',
      effective_from: new Date('2026-01-01'),
      effective_until: null,
    });
    await request(app)
      .post(`/api/admin/finance/recognition-policies/${first.id}/approve`)
      .set(authHeader(ids.superAdmin))
      .send({ expected_updated_at: first.updated_at.toISOString(), reason: 'Primeira aprovação' });

    // Try to approve second with overlapping dates
    const second = await createPolicyFixture({
      subject,
      policy: 'NET_AGENT',
      effective_from: new Date('2026-06-01'),
      effective_until: null,
    });
    const res = await request(app)
      .post(`/api/admin/finance/recognition-policies/${second.id}/approve`)
      .set(authHeader(ids.superAdmin))
      .send({ expected_updated_at: second.updated_at.toISOString(), reason: 'Segunda aprovação conflitante' });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('vigência');
  });

  it('não expõe approved_by_admin_id do body — campo ignorado', async () => {
    const policy = await createPolicyFixture({ policy: 'GROSS_PRINCIPAL' });

    const res = await request(app)
      .post(`/api/admin/finance/recognition-policies/${policy.id}/approve`)
      .set(authHeader(ids.superAdmin))
      .send({
        expected_updated_at: policy.updated_at.toISOString(),
        reason: 'Teste',
        approved_by_admin_id: 'hacker-admin-id',
      });

    expect(res.status).toBe(400);
  });

  it('optimistic locking na aprovação retorna 409', async () => {
    const policy = await createPolicyFixture({ policy: 'GROSS_PRINCIPAL' });

    const res = await request(app)
      .post(`/api/admin/finance/recognition-policies/${policy.id}/approve`)
      .set(authHeader(ids.superAdmin))
      .send({ expected_updated_at: new Date('2020-01-01').toISOString(), reason: 'Test' });

    expect(res.status).toBe(409);
  });

  it('FINANCE retorna 403 ao tentar aprovar', async () => {
    const policy = await createPolicyFixture({ policy: 'GROSS_PRINCIPAL' });

    const res = await request(app)
      .post(`/api/admin/finance/recognition-policies/${policy.id}/approve`)
      .set(authHeader(ids.financeAdmin))
      .send({ expected_updated_at: policy.updated_at.toISOString(), reason: 'Test' });

    expect(res.status).toBe(403);
  });

  it('grava auditoria com ator correto após aprovação', async () => {
    const policy = await createPolicyFixture({ subject: 'RIDE_REVENUE', policy: 'GROSS_PRINCIPAL' });

    const res = await request(app)
      .post(`/api/admin/finance/recognition-policies/${policy.id}/approve`)
      .set(authHeader(ids.superAdmin))
      .send({ expected_updated_at: policy.updated_at.toISOString(), reason: 'Aprovação auditada' });

    expect(res.status).toBe(200);
    const auditEntry = await latestAudit('FINANCE_RECOGNITION_POLICY_APPROVE', policy.id);
    expect(auditEntry).not.toBeNull();
    expect(auditEntry.admin_id).toBe(ids.superAdmin);
  });
});

// ─── Revogação ────────────────────────────────────────────────────────────────
describe('admin recognition policy — revogação', () => {
  it('revoga APPROVED e preserva approved_by_admin_id e approved_at', async () => {
    const policy = await createPolicyFixture({
      policy: 'GROSS_PRINCIPAL',
      status: 'APPROVED',
      approved_by_admin_id: ids.superAdmin,
      approved_at: new Date(),
    });

    const res = await request(app)
      .post(`/api/admin/finance/recognition-policies/${policy.id}/revoke`)
      .set(authHeader(ids.superAdmin))
      .send({ expected_updated_at: policy.updated_at.toISOString(), reason: 'Motivo de revogação' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('REVOKED');
    expect(res.body.data.approved_by_admin).not.toBeNull();
    expect(res.body.data.approved_at).not.toBeNull();
    expect(res.body.data.reason).toBe('Motivo de revogação');
  });

  it('rejeita revogação de DRAFT', async () => {
    const policy = await createPolicyFixture({ status: 'DRAFT' });

    const res = await request(app)
      .post(`/api/admin/finance/recognition-policies/${policy.id}/revoke`)
      .set(authHeader(ids.superAdmin))
      .send({ expected_updated_at: policy.updated_at.toISOString(), reason: 'Test' });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('APPROVED');
  });

  it('rejeita revogação de REVOKED (terminal)', async () => {
    const policy = await createPolicyFixture({
      status: 'REVOKED',
      approved_by_admin_id: ids.superAdmin,
      approved_at: new Date(),
    });

    const res = await request(app)
      .post(`/api/admin/finance/recognition-policies/${policy.id}/revoke`)
      .set(authHeader(ids.superAdmin))
      .send({ expected_updated_at: policy.updated_at.toISOString(), reason: 'Test' });

    expect(res.status).toBe(409);
  });

  it('exige reason na revogação', async () => {
    const policy = await createPolicyFixture({ status: 'APPROVED', approved_by_admin_id: ids.superAdmin, approved_at: new Date() });

    const res = await request(app)
      .post(`/api/admin/finance/recognition-policies/${policy.id}/revoke`)
      .set(authHeader(ids.superAdmin))
      .send({ expected_updated_at: policy.updated_at.toISOString() });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('optimistic locking na revogação', async () => {
    const policy = await createPolicyFixture({ status: 'APPROVED', approved_by_admin_id: ids.superAdmin, approved_at: new Date() });

    const res = await request(app)
      .post(`/api/admin/finance/recognition-policies/${policy.id}/revoke`)
      .set(authHeader(ids.superAdmin))
      .send({ expected_updated_at: new Date('2020-01-01').toISOString(), reason: 'Test' });

    expect(res.status).toBe(409);
  });
});

// ─── Substituição ────────────────────────────────────────────────────────────
describe('admin recognition policy — substituição', () => {
  it('substitui APPROVED por DRAFT em transação atômica', async () => {
    const subject = 'MANAGER_PAYMENTS';

    const oldPolicy = await createPolicyFixture({
      subject,
      policy: 'GROSS_PRINCIPAL',
      status: 'APPROVED',
      approved_by_admin_id: ids.superAdmin,
      approved_at: new Date(),
      effective_from: new Date('2025-01-01'),
    });

    const newPolicy = await createPolicyFixture({
      subject,
      policy: 'NET_AGENT',
      status: 'DRAFT',
      effective_from: new Date('2026-01-01'),
    });

    const res = await request(app)
      .post(`/api/admin/finance/recognition-policies/${oldPolicy.id}/supersede`)
      .set(authHeader(ids.superAdmin))
      .send({
        replacement_policy_id: newPolicy.id,
        expected_updated_at: oldPolicy.updated_at.toISOString(),
        expected_updated_at_new: newPolicy.updated_at.toISOString(),
        reason: 'Substituição de teste',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.superseded.status).toBe('SUPERSEDED');
    expect(res.body.data.approved.status).toBe('APPROVED');
    expect(res.body.data.approved.approved_by_admin.id).toBe(ids.superAdmin);
    expect(res.body.data.approved.approved_at).not.toBeNull();
  });

  it('rejeita substituição se nova é UNCLASSIFIED', async () => {
    const subject = 'PREPAID_DRIVER_CREDITS';

    const oldPolicy = await createPolicyFixture({
      subject,
      policy: 'GROSS_PRINCIPAL',
      status: 'APPROVED',
      approved_by_admin_id: ids.superAdmin,
      approved_at: new Date(),
    });

    const newPolicy = await createPolicyFixture({ subject, policy: 'UNCLASSIFIED', status: 'DRAFT' });

    const res = await request(app)
      .post(`/api/admin/finance/recognition-policies/${oldPolicy.id}/supersede`)
      .set(authHeader(ids.superAdmin))
      .send({
        replacement_policy_id: newPolicy.id,
        expected_updated_at: oldPolicy.updated_at.toISOString(),
        expected_updated_at_new: newPolicy.updated_at.toISOString(),
        reason: 'Test',
      });

    expect(res.status).toBe(422);
  });

  it('rejeita substituição com subject diferente', async () => {
    const oldPolicy = await createPolicyFixture({
      subject: 'RIDE_REVENUE',
      policy: 'GROSS_PRINCIPAL',
      status: 'APPROVED',
      approved_by_admin_id: ids.superAdmin,
      approved_at: new Date(),
    });

    const newPolicy = await createPolicyFixture({ subject: 'OTHER', policy: 'NET_AGENT', status: 'DRAFT' });

    const res = await request(app)
      .post(`/api/admin/finance/recognition-policies/${oldPolicy.id}/supersede`)
      .set(authHeader(ids.superAdmin))
      .send({
        replacement_policy_id: newPolicy.id,
        expected_updated_at: oldPolicy.updated_at.toISOString(),
        expected_updated_at_new: newPolicy.updated_at.toISOString(),
        reason: 'Test',
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('subject');
  });
});

// ─── Regressão ───────────────────────────────────────────────────────────────
describe('admin recognition policy — regressão GET', () => {
  it('GET list continua funcionando e retorna ao menos 5 registros', async () => {
    const res = await request(app)
      .get('/api/admin/finance/recognition-policies')
      .set(authHeader(ids.superAdmin));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.pagination.total).toBeGreaterThanOrEqual(5);
  });

  it('GET detail retorna campos de policy incluindo status e policy', async () => {
    const policy = await createPolicyFixture();

    const res = await request(app)
      .get(`/api/admin/finance/recognition-policies/${policy.id}`)
      .set(authHeader(ids.superAdmin));

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBeDefined();
    expect(res.body.data.policy).toBeDefined();
    expect(res.body.data.effective_from).toBeDefined();
    expect(res.body.data.created_at).toBeDefined();
    expect(res.body.data.updated_at).toBeDefined();
    expect(res.body.data.reason).toBeDefined();
  });

  it('5 policies seeded permanecem DRAFT/UNCLASSIFIED', async () => {
    await assertSeedPoliciesIntact();
  });
});

// ─── Correções 3C-2B1 ────────────────────────────────────────────────────────
describe('admin recognition policy — FINANCE 403', () => {
  it('FINANCE retorna 403 ao tentar revogar', async () => {
    const policy = await createPolicyFixture({
      policy: 'GROSS_PRINCIPAL',
      status: 'APPROVED',
      approved_by_admin_id: ids.superAdmin,
      approved_at: new Date(),
    });

    const res = await request(app)
      .post(`/api/admin/finance/recognition-policies/${policy.id}/revoke`)
      .set(authHeader(ids.financeAdmin))
      .send({ expected_updated_at: policy.updated_at.toISOString(), reason: 'Tentativa' });

    expect(res.status).toBe(403);
  });

  it('FINANCE retorna 403 ao tentar substituir', async () => {
    const subject = 'PREPAID_DRIVER_CREDITS';
    const oldPolicy = await createPolicyFixture({
      subject,
      policy: 'GROSS_PRINCIPAL',
      status: 'APPROVED',
      approved_by_admin_id: ids.superAdmin,
      approved_at: new Date(),
      effective_from: new Date('2024-01-01'),
    });
    const newPolicy = await createPolicyFixture({ subject, policy: 'NET_AGENT', status: 'DRAFT', effective_from: new Date('2026-01-01') });

    const res = await request(app)
      .post(`/api/admin/finance/recognition-policies/${oldPolicy.id}/supersede`)
      .set(authHeader(ids.financeAdmin))
      .send({
        replacement_policy_id: newPolicy.id,
        expected_updated_at: oldPolicy.updated_at.toISOString(),
        expected_updated_at_new: newPolicy.updated_at.toISOString(),
        reason: 'Tentativa FINANCE',
      });

    expect(res.status).toBe(403);
  });
});

describe('admin recognition policy — optimistic locking no supersede', () => {
  it('OL na política original (expected_updated_at errado) → 409', async () => {
    const subject = 'OTHER';
    const oldPolicy = await createPolicyFixture({
      subject,
      policy: 'GROSS_PRINCIPAL',
      status: 'APPROVED',
      approved_by_admin_id: ids.superAdmin,
      approved_at: new Date(),
      effective_from: new Date('2024-01-01'),
    });
    const newPolicy = await createPolicyFixture({ subject, policy: 'NET_AGENT', status: 'DRAFT', effective_from: new Date('2026-01-01') });

    const res = await request(app)
      .post(`/api/admin/finance/recognition-policies/${oldPolicy.id}/supersede`)
      .set(authHeader(ids.superAdmin))
      .send({
        replacement_policy_id: newPolicy.id,
        expected_updated_at: new Date('2020-01-01').toISOString(),
        expected_updated_at_new: newPolicy.updated_at.toISOString(),
        reason: 'OL test',
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('expected_updated_at');
    const check = await prisma.financial_recognition_policies.findUnique({ where: { id: oldPolicy.id }, select: { status: true } });
    expect(check!.status).toBe('APPROVED');
  });

  it('OL na política de substituição (expected_updated_at_new errado) → 409', async () => {
    const subject = 'RIDE_REVENUE';
    const oldPolicy = await createPolicyFixture({
      subject,
      policy: 'GROSS_PRINCIPAL',
      status: 'APPROVED',
      approved_by_admin_id: ids.superAdmin,
      approved_at: new Date(),
      effective_from: new Date('2024-01-01'),
    });
    const newPolicy = await createPolicyFixture({ subject, policy: 'NET_AGENT', status: 'DRAFT', effective_from: new Date('2026-01-01') });

    const res = await request(app)
      .post(`/api/admin/finance/recognition-policies/${oldPolicy.id}/supersede`)
      .set(authHeader(ids.superAdmin))
      .send({
        replacement_policy_id: newPolicy.id,
        expected_updated_at: oldPolicy.updated_at.toISOString(),
        expected_updated_at_new: new Date('2020-01-01').toISOString(),
        reason: 'OL test',
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('expected_updated_at_new');
    const checkOld = await prisma.financial_recognition_policies.findUnique({ where: { id: oldPolicy.id }, select: { status: true } });
    expect(checkOld!.status).toBe('APPROVED');
    const checkNew = await prisma.financial_recognition_policies.findUnique({ where: { id: newPolicy.id }, select: { status: true } });
    expect(checkNew!.status).toBe('DRAFT');
  });
});

describe('admin recognition policy — atomicidade', () => {
  it('rollback quando audit falha — policy permanece DRAFT', async () => {
    // past dates avoid conflict with any 2026+ APPROVED COMMERCIAL_PAYMENTS GLOBAL policy
    const policy = await createPolicyFixture({ subject: 'COMMERCIAL_PAYMENTS', policy: 'GROSS_PRINCIPAL', effective_from: new Date('2000-01-01'), effective_until: new Date('2000-12-31') });

    await pool.query('ALTER TABLE admin_audit_logs RENAME TO admin_audit_logs_backup');
    let res: any;
    try {
      res = await request(app)
        .post(`/api/admin/finance/recognition-policies/${policy.id}/approve`)
        .set(authHeader(ids.superAdmin))
        .send({ expected_updated_at: policy.updated_at.toISOString(), reason: 'Audit fail test' });
    } finally {
      await pool.query('ALTER TABLE admin_audit_logs_backup RENAME TO admin_audit_logs');
    }

    expect(res.status).toBe(500);
    const check = await prisma.financial_recognition_policies.findUnique({ where: { id: policy.id }, select: { status: true } });
    expect(check!.status).toBe('DRAFT');

    const tableCheck = await pool.query("SELECT to_regclass('public.admin_audit_logs')");
    expect(tableCheck.rows[0].to_regclass).toBe('admin_audit_logs');
  });

  it('supersede grava dois audits atômicos — SUPERSEDE e APPROVE', async () => {
    const subject = 'MANAGER_PAYMENTS';
    // past dates: existing APPROVED MANAGER_PAYMENTS GLOBAL starts 2026-01-01, no overlap with 2000–2001
    const oldPolicy = await createPolicyFixture({
      subject,
      policy: 'GROSS_PRINCIPAL',
      status: 'APPROVED',
      approved_by_admin_id: ids.superAdmin,
      approved_at: new Date(),
      effective_from: new Date('2000-01-01'),
    });
    const newPolicy = await createPolicyFixture({ subject, policy: 'NET_AGENT', status: 'DRAFT', effective_from: new Date('2001-01-01'), effective_until: new Date('2001-12-31') });

    const res = await request(app)
      .post(`/api/admin/finance/recognition-policies/${oldPolicy.id}/supersede`)
      .set(authHeader(ids.superAdmin))
      .send({
        replacement_policy_id: newPolicy.id,
        expected_updated_at: oldPolicy.updated_at.toISOString(),
        expected_updated_at_new: newPolicy.updated_at.toISOString(),
        reason: 'Atomic audit test',
      });

    expect(res.status).toBe(200);
    const supersedeAudit = await latestAudit('FINANCE_RECOGNITION_POLICY_SUPERSEDE', oldPolicy.id);
    expect(supersedeAudit).not.toBeNull();
    expect(supersedeAudit.admin_id).toBe(ids.superAdmin);
    const approveAudit = await latestAudit('FINANCE_RECOGNITION_POLICY_APPROVE', newPolicy.id);
    expect(approveAudit).not.toBeNull();
    expect(approveAudit.admin_id).toBe(ids.superAdmin);
  });

  it('rollback do supersede quando audit falha — ambas permanecem no estado original', async () => {
    // RIDE_REVENUE GLOBAL past dates: no overlap with existing 2026+ APPROVED policies
    const oldPolicy = await createPolicyFixture({
      subject: 'RIDE_REVENUE',
      policy: 'GROSS_PRINCIPAL',
      status: 'APPROVED',
      approved_by_admin_id: ids.superAdmin,
      approved_at: new Date(),
      effective_from: new Date('2000-06-01'),
    });
    const newPolicy = await createPolicyFixture({
      subject: 'RIDE_REVENUE',
      policy: 'NET_AGENT',
      status: 'DRAFT',
      effective_from: new Date('2001-01-01'),
      effective_until: new Date('2001-12-31'),
    });

    const oldEffectiveUntilBefore = oldPolicy.effective_until;

    await pool.query('ALTER TABLE admin_audit_logs RENAME TO admin_audit_logs_backup');
    let res: any;
    try {
      res = await request(app)
        .post(`/api/admin/finance/recognition-policies/${oldPolicy.id}/supersede`)
        .set(authHeader(ids.superAdmin))
        .send({
          replacement_policy_id: newPolicy.id,
          expected_updated_at: oldPolicy.updated_at.toISOString(),
          expected_updated_at_new: newPolicy.updated_at.toISOString(),
          reason: 'Supersede rollback test',
        });
    } finally {
      await pool.query('ALTER TABLE admin_audit_logs_backup RENAME TO admin_audit_logs');
    }

    expect(res.status).toBe(500);

    const checkOld = await prisma.financial_recognition_policies.findUnique({
      where: { id: oldPolicy.id },
      select: { status: true, effective_until: true },
    });
    const checkNew = await prisma.financial_recognition_policies.findUnique({
      where: { id: newPolicy.id },
      select: { status: true, approved_at: true, approved_by_admin_id: true },
    });

    expect(checkOld!.status).toBe('APPROVED');
    expect(checkOld!.effective_until).toEqual(oldEffectiveUntilBefore);
    expect(checkNew!.status).toBe('DRAFT');
    expect(checkNew!.approved_at).toBeNull();
    expect(checkNew!.approved_by_admin_id).toBeNull();

    const supersedeAuditRollback = await latestAudit('FINANCE_RECOGNITION_POLICY_SUPERSEDE', oldPolicy.id);
    expect(supersedeAuditRollback).toBeNull();
    const approveAuditRollback = await latestAudit('FINANCE_RECOGNITION_POLICY_APPROVE', newPolicy.id);
    expect(approveAuditRollback).toBeNull();

    const tableCheck = await pool.query("SELECT to_regclass('public.admin_audit_logs')");
    expect(tableCheck.rows[0].to_regclass).toBe('admin_audit_logs');
  });

  it('supersede define effective_until da antiga como dia anterior ao effective_from da nova', async () => {
    const subject = 'COMMERCIAL_PAYMENTS';
    // past dates: existing APPROVED COMMERCIAL_PAYMENTS GLOBAL starts 2026-01-01, no overlap with 2000–2003
    const oldPolicy = await createPolicyFixture({
      subject,
      policy: 'GROSS_PRINCIPAL',
      status: 'APPROVED',
      approved_by_admin_id: ids.superAdmin,
      approved_at: new Date(),
      effective_from: new Date('2000-01-01'),
    });
    const newPolicy = await createPolicyFixture({ subject, policy: 'NET_AGENT', status: 'DRAFT', effective_from: new Date('2003-01-01'), effective_until: new Date('2003-12-31') });

    const res = await request(app)
      .post(`/api/admin/finance/recognition-policies/${oldPolicy.id}/supersede`)
      .set(authHeader(ids.superAdmin))
      .send({
        replacement_policy_id: newPolicy.id,
        expected_updated_at: oldPolicy.updated_at.toISOString(),
        expected_updated_at_new: newPolicy.updated_at.toISOString(),
        reason: 'Effective until test',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.superseded.effective_until).toContain('2002-12-31');
  });

  it('supersede rejeita se new.effective_from <= old.effective_from', async () => {
    const subject = 'RIDE_REVENUE';
    const oldPolicy = await createPolicyFixture({
      subject,
      policy: 'GROSS_PRINCIPAL',
      status: 'APPROVED',
      approved_by_admin_id: ids.superAdmin,
      approved_at: new Date(),
      effective_from: new Date('2026-06-01'),
    });
    const newPolicy = await createPolicyFixture({ subject, policy: 'NET_AGENT', status: 'DRAFT', effective_from: new Date('2026-06-01') });

    const res = await request(app)
      .post(`/api/admin/finance/recognition-policies/${oldPolicy.id}/supersede`)
      .set(authHeader(ids.superAdmin))
      .send({
        replacement_policy_id: newPolicy.id,
        expected_updated_at: oldPolicy.updated_at.toISOString(),
        expected_updated_at_new: newPolicy.updated_at.toISOString(),
        reason: 'Temporal test',
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('effective_from');
  });
});

describe('admin recognition policy — aprovação concorrente', () => {
  it('duas aprovações simultâneas: exatamente uma APPROVED, outra DRAFT, perdedora 409, sem 500', async () => {
    // CITY scope (Blumenau SC) — no prior APPROVED policy for this combination
    const p1 = await createPolicyFixture({ subject: 'OTHER', scope_type: 'CITY', city: 'Blumenau', state: 'SC', policy: 'GROSS_PRINCIPAL', effective_from: new Date('2027-01-01') });
    const p2 = await createPolicyFixture({ subject: 'OTHER', scope_type: 'CITY', city: 'Blumenau', state: 'SC', policy: 'NET_AGENT', effective_from: new Date('2027-01-01') });

    const [r1, r2] = await Promise.allSettled([
      request(app)
        .post(`/api/admin/finance/recognition-policies/${p1.id}/approve`)
        .set(authHeader(ids.superAdmin))
        .send({ expected_updated_at: p1.updated_at.toISOString(), reason: 'Concurrent 1' }),
      request(app)
        .post(`/api/admin/finance/recognition-policies/${p2.id}/approve`)
        .set(authHeader(ids.superAdmin))
        .send({ expected_updated_at: p2.updated_at.toISOString(), reason: 'Concurrent 2' }),
    ]);

    const responses = [r1, r2].map((r) => (r.status === 'fulfilled' ? r.value : null));
    const statuses = responses.map((r) => r?.status);

    expect(statuses).not.toContain(500);

    const approvedCount = statuses.filter((s) => s === 200).length;
    const conflictCount = statuses.filter((s) => s === 409).length;
    expect(approvedCount).toBe(1);
    expect(conflictCount).toBe(1);

    const [check1, check2] = await Promise.all([
      prisma.financial_recognition_policies.findUnique({
        where: { id: p1.id },
        select: { status: true, approved_at: true, approved_by_admin_id: true },
      }),
      prisma.financial_recognition_policies.findUnique({
        where: { id: p2.id },
        select: { status: true, approved_at: true, approved_by_admin_id: true },
      }),
    ]);
    const approvedStatuses = [check1!.status, check2!.status];
    expect(approvedStatuses.filter((s) => s === 'APPROVED').length).toBe(1);
    expect(approvedStatuses.filter((s) => s === 'DRAFT').length).toBe(1);

    const winner = check1!.status === 'APPROVED' ? check1! : check2!;
    const loser  = check1!.status === 'APPROVED' ? check2! : check1!;
    expect(winner.approved_at).not.toBeNull();
    expect(winner.approved_by_admin_id).not.toBeNull();
    expect(loser.approved_at).toBeNull();
    expect(loser.approved_by_admin_id).toBeNull();

    const winnerPolicy = check1!.status === 'APPROVED' ? p1 : p2;
    const loserPolicy  = check1!.status === 'APPROVED' ? p2 : p1;
    const winnerAudit = await latestAudit('FINANCE_RECOGNITION_POLICY_APPROVE', winnerPolicy.id);
    const loserAudit  = await latestAudit('FINANCE_RECOGNITION_POLICY_APPROVE', loserPolicy.id);
    expect(winnerAudit).not.toBeNull();
    expect(winnerAudit.admin_id).toBe(ids.superAdmin);
    expect(loserAudit).toBeNull();
  });
});

describe('admin recognition policy — conflitos por escopo', () => {
  it('TERRITORY: mesmo território → conflito 409', async () => {
    const subject = 'OTHER';
    const first = await createPolicyFixture({
      subject,
      scope_type: 'TERRITORY',
      territory_id: ids.territory,
      policy: 'GROSS_PRINCIPAL',
      effective_from: new Date('2026-01-01'),
    });
    await request(app)
      .post(`/api/admin/finance/recognition-policies/${first.id}/approve`)
      .set(authHeader(ids.superAdmin))
      .send({ expected_updated_at: first.updated_at.toISOString(), reason: 'First' });

    const second = await createPolicyFixture({
      subject,
      scope_type: 'TERRITORY',
      territory_id: ids.territory,
      policy: 'NET_AGENT',
      effective_from: new Date('2026-06-01'),
    });
    const res = await request(app)
      .post(`/api/admin/finance/recognition-policies/${second.id}/approve`)
      .set(authHeader(ids.superAdmin))
      .send({ expected_updated_at: second.updated_at.toISOString(), reason: 'Second' });

    expect(res.status).toBe(409);
  });

  it('TERRITORY: territórios diferentes → sem conflito', async () => {
    const subject = 'RIDE_REVENUE';
    const first = await createPolicyFixture({
      subject,
      scope_type: 'TERRITORY',
      territory_id: ids.territory,
      policy: 'GROSS_PRINCIPAL',
      effective_from: new Date('2026-01-01'),
    });
    await request(app)
      .post(`/api/admin/finance/recognition-policies/${first.id}/approve`)
      .set(authHeader(ids.superAdmin))
      .send({ expected_updated_at: first.updated_at.toISOString(), reason: 'First' });

    const second = await createPolicyFixture({
      subject,
      scope_type: 'TERRITORY',
      territory_id: ids.territory2,
      policy: 'NET_AGENT',
      effective_from: new Date('2026-06-01'),
    });
    const res = await request(app)
      .post(`/api/admin/finance/recognition-policies/${second.id}/approve`)
      .set(authHeader(ids.superAdmin))
      .send({ expected_updated_at: second.updated_at.toISOString(), reason: 'Second different territory' });

    expect(res.status).toBe(200);
  });

  it('CITY: mesma cidade → conflito 409', async () => {
    const subject = 'OTHER';
    const first = await createPolicyFixture({
      subject,
      scope_type: 'CITY',
      city: 'Campinas',
      state: 'SP',
      policy: 'GROSS_PRINCIPAL',
      effective_from: new Date('2026-01-01'),
    });
    await request(app)
      .post(`/api/admin/finance/recognition-policies/${first.id}/approve`)
      .set(authHeader(ids.superAdmin))
      .send({ expected_updated_at: first.updated_at.toISOString(), reason: 'First' });

    const second = await createPolicyFixture({
      subject,
      scope_type: 'CITY',
      city: 'Campinas',
      state: 'SP',
      policy: 'NET_AGENT',
      effective_from: new Date('2026-06-01'),
    });
    const res = await request(app)
      .post(`/api/admin/finance/recognition-policies/${second.id}/approve`)
      .set(authHeader(ids.superAdmin))
      .send({ expected_updated_at: second.updated_at.toISOString(), reason: 'Second same city' });

    expect(res.status).toBe(409);
  });

  it('CITY: cidades diferentes → sem conflito', async () => {
    const subject = 'COMMERCIAL_PAYMENTS';
    const first = await createPolicyFixture({
      subject,
      scope_type: 'CITY',
      city: 'Santos',
      state: 'SP',
      policy: 'GROSS_PRINCIPAL',
      effective_from: new Date('2026-01-01'),
    });
    await request(app)
      .post(`/api/admin/finance/recognition-policies/${first.id}/approve`)
      .set(authHeader(ids.superAdmin))
      .send({ expected_updated_at: first.updated_at.toISOString(), reason: 'First' });

    const second = await createPolicyFixture({
      subject,
      scope_type: 'CITY',
      city: 'Sorocaba',
      state: 'SP',
      policy: 'NET_AGENT',
      effective_from: new Date('2026-06-01'),
    });
    const res = await request(app)
      .post(`/api/admin/finance/recognition-policies/${second.id}/approve`)
      .set(authHeader(ids.superAdmin))
      .send({ expected_updated_at: second.updated_at.toISOString(), reason: 'Second different city' });

    expect(res.status).toBe(200);
  });

  it('COST_CENTER: mesmo centro de custo → conflito 409', async () => {
    const subject = 'OTHER';
    const first = await createPolicyFixture({
      subject,
      scope_type: 'COST_CENTER',
      cost_center_id: ids.costCenter1,
      policy: 'GROSS_PRINCIPAL',
      effective_from: new Date('2026-01-01'),
    });
    await request(app)
      .post(`/api/admin/finance/recognition-policies/${first.id}/approve`)
      .set(authHeader(ids.superAdmin))
      .send({ expected_updated_at: first.updated_at.toISOString(), reason: 'First' });

    const second = await createPolicyFixture({
      subject,
      scope_type: 'COST_CENTER',
      cost_center_id: ids.costCenter1,
      policy: 'NET_AGENT',
      effective_from: new Date('2026-06-01'),
    });
    const res = await request(app)
      .post(`/api/admin/finance/recognition-policies/${second.id}/approve`)
      .set(authHeader(ids.superAdmin))
      .send({ expected_updated_at: second.updated_at.toISOString(), reason: 'Second same cc' });

    expect(res.status).toBe(409);
  });

  it('COST_CENTER: centros de custo diferentes → sem conflito', async () => {
    const subject = 'MANAGER_PAYMENTS';
    const first = await createPolicyFixture({
      subject,
      scope_type: 'COST_CENTER',
      cost_center_id: ids.costCenter1,
      policy: 'GROSS_PRINCIPAL',
      effective_from: new Date('2026-01-01'),
    });
    await request(app)
      .post(`/api/admin/finance/recognition-policies/${first.id}/approve`)
      .set(authHeader(ids.superAdmin))
      .send({ expected_updated_at: first.updated_at.toISOString(), reason: 'First' });

    const second = await createPolicyFixture({
      subject,
      scope_type: 'COST_CENTER',
      cost_center_id: ids.costCenter2,
      policy: 'NET_AGENT',
      effective_from: new Date('2026-06-01'),
    });
    const res = await request(app)
      .post(`/api/admin/finance/recognition-policies/${second.id}/approve`)
      .set(authHeader(ids.superAdmin))
      .send({ expected_updated_at: second.updated_at.toISOString(), reason: 'Second different cc' });

    expect(res.status).toBe(200);
  });

  it('limite inclusivo de vigência: effective_until=2026-06-30 conflita com effective_from=2026-06-30', async () => {
    // TERRITORY territory2 scope — no prior APPROVED PREPAID_DRIVER_CREDITS TERRITORY:territory2
    const subject = 'PREPAID_DRIVER_CREDITS';
    const first = await createPolicyFixture({
      subject,
      scope_type: 'TERRITORY',
      territory_id: ids.territory2,
      policy: 'GROSS_PRINCIPAL',
      effective_from: new Date('2026-01-01'),
      effective_until: new Date('2026-06-30'),
    });
    await request(app)
      .post(`/api/admin/finance/recognition-policies/${first.id}/approve`)
      .set(authHeader(ids.superAdmin))
      .send({ expected_updated_at: first.updated_at.toISOString(), reason: 'First' });

    const second = await createPolicyFixture({
      subject,
      scope_type: 'TERRITORY',
      territory_id: ids.territory2,
      policy: 'NET_AGENT',
      effective_from: new Date('2026-06-30'),
      effective_until: null,
    });
    const res = await request(app)
      .post(`/api/admin/finance/recognition-policies/${second.id}/approve`)
      .set(authHeader(ids.superAdmin))
      .send({ expected_updated_at: second.updated_at.toISOString(), reason: 'Second boundary' });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('vigência');
  });

  it('período adjacente: effective_until=2026-06-30 não conflita com effective_from=2026-07-01', async () => {
    // RIDE_REVENUE CITY Joinville SC — fresh combination not used elsewhere
    const a = await createPolicyFixture({
      subject: 'RIDE_REVENUE',
      scope_type: 'CITY',
      city: 'Joinville',
      state: 'SC',
      policy: 'GROSS_PRINCIPAL',
      effective_from: new Date('2026-01-01'),
      effective_until: new Date('2026-06-30'),
    });
    const resA = await request(app)
      .post(`/api/admin/finance/recognition-policies/${a.id}/approve`)
      .set(authHeader(ids.superAdmin))
      .send({ expected_updated_at: a.updated_at.toISOString(), reason: 'Period A' });
    expect(resA.status).toBe(200);

    const b = await createPolicyFixture({
      subject: 'RIDE_REVENUE',
      scope_type: 'CITY',
      city: 'Joinville',
      state: 'SC',
      policy: 'NET_AGENT',
      effective_from: new Date('2026-07-01'),
      effective_until: null,
    });
    const resB = await request(app)
      .post(`/api/admin/finance/recognition-policies/${b.id}/approve`)
      .set(authHeader(ids.superAdmin))
      .send({ expected_updated_at: b.updated_at.toISOString(), reason: 'Period B adjacent' });

    expect(resB.status).toBe(200);

    const checkA = await prisma.financial_recognition_policies.findUnique({ where: { id: a.id }, select: { status: true } });
    const checkB = await prisma.financial_recognition_policies.findUnique({ where: { id: b.id }, select: { status: true } });
    expect(checkA!.status).toBe('APPROVED');
    expect(checkB!.status).toBe('APPROVED');
  });

  it('CITY: mesma cidade, estado diferente → sem conflito', async () => {
    const subject = 'MANAGER_PAYMENTS';
    const first = await createPolicyFixture({
      subject,
      scope_type: 'CITY',
      city: 'Campinas',
      state: 'SP',
      policy: 'GROSS_PRINCIPAL',
      effective_from: new Date('2026-01-01'),
    });
    const resFirst = await request(app)
      .post(`/api/admin/finance/recognition-policies/${first.id}/approve`)
      .set(authHeader(ids.superAdmin))
      .send({ expected_updated_at: first.updated_at.toISOString(), reason: 'First SP' });
    expect(resFirst.status).toBe(200);

    const second = await createPolicyFixture({
      subject,
      scope_type: 'CITY',
      city: 'Campinas',
      state: 'MG',
      policy: 'NET_AGENT',
      effective_from: new Date('2026-01-01'),
    });
    const resSecond = await request(app)
      .post(`/api/admin/finance/recognition-policies/${second.id}/approve`)
      .set(authHeader(ids.superAdmin))
      .send({ expected_updated_at: second.updated_at.toISOString(), reason: 'Second MG different state' });

    expect(resSecond.status).toBe(200);

    const checkFirst  = await prisma.financial_recognition_policies.findUnique({ where: { id: first.id }, select: { status: true } });
    const checkSecond = await prisma.financial_recognition_policies.findUnique({ where: { id: second.id }, select: { status: true } });
    expect(checkFirst!.status).toBe('APPROVED');
    expect(checkSecond!.status).toBe('APPROVED');
  });
});
