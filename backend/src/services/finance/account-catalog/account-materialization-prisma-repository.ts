import {
  Prisma,
  type PrismaClient,
  financial_account_type,
  financial_category_kind,
  financial_direction,
} from '@prisma/client';

import type {
  MaterializationRepository,
  MaterializationTransactionRepository,
} from './account-materialization-apply';

import {
  buildExistingFinancialCatalogSnapshot,
} from './account-materialization-snapshot';

import type {
  MaterializationAccountCreateData,
  MaterializationCategoryCreateData,
} from './account-materialization-write-set';

async function loadSnapshot(
  transaction: Prisma.TransactionClient,
) {
  const [accounts, categories, costCenters] =
    await Promise.all([
      transaction.financial_accounts.findMany({
        select: {
          code: true,
          name: true,
          type: true,
          currency: true,
        },
        orderBy: { code: 'asc' },
      }),

      transaction.financial_categories.findMany({
        select: {
          code: true,
          name: true,
          kind: true,
          parent: {
            select: {
              code: true,
            },
          },
          default_direction: true,
          is_postable: true,
        },
        orderBy: { code: 'asc' },
      }),

      transaction.financial_cost_centers.findMany({
        select: {
          code: true,
          name: true,
          type: true,
          parent: {
            select: {
              code: true,
            },
          },
        },
        orderBy: { code: 'asc' },
      }),
    ]);

  return buildExistingFinancialCatalogSnapshot({
    accounts,
    categories,
    cost_centers: costCenters,
  });
}

function toAccountCreateData(
  account: MaterializationAccountCreateData,
): Prisma.financial_accountsCreateManyInput {
  return {
    id: account.id,
    code: account.code,
    name: account.name,
    type: account.type as financial_account_type,
    institution_name: null,
    bank_code: null,
    agency_encrypted: null,
    account_number_encrypted: null,
    account_digit_encrypted: null,
    pix_key_encrypted: null,
    document_encrypted: null,
    account_fingerprint: null,
    account_last4: null,
    pix_key_last4: null,
    encryption_key_version: null,
    currency: account.currency,
    opening_balance_cents: account.opening_balance_cents,
    opening_balance_date: account.opening_balance_date,
    allows_negative_balance:
      account.allows_negative_balance,
    is_cash_equivalent: account.is_cash_equivalent,
    is_active: account.is_active,
    notes: account.notes,
    created_by_admin_id: account.created_by_admin_id,
    updated_by_admin_id: account.updated_by_admin_id,
  };
}

function toCategoryCreateData(
  category: MaterializationCategoryCreateData,
): Prisma.financial_categoriesCreateManyInput {
  return {
    id: category.id,
    code: category.code,
    name: category.name,
    kind: category.kind as financial_category_kind,
    parent_id: category.parent_id,
    default_direction:
      category.default_direction === null
        ? null
        : category.default_direction as financial_direction,
    requires_document: category.requires_document,
    is_system: category.is_system,
    is_active: category.is_active,
    is_postable: category.is_postable,
    sort_order: category.sort_order,
    created_by_admin_id: category.created_by_admin_id,
    updated_by_admin_id: category.updated_by_admin_id,
  };
}

function buildTransactionRepository(
  transaction: Prisma.TransactionClient,
): MaterializationTransactionRepository {
  return {
    loadSnapshot: () => loadSnapshot(transaction),

    createAccounts: async (accounts) => {
      if (accounts.length === 0) return;

      await transaction.financial_accounts.createMany({
        data: accounts.map(toAccountCreateData),
      });
    },

    createCategories: async (categories) => {
      if (categories.length === 0) return;

      await transaction.financial_categories.createMany({
        data: categories.map(toCategoryCreateData),
      });
    },
  };
}

export function createPrismaMaterializationRepository(
  prisma: PrismaClient,
): MaterializationRepository {
  return {
    transaction: async <T>(
      operation: (
        repository: MaterializationTransactionRepository,
      ) => Promise<T>,
    ): Promise<T> =>
      prisma.$transaction(
        async (transaction) =>
          operation(
            buildTransactionRepository(transaction),
          ),
        {
          isolationLevel:
            Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 10_000,
          timeout: 30_000,
        },
      ),
  };
}
