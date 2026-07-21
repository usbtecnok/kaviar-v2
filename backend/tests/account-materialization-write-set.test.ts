import { describe, expect, it } from 'vitest';

import {
  buildAccountMaterializationPlan,
} from '../src/services/finance/account-catalog/account-materialization-plan';

import {
  buildMaterializationWriteSet,
} from '../src/services/finance/account-catalog/account-materialization-write-set';

import {
  MaterializationAction,
  MaterializationTargetModel,
  type AccountMaterializationPlan,
  type ExistingFinancialCatalogSnapshot,
} from '../src/services/finance/account-catalog/account-materialization-types';

const emptySnapshot: ExistingFinancialCatalogSnapshot = {
  accounts: [],
  categories: [],
  cost_centers: [],
};

function deterministicIdFactory(
  targetModel: MaterializationTargetModel,
  code: string,
): string {
  const prefix =
    targetModel === MaterializationTargetModel.FINANCIAL_ACCOUNT
      ? 'facc'
      : targetModel === MaterializationTargetModel.FINANCIAL_CATEGORY
        ? 'fcat'
        : 'fcc';

  return `${prefix}_test_${code}`;
}

/**
 * Test-only helper. Builds a synthetic plan from the real blueprint plan
 * so that unit tests for buildMaterializationWriteSet can exercise the
 * write-set path independently of the schema-level blocker (3301).
 *
 * Rules:
 * - Starts from the REAL plan produced by buildAccountMaterializationPlan.
 * - Does NOT modify the blueprint or any production code.
 * - Does NOT make 3301 READY — it moves the BLOCKED item to SKIPPED only
 *   in the returned copy, simulating the state after the schema blocker is
 *   eventually resolved.
 * - Does NOT affect 4202 or 4402 (they stay SKIPPED / non-READY).
 * - Adds deterministic guards that will throw if the real plan no longer
 *   matches the expected invariants, so a future blueprint change is caught
 *   immediately rather than silently producing a wrong synthetic plan.
 *
 * INVARIANTS CHECKED:
 *   1. plan.total_conflicts === 0   (no structural conflicts in empty snapshot)
 *   2. plan.categories.blocked === 1  (exactly 3301 is blocked)
 *   3. item with code '3301' exists in items
 *   4. that item has action === BLOCKED
 */
function buildReadyOnlyPlanForWriteSetUnitTest(): AccountMaterializationPlan {
  const plan = buildAccountMaterializationPlan(emptySnapshot);

  // Guard 1: no structural conflicts — only schema blocker
  if (plan.total_conflicts !== 0) {
    throw new Error(
      `[buildReadyOnlyPlanForWriteSetUnitTest] Expected total_conflicts=0 ` +
      `but got ${plan.total_conflicts}. Blueprint may have a new conflict.`,
    );
  }

  // Guard 2: exactly one blocked category (3301)
  if (plan.categories.blocked !== 1) {
    throw new Error(
      `[buildReadyOnlyPlanForWriteSetUnitTest] Expected categories.blocked=1 ` +
      `but got ${plan.categories.blocked}. Check blueprint for new BLOCKED_BY_SCHEMA entries.`,
    );
  }

  // Guard 3 & 4: find 3301 and confirm it is BLOCKED
  const item3301 = plan.items.find((i) => i.candidate.code === '3301');
  if (!item3301) {
    throw new Error(
      `[buildReadyOnlyPlanForWriteSetUnitTest] Item 3301 not found in plan items.`,
    );
  }
  if (item3301.action !== MaterializationAction.BLOCKED) {
    throw new Error(
      `[buildReadyOnlyPlanForWriteSetUnitTest] Expected 3301 action=BLOCKED ` +
      `but got ${item3301.action}. Production plan may have changed.`,
    );
  }

  // Build synthetic copy: move 3301 from BLOCKED → SKIPPED in items
  const syntheticItems = plan.items.map((item) => {
    if (
      item.candidate.code === '3301' &&
      item.action === MaterializationAction.BLOCKED
    ) {
      return { ...item, action: MaterializationAction.SKIPPED };
    }
    return item;
  });

  // Adjust bucket summary for categories:
  // blocked: 1 → 0 ; skipped: +1
  const syntheticCategories = {
    ...plan.categories,
    blocked: plan.categories.blocked - 1,   // 1 → 0
    skipped: plan.categories.skipped + 1,   // +1 for the moved 3301
  };

  // total_skipped increases by 1 (the moved item)
  const syntheticTotalSkipped = plan.total_skipped + 1;

  return {
    ...plan,
    items: syntheticItems,
    categories: syntheticCategories,
    total_skipped: syntheticTotalSkipped,
    // total_conflicts stays 0, totalBlocked drops to 0 → can_apply becomes true
    can_apply: true,
  };
}

