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
const normalizeMigrationDir = '20260717120000_normalize_finance_category_catalog';
const fixPublicidadeMigrationDir = '20260718230000_fix_publicidade_digital_category';
const historicalCutoffMigrationDir = '20260717012000_phase1b_financial_ledger';
const normalizeMigrationPath = resolve(migrationsRoot, normalizeMigrationDir, 'migration.sql');
const normalizeMigrationSql = readFileSync(normalizeMigrationPath, 'utf8');
const fixPublicidadeMigrationPath = resolve(migrationsRoot, fixPublicidadeMigrationDir, 'migration.sql');
const fixPublicidadeMigrationSql = readFileSync(fixPublicidadeMigrationPath, 'utf8');
const bootstrapRoot = resolve(prismaRoot, 'bootstrap', '20260712_current');
const bootstrapPreSqlPath = resolve(bootstrapRoot, 'pre-bootstrap.sql');
const bootstrapBaselineSqlPath = resolve(bootstrapRoot, 'baseline.sql');
const bootstrapPostSqlPath = resolve(bootstrapRoot, 'post-prisma-objects.sql');
const financeFoundationMigrationDir = '20260716153000_phase1a_finance_foundation';
const adminDatabaseUrl = 'postgresql://postgres:postgres@127.0.0.1:55432/postgres';

let historicalTemplateDatabaseName = '';

const legacyToFinalCodeMap: Array<{ legacyCode: string; finalCode: string }> = [
  { legacyCode: 'receita', finalCode: 'RECEITAS_OPERACIONAIS' },
  { legacyCode: 'receita.taxa_corrida', finalCode: 'TAXA_CORRIDA' },
  { legacyCode: 'receita.adesao_gestor', finalCode: 'ADESAO_GESTOR' },
  { legacyCode: 'despesa.despesas_municipais', finalCode: 'GESTAO_TERRITORIAL' },
  { legacyCode: 'receita.servico_comercial', finalCode: 'SERVICO_COMERCIAL' },
  { legacyCode: 'receita.outras_receitas', finalCode: 'OUTRAS_RECEITAS' },
  { legacyCode: 'receita.mensalidade', finalCode: 'RECEITA_MENSALIDADE_LEGACY' },
  { legacyCode: 'despesa', finalCode: 'DESPESAS_ADMINISTRATIVAS' },
  { legacyCode: 'despesa.marketing', finalCode: 'MARKETING_E_VENDAS' },
  { legacyCode: 'receita.combo_premium', finalCode: 'COMBO_PREMIUM' },
  { legacyCode: 'despesa.aws', finalCode: 'AWS' },
  { legacyCode: 'despesa.cloudflare', finalCode: 'CLOUDFLARE' },
  { legacyCode: 'despesa.google_play', finalCode: 'GOOGLE_PLAY_STORE' },
  { legacyCode: 'despesa.expo', finalCode: 'EXPO' },
  { legacyCode: 'despesa.dominio', finalCode: 'DOMINIOS_E_CERTIFICADOS' },
  { legacyCode: 'despesa.equipamentos', finalCode: 'EQUIPAMENTOS_LEGACY' },
  { legacyCode: 'despesa.twilio', finalCode: 'TWILIO' },
  { legacyCode: 'despesa.telefonia_internet', finalCode: 'TELEFONIA_INTERNET' },
  { legacyCode: 'despesa.juridico', finalCode: 'REGULACAO_MUNICIPAL' },
  { legacyCode: 'despesa.contabilidade', finalCode: 'CONTABILIDADE' },
  { legacyCode: 'despesa.pro_labore', finalCode: 'PRO_LABORE' },
  { legacyCode: 'despesa.outras_despesas', finalCode: 'OUTRAS_DESPESAS' },
  { legacyCode: 'despesa.sumup', finalCode: 'PROCESSAMENTO_PAGAMENTOS' },
  { legacyCode: 'despesa.taxas_bancarias', finalCode: 'TAXAS_BANCARIAS' },
  { legacyCode: 'despesa.reembolsos', finalCode: 'REEMBOLSOS' },
  { legacyCode: 'despesa.asaas', finalCode: 'ASAAS_LEGACY' },
  { legacyCode: 'despesa.impostos', finalCode: 'IMPOSTOS_LEGACY' },
  { legacyCode: 'aporte', finalCode: 'APORTES' },
  { legacyCode: 'aporte.socio', finalCode: 'APORTE_SOCIO' },
  { legacyCode: 'retirada', finalCode: 'RETIRADAS' },
  { legacyCode: 'retirada.socio', finalCode: 'RETIRADA_SOCIO' },
  { legacyCode: 'transferencia', finalCode: 'TRANSFERENCIAS' },
  { legacyCode: 'transferencia.interna', finalCode: 'TRANSFERENCIA_INTERNA' },
  { legacyCode: 'passivo', finalCode: 'OBRIGACOES_OPERACIONAIS' },
  { legacyCode: 'passivo.creditos_pre_pagos', finalCode: 'CREDITOS_PRE_PAGOS' },
  { legacyCode: 'passivo.valores_motoristas', finalCode: 'VALORES_MOTORISTAS' },
  { legacyCode: 'passivo.valores_gestores', finalCode: 'VALORES_GESTORES' },
  { legacyCode: 'passivo.valores_comercios', finalCode: 'VALORES_COMERCIOS' },
  { legacyCode: 'passivo.retencoes', finalCode: 'RETENCOES' },
  { legacyCode: 'passivo.outros_terceiros', finalCode: 'OUTROS_TERCEIROS' },
];

