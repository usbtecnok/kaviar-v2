import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const DB_URL = process.env.DATABASE_URL || 'postgresql://finance:finance@127.0.0.1:55432/finance_phase1c_a1_test?schema=public';
const JWT_SECRET = 'finance-integration-secret';

process.env.DATABASE_URL = DB_URL;
process.env.JWT_SECRET = JWT_SECRET;
process.env.ADMIN_JWT_SECRET = JWT_SECRET;

const ids = {
  superAdmin: 'admin-finance-super',
  financeAdmin: 'admin-finance-finance',
  accountant: 'admin-finance-accountant',
  otherAdmin: 'admin-finance-other',
  territory: 'territory-finance-rj',
  accountSensitive: 'finance-account-sensitive',
  accountSecondary: 'finance-account-secondary',
  categoryParent: 'finance-category-parent',
  categoryChild: 'finance-category-child',
  costCenterParent: 'finance-cost-center-parent',
  costCenterChild: 'finance-cost-center-child',
  recognitionPolicy: 'finance-recognition-policy',
  transactionMain: 'finance-transaction-main',
  transactionReversal: 'finance-transaction-reversal',
  transactionLinked: 'finance-transaction-linked',
  allocation: 'finance-allocation-main',
  linkOutbound: 'finance-link-outbound',
  linkInbound: 'finance-link-inbound',
};

const OFFICIAL_CATALOG_EXPECTED = {
  categories: 51,
  costCenters: 8,
  policies: 5,
  accounts: 0,
};

let app: express.Express;
let prisma: any;

function tokenFor(adminId: string) {
  return jwt.sign({ userId: adminId, userType: 'ADMIN', email: `${adminId}@test.local` }, JWT_SECRET, { expiresIn: '1h' });
}

function authHeader(adminId: string) {
  return { Authorization: `Bearer ${tokenFor(adminId)}` };
}

function stripIds(rows: Array<{ id: string }>) {
  return rows.map((row) => row.id).sort();
}

