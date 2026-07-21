import {
  buildAccountMaterializationPlan,
} from '../../src/services/finance/account-catalog/account-materialization-plan';

import {
  loadExistingFinancialCatalogSnapshotFromLocalDatabase,
} from '../../src/services/finance/account-catalog/account-materialization-snapshot';

import {
  MaterializationAction,
} from '../../src/services/finance/account-catalog/account-materialization-types';

async function main(): Promise<void> {
  const loaded =
    await loadExistingFinancialCatalogSnapshotFromLocalDatabase();

  const plan = buildAccountMaterializationPlan(
    loaded.snapshot,
  );

  const actionableItems = plan.items
    .filter(
      (item) =>
        item.action !==
        MaterializationAction.SKIPPED,
    )
    .map((item) => ({
      target_model: item.candidate.target_model,
      code: item.candidate.code,
      name: item.candidate.name,
      decision_status: item.candidate.decision_status,
      action: item.action,
      match_kind: item.match_kind ?? null,
      conflicts: item.conflicts,
    }));

  console.log(
    JSON.stringify(
      {
        mode: 'PLAN_ONLY',
        database: loaded.database,
        blueprint_version: plan.blueprint_version,
        summary: {
          total_operations: plan.total_operations,
          total_writes: plan.total_writes,
          total_conflicts: plan.total_conflicts,
          total_skipped: plan.total_skipped,
          can_apply: plan.can_apply,
          accounts: plan.accounts,
          categories: plan.categories,
          cost_centers: plan.cost_centers,
        },
        actionable_items: actionableItems,
      },
      null,
      2,
    ),
  );

  if (!plan.can_apply) {
    process.exitCode = 2;
  }
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : String(error);

  console.error(message);
  process.exitCode = 1;
});
