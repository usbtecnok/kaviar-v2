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
  it('normaliza exatamente 41 itens do blueprint', () => {
    const candidates = buildMaterializationCandidates();

    expect(candidates).toHaveLength(41);

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
    ).toHaveLength(16);

    expect(
      candidates.filter(
        (item) =>
          item.target_model ===
          MaterializationTargetModel.FINANCIAL_COST_CENTER,
      ),
    ).toHaveLength(4);
  });

  it('planeja somente os 16 itens READY para criação', () => {
    const plan = buildAccountMaterializationPlan(emptySnapshot);

    expect(plan.accounts.create).toBe(10);
    expect(plan.categories.create).toBe(6);
    expect(plan.cost_centers.create).toBe(0);

    expect(plan.accounts.skipped).toBe(11);
    expect(plan.categories.skipped).toBe(10);
    expect(plan.cost_centers.skipped).toBe(4);

    expect(plan.total_operations).toBe(41);
    expect(plan.total_writes).toBe(16);
    expect(plan.total_conflicts).toBe(0);
    expect(plan.total_skipped).toBe(25);
    expect(plan.can_apply).toBe(true);
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
    expect(plan.categories.create).toBe(5);
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
