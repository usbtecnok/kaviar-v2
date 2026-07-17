import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, authState } = vi.hoisted(() => {
  const prismaMock: any = {
    admins: { findUnique: vi.fn() },
    financial_accounts: { findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn() },
    financial_categories: { findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn() },
    financial_cost_centers: { findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn() },
    financial_recognition_policies: { findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn() },
    financial_transactions: { findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn() },
  };

  return {
    prismaMock,
    authState: {
      admin: { id: 'admin-1', email: 'finance@test.local', role: 'FINANCE' },
    },
  };
});

vi.mock('../src/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('../src/middlewares/auth', () => ({
  authenticateAdmin: (req: any, _res: any, next: any) => {
    if (!authState.admin) {
      return _res.status(401).json({ success: false, error: 'Não autenticado' });
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

const baseAccount = {
  id: 'acc-1',
  code: 'BANK-01',
  name: 'Conta principal',
  type: 'BANK' as const,
  institution_name: 'Banco A',
  bank_code: '001',
  account_last4: '1234',
  pix_key_last4: '4321',
  currency: 'BRL',
  opening_balance_cents: 125000n,
  opening_balance_date: new Date('2026-06-01T00:00:00.000Z'),
  allows_negative_balance: false,
  is_cash_equivalent: true,
  is_active: true,
  notes: 'Conta operacional',
  created_at: new Date('2026-06-01T10:00:00.000Z'),
  updated_at: new Date('2026-06-02T10:00:00.000Z'),
  created_by_admin: { id: 'admin-1', name: 'Finance Admin', role: 'FINANCE' },
  updated_by_admin: { id: 'admin-2', name: 'Super Admin', role: 'SUPER_ADMIN' },
};

beforeEach(() => {
  vi.clearAllMocks();
  authState.admin = { id: 'admin-1', email: 'finance@test.local', role: 'FINANCE' };

  prismaMock.financial_accounts.count.mockResolvedValue(1);
  prismaMock.financial_accounts.findMany.mockResolvedValue([baseAccount]);
  prismaMock.financial_accounts.findUnique.mockResolvedValue(baseAccount);

  prismaMock.financial_categories.count.mockResolvedValue(1);
  prismaMock.financial_categories.findMany.mockResolvedValue([
    {
      id: 'cat-1',
      code: 'cat-oper',
      name: 'Operacional',
      kind: 'EXPENSE',
      parent_id: null,
      default_direction: 'DEBIT',
      requires_document: false,
      is_system: false,
      is_active: true,
      sort_order: 1,
      created_at: new Date('2026-06-01T10:00:00.000Z'),
      updated_at: new Date('2026-06-01T10:00:00.000Z'),
      created_by_admin: { id: 'admin-1', name: 'Finance Admin', role: 'FINANCE' },
      updated_by_admin: { id: 'admin-2', name: 'Super Admin', role: 'SUPER_ADMIN' },
      parent: null,
      _count: { children: 0 },
    },
  ]);
  prismaMock.financial_categories.findUnique.mockResolvedValue(null);

  prismaMock.financial_cost_centers.count.mockResolvedValue(1);
  prismaMock.financial_cost_centers.findMany.mockResolvedValue([
    {
      id: 'cc-1',
      code: 'CC-OPS',
      name: 'Operação',
      type: 'OPERATIONAL',
      parent_id: null,
      territory_id: 'territory-1',
      city: 'Rio de Janeiro',
      state: 'RJ',
      is_active: true,
      created_at: new Date('2026-06-01T10:00:00.000Z'),
      updated_at: new Date('2026-06-01T10:00:00.000Z'),
      created_by_admin: { id: 'admin-1', name: 'Finance Admin', role: 'FINANCE' },
      updated_by_admin: { id: 'admin-2', name: 'Super Admin', role: 'SUPER_ADMIN' },
      parent: null,
      territory: { id: 'territory-1', name: 'RJ Centro', status: 'active' },
      _count: { children: 0 },
    },
  ]);
  prismaMock.financial_cost_centers.findUnique.mockResolvedValue(undefined);

  prismaMock.financial_recognition_policies.count.mockResolvedValue(1);
  prismaMock.financial_recognition_policies.findMany.mockResolvedValue([
    {
      id: 'pol-1',
      code: 'POL-01',
      subject: 'REVENUE',
      scope_type: 'GLOBAL',
      territory_id: null,
      cost_center_id: null,
      city: null,
      state: null,
      policy: 'RECOGNIZE_ON_PAYMENT',
      status: 'ACTIVE',
      effective_from: new Date('2026-06-01T00:00:00.000Z'),
      effective_until: null,
      approved_by_admin_id: null,
      approved_at: null,
      reason: 'Política padrão',
      notes: null,
      created_by_admin_id: 'admin-1',
      updated_by_admin_id: 'admin-1',
      created_at: new Date('2026-06-01T10:00:00.000Z'),
      updated_at: new Date('2026-06-01T10:00:00.000Z'),
      territory: null,
      cost_center: null,
      approved_by_admin: null,
      created_by_admin: { id: 'admin-1', name: 'Finance Admin', role: 'FINANCE' },
      updated_by_admin: { id: 'admin-1', name: 'Finance Admin', role: 'FINANCE' },
    },
  ]);
  prismaMock.financial_recognition_policies.findUnique.mockResolvedValue(undefined);

  prismaMock.financial_transactions.count.mockResolvedValue(1);
  prismaMock.financial_transactions.findMany.mockResolvedValue([
    {
      id: 'txn-1',
      description: 'Recebimento teste',
      direction: 'CREDIT',
      transaction_type: 'REVENUE',
      status: 'POSTED',
      payment_method: 'PIX',
      source_type: 'MANUAL',
      source_id: 'source-1',
      origin_type: 'SYSTEM',
      origin_id: 'origin-1',
      competence_date: new Date('2026-06-01T00:00:00.000Z'),
      transaction_date: new Date('2026-06-02T00:00:00.000Z'),
      due_date: null,
      settlement_date: null,
      gross_amount_cents: 125000n,
      fee_amount_cents: 5000n,
      discount_amount_cents: 0n,
      retention_amount_cents: 0n,
      net_amount_cents: 120000n,
      transfer_amount_cents: null,
      created_at: new Date('2026-06-02T10:00:00.000Z'),
      updated_at: new Date('2026-06-02T10:00:00.000Z'),
      account: { id: 'acc-1', code: 'BANK-01', name: 'Conta principal', type: 'BANK', is_active: true },
      counterparty_account: null,
      category: { id: 'cat-1', code: 'cat-oper', name: 'Operacional', kind: 'EXPENSE', is_active: true },
      cost_center: { id: 'cc-1', code: 'CC-OPS', name: 'Operação', type: 'OPERATIONAL', is_active: true },
    },
  ]);
  prismaMock.financial_transactions.findUnique.mockResolvedValue({
    id: 'txn-1',
    external_reference: 'ext-1',
    provider: 'gateway-x',
    provider_event_id: 'evt-1',
    source_type: 'MANUAL',
    source_id: 'source-1',
    origin_type: 'SYSTEM',
    origin_id: 'origin-1',
    account_id: 'acc-1',
    counterparty_account_id: null,
    category_id: 'cat-1',
    cost_center_id: 'cc-1',
    transfer_group_id: null,
    direction: 'CREDIT',
    transaction_type: 'REVENUE',
    status: 'POSTED',
    payment_method: 'PIX',
    recognition_policy: 'RECOGNIZE_ON_PAYMENT',
    competence_date: new Date('2026-06-01T00:00:00.000Z'),
    transaction_date: new Date('2026-06-02T00:00:00.000Z'),
    due_date: null,
    settlement_date: null,
    gross_amount_cents: 125000n,
    fee_amount_cents: 5000n,
    discount_amount_cents: 0n,
    retention_amount_cents: 0n,
    net_amount_cents: 120000n,
    transfer_amount_cents: null,
    reversal_of_id: null,
    canceled_reason: null,
    canceled_at: null,
    description: 'Recebimento teste',
    memo: 'Memo interno',
    metadata: { channel: 'api' },
    idempotency_key: 'idem-1',
    created_by_admin_id: 'admin-1',
    approved_by_admin_id: 'admin-2',
    responsible_admin_id: 'admin-3',
    created_at: new Date('2026-06-02T10:00:00.000Z'),
    updated_at: new Date('2026-06-02T10:00:00.000Z'),
    account: { id: 'acc-1', code: 'BANK-01', name: 'Conta principal', type: 'BANK', is_active: true, currency: 'BRL' },
    counterparty_account: null,
    category: { id: 'cat-1', code: 'cat-oper', name: 'Operacional', kind: 'EXPENSE', is_active: true },
    cost_center: { id: 'cc-1', code: 'CC-OPS', name: 'Operação', type: 'OPERATIONAL', is_active: true },
    reversal_of: null,
    reversals: [],
    allocations: [],
    outgoing_links: [],
    incoming_links: [],
    created_by_admin: { id: 'admin-1', name: 'Finance Admin', role: 'FINANCE' },
    approved_by_admin: { id: 'admin-2', name: 'Super Admin', role: 'SUPER_ADMIN' },
    responsible_admin: { id: 'admin-3', name: 'Responsável', role: 'FINANCE' },
  });
});

describe('admin finance routes', () => {
  it('retorna 401 quando não há usuário autenticado', async () => {
    authState.admin = null;

    const res = await request(app).get('/api/admin/finance/accounts');

    expect(res.status).toBe(401);
  });

  it('retorna 403 para role sem acesso financeiro', async () => {
    authState.admin = { id: 'admin-2', email: 'ops@test.local', role: 'ACCOUNTANT' };

    const res = await request(app).get('/api/admin/finance/accounts');

    expect(res.status).toBe(403);
  });

  it('lista contas com paginação e mascara campos sensíveis', async () => {
    const res = await request(app).get('/api/admin/finance/accounts?limit=10&page=1&search=Conta');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.pagination).toMatchObject({ page: 1, limit: 10, total: 1, totalPages: 1 });
    expect(res.body.data[0]).toMatchObject({
      id: 'acc-1',
      code: 'BANK-01',
      name: 'Conta principal',
      opening_balance_cents: '125000',
      is_active: true,
    });
    expect(res.body.data[0]).not.toHaveProperty('agency_encrypted');
    expect(res.body.data[0]).not.toHaveProperty('account_number_encrypted');
  });

  it('retorna 404 para conta inexistente', async () => {
    prismaMock.financial_accounts.findUnique.mockResolvedValueOnce(null);

    const res = await request(app).get('/api/admin/finance/accounts/missing');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Conta financeira não encontrada');
  });

  it('lista transações com BigInt serializado como string', async () => {
    const res = await request(app).get('/api/admin/finance/transactions?limit=5&page=1&date_from=2026-06-01&date_to=2026-06-30');

    expect(res.status).toBe(200);
    expect(res.body.data[0]).toMatchObject({
      id: 'txn-1',
      gross_amount_cents: '125000',
      net_amount_cents: '120000',
    });
    expect(res.body.data[0]).not.toHaveProperty('allocations');
    expect(res.body.data[0]).not.toHaveProperty('outgoing_links');
    expect(res.body.data[0]).not.toHaveProperty('incoming_links');
  });

  it('retorna 404 para transação inexistente', async () => {
    prismaMock.financial_transactions.findUnique.mockResolvedValueOnce(null);

    const res = await request(app).get('/api/admin/finance/transactions/missing');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Lançamento financeiro não encontrado');
  });

  it('rejeita intervalo de datas invertido', async () => {
    const res = await request(app).get('/api/admin/finance/transactions?date_from=2026-06-30&date_to=2026-06-01');

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('date_from não pode ser posterior a date_to');
  });

  it('responde 500 com erro genérico quando Prisma falha', async () => {
    prismaMock.financial_accounts.findMany.mockRejectedValueOnce(new Error('Prisma internal stack trace'));

    const res = await request(app).get('/api/admin/finance/accounts').set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ success: false, error: 'Erro interno do servidor' });
    expect(JSON.stringify(res.body)).not.toContain('Prisma internal stack trace');
    expect(JSON.stringify(res.body)).not.toContain('stack');
  });
});
