/**
 * Account Blueprint Validator
 *
 * Pure validation logic - no database access, no side effects.
 * Used to validate blueprint consistency before materialization.
 */

import {
  AccountBlueprint,
  AccountBlueprintStatus,
  AccountBlueprintBlockingReason,
  ALL_ACCOUNT_BLUEPRINTS,
  BLUEPRINT_COST_CENTERS,
} from './account-blueprint';

export interface ValidationError {
  code: string;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationReport {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  stats: {
    total_accounts: number;
    ready_for_creation: number;
    pending_decisions: number;
    blocked: number;
  };
}

export class AccountBlueprintValidator {
  private errors: ValidationError[] = [];
  private warnings: ValidationError[] = [];

  /**
   * Validate entire blueprint collection
   */
  validate(blueprints: AccountBlueprint[] = ALL_ACCOUNT_BLUEPRINTS): ValidationReport {
    this.errors = [];
    this.warnings = [];

    // Structural validations
    this.validateCodes(blueprints);
    this.validateNames(blueprints);
    this.validateHierarchy(blueprints);
    this.validateEnumMappings(blueprints);
    this.validateAccountTypes(blueprints);
    this.validateNormalBalance(blueprints);
    this.validateDecisionStatus(blueprints);
    this.validateBusinessRules(blueprints);
    this.validateThirdPartyAccounts(blueprints);

    // Calculate stats
    const stats = {
      total_accounts: blueprints.length,
      ready_for_creation: blueprints.filter(
        (a) => a.decision_status === AccountBlueprintStatus.READY_FOR_TECHNICAL_CREATION,
      ).length,
      pending_decisions: blueprints.filter((a) =>
        [
          AccountBlueprintStatus.PENDING_ACCOUNTANT,
          AccountBlueprintStatus.PENDING_LEGAL,
          AccountBlueprintStatus.PENDING_ADMIN,
        ].includes(a.decision_status),
      ).length,
      blocked: blueprints.filter(
        (a) => a.decision_status === AccountBlueprintStatus.BLOCKED_BY_SCHEMA,
      ).length,
    };

    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      stats,
    };
  }

  /**
   * Validate all codes are unique and non-empty
   */
  private validateCodes(blueprints: AccountBlueprint[]): void {
    const codes = new Set<string>();

    for (const account of blueprints) {
      if (!account.code || account.code.trim().length === 0) {
        this.errors.push({
          code: account.code || 'UNKNOWN',
          field: 'code',
          message: 'Account code cannot be empty',
          severity: 'error',
        });
        continue;
      }

      if (codes.has(account.code)) {
        this.errors.push({
          code: account.code,
          field: 'code',
          message: `Duplicate account code: ${account.code}`,
          severity: 'error',
        });
      } else {
        codes.add(account.code);
      }
    }
  }

  /**
   * Validate all names are non-empty
   */
  private validateNames(blueprints: AccountBlueprint[]): void {
    for (const account of blueprints) {
      if (!account.name || account.name.trim().length === 0) {
        this.errors.push({
          code: account.code,
          field: 'name',
          message: 'Account name cannot be empty',
          severity: 'error',
        });
      }
    }
  }

  /**
   * Validate hierarchy: parent exists, no cycles, max depth
   */
  private validateHierarchy(blueprints: AccountBlueprint[]): void {
    const codesMap = new Map(blueprints.map((a) => [a.code, a]));

    for (const account of blueprints) {
      // Check parent exists
      if (account.parent_code && !codesMap.has(account.parent_code)) {
        this.errors.push({
          code: account.code,
          field: 'parent_code',
          message: `Parent account ${account.parent_code} not found in blueprint`,
          severity: 'error',
        });
        continue;
      }

      // Check for cycles
      if (this.hasCycle(account, codesMap)) {
        this.errors.push({
          code: account.code,
          field: 'parent_code',
          message: 'Circular parent assignment detected',
          severity: 'error',
        });
      }

      // Check max depth (50 levels)
      const depth = this.getHierarchyDepth(account, codesMap);
      if (depth > 50) {
        this.errors.push({
          code: account.code,
          field: 'parent_code',
          message: `Hierarchy depth exceeds 50 levels (current: ${depth})`,
          severity: 'error',
        });
      }
    }
  }

