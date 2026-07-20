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
const client = new Client({ connectionString: parsedUrl.toString() });

const IDS = {
  admin: 'finance-phase1b-admin',
  accountMain: 'finance-phase1b-account-main',
  accountCounterparty: 'finance-phase1b-account-counterparty',
  category: 'finance-phase1b-category',
  costCenter: 'finance-phase1b-cost-center',
};

let txSeq = 0;
let allocSeq = 0;
let linkSeq = 0;

function nextTxId() {
  txSeq += 1;
  return `finance-phase1b-tx-${txSeq}`;
}

function nextAllocId() {
  allocSeq += 1;
  return `finance-phase1b-alloc-${allocSeq}`;
}

function nextLinkId() {
  linkSeq += 1;
  return `finance-phase1b-link-${linkSeq}`;
}

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
  await client.query('SAVEPOINT finance_phase1b_sp');
  try {
    await client.query(queryText, values);
    throw new Error('Expected query to fail');
  } catch (error) {
    await client.query('ROLLBACK TO SAVEPOINT finance_phase1b_sp');
    return error;
  }
}

type TxOverrides = Partial<{
  id: string;
  account_id: string;
  counterparty_account_id: string | null;
  category_id: string | null;
  cost_center_id: string | null;
  transfer_group_id: string | null;
  direction: string;
  transaction_type: string;
  status: string;
  payment_method: string | null;
  recognition_policy: string | null;
  gross_amount_cents: number;
  fee_amount_cents: number;
  discount_amount_cents: number;
  retention_amount_cents: number;
  net_amount_cents: number;
  transfer_amount_cents: number | null;
  reversal_of_id: string | null;
  canceled_reason: string | null;
  canceled_at: string | null;
  description: string;
  idempotency_key: string | null;
  source_type: string;
  source_id: string | null;
  provider: string | null;
  provider_event_id: string | null;
  external_reference: string | null;
  origin_type: string;
  origin_id: string | null;
  created_by_admin_id: string | null;
  approved_by_admin_id: string | null;
  responsible_admin_id: string | null;
}>;

async function insertTransaction(overrides: TxOverrides = {}) {
  const row = {
    id: overrides.id ?? nextTxId(),
    account_id: overrides.account_id ?? IDS.accountMain,
    counterparty_account_id: overrides.counterparty_account_id ?? null,
    category_id: overrides.category_id ?? null,
    cost_center_id: overrides.cost_center_id ?? null,
    transfer_group_id: overrides.transfer_group_id ?? null,
    direction: overrides.direction ?? 'IN',
    transaction_type: overrides.transaction_type ?? 'INCOME',
    status: overrides.status ?? 'DRAFT',
    payment_method: overrides.payment_method ?? null,
    recognition_policy: overrides.recognition_policy ?? null,
    gross_amount_cents: overrides.gross_amount_cents ?? 1000,
    fee_amount_cents: overrides.fee_amount_cents ?? 0,
    discount_amount_cents: overrides.discount_amount_cents ?? 0,
    retention_amount_cents: overrides.retention_amount_cents ?? 0,
    net_amount_cents: overrides.net_amount_cents ?? 1000,
    transfer_amount_cents: overrides.transfer_amount_cents ?? null,
    reversal_of_id: overrides.reversal_of_id ?? null,
    canceled_reason: overrides.canceled_reason ?? null,
    canceled_at: overrides.canceled_at ?? null,
    description: overrides.description ?? 'phase1b transaction',
    idempotency_key: overrides.idempotency_key ?? null,
    source_type: overrides.source_type ?? 'MANUAL',
    source_id: overrides.source_id ?? null,
    provider: overrides.provider ?? null,
    provider_event_id: overrides.provider_event_id ?? null,
    external_reference: overrides.external_reference ?? null,
    origin_type: overrides.origin_type ?? 'MANUAL',
    origin_id: overrides.origin_id ?? null,
    created_by_admin_id: overrides.created_by_admin_id ?? IDS.admin,
    approved_by_admin_id: overrides.approved_by_admin_id ?? null,
    responsible_admin_id: overrides.responsible_admin_id ?? null,
  };

  await client.query(
    `
      INSERT INTO financial_transactions (
        id, external_reference, provider, provider_event_id,
        source_type, source_id, origin_type, origin_id,
        account_id, counterparty_account_id, category_id, cost_center_id, transfer_group_id,
        direction, transaction_type, status, payment_method, recognition_policy,
        competence_date, transaction_date, due_date, settlement_date,
        gross_amount_cents, fee_amount_cents, discount_amount_cents, retention_amount_cents,
        net_amount_cents, transfer_amount_cents,
        reversal_of_id, canceled_reason, canceled_at,
        description, memo, metadata, idempotency_key,
        created_by_admin_id, approved_by_admin_id, responsible_admin_id,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4,
        $5::financial_source_type, $6, $7::financial_origin_type, $8,
        $9, $10, $11, $12, $13,
        $14::financial_direction, $15::financial_transaction_type, $16::financial_transaction_status, $17::financial_payment_method, $18::financial_recognition_policy,
        now(), now(), null, $19,
        $20, $21, $22, $23,
        $24, $25,
        $26, $27, $28,
        $29, null, null, $30,
        $31, $32, $33,
        now(), now()
      )
    `,
    [
      row.id,
      row.external_reference,
      row.provider,
      row.provider_event_id,
      row.source_type,
      row.source_id,
      row.origin_type,
      row.origin_id,
      row.account_id,
      row.counterparty_account_id,
      row.category_id,
      row.cost_center_id,
      row.transfer_group_id,
      row.direction,
      row.transaction_type,
      row.status,
      row.payment_method,
      row.recognition_policy,
      row.settlement_date,
      row.gross_amount_cents,
      row.fee_amount_cents,
      row.discount_amount_cents,
      row.retention_amount_cents,
      row.net_amount_cents,
      row.transfer_amount_cents,
      row.reversal_of_id,
      row.canceled_reason,
      row.canceled_at,
      row.description,
      row.idempotency_key,
      row.created_by_admin_id,
      row.approved_by_admin_id,
      row.responsible_admin_id,
    ],
  );

  return row.id;
}

