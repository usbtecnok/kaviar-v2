import type {
  ExistingFinancialCatalogSnapshot,
} from './account-materialization-types';

import {
  assertMaterializationEnvironment,
  readMaterializationEnvironmentFromProcess,
  type MaterializationDatabaseIdentity,
} from './account-materialization-safety';

export interface MaterializationAccountRow {
  code: string;
  name: string;
  type: string;
  currency: string;
}

export interface MaterializationCategoryRow {
  code: string;
  name: string;
  kind: string;
  parent: { code: string } | null;
  default_direction: 'IN' | 'OUT' | null;
  is_postable: boolean;
}

export interface MaterializationCostCenterRow {
  code: string;
  name: string;
  type: string;
  parent: { code: string } | null;
}

export interface MaterializationCatalogRows {
  accounts: MaterializationAccountRow[];
  categories: MaterializationCategoryRow[];
  cost_centers: MaterializationCostCenterRow[];
}

export interface LoadedMaterializationCatalogSnapshot {
  database: MaterializationDatabaseIdentity;
  snapshot: ExistingFinancialCatalogSnapshot;
}

export function buildExistingFinancialCatalogSnapshot(
  rows: MaterializationCatalogRows,
): ExistingFinancialCatalogSnapshot {
  return {
    accounts: rows.accounts.map((account) => ({
      code: account.code,
      name: account.name,
      type: account.type,
      currency: account.currency,
    })),
    categories: rows.categories.map((category) => ({
      code: category.code,
      name: category.name,
      kind: category.kind,
      parent_code: category.parent?.code ?? null,
      default_direction: category.default_direction,
      is_postable: category.is_postable,
    })),
    cost_centers: rows.cost_centers.map((costCenter) => ({
      code: costCenter.code,
      name: costCenter.name,
      type: costCenter.type,
      parent_code: costCenter.parent?.code ?? null,
    })),
  };
}

export async function loadExistingFinancialCatalogSnapshotFromLocalDatabase():
  Promise<LoadedMaterializationCatalogSnapshot> {
  const environment =
    readMaterializationEnvironmentFromProcess();

  const database =
    assertMaterializationEnvironment(environment);

  if (!environment.databaseUrl) {
    throw new Error(
      'FINANCE_MATERIALIZATION_DATABASE_URL é obrigatória',
    );
  }

  // Ignora qualquer DATABASE_URL eventualmente carregada por dotenv.
  // O Prisma receberá apenas a URL exclusiva já validada como local.
  process.env.DATABASE_URL = environment.databaseUrl;

  // Importação dinâmica intencional: a trava e a substituição da URL
  // devem acontecer antes da inicialização do PrismaClient.
  const { prisma } = await import('../../../lib/prisma');

  const [accounts, categories, costCenters] = await Promise.all([
    prisma.financial_accounts.findMany({
      select: {
        code: true,
        name: true,
        type: true,
        currency: true,
      },
      orderBy: { code: 'asc' },
    }),
    prisma.financial_categories.findMany({
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
    prisma.financial_cost_centers.findMany({
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

  return {
    database,
    snapshot: buildExistingFinancialCatalogSnapshot({
      accounts,
      categories,
      cost_centers: costCenters,
    }),
  };
}
