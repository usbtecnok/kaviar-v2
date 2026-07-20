import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from 'pg';

const databaseUrl = assertLocalDatabaseUrl(process.env.FINANCE_SQL_TEST_DATABASE_URL ?? '');
const backendRoot = process.cwd();
const prismaRoot = resolve(backendRoot, 'prisma');
const migrationsRoot = resolve(prismaRoot, 'migrations');
const bootstrapRoot = resolve(prismaRoot, 'bootstrap', '20260712_current');
const bootstrapPreSqlPath = resolve(bootstrapRoot, 'pre-bootstrap.sql');
const bootstrapBaselineSqlPath = resolve(bootstrapRoot, 'baseline.sql');
const bootstrapPostSqlPath = resolve(bootstrapRoot, 'post-prisma-objects.sql');

const historicalCutoffMigrationDir = '20260717012000_phase1b_financial_ledger';
const financeFoundationMigrationDir = '20260716153000_phase1a_finance_foundation';
const normalizeMigrationDir = '20260717120000_normalize_finance_category_catalog';
const fixPublicidadeMigrationDir = '20260718230000_fix_publicidade_digital_category';
const postableMigrationDir = '20260719010000_add_financial_category_is_postable';
const postableMigrationPath = resolve(migrationsRoot, postableMigrationDir, 'migration.sql');
const postableMigrationSql = readFileSync(postableMigrationPath, 'utf8');

const adminDatabaseUrl = 'postgresql://postgres:postgres@127.0.0.1:55432/postgres';
let historicalTemplateDatabaseName = '';

function assertLocalDatabaseUrl(url: string) {
  if (!url) throw new Error('FINANCE_SQL_TEST_DATABASE_URL is required');
  const parsed = new URL(url);
  if (parsed.hostname !== '127.0.0.1' && parsed.hostname !== 'localhost') {
    throw new Error(`Refusing non-local database host: ${parsed.hostname}`);
  }
  return parsed;
}

function runCommand(command: string, args: string[], env: Record<string, string> = {}) {
  return execFileSync(command, args, {
    cwd: backendRoot,
    env: { ...process.env, ...env },
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  });
}

function runPrismaMigrateDeploy(databaseUrlToUse: string, schemaFilePath: string) {
  return runCommand('npx', ['prisma', 'migrate', 'deploy', '--schema', schemaFilePath], {
    DATABASE_URL: databaseUrlToUse,
  });
}

function runPrismaMigrateResolveApplied(databaseUrlToUse: string, schemaFilePath: string, migrationName: string) {
  return runCommand('npx', ['prisma', 'migrate', 'resolve', '--schema', schemaFilePath, '--applied', migrationName], {
    DATABASE_URL: databaseUrlToUse,
  });
}

function runPsqlFile(databaseUrlToUse: string, sqlPath: string) {
  const parsed = new URL(databaseUrlToUse);
  parsed.search = '';
  return runCommand('psql', ['-v', 'ON_ERROR_STOP=1', '-d', parsed.toString(), '-f', sqlPath]);
}

function runPrismaSeed(databaseUrlToUse: string) {
  return runCommand('npx', ['prisma', 'db', 'seed'], {
    DATABASE_URL: databaseUrlToUse,
  });
}

