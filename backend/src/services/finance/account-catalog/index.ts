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

export {
  MaterializationTargetModel,
  MaterializationAction,
  MaterializationMatchKind,
} from './account-materialization-types';

export type {
  MaterializationDecisionStatus,
  MaterializationCandidate,
  ExistingFinancialAccount,
  ExistingFinancialCategory,
  ExistingFinancialCostCenter,
  ExistingFinancialCatalogSnapshot,
  MaterializationPlanItem,
  MaterializationBucketSummary,
  AccountMaterializationPlan,
} from './account-materialization-types';

export {
  buildMaterializationCandidates,
  buildAccountMaterializationPlan,
} from './account-materialization-plan';

export {
  validateMaterializationEnvironment,
  assertMaterializationEnvironment,
  readMaterializationEnvironmentFromProcess,
} from './account-materialization-safety';

export type {
  MaterializationEnvironmentInput,
  MaterializationDatabaseIdentity,
  MaterializationSafetyResult,
} from './account-materialization-safety';

export {
  buildExistingFinancialCatalogSnapshot,
  loadExistingFinancialCatalogSnapshotFromLocalDatabase,
} from './account-materialization-snapshot';

export type {
  MaterializationAccountRow,
  MaterializationCategoryRow,
  MaterializationCostCenterRow,
  MaterializationCatalogRows,
  LoadedMaterializationCatalogSnapshot,
} from './account-materialization-snapshot';

export {
  defaultMaterializationIdFactory,
  buildMaterializationWriteSet,
} from './account-materialization-write-set';

export type {
  MaterializationAccountCreateData,
  MaterializationCategoryCreateData,
  MaterializationWriteSet,
  MaterializationIdFactory,
} from './account-materialization-write-set';

export {
  applyAccountMaterialization,
} from './account-materialization-apply';

export type {
  MaterializationTransactionRepository,
  MaterializationRepository,
  MaterializationApplyResult,
} from './account-materialization-apply';

export {
  createPrismaMaterializationRepository,
} from './account-materialization-prisma-repository';
