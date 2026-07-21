import type { AccountBlueprintStatus } from './account-blueprint';

export enum MaterializationTargetModel {
  FINANCIAL_ACCOUNT = 'financial_accounts',
  FINANCIAL_CATEGORY = 'financial_categories',
  FINANCIAL_COST_CENTER = 'financial_cost_centers',
}

export enum MaterializationAction {
  CREATE = 'CREATE',
  NOOP = 'NOOP',
  CONFLICT = 'CONFLICT',
  BLOCKED = 'BLOCKED',
  SKIPPED = 'SKIPPED',
}

export enum MaterializationMatchKind {
  EXACT = 'EXACT',
  COMPATIBLE = 'COMPATIBLE',
}

export type MaterializationDecisionStatus =
  | AccountBlueprintStatus
  | 'PENDING_ADMIN';

export interface MaterializationCandidate {
  code: string;
  name: string;
  target_model: MaterializationTargetModel;
  decision_status: MaterializationDecisionStatus;
  parent_code: string | null;
  notes: string;

  account_type?: string;
  currency?: string;

  category_kind?: string;
  default_direction?: 'IN' | 'OUT' | null;
  is_postable?: boolean;

  cost_center_type?: string;
}

export interface ExistingFinancialAccount {
  code: string;
  name: string;
  type: string;
  currency: string;
}

export interface ExistingFinancialCategory {
  code: string;
  name: string;
  kind: string;
  parent_code: string | null;
  default_direction: 'IN' | 'OUT' | null;
  is_postable: boolean;
}

export interface ExistingFinancialCostCenter {
  code: string;
  name: string;
  type: string;
  parent_code: string | null;
}

export interface ExistingFinancialCatalogSnapshot {
  accounts: ExistingFinancialAccount[];
  categories: ExistingFinancialCategory[];
  cost_centers: ExistingFinancialCostCenter[];
}

export interface MaterializationPlanItem {
  candidate: MaterializationCandidate;
  action: MaterializationAction;
  match_kind?: MaterializationMatchKind;
  conflicts: string[];
}

export interface MaterializationBucketSummary {
  create: number;
  no_op: number;
  compatible: number;
  conflict: number;
  blocked: number;
  skipped: number;
}

export interface AccountMaterializationPlan {
  blueprint_version: string;
  items: MaterializationPlanItem[];
  accounts: MaterializationBucketSummary;
  categories: MaterializationBucketSummary;
  cost_centers: MaterializationBucketSummary;
  total_operations: number;
  total_writes: number;
  total_conflicts: number;
  total_skipped: number;
  can_apply: boolean;
}