const newCategorySourceToFinalCode: Array<{ idSource: string; finalCode: string }> = [
  { idSource: 'custos_diretos_plataforma', finalCode: 'CUSTOS_DIRETOS_PLATAFORMA' },
  { idSource: 'operacoes_e_suporte', finalCode: 'OPERACOES_E_SUPORTE' },
  { idSource: 'tecnologia_e_produto', finalCode: 'TECNOLOGIA_E_PRODUTO' },
  { idSource: 'despesas_financeiras', finalCode: 'DESPESAS_FINANCEIRAS' },
  { idSource: 'publicidade_digital', finalCode: 'PUBLICIDADE_DIGITAL' },
  { idSource: 'ajustes_e_deducoes_receita', finalCode: 'AJUSTES_E_DEDUCOES_RECEITA' },
  { idSource: 'ajustes_e_deducoes_receita.chargebacks', finalCode: 'CHARGEBACKS_LIQUIDACAO' },
  { idSource: 'valores_em_transito', finalCode: 'VALORES_EM_TRANSITO' },
  { idSource: 'valores_em_transito.processador', finalCode: 'VALORES_PROCESSADOR' },
  { idSource: 'valores_em_transito.recebiveis', finalCode: 'RECEBIVEIS_LIQUIDAR' },
  { idSource: 'valores_em_transito.reembolsos_processamento', finalCode: 'REEMBOLSOS_PROCESSAMENTO' },
];

const expectedLegacyCodeSet = new Set(legacyToFinalCodeMap.map((entry) => entry.legacyCode));

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

function deterministicCategoryId(source: string) {
  return `fcat_${createHash('md5').update(source).digest('hex')}`;
}

type FixtureOptions = {
  includeNormalizeMigration: boolean;
  includeFixPublicidadeMigration?: boolean;
  mutateNormalizeSql?: (sql: string) => string;
  mutateFixPublicidadeSql?: (sql: string) => string;
};

function createHistoricalPrismaFixture(options: FixtureOptions) {
  const tempRoot = mkdtempSync(resolve(tmpdir(), 'kaviar-prisma-pre3a-'));
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

    if (!isHistorical && !(options.includeNormalizeMigration && isNormalize) && !(options.includeFixPublicidadeMigration && isFixPublicidade)) {
      continue;
    }

    cpSync(resolve(migrationsRoot, dirName), resolve(migrationsTargetRoot, dirName), { recursive: true });
    includedMigrationDirs.push(dirName);
  }

  if (options.includeNormalizeMigration && options.mutateNormalizeSql) {
    const fixtureMigrationPath = resolve(migrationsTargetRoot, normalizeMigrationDir, 'migration.sql');
    writeFileSync(fixtureMigrationPath, options.mutateNormalizeSql(readFileSync(fixtureMigrationPath, 'utf8')));
  }

  if (options.includeFixPublicidadeMigration && options.mutateFixPublicidadeSql) {
    const fixtureMigrationPath = resolve(migrationsTargetRoot, fixPublicidadeMigrationDir, 'migration.sql');
    writeFileSync(fixtureMigrationPath, options.mutateFixPublicidadeSql(readFileSync(fixtureMigrationPath, 'utf8')));
  }

  return {
    tempRoot,
    schemaPath: resolve(tempRoot, 'schema.prisma'),
    includedMigrationDirs,
  };
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

function applyNormalizeMigrationViaPrisma(databaseUrlToUse: string, mutateNormalizeSql?: (sql: string) => string) {
  const fixture = createHistoricalPrismaFixture({ includeNormalizeMigration: true, mutateNormalizeSql });
  try {
    return runPrismaMigrateDeploy(databaseUrlToUse, fixture.schemaPath);
  } finally {
    rmSync(fixture.tempRoot, { recursive: true, force: true });
  }
}

function applyCatalogMigrationsViaPrisma(databaseUrlToUse: string) {
  const fixture = createHistoricalPrismaFixture({ includeNormalizeMigration: true, includeFixPublicidadeMigration: true });
  try {
    return runPrismaMigrateDeploy(databaseUrlToUse, fixture.schemaPath);
  } finally {
    rmSync(fixture.tempRoot, { recursive: true, force: true });
  }
}

function applyFixPublicidadeMigrationViaPrisma(databaseUrlToUse: string, mutateFixPublicidadeSql?: (sql: string) => string) {
  const fixture = createHistoricalPrismaFixture({
    includeNormalizeMigration: true,
    includeFixPublicidadeMigration: true,
    mutateFixPublicidadeSql,
  });
  try {
    return runPrismaMigrateDeploy(databaseUrlToUse, fixture.schemaPath);
  } finally {
    rmSync(fixture.tempRoot, { recursive: true, force: true });
  }
}

