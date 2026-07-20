import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { cpSync, existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from 'pg';

assertLocalDatabaseUrl(process.env.FINANCE_SQL_TEST_DATABASE_URL ?? '');
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
const bonusMunicipalMigrationDir = '20260720010000_add_financial_bonus_and_municipal_fee_categories';

const BONUS_ID = 'fcat_fb31c48ce603495524e0afcb71625353';
const BONUS_CODE = 'BONUS_ANUAL_MOTORISTAS_A_PAGAR';
const MUNICIPAL_ID = 'fcat_cd17b84eaa92c309e549b872b98146ac';
const MUNICIPAL_CODE = 'TAXAS_MUNICIPAIS_SOBRE_CORRIDAS';
const OBRIGACOES_ID = 'fcat_4c30cc6b6dd82c489d5748dd50e2dbf9';
const OPERACOES_ID = 'fcat_95cbbd9bad2fbecfce1f9c76829bd191';

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
  includeCatalogMigrations: boolean;
  includeBonusMunicipal: boolean;
};

function createPrismaFixture(options: FixtureOptions) {
  const tempRoot = mkdtempSync(resolve(tmpdir(), 'kaviar-prisma-b3b11-'));
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

  const catalogMigrationDirs = new Set([normalizeMigrationDir, fixPublicidadeMigrationDir, postableMigrationDir]);

  const includedMigrationDirs: string[] = [];
  for (const dirName of migrationDirs) {
    const isHistorical = dirName.localeCompare(historicalCutoffMigrationDir) <= 0;
    const isCatalog = catalogMigrationDirs.has(dirName);
    const isBonusMunicipal = dirName === bonusMunicipalMigrationDir;

    const include =
      isHistorical ||
      (options.includeCatalogMigrations && isCatalog) ||
      (options.includeBonusMunicipal && isBonusMunicipal);

    if (!include) continue;

    cpSync(resolve(migrationsRoot, dirName), resolve(migrationsTargetRoot, dirName), { recursive: true });
    includedMigrationDirs.push(dirName);
  }

  return {
    tempRoot,
    schemaPath: resolve(tempRoot, 'schema.prisma'),
    includedMigrationDirs,
  };
}

