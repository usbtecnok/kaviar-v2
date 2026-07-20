import { defineConfig } from 'vitest/config';

// Minimal config used only by the subprocess in setup-guard-direct-prisma.integration.test.ts.
// Includes the fixture directly and re-applies the same setupFiles as the main config.
export default defineConfig({
  test: {
    include: ['tests/fixtures/direct-prisma-client.fixture.ts'],
    setupFiles: ['./tests/setup/assert-safe-test-database.ts'],
    testTimeout: 10000,
    env: {
      NODE_ENV: 'test',
    },
  },
});
