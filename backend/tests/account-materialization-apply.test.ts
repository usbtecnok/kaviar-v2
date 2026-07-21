import { describe, expect, it } from 'vitest';

import {
  applyAccountMaterialization,
  type MaterializationRepository,
  type MaterializationTransactionRepository,
} from '../src/services/finance/account-catalog/account-materialization-apply';

import type {
  ExistingFinancialCatalogSnapshot,
} from '../src/services/finance/account-catalog/account-materialization-types';

import {
  MaterializationTargetModel,
} from '../src/services/finance/account-catalog/account-materialization-types';

import type {
  MaterializationAccountCreateData,
  MaterializationCategoryCreateData,
} from '../src/services/finance/account-catalog/account-materialization-write-set';

function cloneSnapshot(
  snapshot: ExistingFinancialCatalogSnapshot,
): ExistingFinancialCatalogSnapshot {
  return {
    accounts: snapshot.accounts.map((item) => ({ ...item })),
    categories: snapshot.categories.map((item) => ({ ...item })),
    cost_centers: snapshot.cost_centers.map((item) => ({ ...item })),
  };
}

class InMemoryMaterializationRepository
  implements MaterializationRepository {
  public snapshot: ExistingFinancialCatalogSnapshot;

  public failCategoryCreation = false;

  constructor(
    snapshot: ExistingFinancialCatalogSnapshot = {
      accounts: [],
      categories: [],
      cost_centers: [],
    },
  ) {
    this.snapshot = cloneSnapshot(snapshot);
  }

  async transaction<T>(
    operation: (
      repository: MaterializationTransactionRepository,
    ) => Promise<T>,
  ): Promise<T> {
    const working = cloneSnapshot(this.snapshot);

    const transactionRepository:
      MaterializationTransactionRepository = {
        loadSnapshot: async () => cloneSnapshot(working),

        createAccounts: async (
          accounts: readonly MaterializationAccountCreateData[],
        ) => {
          for (const account of accounts) {
            working.accounts.push({
              code: account.code,
              name: account.name,
              type: account.type,
              currency: account.currency,
            });
          }
        },

        createCategories: async (
          categories:
            readonly MaterializationCategoryCreateData[],
        ) => {
          if (
            this.failCategoryCreation &&
            categories.length > 0
          ) {
            throw new Error(
              'Falha simulada ao criar categorias',
            );
          }

          for (const category of categories) {
            working.categories.push({
              code: category.code,
              name: category.name,
              kind: category.kind,
              parent_code: null,
              default_direction:
                category.default_direction,
              is_postable: category.is_postable,
            });
          }
        },
      };

    const result = await operation(transactionRepository);
    this.snapshot = working;
    return result;
  }
}

function deterministicIdFactory(
  targetModel: MaterializationTargetModel,
  code: string,
): string {
  const prefix =
    targetModel ===
    MaterializationTargetModel.FINANCIAL_ACCOUNT
      ? 'facc'
      : targetModel ===
          MaterializationTargetModel.FINANCIAL_CATEGORY
        ? 'fcat'
        : 'fcc';

  return `${prefix}_apply_test_${code}`;
}

describe('account materialization apply', () => {
  it('cria somente 10 contas e 6 categorias READY', async () => {
    const repository =
      new InMemoryMaterializationRepository();

    const result = await applyAccountMaterialization(
      repository,
      deterministicIdFactory,
    );

    expect(result.total_created).toBe(16);
    expect(result.created_accounts).toHaveLength(10);
    expect(result.created_categories).toHaveLength(6);
    expect(result.created_cost_centers).toEqual([]);
    expect(result.before_total_writes).toBe(16);
    expect(result.after_total_writes).toBe(0);
    expect(result.idempotent_noop).toBe(false);

    expect(repository.snapshot.accounts).toHaveLength(10);
    expect(repository.snapshot.categories).toHaveLength(6);
    expect(repository.snapshot.cost_centers).toEqual([]);
  });

  it('a segunda execução é idempotente', async () => {
    const repository =
      new InMemoryMaterializationRepository();

    await applyAccountMaterialization(
      repository,
      deterministicIdFactory,
    );

    const second = await applyAccountMaterialization(
      repository,
      deterministicIdFactory,
    );

    expect(second.total_created).toBe(0);
    expect(second.before_total_writes).toBe(0);
    expect(second.after_total_writes).toBe(0);
    expect(second.idempotent_noop).toBe(true);

    expect(repository.snapshot.accounts).toHaveLength(10);
    expect(repository.snapshot.categories).toHaveLength(6);
  });

  it('recusa conflito estrutural antes de escrever', async () => {
    const repository =
      new InMemoryMaterializationRepository({
        accounts: [
          {
            code: '1101',
            name: 'Bank - Operational',
            type: 'CASH',
            currency: 'BRL',
          },
        ],
        categories: [],
        cost_centers: [],
      });

    await expect(
      applyAccountMaterialization(
        repository,
        deterministicIdFactory,
      ),
    ).rejects.toThrow(
      'Plano atual possui conflito ou bloqueio',
    );

    expect(repository.snapshot.accounts).toHaveLength(1);
    expect(repository.snapshot.categories).toEqual([]);
  });

  it('faz rollback se a criação de categorias falhar', async () => {
    const repository =
      new InMemoryMaterializationRepository();

    repository.failCategoryCreation = true;

    await expect(
      applyAccountMaterialization(
        repository,
        deterministicIdFactory,
      ),
    ).rejects.toThrow(
      'Falha simulada ao criar categorias',
    );

    expect(repository.snapshot.accounts).toEqual([]);
    expect(repository.snapshot.categories).toEqual([]);
    expect(repository.snapshot.cost_centers).toEqual([]);
  });
});
