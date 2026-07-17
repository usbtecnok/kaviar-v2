import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const schemaPath = resolve(process.cwd(), 'prisma/schema.prisma');
const seedPath = resolve(process.cwd(), 'prisma/seed.ts');

const schema = readFileSync(schemaPath, 'utf8');
const seed = readFileSync(seedPath, 'utf8');

function getBlock(kind: 'enum' | 'model', name: string) {
  const regex = new RegExp(`${kind}\\s+${name}\\s*\\{[\\s\\S]*?\\n\\}`, 'm');
  const match = schema.match(regex);
  return match ? match[0] : '';
}

describe('finance ledger phase 1B schema contract', () => {
  it('declares exactly the seven new enums with expected values', () => {
    const expectedEnums: Array<[string, string[]]> = [
      ['financial_transaction_type', ['INCOME', 'EXPENSE', 'TRANSFER', 'RECEIVABLE', 'PAYABLE', 'ADJUSTMENT', 'REVERSAL', 'REFUND', 'RECONCILIATION', 'ACCRUAL', 'SETTLEMENT', 'WITHDRAWAL', 'DEPOSIT', 'TAX', 'FEE', 'COMPENSATION']],
      ['financial_transaction_status', ['DRAFT', 'PENDING', 'POSTED', 'CANCELED', 'REVERSED', 'BLOCKED', 'RECONCILED', 'CLOSED']],
      ['financial_payment_method', ['PIX', 'ASAAS', 'SUMUP', 'BANK_TRANSFER', 'TED', 'DOC', 'CASH', 'CARD', 'BOLETO', 'INTERNAL', 'NONE']],
      ['financial_source_type', ['RIDE', 'DRIVER_WALLET', 'CREDIT_SALE', 'TERRITORIAL_PAYOUT', 'COMMERCIAL_ORDER', 'MANUAL', 'BANK_IMPORT', 'BANK_WEBHOOK', 'PAYMENT_PROVIDER', 'NFSE', 'ACCOUNTING', 'REFUND', 'TAX', 'ADJUSTMENT']],
      ['financial_origin_type', ['OPERATIONAL', 'COMMERCIAL', 'BANK', 'PROVIDER', 'MANUAL', 'ACCOUNTING', 'TAX', 'INTERNAL']],
      ['financial_transaction_allocation_type', ['SIMPLE', 'ALLOCATED', 'ADJUSTMENT', 'RECLASSIFICATION']],
      ['financial_transaction_link_type', ['SETTLEMENT', 'TRANSFER_PAIR', 'REVERSAL', 'DOCUMENT_LINK', 'RECONCILIATION', 'COMPETENCE', 'RATEIO', 'ACCOUNTANT_REVIEW']],
    ];

    for (const [enumName, values] of expectedEnums) {
      const block = getBlock('enum', enumName);
      expect(block.length).toBeGreaterThan(0);
      for (const value of values) {
        expect(block).toContain(`  ${value}`);
      }
    }
  });

  it('declares exactly the three new models', () => {
    expect(getBlock('model', 'financial_transactions')).toContain('@@map("financial_transactions")');
    expect(getBlock('model', 'financial_transaction_allocations')).toContain('@@map("financial_transaction_allocations")');
    expect(getBlock('model', 'financial_transaction_links')).toContain('@@map("financial_transaction_links")');
  });

  it('contains required inverse relations on existing models', () => {
    const admins = getBlock('model', 'admins');
    const accounts = getBlock('model', 'financial_accounts');
    const categories = getBlock('model', 'financial_categories');
    const costCenters = getBlock('model', 'financial_cost_centers');

    expect(admins).toContain('financial_transactions_created');
    expect(admins).toContain('financial_transactions_approved');
    expect(admins).toContain('financial_transactions_responsible');
    expect(admins).toContain('financial_transaction_allocations_created');
    expect(admins).toContain('financial_transaction_links_created');

    expect(accounts).toContain('transactions_as_account');
    expect(accounts).toContain('transactions_as_counterparty');

    expect(categories).toContain('financial_transactions');
    expect(categories).toContain('financial_transaction_allocations');

    expect(costCenters).toContain('financial_transactions');
    expect(costCenters).toContain('financial_transaction_allocations');
  });

  it('does not add out-of-scope models', () => {
    const forbiddenModels = [
      'financial_documents',
      'financial_document_links',
      'monthly_financial_closings',
      'accountant_requests',
      'bank_imports',
      'bank_reconciliations',
      'nfse_documents',
    ];

    for (const modelName of forbiddenModels) {
      expect(schema).not.toMatch(new RegExp(`model\\s+${modelName}\\b`));
    }
  });

  it('does not seed financial transactions/allocations/links', () => {
    expect(seed).not.toContain('financial_transactions');
    expect(seed).not.toContain('financial_transaction_allocations');
    expect(seed).not.toContain('financial_transaction_links');
  });

  it('does not create relational coupling to rides/wallet/providers in phase 1B models', () => {
    const tx = getBlock('model', 'financial_transactions');
    const alloc = getBlock('model', 'financial_transaction_allocations');
    const links = getBlock('model', 'financial_transaction_links');

    for (const block of [tx, alloc, links]) {
      expect(block).not.toContain('rides_v2');
      expect(block).not.toContain('wallets');
      expect(block).not.toContain('wallet_');
      expect(block).not.toContain('@relation(fields: [ride_id]');
      expect(block).not.toContain('@relation(fields: [wallet_id]');
      expect(block).not.toContain('@relation(fields: [provider_id]');
    }
  });
});