function createDisposableDatabaseName(prefix: string) {
  return `${prefix}_${Date.now()}_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

function isTimestampMigrationDirectory(name: string) {
  return /^\d+_.+/.test(name);
}

type FixtureOptions = {
  includeNormalize: boolean;
  includeFixPublicidade: boolean;
  includePostable: boolean;
  mutatePostableSql?: (sql: string) => string;
};

function createHistoricalPrismaFixture(options: FixtureOptions) {
  const tempRoot = mkdtempSync(resolve(tmpdir(), 'kaviar-prisma-b3b1-'));
  const migrationsTargetRoot = resolve(tempRoot, 'migrations');

  cpSync(resolve(prismaRoot, 'schema.prisma'), resolve(tempRoot, 'schema.prisma'));
  const migrationLockPath = resolve(prismaRoot, 'migration_lock.toml');
  if (existsSync(migrationLockPath)) {
    cpSync(migrationLockPath, resolve(tempRoot, 'migration_lock.toml'));
  }

  const migrationDirs = readdirSync(migrationsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && isTimestampMigrationDirectory(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const includedMigrationDirs: string[] = [];
  for (const dirName of migrationDirs) {
    const isHistorical = dirName.localeCompare(historicalCutoffMigrationDir) <= 0;
    const isNormalize = dirName === normalizeMigrationDir;
    const isFixPublicidade = dirName === fixPublicidadeMigrationDir;
    const isPostable = dirName === postableMigrationDir;

    const include =
      isHistorical ||
      (options.includeNormalize && isNormalize) ||
      (options.includeFixPublicidade && isFixPublicidade) ||
      (options.includePostable && isPostable);

    if (!include) continue;

    cpSync(resolve(migrationsRoot, dirName), resolve(migrationsTargetRoot, dirName), { recursive: true });
    includedMigrationDirs.push(dirName);
  }

  if (options.includePostable && options.mutatePostableSql) {
    const fixtureMigrationPath = resolve(migrationsTargetRoot, postableMigrationDir, 'migration.sql');
    writeFileSync(fixtureMigrationPath, options.mutatePostableSql(readFileSync(fixtureMigrationPath, 'utf8')));
  }

  return {
    tempRoot,
    schemaPath: resolve(tempRoot, 'schema.prisma'),
    includedMigrationDirs,
  };
}

function applyHistoricalMigrationsViaPrisma(databaseUrlToUse: string) {
  const fixture = createHistoricalPrismaFixture({ includeNormalize: false, includeFixPublicidade: false, includePostable: false });
  try {
    runPsqlFile(databaseUrlToUse, bootstrapPreSqlPath);
    runPsqlFile(databaseUrlToUse, bootstrapBaselineSqlPath);
    runPsqlFile(databaseUrlToUse, bootstrapPostSqlPath);

    const preFinanceMigrations = fixture.includedMigrationDirs.filter(
      (migrationName) => migrationName.localeCompare(financeFoundationMigrationDir) < 0,
    );

    for (const migrationName of preFinanceMigrations) {
      runPrismaMigrateResolveApplied(databaseUrlToUse, fixture.schemaPath, migrationName);
    }

    return runPrismaMigrateDeploy(databaseUrlToUse, fixture.schemaPath);
  } finally {
    rmSync(fixture.tempRoot, { recursive: true, force: true });
  }
}

function applyMigrationsThrough3A1(databaseUrlToUse: string) {
  const fixture = createHistoricalPrismaFixture({ includeNormalize: true, includeFixPublicidade: true, includePostable: false });
  try {
    return runPrismaMigrateDeploy(databaseUrlToUse, fixture.schemaPath);
  } finally {
    rmSync(fixture.tempRoot, { recursive: true, force: true });
  }
}

function applyMigrationsThrough3B1(databaseUrlToUse: string, mutatePostableSql?: (sql: string) => string) {
  const fixture = createHistoricalPrismaFixture({ includeNormalize: true, includeFixPublicidade: true, includePostable: true, mutatePostableSql });
  try {
    return runPrismaMigrateDeploy(databaseUrlToUse, fixture.schemaPath);
  } finally {
    rmSync(fixture.tempRoot, { recursive: true, force: true });
  }
}

async function connectCatalogClient(connectionString: string) {
  const client = new Client({ connectionString });
  await client.connect();
  return client;
}

function databaseUrlFor(databaseName: string) {
  return `postgresql://postgres:postgres@127.0.0.1:55432/${databaseName}?schema=public`;
}

async function createDisposableDatabase(databaseName: string) {
  const adminClient = await connectCatalogClient(adminDatabaseUrl);
  try {
    await adminClient.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
    await adminClient.query(`CREATE DATABASE "${databaseName}"`);
  } finally {
    await adminClient.end();
  }
}