  /**
   * Detect circular parent assignment
   */
  private hasCycle(account: AccountBlueprint, codesMap: Map<string, AccountBlueprint>): boolean {
    const visited = new Set<string>();
    let current: AccountBlueprint | undefined = account;

    while (current) {
      if (visited.has(current.code)) {
        return true;
      }
      visited.add(current.code);
      current = current.parent_code ? codesMap.get(current.parent_code) : undefined;
    }

    return false;
  }

  /**
   * Get hierarchy depth from account to root
   */
  private getHierarchyDepth(account: AccountBlueprint, codesMap: Map<string, AccountBlueprint>): number {
    let depth = 0;
    let current: AccountBlueprint | undefined = account;

    while (current && current.parent_code) {
      depth++;
      current = codesMap.get(current.parent_code);
      if (depth > 1000) break; // Safety guard
    }

    return depth;
  }

  /**
   * Validate proposed types are mapped to real enum values
   */
  private validateEnumMappings(blueprints: AccountBlueprint[]): void {
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

    const validCategories = [
      'REVENUE',
      'EXPENSE',
      'CONTRIBUTION',
      'WITHDRAWAL',
      'TRANSFER',
      'LIABILITY',
      'CLEARING',
      'ADJUSTMENT',
    ];

    for (const account of blueprints) {
      // Revenue/Expense categories use CLEARING as neutral type
      if (account.economic_nature === 'REVENUE' || account.economic_nature === 'EXPENSE') {
        if (account.mapped_real_account_type !== 'CLEARING') {
          this.errors.push({
            code: account.code,
            field: 'mapped_real_account_type',
            message: `Category accounts (${account.economic_nature}) should use CLEARING as neutral type, not ${account.mapped_real_account_type}`,
            severity: 'error',
          });
        }
      } else if (!validAccountTypes.includes(account.mapped_real_account_type)) {
        this.errors.push({
          code: account.code,
          field: 'mapped_real_account_type',
          message: `Invalid real account type: ${account.mapped_real_account_type}. Must be one of: ${validAccountTypes.join(', ')}`,
          severity: 'error',
        });
      }

      if (!validCategories.includes(account.economic_nature)) {
        this.warnings.push({
          code: account.code,
          field: 'economic_nature',
          message: `Unknown economic nature: ${account.economic_nature}. Consider using: ${validCategories.join(', ')}`,
          severity: 'warning',
        });
      }
    }
  }

  /**
   * Validate account type constraints
   */
  private validateAccountTypes(blueprints: AccountBlueprint[]): void {
    const codesMap = new Map(blueprints.map((a) => [a.code, a]));

    for (const account of blueprints) {
      // Postable accounts cannot have children
      if (account.is_postable) {
        const hasChildren = blueprints.some((a) => a.parent_code === account.code);
        if (hasChildren) {
          this.errors.push({
            code: account.code,
            field: 'is_postable',
            message: 'Postable account cannot have child accounts',
            severity: 'error',
          });
        }
      }

      // Non-postable (grouping) accounts should have children
      if (!account.is_postable) {
        const hasChildren = blueprints.some((a) => a.parent_code === account.code);
        if (!hasChildren && account.parent_code !== null) {
          this.warnings.push({
            code: account.code,
            field: 'is_postable',
            message: 'Non-postable account has no children (consider making it postable or adding children)',
            severity: 'warning',
          });
        }
      }
    }
  }