async function insertAllocation(transactionId: string, overrides?: Partial<{
  id: string;
  category_id: string;
  cost_center_id: string | null;
  amount_cents: number;
  allocation_type: string;
  description: string | null;
  created_by_admin_id: string | null;
}>) {
  const row = {
    id: overrides?.id ?? nextAllocId(),
    category_id: overrides?.category_id ?? IDS.category,
    cost_center_id: overrides?.cost_center_id ?? null,
    amount_cents: overrides?.amount_cents ?? 100,
    allocation_type: overrides?.allocation_type ?? 'ALLOCATED',
    description: overrides?.description ?? null,
    created_by_admin_id: overrides?.created_by_admin_id ?? IDS.admin,
  };

  await client.query(
    `
      INSERT INTO financial_transaction_allocations (
        id, transaction_id, category_id, cost_center_id,
        amount_cents, allocation_type, description, metadata,
        created_by_admin_id, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6::financial_transaction_allocation_type, $7, null,
        $8, now(), now()
      )
    `,
    [
      row.id,
      transactionId,
      row.category_id,
      row.cost_center_id,
      row.amount_cents,
      row.allocation_type,
      row.description,
      row.created_by_admin_id,
    ],
  );

  return row.id;
}

async function insertLink(transactionId: string, linkedTransactionId: string, overrides?: Partial<{
  id: string;
  link_type: string;
  amount_cents: number | null;
  created_by_admin_id: string | null;
}>) {
  const row = {
    id: overrides?.id ?? nextLinkId(),
    link_type: overrides?.link_type ?? 'SETTLEMENT',
    amount_cents: overrides?.amount_cents ?? null,
    created_by_admin_id: overrides?.created_by_admin_id ?? IDS.admin,
  };

  await client.query(
    `
      INSERT INTO financial_transaction_links (
        id, transaction_id, linked_transaction_id,
        link_type, amount_cents, metadata,
        created_by_admin_id, created_at, updated_at
      ) VALUES (
        $1, $2, $3,
        $4::financial_transaction_link_type, $5, null,
        $6, now(), now()
      )
    `,
    [row.id, transactionId, linkedTransactionId, row.link_type, row.amount_cents, row.created_by_admin_id],
  );

  return row.id;
}