async function createFixtures() {
  await prisma.admins.createMany({
    data: [
      { id: ids.superAdmin, name: 'Super Admin Finance', email: 'super.finance@test.local', password: 'x', role: 'SUPER_ADMIN', is_active: true, must_change_password: false },
      { id: ids.financeAdmin, name: 'Finance Admin', email: 'finance@test.local', password: 'x', role: 'FINANCE', is_active: true, must_change_password: false },
      { id: ids.accountant, name: 'Accountant Admin', email: 'accountant@test.local', password: 'x', role: 'ACCOUNTANT', is_active: true, must_change_password: false },
      { id: ids.otherAdmin, name: 'Other Admin', email: 'other@test.local', password: 'x', role: 'OPERATOR', is_active: true, must_change_password: false },
    ],
  });

  await prisma.operational_territories.create({
    data: {
      id: ids.territory,
      name: 'RJ Financeiro',
      level: 'city',
      status: 'active',
      city_name: 'Rio de Janeiro',
      uf: 'RJ',
      is_active: true,
    },
  });

  await prisma.financial_accounts.createMany({
    data: [
      {
        id: ids.accountSensitive,
        code: 'FIN-SENS',
        name: 'Conta Sensível',
        type: 'BANK',
        institution_name: 'Banco Segredo',
        bank_code: '001',
        agency_encrypted: 'enc-agency',
        account_number_encrypted: 'enc-account',
        account_digit_encrypted: 'enc-digit',
        pix_key_encrypted: 'enc-pix',
        document_encrypted: 'enc-doc',
        account_fingerprint: 'fingerprint-1',
        account_last4: '4321',
        pix_key_last4: '9876',
        encryption_key_version: 'v1',
        currency: 'BRL',
        opening_balance_cents: 150000n,
        opening_balance_date: new Date('2026-06-01T00:00:00.000Z'),
        allows_negative_balance: false,
        is_cash_equivalent: true,
        is_active: true,
        notes: 'Conta com dados sensíveis',
        created_by_admin_id: ids.superAdmin,
        updated_by_admin_id: ids.financeAdmin,
      },
      {
        id: ids.accountSecondary,
        code: 'FIN-CASH',
        name: 'Caixa Operacional',
        type: 'CASH',
        currency: 'BRL',
        opening_balance_cents: 0n,
        allows_negative_balance: true,
        is_cash_equivalent: false,
        is_active: false,
        created_by_admin_id: ids.financeAdmin,
        updated_by_admin_id: ids.financeAdmin,
      },
    ],
  });

  await prisma.financial_categories.createMany({
    data: [
      {
        id: ids.categoryParent,
        code: 'CAT-PARENT',
        name: 'Categoria Pai',
        kind: 'REVENUE',
        default_direction: 'IN',
        requires_document: false,
        is_system: false,
        is_active: true,
        is_postable: false,
        sort_order: 1,
        created_by_admin_id: ids.superAdmin,
        updated_by_admin_id: ids.financeAdmin,
      },
      {
        id: ids.categoryChild,
        code: 'CAT-CHILD',
        name: 'Categoria Filha',
        kind: 'REVENUE',
        parent_id: ids.categoryParent,
        default_direction: 'IN',
        requires_document: true,
        is_system: true,
        is_active: false,
        is_postable: false,
        sort_order: 2,
        created_by_admin_id: ids.financeAdmin,
        updated_by_admin_id: ids.financeAdmin,
      },
    ],
  });

  await prisma.financial_cost_centers.createMany({
    data: [
      {
        id: ids.costCenterParent,
        code: 'CC-PARENT',
        name: 'Centro Pai',
        type: 'COMPANY',
        is_active: true,
        created_by_admin_id: ids.superAdmin,
        updated_by_admin_id: ids.financeAdmin,
      },
      {
        id: ids.costCenterChild,
        code: 'CC-CHILD',
        name: 'Centro Filho',
        type: 'DEPARTMENT',
        parent_id: ids.costCenterParent,
        territory_id: ids.territory,
        city: 'Rio de Janeiro',
        state: 'RJ',
        is_active: false,
        created_by_admin_id: ids.financeAdmin,
        updated_by_admin_id: ids.financeAdmin,
      },
    ],
  });

  await prisma.financial_recognition_policies.create({
    data: {
      id: ids.recognitionPolicy,
      code: 'POL-001',
      subject: 'RIDE_REVENUE',
      scope_type: 'COST_CENTER',
      territory_id: null,
      cost_center_id: ids.costCenterChild,
      city: null,
      state: null,
      policy: 'GROSS_PRINCIPAL',
      status: 'APPROVED',
      effective_from: new Date('2026-06-01T00:00:00.000Z'),
      effective_until: null,
      approved_by_admin_id: ids.superAdmin,
      approved_at: new Date('2026-06-01T12:00:00.000Z'),
      reason: 'Regra principal de receita',
      notes: 'Fixture de integração',
      created_by_admin_id: ids.financeAdmin,
      updated_by_admin_id: ids.financeAdmin,
    },
  });

  await prisma.financial_transactions.createMany({
    data: [
      {
        id: ids.transactionMain,
        external_reference: 'ext-main',
        provider: 'provider-a',
        provider_event_id: 'evt-main',
        source_type: 'MANUAL',
        source_id: 'source-main',
        origin_type: 'MANUAL',
        origin_id: 'origin-main',
        account_id: ids.accountSensitive,
        counterparty_account_id: ids.accountSecondary,
        category_id: null,
        cost_center_id: null,
        transfer_group_id: null,
        direction: 'IN',
        transaction_type: 'INCOME',
        status: 'POSTED',
        payment_method: 'PIX',
        recognition_policy: 'GROSS_PRINCIPAL',
        competence_date: new Date('2026-06-10T00:00:00.000Z'),
        transaction_date: new Date('2026-06-11T00:00:00.000Z'),
        due_date: new Date('2026-06-12T00:00:00.000Z'),
        settlement_date: new Date('2026-06-13T00:00:00.000Z'),
        gross_amount_cents: 100000n,
        fee_amount_cents: 2500n,
        discount_amount_cents: 500n,
        retention_amount_cents: 0n,
        net_amount_cents: 97000n,
        transfer_amount_cents: null,
        description: 'Recebimento principal',
        memo: 'Memorando do lançamento principal',
        metadata: { channel: 'api', source: 'integration' },
        idempotency_key: 'idem-main',
        created_by_admin_id: ids.superAdmin,
        approved_by_admin_id: ids.superAdmin,
        responsible_admin_id: ids.financeAdmin,
      },
      {
        id: ids.transactionReversal,
        external_reference: 'ext-reversal',
        provider: 'provider-a',
        provider_event_id: 'evt-reversal',
        source_type: 'MANUAL',
        source_id: 'source-reversal',
        origin_type: 'MANUAL',
        origin_id: 'origin-reversal',
        account_id: ids.accountSensitive,
        category_id: ids.categoryParent,
        cost_center_id: ids.costCenterParent,
        direction: 'OUT',
        transaction_type: 'REVERSAL',
        status: 'REVERSED',
        payment_method: 'BANK_TRANSFER',
        recognition_policy: 'UNCLASSIFIED',
        competence_date: new Date('2026-06-14T00:00:00.000Z'),
        transaction_date: new Date('2026-06-15T00:00:00.000Z'),
        gross_amount_cents: 100000n,
        fee_amount_cents: 0n,
        discount_amount_cents: 0n,
        retention_amount_cents: 0n,
        net_amount_cents: 100000n,
        transfer_amount_cents: null,
        reversal_of_id: ids.transactionMain,
        canceled_reason: null,
        canceled_at: null,
        description: 'Estorno do lançamento principal',
        memo: null,
        metadata: { reason: 'audit' },
        idempotency_key: 'idem-reversal',
        created_by_admin_id: ids.financeAdmin,
        approved_by_admin_id: ids.superAdmin,
        responsible_admin_id: ids.financeAdmin,
      },
      {
        id: ids.transactionLinked,
        external_reference: 'ext-linked',
        provider: 'provider-b',
        provider_event_id: 'evt-linked',
        source_type: 'BANK_IMPORT',
        source_id: 'source-linked',
        origin_type: 'BANK',
        origin_id: 'origin-linked',
        account_id: ids.accountSecondary,
        counterparty_account_id: ids.accountSensitive,
        category_id: ids.categoryParent,
        cost_center_id: ids.costCenterParent,
        transfer_group_id: 'group-1',
        direction: 'OUT',
        transaction_type: 'TRANSFER',
        status: 'POSTED',
        payment_method: 'CASH',
        recognition_policy: 'NET_AGENT',
        competence_date: new Date('2026-06-16T00:00:00.000Z'),
        transaction_date: new Date('2026-06-17T00:00:00.000Z'),
        gross_amount_cents: 50000n,
        fee_amount_cents: 1000n,
        discount_amount_cents: 0n,
        retention_amount_cents: 0n,
        net_amount_cents: 49000n,
        transfer_amount_cents: 25000n,
        description: 'Lançamento vinculado',
        memo: 'Memo do lançamento vinculado',
        metadata: { channel: 'manual' },
        idempotency_key: 'idem-linked',
        created_by_admin_id: ids.financeAdmin,
        approved_by_admin_id: ids.superAdmin,
        responsible_admin_id: ids.otherAdmin,
      },
    ],
  });

  await prisma.financial_transaction_allocations.create({
    data: {
      id: ids.allocation,
      transaction_id: ids.transactionMain,
      category_id: ids.categoryChild,
      cost_center_id: ids.costCenterChild,
      amount_cents: 100000n,
      allocation_type: 'ALLOCATED',
      description: 'Rateio principal',
      metadata: { segment: 'premium' },
      created_by_admin_id: ids.financeAdmin,
    },
  });

  await prisma.financial_transaction_links.createMany({
    data: [
      {
        id: ids.linkOutbound,
        transaction_id: ids.transactionMain,
        linked_transaction_id: ids.transactionLinked,
        link_type: 'TRANSFER_PAIR',
        amount_cents: 25000n,
        metadata: { side: 'outbound' },
        created_by_admin_id: ids.financeAdmin,
      },
      {
        id: ids.linkInbound,
        transaction_id: ids.transactionLinked,
        linked_transaction_id: ids.transactionMain,
        link_type: 'TRANSFER_PAIR',
        amount_cents: 25000n,
        metadata: { side: 'inbound' },
        created_by_admin_id: ids.superAdmin,
      },
    ],
  });
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

async function cleanupFixtures() {
  await prisma.financial_transaction_links.deleteMany({ where: { id: { in: [ids.linkOutbound, ids.linkInbound] } } });
  await prisma.financial_transaction_allocations.deleteMany({ where: { id: ids.allocation } });
  await prisma.financial_transactions.deleteMany({ where: { id: { in: [ids.transactionMain, ids.transactionReversal, ids.transactionLinked] } } });
  await prisma.financial_recognition_policies.deleteMany({ where: { id: ids.recognitionPolicy } });
  await prisma.financial_cost_centers.deleteMany({ where: { id: { in: [ids.costCenterChild, ids.costCenterParent] } } });
  await prisma.financial_categories.deleteMany({ where: { id: { in: [ids.categoryChild, ids.categoryParent] } } });
  await prisma.financial_accounts.deleteMany({ where: { id: { in: [ids.accountSensitive, ids.accountSecondary] } } });
  await prisma.operational_territories.deleteMany({ where: { id: ids.territory } });
  await prisma.admins.deleteMany({ where: { id: { in: [ids.otherAdmin, ids.accountant, ids.financeAdmin, ids.superAdmin] } } });
}

async function snapshotCounts() {
  return {
    admins: await prisma.admins.count({ where: { id: { in: [ids.superAdmin, ids.financeAdmin, ids.accountant, ids.otherAdmin] } } }),
    operational_territories: await prisma.operational_territories.count({ where: { id: ids.territory } }),
    financial_accounts: await prisma.financial_accounts.count({ where: { id: { in: [ids.accountSensitive, ids.accountSecondary] } } }),
    financial_categories: await prisma.financial_categories.count({ where: { id: { in: [ids.categoryParent, ids.categoryChild] } } }),
    financial_cost_centers: await prisma.financial_cost_centers.count({ where: { id: { in: [ids.costCenterParent, ids.costCenterChild] } } }),
    financial_recognition_policies: await prisma.financial_recognition_policies.count({ where: { id: ids.recognitionPolicy } }),
    financial_transactions: await prisma.financial_transactions.count({ where: { id: { in: [ids.transactionMain, ids.transactionReversal, ids.transactionLinked] } } }),
    financial_transaction_allocations: await prisma.financial_transaction_allocations.count({ where: { id: ids.allocation } }),
    financial_transaction_links: await prisma.financial_transaction_links.count({ where: { id: { in: [ids.linkOutbound, ids.linkInbound] } } }),
  };
}

beforeAll(async () => {
  const appModule = await import('../src/app');
  const prismaModule = await import('../src/lib/prisma');
  app = appModule.default;
  prisma = prismaModule.prisma;
  await prisma.$connect();
  await assertOfficialCatalogCounts('query integration before suite');
  await createFixtures();
});

afterAll(async () => {
  await cleanupFixtures();
  await assertOfficialCatalogCounts('query integration after suite cleanup');
  await prisma.$disconnect();
});

describe('admin finance query integration', () => {
  it('auth matrix applies to list and detail routes', async () => {
    const listPath = '/api/admin/finance/accounts';
    const detailPath = `/api/admin/finance/accounts/${ids.accountSensitive}`;

    const listResponses = await Promise.all([
      request(app).get(listPath),
      request(app).get(listPath).set('Authorization', 'Bearer invalid-token'),
      request(app).get(listPath).set('Authorization', authHeader(ids.superAdmin).Authorization),
      request(app).get(listPath).set('Authorization', authHeader(ids.financeAdmin).Authorization),
      request(app).get(listPath).set('Authorization', authHeader(ids.accountant).Authorization),
      request(app).get(listPath).set('Authorization', authHeader(ids.otherAdmin).Authorization),
    ]);

    expect(listResponses[0].status).toBe(401);
    expect(listResponses[1].status).toBe(401);
    expect(listResponses[2].status).toBe(200);
    expect(listResponses[3].status).toBe(200);
    expect(listResponses[4].status).toBe(403);
    expect(listResponses[5].status).toBe(403);

    const detailResponses = await Promise.all([
      request(app).get(detailPath),
      request(app).get(detailPath).set('Authorization', 'Bearer invalid-token'),
      request(app).get(detailPath).set('Authorization', authHeader(ids.superAdmin).Authorization),
      request(app).get(detailPath).set('Authorization', authHeader(ids.financeAdmin).Authorization),
      request(app).get(detailPath).set('Authorization', authHeader(ids.accountant).Authorization),
      request(app).get(detailPath).set('Authorization', authHeader(ids.otherAdmin).Authorization),
    ]);

    expect(detailResponses[0].status).toBe(401);
    expect(detailResponses[1].status).toBe(401);
    expect(detailResponses[2].status).toBe(200);
    expect(detailResponses[3].status).toBe(200);
    expect(detailResponses[4].status).toBe(403);
    expect(detailResponses[5].status).toBe(403);
  });

  it('validates pagination, booleans, enums and dates', async () => {
    const base = request(app).get('/api/admin/finance/accounts').set('Authorization', authHeader(ids.superAdmin).Authorization);

    const defaultPagination = await base;
    expect(defaultPagination.status).toBe(200);
    expect(defaultPagination.body.pagination.page).toBe(1);
    expect(defaultPagination.body.pagination.limit).toBe(25);

    const invalidQueries = [
      '/api/admin/finance/accounts?page=0',
      '/api/admin/finance/accounts?page=-1',
      '/api/admin/finance/accounts?page=abc',
      '/api/admin/finance/accounts?limit=0',
      '/api/admin/finance/accounts?limit=101',
      '/api/admin/finance/accounts?is_active=maybe',
      '/api/admin/finance/accounts?type=INVALID',
      '/api/admin/finance/transactions?date_from=invalid',
      '/api/admin/finance/transactions?date_from=2026-06-30&date_to=2026-06-01',
      '/api/admin/finance/transactions?date_field=bad_field',
    ];

    for (const path of invalidQueries) {
      const response = await request(app).get(path).set('Authorization', authHeader(ids.superAdmin).Authorization);
      expect(response.status).toBe(400);
    }

    const boolTrue = await request(app).get('/api/admin/finance/accounts?is_active=true').set('Authorization', authHeader(ids.superAdmin).Authorization);
    const boolFalse = await request(app).get('/api/admin/finance/accounts?is_active=false').set('Authorization', authHeader(ids.superAdmin).Authorization);
    expect(boolTrue.status).toBe(200);
    expect(boolFalse.status).toBe(200);

    const enumAccepted = await request(app).get('/api/admin/finance/categories?kind=REVENUE').set('Authorization', authHeader(ids.superAdmin).Authorization);
    expect(enumAccepted.status).toBe(200);
  });

  it('reads accounts without exposing sensitive fields or computed balances', async () => {
    const page1 = await request(app)
      .get('/api/admin/finance/accounts?search=Conta&limit=1&page=1&type=BANK&is_active=true&is_cash_equivalent=true&allows_negative_balance=false')
      .set('Authorization', authHeader(ids.superAdmin).Authorization);

    const page2 = await request(app)
      .get('/api/admin/finance/accounts?search=Conta&limit=1&page=2&type=BANK&is_active=true&is_cash_equivalent=true&allows_negative_balance=false')
      .set('Authorization', authHeader(ids.superAdmin).Authorization);

    expect(page1.status).toBe(200);
    expect(page1.body.pagination).toMatchObject({ page: 1, limit: 1, total: 1, totalPages: 1 });
    expect(page1.body.data[0].opening_balance_cents).toBe('150000');
    expect(page1.body.data[0]).not.toHaveProperty('account_fingerprint');
    expect(page1.body.data[0]).not.toHaveProperty('agency_encrypted');
    expect(page1.body.data[0]).not.toHaveProperty('account_number_encrypted');
    expect(page1.body.data[0]).not.toHaveProperty('account_digit_encrypted');
    expect(page1.body.data[0]).not.toHaveProperty('pix_key_encrypted');
    expect(page1.body.data[0]).not.toHaveProperty('document_encrypted');
    expect(page1.body.data[0]).not.toHaveProperty('account_last4');
    expect(page1.body.data[0]).not.toHaveProperty('pix_key_last4');
    expect(page1.body.data[0]).not.toHaveProperty('currency_balance');

    expect(page2.status).toBe(200);
    expect(page2.body.data).toHaveLength(0);

    const detail = await request(app)
      .get(`/api/admin/finance/accounts/${ids.accountSensitive}`)
      .set('Authorization', authHeader(ids.superAdmin).Authorization);

    expect(detail.status).toBe(200);
    expect(detail.body.data.opening_balance_cents).toBe('150000');
    expect(detail.body.data).not.toHaveProperty('account_fingerprint');
    expect(detail.body.data).not.toHaveProperty('agency_encrypted');
    expect(detail.body.data).not.toHaveProperty('account_number_encrypted');
    expect(detail.body.data).not.toHaveProperty('account_digit_encrypted');
    expect(detail.body.data).not.toHaveProperty('pix_key_encrypted');
    expect(detail.body.data).not.toHaveProperty('document_encrypted');
    expect(detail.body.data).not.toHaveProperty('account_last4');
    expect(detail.body.data).not.toHaveProperty('pix_key_last4');
    expect(detail.body.data).not.toHaveProperty('current_balance_cents');

    const missing = await request(app)
      .get('/api/admin/finance/accounts/missing-account')
      .set('Authorization', authHeader(ids.superAdmin).Authorization);
    expect(missing.status).toBe(404);
  });

  it('reads categories with hierarchy and without transactions or allocations', async () => {
    const list = await request(app)
      .get('/api/admin/finance/categories?search=Categoria&kind=REVENUE&parent_id=' + ids.categoryParent + '&is_active=false&is_system=true&limit=10&page=1')
      .set('Authorization', authHeader(ids.superAdmin).Authorization);

    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0]).toMatchObject({
      id: ids.categoryChild,
      parent: expect.objectContaining({ id: ids.categoryParent }),
      children_count: 0,
    });
    expect(list.body.data[0]).not.toHaveProperty('financial_transactions');
    expect(list.body.data[0]).not.toHaveProperty('financial_transaction_allocations');

    const detail = await request(app)
      .get(`/api/admin/finance/categories/${ids.categoryParent}`)
      .set('Authorization', authHeader(ids.superAdmin).Authorization);

    expect(detail.status).toBe(200);
    expect(detail.body.data.children).toEqual([
      expect.objectContaining({ id: ids.categoryChild, code: 'CAT-CHILD' }),
    ]);
    expect(detail.body.data).not.toHaveProperty('financial_transactions');
    expect(detail.body.data).not.toHaveProperty('financial_transaction_allocations');

    const missing = await request(app)
      .get('/api/admin/finance/categories/missing-category')
      .set('Authorization', authHeader(ids.superAdmin).Authorization);
    expect(missing.status).toBe(404);
  });

  it('reads cost centers with territory summary and hierarchy', async () => {
    const list = await request(app)
      .get('/api/admin/finance/cost-centers?search=Centro&type=DEPARTMENT&parent_id=' + ids.costCenterParent + '&territory_id=' + ids.territory + '&city=Rio de Janeiro&state=RJ&is_active=false&page=1&limit=10')
      .set('Authorization', authHeader(ids.superAdmin).Authorization);

    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0]).toMatchObject({
      id: ids.costCenterChild,
      parent: expect.objectContaining({ id: ids.costCenterParent }),
      territory: expect.objectContaining({ id: ids.territory }),
      children_count: 0,
    });
    expect(list.body.data[0]).not.toHaveProperty('financial_transactions');
    expect(list.body.data[0]).not.toHaveProperty('financial_transaction_allocations');

    const detail = await request(app)
      .get(`/api/admin/finance/cost-centers/${ids.costCenterParent}`)
      .set('Authorization', authHeader(ids.superAdmin).Authorization);

    expect(detail.status).toBe(200);
    expect(detail.body.data.children).toEqual([
      expect.objectContaining({ id: ids.costCenterChild, code: 'CC-CHILD' }),
    ]);
    expect(detail.body.data).not.toHaveProperty('financial_transactions');
    expect(detail.body.data).not.toHaveProperty('financial_transaction_allocations');

    const missing = await request(app)
      .get('/api/admin/finance/cost-centers/missing-cost-center')
      .set('Authorization', authHeader(ids.superAdmin).Authorization);
    expect(missing.status).toBe(404);
  });

  it('reads recognition policies with summaries only', async () => {
    const list = await request(app)
      .get('/api/admin/finance/recognition-policies?subject=RIDE_REVENUE&scope_type=COST_CENTER&policy=GROSS_PRINCIPAL&status=APPROVED&cost_center_id=' + ids.costCenterChild + '&page=1&limit=10')
      .set('Authorization', authHeader(ids.superAdmin).Authorization);

    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0]).toMatchObject({
      id: ids.recognitionPolicy,
      territory: null,
      cost_center: expect.objectContaining({ id: ids.costCenterChild }),
      approved_by_admin: expect.objectContaining({ id: ids.superAdmin }),
      created_by_admin: expect.objectContaining({ id: ids.financeAdmin }),
      updated_by_admin: expect.objectContaining({ id: ids.financeAdmin }),
    });
    expect(list.body.data[0]).not.toHaveProperty('transactions');
    expect(list.body.data[0]).not.toHaveProperty('allocations');

    const detail = await request(app)
      .get(`/api/admin/finance/recognition-policies/${ids.recognitionPolicy}`)
      .set('Authorization', authHeader(ids.superAdmin).Authorization);

    expect(detail.status).toBe(200);
    expect(detail.body.data.approved_by_admin).toEqual(expect.objectContaining({ id: ids.superAdmin, name: 'Super Admin Finance', role: 'SUPER_ADMIN' }));
    expect(detail.body.data.created_by_admin).toEqual(expect.objectContaining({ id: ids.financeAdmin, name: 'Finance Admin', role: 'FINANCE' }));
    expect(detail.body.data.updated_by_admin).toEqual(expect.objectContaining({ id: ids.financeAdmin, name: 'Finance Admin', role: 'FINANCE' }));

    const missing = await request(app)
      .get('/api/admin/finance/recognition-policies/missing-policy')
      .set('Authorization', authHeader(ids.superAdmin).Authorization);
    expect(missing.status).toBe(404);
  });

  it('reads transactions with list/detail separation and BigInt string serialization', async () => {
    const filters = [
      '/api/admin/finance/transactions?search=Recebimento&account_id=' + ids.accountSensitive,
      '/api/admin/finance/transactions?counterparty_account_id=' + ids.accountSecondary,
      '/api/admin/finance/transactions?category_id=' + ids.categoryParent,
      '/api/admin/finance/transactions?cost_center_id=' + ids.costCenterParent,
      '/api/admin/finance/transactions?direction=IN',
      '/api/admin/finance/transactions?transaction_type=INCOME',
      '/api/admin/finance/transactions?status=POSTED',
      '/api/admin/finance/transactions?payment_method=PIX',
      '/api/admin/finance/transactions?source_type=MANUAL',
      '/api/admin/finance/transactions?origin_type=MANUAL',
      '/api/admin/finance/transactions?provider=provider-a',
      '/api/admin/finance/transactions?transfer_group_id=group-1',
    ];

    for (const path of filters) {
      const response = await request(app).get(path).set('Authorization', authHeader(ids.superAdmin).Authorization);
      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
    }

    for (const dateField of ['transaction_date', 'competence_date', 'due_date', 'settlement_date', 'created_at']) {
      const response = await request(app)
        .get(`/api/admin/finance/transactions?date_field=${dateField}&date_from=2026-06-01&date_to=2026-06-30`)
        .set('Authorization', authHeader(ids.superAdmin).Authorization);
      expect(response.status).toBe(200);
    }

    const list = await request(app)
      .get('/api/admin/finance/transactions?page=1&limit=1&search=Recebimento&date_field=transaction_date&date_from=2026-06-01&date_to=2026-06-30')
      .set('Authorization', authHeader(ids.superAdmin).Authorization);

    expect(list.status).toBe(200);
    expect(list.body.pagination).toMatchObject({ page: 1, limit: 1, total: 1, totalPages: 1 });
    expect(list.body.data[0].gross_amount_cents).toBe('100000');
    expect(list.body.data[0].fee_amount_cents).toBe('2500');
    expect(list.body.data[0].discount_amount_cents).toBe('500');
    expect(list.body.data[0].retention_amount_cents).toBe('0');
    expect(list.body.data[0].net_amount_cents).toBe('97000');
    expect(list.body.data[0].transfer_amount_cents).toBeNull();
    expect(list.body.data[0]).not.toHaveProperty('metadata');
    expect(list.body.data[0]).not.toHaveProperty('allocations');
    expect(list.body.data[0]).not.toHaveProperty('outgoing_links');
    expect(list.body.data[0]).not.toHaveProperty('incoming_links');
    expect(list.body.data[0].account).toEqual(expect.objectContaining({ id: ids.accountSensitive, name: 'Conta Sensível' }));
    expect(list.body.data[0].counterparty_account).toEqual(expect.objectContaining({ id: ids.accountSecondary }));
    expect(list.body.data[0].category).toBeNull();
    expect(list.body.data[0].cost_center).toBeNull();

    const detail = await request(app)
      .get(`/api/admin/finance/transactions/${ids.transactionMain}`)
      .set('Authorization', authHeader(ids.superAdmin).Authorization);

    expect(detail.status).toBe(200);
    expect(detail.body.data.gross_amount_cents).toBe('100000');
    expect(detail.body.data.fee_amount_cents).toBe('2500');
    expect(detail.body.data.discount_amount_cents).toBe('500');
    expect(detail.body.data.retention_amount_cents).toBe('0');
    expect(detail.body.data.net_amount_cents).toBe('97000');
    expect(detail.body.data.transfer_amount_cents).toBeNull();
    expect(detail.body.data.metadata).toEqual(expect.objectContaining({ channel: 'api', source: 'integration' }));
    expect(detail.body.data.account).toEqual(expect.objectContaining({ id: ids.accountSensitive, name: 'Conta Sensível' }));
    expect(detail.body.data.counterparty_account).toEqual(expect.objectContaining({ id: ids.accountSecondary, name: 'Caixa Operacional' }));
    expect(detail.body.data.category).toBeNull();
    expect(detail.body.data.cost_center).toBeNull();
    expect(detail.body.data.reversal_of).toBeNull();
    expect(detail.body.data.reversals).toEqual([
      expect.objectContaining({ id: ids.transactionReversal, status: 'REVERSED' }),
    ]);
    expect(detail.body.data.allocations).toEqual([
      expect.objectContaining({
        id: ids.allocation,
        amount_cents: '100000',
        category: expect.objectContaining({ id: ids.categoryChild }),
        cost_center: expect.objectContaining({ id: ids.costCenterChild }),
      }),
    ]);
    expect(detail.body.data.outgoing_links).toEqual([
      expect.objectContaining({
        id: ids.linkOutbound,
        amount_cents: '25000',
        linked_transaction: expect.objectContaining({ id: ids.transactionLinked }),
      }),
    ]);
    expect(detail.body.data.incoming_links).toEqual([
      expect.objectContaining({
        id: ids.linkInbound,
        amount_cents: '25000',
        linked_transaction: expect.objectContaining({ id: ids.transactionLinked }),
      }),
    ]);
    expect(detail.body.data.created_by_admin).toEqual(expect.objectContaining({ id: ids.superAdmin, name: 'Super Admin Finance', role: 'SUPER_ADMIN' }));
    expect(detail.body.data.approved_by_admin).toEqual(expect.objectContaining({ id: ids.superAdmin, name: 'Super Admin Finance', role: 'SUPER_ADMIN' }));
    expect(detail.body.data.responsible_admin).toEqual(expect.objectContaining({ id: ids.financeAdmin, name: 'Finance Admin', role: 'FINANCE' }));

    const missing = await request(app)
      .get('/api/admin/finance/transactions/missing-transaction')
      .set('Authorization', authHeader(ids.superAdmin).Authorization);
    expect(missing.status).toBe(404);
  });

  it('keeps unsupported methods unavailable for read-only resources from phase 1C-A1', async () => {
    const before = await snapshotCounts();

    const unsupportedChecks = [
      request(app).put(`/api/admin/finance/transactions/${ids.transactionMain}`).set('Authorization', authHeader(ids.superAdmin).Authorization),
      request(app).delete(`/api/admin/finance/transactions/${ids.transactionMain}`).set('Authorization', authHeader(ids.superAdmin).Authorization),
    ];

    for (const call of unsupportedChecks) {
      const response = await call;
      expect([404, 405]).toContain(response.status);
    }

    const after = await snapshotCounts();
    expect(after).toEqual(before);
  });
});