function applyHistoricalMigrationsViaPrisma(databaseUrlToUse: string) {
  const fixture = createHistoricalPrismaFixture({ includeNormalizeMigration: false });
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

async function expectNormalizeFailureViaPrisma(databaseUrlToUse: string, expectedFragment: string, mutateNormalizeSql?: (sql: string) => string) {
  try {
    applyNormalizeMigrationViaPrisma(databaseUrlToUse, mutateNormalizeSql);
    throw new Error('Expected normalize migration to fail');
  } catch (error) {
    const output = `${(error as any).stdout ?? ''}${(error as any).stderr ?? ''}`;
    expect(output).toContain(expectedFragment);
    return output;
  }
}

async function expectFixPublicidadeFailureViaPrisma(
  databaseUrlToUse: string,
  expectedFragment: string,
  mutateFixPublicidadeSql?: (sql: string) => string,
) {
  try {
    applyFixPublicidadeMigrationViaPrisma(databaseUrlToUse, mutateFixPublicidadeSql);
    throw new Error('Expected 3A.1 corrective migration to fail');
  } catch (error) {
    const output = `${(error as any).stdout ?? ''}${(error as any).stderr ?? ''}`;
    expect(output).toContain(expectedFragment);
    return output;
  }
}

type CatalogRow = {
  id: string;
  code: string;
  name: string;
  kind: string;
  parent_id: string | null;
  parent_code: string | null;
  default_direction: string | null;
  requires_document: boolean;
  is_system: boolean;
  is_active: boolean;
  sort_order: number;
};

async function fetchCatalogRows(client: Client): Promise<CatalogRow[]> {
  const { rows } = await client.query<CatalogRow>(`
    SELECT
      c.id,
      c.code,
      c.name,
      c.kind,
      c.parent_id,
      parent.code AS parent_code,
      c.default_direction,
      c.requires_document,
      c.is_system,
      c.is_active,
      c.sort_order
    FROM financial_categories c
    LEFT JOIN financial_categories parent ON parent.id = c.parent_id
    ORDER BY c.sort_order, c.code
  `);
  return rows;
}

function normalizeCatalogRows(rows: CatalogRow[]) {
  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    kind: row.kind,
    parent_id: row.parent_id,
    parent_code: row.parent_code,
    default_direction: row.default_direction,
    requires_document: row.requires_document,
    is_system: row.is_system,
    is_active: row.is_active,
    sort_order: row.sort_order,
  }));
}

function hashCatalog(rows: ReturnType<typeof normalizeCatalogRows>) {
  return createHash('sha256').update(JSON.stringify(rows)).digest('hex');
}

async function countRows(client: Client, sql: string, values: readonly unknown[] = []) {
  const { rows } = await client.query<{ count: number }>(sql, values);
  return Number(rows[0]?.count ?? 0);
}

async function insertExtraCategory(client: Client, code: string, id: string) {
  await client.query(
    `
      INSERT INTO financial_categories (
        id,
        code,
        name,
        kind,
        default_direction,
        requires_document,
        is_system,
        is_active,
        sort_order,
        created_by_admin_id,
        updated_by_admin_id,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4::financial_category_kind, $5::financial_direction, $6, $7, $8, $9, NULL, NULL, NOW(), NOW())
    `,
    [id, code, 'Temporary extra category', 'REVENUE', 'IN', false, true, true, 99999],
  );
}

async function insertMinimalAccount(client: Client, code: string, id: string) {
  await client.query(
    `
      INSERT INTO financial_accounts (
        id,
        code,
        name,
        type,
        currency,
        opening_balance_cents,
        allows_negative_balance,
        is_cash_equivalent,
        is_active,
        created_by_admin_id,
        updated_by_admin_id,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4::financial_account_type, 'BRL', '0', false, false, true, NULL, NULL, NOW(), NOW())
    `,
    [id, code, 'Test account', 'CASH'],
  );
}

async function insertMinimalTransaction(client: Client, accountId: string, id: string, idempotencyKey: string) {
  await client.query(
    `
      INSERT INTO financial_transactions (
        id,
        source_type,
        source_id,
        origin_type,
        origin_id,
        account_id,
        direction,
        transaction_type,
        status,
        competence_date,
        transaction_date,
        gross_amount_cents,
        fee_amount_cents,
        discount_amount_cents,
        retention_amount_cents,
        net_amount_cents,
        description,
        idempotency_key,
        created_by_admin_id,
        approved_by_admin_id,
        responsible_admin_id,
        created_at,
        updated_at
      ) VALUES (
        $1,
        'MANUAL'::financial_source_type,
        'source',
        'MANUAL'::financial_origin_type,
        'origin',
        $2,
        'IN'::financial_direction,
        'INCOME'::financial_transaction_type,
        'POSTED'::financial_transaction_status,
        '2026-07-01T00:00:00.000Z',
        '2026-07-01T00:00:00.000Z',
        '1000',
        '0',
        '0',
        '0',
        '1000',
        'Test transaction',
        $3,
        NULL,
        NULL,
        NULL,
        NOW(),
        NOW()
      )
    `,
    [id, accountId, idempotencyKey],
  );
}

async function withHistoricalClone<T>(prefix: string, callback: (context: { databaseName: string; databaseUrl: string; client: Client }) => Promise<T>) {
  const databaseName = createDisposableDatabaseName(prefix);
  const databaseUrlToUse = databaseUrlFor(databaseName);

  await createDatabaseFromTemplate(databaseName, historicalTemplateDatabaseName);

  const client = await connectCatalogClient(databaseUrlToUse);
  try {
    return await callback({ databaseName, databaseUrl: databaseUrlToUse, client });
  } finally {
    await client.end();
    await dropDisposableDatabase(databaseName);
  }
}

const seedModule = await import('../prisma/seed');
const seed = (seedModule as any).default ?? seedModule;

const expectedCatalogByCode = new Map(
  (seed.FINANCE_CATEGORY_SEEDS as Array<{
    idSource: string;
    code: string;
    name: string;
    kind: string;
    parent_code?: string | null;
    default_direction?: string | null;
    requires_document?: boolean;
    is_active?: boolean;
    is_system?: boolean;
    sort_order?: number;
  }>).map((category) => [
    category.code,
    {
      id: deterministicCategoryId(category.idSource),
      ...category,
    },
  ]),
);

