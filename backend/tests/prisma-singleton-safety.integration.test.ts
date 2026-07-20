import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Integration test: confirms that the Prisma singleton (prisma.ts) fails before
 * any PrismaClient connection attempt when DATABASE_URL points to a remote host
 * in a test environment.
 *
 * How it works:
 *   prisma.ts calls assertSafeTestDatabaseUrl() synchronously at module scope,
 *   BEFORE `new PrismaClient()`. If the guard throws, PrismaClient is never
 *   instantiated and no TCP connection is opened.
 *
 * This test uses vi.resetModules() to force re-evaluation of prisma.ts, and
 * dynamic import to observe whether the module throws during load.
 * No TCP connection is started at any point.
 */
describe('Prisma singleton safety — guard fires before PrismaClient', () => {
  const savedUrl = process.env.DATABASE_URL;

  afterEach(() => {
    vi.resetModules();
    if (savedUrl !== undefined) {
      process.env.DATABASE_URL = savedUrl;
    } else {
      delete process.env.DATABASE_URL;
    }
  });

  it('rejects with [kaviar-safety] when DATABASE_URL is a remote RDS host (no TCP attempted)', async () => {
    process.env.DATABASE_URL =
      'postgresql://dbuser:secret@kaviar-prod.cluster-xyz.us-east-1.rds.amazonaws.com:5432/kaviardb';

    vi.resetModules();

    // Dynamically importing prisma.ts triggers its module-level guard.
    // The guard throws before `new PrismaClient()` is reached.
    // No TCP connection is ever initiated.
    await expect(import('../src/lib/prisma')).rejects.toThrow('[kaviar-safety]');
  });

  it('rejects with [kaviar-safety] when DATABASE_URL is undefined', async () => {
    delete process.env.DATABASE_URL;

    vi.resetModules();

    await expect(import('../src/lib/prisma')).rejects.toThrow('[kaviar-safety]');
  });

  it('error message from prisma.ts load does not contain credentials', async () => {
    const password = 'top-secret-rds-password';
    process.env.DATABASE_URL = `postgresql://admin:${password}@prod.rds.amazonaws.com:5432/db`;

    vi.resetModules();

    let caughtError: Error | null = null;
    try {
      await import('../src/lib/prisma');
    } catch (e) {
      caughtError = e as Error;
    }

    expect(caughtError).not.toBeNull();
    expect(caughtError!.message).toContain('[kaviar-safety]');
    expect(caughtError!.message).not.toContain(password);
    expect(caughtError!.message).toContain('prod.rds.amazonaws.com');
  });
});
