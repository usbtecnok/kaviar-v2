import { prisma } from '../../lib/prisma';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

const NON_FINAL_TRANSACTION_STATUSES = ['DRAFT', 'PENDING', 'BLOCKED'] as const;
const ACCOUNT_STRUCTURAL_FIELDS = ['code', 'type', 'currency', 'opening_balance_cents', 'opening_balance_date'] as const;
const ACCOUNT_FINANCE_PATCH_FIELDS = ['name', 'institution_name', 'bank_code', 'allows_negative_balance', 'is_cash_equivalent', 'is_active', 'notes'] as const;
const CATEGORY_FINANCE_PATCH_FIELDS = ['name', 'parent_id', 'default_direction', 'requires_document', 'is_active', 'sort_order'] as const;
const CATEGORY_SYSTEM_SUPER_ADMIN_PATCH_FIELDS = ['name', 'default_direction', 'requires_document', 'sort_order'] as const;
const COST_CENTER_STRUCTURAL_FIELDS = ['code', 'type'] as const;
const COST_CENTER_FINANCE_PATCH_FIELDS = ['name', 'parent_id', 'territory_id', 'city', 'state', 'is_active'] as const;
const HIERARCHY_DEPTH_LIMIT = 50;

export class FinanceWriteError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function isKnownPrismaError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError;
}

function isCodeUniqueViolation(error: unknown) {
  if (!isKnownPrismaError(error) || error.code !== 'P2002') return false;
  const target = (error.meta as any)?.target;
  if (Array.isArray(target)) return target.includes('code');
  return String(target || '').includes('code');
}

const SERIALIZABLE_CONFLICT_MESSAGE = 'Conflito de concorrência. Recarregue os dados e tente novamente.';

function extractSqlStateFromDatabaseError(databaseError: unknown) {
  if (typeof databaseError !== 'string') return null;

  const sqlStateMatch = databaseError.match(/SQLSTATE[^0-9A-Z]*([0-9A-Z]{5})/i);
  if (sqlStateMatch?.[1]) return sqlStateMatch[1].toUpperCase();

  const anyCodeMatch = databaseError.match(/\b([0-9A-Z]{5})\b/i);
  if (anyCodeMatch?.[1]) return anyCodeMatch[1].toUpperCase();

  return null;
}

function isSerializableConflict(error: unknown) {
  if (isKnownPrismaError(error)) {
    if (error.code === 'P2034') return true;

    if (error.code === 'P2010') {
      const meta = (error.meta ?? {}) as any;
      const metaCode = typeof meta.code === 'string' ? meta.code.toUpperCase() : null;
      if (metaCode === '40001') return true;

      const databaseErrorSqlState = extractSqlStateFromDatabaseError(meta.database_error);
      if (databaseErrorSqlState === '40001') return true;
    }

    return false;
  }

  const maybePgError = error as any;
  const directCode = typeof maybePgError?.code === 'string' ? maybePgError.code.toUpperCase() : null;
  return directCode === '40001';
}

function assertOpeningBalanceConstraint(balance: bigint, allowsNegativeBalance: boolean) {
  if (balance < BigInt(0) && !allowsNegativeBalance) {
    throw new FinanceWriteError(400, 'opening_balance_cents negativo exige allows_negative_balance=true');
  }
}

type FinanceActor = {
  id: string;
  role: string;
  email?: string;
};

function isSuperAdmin(actor: FinanceActor) {
  return actor.role === 'SUPER_ADMIN';
}

function hasAnyField(data: Record<string, any>, fields: readonly string[]) {
  return fields.some((field) => Object.prototype.hasOwnProperty.call(data, field));
}

function ensureOnlyAllowedFields(data: Record<string, any>, allowedFields: readonly string[], message: string) {
  const invalidFields = Object.keys(data).filter(
    (field) => field !== 'expected_updated_at' && !allowedFields.includes(field),
  );
  if (invalidFields.length > 0) {
    throw new FinanceWriteError(403, message);
  }
}

function buildAccountId() {
  return `facc_${randomUUID().replace(/-/g, '')}`;
}

function buildCategoryId() {
  return `fcat_${randomUUID().replace(/-/g, '')}`;
}

