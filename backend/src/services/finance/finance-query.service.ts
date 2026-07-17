import { prisma } from '../../lib/prisma';

function paginationResult<T>(rows: T[], total: number, page: number, limit: number) {
  return {
    rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}

function buildStringSearchWhere(search: string | undefined, fields: string[]) {
  if (!search) return undefined;
  return {
    OR: fields.map((field) => ({ [field]: { contains: search, mode: 'insensitive' } })),
  };
}

function dateFieldFilter(field: string, dateFrom?: Date, dateTo?: Date) {
  if (!dateFrom && !dateTo) return undefined;
  return {
    [field]: {
      ...(dateFrom ? { gte: dateFrom } : {}),
      ...(dateTo ? { lte: dateTo } : {}),
    },
  };
}

export async function listFinanceAccounts(query: any) {
  const where: any = {};
  const searchFilter = buildStringSearchWhere(query.search, ['code', 'name']);
  if (searchFilter) Object.assign(where, searchFilter);
  if (query.type) where.type = query.type;
  if (query.is_active !== undefined) where.is_active = query.is_active;
  if (query.is_cash_equivalent !== undefined) where.is_cash_equivalent = query.is_cash_equivalent;
  if (query.allows_negative_balance !== undefined) where.allows_negative_balance = query.allows_negative_balance;

  const [rows, total] = await Promise.all([
    prisma.financial_accounts.findMany({
      where,
      orderBy: [{ is_active: 'desc' }, { name: 'asc' }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        institution_name: true,
        bank_code: true,
        account_last4: true,
        pix_key_last4: true,
        currency: true,
        opening_balance_cents: true,
        opening_balance_date: true,
        allows_negative_balance: true,
        is_cash_equivalent: true,
        is_active: true,
        notes: true,
        created_at: true,
        updated_at: true,
        created_by_admin: { select: { id: true, name: true, role: true } },
        updated_by_admin: { select: { id: true, name: true, role: true } },
      },
    }),
    prisma.financial_accounts.count({ where }),
  ]);

  return paginationResult(rows, total, query.page, query.limit);
}

export async function getFinanceAccountById(id: string) {
  return prisma.financial_accounts.findUnique({
    where: { id },
    select: {
      id: true,
      code: true,
      name: true,
      type: true,
      institution_name: true,
      bank_code: true,
      account_last4: true,
      pix_key_last4: true,
      currency: true,
      opening_balance_cents: true,
      opening_balance_date: true,
      allows_negative_balance: true,
      is_cash_equivalent: true,
      is_active: true,
      notes: true,
      created_at: true,
      updated_at: true,
      created_by_admin_id: true,
      updated_by_admin_id: true,
      created_by_admin: { select: { id: true, name: true, role: true } },
      updated_by_admin: { select: { id: true, name: true, role: true } },
    },
  });
}

export async function listFinanceCategories(query: any) {
  const where: any = {};
  if (query.kind) where.kind = query.kind;
  if (query.parent_id) where.parent_id = query.parent_id;
  if (query.is_active !== undefined) where.is_active = query.is_active;
  if (query.is_system !== undefined) where.is_system = query.is_system;

  const [rows, total] = await Promise.all([
    prisma.financial_categories.findMany({
      where,
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: {
        id: true,
        code: true,
        name: true,
        kind: true,
        parent_id: true,
        default_direction: true,
        requires_document: true,
        is_system: true,
        is_active: true,
        sort_order: true,
        created_at: true,
        updated_at: true,
        created_by_admin: { select: { id: true, name: true, role: true } },
        updated_by_admin: { select: { id: true, name: true, role: true } },
        parent: { select: { id: true, code: true, name: true, kind: true, is_active: true, sort_order: true } },
        _count: { select: { children: true } },
      },
    }),
    prisma.financial_categories.count({ where }),
  ]);

  return paginationResult(rows, total, query.page, query.limit);
}

export async function getFinanceCategoryById(id: string) {
  return prisma.financial_categories.findUnique({
    where: { id },
    select: {
      id: true,
      code: true,
      name: true,
      kind: true,
      parent_id: true,
      default_direction: true,
      requires_document: true,
      is_system: true,
      is_active: true,
      sort_order: true,
      created_at: true,
      updated_at: true,
      created_by_admin_id: true,
      updated_by_admin_id: true,
      created_by_admin: { select: { id: true, name: true, role: true } },
      updated_by_admin: { select: { id: true, name: true, role: true } },
      parent: { select: { id: true, code: true, name: true, kind: true, is_active: true, sort_order: true } },
      children: { select: { id: true, code: true, name: true, kind: true, is_active: true, sort_order: true }, orderBy: [{ sort_order: 'asc' }, { name: 'asc' }] },
    },
  });
}

export async function listFinanceCostCenters(query: any) {
  const where: any = {};
  if (query.type) where.type = query.type;
  if (query.parent_id) where.parent_id = query.parent_id;
  if (query.territory_id) where.territory_id = query.territory_id;
  if (query.city) where.city = query.city;
  if (query.state) where.state = query.state;
  if (query.is_active !== undefined) where.is_active = query.is_active;

  const [rows, total] = await Promise.all([
    prisma.financial_cost_centers.findMany({
      where,
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        parent_id: true,
        territory_id: true,
        city: true,
        state: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        created_by_admin: { select: { id: true, name: true, role: true } },
        updated_by_admin: { select: { id: true, name: true, role: true } },
        parent: { select: { id: true, code: true, name: true, type: true, is_active: true } },
        territory: { select: { id: true, name: true, status: true } },
        _count: { select: { children: true } },
      },
    }),
    prisma.financial_cost_centers.count({ where }),
  ]);

  return paginationResult(rows, total, query.page, query.limit);
}

