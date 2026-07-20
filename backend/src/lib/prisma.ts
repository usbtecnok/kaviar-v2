import { PrismaClient } from '@prisma/client';
import { assertSafeTestDatabaseUrl } from './assert-safe-db-url';

assertSafeTestDatabaseUrl(process.env.DATABASE_URL, {
  nodeEnv: process.env.NODE_ENV,
  vitest: process.env.VITEST,
});

const globalForPrisma = global as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