function buildCostCenterId() {
  return `fcc_${randomUUID().replace(/-/g, '')}`;
}

async function assertCategoryParent(parentId: string | null | undefined, kind?: string) {
  if (!parentId) return;
  const parent = await prisma.financial_categories.findUnique({ where: { id: parentId }, select: { id: true, kind: true } });
  if (!parent) throw new FinanceWriteError(404, 'Categoria pai não encontrada');
  if (kind && parent.kind !== kind) throw new FinanceWriteError(400, 'kind da categoria pai deve ser igual ao da categoria filha');
}

async function lockRow(tx: any, tableName: 'financial_accounts' | 'financial_categories' | 'financial_cost_centers', id: string) {
  const rows: Array<{ id: string }> = await tx.$queryRawUnsafe(
    `SELECT id FROM "${tableName}" WHERE id = $1 FOR UPDATE`,
    id,
  );
  return rows.length > 0;
}

async function countAccountTransactions(tx: any, accountId: string, statuses?: readonly string[]) {
  return tx.financial_transactions.count({
    where: {
      OR: [{ account_id: accountId }, { counterparty_account_id: accountId }],
      ...(statuses ? { status: { in: [...statuses] } } : {}),
    },
  });
}

async function countCategoryTransactions(tx: any, categoryId: string, statuses?: readonly string[]) {
  return tx.financial_transactions.count({
    where: {
      category_id: categoryId,
      ...(statuses ? { status: { in: [...statuses] } } : {}),
    },
  });
}

async function countCategoryAllocations(tx: any, categoryId: string, statuses?: readonly string[]) {
  return tx.financial_transaction_allocations.count({
    where: {
      category_id: categoryId,
      ...(statuses ? { transaction: { status: { in: [...statuses] } } } : {}),
    },
  });
}

async function countCostCenterTransactions(tx: any, costCenterId: string, statuses?: readonly string[]) {
  return tx.financial_transactions.count({
    where: {
      cost_center_id: costCenterId,
      ...(statuses ? { status: { in: [...statuses] } } : {}),
    },
  });
}

async function countCostCenterAllocations(tx: any, costCenterId: string, statuses?: readonly string[]) {
  return tx.financial_transaction_allocations.count({
    where: {
      cost_center_id: costCenterId,
      ...(statuses ? { transaction: { status: { in: [...statuses] } } } : {}),
    },
  });
}

async function countActiveCategoryChildren(tx: any, categoryId: string) {
  return tx.financial_categories.count({ where: { parent_id: categoryId, is_active: true } });
}

async function countCategoryChildren(tx: any, categoryId: string) {
  return tx.financial_categories.count({ where: { parent_id: categoryId } });
}

async function countActiveCostCenterChildren(tx: any, costCenterId: string) {
  return tx.financial_cost_centers.count({ where: { parent_id: costCenterId, is_active: true } });
}

async function countCostCenterChildren(tx: any, costCenterId: string) {
  return tx.financial_cost_centers.count({ where: { parent_id: costCenterId } });
}

async function assertCategoryHierarchy(tx: any, parentId: string | null | undefined, selfId: string | null, expectedKind: string) {
  if (!parentId) return;

  let cursor: string | null = parentId;
  const seen = new Set<string>();

  for (let depth = 0; depth < HIERARCHY_DEPTH_LIMIT && cursor; depth += 1) {
    if (selfId && cursor === selfId) {
      throw new FinanceWriteError(409, 'Ciclo hierárquico em categoria');
    }
    if (seen.has(cursor)) {
      throw new FinanceWriteError(409, 'Hierarquia de categoria inválida');
    }
    seen.add(cursor);

    const parent: any = await tx.financial_categories.findUnique({
      where: { id: cursor },
      select: { id: true, parent_id: true, kind: true },
    });

    if (!parent) {
      if (depth === 0) throw new FinanceWriteError(404, 'Categoria pai não encontrada');
      throw new FinanceWriteError(409, 'Hierarquia de categoria inválida');
    }

    if (depth === 0 && parent.kind !== expectedKind) {
      throw new FinanceWriteError(409, 'kind da categoria pai deve ser igual ao da categoria filha');
    }

    cursor = parent.parent_id;
  }

  if (cursor) {
    throw new FinanceWriteError(409, 'Hierarquia de categoria excede o limite seguro');
  }
}