  /**
   * Validate normal balance vs. account type
   */
  private validateNormalBalance(blueprints: AccountBlueprint[]): void {
    for (const account of blueprints) {
      const { economic_nature, normal_balance } = account;

      // Assets should debit
      if (economic_nature === 'ASSET' && normal_balance !== 'DEBIT') {
        this.errors.push({
          code: account.code,
          field: 'normal_balance',
          message: 'Asset accounts should have DEBIT normal balance',
          severity: 'error',
        });
      }

      // Liabilities should credit
      if (
        economic_nature === 'LIABILITY' &&
        normal_balance !== 'CREDIT'
      ) {
        this.errors.push({
          code: account.code,
          field: 'normal_balance',
          message: 'Liability accounts should have CREDIT normal balance',
          severity: 'error',
        });
      }

      // Revenue should credit
      if (economic_nature === 'REVENUE' && normal_balance !== 'CREDIT') {
        this.errors.push({
          code: account.code,
          field: 'normal_balance',
          message: 'Revenue accounts should have CREDIT normal balance',
          severity: 'error',
        });
      }

      // Expense should debit
      if (economic_nature === 'EXPENSE' && normal_balance !== 'DEBIT') {
        this.errors.push({
          code: account.code,
          field: 'normal_balance',
          message: 'Expense accounts should have DEBIT normal balance',
          severity: 'error',
        });
      }

      // Contra-accounts have opposite normal balance
      if (economic_nature === 'ASSET_CONTRA' && normal_balance !== 'CREDIT') {
        this.warnings.push({
          code: account.code,
          field: 'normal_balance',
          message: 'Contra-asset accounts typically have CREDIT normal balance',
          severity: 'warning',
        });
      }
    }
  }

  /**
   * Validate decision status consistency
   */
  private validateDecisionStatus(blueprints: AccountBlueprint[]): void {
    for (const account of blueprints) {
      // READY_FOR_TECHNICAL_CREATION should have no blocking reasons
      if (
        account.decision_status === AccountBlueprintStatus.READY_FOR_TECHNICAL_CREATION &&
        account.blocking_reasons.length > 0
      ) {
        this.errors.push({
          code: account.code,
          field: 'decision_status',
          message:
            'READY_FOR_TECHNICAL_CREATION accounts should have no blocking reasons, but found: ' +
            account.blocking_reasons.join(', '),
          severity: 'error',
        });
      }

      // BLOCKED_BY_SCHEMA should have blocking reasons
      if (
        account.decision_status === AccountBlueprintStatus.BLOCKED_BY_SCHEMA &&
        account.blocking_reasons.length === 0
      ) {
        this.errors.push({
          code: account.code,
          field: 'decision_status',
          message: 'BLOCKED_BY_SCHEMA accounts must have blocking reasons',
          severity: 'error',
        });
      }

      // PENDING_* should have blocking reasons
      const pendingStatuses = [
        AccountBlueprintStatus.PENDING_ACCOUNTANT,
        AccountBlueprintStatus.PENDING_LEGAL,
        AccountBlueprintStatus.PENDING_ADMIN,
      ];

      if (pendingStatuses.includes(account.decision_status) && account.blocking_reasons.length === 0) {
        this.warnings.push({
          code: account.code,
          field: 'decision_status',
          message: `${account.decision_status} status should ideally have blocking reasons documented`,
          severity: 'warning',
        });
      }
    }
  }

  /**
   * Validate business rules specific to KAVIAR's model
   */
  private validateBusinessRules(blueprints: AccountBlueprint[]): void {
    for (const account of blueprints) {
      // Bonus accounts should NOT contain fixed percentages
      if (account.code.includes('BONUS') || account.name.toLowerCase().includes('bonus')) {
        if (
          account.name.includes('10%') ||
          account.name.includes('5%') ||
          account.name.includes('%')
        ) {
          this.errors.push({
            code: account.code,
            field: 'name',
            message:
              'Bonus accounts should NOT contain fixed percentage in name (use configurable campaign model)',
            severity: 'error',
          });
        }
      }

      // Pre-paid credits should NOT be classified as immediate revenue
      if (
        (account.code.includes('PRE-PAID') ||
          account.code.includes('PREPAID') ||
          account.name.toLowerCase().includes('pre-paid')) &&
        account.economic_nature === 'REVENUE'
      ) {
        this.errors.push({
          code: account.code,
          field: 'economic_nature',
          message: 'Pre-paid credit accounts should be LIABILITY (deferred revenue), not REVENUE',
          severity: 'error',
        });
      }

      // Driver value (82%) should NOT be classified as operational expense
      if (
        (account.name.includes('Driver') || account.name.includes('Payable to Drivers')) &&
        account.economic_nature === 'EXPENSE'
      ) {
        this.errors.push({
          code: account.code,
          field: 'economic_nature',
          message:
            'Driver value (82%) should be LIABILITY/Payable, not EXPENSE. It is economic value owed, not operational cost.',
          severity: 'error',
        });
      }

      // Tax accounts should require reconciliation
      if (account.mapped_real_account_type === 'TAX' && !account.requires_reconciliation) {
        this.warnings.push({
          code: account.code,
          field: 'requires_reconciliation',
          message: 'Tax accounts should require reconciliation',
          severity: 'warning',
        });
      }
    }
  }

