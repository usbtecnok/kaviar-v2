import { describe, expect, it } from 'vitest';

import {
  buildAccountMaterializationPlan,
  buildMaterializationCandidates,
} from '../src/services/finance/account-catalog/account-materialization-plan';

import {
  type ExistingFinancialCatalogSnapshot,
  MaterializationAction,
  MaterializationMatchKind,
  MaterializationTargetModel,
} from '../src/services/finance/account-catalog/account-materialization-types';

const emptySnapshot: ExistingFinancialCatalogSnapshot = {
  accounts: [],
  categories: [],
  cost_centers: [],
};

describe('account materialization plan', () => {
  it('normaliza exatamente 42 itens do blueprint', () => {
    // Blueprint v1.1.0 (phase-3c-2d-2b):
    //   BLUEPRINT_ASSETS (8) + BLUEPRINT_LIABILITIES (13) = 21 accounts
    //   BLUEPRINT_REVENUE (6) + BLUEPRINT_EXPENSES (11)  = 17 categories
    //   BLUEPRINT_COST_CENTERS (4)                        =  4 cost centers
    //   Total candidates = 42
    const candidates = buildMaterializationCandidates();

    expect(candidates).toHaveLength(42);

    expect(
      candidates.filter(
        (item) =>
          item.target_model ===
          MaterializationTargetModel.FINANCIAL_ACCOUNT,
      ),
    ).toHaveLength(21);

    expect(
      candidates.filter(
        (item) =>
          item.target_model ===
          MaterializationTargetModel.FINANCIAL_CATEGORY,
      ),
    ).toHaveLength(17);

    expect(
      candidates.filter(
        (item) =>
          item.target_model ===
          MaterializationTargetModel.FINANCIAL_COST_CENTER,
      ),
    ).toHaveLength(4);
  });

  it('planeja somente os 14 itens READY para criação (phase-3c-2d-2b)', () => {
    // Phase 3C-2D.2B changes:
    //   4202 → REJECTED (was READY); 4402 → REJECTED (was READY)
    //   3301 → BLOCKED_BY_SCHEMA (new entry, not READY)
    //   Categories READY: 6 → 4 (3103, 4103, 4303, 4401)
    //   Accounts READY stays at 10 (1101-1401, 2101-2103)
    //   Total writes: 16 → 14
    const plan = buildAccountMaterializationPlan(emptySnapshot);

    expect(plan.accounts.create).toBe(10);
    expect(plan.categories.create).toBe(4);
    expect(plan.cost_centers.create).toBe(0);

    expect(plan.accounts.skipped).toBe(11);
    expect(plan.categories.skipped).toBe(12);
    expect(plan.categories.blocked).toBe(1);
    expect(plan.cost_centers.skipped).toBe(4);

    expect(plan.total_operations).toBe(42);
    expect(plan.total_writes).toBe(14);
    expect(plan.total_conflicts).toBe(0);
    expect(plan.total_skipped).toBe(27);
    expect(plan.can_apply).toBe(false);

    const blockedRevenueDeduction = plan.items.find(
      (item) => item.candidate.code === '3301',
    );

    const rejectedLegacyBonus = plan.items.filter(
      (item) =>
        item.candidate.code === '4202' ||
        item.candidate.code === '4402',
    );

    expect(blockedRevenueDeduction?.action).toBe(
      MaterializationAction.BLOCKED,
    );

    for (const item of rejectedLegacyBonus) {
      expect(item.action).toBe(
        MaterializationAction.SKIPPED,
      );
    }
  });

  it('mantém centros de custo pendentes de autorização', () => {
    const plan = buildAccountMaterializationPlan(emptySnapshot);

    const costCenters = plan.items.filter(
      (item) =>
        item.candidate.target_model ===
        MaterializationTargetModel.FINANCIAL_COST_CENTER,
    );

    expect(costCenters).toHaveLength(4);

    for (const item of costCenters) {
      expect(item.action).toBe(
        MaterializationAction.SKIPPED,
      );
      expect(item.candidate.decision_status).toBe('PENDING_ADMIN');
    }
  });

  it('classifica conta estruturalmente idêntica como no-op', () => {
    const snapshot: ExistingFinancialCatalogSnapshot = {
      ...emptySnapshot,
      accounts: [
        {
          code: '1101',
          name: 'Bank - Operational',
          type: 'BANK',
          currency: 'BRL',
        },
      ],
    };

    const plan = buildAccountMaterializationPlan(snapshot);
    const item = plan.items.find(
      (entry) => entry.candidate.code === '1101',
    );

    expect(item?.action).toBe(
      MaterializationAction.NOOP,
    );
    expect(item?.match_kind).toBe(
      MaterializationMatchKind.EXACT,
    );
    expect(plan.accounts.no_op).toBe(1);
    expect(plan.accounts.create).toBe(9);
  });

  it('classifica diferença apenas de nome como compatível', () => {
    const snapshot: ExistingFinancialCatalogSnapshot = {
      ...emptySnapshot,
      accounts: [
        {
          code: '1101',
          name: 'Banco operacional',
          type: 'BANK',
          currency: 'BRL',
        },
      ],
    };

    const plan = buildAccountMaterializationPlan(snapshot);
    const item = plan.items.find(
      (entry) => entry.candidate.code === '1101',
    );

    expect(item?.action).toBe(
      MaterializationAction.NOOP,
    );
    expect(item?.match_kind).toBe(
      MaterializationMatchKind.COMPATIBLE,
    );
    expect(item?.conflicts).toEqual([]);
  });

  it('bloqueia conflito estrutural de tipo da conta', () => {
    const snapshot: ExistingFinancialCatalogSnapshot = {
      ...emptySnapshot,
      accounts: [
        {
          code: '1101',
          name: 'Bank - Operational',
          type: 'CASH',
          currency: 'BRL',
        },
      ],
    };

    const plan = buildAccountMaterializationPlan(snapshot);
    const item = plan.items.find(
      (entry) => entry.candidate.code === '1101',
    );

    expect(item?.action).toBe(MaterializationAction.CONFLICT);
    expect(item?.conflicts).toContain(
      'type existente=CASH, blueprint=BANK',
    );
    expect(plan.can_apply).toBe(false);
  });

  it('classifica categoria idêntica como no-op', () => {
    const snapshot: ExistingFinancialCatalogSnapshot = {
      ...emptySnapshot,
      categories: [
        {
          code: '3103',
          name: 'Revenue - Adjustment / Credit Corrections',
          kind: 'REVENUE',
          parent_code: null,
          default_direction: 'IN',
          is_postable: true,
        },
      ],
    };

    const plan = buildAccountMaterializationPlan(snapshot);
    const item = plan.items.find(
      (entry) => entry.candidate.code === '3103',
    );

    expect(item?.action).toBe(
      MaterializationAction.NOOP,
    );
    expect(item?.match_kind).toBe(
      MaterializationMatchKind.EXACT,
    );
    expect(plan.categories.no_op).toBe(1);
    expect(plan.categories.create).toBe(3); // 4 READY categories - 1 NOOP = 3
  });

  it('bloqueia conflito de direção da categoria', () => {
    const snapshot: ExistingFinancialCatalogSnapshot = {
      ...emptySnapshot,
      categories: [
        {
          code: '3103',
          name: 'Revenue - Adjustment / Credit Corrections',
          kind: 'REVENUE',
          parent_code: null,
          default_direction: 'OUT',
          is_postable: true,
        },
      ],
    };

    const plan = buildAccountMaterializationPlan(snapshot);
    const item = plan.items.find(
      (entry) => entry.candidate.code === '3103',
    );

    expect(item?.action).toBe(MaterializationAction.CONFLICT);
    expect(item?.conflicts).toContain(
      'default_direction existente=OUT, blueprint=IN',
    );
    expect(plan.can_apply).toBe(false);
  });

  it('produz plano determinístico ordenado por modelo e código', () => {
    const first = buildAccountMaterializationPlan(emptySnapshot);
    const second = buildAccountMaterializationPlan(emptySnapshot);

    expect(second).toEqual(first);

    const keys = first.items.map(
      (item) =>
        `${item.candidate.target_model}:${item.candidate.code}`,
    );

    expect(keys).toEqual([...keys].sort());
  });
});