beforeAll(async () => {
  historicalTemplateDatabaseName = createDisposableDatabaseName('kaviar_pre3a_template');
  await createDisposableDatabase(historicalTemplateDatabaseName);

  const templateUrl = databaseUrlFor(historicalTemplateDatabaseName);
  applyHistoricalMigrationsViaPrisma(templateUrl);

  const client = await connectCatalogClient(templateUrl);
  try {
    const rows = normalizeCatalogRows(await fetchCatalogRows(client));
    expect(rows).toHaveLength(40);
    expect(new Set(rows.map((row) => row.code))).toEqual(expectedLegacyCodeSet);
    expect(await countRows(client, 'SELECT count(*)::int AS count FROM financial_transactions')).toBe(0);
    expect(await countRows(client, 'SELECT count(*)::int AS count FROM financial_transaction_allocations')).toBe(0);
  } finally {
    await client.end();
  }
}, 180000);

afterAll(async () => {
  if (historicalTemplateDatabaseName) {
    await dropDisposableDatabase(historicalTemplateDatabaseName);
  }
});

describe('finance category catalog SQL contract', { timeout: 180000 }, () => {
  it('applies 3A + 3A.1 through prisma using a historical baseline and validates final catalog invariants', async () => {
    await withHistoricalClone('finance-happy-prisma', async ({ databaseUrl: databaseUrlToUse, client }) => {
      const legacySnapshot = normalizeCatalogRows(await fetchCatalogRows(client));
      expect(legacySnapshot).toHaveLength(40);
      expect(new Set(legacySnapshot.map((row) => row.code))).toEqual(expectedLegacyCodeSet);

      applyCatalogMigrationsViaPrisma(databaseUrlToUse);

      const finalRows = normalizeCatalogRows(await fetchCatalogRows(client));
      expect(finalRows).toHaveLength(51);
      expect(finalRows.filter((row) => row.is_active).length).toBe(42);
      expect(finalRows.filter((row) => !row.is_active).length).toBe(9);
      expect(finalRows.filter((row) => row.parent_id === null).length).toBe(13);
      expect(finalRows.filter((row) => row.parent_id !== null).length).toBe(38);
      expect(finalRows.filter((row) => row.requires_document).length).toBe(0);

      const kindCounts = finalRows.reduce<Record<string, number>>((acc, row) => {
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

      const finalByCode = new Map(finalRows.map((row) => [row.code, row] as const));
      for (const row of finalRows) {
        const expected = expectedCatalogByCode.get(row.code);
        expect(expected).toBeDefined();
        expect(row.id).toBe(expected?.id);
        expect(row.name).toBe(expected?.name);
        expect(row.kind).toBe(expected?.kind);
        expect(row.parent_code).toBe(expected?.parent_code ?? null);
        expect(row.default_direction).toBe(expected?.default_direction ?? null);
        expect(row.requires_document).toBe(expected?.requires_document ?? false);
        expect(row.is_system).toBe(expected?.is_system ?? true);
        expect(row.is_active).toBe(expected?.is_active ?? true);
        expect(row.sort_order).toBe(expected?.sort_order ?? 0);
      }

      const legacyByCode = new Map(legacySnapshot.map((row) => [row.code, row] as const));
      let preservedComparisons = 0;
      for (const mapping of legacyToFinalCodeMap) {
        const before = legacyByCode.get(mapping.legacyCode);
        const after = finalByCode.get(mapping.finalCode);
        expect(before).toBeDefined();
        expect(after).toBeDefined();
        expect(after?.id).toBe(before?.id);
        preservedComparisons += 1;
      }
      expect(preservedComparisons).toBe(40);

      const legacyIdSet = new Set(legacySnapshot.map((row) => row.id));
      const newRows = finalRows.filter((row) => !legacyIdSet.has(row.id));
      expect(newRows).toHaveLength(11);
      const newIds = newRows.map((row) => row.id);
      expect(new Set(newIds).size).toBe(11);
      expect(newRows.every((row) => !legacyIdSet.has(row.id))).toBe(true);

      const expectedNewIdByCode = new Map(
        newCategorySourceToFinalCode.map((entry) => [entry.finalCode, deterministicCategoryId(entry.idSource)] as const),
      );
      for (const row of newRows) {
        expect(row.id).toBe(expectedNewIdByCode.get(row.code));
      }
    });
  });

  it('runs prisma migrate deploy a second time with no pending migrations and keeps the catalog structurally identical', async () => {
    await withHistoricalClone('finance-second-deploy', async ({ databaseUrl: databaseUrlToUse, client }) => {
      applyCatalogMigrationsViaPrisma(databaseUrlToUse);
      const beforeSecondDeploy = normalizeCatalogRows(await fetchCatalogRows(client));
      const beforeHash = hashCatalog(beforeSecondDeploy);

      const secondOutput = applyCatalogMigrationsViaPrisma(databaseUrlToUse);
      expect(secondOutput).toContain('No pending migrations to apply');

      const afterSecondDeploy = normalizeCatalogRows(await fetchCatalogRows(client));
      expect(hashCatalog(afterSecondDeploy)).toBe(beforeHash);
      expect(afterSecondDeploy).toHaveLength(51);

      const { rows } = await client.query<{ count: number }>(
        `
          SELECT count(*)::int AS count
          FROM _prisma_migrations
          WHERE migration_name IN ($1, $2) AND finished_at IS NOT NULL
        `,
        [normalizeMigrationDir, fixPublicidadeMigrationDir],
      );
      expect(Number(rows[0]?.count ?? 0)).toBe(2);
    });
  });

  it('proves 3A.1 changes only PUBLICIDADE_DIGITAL while preserving its deterministic id', async () => {
    await withHistoricalClone('finance-fix-publicidade-only-target', async ({ databaseUrl: databaseUrlToUse, client }) => {
      applyNormalizeMigrationViaPrisma(databaseUrlToUse);

      const before = normalizeCatalogRows(await fetchCatalogRows(client));
      const beforePublicidade = before.find((row) => row.code === 'PUBLICIDADE_DIGITAL');
      expect(beforePublicidade).toBeDefined();
      expect(beforePublicidade?.id).toBe(deterministicCategoryId('publicidade_digital'));
      expect(beforePublicidade?.kind).toBe('CLEARING');
      expect(beforePublicidade?.parent_code).toBe('VALORES_EM_TRANSITO');
      expect(beforePublicidade?.is_active).toBe(false);
      expect(beforePublicidade?.default_direction).toBe('OUT');
      expect(beforePublicidade?.sort_order).toBe(14040);

      applyFixPublicidadeMigrationViaPrisma(databaseUrlToUse);

      const after = normalizeCatalogRows(await fetchCatalogRows(client));
      const afterPublicidade = after.find((row) => row.code === 'PUBLICIDADE_DIGITAL');
      expect(afterPublicidade).toBeDefined();
      expect(afterPublicidade?.id).toBe(deterministicCategoryId('publicidade_digital'));
      expect(afterPublicidade?.kind).toBe('EXPENSE');
      expect(afterPublicidade?.parent_code).toBe('MARKETING_E_VENDAS');
      expect(afterPublicidade?.is_active).toBe(true);
      expect(afterPublicidade?.default_direction).toBe('OUT');
      expect(afterPublicidade?.sort_order).toBe(6020);

      const beforeWithoutTarget = before.filter((row) => row.code !== 'PUBLICIDADE_DIGITAL');
      const afterWithoutTarget = after.filter((row) => row.code !== 'PUBLICIDADE_DIGITAL');
      expect(afterWithoutTarget).toEqual(beforeWithoutTarget);
    });
  });

  it('enforces 3A.1 guard rails and keeps rollback atomic for each failure scenario', async () => {
    const scenarios: Array<{
      name: string;
      expectedFragment: string;
      mutate: (client: Client) => Promise<void>;
    }> = [
      {
        name: 'PUBLICIDADE_DIGITAL absent',
        expectedFragment: 'Expected 51 finance categories before corrective migration, found 50',
        mutate: async (client) => {
          await client.query(`DELETE FROM financial_categories WHERE code = 'PUBLICIDADE_DIGITAL'`);
        },
      },
      {
        name: 'PUBLICIDADE_DIGITAL deterministic id mismatch',
        expectedFragment: 'PUBLICIDADE_DIGITAL does not match expected pre-correction state',
        mutate: async (client) => {
          await client.query(`UPDATE financial_categories SET id = 'fcat_publicidade_digital_wrong' WHERE code = 'PUBLICIDADE_DIGITAL'`);
        },
      },
      {
        name: 'PUBLICIDADE_DIGITAL kind mismatch',
        expectedFragment: 'PUBLICIDADE_DIGITAL does not match expected pre-correction state',
        mutate: async (client) => {
          await client.query(`UPDATE financial_categories SET kind = 'EXPENSE'::financial_category_kind WHERE code = 'PUBLICIDADE_DIGITAL'`);
        },
      },
      {
        name: 'PUBLICIDADE_DIGITAL parent mismatch',
        expectedFragment: 'PUBLICIDADE_DIGITAL does not match expected pre-correction state',
        mutate: async (client) => {
          await client.query(
            `UPDATE financial_categories
             SET parent_id = (SELECT id FROM financial_categories WHERE code = 'MARKETING_E_VENDAS')
             WHERE code = 'PUBLICIDADE_DIGITAL'`,
          );
        },
      },
      {
        name: 'PUBLICIDADE_DIGITAL status mismatch',
        expectedFragment: 'PUBLICIDADE_DIGITAL does not match expected pre-correction state',
        mutate: async (client) => {
          await client.query(`UPDATE financial_categories SET is_active = true WHERE code = 'PUBLICIDADE_DIGITAL'`);
        },
      },
      {
        name: 'MARKETING_E_VENDAS absent',
        expectedFragment: 'MARKETING_E_VENDAS missing or incompatible',
        mutate: async (client) => {
          await client.query(`UPDATE financial_categories SET code = 'MARKETING_E_VENDAS_TEMP' WHERE code = 'MARKETING_E_VENDAS'`);
        },
      },
      {
        name: 'MARKETING_E_VENDAS kind incompatible',
        expectedFragment: 'MARKETING_E_VENDAS missing or incompatible',
        mutate: async (client) => {
          await client.query(`UPDATE financial_categories SET kind = 'CLEARING'::financial_category_kind WHERE code = 'MARKETING_E_VENDAS'`);
        },
      },
      {
        name: 'PUBLICIDADE_DIGITAL has child',
        expectedFragment: 'Expected 51 finance categories before corrective migration, found 52',
        mutate: async (client) => {
          const { rows } = await client.query<{ id: string }>(`SELECT id FROM financial_categories WHERE code = 'PUBLICIDADE_DIGITAL'`);
          await client.query(
            `INSERT INTO financial_categories (
              id, code, name, kind, parent_id, default_direction, requires_document, is_system, is_active, sort_order, created_by_admin_id, updated_by_admin_id, created_at, updated_at
            ) VALUES (
              'fcat_publicidade_child_temp', 'PUBLICIDADE_DIGITAL_CHILD_TEMP', 'Publicidade Child Temp',
              'CLEARING'::financial_category_kind, $1, 'OUT'::financial_direction, false, true, true, 14041, NULL, NULL, NOW(), NOW()
            )`,
            [rows[0].id],
          );
        },
      },
      {
        name: 'financial transaction uses PUBLICIDADE_DIGITAL',
        expectedFragment: 'Expected zero financial_transactions using PUBLICIDADE_DIGITAL, found 1',
        mutate: async (client) => {
          await insertMinimalAccount(client, 'ACC_FIX_NEG_TX', 'acc_fix_neg_tx');
          await insertMinimalTransaction(client, 'acc_fix_neg_tx', 'txn_fix_neg_tx', 'idem-fix-neg-tx');
          await client.query(
            `UPDATE financial_transactions
             SET category_id = (SELECT id FROM financial_categories WHERE code = 'PUBLICIDADE_DIGITAL')
             WHERE id = 'txn_fix_neg_tx'`,
          );
        },
      },
      {
        name: 'financial allocation uses PUBLICIDADE_DIGITAL',
        expectedFragment: 'Expected zero financial_transaction_allocations using PUBLICIDADE_DIGITAL, found 1',
        mutate: async (client) => {
          await insertMinimalAccount(client, 'ACC_FIX_NEG_ALLOC', 'acc_fix_neg_alloc');
          await insertMinimalTransaction(client, 'acc_fix_neg_alloc', 'txn_fix_neg_alloc', 'idem-fix-neg-alloc');
          await client.query(
            `INSERT INTO financial_transaction_allocations (
              id,
              transaction_id,
              category_id,
              cost_center_id,
              amount_cents,
              allocation_type,
              description,
              metadata,
              created_by_admin_id,
              created_at,
              updated_at
            ) VALUES (
              'alloc_fix_neg_alloc',
              'txn_fix_neg_alloc',
              (SELECT id FROM financial_categories WHERE code = 'PUBLICIDADE_DIGITAL'),
              NULL,
              '1000',
              'ALLOCATED'::financial_transaction_allocation_type,
              'Negative allocation for fix guard',
              NULL,
              NULL,
              NOW(),
              NOW()
            )`,
          );
        },
      },
      {
        name: 'extra category exists',
        expectedFragment: 'Expected 51 finance categories before corrective migration, found 52',
        mutate: async (client) => {
          await insertExtraCategory(client, 'TEMP_EXTRA_FOR_FIX', 'temp_extra_for_fix');
        },
      },
      {
        name: 'catalog has missing category',
        expectedFragment: 'Expected 51 finance categories before corrective migration, found 50',
        mutate: async (client) => {
          await client.query(`DELETE FROM financial_categories WHERE code = 'REEMBOLSOS'`);
        },
      },
    ];

    for (const [index, scenario] of scenarios.entries()) {
      await withHistoricalClone(`finance-fixg-${index + 1}`, async ({ databaseUrl: databaseUrlToUse, client }) => {
        applyNormalizeMigrationViaPrisma(databaseUrlToUse);

        const before = normalizeCatalogRows(await fetchCatalogRows(client));
        await scenario.mutate(client);
        const mutated = normalizeCatalogRows(await fetchCatalogRows(client));

        await expectFixPublicidadeFailureViaPrisma(databaseUrlToUse, scenario.expectedFragment);

        const after = normalizeCatalogRows(await fetchCatalogRows(client));
        expect(after).toEqual(mutated);
      });
    }
  });

  it('proves atomic rollback when a post-condition fails during prisma migrate deploy', async () => {
    await withHistoricalClone('finance-atomic-rollback', async ({ databaseUrl: databaseUrlToUse, client }) => {
      const before = normalizeCatalogRows(await fetchCatalogRows(client));

      await expectNormalizeFailureViaPrisma(
        databaseUrlToUse,
        'Expected 51 finance categories after normalization, found 51',
        (sql) => sql.replace('IF final_count <> 51 THEN', 'IF final_count <> 52 THEN'),
      );

      const after = normalizeCatalogRows(await fetchCatalogRows(client));
      expect(after).toEqual(before);
    });
  });

  it('rejects a missing legacy category and preserves the pre-migration state', async () => {
    await withHistoricalClone('finance-neg-missing-legacy', async ({ databaseUrl: databaseUrlToUse, client }) => {
      await client.query('DELETE FROM financial_categories WHERE code = $1', ['receita.mensalidade']);
      await insertExtraCategory(client, 'TEMP_REPLACER', 'temp_replacer_missing_legacy');

      const before = normalizeCatalogRows(await fetchCatalogRows(client));
      expect(before).toHaveLength(40);

      await expectNormalizeFailureViaPrisma(databaseUrlToUse, 'Missing expected legacy categories');

      const after = normalizeCatalogRows(await fetchCatalogRows(client));
      expect(after).toEqual(before);
    });
  });

  it('rejects an extra category and preserves the pre-migration state', async () => {
    await withHistoricalClone('finance-neg-extra-category', async ({ databaseUrl: databaseUrlToUse, client }) => {
      await insertExtraCategory(client, 'TEMP_EXTRA_CATEGORY', 'temp_extra_category');

      const before = normalizeCatalogRows(await fetchCatalogRows(client));
      expect(before).toHaveLength(41);

      await expectNormalizeFailureViaPrisma(databaseUrlToUse, 'Expected 40 finance categories, found 41');

      const after = normalizeCatalogRows(await fetchCatalogRows(client));
      expect(after).toEqual(before);
    });
  });

  it('rejects a preexisting financial_transaction and preserves the pre-migration state', async () => {
    await withHistoricalClone('finance-neg-transaction', async ({ databaseUrl: databaseUrlToUse, client }) => {
      await insertMinimalAccount(client, 'ACC_NEG_TRANSACTION', 'acc_neg_transaction');
      await insertMinimalTransaction(client, 'acc_neg_transaction', 'txn_neg_transaction', 'idem-neg-transaction');

      expect(await countRows(client, 'SELECT count(*)::int AS count FROM financial_transactions')).toBe(1);

      await expectNormalizeFailureViaPrisma(databaseUrlToUse, 'Expected zero financial_transactions, found 1');

      expect(await countRows(client, 'SELECT count(*)::int AS count FROM financial_transactions')).toBe(1);
    });
  });

  it('rejects a preexisting financial_transaction_allocation and preserves the pre-migration state', async () => {
    await withHistoricalClone('finance-neg-allocation', async ({ databaseUrl: databaseUrlToUse, client }) => {
      const firstCategory = (await fetchCatalogRows(client))[0];

      await client.query('SET session_replication_role = replica');
      try {
        await client.query(
          `
            INSERT INTO financial_transaction_allocations (
              id,
              transaction_id,
              category_id,
              cost_center_id,
              amount_cents,
              allocation_type,
              description,
              metadata,
              created_by_admin_id,
              created_at,
              updated_at
            ) VALUES ('alloc_neg_allocation', 'missing-transaction', $1, NULL, '1000', 'ALLOCATED'::financial_transaction_allocation_type, 'Invalid allocation', NULL, NULL, NOW(), NOW())
          `,
          [firstCategory.id],
        );
      } finally {
        await client.query('SET session_replication_role = DEFAULT');
      }

      const before = normalizeCatalogRows(await fetchCatalogRows(client));
      expect(before).toHaveLength(40);
      expect(await countRows(client, 'SELECT count(*)::int AS count FROM financial_transactions')).toBe(0);
      expect(await countRows(client, 'SELECT count(*)::int AS count FROM financial_transaction_allocations')).toBe(1);

      await expectNormalizeFailureViaPrisma(databaseUrlToUse, 'Expected zero financial_transaction_allocations, found 1');

      const after = normalizeCatalogRows(await fetchCatalogRows(client));
      expect(after).toEqual(before);
    });
  });

  it('rejects a legacy category that is no longer system and preserves the pre-migration state', async () => {
    await withHistoricalClone('finance-neg-non-system', async ({ databaseUrl: databaseUrlToUse, client }) => {
      await client.query('UPDATE financial_categories SET is_system = false WHERE code = $1', ['receita.mensalidade']);

      const before = normalizeCatalogRows(await fetchCatalogRows(client));
      expect(before).toHaveLength(40);

      await expectNormalizeFailureViaPrisma(databaseUrlToUse, 'Expected all finance categories to be system categories');

      const after = normalizeCatalogRows(await fetchCatalogRows(client));
      expect(after).toEqual(before);
    });
  });

  it('rejects a final category code that is already occupied and preserves the pre-migration state', async () => {
    await withHistoricalClone('finance-neg-occupied-code', async ({ databaseUrl: databaseUrlToUse, client }) => {
      await insertExtraCategory(client, 'PUBLICIDADE_DIGITAL', 'temp_final_code');

      const before = normalizeCatalogRows(await fetchCatalogRows(client));
      expect(before).toHaveLength(41);

      await expectNormalizeFailureViaPrisma(databaseUrlToUse, 'A final category code is already occupied');

      const after = normalizeCatalogRows(await fetchCatalogRows(client));
      expect(after).toEqual(before);
    });
  });

  it('rejects a deterministic new category id already occupied and preserves the pre-migration state', async () => {
    await withHistoricalClone('finance-neg-occupied-id', async ({ databaseUrl: databaseUrlToUse, client }) => {
      const baseline = normalizeCatalogRows(await fetchCatalogRows(client));
      const occupiedId = deterministicCategoryId('publicidade_digital');

      await client.query('UPDATE financial_categories SET id = $1 WHERE code = $2', [occupiedId, 'receita']);

      const before = normalizeCatalogRows(await fetchCatalogRows(client));
      expect(before).toHaveLength(40);

      await expectNormalizeFailureViaPrisma(databaseUrlToUse, 'A deterministic new category id is already occupied');

      const after = normalizeCatalogRows(await fetchCatalogRows(client));
      expect(after).toEqual(before);

      expect(after.map((row) => row.id).filter((id) => id === occupiedId)).toHaveLength(1);
      expect(after).not.toEqual(baseline);
    });
  });

  it('restores the historical 40-category snapshot after applying rollback SQL model', async () => {
    await withHistoricalClone('finance-rollback', async ({ databaseUrl: databaseUrlToUse, client }) => {
      const before = normalizeCatalogRows(await fetchCatalogRows(client));
      expect(before).toHaveLength(40);

      applyNormalizeMigrationViaPrisma(databaseUrlToUse);

      const afterNormalize = normalizeCatalogRows(await fetchCatalogRows(client));
      expect(afterNormalize).toHaveLength(51);

      const baselineById = new Map(before.map((row) => [row.id, row] as const));
      const baselineIdSet = new Set(before.map((row) => row.id));

      await client.query('BEGIN');
      try {
        await client.query('DELETE FROM financial_categories WHERE id <> ALL($1::text[])', [Array.from(baselineIdSet)]);

        for (const row of before) {
          await client.query(
            `
              UPDATE financial_categories SET
                code = $2,
                name = $3,
                kind = $4::financial_category_kind,
                parent_id = $5,
                default_direction = $6::financial_direction,
                requires_document = $7,
                is_system = $8,
                is_active = $9,
                sort_order = $10,
                updated_at = NOW()
              WHERE id = $1
            `,
            [
              row.id,
              row.code,
              row.name,
              row.kind,
              row.parent_id,
              row.default_direction,
              row.requires_document,
              row.is_system,
              row.is_active,
              row.sort_order,
            ],
          );
        }

        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }

      const afterRollback = normalizeCatalogRows(await fetchCatalogRows(client));
      expect(afterRollback).toHaveLength(40);
      expect(afterRollback).toEqual(before);

      const rollbackIdSet = new Set(afterRollback.map((row) => row.id));
      expect(Array.from(rollbackIdSet).every((id) => baselineById.has(id))).toBe(true);
    });
  });

  it('keeps pre-3B-1 catalog stable when official seed is executed without is_postable column', async () => {
    await withHistoricalClone('finance-seed-idempotent', async ({ databaseUrl: databaseUrlToUse, client }) => {
      applyCatalogMigrationsViaPrisma(databaseUrlToUse);

      const beforeSeed = normalizeCatalogRows(await fetchCatalogRows(client));
      expect(beforeSeed).toHaveLength(51);

      try {
        runPrismaSeed(databaseUrlToUse);
        throw new Error('Expected official seed to fail before 3B-1 is_postable migration');
      } catch (error) {
        const output = `${(error as any).stdout ?? ''}${(error as any).stderr ?? ''}`;
        expect(output).toContain('is_postable');
      }

      const afterSeedFailure = normalizeCatalogRows(await fetchCatalogRows(client));
      expect(afterSeedFailure).toHaveLength(51);
      expect(afterSeedFailure).toEqual(beforeSeed);

      const legacyInactiveCodes = ['RECEITA_MENSALIDADE_LEGACY', 'ASAAS_LEGACY', 'EQUIPAMENTOS_LEGACY', 'IMPOSTOS_LEGACY'];
      expect(afterSeedFailure.filter((row) => legacyInactiveCodes.includes(row.code)).every((row) => row.is_active === false)).toBe(true);

      expect(await countRows(client, 'SELECT count(*)::int AS count FROM financial_transactions')).toBe(0);
      expect(await countRows(client, 'SELECT count(*)::int AS count FROM financial_transaction_allocations')).toBe(0);
      expect(await countRows(client, 'SELECT count(*)::int AS count FROM financial_accounts')).toBe(0);
      expect(await countRows(client, 'SELECT count(*)::int AS count FROM financial_recognition_policies')).toBe(5);
      expect(await countRows(client, 'SELECT count(*)::int AS count FROM financial_recognition_policies WHERE status = $1', ['APPROVED'])).toBe(0);
    });
  });

  it('contains the expected guard rails in migration SQL text', () => {
    const expectedGuards = [
      'Expected 40 finance categories, found %',
      'Expected zero financial_transactions, found %',
      'Expected zero financial_transaction_allocations, found %',
      'Missing expected legacy categories',
      'Unexpected finance category codes found in legacy baseline',
      'A final category code is already occupied',
      'A deterministic new category id is already occupied',
      'Expected 40 legacy updates, affected %',
      'Expected 11 new category inserts, affected %',
      'Expected 51 finance categories after normalization, found %',
      'Expected 41 active finance categories after normalization, found %',
      'Expected 10 inactive finance categories after normalization, found %',
      'Expected 13 root finance categories after normalization, found %',
      'Expected 38 child finance categories after normalization, found %',
      'Found finance categories with mismatched parent kind',
      'Found active finance categories with inactive parent',
    ];

    for (const fragment of expectedGuards) {
      expect(normalizeMigrationSql).toContain(fragment);
    }

    expect(normalizeMigrationSql).not.toContain('ON CONFLICT');

    const expectedFixGuards = [
      'Expected 51 finance categories before corrective migration, found %',
      'Expected exactly one PUBLICIDADE_DIGITAL category, found %',
      'PUBLICIDADE_DIGITAL does not match expected pre-correction state',
      'MARKETING_E_VENDAS missing or incompatible',
      'PUBLICIDADE_DIGITAL must not have child categories, found %',
      'Expected zero financial_transactions using PUBLICIDADE_DIGITAL, found %',
      'Expected zero financial_transaction_allocations using PUBLICIDADE_DIGITAL, found %',
      'Expected exactly one PUBLICIDADE_DIGITAL row update, affected %',
      'Expected 42 active finance categories after corrective migration, found %',
      'Expected 9 inactive finance categories after corrective migration, found %',
      'Expected EXPENSE=25 after corrective migration, found %',
      'Expected CLEARING=4 after corrective migration, found %',
      'Detected unintended changes in categories other than PUBLICIDADE_DIGITAL',
    ];

    for (const fragment of expectedFixGuards) {
      expect(fixPublicidadeMigrationSql).toContain(fragment);
    }

    expect(fixPublicidadeMigrationSql).not.toContain('ON CONFLICT');
  });
});