export async function getFinanceCostCenterById(id: string) {
  return prisma.financial_cost_centers.findUnique({
    where: { id },
    select: {
      id: true,
      code: true,
      name: true,
      type: true,
      parent_id: true,
      territory_id: true,
      city: true,
      state: true,
      is_active: true,
      created_at: true,
      updated_at: true,
      created_by_admin_id: true,
      updated_by_admin_id: true,
      created_by_admin: { select: { id: true, name: true, role: true } },
      updated_by_admin: { select: { id: true, name: true, role: true } },
      parent: { select: { id: true, code: true, name: true, type: true, is_active: true } },
      territory: { select: { id: true, name: true, status: true } },
      children: { select: { id: true, code: true, name: true, type: true, is_active: true }, orderBy: [{ type: 'asc' }, { name: 'asc' }] },
    },
  });
}

export async function listFinanceRecognitionPolicies(query: any) {
  const where: any = {};
  if (query.subject) where.subject = query.subject;
  if (query.scope_type) where.scope_type = query.scope_type;
  if (query.policy) where.policy = query.policy;
  if (query.status) where.status = query.status;
  if (query.territory_id) where.territory_id = query.territory_id;
  if (query.cost_center_id) where.cost_center_id = query.cost_center_id;
  if (query.city) where.city = query.city;
  if (query.state) where.state = query.state;

  const [rows, total] = await Promise.all([
    prisma.financial_recognition_policies.findMany({
      where,
      orderBy: [{ subject: 'asc' }, { effective_from: 'desc' }, { created_at: 'desc' }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: {
        id: true,
        code: true,
        subject: true,
        scope_type: true,
        territory_id: true,
        cost_center_id: true,
        city: true,
        state: true,
        policy: true,
        status: true,
        effective_from: true,
        effective_until: true,
        approved_by_admin_id: true,
        approved_at: true,
        reason: true,
        notes: true,
        created_by_admin_id: true,
        updated_by_admin_id: true,
        created_at: true,
        updated_at: true,
        territory: { select: { id: true, name: true, status: true } },
        cost_center: { select: { id: true, code: true, name: true, type: true, is_active: true } },
        approved_by_admin: { select: { id: true, name: true, role: true } },
        created_by_admin: { select: { id: true, name: true, role: true } },
        updated_by_admin: { select: { id: true, name: true, role: true } },
      },
    }),
    prisma.financial_recognition_policies.count({ where }),
  ]);

  return paginationResult(rows, total, query.page, query.limit);
}

export async function getFinanceRecognitionPolicyById(id: string) {
  return prisma.financial_recognition_policies.findUnique({
    where: { id },
    select: {
      id: true,
      code: true,
      subject: true,
      scope_type: true,
      territory_id: true,
      cost_center_id: true,
      city: true,
      state: true,
      policy: true,
      status: true,
      effective_from: true,
      effective_until: true,
      approved_by_admin_id: true,
      approved_at: true,
      reason: true,
      notes: true,
      created_by_admin_id: true,
      updated_by_admin_id: true,
      created_at: true,
      updated_at: true,
      territory: { select: { id: true, name: true, status: true } },
      cost_center: { select: { id: true, code: true, name: true, type: true, is_active: true } },
      approved_by_admin: { select: { id: true, name: true, role: true } },
      created_by_admin: { select: { id: true, name: true, role: true } },
      updated_by_admin: { select: { id: true, name: true, role: true } },
    },
  });
}

export async function listFinanceTransactions(query: any) {
  const where: any = {};
  const search = query.search;

  if (query.account_id) where.account_id = query.account_id;
  if (query.counterparty_account_id) where.counterparty_account_id = query.counterparty_account_id;
  if (query.category_id) where.category_id = query.category_id;
  if (query.cost_center_id) where.cost_center_id = query.cost_center_id;
  if (query.direction) where.direction = query.direction;
  if (query.transaction_type) where.transaction_type = query.transaction_type;
  if (query.status) where.status = query.status;
  if (query.payment_method) where.payment_method = query.payment_method;
  if (query.source_type) where.source_type = query.source_type;
  if (query.origin_type) where.origin_type = query.origin_type;
  if (query.provider) where.provider = query.provider;
  if (query.transfer_group_id) where.transfer_group_id = query.transfer_group_id;

  const searchFilter = buildStringSearchWhere(search, ['description', 'memo', 'external_reference', 'source_id', 'origin_id', 'provider_event_id', 'idempotency_key']);
  if (searchFilter) Object.assign(where, searchFilter);

  if (query.date_from || query.date_to) {
    Object.assign(where, dateFieldFilter(query.date_field, query.date_from, query.date_to));
  }

  const [rows, total] = await Promise.all([
    prisma.financial_transactions.findMany({
      where,
      orderBy: [{ transaction_date: 'desc' }, { created_at: 'desc' }, { id: 'desc' }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: {
        id: true,
        description: true,
        direction: true,
        transaction_type: true,
        status: true,
        payment_method: true,
        source_type: true,
        source_id: true,
        origin_type: true,
        origin_id: true,
        competence_date: true,
        transaction_date: true,
        due_date: true,
        settlement_date: true,
        gross_amount_cents: true,
        fee_amount_cents: true,
        discount_amount_cents: true,
        retention_amount_cents: true,
        net_amount_cents: true,
        transfer_amount_cents: true,
        created_at: true,
        updated_at: true,
        account: { select: { id: true, code: true, name: true, type: true, is_active: true } },
        counterparty_account: { select: { id: true, code: true, name: true, type: true, is_active: true } },
        category: { select: { id: true, code: true, name: true, kind: true, is_active: true } },
        cost_center: { select: { id: true, code: true, name: true, type: true, is_active: true } },
      },
    }),
    prisma.financial_transactions.count({ where }),
  ]);

  return paginationResult(rows, total, query.page, query.limit);
}

export async function getFinanceTransactionById(id: string) {
  return prisma.financial_transactions.findUnique({
    where: { id },
    select: {
      id: true,
      external_reference: true,
      provider: true,
      provider_event_id: true,
      source_type: true,
      source_id: true,
      origin_type: true,
      origin_id: true,
      account_id: true,
      counterparty_account_id: true,
      category_id: true,
      cost_center_id: true,
      transfer_group_id: true,
      direction: true,
      transaction_type: true,
      status: true,
      payment_method: true,
      recognition_policy: true,
      competence_date: true,
      transaction_date: true,
      due_date: true,
      settlement_date: true,
      gross_amount_cents: true,
      fee_amount_cents: true,
      discount_amount_cents: true,
      retention_amount_cents: true,
      net_amount_cents: true,
      transfer_amount_cents: true,
      reversal_of_id: true,
      canceled_reason: true,
      canceled_at: true,
      description: true,
      memo: true,
      metadata: true,
      idempotency_key: true,
      created_by_admin_id: true,
      approved_by_admin_id: true,
      responsible_admin_id: true,
      created_at: true,
      updated_at: true,
      account: { select: { id: true, code: true, name: true, type: true, is_active: true, currency: true } },
      counterparty_account: { select: { id: true, code: true, name: true, type: true, is_active: true, currency: true } },
      category: { select: { id: true, code: true, name: true, kind: true, is_active: true } },
      cost_center: { select: { id: true, code: true, name: true, type: true, is_active: true } },
      reversal_of: { select: { id: true, description: true, status: true, transaction_type: true, transaction_date: true, gross_amount_cents: true, net_amount_cents: true } },
      reversals: {
        select: { id: true, description: true, status: true, transaction_type: true, transaction_date: true, gross_amount_cents: true, net_amount_cents: true },
        orderBy: [{ transaction_date: 'desc' }, { created_at: 'desc' }],
      },
      allocations: {
        select: {
          id: true,
          transaction_id: true,
          category_id: true,
          cost_center_id: true,
          amount_cents: true,
          allocation_type: true,
          description: true,
          metadata: true,
          created_at: true,
          updated_at: true,
          created_by_admin: { select: { id: true, name: true, role: true } },
          category: { select: { id: true, code: true, name: true, kind: true, is_active: true } },
          cost_center: { select: { id: true, code: true, name: true, type: true, is_active: true } },
        },
        orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
      },
      outgoing_links: {
        select: {
          id: true,
          transaction_id: true,
          linked_transaction_id: true,
          link_type: true,
          amount_cents: true,
          metadata: true,
          created_at: true,
          updated_at: true,
          created_by_admin: { select: { id: true, name: true, role: true } },
          linked_transaction: { select: { id: true, description: true, transaction_type: true, status: true, transaction_date: true, gross_amount_cents: true, net_amount_cents: true } },
        },
        orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
      },
      incoming_links: {
        select: {
          id: true,
          transaction_id: true,
          linked_transaction_id: true,
          link_type: true,
          amount_cents: true,
          metadata: true,
          created_at: true,
          updated_at: true,
          created_by_admin: { select: { id: true, name: true, role: true } },
          transaction: { select: { id: true, description: true, transaction_type: true, status: true, transaction_date: true, gross_amount_cents: true, net_amount_cents: true } },
        },
        orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
      },
      created_by_admin: { select: { id: true, name: true, role: true } },
      approved_by_admin: { select: { id: true, name: true, role: true } },
      responsible_admin: { select: { id: true, name: true, role: true } },
    },
  });
}
