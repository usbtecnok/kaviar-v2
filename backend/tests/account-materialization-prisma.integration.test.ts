import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from 'vitest';

import type {
  PrismaClient,
} from '@prisma/client';

import {
  applyAccountMaterialization,
  type MaterializationRepository,
} from '../src/services/finance/account-catalog/account-materialization-apply';

import {
  assertMaterializationEnvironment,
  readMaterializationEnvironmentFromProcess,
} from '../src/services/finance/account-catalog/account-materialization-safety';

const integrationEnabled =
  process.env.RUN_FINANCE_MATERIALIZATION_INTEGRATION ===
  'true';

describe.skipIf(!integrationEnabled)(
  'account materialization Prisma integration',
  () => {
    let prisma: PrismaClient;
    let repository: MaterializationRepository;

    async function readCounts() {
      const [
        accounts,
        categories,
        costCenters,
        transactions,
      ] = await Promise.all([
        prisma.financial_accounts.count(),
        prisma.financial_categories.count(),
        prisma.financial_cost_centers.count(),
        prisma.financial_transactions.count(),
      ]);

      return {
        accounts,
        categories,
        cost_centers: costCenters,
        transactions,
      };
    }

    beforeAll(async () => {
      const environment =
        readMaterializationEnvironmentFromProcess();

      assertMaterializationEnvironment(environment);

      if (!environment.databaseUrl) {
        throw new Error(
          'FINANCE_MATERIALIZATION_DATABASE_URL é obrigatória',
        );
      }

      process.env.DATABASE_URL =
        environment.databaseUrl;

      const prismaModule =
        await import('../src/lib/prisma');

      prisma = prismaModule.prisma;

      const repositoryModule = await import(
        '../src/services/finance/account-catalog/account-materialization-prisma-repository'
      );

      repository =
        repositoryModule
          .createPrismaMaterializationRepository(
            prisma,
          );

      const initialCounts = await readCounts();

      if (
        initialCounts.accounts !== 0 ||
        initialCounts.categories !== 0 ||
        initialCounts.cost_centers !== 0 ||
        initialCounts.transactions !== 0
      ) {
        throw new Error(
          `Banco de integração não está vazio: ${JSON.stringify(
            initialCounts,
          )}`,
        );
      }
    });

    afterAll(async () => {
      if (prisma) {
        await prisma.$disconnect();
      }
    });

    it(
      'faz rollback real, aplica e confirma idempotência',
      async () => {
        const failingRepository:
          MaterializationRepository = {
            transaction: <T>(
              operation: Parameters<
                MaterializationRepository['transaction']
              >[0],
            ): Promise<T> =>
              repository.transaction(
                async (transactionRepository) =>
                  operation({
                    ...transactionRepository,

                    createCategories: async () => {
                      throw new Error(
                        'INJECTED_CATEGORY_FAILURE',
                      );
                    },
                  }),
              ),
          };

        await expect(
          applyAccountMaterialization(
            failingRepository,
          ),
        ).rejects.toThrow(
          'INJECTED_CATEGORY_FAILURE',
        );

        expect(await readCounts()).toEqual({
          accounts: 0,
          categories: 0,
          cost_centers: 0,
          transactions: 0,
        });

        const firstResult =
          await applyAccountMaterialization(
            repository,
          );

        expect(firstResult).toMatchObject({
          total_created: 16,
          before_total_writes: 16,
          after_total_writes: 0,
          idempotent_noop: false,
        });

        expect(
          firstResult.created_accounts,
        ).toHaveLength(10);

        expect(
          firstResult.created_categories,
        ).toHaveLength(6);

        expect(
          firstResult.created_cost_centers,
        ).toEqual([]);

        expect(await readCounts()).toEqual({
          accounts: 10,
          categories: 6,
          cost_centers: 0,
          transactions: 0,
        });

        const secondResult =
          await applyAccountMaterialization(
            repository,
          );

        expect(secondResult).toEqual({
          blueprint_version: '1.0.0',
          created_accounts: [],
          created_categories: [],
          created_cost_centers: [],
          total_created: 0,
          before_total_writes: 0,
          after_total_writes: 0,
          idempotent_noop: true,
        });

        expect(await readCounts()).toEqual({
          accounts: 10,
          categories: 6,
          cost_centers: 0,
          transactions: 0,
        });
      },
      30_000,
    );
  },
);