async function assertCostCenterHierarchy(tx: any, parentId: string | null | undefined, selfId: string | null) {
  if (!parentId) return;

  let cursor: string | null = parentId;
  const seen = new Set<string>();

  for (let depth = 0; depth < HIERARCHY_DEPTH_LIMIT && cursor; depth += 1) {
    if (selfId && cursor === selfId) {
      throw new FinanceWriteError(409, 'Ciclo hierárquico em centro de custo');
    }
    if (seen.has(cursor)) {
      throw new FinanceWriteError(409, 'Hierarquia de centro de custo inválida');
    }
    seen.add(cursor);

    const parent: any = await tx.financial_cost_centers.findUnique({
      where: { id: cursor },
      select: { id: true, parent_id: true },
    });

    if (!parent) {
      if (depth === 0) throw new FinanceWriteError(404, 'Centro de custo pai não encontrado');
      throw new FinanceWriteError(409, 'Hierarquia de centro de custo inválida');
    }

    cursor = parent.parent_id;
  }

  if (cursor) {
    throw new FinanceWriteError(409, 'Hierarquia de centro de custo excede o limite seguro');
  }
}

function serializeAccountAuditState(record: any) {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    type: record.type,
    institution_name: record.institution_name ?? null,
    bank_code: record.bank_code ?? null,
    currency: record.currency,
    opening_balance_cents: record.opening_balance_cents?.toString() ?? '0',
    opening_balance_date: record.opening_balance_date?.toISOString?.() ?? record.opening_balance_date ?? null,
    allows_negative_balance: record.allows_negative_balance,
    is_cash_equivalent: record.is_cash_equivalent,
    is_active: record.is_active,
    notes: record.notes ?? null,
    created_by_admin_id: record.created_by_admin_id ?? null,
    updated_by_admin_id: record.updated_by_admin_id ?? null,
    created_at: record.created_at?.toISOString?.() ?? record.created_at ?? null,
    updated_at: record.updated_at?.toISOString?.() ?? record.updated_at ?? null,
  };
}

function serializeCategoryAuditState(record: any) {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    kind: record.kind,
    parent_id: record.parent_id ?? null,
    default_direction: record.default_direction ?? null,
    requires_document: record.requires_document,
    is_system: record.is_system,
    is_active: record.is_active,
    sort_order: record.sort_order,
    created_by_admin_id: record.created_by_admin_id ?? null,
    updated_by_admin_id: record.updated_by_admin_id ?? null,
    created_at: record.created_at?.toISOString?.() ?? record.created_at ?? null,
    updated_at: record.updated_at?.toISOString?.() ?? record.updated_at ?? null,
  };
}

function serializeCostCenterAuditState(record: any) {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    type: record.type,
    parent_id: record.parent_id ?? null,
    territory_id: record.territory_id ?? null,
    city: record.city ?? null,
    state: record.state ?? null,
    is_active: record.is_active,
    created_by_admin_id: record.created_by_admin_id ?? null,
    updated_by_admin_id: record.updated_by_admin_id ?? null,
    created_at: record.created_at?.toISOString?.() ?? record.created_at ?? null,
    updated_at: record.updated_at?.toISOString?.() ?? record.updated_at ?? null,
  };
}

async function assertCostCenterParent(parentId: string | null | undefined) {
  if (!parentId) return;
  const parent = await prisma.financial_cost_centers.findUnique({ where: { id: parentId }, select: { id: true } });
  if (!parent) throw new FinanceWriteError(404, 'Centro de custo pai não encontrado');
}

async function assertTerritory(tx: any, territoryId: string | null | undefined) {
  if (!territoryId) return;
  const territory = await tx.operational_territories.findUnique({ where: { id: territoryId }, select: { id: true } });
  if (!territory) throw new FinanceWriteError(404, 'Território não encontrado');
}

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

