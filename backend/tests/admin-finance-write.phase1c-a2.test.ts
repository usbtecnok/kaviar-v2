import express from 'express';
import request from 'supertest';
import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, authState, auditMock, auditCtxMock, state } = vi.hoisted(() => {
  const state: any = {
    account: null,
    categories: new Map<string, any>(),
    costCenters: new Map<string, any>(),
  };

  const prismaMock: any = {
    $transaction: vi.fn(),
    $queryRawUnsafe: vi.fn(),
    admins: { findUnique: vi.fn() },
    operational_territories: { findUnique: vi.fn() },
    financial_accounts: { create: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn() },
    financial_categories: { create: vi.fn(), findUnique: vi.fn(), count: vi.fn(), updateMany: vi.fn() },
    financial_cost_centers: { create: vi.fn(), findUnique: vi.fn(), count: vi.fn(), updateMany: vi.fn() },
    financial_transactions: { count: vi.fn() },
    financial_transaction_allocations: { count: vi.fn() },
  };

  return {
    prismaMock,
    authState: {
      admin: { id: 'admin-1', email: 'finance@test.local', role: 'FINANCE' },
    },
    auditMock: vi.fn().mockResolvedValue(undefined),
    auditCtxMock: vi.fn((req: any) => ({
      adminId: req.admin?.id || 'unknown',
      adminEmail: req.admin?.email || 'unknown',
      ip: '127.0.0.1',
      ua: 'vitest',
    })),
    state,
  };
});

