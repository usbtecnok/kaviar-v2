import express from 'express';
import jwt from 'jsonwebtoken';
import Module from 'module';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const DB_URL = process.env.DATABASE_URL || 'postgresql://finance:finance@127.0.0.1:55432/finance_phase1c_a2_test?schema=public';
const JWT_SECRET = 'finance-write-integration-secret';

process.env.DATABASE_URL = DB_URL;
process.env.JWT_SECRET = JWT_SECRET;
process.env.ADMIN_JWT_SECRET = JWT_SECRET;

const ids = {
  superAdmin: 'write-super-admin',
  financeAdmin: 'write-finance-admin',
  accountant: 'write-accountant-admin',
  operator: 'write-operator-admin',
  territory: 'write-territory-rj',
};

const OFFICIAL_CATALOG_EXPECTED = {
  categories: 53,
  costCenters: 8,
  policies: 5,
  accounts: 0,
};

let app: express.Express;
let prisma: any;
let pool: any;
let seq = 0;
const originalModuleLoad = (Module as any)._load;

function nextId(prefix: string) {
  seq += 1;
  return `${prefix}-${seq}`;
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

async function assertOfficialCatalogCounts(stage: string) {
  const [categories, costCenters, policies, accounts] = await Promise.all([
    prisma.financial_categories.count(),
    prisma.financial_cost_centers.count(),
    prisma.financial_recognition_policies.count(),
    prisma.financial_accounts.count(),
  ]);

  expect(
    { categories, costCenters, policies, accounts },
    `Catálogo financeiro divergente em: ${stage}`,
  ).toEqual(OFFICIAL_CATALOG_EXPECTED);
}

async function cleanupTestFixtures() {
  await pool.query('DELETE FROM admin_audit_logs WHERE admin_id = ANY($1::text[])', [[
    ids.superAdmin,
    ids.financeAdmin,
    ids.accountant,
    ids.operator,
  ]]);

  await prisma.financial_transaction_links.deleteMany({
    where: {
      OR: [
        { id: { startsWith: 'link-fixture-' } },
        { created_by_admin_id: { in: [ids.superAdmin, ids.financeAdmin, ids.accountant, ids.operator] } },
      ],
    },
  });

  await prisma.financial_transaction_allocations.deleteMany({
    where: {
      OR: [
        { id: { startsWith: 'alloc-fixture-' } },
        { created_by_admin_id: { in: [ids.superAdmin, ids.financeAdmin, ids.accountant, ids.operator] } },
      ],
    },
  });

  await prisma.financial_transactions.deleteMany({
    where: {
      OR: [
        { id: { startsWith: 'txn-fixture-' } },
        { idempotency_key: { startsWith: 'idem-' } },
        { created_by_admin_id: { in: [ids.superAdmin, ids.financeAdmin, ids.accountant, ids.operator] } },
      ],
    },
  });

  await prisma.financial_recognition_policies.deleteMany({
    where: {
      OR: [
        { id: { startsWith: 'frp-fixture-' } },
        { code: { startsWith: 'POL.WRITE.' } },
      ],
    },
  });

  await prisma.financial_cost_centers.deleteMany({
    where: {
      OR: [
        { id: { startsWith: 'cc-fixture-' } },
        { code: { startsWith: 'CC.' } },
      ],
    },
  });

  await prisma.financial_categories.deleteMany({
    where: {
      OR: [
        { id: { startsWith: 'cat-fixture-' } },
        { code: { startsWith: 'CAT.' } },
      ],
    },
  });

  await prisma.financial_accounts.deleteMany({
    where: {
      OR: [
        { id: { startsWith: 'acc-fixture-' } },
        { code: { startsWith: 'ACC.' } },
      ],
    },
  });

  await prisma.operational_territories.deleteMany({ where: { id: ids.territory } });
  await prisma.admins.deleteMany({ where: { id: { in: [ids.operator, ids.accountant, ids.financeAdmin, ids.superAdmin] } } });
}

async function seedBaseActorsAndTerritory() {
  await prisma.admins.createMany({
    data: [
      { id: ids.superAdmin, name: 'Super Admin', email: 'write-super@test.local', password: 'x', role: 'SUPER_ADMIN', is_active: true, must_change_password: false },
      { id: ids.financeAdmin, name: 'Finance Admin', email: 'write-finance@test.local', password: 'x', role: 'FINANCE', is_active: true, must_change_password: false },
      { id: ids.accountant, name: 'Accountant Admin', email: 'write-accountant@test.local', password: 'x', role: 'ACCOUNTANT', is_active: true, must_change_password: false },
      { id: ids.operator, name: 'Operator Admin', email: 'write-operator@test.local', password: 'x', role: 'OPERATOR', is_active: true, must_change_password: false },
    ],
  });

  await prisma.operational_territories.create({
    data: {
      id: ids.territory,
      name: 'Território RJ',
      level: 'city',
      status: 'active',
      city_name: 'Rio de Janeiro',
      uf: 'RJ',
      is_active: true,
    },
  });
}

async function createAccountFixture(overrides: any = {}) {
  return prisma.financial_accounts.create({
    data: {
      id: nextId('acc-fixture'),
      code: nextId('ACC').toUpperCase(),
      name: 'Conta Fixture',
      type: 'BANK',
      currency: 'BRL',
      opening_balance_cents: BigInt(0),
      allows_negative_balance: false,
      is_cash_equivalent: false,
      is_active: true,
      created_by_admin_id: ids.superAdmin,
      updated_by_admin_id: ids.superAdmin,
      ...overrides,
    },
  });
}

async function createCategoryFixture(overrides: any = {}) {
  return prisma.financial_categories.create({
    data: {
      id: nextId('cat-fixture'),
      code: nextId('CAT').toUpperCase(),
      name: 'Categoria Fixture',
      kind: 'EXPENSE',
      default_direction: 'OUT',
      requires_document: false,
      is_system: false,
      is_active: true,
      is_postable: false,
      sort_order: 1,
      created_by_admin_id: ids.superAdmin,
      updated_by_admin_id: ids.superAdmin,
      ...overrides,
    },
  });
}

async function createCostCenterFixture(overrides: any = {}) {
  return prisma.financial_cost_centers.create({
    data: {
      id: nextId('cc-fixture'),
      code: nextId('CC').toUpperCase(),
      name: 'Centro Fixture',
      type: 'DEPARTMENT',
      is_active: true,
      created_by_admin_id: ids.superAdmin,
      updated_by_admin_id: ids.superAdmin,
      ...overrides,
    },
  });
}

async function createTransactionFixture(overrides: any = {}) {
  const primaryAccount = overrides.account_id ? null : await createAccountFixture();
  const status = overrides.status || 'POSTED';
  const canceledFields = status === 'CANCELED'
    ? {
      canceled_at: overrides.canceled_at ?? new Date('2026-07-02T00:00:00.000Z'),
      canceled_reason: overrides.canceled_reason ?? 'Cancelamento de fixture',
    }
    : {
      canceled_at: null,
      canceled_reason: null,
    };

  return prisma.financial_transactions.create({
    data: {
      id: nextId('txn-fixture'),
      source_type: 'MANUAL',
      origin_type: 'MANUAL',
      account_id: overrides.account_id || primaryAccount.id,
      counterparty_account_id: overrides.counterparty_account_id ?? null,
      category_id: overrides.category_id ?? null,
      cost_center_id: overrides.cost_center_id ?? null,
      direction: 'IN',
      transaction_type: 'INCOME',
      status,
      payment_method: 'PIX',
      competence_date: new Date('2026-07-01T00:00:00.000Z'),
      transaction_date: new Date('2026-07-01T00:00:00.000Z'),
      due_date: null,
      settlement_date: null,
      gross_amount_cents: BigInt(1000),
      fee_amount_cents: BigInt(0),
      discount_amount_cents: BigInt(0),
      retention_amount_cents: BigInt(0),
      net_amount_cents: BigInt(1000),
      transfer_amount_cents: null,
      description: overrides.description || 'Transação fixture',
      memo: null,
      metadata: null,
      idempotency_key: nextId('idem'),
      created_by_admin_id: ids.superAdmin,
      approved_by_admin_id: ids.superAdmin,
      responsible_admin_id: ids.financeAdmin,
      ...canceledFields,
      ...overrides,
    },
  });
}

async function createAllocationFixture(overrides: any = {}) {
  return prisma.financial_transaction_allocations.create({
    data: {
      id: nextId('alloc-fixture'),
      transaction_id: overrides.transaction_id,
      category_id: overrides.category_id,
      cost_center_id: overrides.cost_center_id ?? null,
      amount_cents: BigInt(1000),
      allocation_type: 'ALLOCATED',
      description: 'Allocation fixture',
      metadata: null,
      created_by_admin_id: ids.superAdmin,
      ...overrides,
    },
  });
}

async function latestAudit(action: string, entityId: string) {
  const result = await pool.query(
    'SELECT action, entity_type, entity_id, old_value, new_value, ip_address FROM admin_audit_logs WHERE action = $1 AND entity_id = $2 ORDER BY id DESC LIMIT 1',
    [action, entityId],
  );
  return result.rows[0] || null;
}

async function countAudit(action: string, entityId: string) {
  const result = await pool.query(
    'SELECT count(*)::int AS total FROM admin_audit_logs WHERE action = $1 AND entity_id = $2',
    [action, entityId],
  );
  return result.rows[0]?.total ?? 0;
}

beforeAll(async () => {
  const appModule = await import('../src/app');
  const prismaModule = await import('../src/lib/prisma');
  const dbModule = await import('../src/db');
  app = appModule.default;
  prisma = prismaModule.prisma;
  pool = dbModule.pool;
  (Module as any)._load = function patchedModuleLoad(request: string, parent: any, isMain: boolean) {
    if (request === '../db') {
      return { pool };
    }
    return originalModuleLoad.call(this, request, parent, isMain);
  };
  await prisma.$connect();
  await ensureAuditTable();
  await assertOfficialCatalogCounts('write integration before suite');
});

beforeEach(async () => {
  await cleanupTestFixtures();
  await assertOfficialCatalogCounts('write integration before each test cleanup');
  await seedBaseActorsAndTerritory();
});

afterAll(async () => {
  await cleanupTestFixtures();
  await assertOfficialCatalogCounts('write integration after suite cleanup');
  await prisma.$disconnect();
  await pool.end();
  (Module as any)._load = originalModuleLoad;
});

describe('admin finance write integration', () => {
  it('cria conta com SUPER_ADMIN, aceita saldo inicial negativo apenas com allows_negative_balance=true e grava auditoria sem campos criptografados', async () => {
    const res = await request(app)
      .post('/api/admin/finance/accounts')
      .set('Authorization', authHeader(ids.superAdmin).Authorization)
      .send({
        code: 'ACC.SUPER.001',
        name: 'Conta Super',
        type: 'BANK',
        opening_balance_cents: '-25000',
        allows_negative_balance: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.opening_balance_cents).toBe('-25000');
    expect(res.body.data).not.toHaveProperty('account_last4');
    expect(res.body.data).not.toHaveProperty('pix_key_last4');

    const auditRow = await latestAudit('FINANCE_ACCOUNT_CREATE', res.body.data.id);
    expect(auditRow).toBeTruthy();
    expect(auditRow.new_value.opening_balance_cents).toBe('-25000');
    expect(auditRow.new_value).not.toHaveProperty('agency_encrypted');
    expect(auditRow.new_value).not.toHaveProperty('account_number_encrypted');
    expect(auditRow.new_value).not.toHaveProperty('account_last4');
  });

  it('retorna 400 para saldo inicial negativo com allows_negative_balance=false sem expor erro bruto', async () => {
    const res = await request(app)
      .post('/api/admin/finance/accounts')
      .set('Authorization', authHeader(ids.superAdmin).Authorization)
      .send({
        code: 'ACC.SUPER.002',
        name: 'Conta Inválida',
        type: 'BANK',
        opening_balance_cents: '-25000',
        allows_negative_balance: false,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('opening_balance_cents negativo exige allows_negative_balance=true');
    expect(JSON.stringify(res.body)).not.toContain('financial_accounts_opening_balance_non_negative_when_disallowed_chk');
    expect(JSON.stringify(res.body)).not.toContain('PostgreSQL');
  });

  it('permite POST de conta para FINANCE e retorna 409 para code duplicado', async () => {
    const financeCreate = await request(app)
      .post('/api/admin/finance/accounts')
      .set('Authorization', authHeader(ids.financeAdmin).Authorization)
      .send({ code: 'ACC.FIN.001', name: 'Conta Finance', type: 'CASH', opening_balance_cents: '0' });

    expect(financeCreate.status).toBe(201);

    const duplicate = await request(app)
      .post('/api/admin/finance/accounts')
      .set('Authorization', authHeader(ids.financeAdmin).Authorization)
      .send({ code: 'ACC.FIN.001', name: 'Conta Duplicada', type: 'CASH' });

    expect(duplicate.status).toBe(409);
  });

  it('permite PATCH funcional para FINANCE e bloqueia PATCH estrutural para FINANCE', async () => {
    const account = await createAccountFixture({ code: 'ACC.FIN.PATCH' });

    const functional = await request(app)
      .patch(`/api/admin/finance/accounts/${account.id}`)
      .set('Authorization', authHeader(ids.financeAdmin).Authorization)
      .send({
        expected_updated_at: account.updated_at.toISOString(),
        name: 'Conta Finance Editada',
        allows_negative_balance: true,
        notes: 'Atualizada',
      });

    expect(functional.status).toBe(200);
    expect(functional.body.data.name).toBe('Conta Finance Editada');

    const structural = await request(app)
      .patch(`/api/admin/finance/accounts/${account.id}`)
      .set('Authorization', authHeader(ids.financeAdmin).Authorization)
      .send({
        expected_updated_at: functional.body.data.updated_at,
        code: 'ACC.FIN.PATCH.2',
      });

    expect(structural.status).toBe(403);
  });

  it('permite PATCH estrutural para SUPER_ADMIN sem uso, bloqueia com uso e bloqueia stale expected_updated_at', async () => {
    const editable = await createAccountFixture({ code: 'ACC.SA.EDIT' });

    const ok = await request(app)
      .patch(`/api/admin/finance/accounts/${editable.id}`)
      .set('Authorization', authHeader(ids.superAdmin).Authorization)
      .send({
        expected_updated_at: editable.updated_at.toISOString(),
        code: 'ACC.SA.EDIT.2',
        opening_balance_date: '2026-07-05',
      });

    expect(ok.status).toBe(200);

    const stale = await request(app)
      .patch(`/api/admin/finance/accounts/${editable.id}`)
      .set('Authorization', authHeader(ids.superAdmin).Authorization)
      .send({
        expected_updated_at: editable.updated_at.toISOString(),
        name: 'Stale',
      });

    expect(stale.status).toBe(409);

    const used = await createAccountFixture({ code: 'ACC.SA.USED' });
    await createTransactionFixture({ account_id: used.id, status: 'POSTED' });

    const blocked = await request(app)
      .patch(`/api/admin/finance/accounts/${used.id}`)
      .set('Authorization', authHeader(ids.superAdmin).Authorization)
      .send({
        expected_updated_at: used.updated_at.toISOString(),
        currency: 'USD',
      });

    expect(blocked.status).toBe(409);
  });

  it('conflito concorrente no mesmo expected_updated_at produz um 200, um 409 e uma única auditoria de update', async () => {
    const account = await createAccountFixture({ code: 'ACC.CONCURRENT.ONE' });
    const expected = account.updated_at.toISOString();

    const [resA, resB] = await Promise.all([
      request(app)
        .patch(`/api/admin/finance/accounts/${account.id}`)
        .set('Authorization', authHeader(ids.financeAdmin).Authorization)
        .send({ expected_updated_at: expected, name: 'Conta Concorrente A' }),
      request(app)
        .patch(`/api/admin/finance/accounts/${account.id}`)
        .set('Authorization', authHeader(ids.financeAdmin).Authorization)
        .send({ expected_updated_at: expected, name: 'Conta Concorrente B' }),
    ]);

    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([200, 409]);

    const finalRecord = await prisma.financial_accounts.findUnique({ where: { id: account.id } });
    expect(['Conta Concorrente A', 'Conta Concorrente B']).toContain(finalRecord.name);

    const auditCount = await countAudit('FINANCE_ACCOUNT_UPDATE', account.id);
    expect(auditCount).toBe(1);
  });

  it('duas mudanças estruturais concorrentes com o mesmo expected_updated_at produzem um 200, um 409 e uma única auditoria', async () => {
    const account = await createAccountFixture({ code: 'ACC.CONCURRENT.STRUCT' });
    const expected = account.updated_at.toISOString();

    const [resA, resB] = await Promise.all([
      request(app)
        .patch(`/api/admin/finance/accounts/${account.id}`)
        .set('Authorization', authHeader(ids.superAdmin).Authorization)
        .send({ expected_updated_at: expected, code: 'ACC.CONCURRENT.STRUCT.A' }),
      request(app)
        .patch(`/api/admin/finance/accounts/${account.id}`)
        .set('Authorization', authHeader(ids.superAdmin).Authorization)
        .send({ expected_updated_at: expected, code: 'ACC.CONCURRENT.STRUCT.B' }),
    ]);

    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([200, 409]);

    const finalRecord = await prisma.financial_accounts.findUnique({ where: { id: account.id } });
    expect(['ACC.CONCURRENT.STRUCT.A', 'ACC.CONCURRENT.STRUCT.B']).toContain(finalRecord.code);

    const auditCount = await countAudit('FINANCE_ACCOUNT_UPDATE', account.id);
    expect(auditCount).toBe(1);
  });

  it('bloqueia desativação de conta com DRAFT/PENDING/BLOCKED e permite apenas histórico finalizado', async () => {
    for (const status of ['DRAFT', 'PENDING', 'BLOCKED']) {
      const account = await createAccountFixture({ code: `ACC.NONFINAL.${status}` });
      await createTransactionFixture({ account_id: account.id, status });

      const res = await request(app)
        .patch(`/api/admin/finance/accounts/${account.id}`)
        .set('Authorization', authHeader(ids.superAdmin).Authorization)
        .send({ expected_updated_at: account.updated_at.toISOString(), is_active: false });

      expect(res.status).toBe(409);
    }

    const finalAccount = await createAccountFixture({ code: 'ACC.FINAL.OK' });
    for (const status of ['POSTED', 'CANCELED', 'REVERSED', 'RECONCILED', 'CLOSED']) {
      await createTransactionFixture({ account_id: finalAccount.id, status, idempotency_key: nextId(`idem-${status}`) });
    }

    const ok = await request(app)
      .patch(`/api/admin/finance/accounts/${finalAccount.id}`)
      .set('Authorization', authHeader(ids.superAdmin).Authorization)
      .send({ expected_updated_at: finalAccount.updated_at.toISOString(), is_active: false });

    expect(ok.status).toBe(200);
    expect(ok.body.data.is_active).toBe(false);
  });

  it('cria categoria comum, rejeita is_system, detecta self-parent, ciclo indireto e kind incompatível', async () => {
    const created = await request(app)
      .post('/api/admin/finance/categories')
      .set('Authorization', authHeader(ids.financeAdmin).Authorization)
      .send({ code: 'CAT.WRITE.001', name: 'Categoria', kind: 'EXPENSE' });

    expect(created.status).toBe(201);
    expect(await latestAudit('FINANCE_CATEGORY_CREATE', created.body.data.id)).toBeTruthy();

    const persistedCreated = await prisma.financial_categories.findUnique({
      where: { id: created.body.data.id },
      select: { is_postable: true },
    });
    expect(persistedCreated?.is_postable).toBe(false);

    const postWithIsPostable = await request(app)
      .post('/api/admin/finance/categories')
      .set('Authorization', authHeader(ids.financeAdmin).Authorization)
      .send({ code: 'CAT.WRITE.001.POSTABLE', name: 'Categoria', kind: 'EXPENSE', is_postable: true });
    expect(postWithIsPostable.status).toBe(400);

    const patchWithIsPostable = await request(app)
      .patch(`/api/admin/finance/categories/${created.body.data.id}`)
      .set('Authorization', authHeader(ids.financeAdmin).Authorization)
      .send({ expected_updated_at: created.body.data.updated_at, is_postable: true });
    expect(patchWithIsPostable.status).toBe(400);

    const persistedAfterPatchAttempt = await prisma.financial_categories.findUnique({
      where: { id: created.body.data.id },
      select: { is_postable: true },
    });
    expect(persistedAfterPatchAttempt?.is_postable).toBe(false);

    const getCreated = await request(app)
      .get(`/api/admin/finance/categories/${created.body.data.id}`)
      .set('Authorization', authHeader(ids.financeAdmin).Authorization);
    expect(getCreated.status).toBe(200);
    expect(getCreated.body.data.is_postable).toBeUndefined();

    const isSystem = await request(app)
      .post('/api/admin/finance/categories')
      .set('Authorization', authHeader(ids.financeAdmin).Authorization)
      .send({ code: 'CAT.WRITE.002', name: 'Categoria', kind: 'EXPENSE', is_system: true });
    expect(isSystem.status).toBe(400);

    const self = await createCategoryFixture({ code: 'CAT.SELF' });
    const selfPatch = await request(app)
      .patch(`/api/admin/finance/categories/${self.id}`)
      .set('Authorization', authHeader(ids.financeAdmin).Authorization)
      .send({ expected_updated_at: self.updated_at.toISOString(), parent_id: self.id });
    expect(selfPatch.status).toBe(409);

    const parent = await createCategoryFixture({ code: 'CAT.PARENT', kind: 'EXPENSE' });
    const child = await createCategoryFixture({ code: 'CAT.CHILD', kind: 'EXPENSE', parent_id: parent.id });
    const cycle = await request(app)
      .patch(`/api/admin/finance/categories/${parent.id}`)
      .set('Authorization', authHeader(ids.financeAdmin).Authorization)
      .send({ expected_updated_at: parent.updated_at.toISOString(), parent_id: child.id });
    expect(cycle.status).toBe(409);

    const revenueParent = await createCategoryFixture({ code: 'CAT.REVENUE', kind: 'REVENUE' });
    const kindMismatch = await request(app)
      .post('/api/admin/finance/categories')
      .set('Authorization', authHeader(ids.financeAdmin).Authorization)
      .send({ code: 'CAT.MISMATCH', name: 'Filha', kind: 'EXPENSE', parent_id: revenueParent.id });
    expect(kindMismatch.status).toBe(409);
  });

  it('permite FINANCE editar categoria comum e bloqueia categoria de sistema ou campos protegidos', async () => {
    const common = await createCategoryFixture({ code: 'CAT.FIN.COMMON' });
    const commonPatch = await request(app)
      .patch(`/api/admin/finance/categories/${common.id}`)
      .set('Authorization', authHeader(ids.financeAdmin).Authorization)
      .send({ expected_updated_at: common.updated_at.toISOString(), name: 'Categoria Editada', sort_order: 9 });
    expect(commonPatch.status).toBe(200);

    const systemCategory = await createCategoryFixture({ code: 'CAT.SYSTEM', is_system: true });
    const financeSystemPatch = await request(app)
      .patch(`/api/admin/finance/categories/${systemCategory.id}`)
      .set('Authorization', authHeader(ids.financeAdmin).Authorization)
      .send({ expected_updated_at: systemCategory.updated_at.toISOString(), name: 'Tentativa' });
    expect(financeSystemPatch.status).toBe(403);

    const superProtectedPatch = await request(app)
      .patch(`/api/admin/finance/categories/${systemCategory.id}`)
      .set('Authorization', authHeader(ids.superAdmin).Authorization)
      .send({ expected_updated_at: systemCategory.updated_at.toISOString(), code: 'CAT.SYSTEM.NEW' });
    expect(superProtectedPatch.status).toBe(409);
  });

  it('bloqueia alteração estrutural de categoria com uso e bloqueia desativação por filho ativo ou uso não final', async () => {
    const categoryInUse = await createCategoryFixture({ code: 'CAT.IN.USE' });
    const account = await createAccountFixture({ code: 'ACC.CAT.USE' });
    await createTransactionFixture({ account_id: account.id, category_id: categoryInUse.id, status: 'POSTED' });

    const structural = await request(app)
      .patch(`/api/admin/finance/categories/${categoryInUse.id}`)
      .set('Authorization', authHeader(ids.superAdmin).Authorization)
      .send({ expected_updated_at: categoryInUse.updated_at.toISOString(), code: 'CAT.IN.USE.2' });
    expect(structural.status).toBe(409);

    const parent = await createCategoryFixture({ code: 'CAT.DEACT.PARENT' });
    await createCategoryFixture({ code: 'CAT.DEACT.CHILD', parent_id: parent.id, is_active: true });
    const childActive = await request(app)
      .patch(`/api/admin/finance/categories/${parent.id}`)
      .set('Authorization', authHeader(ids.financeAdmin).Authorization)
      .send({ expected_updated_at: parent.updated_at.toISOString(), is_active: false });
    expect(childActive.status).toBe(409);

    const categoryWithDraftAllocation = await createCategoryFixture({ code: 'CAT.DEACT.ALLOC' });
    const allocationTx = await createTransactionFixture({ account_id: account.id, status: 'DRAFT', category_id: null });
    await createAllocationFixture({ transaction_id: allocationTx.id, category_id: categoryWithDraftAllocation.id });
    const allocationBlock = await request(app)
      .patch(`/api/admin/finance/categories/${categoryWithDraftAllocation.id}`)
      .set('Authorization', authHeader(ids.financeAdmin).Authorization)
      .send({ expected_updated_at: categoryWithDraftAllocation.updated_at.toISOString(), is_active: false });
    expect(allocationBlock.status).toBe(409);
  });

  it('cria centros de custo com território, cidade/UF, território+cidade/UF, aceita UF sem city e valida locality errors', async () => {
    const withTerritory = await request(app)
      .post('/api/admin/finance/cost-centers')
      .set('Authorization', authHeader(ids.financeAdmin).Authorization)
      .send({ code: 'CC.WRITE.TERR', name: 'Com Território', type: 'DEPARTMENT', territory_id: ids.territory });
    expect(withTerritory.status).toBe(201);

    const withCityState = await request(app)
      .post('/api/admin/finance/cost-centers')
      .set('Authorization', authHeader(ids.financeAdmin).Authorization)
      .send({ code: 'CC.WRITE.CITY', name: 'Com Cidade', type: 'DEPARTMENT', city: 'Campinas', state: 'sp' });
    expect(withCityState.status).toBe(201);
    expect(withCityState.body.data.state).toBe('SP');

    const withAll = await request(app)
      .post('/api/admin/finance/cost-centers')
      .set('Authorization', authHeader(ids.financeAdmin).Authorization)
      .send({ code: 'CC.WRITE.ALL', name: 'Completo', type: 'DEPARTMENT', territory_id: ids.territory, city: 'Rio de Janeiro', state: 'RJ' });
    expect(withAll.status).toBe(201);

    const stateOnly = await request(app)
      .post('/api/admin/finance/cost-centers')
      .set('Authorization', authHeader(ids.financeAdmin).Authorization)
      .send({ code: 'CC.WRITE.STATE', name: 'UF Apenas', type: 'DEPARTMENT', state: 'MG' });
    expect(stateOnly.status).toBe(201);

    const noTerritory = await request(app)
      .post('/api/admin/finance/cost-centers')
      .set('Authorization', authHeader(ids.financeAdmin).Authorization)
      .send({ code: 'CC.WRITE.BADTERR', name: 'Inválido', type: 'DEPARTMENT', territory_id: 'missing-territory' });
    expect(noTerritory.status).toBe(404);

    const noState = await request(app)
      .post('/api/admin/finance/cost-centers')
      .set('Authorization', authHeader(ids.financeAdmin).Authorization)
      .send({ code: 'CC.WRITE.NOSTATE', name: 'Sem UF', type: 'DEPARTMENT', city: 'Campinas' });
    expect(noState.status).toBe(400);

    const invalidUf = await request(app)
      .post('/api/admin/finance/cost-centers')
      .set('Authorization', authHeader(ids.financeAdmin).Authorization)
      .send({ code: 'CC.WRITE.BADUF', name: 'UF Inválida', type: 'DEPARTMENT', state: 'R1' });
    expect(invalidUf.status).toBe(400);

    expect(await latestAudit('FINANCE_COST_CENTER_CREATE', withTerritory.body.data.id)).toBeTruthy();
  });

  it('detecta self-parent e ciclo indireto em centros de custo e permite FINANCE alterar territory_id', async () => {
    const self = await createCostCenterFixture({ code: 'CC.SELF' });
    const selfPatch = await request(app)
      .patch(`/api/admin/finance/cost-centers/${self.id}`)
      .set('Authorization', authHeader(ids.financeAdmin).Authorization)
      .send({ expected_updated_at: self.updated_at.toISOString(), parent_id: self.id });
    expect(selfPatch.status).toBe(409);

    const parent = await createCostCenterFixture({ code: 'CC.PARENT' });
    const child = await createCostCenterFixture({ code: 'CC.CHILD', parent_id: parent.id });
    const cycle = await request(app)
      .patch(`/api/admin/finance/cost-centers/${parent.id}`)
      .set('Authorization', authHeader(ids.financeAdmin).Authorization)
      .send({ expected_updated_at: parent.updated_at.toISOString(), parent_id: child.id });
    expect(cycle.status).toBe(409);

    const editable = await createCostCenterFixture({ code: 'CC.TERR.EDIT' });
    const updateTerritory = await request(app)
      .patch(`/api/admin/finance/cost-centers/${editable.id}`)
      .set('Authorization', authHeader(ids.financeAdmin).Authorization)
      .send({ expected_updated_at: editable.updated_at.toISOString(), territory_id: ids.territory });
    expect(updateTerritory.status).toBe(200);
    expect(updateTerritory.body.data.territory_id).toBe(ids.territory);
  });

  it('bloqueia alteração estrutural de centro de custo com uso e bloqueia desativação por filho ativo ou uso não final', async () => {
    const usedCostCenter = await createCostCenterFixture({ code: 'CC.USED' });
    const account = await createAccountFixture({ code: 'ACC.CC.USE' });
    await createTransactionFixture({ account_id: account.id, cost_center_id: usedCostCenter.id, status: 'POSTED' });
    const structural = await request(app)
      .patch(`/api/admin/finance/cost-centers/${usedCostCenter.id}`)
      .set('Authorization', authHeader(ids.superAdmin).Authorization)
      .send({ expected_updated_at: usedCostCenter.updated_at.toISOString(), type: 'PROJECT' });
    expect(structural.status).toBe(409);

    const parent = await createCostCenterFixture({ code: 'CC.DEACT.PARENT' });
    await createCostCenterFixture({ code: 'CC.DEACT.CHILD', parent_id: parent.id, is_active: true });
    const childActive = await request(app)
      .patch(`/api/admin/finance/cost-centers/${parent.id}`)
      .set('Authorization', authHeader(ids.financeAdmin).Authorization)
      .send({ expected_updated_at: parent.updated_at.toISOString(), is_active: false });
    expect(childActive.status).toBe(409);

    const costCenterWithDraftAllocation = await createCostCenterFixture({ code: 'CC.DEACT.ALLOC' });
    const allocationTx = await createTransactionFixture({ account_id: account.id, status: 'DRAFT', cost_center_id: null });
    const allocCategory = await createCategoryFixture({ code: 'CAT.ALLOC.CC' });
    await createAllocationFixture({ transaction_id: allocationTx.id, category_id: allocCategory.id, cost_center_id: costCenterWithDraftAllocation.id });
    const allocationBlock = await request(app)
      .patch(`/api/admin/finance/cost-centers/${costCenterWithDraftAllocation.id}`)
      .set('Authorization', authHeader(ids.financeAdmin).Authorization)
      .send({ expected_updated_at: costCenterWithDraftAllocation.updated_at.toISOString(), is_active: false });
    expect(allocationBlock.status).toBe(409);
  });

  it('mantém PUT e DELETE indisponíveis', async () => {
    const account = await createAccountFixture({ code: 'ACC.METHODS' });
    const category = await createCategoryFixture({ code: 'CAT.METHODS' });
    const costCenter = await createCostCenterFixture({ code: 'CC.METHODS' });

    const responses = await Promise.all([
      request(app).put(`/api/admin/finance/accounts/${account.id}`).set('Authorization', authHeader(ids.superAdmin).Authorization),
      request(app).delete(`/api/admin/finance/accounts/${account.id}`).set('Authorization', authHeader(ids.superAdmin).Authorization),
      request(app).put(`/api/admin/finance/categories/${category.id}`).set('Authorization', authHeader(ids.superAdmin).Authorization),
      request(app).delete(`/api/admin/finance/categories/${category.id}`).set('Authorization', authHeader(ids.superAdmin).Authorization),
      request(app).put(`/api/admin/finance/cost-centers/${costCenter.id}`).set('Authorization', authHeader(ids.superAdmin).Authorization),
      request(app).delete(`/api/admin/finance/cost-centers/${costCenter.id}`).set('Authorization', authHeader(ids.superAdmin).Authorization),
    ]);

    for (const response of responses) {
      expect([404, 405]).toContain(response.status);
    }
  });
});