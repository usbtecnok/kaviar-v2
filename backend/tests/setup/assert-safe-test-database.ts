import { assertSafeTestDatabaseUrl } from '../../src/lib/assert-safe-db-url';

// Runs before every test module in Vitest (configured via setupFiles in vitest.config.ts).
// Validates DATABASE_URL before any test code executes — including tests that
// instantiate PrismaClient directly without going through the singleton.
assertSafeTestDatabaseUrl(process.env.DATABASE_URL, {
  nodeEnv: process.env.NODE_ENV,
  vitest: process.env.VITEST,
});
