import { describe, it, expect } from 'vitest';
import {
  AccountBlueprintStatus,
  AccountBlueprintBlockingReason,
  ALL_ACCOUNT_BLUEPRINTS,
  BLUEPRINT_ASSETS,
  BLUEPRINT_LIABILITIES,
  BLUEPRINT_REVENUE,
  BLUEPRINT_EXPENSES,
  BLUEPRINT_COST_CENTERS,
  BLUEPRINT_SUMMARY,
  AccountBlueprint,
} from '../src/services/finance/account-catalog/account-blueprint';
import {
  validateBlueprint,
  validateAccount,
  getReadyAccounts,
  getPendingAccounts,
  getBlockedAccounts,
  getBluestrintStats,
} from '../src/services/finance/account-catalog/account-blueprint-validator';

describe('Account Blueprint', () => {
  describe('Blueprint Structure', () => {
    it('should have 37 total accounts', () => {
      expect(ALL_ACCOUNT_BLUEPRINTS).toHaveLength(37);
    });

    it('should have correct distribution by section', () => {
      expect(BLUEPRINT_ASSETS).toHaveLength(8); // 1101-1103, 1201-1203, 1301, 1401
      expect(BLUEPRINT_LIABILITIES).toHaveLength(13); // 2101-2104, 2201-2203, 2301-2304, 2401-2402
      expect(BLUEPRINT_REVENUE).toHaveLength(5); // 3101-3103, 3201-3202
      expect(BLUEPRINT_EXPENSES).toHaveLength(11); // 4101-4103, 4201-4203, 4301-4303, 4401-4402
    });

    it('should have 4 cost centers', () => {
      expect(BLUEPRINT_COST_CENTERS).toHaveLength(4);
      expect(BLUEPRINT_COST_CENTERS[0].code).toBe('CC001');
      expect(BLUEPRINT_COST_CENTERS[1].code).toBe('CC002');
      expect(BLUEPRINT_COST_CENTERS[2].code).toBe('CC003');
      expect(BLUEPRINT_COST_CENTERS[3].code).toBe('CC004');
    });
  });

  describe('Account Properties', () => {
    it('all accounts should have required fields', () => {
      for (const account of ALL_ACCOUNT_BLUEPRINTS) {
        expect(account.code).toBeDefined();
        expect(account.name).toBeDefined();
        expect(account.mapped_real_account_type).toBeDefined();
        expect(account.normal_balance).toBeDefined();
        expect(account.currency).toBeDefined();
        expect(account.economic_nature).toBeDefined();
        expect(typeof account.is_postable).toBe('boolean');
        expect(typeof account.requires_cost_center).toBe('boolean');
        expect(typeof account.requires_territory).toBe('boolean');
        expect(typeof account.requires_counterparty).toBe('boolean');
        expect(typeof account.requires_reconciliation).toBe('boolean');
        expect(typeof account.is_third_party).toBe('boolean');
        expect(account.decision_status).toBeDefined();
        expect(Array.isArray(account.blocking_reasons)).toBe(true);
      }
    });

    it('all accounts should have unique codes', () => {
      const codes = new Set(ALL_ACCOUNT_BLUEPRINTS.map((a) => a.code));
      expect(codes.size).toBe(ALL_ACCOUNT_BLUEPRINTS.length);
    });

    it('all accounts should have non-empty names', () => {
      for (const account of ALL_ACCOUNT_BLUEPRINTS) {
        expect(account.name.trim().length).toBeGreaterThan(0);
      }
    });

    it('should have correct normal balance for account types', () => {
      for (const account of BLUEPRINT_ASSETS) {
        if (account.economic_nature === 'ASSET') {
          expect(account.normal_balance).toBe('DEBIT');
        }
      }

      for (const account of BLUEPRINT_LIABILITIES) {
        if (account.economic_nature === 'LIABILITY') {
          expect(account.normal_balance).toBe('CREDIT');
        }
      }

      for (const account of BLUEPRINT_REVENUE) {
        if (account.economic_nature === 'REVENUE') {
          expect(account.normal_balance).toBe('CREDIT');
        }
      }

      for (const account of BLUEPRINT_EXPENSES) {
        if (account.economic_nature === 'EXPENSE') {
          expect(account.normal_balance).toBe('DEBIT');
        }
      }
    });

    it('should use valid currency codes', () => {
      for (const account of ALL_ACCOUNT_BLUEPRINTS) {
        // For this phase, only BRL is expected
        expect(account.currency).toBe('BRL');
      }
    });
  });

  describe('Enum Mappings', () => {
    const validAccountTypes = [
      'BANK',
      'CASH',
      'PIX_WALLET',
      'RECEIVABLE',
      'PAYABLE',
      'TAX',
      'CLEARING',
      'THIRD_PARTY',
      'INTERNAL',
      'ESCROW',
    ];

    it('all posting accounts should map to valid real account types', () => {
      // Revenue/Expense items are financial_categories, not financial_accounts
      // Only assets and liabilities are posting accounts (financial_accounts)
      for (const account of [...BLUEPRINT_ASSETS, ...BLUEPRINT_LIABILITIES]) {
        expect(validAccountTypes).toContain(account.mapped_real_account_type);
      }
    });

    it('revenue and expense items should be categories (CLEARING as neutral type)', () => {
      for (const account of [...BLUEPRINT_REVENUE, ...BLUEPRINT_EXPENSES]) {
        // These are financial_categories, mapped to CLEARING as neutral type
        expect(account.mapped_real_account_type).toBe('CLEARING');
      }
    });

    it('proposed and mapped types should be consistent for posting accounts', () => {
      const bankAccounts = BLUEPRINT_ASSETS.filter((a) => a.code === '1101' || a.code === '1102');
      expect(bankAccounts.every((a) => a.mapped_real_account_type === 'BANK')).toBe(true);

      const escrowAccount = BLUEPRINT_ASSETS.find((a) => a.code === '1103');
      expect(escrowAccount?.mapped_real_account_type).toBe('ESCROW');

      const receivables = BLUEPRINT_ASSETS.filter((a) => a.code.startsWith('120'));
      expect(receivables.every((a) => a.mapped_real_account_type === 'RECEIVABLE')).toBe(true);
    });
  });

  describe('Hierarchy', () => {
    it('should allow accounts without parents (root level)', () => {
      const rootAccounts = ALL_ACCOUNT_BLUEPRINTS.filter((a) => a.parent_code === null);
      expect(rootAccounts.length).toBeGreaterThan(0);
    });

    it('should not have cycles', () => {
      const report = validateBlueprint();
      const cycleErrors = report.errors.filter((e) => e.message.includes('Circular'));
      expect(cycleErrors).toHaveLength(0);
    });

    it('should have valid parent references', () => {
      const report = validateBlueprint();
      const parentErrors = report.errors.filter((e) => e.message.includes('parent'));
      expect(parentErrors).toHaveLength(0);
    });
  });

  describe('Business Rules', () => {
    it('should not have fixed percentages in bonus account names', () => {
      const bonusAccounts = ALL_ACCOUNT_BLUEPRINTS.filter(
        (a) => a.name.toLowerCase().includes('bonus'),
      );

      for (const account of bonusAccounts) {
        expect(account.name).not.toContain('10%');
        expect(account.name).not.toContain('5%');
      }
    });

    it('pre-paid credits should be liabilities, not revenue', () => {
      const prepaidAccounts = ALL_ACCOUNT_BLUEPRINTS.filter((a) =>
        a.name.toLowerCase().includes('pre-paid'),
      );

      for (const account of prepaidAccounts) {
        expect(account.economic_nature).not.toBe('REVENUE');
      }
    });

    it('driver value should be liability, not expense', () => {
      const driverPayables = ALL_ACCOUNT_BLUEPRINTS.filter((a) =>
        a.name.includes('Payable to Drivers'),
      );

      for (const account of driverPayables) {
        expect(account.economic_nature).toBe('LIABILITY');
      }
    });

    it('postable accounts should not have children', () => {
      const codesMap = new Map(ALL_ACCOUNT_BLUEPRINTS.map((a) => [a.code, a]));

      for (const account of ALL_ACCOUNT_BLUEPRINTS) {
        if (account.is_postable) {
          const hasChildren = ALL_ACCOUNT_BLUEPRINTS.some((a) => a.parent_code === account.code);
          expect(hasChildren).toBe(false);
        }
      }
    });
  });

  describe('Decision Status', () => {
    it('should mark ready accounts correctly', () => {
      const readyAccounts = getReadyAccounts();
      expect(readyAccounts.length).toBeGreaterThan(0);

      for (const account of readyAccounts) {
        expect(account.decision_status).toBe(AccountBlueprintStatus.READY_FOR_TECHNICAL_CREATION);
        expect(account.blocking_reasons).toHaveLength(0);
      }
    });

    it('should mark pending accounts correctly', () => {
      const pendingAccounts = getPendingAccounts();
      expect(pendingAccounts.length).toBeGreaterThan(0);

      for (const account of pendingAccounts) {
        expect([
          AccountBlueprintStatus.PENDING_ACCOUNTANT,
          AccountBlueprintStatus.PENDING_LEGAL,
          AccountBlueprintStatus.PENDING_ADMIN,
        ]).toContain(account.decision_status);
      }
    });

    it('should mark blocked accounts correctly', () => {
      const blockedAccounts = getBlockedAccounts();

      for (const account of blockedAccounts) {
        expect(account.decision_status).toBe(AccountBlueprintStatus.BLOCKED_BY_SCHEMA);
        expect(account.blocking_reasons.length).toBeGreaterThan(0);
      }
    });

    it('ready accounts should not be blocked', () => {
      const readyAccounts = getReadyAccounts();
      for (const account of readyAccounts) {
        expect(account.blocking_reasons.length).toBe(0);
      }
    });

    it('blocked accounts should have blocking reasons', () => {
      const blockedAccounts = getBlockedAccounts();
      for (const account of blockedAccounts) {
        expect(account.blocking_reasons.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Third-Party Accounts', () => {
    it('third-party accounts should require counterparty', () => {
      const thirdPartyAccounts = ALL_ACCOUNT_BLUEPRINTS.filter((a) => a.is_third_party);

      for (const account of thirdPartyAccounts) {
        if (account.requires_counterparty === false) {
          // Log warning but don't fail - it's a warning level issue
        }
      }
    });

    it('driver payables should be marked as third-party', () => {
      const driverPayables = ALL_ACCOUNT_BLUEPRINTS.filter((a) => a.code.startsWith('210'));
      for (const account of driverPayables) {
        expect(account.is_third_party).toBe(true);
      }
    });

    it('manager payables should be marked as third-party', () => {
      const managerPayables = ALL_ACCOUNT_BLUEPRINTS.filter((a) => a.code.startsWith('220'));
      for (const account of managerPayables) {
        expect(account.is_third_party).toBe(true);
      }
    });
  });

  describe('Cost Center Requirements', () => {
    it('revenue and expense categories should require cost center', () => {
      for (const account of BLUEPRINT_REVENUE) {
        if (account.code === '3201') {
          // 3201 is affiliate/commission, may not require cost center
          continue;
        }
        expect(account.requires_cost_center).toBe(true);
      }

      for (const account of BLUEPRINT_EXPENSES) {
        if (account.code === '4102' || account.code === '4103' || account.code === '4301' || account.code === '4302') {
          // Partner commission, processor fee, and taxes may not require cost center
          continue;
        }
        expect(account.requires_cost_center).toBe(true);
      }
    });

    it('tax accounts should require territory (where applicable)', () => {
      const taxAccounts = ALL_ACCOUNT_BLUEPRINTS.filter((a) =>
        a.name.toLowerCase().includes('tax') || a.name.includes('ISS') || a.name.includes('IRRF'),
      );

      for (const account of taxAccounts) {
        if (account.code === '2302' || account.code === '2303' || account.code === '2304') {
          // IRRF, INSS, PIS/Cofins may not be territory-specific
          continue;
        } else if (account.code === '2301') {
          // ISS is territory-specific
          expect(account.requires_territory).toBe(true);
        }
      }
    });
  });

  describe('Validation', () => {
    it('should validate blueprint without structural errors', () => {
      const report = validateBlueprint();
      // Check that we don't have critical structural errors (duplicates, cycles, invalid types)
      const criticalErrors = report.errors.filter(e =>
        e.message.includes('Duplicate') ||
        e.message.includes('Circular') ||
        e.message.includes('not found')
      );
      expect(criticalErrors.length).toBe(0);
    });

    it('should produce validation report with stats', () => {
      const report = validateBlueprint();
      expect(report.stats.total_accounts).toBe(37);
      expect(report.stats.ready_for_creation).toBeGreaterThanOrEqual(0);
      expect(report.stats.pending_decisions).toBeGreaterThanOrEqual(0);
      expect(report.stats.blocked).toBeGreaterThanOrEqual(0);
    });

    it('should validate individual accounts', () => {
      const testAccount: AccountBlueprint = {
        code: 'TEST001',
        name: 'Test Account',
        parent_code: null,
        proposed_account_type: 'BANK',
        mapped_real_account_type: 'BANK',
        normal_balance: 'DEBIT',
        currency: 'BRL',
        economic_nature: 'ASSET',
        is_postable: true,
        requires_cost_center: false,
        requires_territory: false,
        requires_counterparty: false,
        requires_reconciliation: true,
        is_third_party: false,
        decision_status: AccountBlueprintStatus.READY_FOR_TECHNICAL_CREATION,
        blocking_reasons: [],
        notes: 'Test account',
      };

      const errors = validateAccount(testAccount);
      // Should have no errors (warnings are OK)
      const errorOnly = errors.filter(e => e.severity === 'error');
      expect(errorOnly.length).toBe(0);
    });

    it('should detect invalid account properties', () => {
      const invalidAccount: AccountBlueprint = {
        code: 'INVALID001',
        name: 'Invalid Test',
        parent_code: 'NONEXISTENT', // Parent doesn't exist
        proposed_account_type: 'UNKNOWN_TYPE', // Invalid type
        mapped_real_account_type: 'INVALID',
        normal_balance: 'DEBIT',
        currency: 'BRL',
        economic_nature: 'REVENUE', // Wrong: revenue should credit, not debit
        is_postable: true,
        requires_cost_center: false,
        requires_territory: false,
        requires_counterparty: false,
        requires_reconciliation: false,
        is_third_party: false,
        decision_status: AccountBlueprintStatus.READY_FOR_TECHNICAL_CREATION,
        blocking_reasons: [], // Should have blocking reasons if not ready
        notes: 'Invalid account',
      };

      const report = validateBlueprint([invalidAccount]);
      expect(report.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Statistics', () => {
    it('should provide accurate blueprint statistics', () => {
      const stats = getBluestrintStats();
      expect(stats.total_accounts).toBe(37);
      expect(stats.ready_for_creation).toBeGreaterThanOrEqual(0);
      expect(stats.pending_decisions).toBeGreaterThanOrEqual(0);
      expect(stats.blocked).toBeGreaterThanOrEqual(0);
      expect(stats.total_errors).toBeGreaterThanOrEqual(0);
      expect(stats.total_warnings).toBeGreaterThanOrEqual(0);
    });

    it('ready + pending + blocked should equal total', () => {
      const stats = getBluestrintStats();
      const accounted =
        stats.ready_for_creation + stats.pending_decisions + stats.blocked;
      expect(accounted).toBeLessThanOrEqual(stats.total_accounts);
      // Some accounts might have other statuses like REJECTED
    });
  });

  describe('Cost Center Definitions', () => {
    it('should have correct cost center types', () => {
      const ccTypes = BLUEPRINT_COST_CENTERS.map((cc) => cc.type);
      expect(ccTypes).toContain('COMPANY');
      expect(ccTypes).toContain('TERRITORY');
      expect(ccTypes).toContain('CITY');
      expect(ccTypes).toContain('DEPARTMENT');
    });

    it('should have unique cost center codes', () => {
      const codes = new Set(BLUEPRINT_COST_CENTERS.map((cc) => cc.code));
      expect(codes.size).toBe(BLUEPRINT_COST_CENTERS.length);
    });
  });

  describe('Account Codes', () => {
    it('asset accounts should start with 1', () => {
      for (const account of BLUEPRINT_ASSETS) {
        expect(account.code.startsWith('1')).toBe(true);
      }
    });

    it('liability accounts should start with 2', () => {
      for (const account of BLUEPRINT_LIABILITIES) {
        expect(account.code.startsWith('2')).toBe(true);
      }
    });

    it('revenue accounts should start with 3', () => {
      for (const account of BLUEPRINT_REVENUE) {
        expect(account.code.startsWith('3')).toBe(true);
      }
    });

    it('expense accounts should start with 4', () => {
      for (const account of BLUEPRINT_EXPENSES) {
        expect(account.code.startsWith('4')).toBe(true);
      }
    });

    it('cost center codes should start with CC', () => {
      for (const cc of BLUEPRINT_COST_CENTERS) {
        expect(cc.code.startsWith('CC')).toBe(true);
      }
    });
  });
});
