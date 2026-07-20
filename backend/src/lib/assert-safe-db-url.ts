export const SAFE_DB_URL_LOCAL_ALLOWLIST: readonly string[] = [
  '127.0.0.1',
  'localhost',
  '[::1]', // new URL().hostname returns '[::1]' with brackets for IPv6 literals
];

export type SafeDbUrlEnv = {
  nodeEnv?: string;
  vitest?: string;
};

/**
 * Throws if DATABASE_URL points to a non-local host while running in a test
 * environment (NODE_ENV==='test' or process.env.VITEST is set).
 *
 * Called at module scope in prisma.ts, before new PrismaClient() is created.
 * Only the hostname is included in error messages — credentials are never exposed.
 */
export function assertSafeTestDatabaseUrl(
  databaseUrl: string | undefined,
  env: SafeDbUrlEnv,
): void {
  // Boolean("false") === true, so we compare explicitly
  const isVitest = env.vitest === 'true' || env.vitest === '1';
  const isTestEnv = env.nodeEnv === 'test' || isVitest;
  if (!isTestEnv) return;

  if (!databaseUrl) {
    throw new Error(
      '[kaviar-safety] DATABASE_URL must be explicitly set to a local database URL ' +
        'before running tests. ' +
        'Example: DATABASE_URL=postgresql://user:pass@127.0.0.1:PORT/db',
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error(
      '[kaviar-safety] DATABASE_URL is not a valid URL. ' +
        'Cannot proceed in test environment.',
    );
  }

  const hostname = parsed.hostname;

  if ((SAFE_DB_URL_LOCAL_ALLOWLIST as string[]).includes(hostname)) {
    return;
  }

  throw new Error(
    `[kaviar-safety] Unsafe DATABASE_URL hostname "${hostname}" in test environment. ` +
      `Allowed hosts: ${SAFE_DB_URL_LOCAL_ALLOWLIST.join(', ')}. ` +
      `Set DATABASE_URL to a local database before running tests.`,
  );
}
