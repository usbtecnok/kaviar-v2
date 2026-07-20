import { describe, it } from 'vitest';
import { PrismaClient } from '@prisma/client';

// This line runs at module scope — before any test is collected.
// If setupFiles fires first and throws, this marker is never written.
process.stdout.write('[FIXTURE_MODULE_EVALUATED]\n');

new PrismaClient();

describe('direct-prisma-client fixture', () => {
  it('should never be reached when setupFiles blocks', () => {
    // Intentionally empty — this test is never collected if setupFiles throws.
  });
});