  /**
   * Validate third-party accounts have proper identification
   */
  private validateThirdPartyAccounts(blueprints: AccountBlueprint[]): void {
    for (const account of blueprints) {
      if (account.is_third_party) {
        // Third-party should require counterparty
        if (!account.requires_counterparty) {
          this.warnings.push({
            code: account.code,
            field: 'requires_counterparty',
            message: 'Third-party accounts should require counterparty identification',
            severity: 'warning',
          });
        }

        // Third-party should require reconciliation
        if (!account.requires_reconciliation) {
          this.warnings.push({
            code: account.code,
            field: 'requires_reconciliation',
            message: 'Third-party accounts should require reconciliation',
            severity: 'warning',
          });
        }
      }
    }
  }
}

/**
 * Validate a single account
 */
export function validateAccount(account: AccountBlueprint): ValidationError[] {
  const validator = new AccountBlueprintValidator();
  const report = validator.validate([account]);
  return [...report.errors, ...report.warnings];
}

/**
 * Validate entire blueprint
 */
export function validateBlueprint(blueprints?: AccountBlueprint[]): ValidationReport {
  const validator = new AccountBlueprintValidator();
  return validator.validate(blueprints);
}

/**
 * Get accounts ready for technical creation
 */
export function getReadyAccounts(blueprints: AccountBlueprint[] = ALL_ACCOUNT_BLUEPRINTS): AccountBlueprint[] {
  return blueprints.filter(
    (a) => a.decision_status === AccountBlueprintStatus.READY_FOR_TECHNICAL_CREATION,
  );
}

/**
 * Get accounts pending decisions
 */
export function getPendingAccounts(blueprints: AccountBlueprint[] = ALL_ACCOUNT_BLUEPRINTS): AccountBlueprint[] {
  return blueprints.filter(
    (a) =>
      [
        AccountBlueprintStatus.PENDING_ACCOUNTANT,
        AccountBlueprintStatus.PENDING_LEGAL,
        AccountBlueprintStatus.PENDING_ADMIN,
      ].includes(a.decision_status),
  );
}

/**
 * Get blocked accounts
 */
export function getBlockedAccounts(blueprints: AccountBlueprint[] = ALL_ACCOUNT_BLUEPRINTS): AccountBlueprint[] {
  return blueprints.filter(
    (a) => a.decision_status === AccountBlueprintStatus.BLOCKED_BY_SCHEMA,
  );
}

/**
 * Get accounts by status
 */
export function getAccountsByStatus(
  status: AccountBlueprintStatus,
  blueprints: AccountBlueprint[] = ALL_ACCOUNT_BLUEPRINTS,
): AccountBlueprint[] {
  return blueprints.filter((a) => a.decision_status === status);
}

/**
 * Get summary statistics
 */
export function getBluestrintStats(blueprints: AccountBlueprint[] = ALL_ACCOUNT_BLUEPRINTS) {
  const report = validateBlueprint(blueprints);
  return {
    ...report.stats,
    total_errors: report.errors.length,
    total_warnings: report.warnings.length,
  };
}