describe('account materialization write set', () => {

  // ──────────────────────────────────────────────────────────────
  // REAL-PLAN GUARD TESTS — use buildAccountMaterializationPlan
  // ──────────────────────────────────────────────────────────────

  it('recusa o plano real enquanto 3301 estiver bloqueado (BLOCKED_BY_SCHEMA)', () => {
    // The real plan has can_apply=false because 3301 is BLOCKED_BY_SCHEMA.
    // buildMaterializationWriteSet must refuse it unconditionally.
    const realPlan = buildAccountMaterializationPlan(emptySnapshot);

    expect(realPlan.can_apply).toBe(false);
    expect(realPlan.categories.blocked).toBe(1);

    const item3301 = realPlan.items.find((i) => i.candidate.code === '3301');
    expect(item3301?.action).toBe(MaterializationAction.BLOCKED);

    expect(() =>
      buildMaterializationWriteSet(realPlan, deterministicIdFactory),
    ).toThrow('Plano possui conflito ou bloqueio e não pode ser materializado');
  });

  it('recusa plano com conflito estrutural (conflito + bloqueio não permitem escrita)', () => {
    // A plan with a structural conflict must also be refused.
    // The snapshot creates a type-conflict on 1101 AND 3301 is still BLOCKED.
    const conflictingSnapshot: ExistingFinancialCatalogSnapshot = {
      ...emptySnapshot,
      accounts: [
        {
          code: '1101',
          name: 'Bank - Operational',
          type: 'CASH',   // blueprint expects BANK → conflict
          currency: 'BRL',
        },
      ],
    };

    const conflictPlan = buildAccountMaterializationPlan(conflictingSnapshot);

    expect(() =>
      buildMaterializationWriteSet(conflictPlan, deterministicIdFactory),
    ).toThrow('Plano possui conflito ou bloqueio e não pode ser materializado');
  });

  // ──────────────────────────────────────────────────────────────
  // SYNTHETIC-PLAN SUCCESS TESTS — use buildReadyOnlyPlanForWriteSetUnitTest
  // These test the write-set logic independently of the schema blocker.
  // ──────────────────────────────────────────────────────────────

  it('gera exatamente 10 contas e 4 categorias READY (phase-3c-2d-2b)', () => {
    // Blueprint v1.1.0 READY items:
    //   Accounts (10): 1101-1103, 1201-1202, 1301, 1401, 2101-2103
    //   Categories (4): 3103, 4103, 4303, 4401
    //   4202 REJECTED, 4402 REJECTED, 3301 BLOCKED_BY_SCHEMA → none materialised
    const plan = buildReadyOnlyPlanForWriteSetUnitTest();

    const writeSet = buildMaterializationWriteSet(plan, deterministicIdFactory);

    expect(writeSet.total_writes).toBe(14);
    expect(writeSet.accounts).toHaveLength(10);
    expect(writeSet.categories).toHaveLength(4);
    expect(writeSet.cost_centers).toEqual([]);
  });

  it('não inclui itens pendentes no conjunto de escrita', () => {
    const plan = buildReadyOnlyPlanForWriteSetUnitTest();

    const writeSet = buildMaterializationWriteSet(plan, deterministicIdFactory);

    const codes = [
      ...writeSet.accounts.map((item) => item.code),
      ...writeSet.categories.map((item) => item.code),
    ];

    expect(codes).toEqual([
      '1101', '1102', '1103',
      '1201', '1202',
      '1301', '1401',
      '2101', '2102', '2103',
      '3103',
      '4103', '4303', '4401',
    ]);

    // PENDING accounts not included
    expect(codes).not.toContain('2201');
    expect(codes).not.toContain('CC001');
    // Phase 3C-2D.2B: 4202 REJECTED, 4402 REJECTED, 3301 BLOCKED_BY_SCHEMA
    expect(codes).not.toContain('4202');
    expect(codes).not.toContain('4402');
    expect(codes).not.toContain('3301');
  });

  it('cria contas sem saldo inicial e sem vínculo administrativo', () => {
    const plan = buildReadyOnlyPlanForWriteSetUnitTest();

    const writeSet = buildMaterializationWriteSet(plan, deterministicIdFactory);

    for (const account of writeSet.accounts) {
      expect(account.id).toBe(`facc_test_${account.code}`);
      expect(account.opening_balance_cents).toBe(0n);
      expect(account.opening_balance_date).toBeNull();
      expect(account.allows_negative_balance).toBe(false);
      expect(account.is_active).toBe(true);
      expect(account.created_by_admin_id).toBeNull();
      expect(account.updated_by_admin_id).toBeNull();
      expect(account.notes).toContain('Blueprint 1.1.0:');
    }
  });

  it('cria categorias sistêmicas, ativas e postáveis', () => {
    const plan = buildReadyOnlyPlanForWriteSetUnitTest();

    const writeSet = buildMaterializationWriteSet(plan, deterministicIdFactory);

    for (const category of writeSet.categories) {
      expect(category.id).toBe(`fcat_test_${category.code}`);
      expect(category.parent_id).toBeNull();
      expect(category.is_system).toBe(true);
      expect(category.is_active).toBe(true);
      expect(category.is_postable).toBe(true);
      expect(category.created_by_admin_id).toBeNull();
      expect(category.updated_by_admin_id).toBeNull();
    }

    expect(
      writeSet.categories.find((item) => item.code === '3103'),
    ).toMatchObject({ kind: 'REVENUE', default_direction: 'IN' });

    expect(
      writeSet.categories.find((item) => item.code === '4103'),
    ).toMatchObject({ kind: 'EXPENSE', default_direction: 'OUT' });
  });

  it('é determinístico quando recebe fábrica de IDs determinística', () => {
    const plan = buildReadyOnlyPlanForWriteSetUnitTest();

    const first  = buildMaterializationWriteSet(plan, deterministicIdFactory);
    const second = buildMaterializationWriteSet(plan, deterministicIdFactory);

    expect(second).toEqual(first);
  });
});