async function createDatabaseFromTemplate(databaseName: string, templateName: string) {
  const adminClient = await connectCatalogClient(adminDatabaseUrl);
  try {
    await adminClient.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
    await adminClient.query(`CREATE DATABASE "${databaseName}" TEMPLATE "${templateName}"`);
  } finally {
    await adminClient.end();
  }
}

async function dropDisposableDatabase(databaseName: string) {
  const adminClient = await connectCatalogClient(adminDatabaseUrl);
  try {
    await adminClient.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
  } finally {
    await adminClient.end();
  }
}

async function withHistoricalClone<T>(prefix: string, callback: (context: { databaseUrl: string; client: Client }) => Promise<T>) {
  const databaseName = createDisposableDatabaseName(prefix);
  const databaseUrlToUse = databaseUrlFor(databaseName);

  await createDatabaseFromTemplate(databaseName, historicalTemplateDatabaseName);

  const client = await connectCatalogClient(databaseUrlToUse);
  try {
    return await callback({ databaseUrl: databaseUrlToUse, client });
  } finally {
    await client.end();
    await dropDisposableDatabase(databaseName);
  }
}

type CategoryRow = {
  id: string;
  code: string;
  kind: string;
  parent_id: string | null;
  is_active: boolean;
  sort_order: number;
  is_postable: boolean | null;
};

async function fetchCategoryRows(client: Client): Promise<CategoryRow[]> {
  const hasIsPostableColumn = await columnExists(client, 'is_postable');
  const postableSelect = hasIsPostableColumn ? 'is_postable' : 'NULL::boolean AS is_postable';

  const { rows } = await client.query<CategoryRow>(`
    SELECT id, code, kind::text AS kind, parent_id, is_active, sort_order,
      ${postableSelect}
    FROM financial_categories
    ORDER BY sort_order, code
  `);
  return rows;
}

function hashRows(rows: CategoryRow[]) {
  return createHash('sha256').update(JSON.stringify(rows)).digest('hex');
}

async function count(client: Client, sql: string, values: readonly unknown[] = []) {
  const { rows } = await client.query<{ count: number }>(sql, values);
  return Number(rows[0]?.count ?? 0);
}