export async function createFinanceAccount(data: any, actor: FinanceActor) {
  try {
    const openingBalance = BigInt(data.opening_balance_cents ?? '0');
    const allowsNegativeBalance = data.allows_negative_balance ?? false;
    assertOpeningBalanceConstraint(openingBalance, allowsNegativeBalance);

    const created = await prisma.financial_accounts.create({
      data: {
        id: buildAccountId(),
        code: data.code,
        name: data.name,
        type: data.type,
        institution_name: data.institution_name ?? null,
        bank_code: data.bank_code ?? null,
        currency: data.currency ?? 'BRL',
        opening_balance_cents: openingBalance,
        opening_balance_date: data.opening_balance_date ?? null,
        allows_negative_balance: allowsNegativeBalance,
        is_cash_equivalent: data.is_cash_equivalent ?? false,
        is_active: data.is_active ?? true,
        notes: data.notes ?? null,
        created_by_admin_id: actor.id,
        updated_by_admin_id: actor.id,
      },
    });

    const record = await getFinanceAccountById(created.id);
    return {
      record,
      auditBefore: null,
      auditAfter: serializeAccountAuditState(created),
    };
  } catch (error) {
    if (isCodeUniqueViolation(error)) throw new FinanceWriteError(409, 'code já existe');
    if (isSerializableConflict(error)) throw new FinanceWriteError(409, SERIALIZABLE_CONFLICT_MESSAGE);
    throw error;
  }
}

export async function updateFinanceAccount(id: string, data: any, actor: FinanceActor) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const exists = await lockRow(tx, 'financial_accounts', id);
      if (!exists) throw new FinanceWriteError(404, 'Conta financeira não encontrada');

    const current = await tx.financial_accounts.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        institution_name: true,
        bank_code: true,
        currency: true,
        opening_balance_cents: true,
        opening_balance_date: true,
        allows_negative_balance: true,
        is_cash_equivalent: true,
        is_active: true,
        notes: true,
        created_by_admin_id: true,
        updated_by_admin_id: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!current) throw new FinanceWriteError(404, 'Conta financeira não encontrada');

    if (!isSuperAdmin(actor)) {
      ensureOnlyAllowedFields(data, ACCOUNT_FINANCE_PATCH_FIELDS, 'Campo sem permissão para FINANCE');
    }

    const touchesStructuralFields = hasAnyField(data, ACCOUNT_STRUCTURAL_FIELDS);
    if (touchesStructuralFields && !isSuperAdmin(actor)) {
      throw new FinanceWriteError(403, 'Campo estrutural exige SUPER_ADMIN');
    }

    const [relatedTransactionsCount, nonFinalTransactionsCount] = await Promise.all([
      (touchesStructuralFields ? countAccountTransactions(tx, id) : Promise.resolve(0)),
      (data.is_active === false && current.is_active ? countAccountTransactions(tx, id, NON_FINAL_TRANSACTION_STATUSES) : Promise.resolve(0)),
    ]);

    if (touchesStructuralFields && relatedTransactionsCount > 0) {
      throw new FinanceWriteError(409, 'Campo estrutural bloqueado porque a conta já foi usada');
    }

    if (data.is_active === false && current.is_active && nonFinalTransactionsCount > 0) {
      throw new FinanceWriteError(409, 'Conta não pode ser desativada com transações não finais');
    }

      const nextOpeningBalance = data.opening_balance_cents !== undefined
        ? BigInt(data.opening_balance_cents)
        : current.opening_balance_cents;
      const nextAllowsNegativeBalance = data.allows_negative_balance !== undefined
        ? data.allows_negative_balance
        : current.allows_negative_balance;
      assertOpeningBalanceConstraint(nextOpeningBalance, nextAllowsNegativeBalance);

      const updateData: any = { updated_by_admin_id: actor.id };
      for (const key of [
        'code',
        'name',
        'type',
        'institution_name',
        'bank_code',
        'currency',
        'opening_balance_date',
        'allows_negative_balance',
        'is_cash_equivalent',
        'is_active',
        'notes',
      ]) {
        if (data[key] !== undefined) updateData[key] = data[key];
      }
      if (data.opening_balance_cents !== undefined) {
        updateData.opening_balance_cents = nextOpeningBalance;
      }

      const updated = await tx.financial_accounts.updateMany({
        where: { id, updated_at: data.expected_updated_at },
        data: updateData,
      });

      if (updated.count !== 1) {
        throw new FinanceWriteError(409, 'Conflito de atualização (expected_updated_at divergente)');
      }

      const after = await tx.financial_accounts.findUnique({
        where: { id },
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
          institution_name: true,
          bank_code: true,
          currency: true,
          opening_balance_cents: true,
          opening_balance_date: true,
          allows_negative_balance: true,
          is_cash_equivalent: true,
          is_active: true,
          notes: true,
          created_by_admin_id: true,
          updated_by_admin_id: true,
          created_at: true,
          updated_at: true,
        },
      });

      return {
        auditBefore: serializeAccountAuditState(current),
        auditAfter: serializeAccountAuditState(after),
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    const record = await getFinanceAccountById(id);
    return { record, ...result };
  } catch (error) {
    if (isSerializableConflict(error)) throw new FinanceWriteError(409, SERIALIZABLE_CONFLICT_MESSAGE);
    throw error;
  }
}