function applyHistoricalMigrationsViaPrisma(databaseUrlToUse: string) {
  const fixture = createPrismaFixture({ includeCatalogMigrations: false, includeBonusMunicipal: false });
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

function applyMigrationsThrough3B1(databaseUrlToUse: string) {
  const fixture = createPrismaFixture({ includeCatalogMigrations: true, includeBonusMunicipal: false });
  try {
    return runPrismaMigrateDeploy(databaseUrlToUse, fixture.schemaPath);
  } finally {
    rmSync(fixture.tempRoot, { recursive: true, force: true });
  }
}

function applyMigrationsThrough3B11(databaseUrlToUse: string) {
  const fixture = createPrismaFixture({ includeCatalogMigrations: true, includeBonusMunicipal: true });
  try {
    return runPrismaMigrateDeploy(databaseUrlToUse, fixture.schemaPath);
  } finally {
    rmSync(fixture.tempRoot, { recursive: true, force: true });
  }
}

async function connectClient(connectionString: string) {
  const client = new Client({ connectionString });
  await client.connect();
  return client;
}

function databaseUrlFor(databaseName: string) {
  return `postgresql://postgres:postgres@127.0.0.1:55432/${databaseName}?schema=public`;
}

async function createDisposableDatabase(databaseName: string) {
  const adminClient = await connectClient(adminDatabaseUrl);
  try {
    await adminClient.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
    await adminClient.query(`CREATE DATABASE "${databaseName}"`);
  } finally {
    await adminClient.end();
  }
}

async function createDatabaseFromTemplate(databaseName: string, templateName: string) {
  const adminClient = await connectClient(adminDatabaseUrl);
  try {
    await adminClient.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
    await adminClient.query(`CREATE DATABASE "${databaseName}" TEMPLATE "${templateName}"`);
  } finally {
    await adminClient.end();
  }
}

async function dropDisposableDatabase(databaseName: string) {
  const adminClient = await connectClient(adminDatabaseUrl);
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

  const client = await connectClient(databaseUrlToUse);
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
  name: string;
  kind: string;
  parent_id: string | null;
  default_direction: string | null;
  requires_document: boolean;
  is_system: boolean;
  is_active: boolean;
  sort_order: number;
  is_postable: boolean;
};

async function fetchCategoryRows(client: Client): Promise<CategoryRow[]> {
  const { rows } = await client.query<CategoryRow>(`
    SELECT id, code, name, kind::text AS kind, parent_id, default_direction::text AS default_direction,
      requires_document, is_system, is_active, sort_order, is_postable
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

async function assertFinalCatalogState(client: Client) {
  const rows = await fetchCategoryRows(client);

  expect(rows).toHaveLength(53);
  expect(rows.filter((row) => row.is_active)).toHaveLength(44);
  expect(rows.filter((row) => !row.is_active)).toHaveLength(9);
  expect(rows.filter((row) => row.parent_id === null)).toHaveLength(13);
  expect(rows.filter((row) => row.parent_id !== null)).toHaveLength(40);
  expect(rows.filter((row) => row.is_postable === true)).toHaveLength(31);
  expect(rows.filter((row) => row.is_postable === false)).toHaveLength(22);
  expect(rows.filter((row) => row.is_postable === null)).toHaveLength(0);
  expect(new Set(rows.map((row) => row.id)).size).toBe(53);
  expect(new Set(rows.map((row) => row.code)).size).toBe(53);

  const kindCounts = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.kind] = (acc[row.kind] ?? 0) + 1;
    return acc;
  }, {});
  expect(kindCounts).toEqual({
    REVENUE: 7,
    EXPENSE: 26,
    ADJUSTMENT: 2,
    CONTRIBUTION: 2,
    WITHDRAWAL: 2,
    TRANSFER: 2,
    LIABILITY: 8,
    CLEARING: 4,
  });

  expect(rows.filter((row) => !row.parent_id && row.is_postable)).toHaveLength(0);
  expect(rows.filter((row) => !row.is_active && row.is_postable)).toHaveLength(0);
  expect(
    rows.filter((row) => row.is_postable).filter((row) => rows.some((child) => child.parent_id === row.id)),
  ).toHaveLength(0);

  const bonus = rows.find((row) => row.code === BONUS_CODE);
  expect(bonus).toMatchObject({
    id: BONUS_ID,
    kind: 'LIABILITY',
    parent_id: OBRIGACOES_ID,
    default_direction: 'OUT',
    requires_document: false,
    is_system: true,
    is_active: true,
    is_postable: true,
    sort_order: 13070,
  });
  expect(bonus?.parent_id).not.toBe(bonus?.id);

  const municipal = rows.find((row) => row.code === MUNICIPAL_CODE);
  expect(municipal).toMatchObject({
    id: MUNICIPAL_ID,
    kind: 'EXPENSE',
    parent_id: OPERACOES_ID,
    default_direction: 'OUT',
    requires_document: false,
    is_system: true,
    is_active: true,
    is_postable: true,
    sort_order: 4040,
  });
  expect(municipal?.parent_id).not.toBe(municipal?.id);
  expect(municipal?.code).not.toMatch(/RIO|JANEIRO/i);

  expect(rows.filter((row) => row.parent_id === BONUS_ID || row.parent_id === MUNICIPAL_ID)).toHaveLength(0);

  return rows;
}

beforeAll(async () => {
  historicalTemplateDatabaseName = createDisposableDatabaseName('kaviar_pre3a_template_b3b11');
  await createDisposableDatabase(historicalTemplateDatabaseName);

  const templateUrl = databaseUrlFor(historicalTemplateDatabaseName);
  applyHistoricalMigrationsViaPrisma(templateUrl);

  const client = await connectClient(templateUrl);
  try {
    expect(await count(client, 'SELECT count(*)::int AS count FROM financial_categories')).toBe(40);
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

describe('finance category bonus + municipal fee SQL contract phase 1C-B 3B-1.1', { timeout: 180000 }, () => {
  it('applies 3B-1.1 on top of 3B-1, adds only the two new categories and keeps all previous rows intact', async () => {
    await withHistoricalClone('finance-b3b11-happy', async ({ databaseUrl: databaseUrlToUse, client }) => {
      applyMigrationsThrough3B1(databaseUrlToUse);

      const beforeRows = await fetchCategoryRows(client);
      expect(beforeRows).toHaveLength(51);
      const beforeHash = hashRows(beforeRows);

      const accountsBefore = await count(client, 'SELECT count(*)::int AS count FROM financial_accounts');
      const costCentersBefore = await count(client, 'SELECT count(*)::int AS count FROM financial_cost_centers');
      const policiesBefore = await count(client, 'SELECT count(*)::int AS count FROM financial_recognition_policies');

      applyMigrationsThrough3B11(databaseUrlToUse);

      const afterRows = await assertFinalCatalogState(client);

      const previousRows = afterRows.filter((row) => row.code !== BONUS_CODE && row.code !== MUNICIPAL_CODE);
      expect(previousRows).toHaveLength(51);
      expect(hashRows(previousRows)).toBe(beforeHash);

      expect(await count(client, 'SELECT count(*)::int AS count FROM financial_transactions')).toBe(0);
      expect(await count(client, 'SELECT count(*)::int AS count FROM financial_transaction_allocations')).toBe(0);
      expect(await count(client, 'SELECT count(*)::int AS count FROM financial_accounts')).toBe(accountsBefore);
      expect(await count(client, 'SELECT count(*)::int AS count FROM financial_cost_centers')).toBe(costCentersBefore);
      expect(await count(client, 'SELECT count(*)::int AS count FROM financial_recognition_policies')).toBe(policiesBefore);
      expect(
        await count(client, 'SELECT count(*)::int AS count FROM financial_transactions WHERE category_id IN ($1, $2)', [BONUS_ID, MUNICIPAL_ID]),
      ).toBe(0);
      expect(
        await count(client, 'SELECT count(*)::int AS count FROM financial_transaction_allocations WHERE category_id IN ($1, $2)', [BONUS_ID, MUNICIPAL_ID]),
      ).toBe(0);
    });
  });

  it('re-running prisma migrate deploy keeps 3B-1.1 idempotent with no pending migrations', async () => {
    await withHistoricalClone('finance-b3b11-second-deploy', async ({ databaseUrl: databaseUrlToUse, client }) => {
      applyMigrationsThrough3B11(databaseUrlToUse);
      const before = hashRows(await fetchCategoryRows(client));
      const output = applyMigrationsThrough3B11(databaseUrlToUse);
      expect(output).toContain('No pending migrations to apply');
      const after = hashRows(await fetchCategoryRows(client));
      expect(after).toBe(before);
    });
  });

  it('is a safe no-op when the seed already created the two categories in expected shape', async () => {
    await withHistoricalClone('finance-b3b11-seed-first', async ({ databaseUrl: databaseUrlToUse, client }) => {
      applyMigrationsThrough3B1(databaseUrlToUse);
      runPrismaSeed(databaseUrlToUse);

      const seededRows = await fetchCategoryRows(client);
      expect(seededRows).toHaveLength(53);
      const seededHash = hashRows(seededRows);

      applyMigrationsThrough3B11(databaseUrlToUse);

      const afterRows = await assertFinalCatalogState(client);
      expect(hashRows(afterRows)).toBe(seededHash);
    });
  });

  it('seed remains idempotent after 3B-1.1 with the final 53-category catalog', async () => {
    await withHistoricalClone('finance-b3b11-seed-after', async ({ databaseUrl: databaseUrlToUse, client }) => {
      applyMigrationsThrough3B11(databaseUrlToUse);

      runPrismaSeed(databaseUrlToUse);
      const first = hashRows(await fetchCategoryRows(client));

      runPrismaSeed(databaseUrlToUse);
      const second = hashRows(await fetchCategoryRows(client));

      expect(second).toBe(first);
      await assertFinalCatalogState(client);
      expect(await count(client, 'SELECT count(*)::int AS count FROM financial_transactions')).toBe(0);
      expect(await count(client, 'SELECT count(*)::int AS count FROM financial_transaction_allocations')).toBe(0);
      expect(await count(client, 'SELECT count(*)::int AS count FROM financial_accounts')).toBe(0);
    });
  });

  it('fails atomically when a target code is occupied with an unexpected shape', async () => {
    await withHistoricalClone('finance-b3b11-occupied', async ({ databaseUrl: databaseUrlToUse, client }) => {
      applyMigrationsThrough3B1(databaseUrlToUse);

      await client.query(
        `
          INSERT INTO financial_categories (
            id, code, name, kind, parent_id, default_direction, requires_document,
            is_system, is_active, is_postable, sort_order, created_at, updated_at
          ) VALUES (
            'fcat_b3b11_occupied',
            $1,
            'Occupied',
            'EXPENSE'::financial_category_kind,
            NULL,
            'OUT'::financial_direction,
            false,
            false,
            false,
            false,
            99999,
            NOW(),
            NOW()
          )
        `,
        [MUNICIPAL_CODE],
      );

      const preRows = await fetchCategoryRows(client);
      const preHash = hashRows(preRows);

      let output = '';
      try {
        applyMigrationsThrough3B11(databaseUrlToUse);
        throw new Error('Expected 3B-1.1 migration to fail');
      } catch (error) {
        output = `${(error as any).stdout ?? ''}${(error as any).stderr ?? ''}`;
      }
      expect(output).toContain('3B-1.1 target ids/codes partially occupied with unexpected shape');

      const afterRows = await fetchCategoryRows(client);
      expect(hashRows(afterRows)).toBe(preHash);
      expect(afterRows.find((row) => row.code === BONUS_CODE)).toBeUndefined();
    });
  });

  it('fails atomically when the pre-3B-1.1 catalog diverges from the expected 51-category state', async () => {
    await withHistoricalClone('finance-b3b11-diverged', async ({ databaseUrl: databaseUrlToUse, client }) => {
      applyMigrationsThrough3B1(databaseUrlToUse);

      await client.query(`DELETE FROM financial_categories WHERE code = 'PUBLICIDADE_DIGITAL'`);

      const preRows = await fetchCategoryRows(client);
      const preHash = hashRows(preRows);

      let output = '';
      try {
        applyMigrationsThrough3B11(databaseUrlToUse);
        throw new Error('Expected 3B-1.1 migration to fail');
      } catch (error) {
        output = `${(error as any).stdout ?? ''}${(error as any).stderr ?? ''}`;
      }
      expect(output).toContain('Expected 51 finance categories before 3B-1.1 additions, found 50');

      const afterRows = await fetchCategoryRows(client);
      expect(hashRows(afterRows)).toBe(preHash);
      expect(afterRows.find((row) => row.code === BONUS_CODE)).toBeUndefined();
      expect(afterRows.find((row) => row.code === MUNICIPAL_CODE)).toBeUndefined();
    });
  });
});
