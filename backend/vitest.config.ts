import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    root: '.',
    include: ['tests/**/*.test.ts'],
    exclude: [
      '**/node_modules/**',
      // Jest-based tests (import @jest/globals) — not yet migrated
      'tests/auth-rate-limit.test.ts',
      'tests/driver-governance.test.ts',
      'tests/ride-status-atomic.test.ts',
      'tests/community-activation.test.ts',
    ],
    testTimeout: 10000,
  },
});
