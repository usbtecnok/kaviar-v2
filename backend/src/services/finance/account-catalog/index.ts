/**
 * Account Catalog Module
 *
 * This module provides:
 * - Account blueprint specifications (37 proposed GL accounts)
 * - Pure validation logic (no database access)
 * - Status tracking (ready, pending, blocked)
 * - Technical documentation
 */

export {
  BLUEPRINT_VERSION,
  BLUEPRINT_DATE,
  AccountBlueprintStatus,
  AccountBlueprintBlockingReason,
  AccountBlueprint,
  BLUEPRINT_ASSETS,
  BLUEPRINT_LIABILITIES,
  BLUEPRINT_REVENUE,
  BLUEPRINT_EXPENSES,
  BLUEPRINT_COST_CENTERS,
  BLUEPRINT_SUMMARY,
  ALL_ACCOUNT_BLUEPRINTS,
} from './account-blueprint';

export {
  AccountBlueprintValidator,
  validateAccount,
  validateBlueprint,
  getReadyAccounts,
  getPendingAccounts,
  getBlockedAccounts,
  getAccountsByStatus,
  getBluestrintStats,
  ValidationError,
  ValidationReport,
} from './account-blueprint-validator';
