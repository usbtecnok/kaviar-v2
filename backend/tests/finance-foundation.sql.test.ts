import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Client } from 'pg';

const databaseUrl = process.env.FINANCE_TEST_DATABASE_URL || process.env.DATABASE_URL || '';

function assertLocalDatabaseUrl(url: string) {
  if (!url) throw new Error('FINANCE_TEST_DATABASE_URL or DATABASE_URL is required');
  const parsed = new URL(url);
  const host = parsed.hostname;
  if (host !== '127.0.0.1' && host !== 'localhost') {
    throw new Error(`Refusing non-local database host: ${host}`);
  }
  return parsed;
}

const parsedUrl = assertLocalDatabaseUrl(databaseUrl);

const localDatabaseUrl = parsedUrl.toString();

const client = new Client({ connectionString: localDatabaseUrl });

const SQL_TEST_TERRITORY_ID = 'finance-phase1a-sql-test-territory';

async function withTransaction<T>(fn: () => Promise<T>) {
  await client.query('BEGIN');
  try {
    const result = await fn();
    await client.query('ROLLBACK');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function expectQueryFailure(queryText: string, values?: readonly unknown[]) {
  await client.query('SAVEPOINT finance_test_sp');
  try {
    await client.query(queryText, values);
    throw new Error('Expected query to fail');
  } catch (error) {
    await client.query('ROLLBACK TO SAVEPOINT finance_test_sp');
    return error;
  }
}

describe('finance foundation SQL constraints', () => {
  beforeAll(async () => {
    await client.connect();
    await client.query(
      `
        INSERT INTO operational_territories (
          id,
          name,
          level,
          status,
          regulatory_status,
          is_active,
          moto_express_enabled,
          moto_passenger_enabled,
          created_at,
          updated_at
        ) VALUES (
          $1,
          'Finance Phase 1A SQL Test Territory',
          'city',
          'active',
          'not_evaluated',
          true,
          false,
          false,
          now(),
          now()
        )
        ON CONFLICT (id) DO UPDATE
        SET
          name = EXCLUDED.name,
          level = EXCLUDED.level,
          status = EXCLUDED.status,
          regulatory_status = EXCLUDED.regulatory_status,
          is_active = EXCLUDED.is_active,
          moto_express_enabled = EXCLUDED.moto_express_enabled,
          moto_passenger_enabled = EXCLUDED.moto_passenger_enabled,
          updated_at = now()
      `,
      [SQL_TEST_TERRITORY_ID],
    );
  });

  beforeEach(async () => {
    await client.query('ROLLBACK').catch(() => undefined);
  });

  afterAll(async () => {
    await client.query(`DELETE FROM operational_territories WHERE id = $1`, [SQL_TEST_TERRITORY_ID]);
    await client.end();
  });

  it('rejects invalid recognition window', async () => {
    await withTransaction(async () => {
      await expect(client.query(`
        INSERT INTO financial_recognition_policies (
          id, code, subject, scope_type, policy, status, effective_from, effective_until,
          reason, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), 'sql.invalid.window', 'RIDE_REVENUE', 'GLOBAL', 'UNCLASSIFIED',
          'APPROVED', now(), now() - interval '1 minute', 'invalid window', now(), now()
        )
      `)).rejects.toThrow();
    });
  });

  it('rejects overlapping approved policies for same subject and scope', async () => {
    await withTransaction(async () => {
      await client.query(`
        INSERT INTO financial_recognition_policies (
          id, code, subject, scope_type, policy, status, effective_from, effective_until,
          reason, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), 'sql.overlap.one', 'RIDE_REVENUE', 'GLOBAL', 'UNCLASSIFIED',
          'APPROVED', '2026-01-01', '2026-02-01', 'one', now(), now()
        )
      `);

      await expect(client.query(`
        INSERT INTO financial_recognition_policies (
          id, code, subject, scope_type, policy, status, effective_from, effective_until,
          reason, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), 'sql.overlap.two', 'RIDE_REVENUE', 'GLOBAL', 'UNCLASSIFIED',
          'APPROVED', '2026-01-15', '2026-02-15', 'two', now(), now()
        )
      `)).rejects.toThrow();
    });
  });

  it('accepts adjacent approved policies', async () => {
    await withTransaction(async () => {
      await client.query(`
        INSERT INTO financial_recognition_policies (
          id, code, subject, scope_type, policy, status, effective_from, effective_until,
          reason, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), 'sql.adjacent.one', 'RIDE_REVENUE', 'GLOBAL', 'UNCLASSIFIED',
          'APPROVED', '2026-01-01', '2026-02-01', 'one', now(), now()
        )
      `);

      await expect(client.query(`
        INSERT INTO financial_recognition_policies (
          id, code, subject, scope_type, policy, status, effective_from, effective_until,
          reason, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), 'sql.adjacent.two', 'RIDE_REVENUE', 'GLOBAL', 'UNCLASSIFIED',
          'APPROVED', '2026-02-01', '2026-03-01', 'two', now(), now()
        )
      `)).resolves.toBeTruthy();
    });
  });

  it('allows same period for different subject or scope and lets DRAFT coexist', async () => {
    await withTransaction(async () => {
      await client.query(`
        INSERT INTO financial_recognition_policies (
          id, code, subject, scope_type, policy, status, effective_from, effective_until,
          reason, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), 'sql.base.approved', 'RIDE_REVENUE', 'GLOBAL', 'UNCLASSIFIED',
          'APPROVED', '2026-01-01', '2026-02-01', 'base', now(), now()
        )
      `);

      await expect(client.query(`
        INSERT INTO financial_recognition_policies (
          id, code, subject, scope_type, policy, status, effective_from, effective_until,
          reason, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), 'sql.other.subject', 'OTHER', 'GLOBAL', 'UNCLASSIFIED',
          'APPROVED', '2026-01-01', '2026-02-01', 'subject', now(), now()
        )
      `)).resolves.toBeTruthy();

      await expect(client.query(`
        INSERT INTO financial_recognition_policies (
          id, code, subject, scope_type, territory_id, policy, status, effective_from, effective_until,
          reason, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), 'sql.other.scope', 'RIDE_REVENUE', 'TERRITORY', $1, 'UNCLASSIFIED',
          'APPROVED', '2026-01-01', '2026-02-01', 'scope', now(), now()
        )
      `, [
        SQL_TEST_TERRITORY_ID,
      ])).resolves.toBeTruthy();

      await expect(client.query(`
        INSERT INTO financial_recognition_policies (
          id, code, subject, scope_type, policy, status, effective_from, effective_until,
          reason, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), 'sql.draft.coexist', 'RIDE_REVENUE', 'GLOBAL', 'UNCLASSIFIED',
          'DRAFT', '2026-01-10', '2026-01-20', 'draft', now(), now()
        )
      `)).resolves.toBeTruthy();
    });
  });

  it('enforces scope consistency rules', async () => {
    await withTransaction(async () => {
      const adminId = '88888888-0000-0000-0000-000000000001';
      const territoryId = SQL_TEST_TERRITORY_ID;

      await client.query(`
        INSERT INTO admins (id, name, email, password, role, is_active, must_change_password, created_at, updated_at)
        VALUES ($1, 'Scope Admin', 'scope-test@example.com', 'hash', 'SUPER_ADMIN', true, false, now(), now())
      `, [adminId]);

      await client.query(`
        INSERT INTO financial_cost_centers (id, code, name, type, is_active, created_by_admin_id, updated_by_admin_id, created_at, updated_at)
        VALUES ('cost-center-scope-test', 'sql.scope.cc', 'Centro Scope', 'COMPANY', true, $1, $1, now(), now())
      `, [adminId]);

      await expectQueryFailure(`
        INSERT INTO financial_recognition_policies (
          id, code, subject, scope_type, territory_id, policy, status, effective_from,
          reason, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), 'sql.scope.global.invalid', 'RIDE_REVENUE', 'GLOBAL', $1,
          'UNCLASSIFIED', 'DRAFT', '2026-01-01', 'x', now(), now()
        )
      `, [territoryId]);

      await expect(client.query(`
        INSERT INTO financial_recognition_policies (
          id, code, subject, scope_type, territory_id, policy, status, effective_from,
          reason, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), 'sql.scope.territory.valid', 'RIDE_REVENUE', 'TERRITORY', $1,
          'UNCLASSIFIED', 'DRAFT', '2026-01-01', 'ok', now(), now()
        )
      `, [territoryId])).resolves.toBeTruthy();

      await expect(client.query(`
        INSERT INTO financial_recognition_policies (
          id, code, subject, scope_type, cost_center_id, policy, status, effective_from,
          reason, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), 'sql.scope.cost-center.valid', 'RIDE_REVENUE', 'COST_CENTER', 'cost-center-scope-test',
          'UNCLASSIFIED', 'DRAFT', '2026-01-01', 'ok', now(), now()
        )
      `)).resolves.toBeTruthy();

      await expect(client.query(`
        INSERT INTO financial_recognition_policies (
          id, code, subject, scope_type, city, state, policy, status, effective_from,
          reason, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), 'sql.scope.city.valid', 'RIDE_REVENUE', 'CITY', 'Rio de Janeiro', 'RJ',
          'UNCLASSIFIED', 'DRAFT', '2026-01-01', 'ok', now(), now()
        )
      `)).resolves.toBeTruthy();
    });
  });

  it('validates account constraints and nullable fingerprint behavior', async () => {
    await withTransaction(async () => {
      const adminId = '11111111-1111-1111-1111-111111111111';
      await client.query(`
        INSERT INTO admins (id, name, email, password, role, is_active, must_change_password, created_at, updated_at)
        VALUES ($1, 'Finance Test', 'finance-test@example.com', 'hash', 'SUPER_ADMIN', true, false, now(), now())
      `, [adminId]);

      await expectQueryFailure(`
        INSERT INTO financial_accounts (
          id, code, name, type, opening_balance_cents, allows_negative_balance,
          is_cash_equivalent, is_active, account_fingerprint, created_by_admin_id, updated_by_admin_id,
          created_at, updated_at
        ) VALUES (
          gen_random_uuid(), 'sql.account.invalid.balance', 'Conta inválida', 'CASH', -1, false,
          true, true, null, $1, $1, now(), now()
        )
      `, [adminId]);

      await expect(client.query(`
        INSERT INTO financial_accounts (
          id, code, name, type, opening_balance_cents, allows_negative_balance,
          is_cash_equivalent, is_active, account_fingerprint, created_by_admin_id, updated_by_admin_id,
          created_at, updated_at
        ) VALUES (
          gen_random_uuid(), 'sql.account.valid.balance', 'Conta válida', 'CASH', -1, true,
          true, true, null, $1, $1, now(), now()
        )
      `, [adminId])).resolves.toBeTruthy();

      await client.query(`
        INSERT INTO financial_accounts (
          id, code, name, type, opening_balance_cents, allows_negative_balance,
          is_cash_equivalent, is_active, account_fingerprint, created_by_admin_id, updated_by_admin_id,
          created_at, updated_at
        ) VALUES (
          gen_random_uuid(), 'sql.account.fingerprint.one', 'Conta 1', 'BANK', 0, false,
          false, true, 'fingerprint-1', $1, $1, now(), now()
        )
      `, [adminId]);

      await expectQueryFailure(`
        INSERT INTO financial_accounts (
          id, code, name, type, opening_balance_cents, allows_negative_balance,
          is_cash_equivalent, is_active, account_fingerprint, created_by_admin_id, updated_by_admin_id,
          created_at, updated_at
        ) VALUES (
          gen_random_uuid(), 'sql.account.fingerprint.two', 'Conta 2', 'BANK', 0, false,
          false, true, 'fingerprint-1', $1, $1, now(), now()
        )
      `, [adminId]);

      await expect(client.query(`
        INSERT INTO financial_accounts (
          id, code, name, type, opening_balance_cents, allows_negative_balance,
          is_cash_equivalent, is_active, account_fingerprint, created_by_admin_id, updated_by_admin_id,
          created_at, updated_at
        ) VALUES (
          gen_random_uuid(), 'sql.account.null.fingerprint.one', 'Conta 3', 'CLEARING', 0, false,
          false, true, null, $1, $1, now(), now()
        )
      `, [adminId])).resolves.toBeTruthy();

      await expect(client.query(`
        INSERT INTO financial_accounts (
          id, code, name, type, opening_balance_cents, allows_negative_balance,
          is_cash_equivalent, is_active, account_fingerprint, created_by_admin_id, updated_by_admin_id,
          created_at, updated_at
        ) VALUES (
          gen_random_uuid(), 'sql.account.null.fingerprint.two', 'Conta 4', 'CLEARING', 0, false,
          false, true, null, $1, $1, now(), now()
        )
      `, [adminId])).resolves.toBeTruthy();
    });
  });

  it('enforces hierarchy and admin set null relations', async () => {
    await withTransaction(async () => {
      const adminId = '22222222-2222-2222-2222-222222222222';
      await client.query(`
        INSERT INTO admins (id, name, email, password, role, is_active, must_change_password, created_at, updated_at)
        VALUES ($1, 'Audit Admin', 'audit-test@example.com', 'hash', 'SUPER_ADMIN', true, false, now(), now())
      `, [adminId]);

      await expectQueryFailure(`
        INSERT INTO financial_categories (
          id, code, name, kind, parent_id, requires_document, is_system, is_active, is_postable, sort_order,
          created_by_admin_id, updated_by_admin_id, created_at, updated_at
        ) VALUES (
          'sql-category-self', 'sql.category.self.parent', 'Self', 'EXPENSE', 'sql-category-self',
          false, false, true, false, 0, $1, $1, now(), now()
        )
      `, [adminId]);

      await expectQueryFailure(`
        INSERT INTO financial_cost_centers (
          id, code, name, type, parent_id, is_active, created_by_admin_id, updated_by_admin_id,
          created_at, updated_at
        ) VALUES (
          'sql-cost-center-self', 'sql.cost.center.self', 'Self', 'COMPANY', 'sql-cost-center-self',
          true, $1, $1, now(), now()
        )
      `, [adminId]);

      const categoryId = '33333333-3333-3333-3333-333333333333';
      await client.query(`
        INSERT INTO financial_categories (
          id, code, name, kind, requires_document, is_system, is_active, is_postable, sort_order,
          created_by_admin_id, updated_by_admin_id, created_at, updated_at
        ) VALUES (
          $1, 'sql.category.parent', 'Parent', 'EXPENSE', false, false, true, false, 0, $2, $2, now(), now()
        )
      `, [categoryId, adminId]);

      await client.query(`
        INSERT INTO financial_categories (
          id, code, name, kind, parent_id, requires_document, is_system, is_active, is_postable, sort_order,
          created_by_admin_id, updated_by_admin_id, created_at, updated_at
        ) VALUES (
          '44444444-4444-4444-4444-444444444444', 'sql.category.child', 'Child', 'EXPENSE', $1,
          false, false, true, false, 0, $2, $2, now(), now()
        )
      `, [categoryId, adminId]);

      await client.query(`
        INSERT INTO financial_cost_centers (
          id, code, name, type, is_active, created_by_admin_id, updated_by_admin_id, created_at, updated_at
        ) VALUES (
          '55555555-5555-5555-5555-555555555555', 'sql.cost.center.parent', 'Parent', 'COMPANY', true,
          $1, $1, now(), now()
        )
      `, [adminId]);

      await client.query(`
        INSERT INTO financial_cost_centers (
          id, code, name, type, parent_id, is_active, created_by_admin_id, updated_by_admin_id, created_at, updated_at
        ) VALUES (
          '66666666-6666-6666-6666-666666666666', 'sql.cost.center.child', 'Child', 'DEPARTMENT',
          '55555555-5555-5555-5555-555555555555', true, $1, $1, now(), now()
        )
      `, [adminId]);

      await client.query(`DELETE FROM admins WHERE id = $1`, [adminId]);

      const categoryRow = await client.query(`SELECT created_by_admin_id, updated_by_admin_id FROM financial_categories WHERE id = $1`, [categoryId]);
      expect(categoryRow.rows[0].created_by_admin_id).toBeNull();
      expect(categoryRow.rows[0].updated_by_admin_id).toBeNull();

      const costCenterRow = await client.query(`SELECT created_by_admin_id, updated_by_admin_id FROM financial_cost_centers WHERE code = 'sql.cost.center.parent'`);
      expect(costCenterRow.rows[0].created_by_admin_id).toBeNull();
      expect(costCenterRow.rows[0].updated_by_admin_id).toBeNull();
    });
  });

  it('supports territory references when present and rejects missing territories', async () => {
    await withTransaction(async () => {
      const adminId = '77777777-7777-7777-7777-777777777777';
      await client.query(`
        INSERT INTO admins (id, name, email, password, role, is_active, must_change_password, created_at, updated_at)
        VALUES ($1, 'Territory Admin', 'territory-test@example.com', 'hash', 'SUPER_ADMIN', true, false, now(), now())
      `, [adminId]);

      await client.query(`
        INSERT INTO operational_territories (id, name, level, status, is_active, created_at, updated_at)
        VALUES ('territory-local-1', 'Território Local', 'city', 'active', true, now(), now())
      `);

      await expect(client.query(`
        INSERT INTO financial_cost_centers (
          id, code, name, type, territory_id, is_active, created_by_admin_id, updated_by_admin_id, created_at, updated_at
        ) VALUES (
          '88888888-8888-8888-8888-888888888888', 'sql.cost.center.territory.valid', 'Territory Center', 'TERRITORY',
          'territory-local-1', true, $1, $1, now(), now()
        )
      `, [adminId])).resolves.toBeTruthy();

      await expect(client.query(`
        INSERT INTO financial_cost_centers (
          id, code, name, type, territory_id, is_active, created_by_admin_id, updated_by_admin_id, created_at, updated_at
        ) VALUES (
          '99999999-9999-9999-9999-999999999999', 'sql.cost.center.territory.invalid', 'Territory Center', 'TERRITORY',
          'territory-does-not-exist', true, $1, $1, now(), now()
        )
      `, [adminId])).rejects.toThrow();
    });
  });
});