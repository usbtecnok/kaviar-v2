import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    root: '.',
    include: ['tests/routes-auth-guard.test.ts'],
    testTimeout: 10000,
  },
});
