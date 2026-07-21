import type {
  PrismaClient,
} from '@prisma/client';

import {
  applyAccountMaterialization,
} from '../../src/services/finance/account-catalog/account-materialization-apply';

import {
  assertMaterializationEnvironment,
  readMaterializationEnvironmentFromProcess,
} from '../../src/services/finance/account-catalog/account-materialization-safety';

let prismaClient: PrismaClient | null = null;

async function main(): Promise<void> {
  const environment =
    readMaterializationEnvironmentFromProcess();

  const database =
    assertMaterializationEnvironment(environment);

  if (!environment.databaseUrl) {
    throw new Error(
      'FINANCE_MATERIALIZATION_DATABASE_URL é obrigatória',
    );
  }

  // Ignora qualquer DATABASE_URL carregada pelo ambiente ou dotenv.
  // O Prisma receberá somente a URL exclusiva já validada.
  process.env.DATABASE_URL = environment.databaseUrl;

  // O Prisma e o repositório são importados somente depois
  // da validação e substituição explícita da URL.
  const { prisma } = await import('../../src/lib/prisma');

  const {
    createPrismaMaterializationRepository,
  } = await import(
    '../../src/services/finance/account-catalog/account-materialization-prisma-repository'
  );

  prismaClient = prisma;

  const repository =
    createPrismaMaterializationRepository(prisma);

  const result = await applyAccountMaterialization(
    repository,
  );

  console.log(
    JSON.stringify(
      {
        mode: 'APPLY_LOCAL_READY_ONLY',
        database,
        result,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error: unknown) => {
    const message =
      error instanceof Error ? error.message : String(error);

    console.error(message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (prismaClient) {
      await prismaClient.$disconnect();
    }
  });
