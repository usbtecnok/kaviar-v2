import {
  type AccountBlueprint,
  AccountBlueprintStatus,
  ALL_ACCOUNT_BLUEPRINTS,
  BLUEPRINT_ASSETS,
  BLUEPRINT_COST_CENTERS,
  BLUEPRINT_EXPENSES,
  BLUEPRINT_LIABILITIES,
  BLUEPRINT_REVENUE,
  BLUEPRINT_VERSION,
} from './account-blueprint';

import {
  type AccountMaterializationPlan,
  type ExistingFinancialCatalogSnapshot,
  MaterializationAction,
  MaterializationMatchKind,
  type MaterializationBucketSummary,
  type MaterializationCandidate,
  type MaterializationPlanItem,
  MaterializationTargetModel,
} from './account-materialization-types';

const EMPTY_SNAPSHOT: ExistingFinancialCatalogSnapshot = {
  accounts: [],
  categories: [],
  cost_centers: [],
};

function normalizeAccount(
  blueprint: AccountBlueprint,
): MaterializationCandidate {
  return {
    code: blueprint.code,
    name: blueprint.name,
    target_model: MaterializationTargetModel.FINANCIAL_ACCOUNT,
    decision_status: blueprint.decision_status,
    parent_code: blueprint.parent_code,
    account_type: blueprint.mapped_real_account_type,
    currency: blueprint.currency,
    notes: blueprint.notes,
  };
}

function normalizeCategory(
  blueprint: AccountBlueprint,
): MaterializationCandidate {
  return {
    code: blueprint.code,
    name: blueprint.name,
    target_model: MaterializationTargetModel.FINANCIAL_CATEGORY,
    decision_status: blueprint.decision_status,
    parent_code: blueprint.parent_code,
    category_kind: blueprint.economic_nature,
    default_direction:
      blueprint.normal_balance === 'CREDIT' ? 'IN' : 'OUT',
    is_postable: blueprint.is_postable,
    notes: blueprint.notes,
  };
}

function normalizeCostCenter(
  costCenter: (typeof BLUEPRINT_COST_CENTERS)[number],
): MaterializationCandidate {
  return {
    code: costCenter.code,
    name: costCenter.description,
    target_model: MaterializationTargetModel.FINANCIAL_COST_CENTER,
    decision_status: costCenter.materialization_status,
    parent_code: null,
    cost_center_type: costCenter.type,
    notes:
      'Centro de custo ainda sem autorização explícita de materialização.',
  };
}

export function buildMaterializationCandidates():
  MaterializationCandidate[] {
  const accountCodes = new Set([
    ...BLUEPRINT_ASSETS.map((item) => item.code),
    ...BLUEPRINT_LIABILITIES.map((item) => item.code),
  ]);

  const categoryCodes = new Set([
    ...BLUEPRINT_REVENUE.map((item) => item.code),
    ...BLUEPRINT_EXPENSES.map((item) => item.code),
  ]);

  const accounts = ALL_ACCOUNT_BLUEPRINTS
    .filter((item) => accountCodes.has(item.code))
    .map(normalizeAccount);

  const categories = ALL_ACCOUNT_BLUEPRINTS
    .filter((item) => categoryCodes.has(item.code))
    .map(normalizeCategory);

  const costCenters = BLUEPRINT_COST_CENTERS.map(
    normalizeCostCenter,
  );

  return [...accounts, ...categories, ...costCenters].sort(
    (left, right) => {
      if (left.target_model !== right.target_model) {
        return left.target_model.localeCompare(
          right.target_model,
        );
      }

      return left.code.localeCompare(right.code);
    },
  );
}

function actionForNonReadyCandidate(
  candidate: MaterializationCandidate,
): MaterializationAction {
  if (
    candidate.decision_status ===
      AccountBlueprintStatus.BLOCKED_BY_SCHEMA ||
    candidate.decision_status ===
      AccountBlueprintStatus.REJECTED
  ) {
    return MaterializationAction.BLOCKED;
  }

  return MaterializationAction.SKIPPED;
}

function compareAccount(
  candidate: MaterializationCandidate,
  snapshot: ExistingFinancialCatalogSnapshot,
): MaterializationPlanItem {
  const existing = snapshot.accounts.find(
    (account) => account.code === candidate.code,
  );

  if (!existing) {
    return {
      candidate,
      action: MaterializationAction.CREATE,
      conflicts: [],
    };
  }

  const conflicts: string[] = [];

  if (existing.type !== candidate.account_type) {
    conflicts.push(
      `type existente=${existing.type}, blueprint=${candidate.account_type}`,
    );
  }

  if (existing.currency !== candidate.currency) {
    conflicts.push(
      `currency existente=${existing.currency}, blueprint=${candidate.currency}`,
    );
  }

  if (conflicts.length > 0) {
    return {
      candidate,
      action: MaterializationAction.CONFLICT,
      conflicts,
    };
  }

  return {
    candidate,
    action: MaterializationAction.NOOP,
    match_kind:
      existing.name === candidate.name
        ? MaterializationMatchKind.EXACT
        : MaterializationMatchKind.COMPATIBLE,
    conflicts: [],
  };
}