export async function createFinanceCategory(data: any, actor: FinanceActor) {
  try {
    const created = await prisma.$transaction(async (tx) => {
      await assertCategoryHierarchy(tx, data.parent_id, null, data.kind);

      return tx.financial_categories.create({
        data: {
          id: buildCategoryId(),
          code: data.code,
          name: data.name,
          kind: data.kind,
          parent_id: data.parent_id ?? null,
          default_direction: data.default_direction ?? null,
          requires_document: data.requires_document ?? false,
          is_system: false,
          is_active: data.is_active ?? true,
          is_postable: false,
          sort_order: data.sort_order ?? 0,
          created_by_admin_id: actor.id,
          updated_by_admin_id: actor.id,
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    const record = await getFinanceCategoryById(created.id);
    return {
      record,
      auditBefore: null,
      auditAfter: serializeCategoryAuditState(created),
    };
  } catch (error) {
    if (isCodeUniqueViolation(error)) throw new FinanceWriteError(409, 'code já existe');
    if (isSerializableConflict(error)) throw new FinanceWriteError(409, SERIALIZABLE_CONFLICT_MESSAGE);
    throw error;
  }
}

export async function updateFinanceCategory(id: string, data: any, actor: FinanceActor) {
  try {
    const result = await prisma.$transaction(async (tx) => {
    const exists = await lockRow(tx, 'financial_categories', id);
    if (!exists) throw new FinanceWriteError(404, 'Categoria financeira não encontrada');

    const current = await tx.financial_categories.findUnique({
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
        created_by_admin_id: true,
        updated_by_admin_id: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!current) throw new FinanceWriteError(404, 'Categoria financeira não encontrada');

    if (!isSuperAdmin(actor)) {
      if (current.is_system) {
        throw new FinanceWriteError(403, 'FINANCE não pode editar categoria de sistema');
      }
      ensureOnlyAllowedFields(data, CATEGORY_FINANCE_PATCH_FIELDS, 'Campo sem permissão para FINANCE');
    }

    if (current.is_system && isSuperAdmin(actor)) {
      const protectedFields = Object.keys(data).filter(
        (field) => field !== 'expected_updated_at' && !CATEGORY_SYSTEM_SUPER_ADMIN_PATCH_FIELDS.includes(field as any),
      );
      if (protectedFields.length > 0) {
        throw new FinanceWriteError(409, 'Categoria de sistema protegida');
      }
    }

    if (data.parent_id === id) {
      throw new FinanceWriteError(409, 'Categoria não pode apontar para si mesma');
    }

    const nextKind = data.kind ?? current.kind;
    const willDeactivate = data.is_active === false && current.is_active;
    const touchesStructuralFields = hasAnyField(data, ['code', 'kind']);
    const kindWillChange = data.kind !== undefined && data.kind !== current.kind;

    if (touchesStructuralFields && !isSuperAdmin(actor)) {
      throw new FinanceWriteError(403, 'Campo estrutural exige SUPER_ADMIN');
    }

    const [childrenCount, activeChildrenCount, txUsageCount, allocationUsageCount, nonFinalTxCount, nonFinalAllocationCount] = await Promise.all([
      (kindWillChange ? countCategoryChildren(tx, id) : Promise.resolve(0)),
      (willDeactivate ? countActiveCategoryChildren(tx, id) : Promise.resolve(0)),
      (touchesStructuralFields ? countCategoryTransactions(tx, id) : Promise.resolve(0)),
      (touchesStructuralFields ? countCategoryAllocations(tx, id) : Promise.resolve(0)),
      (willDeactivate ? countCategoryTransactions(tx, id, NON_FINAL_TRANSACTION_STATUSES) : Promise.resolve(0)),
      (willDeactivate ? countCategoryAllocations(tx, id, NON_FINAL_TRANSACTION_STATUSES) : Promise.resolve(0)),
    ]);

    if (kindWillChange && childrenCount > 0) {
      throw new FinanceWriteError(409, 'kind não pode ser alterado quando a categoria possui filhos');
    }
    if (touchesStructuralFields && (txUsageCount > 0 || allocationUsageCount > 0)) {
      throw new FinanceWriteError(409, 'Campo estrutural bloqueado porque a categoria já foi usada');
    }
    if (willDeactivate && activeChildrenCount > 0) {
      throw new FinanceWriteError(409, 'Categoria não pode ser desativada com filho ativo');
    }
    if (willDeactivate && (nonFinalTxCount > 0 || nonFinalAllocationCount > 0)) {
      throw new FinanceWriteError(409, 'Categoria não pode ser desativada com uso não final');
    }

    if (data.parent_id !== undefined || kindWillChange) {
      await assertCategoryHierarchy(tx, data.parent_id ?? current.parent_id, id, nextKind);
    }

    const updateData: any = { updated_by_admin_id: actor.id };
    for (const key of ['code', 'name', 'kind', 'parent_id', 'default_direction', 'requires_document', 'is_active', 'sort_order']) {
      if (data[key] !== undefined) updateData[key] = data[key];
    }

    const updated = await tx.financial_categories.updateMany({
      where: { id, updated_at: data.expected_updated_at },
      data: updateData,
    });

    if (updated.count !== 1) {
      throw new FinanceWriteError(409, 'Conflito de atualização (expected_updated_at divergente)');
    }

    const after = await tx.financial_categories.findUnique({
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
        created_by_admin_id: true,
        updated_by_admin_id: true,
        created_at: true,
        updated_at: true,
      },
    });

    return {
      auditBefore: serializeCategoryAuditState(current),
      auditAfter: serializeCategoryAuditState(after),
    };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    const record = await getFinanceCategoryById(id);
    return { record, ...result };
  } catch (error) {
    if (isSerializableConflict(error)) throw new FinanceWriteError(409, SERIALIZABLE_CONFLICT_MESSAGE);
    throw error;
  }
}

export async function createFinanceCostCenter(data: any, actor: FinanceActor) {
  try {
    const created = await prisma.$transaction(async (tx) => {
      await assertCostCenterHierarchy(tx, data.parent_id, null);
      await assertTerritory(tx, data.territory_id);

      return tx.financial_cost_centers.create({
        data: {
          id: buildCostCenterId(),
          code: data.code,
          name: data.name,
          type: data.type,
          parent_id: data.parent_id ?? null,
          territory_id: data.territory_id ?? null,
          city: data.city ?? null,
          state: data.state ?? null,
          is_active: data.is_active ?? true,
          created_by_admin_id: actor.id,
          updated_by_admin_id: actor.id,
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    const record = await getFinanceCostCenterById(created.id);
    return {
      record,
      auditBefore: null,
      auditAfter: serializeCostCenterAuditState(created),
    };
  } catch (error) {
    if (isCodeUniqueViolation(error)) throw new FinanceWriteError(409, 'code já existe');
    if (isSerializableConflict(error)) throw new FinanceWriteError(409, SERIALIZABLE_CONFLICT_MESSAGE);
    throw error;
  }
}

export async function updateFinanceCostCenter(id: string, data: any, actor: FinanceActor) {
  try {
    const result = await prisma.$transaction(async (tx) => {
    const exists = await lockRow(tx, 'financial_cost_centers', id);
    if (!exists) throw new FinanceWriteError(404, 'Centro de custo não encontrado');

    const current = await tx.financial_cost_centers.findUnique({
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
        created_by_admin_id: true,
        updated_by_admin_id: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!current) throw new FinanceWriteError(404, 'Centro de custo não encontrado');

    if (!isSuperAdmin(actor)) {
      ensureOnlyAllowedFields(data, COST_CENTER_FINANCE_PATCH_FIELDS, 'Campo sem permissão para FINANCE');
    }

    const touchesStructuralFields = hasAnyField(data, COST_CENTER_STRUCTURAL_FIELDS);
    const typeWillChange = data.type !== undefined && data.type !== current.type;
    const willDeactivate = data.is_active === false && current.is_active;

    if (touchesStructuralFields && !isSuperAdmin(actor)) {
      throw new FinanceWriteError(403, 'Campo estrutural exige SUPER_ADMIN');
    }
    if (data.parent_id === id) {
      throw new FinanceWriteError(409, 'Centro de custo não pode apontar para si mesmo');
    }

    const [childrenCount, activeChildrenCount, txUsageCount, allocationUsageCount, nonFinalTxCount, nonFinalAllocationCount] = await Promise.all([
      (typeWillChange ? countCostCenterChildren(tx, id) : Promise.resolve(0)),
      (willDeactivate ? countActiveCostCenterChildren(tx, id) : Promise.resolve(0)),
      (touchesStructuralFields ? countCostCenterTransactions(tx, id) : Promise.resolve(0)),
      (touchesStructuralFields ? countCostCenterAllocations(tx, id) : Promise.resolve(0)),
      (willDeactivate ? countCostCenterTransactions(tx, id, NON_FINAL_TRANSACTION_STATUSES) : Promise.resolve(0)),
      (willDeactivate ? countCostCenterAllocations(tx, id, NON_FINAL_TRANSACTION_STATUSES) : Promise.resolve(0)),
    ]);

    if (typeWillChange && childrenCount > 0) {
      throw new FinanceWriteError(409, 'type não pode ser alterado quando o centro de custo possui filhos');
    }
    if (touchesStructuralFields && (txUsageCount > 0 || allocationUsageCount > 0)) {
      throw new FinanceWriteError(409, 'Campo estrutural bloqueado porque o centro de custo já foi usado');
    }
    if (willDeactivate && activeChildrenCount > 0) {
      throw new FinanceWriteError(409, 'Centro de custo não pode ser desativado com filho ativo');
    }
    if (willDeactivate && (nonFinalTxCount > 0 || nonFinalAllocationCount > 0)) {
      throw new FinanceWriteError(409, 'Centro de custo não pode ser desativado com uso não final');
    }

    if (data.parent_id !== undefined) {
      await assertCostCenterHierarchy(tx, data.parent_id, id);
    }
    if (data.territory_id !== undefined) {
      await assertTerritory(tx, data.territory_id);
    }

    const updateData: any = { updated_by_admin_id: actor.id };
    for (const key of ['code', 'name', 'type', 'parent_id', 'territory_id', 'city', 'state', 'is_active']) {
      if (data[key] !== undefined) updateData[key] = data[key];
    }

    const updated = await tx.financial_cost_centers.updateMany({
      where: { id, updated_at: data.expected_updated_at },
      data: updateData,
    });

    if (updated.count !== 1) {
      throw new FinanceWriteError(409, 'Conflito de atualização (expected_updated_at divergente)');
    }

    const after = await tx.financial_cost_centers.findUnique({
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
        created_by_admin_id: true,
        updated_by_admin_id: true,
        created_at: true,
        updated_at: true,
      },
    });

    return {
      auditBefore: serializeCostCenterAuditState(current),
      auditAfter: serializeCostCenterAuditState(after),
    };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    const record = await getFinanceCostCenterById(id);
    return { record, ...result };
  } catch (error) {
    if (isSerializableConflict(error)) throw new FinanceWriteError(409, SERIALIZABLE_CONFLICT_MESSAGE);
    throw error;
  }
}
