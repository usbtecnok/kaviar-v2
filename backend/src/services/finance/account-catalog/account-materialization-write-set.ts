import { randomUUID } from 'node:crypto';

import {
  AccountBlueprintStatus,
} from './account-blueprint';

import type {
  AccountMaterializationPlan,
  MaterializationCandidate,
} from './account-materialization-types';

import {
  MaterializationAction,
  MaterializationTargetModel,
} from './account-materialization-types';

export interface MaterializationAccountCreateData {
  id: string;
  code: string;
  name: string;
  type: string;
  currency: string;
  opening_balance_cents: bigint;
  opening_balance_date: null;
  allows_negative_balance: boolean;
  is_cash_equivalent: boolean;
  is_active: boolean;
  notes: string;
  created_by_admin_id: null;
  updated_by_admin_id: null;
}

export interface MaterializationCategoryCreateData {
  id: string;
  code: string;
  name: string;
  kind: string;
  parent_id: null;
  default_direction: 'IN' | 'OUT' | null;
  requires_document: boolean;
  is_system: boolean;
  is_active: boolean;
  is_postable: boolean;
  sort_order: number;
  created_by_admin_id: null;
  updated_by_admin_id: null;
}

export interface MaterializationWriteSet {
  blueprint_version: string;
  accounts: MaterializationAccountCreateData[];
  categories: MaterializationCategoryCreateData[];
  cost_centers: never[];
  total_writes: number;
}

export type MaterializationIdFactory = (
  targetModel: MaterializationTargetModel,
  code: string,
) => string;

const VALID_ACCOUNT_TYPES = new Set([
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
]);

const VALID_CATEGORY_KINDS = new Set([
  'REVENUE',
  'EXPENSE',
  'CONTRIBUTION',
  'WITHDRAWAL',
  'TRANSFER',
  'LIABILITY',
  'CLEARING',
  'ADJUSTMENT',
]);

export function defaultMaterializationIdFactory(
  targetModel: MaterializationTargetModel,
): string {
  const suffix = randomUUID().replace(/-/g, '');

  switch (targetModel) {
    case MaterializationTargetModel.FINANCIAL_ACCOUNT:
      return `facc_${suffix}`;

    case MaterializationTargetModel.FINANCIAL_CATEGORY:
      return `fcat_${suffix}`;

    case MaterializationTargetModel.FINANCIAL_COST_CENTER:
      return `fcc_${suffix}`;
  }

  throw new Error(
    `target_model sem prefixo de ID: ${targetModel}`,
  );
}

function assertReadyCandidate(
  candidate: MaterializationCandidate,
): void {
  if (
    candidate.decision_status !==
    AccountBlueprintStatus.READY_FOR_TECHNICAL_CREATION
  ) {
    throw new Error(
      `Item ${candidate.code} não está READY para materialização`,
    );
  }
}

function buildAccountData(
  candidate: MaterializationCandidate,
  blueprintVersion: string,
  idFactory: MaterializationIdFactory,
): MaterializationAccountCreateData {
  if (
    !candidate.account_type ||
    !VALID_ACCOUNT_TYPES.has(candidate.account_type)
  ) {
    throw new Error(
      `Tipo de conta inválido para ${candidate.code}`,
    );
  }

  if (!candidate.currency) {
    throw new Error(
      `Moeda ausente para a conta ${candidate.code}`,
    );
  }

  if (candidate.parent_code !== null) {
    throw new Error(
      `Conta ${candidate.code} possui parent_code não suportado`,
    );
  }

  return {
    id: idFactory(candidate.target_model, candidate.code),
    code: candidate.code,
    name: candidate.name,
    type: candidate.account_type,
    currency: candidate.currency,
    opening_balance_cents: 0n,
    opening_balance_date: null,
    allows_negative_balance: false,
    is_cash_equivalent: false,
    is_active: true,
    notes:
      `Blueprint ${blueprintVersion}: ${candidate.notes}`,
    created_by_admin_id: null,
    updated_by_admin_id: null,
  };
}

function buildCategoryData(
  candidate: MaterializationCandidate,
  idFactory: MaterializationIdFactory,
): MaterializationCategoryCreateData {
  if (
    !candidate.category_kind ||
    !VALID_CATEGORY_KINDS.has(candidate.category_kind)
  ) {
    throw new Error(
      `Kind de categoria inválido para ${candidate.code}`,
    );
  }

  if (candidate.parent_code !== null) {
    throw new Error(
      `Categoria ${candidate.code} possui parent_code não resolvido`,
    );
  }

  if (candidate.is_postable === undefined) {
    throw new Error(
      `Postabilidade ausente para ${candidate.code}`,
    );
  }

  return {
    id: idFactory(candidate.target_model, candidate.code),
    code: candidate.code,
    name: candidate.name,
    kind: candidate.category_kind,
    parent_id: null,
    default_direction:
      candidate.default_direction ?? null,
    requires_document: false,
    is_system: true,
    is_active: true,
    is_postable: candidate.is_postable,
    sort_order: Number.parseInt(candidate.code, 10),
    created_by_admin_id: null,
    updated_by_admin_id: null,
  };
}

export function buildMaterializationWriteSet(
  plan: AccountMaterializationPlan,
  idFactory: MaterializationIdFactory =
    defaultMaterializationIdFactory,
): MaterializationWriteSet {
  if (!plan.can_apply || plan.total_conflicts > 0) {
    throw new Error(
      'Plano possui conflito ou bloqueio e não pode ser materializado',
    );
  }

  const accounts: MaterializationAccountCreateData[] = [];
  const categories: MaterializationCategoryCreateData[] = [];

  for (const item of plan.items) {
    if (item.action !== MaterializationAction.CREATE) {
      continue;
    }

    assertReadyCandidate(item.candidate);

    switch (item.candidate.target_model) {
      case MaterializationTargetModel.FINANCIAL_ACCOUNT:
        accounts.push(
          buildAccountData(
            item.candidate,
            plan.blueprint_version,
            idFactory,
          ),
        );
        break;

      case MaterializationTargetModel.FINANCIAL_CATEGORY:
        categories.push(
          buildCategoryData(item.candidate, idFactory),
        );
        break;

      case MaterializationTargetModel.FINANCIAL_COST_CENTER:
        throw new Error(
          `Centro de custo ${item.candidate.code} ainda não possui autorização de escrita`,
        );
    }
  }

  const totalWrites =
    accounts.length + categories.length;

  if (totalWrites !== plan.total_writes) {
    throw new Error(
      `Plano declarou ${plan.total_writes} escritas, mas o conjunto contém ${totalWrites}`,
    );
  }

  return {
    blueprint_version: plan.blueprint_version,
    accounts,
    categories,
    cost_centers: [],
    total_writes: totalWrites,
  };
}