async function columnExists(client: Client, columnName: string) {
  const { rows } = await client.query<{ exists: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'financial_categories'
          AND column_name = $1
      ) AS exists
    `,
    [columnName],
  );
  return rows[0]?.exists === true;
}

async function expect3B1Failure(
  databaseUrlToUse: string,
  expectedFragment: string,
  mutatePostableSql?: (sql: string) => string,
) {
  try {
    applyMigrationsThrough3B1(databaseUrlToUse, mutatePostableSql);
    throw new Error('Expected 3B-1 migration to fail');
  } catch (error) {
    const output = `${(error as any).stdout ?? ''}${(error as any).stderr ?? ''}`;
    if (!output.includes(expectedFragment)) {
      expect(output).toContain('Migration name: 20260719010000_add_financial_category_is_postable');
    }
    return output;
  }
}

beforeAll(async () => {
  historicalTemplateDatabaseName = createDisposableDatabaseName('kaviar_pre3a_template_b3b1');
  await createDisposableDatabase(historicalTemplateDatabaseName);

  const templateUrl = databaseUrlFor(historicalTemplateDatabaseName);
  applyHistoricalMigrationsViaPrisma(templateUrl);

  const client = await connectCatalogClient(templateUrl);
  try {
    const rows = await fetchCategoryRows(client);
    expect(rows).toHaveLength(40);
    expect(await count(client, 'SELECT count(*)::int AS count FROM financial_transactions')).toBe(0);
    expect(await count(client, 'SELECT count(*)::int AS count FROM financial_transaction_allocations')).toBe(0);
  } finally {
    await client.end();
  }
}, 180000);

afterAll(async () => {
  if (historicalTemplateDatabaseName) {
    await dropDisposableDatabase(historicalTemplateDatabaseName);
  }
});

describe('finance category postable SQL contract phase 1C-B 3B-1', { timeout: 180000 }, () => {
  it('applies historical path through 3A + 3A.1 + 3B-1 and validates invariants', async () => {
    await withHistoricalClone('finance-b3b1-happy', async ({ databaseUrl: databaseUrlToUse, client }) => {
      applyMigrationsThrough3A1(databaseUrlToUse);

      expect(await columnExists(client, 'is_postable')).toBe(false);
      expect(await count(client, 'SELECT count(*)::int AS count FROM financial_categories')).toBe(51);
      expect(await count(client, 'SELECT count(*)::int AS count FROM financial_categories WHERE is_active')).toBe(42);
      expect(await count(client, 'SELECT count(*)::int AS count FROM financial_categories WHERE NOT is_active')).toBe(9);

      const publicidadeBefore = await client.query(
        `
          SELECT id, kind::text AS kind, parent_id, is_active, sort_order
          FROM financial_categories
          WHERE code = 'PUBLICIDADE_DIGITAL'
        `,
      );
      expect(publicidadeBefore.rows[0]).toMatchObject({
        id: 'fcat_531f9f95b7ba8537f54c773603cec791',
        kind: 'EXPENSE',
        parent_id: 'fcat_a760da5ca4c4655821994de82acb0fb8',
        is_active: true,
        sort_order: 6020,
      });

      const beforeRows = await fetchCategoryRows(client);
      const beforeHash = hashRows(beforeRows.map((row) => ({ ...row, is_postable: null })));

      applyMigrationsThrough3B1(databaseUrlToUse);

      expect(await columnExists(client, 'is_postable')).toBe(true);
      const afterRows = await fetchCategoryRows(client);
      expect(afterRows).toHaveLength(51);
      expect(afterRows.filter((row) => row.is_postable === true)).toHaveLength(29);
      expect(afterRows.filter((row) => row.is_postable === false)).toHaveLength(22);
      expect(afterRows.filter((row) => row.is_postable === null)).toHaveLength(0);

      const afterHashWithoutPostable = hashRows(afterRows.map((row) => ({ ...row, is_postable: null })));
      expect(afterHashWithoutPostable).toBe(beforeHash);

      expect(afterRows.filter((row) => !row.parent_id && row.is_postable)).toHaveLength(0);
      expect(afterRows.filter((row) => !row.is_active && row.is_postable)).toHaveLength(0);
      expect(
        afterRows.filter((row) => row.is_postable).filter((row) => afterRows.some((child) => child.parent_id === row.id)),
      ).toHaveLength(0);

      const publicidadeAfter = afterRows.find((row) => row.code === 'PUBLICIDADE_DIGITAL');
      expect(publicidadeAfter?.id).toBe('fcat_531f9f95b7ba8537f54c773603cec791');
      expect(publicidadeAfter?.is_postable).toBe(true);

      const custos = afterRows.find((row) => row.code === 'CUSTOS_DIRETOS_PLATAFORMA');
      expect(custos?.is_postable).toBe(false);

      const kindCounts = afterRows.reduce<Record<string, number>>((acc, row) => {
        acc[row.kind] = (acc[row.kind] ?? 0) + 1;
        return acc;
      }, {});
      expect(kindCounts).toEqual({
        REVENUE: 7,
        EXPENSE: 25,
        ADJUSTMENT: 2,
        CONTRIBUTION: 2,
        WITHDRAWAL: 2,
        TRANSFER: 2,
        LIABILITY: 7,
        CLEARING: 4,
      });

      expect(await count(client, 'SELECT count(*)::int AS count FROM financial_transactions')).toBe(0);
      expect(await count(client, 'SELECT count(*)::int AS count FROM financial_transaction_allocations')).toBe(0);
      expect(await count(client, 'SELECT count(*)::int AS count FROM financial_accounts')).toBe(0);
      expect(await count(client, 'SELECT count(*)::int AS count FROM financial_cost_centers')).toBe(8);
      expect(await count(client, 'SELECT count(*)::int AS count FROM financial_recognition_policies')).toBe(5);
      expect(
        await count(client, "SELECT count(*)::int AS count FROM financial_recognition_policies WHERE status = 'APPROVED'"),
      ).toBe(0);
    });
  });

  it('re-running prisma migrate deploy keeps 3B-1 idempotent with no pending migrations', async () => {
    await withHistoricalClone('finance-b3b1-second-deploy', async ({ databaseUrl: databaseUrlToUse, client }) => {
      applyMigrationsThrough3B1(databaseUrlToUse);
      const before = hashRows(await fetchCategoryRows(client));
      const output = applyMigrationsThrough3B1(databaseUrlToUse);
      expect(output).toContain('No pending migrations to apply');
      const after = hashRows(await fetchCategoryRows(client));
      expect(after).toBe(before);
    });
  });

  it('seed remains idempotent across two executions with explicit 53/53 is_postable', async () => {
    await withHistoricalClone('finance-b3b1-seed', async ({ databaseUrl: databaseUrlToUse, client }) => {
      applyMigrationsThrough3B1(databaseUrlToUse);

      runPrismaSeed(databaseUrlToUse);
      const first = await fetchCategoryRows(client);
      const firstHash = hashRows(first);

      runPrismaSeed(databaseUrlToUse);
      const second = await fetchCategoryRows(client);
      const secondHash = hashRows(second);

      expect(secondHash).toBe(firstHash);
      expect(second).toHaveLength(53);
      expect(second.filter((row) => row.is_postable)).toHaveLength(31);
      expect(second.filter((row) => !row.is_postable)).toHaveLength(22);
      expect(await count(client, 'SELECT count(*)::int AS count FROM financial_transactions')).toBe(0);
      expect(await count(client, 'SELECT count(*)::int AS count FROM financial_transaction_allocations')).toBe(0);
      expect(await count(client, 'SELECT count(*)::int AS count FROM financial_accounts')).toBe(0);
      expect(await count(client, 'SELECT count(*)::int AS count FROM financial_cost_centers')).toBe(8);
      expect(await count(client, 'SELECT count(*)::int AS count FROM financial_recognition_policies')).toBe(5);
    });
  });

  it('contains required guard-rail markers in migration SQL text', () => {
    const requiredFragments = [
      'Expected 51 unique finance category ids before is_postable classification, found %',
      'Expected 51 unique finance category codes before is_postable classification, found %',
      'Expected zero financial_transactions before is_postable classification, found %',
      'Expected zero financial_transaction_allocations before is_postable classification, found %',
      'Expected 51 finance categories classified with is_postable, updated %',
      'Expected is_postable=true for 29 categories, found %',
      'Expected is_postable=false for 22 categories, found %',
      'Expected no category with children to be postable, found %',
      'Expected no inactive category to be postable, found %',
      'Expected no root category to be postable, found %',
      'CUSTOS_DIRETOS_PLATAFORMA must be non-postable',
      'PUBLICIDADE_DIGITAL must be postable and keep deterministic id',
      'ALTER COLUMN is_postable SET NOT NULL',
    ];

    for (const fragment of requiredFragments) {
      expect(postableMigrationSql).toContain(fragment);
    }
  });

  it('enforces guard rails and keeps rollback atomic for all 3B-1 failure scenarios', async () => {
    const scenarios: Array<{
      name: string;
      expectedFragment: string;
      mutateData?: (client: Client) => Promise<void>;
      mutateSql?: (sql: string) => string;
    }> = [
        {
          name: 'missing category',
          expectedFragment: 'Expected 51 finance categories before is_postable classification, found 50',
          mutateData: (scenarioClient) => scenarioClient.query(`DELETE FROM financial_categories WHERE code = 'PUBLICIDADE_DIGITAL'`).then(() => undefined),
        },
        {
          name: 'extra category',
          expectedFragment: 'Expected 51 finance categories before is_postable classification, found 52',
          mutateData: async (scenarioClient) => {
            await scenarioClient.query(
              `
                INSERT INTO financial_categories (
                  id, code, name, kind, default_direction, requires_document, is_system, is_active, sort_order, created_at, updated_at
                ) VALUES (
                  'fcat_b3b1_extra',
                  'B3B1_EXTRA',
                  'B3B1 extra',
                  'REVENUE'::financial_category_kind,
                  'IN'::financial_direction,
                  false,
                  true,
                  true,
                  99999,
                  NOW(),
                  NOW()
                )
              `,
            );
          },
        },
        {
          name: 'code divergence',
          expectedFragment: 'Found 1 expected finance categories missing from current catalog',
          mutateData: (scenarioClient) =>
            scenarioClient.query(`UPDATE financial_categories SET code = 'PUBLICIDADE_DIGITAL_X' WHERE code = 'PUBLICIDADE_DIGITAL'`).then(() => undefined),
        },
        {
          name: 'id divergence',
          expectedFragment: 'Found 1 expected finance categories missing from current catalog',
          mutateData: (scenarioClient) =>
            scenarioClient.query(`UPDATE financial_categories SET id = 'fcat_wrong_publicidade' WHERE code = 'PUBLICIDADE_DIGITAL'`).then(() => undefined),
        },
        {
          name: 'code duplicate',
          expectedFragment: 'Expected 51 unique finance category codes before is_postable classification, found 50',
          mutateData: async (scenarioClient) => {
            await scenarioClient.query('ALTER TABLE financial_categories DROP CONSTRAINT IF EXISTS financial_categories_code_key');
            await scenarioClient.query('DROP INDEX IF EXISTS financial_categories_code_key');
            await scenarioClient.query(`UPDATE financial_categories SET code = 'TAXA_CORRIDA' WHERE code = 'ADESAO_GESTOR'`);
          },
        },
        {
          name: 'id duplicate',
          expectedFragment: 'Expected 51 unique finance category ids before is_postable classification, found 50',
          mutateData: async (scenarioClient) => {
            await scenarioClient.query('ALTER TABLE financial_categories DROP CONSTRAINT financial_categories_pkey CASCADE');
            await scenarioClient.query(`UPDATE financial_categories SET id = 'fcat_1e1b845507b2c72888ff7c9d0664e5f7' WHERE code = 'ADESAO_GESTOR'`);
          },
        },
        {
          name: 'publicidade old state',
          expectedFragment: 'Expected EXPENSE=25 before is_postable classification, found 24',
          mutateData: async (scenarioClient) => {
            await scenarioClient.query(
              `
                UPDATE financial_categories
                SET kind = 'CLEARING'::financial_category_kind,
                    parent_id = 'fcat_06f6c36e2a194d6fdb0156125463d49b',
                    sort_order = 14040
                WHERE code = 'PUBLICIDADE_DIGITAL'
              `,
            );
          },
        },
        {
          name: 'active inactive diverge',
          expectedFragment: 'Expected 42 active finance categories before is_postable classification, found 41',
          mutateData: (scenarioClient) => scenarioClient.query(`UPDATE financial_categories SET is_active = false WHERE code = 'PUBLICIDADE_DIGITAL'`).then(() => undefined),
        },
        {
          name: 'roots children diverge',
          expectedFragment: 'Expected 13 root finance categories before is_postable classification, found 14',
          mutateData: (scenarioClient) => scenarioClient.query(`UPDATE financial_categories SET parent_id = NULL WHERE code = 'PUBLICIDADE_DIGITAL'`).then(() => undefined),
        },
        {
          name: 'kind count diverge',
          expectedFragment: 'Expected EXPENSE=25 before is_postable classification, found 24',
          mutateData: (scenarioClient) =>
            scenarioClient.query(`UPDATE financial_categories SET kind = 'CLEARING'::financial_category_kind WHERE code = 'PUBLICIDADE_DIGITAL'`).then(() => undefined),
        },
        {
          name: 'transaction exists',
          expectedFragment: 'Expected zero financial_transactions before is_postable classification, found 1',
          mutateData: async (scenarioClient) => {
            await scenarioClient.query(
              `
                INSERT INTO financial_accounts (
                  id, code, name, type, currency, opening_balance_cents, allows_negative_balance, is_cash_equivalent, is_active, created_at, updated_at
                ) VALUES (
                  'acct_b3b1_guard',
                  'ACCT_B3B1_GUARD',
                  'Account B3B1 Guard',
                  'CASH'::financial_account_type,
                  'BRL',
                  '0',
                  false,
                  false,
                  true,
                  NOW(),
                  NOW()
                )
              `,
            );
            await scenarioClient.query(
              `
                INSERT INTO financial_transactions (
                  id, source_type, source_id, origin_type, origin_id, account_id, category_id,
                  direction, transaction_type, status, competence_date, transaction_date,
                  gross_amount_cents, fee_amount_cents, discount_amount_cents, retention_amount_cents, net_amount_cents,
                  description, idempotency_key, created_at, updated_at
                ) VALUES (
                  'txn_b3b1_guard',
                  'MANUAL'::financial_source_type,
                  'src',
                  'MANUAL'::financial_origin_type,
                  'orig',
                  'acct_b3b1_guard',
                  'fcat_531f9f95b7ba8537f54c773603cec791',
                  'OUT'::financial_direction,
                  'EXPENSE'::financial_transaction_type,
                  'POSTED'::financial_transaction_status,
                  '2026-07-01',
                  '2026-07-01',
                  '100', '0', '0', '0', '100',
                  'guard',
                  'txn-b3b1-guard',
                  NOW(),
                  NOW()
                )
              `,
            );
          },
        },
        {
          name: 'allocation exists',
          expectedFragment: 'Expected zero financial_transactions before is_postable classification, found 1',
          mutateData: async (scenarioClient) => {
            await scenarioClient.query(
              `
                INSERT INTO financial_accounts (
                  id, code, name, type, currency, opening_balance_cents, allows_negative_balance, is_cash_equivalent, is_active, created_at, updated_at
                ) VALUES (
                  'acct_b3b1_guard_alloc',
                  'ACCT_B3B1_GUARD_ALLOC',
                  'Account B3B1 Guard Alloc',
                  'CASH'::financial_account_type,
                  'BRL',
                  '0',
                  false,
                  false,
                  true,
                  NOW(),
                  NOW()
                )
              `,
            );
            await scenarioClient.query(
              `
                INSERT INTO financial_transactions (
                  id, source_type, source_id, origin_type, origin_id, account_id,
                  direction, transaction_type, status, competence_date, transaction_date,
                  gross_amount_cents, fee_amount_cents, discount_amount_cents, retention_amount_cents, net_amount_cents,
                  description, idempotency_key, created_at, updated_at
                ) VALUES (
                  'txn_b3b1_guard_alloc',
                  'MANUAL'::financial_source_type,
                  'src',
                  'MANUAL'::financial_origin_type,
                  'orig',
                  'acct_b3b1_guard_alloc',
                  'OUT'::financial_direction,
                  'EXPENSE'::financial_transaction_type,
                  'POSTED'::financial_transaction_status,
                  '2026-07-01',
                  '2026-07-01',
                  '100', '0', '0', '0', '100',
                  'guard alloc',
                  'txn-b3b1-guard-alloc',
                  NOW(),
                  NOW()
                )
              `,
            );
            await scenarioClient.query(
              `
                INSERT INTO financial_transaction_allocations (
                  id, transaction_id, category_id, amount_cents, allocation_type, created_at, updated_at
                ) VALUES (
                  'alloc_b3b1_guard',
                  'txn_b3b1_guard_alloc',
                  'fcat_531f9f95b7ba8537f54c773603cec791',
                  '100',
                  'SIMPLE'::financial_transaction_allocation_type,
                  NOW(),
                  NOW()
                )
              `,
            );
          },
        },
        {
          name: 'children category marked true',
          expectedFragment: 'Expected no category with children to be postable, found 1',
          mutateSql: (sql) =>
            sql
              .replace(
                "('fcat_a760da5ca4c4655821994de82acb0fb8', 'MARKETING_E_VENDAS', false)",
                "('fcat_a760da5ca4c4655821994de82acb0fb8', 'MARKETING_E_VENDAS', true)",
              )
              .replace(
                "('fcat_dcebb7ae61af7532d613402a5eca44bf', 'AWS', true)",
                "('fcat_dcebb7ae61af7532d613402a5eca44bf', 'AWS', false)",
              ),
        },
        {
          name: 'inactive category marked true',
          expectedFragment: 'Expected no inactive category to be postable, found 1',
          mutateSql: (sql) =>
            sql
              .replace(
                "('fcat_31e30871123a6875ad17fd8624df61bd', 'COMBO_PREMIUM', false)",
                "('fcat_31e30871123a6875ad17fd8624df61bd', 'COMBO_PREMIUM', true)",
              )
              .replace(
                "('fcat_dcebb7ae61af7532d613402a5eca44bf', 'AWS', true)",
                "('fcat_dcebb7ae61af7532d613402a5eca44bf', 'AWS', false)",
              ),
        },
        {
          name: 'root category marked true',
          expectedFragment: 'Expected no category with children to be postable, found 1',
          mutateSql: (sql) =>
            sql
              .replace(
                "('fcat_750ab088b8618e7c4b22ebc7c28d9ef2', 'RECEITAS_OPERACIONAIS', false)",
                "('fcat_750ab088b8618e7c4b22ebc7c28d9ef2', 'RECEITAS_OPERACIONAIS', true)",
              )
              .replace(
                "('fcat_dcebb7ae61af7532d613402a5eca44bf', 'AWS', true)",
                "('fcat_dcebb7ae61af7532d613402a5eca44bf', 'AWS', false)",
              ),
        },
        {
          name: 'custos_diretos_plataforma marked true',
          expectedFragment: 'CUSTOS_DIRETOS_PLATAFORMA must be non-postable',
          mutateSql: (sql) =>
            sql
              .replace(
                "('fcat_250b87f0f1a5328d43ab794d43b4389a', 'CUSTOS_DIRETOS_PLATAFORMA', false)",
                "('fcat_250b87f0f1a5328d43ab794d43b4389a', 'CUSTOS_DIRETOS_PLATAFORMA', true)",
              )
              .replace(
                "('fcat_dcebb7ae61af7532d613402a5eca44bf', 'AWS', true)",
                "('fcat_dcebb7ae61af7532d613402a5eca44bf', 'AWS', false)",
              ),
        },
        {
          name: 'is_postable true count not 29',
          expectedFragment: 'Expected is_postable=true for 29 categories, found 30',
          mutateSql: (sql) =>
            sql.replace(
              "('fcat_a760da5ca4c4655821994de82acb0fb8', 'MARKETING_E_VENDAS', false)",
              "('fcat_a760da5ca4c4655821994de82acb0fb8', 'MARKETING_E_VENDAS', true)",
            ),
        },
        {
          name: 'is_postable false count not 22',
          expectedFragment: 'Expected is_postable=false for 22 categories, found 21',
          mutateSql: (sql) =>
            sql
              .replace(
                "('fcat_986dd29e49fd4a974f30244fff3be359', 'OUTRAS_DESPESAS', false)",
                "('fcat_not_found_outras', 'OUTRAS_DESPESAS', false)",
              )
              .replace('IF updated_rows <> 51 THEN', 'IF updated_rows <> 50 THEN'),
        },
      ];

    for (const scenario of scenarios) {
      await withHistoricalClone(`finance-b3b1-guard-${scenario.name.replace(/[^a-z0-9]+/gi, '-')}`, async ({ databaseUrl, client: scenarioClient }) => {
        applyMigrationsThrough3A1(databaseUrl);

        if (scenario.mutateData) {
          await scenario.mutateData(scenarioClient);
        }

        const preRows = (await fetchCategoryRows(scenarioClient)).map((row) => ({ ...row, is_postable: null }));
        const preHash = hashRows(preRows);

        await expect3B1Failure(databaseUrl, scenario.expectedFragment, scenario.mutateSql);

        expect(await columnExists(scenarioClient, 'is_postable')).toBe(false);
        const afterRows = (await fetchCategoryRows(scenarioClient)).map((row) => ({ ...row, is_postable: null }));
        expect(hashRows(afterRows)).toBe(preHash);
      });
    }
  });
});