function compareCategory(
  candidate: MaterializationCandidate,
  snapshot: ExistingFinancialCatalogSnapshot,
): MaterializationPlanItem {
  const existing = snapshot.categories.find(
    (category) => category.code === candidate.code,
  );

  if (!existing) {
    return {
      candidate,
      action: MaterializationAction.CREATE,
      conflicts: [],
    };
  }

  const conflicts: string[] = [];

  if (existing.kind !== candidate.category_kind) {
    conflicts.push(
      `kind existente=${existing.kind}, blueprint=${candidate.category_kind}`,
    );
  }

  if (existing.parent_code !== candidate.parent_code) {
    conflicts.push(
      `parent_code existente=${existing.parent_code}, blueprint=${candidate.parent_code}`,
    );
  }

  if (
    existing.default_direction !==
    candidate.default_direction
  ) {
    conflicts.push(
      `default_direction existente=${existing.default_direction}, blueprint=${candidate.default_direction}`,
    );
  }

  if (existing.is_postable !== candidate.is_postable) {
    conflicts.push(
      `is_postable existente=${existing.is_postable}, blueprint=${candidate.is_postable}`,
    );
  }

  if (conflicts.length > 0) {
    return {
      candidate,
      action: MaterializationAction.CONFLICT,
      conflicts,
    };
  }

  return {
    candidate,
    action: MaterializationAction.NOOP,
    match_kind:
      existing.name === candidate.name
        ? MaterializationMatchKind.EXACT
        : MaterializationMatchKind.COMPATIBLE,
    conflicts: [],
  };
}

function compareCostCenter(
  candidate: MaterializationCandidate,
  snapshot: ExistingFinancialCatalogSnapshot,
): MaterializationPlanItem {
  const existing = snapshot.cost_centers.find(
    (costCenter) => costCenter.code === candidate.code,
  );

  if (!existing) {
    return {
      candidate,
      action: MaterializationAction.CREATE,
      conflicts: [],
    };
  }

  const conflicts: string[] = [];

  if (existing.type !== candidate.cost_center_type) {
    conflicts.push(
      `type existente=${existing.type}, blueprint=${candidate.cost_center_type}`,
    );
  }

  if (existing.parent_code !== candidate.parent_code) {
    conflicts.push(
      `parent_code existente=${existing.parent_code}, blueprint=${candidate.parent_code}`,
    );
  }

  if (conflicts.length > 0) {
    return {
      candidate,
      action: MaterializationAction.CONFLICT,
      conflicts,
    };
  }

  return {
    candidate,
    action: MaterializationAction.NOOP,
    match_kind:
      existing.name === candidate.name
        ? MaterializationMatchKind.EXACT
        : MaterializationMatchKind.COMPATIBLE,
    conflicts: [],
  };
}

function buildPlanItem(
  candidate: MaterializationCandidate,
  snapshot: ExistingFinancialCatalogSnapshot,
): MaterializationPlanItem {
  if (
    candidate.decision_status !==
    AccountBlueprintStatus.READY_FOR_TECHNICAL_CREATION
  ) {
    return {
      candidate,
      action: actionForNonReadyCandidate(candidate),
      conflicts: [],
    };
  }

  switch (candidate.target_model) {
    case MaterializationTargetModel.FINANCIAL_ACCOUNT:
      return compareAccount(candidate, snapshot);

    case MaterializationTargetModel.FINANCIAL_CATEGORY:
      return compareCategory(candidate, snapshot);

    case MaterializationTargetModel.FINANCIAL_COST_CENTER:
      return compareCostCenter(candidate, snapshot);
  }

  throw new Error(
    `target_model não suportado: ${candidate.target_model}`,
  );
}

function emptySummary(): MaterializationBucketSummary {
  return {
    create: 0,
    no_op: 0,
    compatible: 0,
    conflict: 0,
    blocked: 0,
    skipped: 0,
  };
}

function summarize(
  items: MaterializationPlanItem[],
  targetModel: MaterializationTargetModel,
): MaterializationBucketSummary {
  const summary = emptySummary();

  for (const item of items) {
    if (item.candidate.target_model !== targetModel) {
      continue;
    }

    switch (item.action) {
      case MaterializationAction.CREATE:
        summary.create += 1;
        break;

      case MaterializationAction.NOOP:
        if (
          item.match_kind ===
          MaterializationMatchKind.EXACT
        ) {
          summary.no_op += 1;
          break;
        }

        if (
          item.match_kind ===
          MaterializationMatchKind.COMPATIBLE
        ) {
          summary.compatible += 1;
          break;
        }

        throw new Error(
          `Ação NOOP sem match_kind para ${item.candidate.target_model}:${item.candidate.code}`,
        );

      case MaterializationAction.CONFLICT:
        summary.conflict += 1;
        break;

      case MaterializationAction.BLOCKED:
        summary.blocked += 1;
        break;

      case MaterializationAction.SKIPPED:
        summary.skipped += 1;
        break;
    }
  }

  return summary;
}

export function buildAccountMaterializationPlan(
  snapshot: ExistingFinancialCatalogSnapshot = EMPTY_SNAPSHOT,
): AccountMaterializationPlan {
  const candidates = buildMaterializationCandidates();
  const items = candidates.map((candidate) =>
    buildPlanItem(candidate, snapshot),
  );

  const accounts = summarize(
    items,
    MaterializationTargetModel.FINANCIAL_ACCOUNT,
  );

  const categories = summarize(
    items,
    MaterializationTargetModel.FINANCIAL_CATEGORY,
  );

  const costCenters = summarize(
    items,
    MaterializationTargetModel.FINANCIAL_COST_CENTER,
  );

  const totalConflicts =
    accounts.conflict +
    categories.conflict +
    costCenters.conflict;

  const totalBlocked =
    accounts.blocked +
    categories.blocked +
    costCenters.blocked;

  const totalSkipped =
    accounts.skipped +
    categories.skipped +
    costCenters.skipped;

  return {
    blueprint_version: BLUEPRINT_VERSION,
    items,
    accounts,
    categories,
    cost_centers: costCenters,
    total_operations: items.length,
    total_writes:
      accounts.create +
      categories.create +
      costCenters.create,
    total_conflicts: totalConflicts,
    total_skipped: totalSkipped,
    can_apply: totalConflicts === 0 && totalBlocked === 0,
  };
}
