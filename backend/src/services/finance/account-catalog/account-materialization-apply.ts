import {
  buildAccountMaterializationPlan,
} from './account-materialization-plan';

import type {
  ExistingFinancialCatalogSnapshot,
} from './account-materialization-types';

import {
  buildMaterializationWriteSet,
  defaultMaterializationIdFactory,
  type MaterializationAccountCreateData,
  type MaterializationCategoryCreateData,
  type MaterializationIdFactory,
} from './account-materialization-write-set';

export interface MaterializationTransactionRepository {
  loadSnapshot(): Promise<ExistingFinancialCatalogSnapshot>;

  createAccounts(
    accounts: readonly MaterializationAccountCreateData[],
  ): Promise<void>;

  createCategories(
    categories: readonly MaterializationCategoryCreateData[],
  ): Promise<void>;
}

export interface MaterializationRepository {
  transaction<T>(
    operation: (
      repository: MaterializationTransactionRepository,
    ) => Promise<T>,
  ): Promise<T>;
}

export interface MaterializationApplyResult {
  blueprint_version: string;
  created_accounts: string[];
  created_categories: string[];
  created_cost_centers: string[];
  total_created: number;
  before_total_writes: number;
  after_total_writes: number;
  idempotent_noop: boolean;
}

export async function applyAccountMaterialization(
  repository: MaterializationRepository,
  idFactory: MaterializationIdFactory =
    defaultMaterializationIdFactory,
): Promise<MaterializationApplyResult> {
  return repository.transaction(async (transactionRepository) => {
    const beforeSnapshot =
      await transactionRepository.loadSnapshot();

    const beforePlan =
      buildAccountMaterializationPlan(beforeSnapshot);

    if (!beforePlan.can_apply) {
      throw new Error(
        'Plano atual possui conflito ou bloqueio e não pode ser aplicado',
      );
    }

    const writeSet = buildMaterializationWriteSet(
      beforePlan,
      idFactory,
    );

    await transactionRepository.createAccounts(
      writeSet.accounts,
    );

    await transactionRepository.createCategories(
      writeSet.categories,
    );

    const afterSnapshot =
      await transactionRepository.loadSnapshot();

    const afterPlan =
      buildAccountMaterializationPlan(afterSnapshot);

    if (!afterPlan.can_apply) {
      throw new Error(
        'Catálogo ficou inconsistente após a materialização',
      );
    }

    if (afterPlan.total_writes !== 0) {
      throw new Error(
        `Materialização incompleta: ainda restam ${afterPlan.total_writes} escritas`,
      );
    }

    const createdAccounts =
      writeSet.accounts.map((account) => account.code);

    const createdCategories =
      writeSet.categories.map((category) => category.code);

    return {
      blueprint_version: writeSet.blueprint_version,
      created_accounts: createdAccounts,
      created_categories: createdCategories,
      created_cost_centers: [],
      total_created:
        createdAccounts.length + createdCategories.length,
      before_total_writes: beforePlan.total_writes,
      after_total_writes: afterPlan.total_writes,
      idempotent_noop: writeSet.total_writes === 0,
    };
  });
}
