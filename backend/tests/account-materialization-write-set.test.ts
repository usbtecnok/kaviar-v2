import { describe, expect, it } from 'vitest';

import {
  buildAccountMaterializationPlan,
} from '../src/services/finance/account-catalog/account-materialization-plan';

import {
  buildMaterializationWriteSet,
} from '../src/services/finance/account-catalog/account-materialization-write-set';

import {
  MaterializationTargetModel,
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
      : targetModel ===
          MaterializationTargetModel.FINANCIAL_CATEGORY
        ? 'fcat'
        : 'fcc';

  return `${prefix}_test_${code}`;
}

describe('account materialization write set', () => {
  it('gera exatamente 10 contas e 6 categorias READY', () => {
    const plan = buildAccountMaterializationPlan(emptySnapshot);

    const writeSet = buildMaterializationWriteSet(
      plan,
      deterministicIdFactory,
    );

    expect(writeSet.total_writes).toBe(16);
    expect(writeSet.accounts).toHaveLength(10);
    expect(writeSet.categories).toHaveLength(6);
    expect(writeSet.cost_centers).toEqual([]);
  });

  it('não inclui itens pendentes no conjunto de escrita', () => {
    const plan = buildAccountMaterializationPlan(emptySnapshot);

    const writeSet = buildMaterializationWriteSet(
      plan,
      deterministicIdFactory,
    );

    const codes = [
      ...writeSet.accounts.map((item) => item.code),
      ...writeSet.categories.map((item) => item.code),
    ];

    expect(codes).toEqual([
      '1101',
      '1102',
      '1103',
      '1201',
      '1202',
      '1301',
      '1401',
      '2101',
      '2102',
      '2103',
      '3103',
      '4103',
      '4202',
      '4303',
      '4401',
      '4402',
    ]);

    expect(codes).not.toContain('2201');
    expect(codes).not.toContain('CC001');
  });

  it('cria contas sem saldo inicial e sem vínculo administrativo', () => {
    const plan = buildAccountMaterializationPlan(emptySnapshot);

    const writeSet = buildMaterializationWriteSet(
      plan,
      deterministicIdFactory,
    );

    for (const account of writeSet.accounts) {
      expect(account.id).toBe(`facc_test_${account.code}`);
      expect(account.opening_balance_cents).toBe(0n);
      expect(account.opening_balance_date).toBeNull();
      expect(account.allows_negative_balance).toBe(false);
      expect(account.is_active).toBe(true);
      expect(account.created_by_admin_id).toBeNull();
      expect(account.updated_by_admin_id).toBeNull();
      expect(account.notes).toContain('Blueprint 1.0.0:');
    }
  });

  it('cria categorias sistêmicas, ativas e postáveis', () => {
    const plan = buildAccountMaterializationPlan(emptySnapshot);

    const writeSet = buildMaterializationWriteSet(
      plan,
      deterministicIdFactory,
    );

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
    ).toMatchObject({
      kind: 'REVENUE',
      default_direction: 'IN',
    });

    expect(
      writeSet.categories.find((item) => item.code === '4103'),
    ).toMatchObject({
      kind: 'EXPENSE',
      default_direction: 'OUT',
    });
  });

  it('recusa plano com conflito estrutural', () => {
    const conflictingSnapshot: ExistingFinancialCatalogSnapshot = {
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

    const plan =
      buildAccountMaterializationPlan(conflictingSnapshot);

    expect(() =>
      buildMaterializationWriteSet(
        plan,
        deterministicIdFactory,
      ),
    ).toThrow(
      'Plano possui conflito ou bloqueio e não pode ser materializado',
    );
  });

  it('é determinístico quando recebe fábrica de IDs determinística', () => {
    const plan = buildAccountMaterializationPlan(emptySnapshot);

    const first = buildMaterializationWriteSet(
      plan,
      deterministicIdFactory,
    );

    const second = buildMaterializationWriteSet(
      plan,
      deterministicIdFactory,
    );

    expect(second).toEqual(first);
  });
});