vi.mock('../src/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('../src/utils/audit', () => ({ audit: auditMock, auditCtx: auditCtxMock }));
vi.mock('../src/middlewares/auth', () => ({
  authenticateAdmin: (req: any, res: any, next: any) => {
    if (!authState.admin) {
      return res.status(401).json({ success: false, error: 'Não autenticado' });
    }
    req.admin = authState.admin;
    next();
  },
  allowFinanceAccess: (req: any, res: any, next: any) => {
    if (!req.admin || !['SUPER_ADMIN', 'FINANCE'].includes(req.admin.role)) {
      return res.status(403).json({ success: false, error: 'Acesso negado' });
    }
    next();
  },
}));

const { default: adminFinanceRoutes } = await import('../src/routes/admin-finance');

const app = express();
app.use(express.json());
app.use('/api/admin/finance', adminFinanceRoutes);

function prismaCodeConflict() {
  return new Prisma.PrismaClientKnownRequestError('duplicate code', {
    code: 'P2002',
    clientVersion: 'test',
    meta: { target: ['code'] },
  });
}

function prismaSerializableConflict() {
  return new Prisma.PrismaClientKnownRequestError('serialization failure', {
    code: 'P2034',
    clientVersion: 'test',
  });
}

function prismaP2010WithMetaCode40001() {
  return new Prisma.PrismaClientKnownRequestError('raw query failed', {
    code: 'P2010',
    clientVersion: 'test',
    meta: {
      code: '40001',
      message: 'could not serialize access due to concurrent update',
    },
  });
}

function prismaP2010WithDatabaseError40001() {
  return new Prisma.PrismaClientKnownRequestError('raw query failed', {
    code: 'P2010',
    clientVersion: 'test',
    meta: {
      database_error: 'ERROR: could not serialize access due to concurrent update (SQLSTATE 40001)',
    },
  });
}

function prismaP2010NotSerializable() {
  return new Prisma.PrismaClientKnownRequestError('raw query failed', {
    code: 'P2010',
    clientVersion: 'test',
    meta: {
      code: '23505',
      message: 'duplicate key value violates unique constraint',
    },
  });
}

function pgDirectSerializableError() {
  return {
    code: '40001',
    message: 'could not serialize access due to concurrent update',
  } as any;
}

function expectSafeConflictResponse(res: any) {
  expect(res.status).toBe(409);
  expect(res.body.error).toBe('Conflito de concorrência. Recarregue os dados e tente novamente.');

  const serialized = JSON.stringify(res.body);
  for (const fragment of ['P2010', 'P2034', '40001', 'Prisma', 'PostgreSQL', 'SQL', 'financial_accounts']) {
    expect(serialized).not.toContain(fragment);
  }
}

function resetState() {
  state.account = {
    id: 'acc-1',
    code: 'ACC-1',
    name: 'Conta Base',
    type: 'BANK',
    institution_name: 'Banco',
    bank_code: '001',
    currency: 'BRL',
    opening_balance_cents: BigInt(-25000),
    opening_balance_date: new Date('2026-06-01T00:00:00.000Z'),
    allows_negative_balance: false,
    is_cash_equivalent: false,
    is_active: true,
    notes: 'Base',
    created_by_admin_id: 'admin-1',
    updated_by_admin_id: 'admin-1',
    created_at: new Date('2026-06-01T10:00:00.000Z'),
    updated_at: new Date('2026-06-01T10:00:00.000Z'),
    created_by_admin: { id: 'admin-1', name: 'Finance', role: 'FINANCE' },
    updated_by_admin: { id: 'admin-1', name: 'Finance', role: 'FINANCE' },
  };

  state.categories = new Map([
    ['cat-1', {
      id: 'cat-1',
      code: 'CAT-1',
      name: 'Categoria Base',
      kind: 'EXPENSE',
      parent_id: null,
      default_direction: 'OUT',
      requires_document: false,
      is_system: false,
      is_active: true,
      sort_order: 1,
      created_by_admin_id: 'admin-1',
      updated_by_admin_id: 'admin-1',
      created_at: new Date('2026-06-01T10:00:00.000Z'),
      updated_at: new Date('2026-06-01T10:00:00.000Z'),
      created_by_admin: null,
      updated_by_admin: null,
      parent: null,
      children: [],
    }],
    ['cat-system', {
      id: 'cat-system',
      code: 'CAT-SYSTEM',
      name: 'Sistema',
      kind: 'EXPENSE',
      parent_id: null,
      default_direction: 'OUT',
      requires_document: false,
      is_system: true,
      is_active: true,
      sort_order: 2,
      created_by_admin_id: 'admin-1',
      updated_by_admin_id: 'admin-1',
      created_at: new Date('2026-06-01T10:00:00.000Z'),
      updated_at: new Date('2026-06-01T10:00:00.000Z'),
      created_by_admin: null,
      updated_by_admin: null,
      parent: null,
      children: [],
    }],
  ]);

  state.costCenters = new Map([
    ['cc-1', {
      id: 'cc-1',
      code: 'CC-1',
      name: 'Centro Base',
      type: 'DEPARTMENT',
      parent_id: null,
      territory_id: null,
      city: null,
      state: null,
      is_active: true,
      created_by_admin_id: 'admin-1',
      updated_by_admin_id: 'admin-1',
      created_at: new Date('2026-06-01T10:00:00.000Z'),
      updated_at: new Date('2026-06-01T10:00:00.000Z'),
      created_by_admin: null,
      updated_by_admin: null,
      parent: null,
      territory: null,
      children: [],
    }],
  ]);
}

beforeEach(() => {
  vi.clearAllMocks();
  resetState();
  authState.admin = { id: 'admin-1', email: 'finance@test.local', role: 'FINANCE' };

  prismaMock.$transaction.mockImplementation(async (callback: any) => callback(prismaMock));
  prismaMock.$queryRawUnsafe.mockImplementation(async (query: string, id: string) => {
    if (query.includes('financial_accounts') && state.account?.id === id) return [{ id }];
    if (query.includes('financial_categories') && state.categories.has(id)) return [{ id }];
    if (query.includes('financial_cost_centers') && state.costCenters.has(id)) return [{ id }];
    return [];
  });

  prismaMock.operational_territories.findUnique.mockResolvedValue({ id: 'territory-1' });
  prismaMock.financial_transactions.count.mockResolvedValue(0);
  prismaMock.financial_transaction_allocations.count.mockResolvedValue(0);
  prismaMock.financial_categories.count.mockResolvedValue(0);
  prismaMock.financial_cost_centers.count.mockResolvedValue(0);

  prismaMock.financial_accounts.findUnique.mockImplementation(async ({ where }: any) => {
    if (where.id === state.account?.id) return { ...state.account };
    return null;
  });
  prismaMock.financial_accounts.create.mockImplementation(async ({ data }: any) => {
    state.account = {
      ...state.account,
      ...data,
      created_at: new Date('2026-06-02T10:00:00.000Z'),
      updated_at: new Date('2026-06-02T10:00:00.000Z'),
      created_by_admin: null,
      updated_by_admin: null,
    };
    return { ...state.account };
  });
  prismaMock.financial_accounts.updateMany.mockImplementation(async ({ where, data }: any) => {
    if (!state.account || where.id !== state.account.id || where.updated_at.getTime() !== state.account.updated_at.getTime()) {
      return { count: 0 };
    }
    state.account = {
      ...state.account,
      ...data,
      updated_at: new Date('2026-06-02T11:00:00.000Z'),
      updated_by_admin: null,
    };
    return { count: 1 };
  });

  prismaMock.financial_categories.findUnique.mockImplementation(async ({ where }: any) => {
    return state.categories.has(where.id) ? { ...state.categories.get(where.id) } : null;
  });
  prismaMock.financial_categories.create.mockImplementation(async ({ data }: any) => {
    const record = {
      ...data,
      created_at: new Date('2026-06-02T10:00:00.000Z'),
      updated_at: new Date('2026-06-02T10:00:00.000Z'),
      created_by_admin: null,
      updated_by_admin: null,
      parent: null,
      children: [],
    };
    state.categories.set(record.id, record);
    return { ...record };
  });
  prismaMock.financial_categories.updateMany.mockImplementation(async ({ where, data }: any) => {
    const current = state.categories.get(where.id);
    if (!current || where.updated_at.getTime() !== current.updated_at.getTime()) return { count: 0 };
    state.categories.set(where.id, { ...current, ...data, updated_at: new Date('2026-06-02T11:00:00.000Z') });
    return { count: 1 };
  });

  prismaMock.financial_cost_centers.findUnique.mockImplementation(async ({ where }: any) => {
    return state.costCenters.has(where.id) ? { ...state.costCenters.get(where.id) } : null;
  });
  prismaMock.financial_cost_centers.create.mockImplementation(async ({ data }: any) => {
    const record = {
      ...data,
      created_at: new Date('2026-06-02T10:00:00.000Z'),
      updated_at: new Date('2026-06-02T10:00:00.000Z'),
      created_by_admin: null,
      updated_by_admin: null,
      parent: null,
      territory: null,
      children: [],
    };
    state.costCenters.set(record.id, record);
    return { ...record };
  });
  prismaMock.financial_cost_centers.updateMany.mockImplementation(async ({ where, data }: any) => {
    const current = state.costCenters.get(where.id);
    if (!current || where.updated_at.getTime() !== current.updated_at.getTime()) return { count: 0 };
    state.costCenters.set(where.id, { ...current, ...data, updated_at: new Date('2026-06-02T11:00:00.000Z') });
    return { count: 1 };
  });
});

describe('admin finance write phase 1C-A2 unit', () => {
  it('retorna 401 quando não há usuário autenticado', async () => {
    authState.admin = null;
    const res = await request(app).post('/api/admin/finance/accounts').send({ code: 'ACC-NEW', name: 'Conta', type: 'BANK' });
    expect(res.status).toBe(401);
  });

  it('retorna 403 para ACCOUNTANT e outro perfil sem acesso financeiro', async () => {
    authState.admin = { id: 'admin-2', email: 'accountant@test.local', role: 'ACCOUNTANT' };
    const accountantRes = await request(app).post('/api/admin/finance/accounts').send({ code: 'ACC-NEW', name: 'Conta', type: 'BANK' });
    expect(accountantRes.status).toBe(403);

    authState.admin = { id: 'admin-3', email: 'operator@test.local', role: 'OPERATOR' };
    const otherRes = await request(app).post('/api/admin/finance/accounts').send({ code: 'ACC-NEW', name: 'Conta', type: 'BANK' });
    expect(otherRes.status).toBe(403);
  });

  it('permite POST de conta para SUPER_ADMIN e FINANCE com saldo negativo apenas quando allows_negative_balance=true', async () => {
    authState.admin = { id: 'admin-super', email: 'super@test.local', role: 'SUPER_ADMIN' };
    const superRes = await request(app).post('/api/admin/finance/accounts').send({
      code: 'acc.super',
      name: 'Conta Super',
      type: 'BANK',
      opening_balance_cents: '-25000',
      allows_negative_balance: true,
    });
    expect(superRes.status).toBe(201);

    authState.admin = { id: 'admin-fin', email: 'finance@test.local', role: 'FINANCE' };
    const financeRes = await request(app).post('/api/admin/finance/accounts').send({
      code: 'acc.finance',
      name: 'Conta Finance',
      type: 'BANK',
      opening_balance_cents: '-25000',
      allows_negative_balance: true,
    });
    expect(financeRes.status).toBe(201);
    expect(financeRes.body.data.opening_balance_cents).toBe('-25000');
    expect(auditMock).toHaveBeenCalledWith(expect.objectContaining({ action: 'FINANCE_ACCOUNT_CREATE' }));
  });

  it('retorna 400 para saldo inicial negativo com allows_negative_balance=false sem expor erro bruto do PostgreSQL', async () => {
    const res = await request(app).post('/api/admin/finance/accounts').send({
      code: 'acc.invalid',
      name: 'Conta Inválida',
      type: 'BANK',
      opening_balance_cents: '-25000',
      allows_negative_balance: false,
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('opening_balance_cents negativo exige allows_negative_balance=true');
    expect(JSON.stringify(res.body)).not.toContain('check');
    expect(JSON.stringify(res.body)).not.toContain('PostgreSQL');
  });

  it('retorna 400 para campo desconhecido e para expected_updated_at ausente ou inválido', async () => {
    const unknownField = await request(app).post('/api/admin/finance/accounts').send({ code: 'ACC-NEW', name: 'Conta', type: 'BANK', unexpected: 'x' });
    expect(unknownField.status).toBe(400);

    const missingExpected = await request(app).patch('/api/admin/finance/accounts/acc-1').send({ name: 'Editada' });
    expect(missingExpected.status).toBe(400);

    const invalidExpected = await request(app).patch('/api/admin/finance/accounts/acc-1').send({ expected_updated_at: 'not-a-date', name: 'Editada' });
    expect(invalidExpected.status).toBe(400);
  });

  it('retorna 400 para PATCH vazio', async () => {
    const res = await request(app).patch('/api/admin/finance/accounts/acc-1').send({ expected_updated_at: state.account.updated_at.toISOString() });
    expect(res.status).toBe(400);
  });

  it('retorna 409 quando Prisma acusa code duplicado', async () => {
    prismaMock.financial_accounts.create.mockRejectedValueOnce(prismaCodeConflict());
    const res = await request(app).post('/api/admin/finance/accounts').send({ code: 'ACC-DUP', name: 'Duplicada', type: 'BANK' });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('code já existe');
  });

  it('retorna 500 seguro para erro interno', async () => {
    prismaMock.financial_accounts.create.mockRejectedValueOnce(new Error('stack prisma local path SQL'));
    const res = await request(app).post('/api/admin/finance/accounts').send({ code: 'ACC-ERR', name: 'Erro', type: 'BANK' });
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ success: false, error: 'Erro interno do servidor' });
    expect(JSON.stringify(res.body)).not.toContain('stack');
    expect(JSON.stringify(res.body)).not.toContain('SQL');
  });

  it('retorna 409 para conflito serializável Prisma P2034', async () => {
    prismaMock.$transaction.mockRejectedValueOnce(prismaSerializableConflict());

    const res = await request(app).patch('/api/admin/finance/accounts/acc-1').send({
      expected_updated_at: state.account.updated_at.toISOString(),
      name: 'Concorrente',
    });

    expectSafeConflictResponse(res);
  });

  it('retorna 409 para Prisma P2010 com meta.code=40001', async () => {
    prismaMock.$transaction.mockRejectedValueOnce(prismaP2010WithMetaCode40001());

    const res = await request(app).patch('/api/admin/finance/accounts/acc-1').send({
      expected_updated_at: state.account.updated_at.toISOString(),
      name: 'Concorrente P2010 code',
    });

    expectSafeConflictResponse(res);
  });

  it('retorna 409 para Prisma P2010 com meta.database_error contendo SQLSTATE 40001', async () => {
    prismaMock.$transaction.mockRejectedValueOnce(prismaP2010WithDatabaseError40001());

    const res = await request(app).patch('/api/admin/finance/accounts/acc-1').send({
      expected_updated_at: state.account.updated_at.toISOString(),
      name: 'Concorrente P2010 database_error',
    });

    expectSafeConflictResponse(res);
  });

  it('retorna 409 para erro PostgreSQL direto com code=40001', async () => {
    prismaMock.$transaction.mockRejectedValueOnce(pgDirectSerializableError());

    const res = await request(app).patch('/api/admin/finance/accounts/acc-1').send({
      expected_updated_at: state.account.updated_at.toISOString(),
      name: 'Concorrente pg direto',
    });

    expectSafeConflictResponse(res);
  });

  it('mantém P2010 não relacionado a 40001 como 500 seguro', async () => {
    prismaMock.$transaction.mockRejectedValueOnce(prismaP2010NotSerializable());

    const res = await request(app).patch('/api/admin/finance/accounts/acc-1').send({
      expected_updated_at: state.account.updated_at.toISOString(),
      name: 'Erro P2010 não serializável',
    });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ success: false, error: 'Erro interno do servidor' });
  });

  it('bloqueia FINANCE em cada campo estrutural de conta via PATCH', async () => {
    const structuralPayloads = [
      { code: 'ACC-NEW' },
      { type: 'CASH' },
      { currency: 'USD' },
      { opening_balance_cents: '10' },
      { opening_balance_date: '2026-06-03' },
    ];

    for (const payload of structuralPayloads) {
      const res = await request(app).patch('/api/admin/finance/accounts/acc-1').send({ expected_updated_at: state.account.updated_at.toISOString(), ...payload });
      expect(res.status).toBe(403);
    }
  });

  it('bloqueia FINANCE em campos estruturais de categoria e centro de custo via PATCH', async () => {
    const categoryCode = await request(app).patch('/api/admin/finance/categories/cat-1').send({ expected_updated_at: state.categories.get('cat-1').updated_at.toISOString(), code: 'CAT-X' });
    expect(categoryCode.status).toBe(403);

    const categoryKind = await request(app).patch('/api/admin/finance/categories/cat-1').send({ expected_updated_at: state.categories.get('cat-1').updated_at.toISOString(), kind: 'REVENUE' });
    expect(categoryKind.status).toBe(403);

    const costCenterCode = await request(app).patch('/api/admin/finance/cost-centers/cc-1').send({ expected_updated_at: state.costCenters.get('cc-1').updated_at.toISOString(), code: 'CC-X' });
    expect(costCenterCode.status).toBe(403);

    const costCenterType = await request(app).patch('/api/admin/finance/cost-centers/cc-1').send({ expected_updated_at: state.costCenters.get('cc-1').updated_at.toISOString(), type: 'PROJECT' });
    expect(costCenterType.status).toBe(403);
  });

  it('rejeita campos criptografados em POST e PATCH', async () => {
    const encryptedFields = [
      'agency_encrypted',
      'account_number_encrypted',
      'account_digit_encrypted',
      'pix_key_encrypted',
      'document_encrypted',
      'account_fingerprint',
      'account_last4',
      'pix_key_last4',
      'encryption_key_version',
    ];

    for (const field of encryptedFields) {
      const postRes = await request(app).post('/api/admin/finance/accounts').send({ code: 'ACC-NEW', name: 'Conta', type: 'BANK', [field]: 'cipher' });
      expect(postRes.status).toBe(400);

      const patchRes = await request(app).patch('/api/admin/finance/accounts/acc-1').send({ expected_updated_at: state.account.updated_at.toISOString(), [field]: 'cipher' });
      expect(patchRes.status).toBe(400);
    }
  });

  it('rejeita bigint enviado como number, decimal e fora do range', async () => {
    const numberRes = await request(app).post('/api/admin/finance/accounts').send({ code: 'ACC-NUM', name: 'Conta', type: 'BANK', opening_balance_cents: 10 });
    expect(numberRes.status).toBe(400);

    const decimalRes = await request(app).post('/api/admin/finance/accounts').send({ code: 'ACC-DEC', name: 'Conta', type: 'BANK', opening_balance_cents: '10.5' });
    expect(decimalRes.status).toBe(400);

    const outOfRangeRes = await request(app).post('/api/admin/finance/accounts').send({ code: 'ACC-BIG', name: 'Conta', type: 'BANK', opening_balance_cents: '9223372036854775808' });
    expect(outOfRangeRes.status).toBe(400);
  });

  it('retorna 400 para is_system em categoria e 200 para FINANCE editar allows_negative_balance e territory_id', async () => {
    const createCategory = await request(app).post('/api/admin/finance/categories').send({ code: 'CAT-NEW', name: 'Categoria', kind: 'EXPENSE', is_system: true });
    expect(createCategory.status).toBe(400);

    const patchAccount = await request(app).patch('/api/admin/finance/accounts/acc-1').send({ expected_updated_at: state.account.updated_at.toISOString(), allows_negative_balance: true });
    expect(patchAccount.status).toBe(200);

    const currentCostCenter = state.costCenters.get('cc-1');
    const patchCostCenter = await request(app).patch('/api/admin/finance/cost-centers/cc-1').send({ expected_updated_at: currentCostCenter.updated_at.toISOString(), territory_id: 'territory-1' });
    expect(patchCostCenter.status).toBe(200);
  });
});