describe('finance ledger phase 1B SQL constraints', () => {
  beforeAll(async () => {
    await client.connect();

    await client.query(
      `
        DELETE FROM financial_transaction_links WHERE created_by_admin_id = $1
      `,
      [IDS.admin],
    );
    await client.query(
      `
        DELETE FROM financial_transaction_allocations WHERE created_by_admin_id = $1
      `,
      [IDS.admin],
    );
    await client.query(
      `
        DELETE FROM financial_transactions
        WHERE id LIKE 'finance-phase1b-tx-%' OR id IN ('finance-phase1b-tx-base-a', 'finance-phase1b-tx-base-b')
      `,
    );

    await client.query(`DELETE FROM financial_cost_centers WHERE id = $1`, [IDS.costCenter]);
    await client.query(`DELETE FROM financial_categories WHERE id = $1`, [IDS.category]);
    await client.query(`DELETE FROM financial_accounts WHERE id IN ($1, $2)`, [IDS.accountMain, IDS.accountCounterparty]);
    await client.query(`DELETE FROM admins WHERE id = $1`, [IDS.admin]);

    await client.query(
      `
        INSERT INTO admins (id, name, email, password, role, is_active, must_change_password, created_at, updated_at)
        VALUES ($1, 'Finance Phase1B Admin', 'finance-phase1b-admin@example.com', 'hash', 'SUPER_ADMIN', true, false, now(), now())
      `,
      [IDS.admin],
    );

    await client.query(
      `
        INSERT INTO financial_accounts (
          id, code, name, type, currency, opening_balance_cents,
          allows_negative_balance, is_cash_equivalent, is_active,
          created_by_admin_id, updated_by_admin_id, created_at, updated_at
        ) VALUES
        ($1, 'phase1b.main', 'Phase1B Main', 'BANK', 'BRL', 0, false, false, true, $3, $3, now(), now()),
        ($2, 'phase1b.counterparty', 'Phase1B Counterparty', 'BANK', 'BRL', 0, false, false, true, $3, $3, now(), now())
      `,
      [IDS.accountMain, IDS.accountCounterparty, IDS.admin],
    );

    await client.query(
      `
        INSERT INTO financial_categories (
          id, code, name, kind, default_direction,
          requires_document, is_system, is_active, is_postable, sort_order,
          created_by_admin_id, updated_by_admin_id, created_at, updated_at
        ) VALUES (
          $1, 'phase1b.cat', 'Phase1B Category', 'REVENUE', 'IN',
          false, false, true, false, 1,
          $2, $2, now(), now()
        )
      `,
      [IDS.category, IDS.admin],
    );

    await client.query(
      `
        INSERT INTO financial_cost_centers (
          id, code, name, type, is_active,
          created_by_admin_id, updated_by_admin_id, created_at, updated_at
        ) VALUES (
          $1, 'phase1b.cc', 'Phase1B Cost Center', 'COMPANY', true,
          $2, $2, now(), now()
        )
      `,
      [IDS.costCenter, IDS.admin],
    );
  });

  beforeEach(async () => {
    await client.query('ROLLBACK').catch(() => undefined);
  });

  afterAll(async () => {
    await client.query(`DELETE FROM financial_transaction_links WHERE created_by_admin_id = $1`, [IDS.admin]);
    await client.query(`DELETE FROM financial_transaction_allocations WHERE created_by_admin_id = $1`, [IDS.admin]);
    await client.query(
      `DELETE FROM financial_transactions WHERE id LIKE 'finance-phase1b-tx-%' OR id IN ('finance-phase1b-tx-base-a', 'finance-phase1b-tx-base-b')`,
    );
    await client.query(`DELETE FROM financial_cost_centers WHERE id = $1`, [IDS.costCenter]);
    await client.query(`DELETE FROM financial_categories WHERE id = $1`, [IDS.category]);
    await client.query(`DELETE FROM financial_accounts WHERE id IN ($1, $2)`, [IDS.accountMain, IDS.accountCounterparty]);
    await client.query(`DELETE FROM admins WHERE id = $1`, [IDS.admin]);
    await client.end();
  });

  it('rejects negative gross amount', async () => {
    await withTransaction(async () => {
      await expect(insertTransaction({ gross_amount_cents: -1 })).rejects.toThrow();
    });
  });

  it('rejects negative fee amount', async () => {
    await withTransaction(async () => {
      await expect(insertTransaction({ fee_amount_cents: -1 })).rejects.toThrow();
    });
  });

  it('rejects negative discount amount', async () => {
    await withTransaction(async () => {
      await expect(insertTransaction({ discount_amount_cents: -1 })).rejects.toThrow();
    });
  });

  it('rejects negative retention amount', async () => {
    await withTransaction(async () => {
      await expect(insertTransaction({ retention_amount_cents: -1 })).rejects.toThrow();
    });
  });

  it('rejects negative net amount', async () => {
    await withTransaction(async () => {
      await expect(insertTransaction({ net_amount_cents: -1 })).rejects.toThrow();
    });
  });

  it('rejects negative transfer amount', async () => {
    await withTransaction(async () => {
      await expect(
        insertTransaction({
          transaction_type: 'TRANSFER',
          direction: 'OUT',
          transfer_group_id: 'tg-negative',
          counterparty_account_id: IDS.accountCounterparty,
          transfer_amount_cents: -1,
        }),
      ).rejects.toThrow();
    });
  });

  it('accepts zero values when valid', async () => {
    await withTransaction(async () => {
      await expect(
        insertTransaction({
          gross_amount_cents: 0,
          fee_amount_cents: 0,
          discount_amount_cents: 0,
          retention_amount_cents: 0,
          net_amount_cents: 0,
        }),
      ).resolves.toBeTruthy();
    });
  });

  it('rejects reversal_of_id equal to same id', async () => {
    await withTransaction(async () => {
      const id = 'finance-phase1b-tx-self-reversal';
      await expect(insertTransaction({ id, reversal_of_id: id })).rejects.toThrow();
    });
  });

  it('accepts reversal pointing to another transaction', async () => {
    await withTransaction(async () => {
      const baseId = await insertTransaction({ id: 'finance-phase1b-tx-base-a', status: 'POSTED' });
      await expect(
        insertTransaction({
          id: 'finance-phase1b-tx-base-b',
          transaction_type: 'REVERSAL',
          status: 'POSTED',
          reversal_of_id: baseId,
          direction: 'OUT',
        }),
      ).resolves.toBeTruthy();
    });
  });

  it('rejects CANCELED without reason', async () => {
    await withTransaction(async () => {
      await expect(
        insertTransaction({ status: 'CANCELED', canceled_at: new Date().toISOString(), canceled_reason: null }),
      ).rejects.toThrow();
    });
  });

  it('rejects CANCELED without canceled_at', async () => {
    await withTransaction(async () => {
      await expect(insertTransaction({ status: 'CANCELED', canceled_reason: 'requested by admin', canceled_at: null })).rejects.toThrow();
    });
  });

  it('accepts complete CANCELED payload', async () => {
    await withTransaction(async () => {
      await expect(
        insertTransaction({ status: 'CANCELED', canceled_reason: 'requested by admin', canceled_at: new Date().toISOString() }),
      ).resolves.toBeTruthy();
    });
  });

  it('rejects non-canceled status with canceled_reason', async () => {
    await withTransaction(async () => {
      await expect(insertTransaction({ status: 'POSTED', canceled_reason: 'should fail' })).rejects.toThrow();
    });
  });

  it('rejects non-canceled status with canceled_at', async () => {
    await withTransaction(async () => {
      await expect(insertTransaction({ status: 'POSTED', canceled_at: new Date().toISOString() })).rejects.toThrow();
    });
  });

  it('rejects TRANSFER without transfer_group_id', async () => {
    await withTransaction(async () => {
      await expect(
        insertTransaction({ transaction_type: 'TRANSFER', direction: 'OUT', counterparty_account_id: IDS.accountCounterparty, transfer_amount_cents: 50 }),
      ).rejects.toThrow();
    });
  });

  it('rejects TRANSFER without counterparty account', async () => {
    await withTransaction(async () => {
      await expect(
        insertTransaction({ transaction_type: 'TRANSFER', direction: 'OUT', transfer_group_id: 'tg-1', transfer_amount_cents: 50 }),
      ).rejects.toThrow();
    });
  });

  it('rejects TRANSFER without transfer_amount', async () => {
    await withTransaction(async () => {
      await expect(
        insertTransaction({ transaction_type: 'TRANSFER', direction: 'OUT', transfer_group_id: 'tg-1', counterparty_account_id: IDS.accountCounterparty }),
      ).rejects.toThrow();
    });
  });

  it('accepts valid TRANSFER', async () => {
    await withTransaction(async () => {
      await expect(
        insertTransaction({
          transaction_type: 'TRANSFER',
          direction: 'OUT',
          transfer_group_id: 'tg-valid',
          counterparty_account_id: IDS.accountCounterparty,
          transfer_amount_cents: 250,
        }),
      ).resolves.toBeTruthy();
    });
  });

  it('rejects transfer with equal account and counterparty account', async () => {
    await withTransaction(async () => {
      await expect(
        insertTransaction({
          transaction_type: 'TRANSFER',
          direction: 'OUT',
          account_id: IDS.accountMain,
          counterparty_account_id: IDS.accountMain,
          transfer_group_id: 'tg-self',
          transfer_amount_cents: 100,
        }),
      ).rejects.toThrow();
    });
  });

  it('rejects non-transfer with transfer_group_id', async () => {
    await withTransaction(async () => {
      await expect(insertTransaction({ transaction_type: 'INCOME', transfer_group_id: 'tg-wrong' })).rejects.toThrow();
    });
  });

  it('rejects non-transfer with transfer_amount', async () => {
    await withTransaction(async () => {
      await expect(insertTransaction({ transaction_type: 'INCOME', transfer_amount_cents: 1 })).rejects.toThrow();
    });
  });

  it('rejects duplicate idempotency_key', async () => {
    await withTransaction(async () => {
      await insertTransaction({ idempotency_key: 'idem-dup-1' });
      await expect(insertTransaction({ idempotency_key: 'idem-dup-1' })).rejects.toThrow();
    });
  });

  it('accepts multiple null idempotency_key values', async () => {
    await withTransaction(async () => {
      await expect(insertTransaction({ idempotency_key: null })).resolves.toBeTruthy();
      await expect(insertTransaction({ idempotency_key: null })).resolves.toBeTruthy();
    });
  });

  it('rejects duplicate non-null source_type + source_id', async () => {
    await withTransaction(async () => {
      await insertTransaction({ source_type: 'MANUAL', source_id: 'src-1' });
      await expect(insertTransaction({ source_type: 'MANUAL', source_id: 'src-1' })).rejects.toThrow();
    });
  });

  it('accepts multiple null source_id values', async () => {
    await withTransaction(async () => {
      await expect(insertTransaction({ source_type: 'MANUAL', source_id: null })).resolves.toBeTruthy();
      await expect(insertTransaction({ source_type: 'MANUAL', source_id: null })).resolves.toBeTruthy();
    });
  });

  it('rejects duplicate provider + provider_event_id', async () => {
    await withTransaction(async () => {
      await insertTransaction({ provider: 'sumup', provider_event_id: 'evt-1' });
      await expect(insertTransaction({ provider: 'sumup', provider_event_id: 'evt-1' })).rejects.toThrow();
    });
  });

  it('accepts equal external_reference across different source_type', async () => {
    await withTransaction(async () => {
      await expect(insertTransaction({ source_type: 'MANUAL', external_reference: 'ext-1' })).resolves.toBeTruthy();
      await expect(insertTransaction({ source_type: 'ACCOUNTING', external_reference: 'ext-1' })).resolves.toBeTruthy();
    });
  });

  it('rejects equal external_reference within same source_type', async () => {
    await withTransaction(async () => {
      await insertTransaction({ source_type: 'MANUAL', external_reference: 'ext-same' });
      await expect(insertTransaction({ source_type: 'MANUAL', external_reference: 'ext-same' })).rejects.toThrow();
    });
  });

  it('rejects non-existent account_id', async () => {
    await withTransaction(async () => {
      await expect(insertTransaction({ account_id: 'finance-phase1b-missing-account' })).rejects.toThrow();
    });
  });

  it('rejects non-existent category when provided', async () => {
    await withTransaction(async () => {
      await expect(insertTransaction({ category_id: 'finance-phase1b-missing-category' })).rejects.toThrow();
    });
  });

  it('rejects non-existent cost center when provided', async () => {
    await withTransaction(async () => {
      await expect(insertTransaction({ cost_center_id: 'finance-phase1b-missing-cost-center' })).rejects.toThrow();
    });
  });

  it('rejects non-existent admin when provided', async () => {
    await withTransaction(async () => {
      await expect(insertTransaction({ created_by_admin_id: 'finance-phase1b-missing-admin' })).rejects.toThrow();
    });
  });

  it('applies SET NULL when deleting admin', async () => {
    await withTransaction(async () => {
      await client.query(
        `
          INSERT INTO admins (id, name, email, password, role, is_active, must_change_password, created_at, updated_at)
          VALUES ('finance-phase1b-admin-delete', 'Delete Admin', 'finance-phase1b-admin-delete@example.com', 'hash', 'SUPER_ADMIN', true, false, now(), now())
        `,
      );

      const txId = await insertTransaction({ created_by_admin_id: 'finance-phase1b-admin-delete' });
      await client.query(`DELETE FROM admins WHERE id = 'finance-phase1b-admin-delete'`);

      const result = await client.query(`SELECT created_by_admin_id FROM financial_transactions WHERE id = $1`, [txId]);
      expect(result.rows[0]?.created_by_admin_id).toBeNull();
    });
  });

  it('blocks deletion of referenced account', async () => {
    await withTransaction(async () => {
      await insertTransaction({ account_id: IDS.accountMain });
      await expect(client.query(`DELETE FROM financial_accounts WHERE id = $1`, [IDS.accountMain])).rejects.toThrow();
    });
  });

  it('applies SET NULL when deleting directly used category', async () => {
    await withTransaction(async () => {
      await client.query(
        `
          INSERT INTO financial_categories (
            id, code, name, kind, default_direction,
            requires_document, is_system, is_active, is_postable, sort_order,
            created_by_admin_id, updated_by_admin_id, created_at, updated_at
          ) VALUES (
            'finance-phase1b-category-delete', 'phase1b.cat.delete', 'Delete Category', 'REVENUE', 'IN',
            false, false, true, false, 1,
            $1, $1, now(), now()
          )
        `,
        [IDS.admin],
      );

      const txId = await insertTransaction({ category_id: 'finance-phase1b-category-delete' });
      await client.query(`DELETE FROM financial_categories WHERE id = 'finance-phase1b-category-delete'`);

      const result = await client.query(`SELECT category_id FROM financial_transactions WHERE id = $1`, [txId]);
      expect(result.rows[0]?.category_id).toBeNull();
    });
  });

  it('applies SET NULL when deleting directly used cost center', async () => {
    await withTransaction(async () => {
      await client.query(
        `
          INSERT INTO financial_cost_centers (
            id, code, name, type, is_active,
            created_by_admin_id, updated_by_admin_id, created_at, updated_at
          ) VALUES (
            'finance-phase1b-cc-delete', 'phase1b.cc.delete', 'Delete CC', 'COMPANY', true,
            $1, $1, now(), now()
          )
        `,
        [IDS.admin],
      );

      const txId = await insertTransaction({ cost_center_id: 'finance-phase1b-cc-delete' });
      await client.query(`DELETE FROM financial_cost_centers WHERE id = 'finance-phase1b-cc-delete'`);

      const result = await client.query(`SELECT cost_center_id FROM financial_transactions WHERE id = $1`, [txId]);
      expect(result.rows[0]?.cost_center_id).toBeNull();
    });
  });

  it('rejects allocation amount zero', async () => {
    await withTransaction(async () => {
      const txId = await insertTransaction();
      await expect(insertAllocation(txId, { amount_cents: 0 })).rejects.toThrow();
    });
  });

  it('rejects allocation amount negative', async () => {
    await withTransaction(async () => {
      const txId = await insertTransaction();
      await expect(insertAllocation(txId, { amount_cents: -10 })).rejects.toThrow();
    });
  });

  it('accepts valid allocation', async () => {
    await withTransaction(async () => {
      const txId = await insertTransaction();
      await expect(insertAllocation(txId, { amount_cents: 10 })).resolves.toBeTruthy();
    });
  });

  it('rejects functional duplicate allocation with null cost center', async () => {
    await withTransaction(async () => {
      const txId = await insertTransaction();
      await insertAllocation(txId, { allocation_type: 'ALLOCATED', description: null });
      await expect(insertAllocation(txId, { allocation_type: 'ALLOCATED', description: null })).rejects.toThrow();
    });
  });

  it('rejects allocation with non-existent category', async () => {
    await withTransaction(async () => {
      const txId = await insertTransaction();
      await expect(insertAllocation(txId, { category_id: 'finance-phase1b-missing-category' })).rejects.toThrow();
    });
  });

  it('rejects allocation with non-existent cost center', async () => {
    await withTransaction(async () => {
      const txId = await insertTransaction();
      await expect(insertAllocation(txId, { cost_center_id: 'finance-phase1b-missing-cost-center' })).rejects.toThrow();
    });
  });

  it('deletes allocations by CASCADE when transaction is deleted', async () => {
    await withTransaction(async () => {
      const txId = await insertTransaction();
      const allocationId = await insertAllocation(txId, { amount_cents: 99 });
      await client.query(`DELETE FROM financial_transactions WHERE id = $1`, [txId]);
      const result = await client.query(`SELECT 1 FROM financial_transaction_allocations WHERE id = $1`, [allocationId]);
      expect(result.rowCount).toBe(0);
    });
  });

  it('rejects allocation insert when transaction already has direct category', async () => {
    await withTransaction(async () => {
      const txId = await insertTransaction({ category_id: IDS.category });
      await expect(insertAllocation(txId)).rejects.toThrow();
    });
  });

  it('rejects setting direct category when transaction already has allocation', async () => {
    await withTransaction(async () => {
      const txId = await insertTransaction();
      await insertAllocation(txId);
      await expect(
        client.query(`UPDATE financial_transactions SET category_id = $2 WHERE id = $1`, [txId, IDS.category]),
      ).rejects.toThrow();
    });
  });

  it('rejects self-link', async () => {
    await withTransaction(async () => {
      const txId = await insertTransaction();
      await expect(insertLink(txId, txId)).rejects.toThrow();
    });
  });

  it('accepts valid link', async () => {
    await withTransaction(async () => {
      const txA = await insertTransaction();
      const txB = await insertTransaction();
      await expect(insertLink(txA, txB)).resolves.toBeTruthy();
    });
  });

  it('rejects duplicate link', async () => {
    await withTransaction(async () => {
      const txA = await insertTransaction();
      const txB = await insertTransaction();
      await insertLink(txA, txB, { link_type: 'SETTLEMENT' });
      await expect(insertLink(txA, txB, { link_type: 'SETTLEMENT' })).rejects.toThrow();
    });
  });

  it('rejects link amount zero', async () => {
    await withTransaction(async () => {
      const txA = await insertTransaction();
      const txB = await insertTransaction();
      await expect(insertLink(txA, txB, { amount_cents: 0 })).rejects.toThrow();
    });
  });

  it('rejects link amount negative', async () => {
    await withTransaction(async () => {
      const txA = await insertTransaction();
      const txB = await insertTransaction();
      await expect(insertLink(txA, txB, { amount_cents: -1 })).rejects.toThrow();
    });
  });

  it('deletes links by CASCADE when transaction is deleted', async () => {
    await withTransaction(async () => {
      const txA = await insertTransaction();
      const txB = await insertTransaction();
      const linkId = await insertLink(txA, txB);
      await client.query(`DELETE FROM financial_transactions WHERE id = $1`, [txA]);
      const result = await client.query(`SELECT 1 FROM financial_transaction_links WHERE id = $1`, [linkId]);
      expect(result.rowCount).toBe(0);
    });
  });

  it('uses explicit savepoint helper for expected failures', async () => {
    await withTransaction(async () => {
      const error = await expectQueryFailure(
        `
          INSERT INTO financial_transaction_links (
            id, transaction_id, linked_transaction_id, link_type,
            created_at, updated_at
          ) VALUES (
            'finance-phase1b-link-bad', 'x', 'x', 'SETTLEMENT', now(), now()
          )
        `,
      );
      expect(error).toBeTruthy();
    });
  });
});
