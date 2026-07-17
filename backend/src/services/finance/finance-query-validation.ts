import * as PrismaClient from '@prisma/client';
import { z } from 'zod';

function enumValues<T extends Record<string, string>>(enumObject: T) {
  return Object.values(enumObject) as [string, ...string[]];
}

function strictTrimmedString(maxLength = 200) {
  return z.preprocess(
    (value) => (typeof value === 'string' ? value.trim() : value),
    z.string().min(1).max(maxLength),
  );
}

function optionalStrictString(maxLength = 200) {
  return z.preprocess(
    (value) => (typeof value === 'string' ? value.trim() : value),
    z.string().min(1).max(maxLength).optional(),
  );
}

function strictBooleanQuery() {
  return z.enum(['true', 'false']).transform((value) => value === 'true');
}

function optionalStrictBooleanQuery() {
  return z.enum(['true', 'false']).transform((value) => value === 'true').optional();
}

function parseStrictDate(value: string): Date | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const isoDateOnly = /^(\d{4})-(\d{2})-(\d{2})$/;
  const isoMatch = trimmed.match(isoDateOnly);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (
      parsed.getUTCFullYear() !== year ||
      parsed.getUTCMonth() !== month - 1 ||
      parsed.getUTCDate() !== day
    ) {
      return null;
    }
    return parsed;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function strictDateQuery(fieldName: string) {
  return z.preprocess(
    (value) => (typeof value === 'string' ? value.trim() : value),
    z.string().min(1).refine((value) => parseStrictDate(value) !== null, { message: `${fieldName} inválida` }).transform((value) => parseStrictDate(value) as Date),
  );
}

function paginationSchema(defaultLimit = 25) {
  return z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(defaultLimit),
  });
}

const accountTypeValues = enumValues(PrismaClient.financial_account_type);
const categoryKindValues = enumValues(PrismaClient.financial_category_kind);
const costCenterTypeValues = enumValues(PrismaClient.financial_cost_center_type);
const recognitionSubjectValues = enumValues(PrismaClient.financial_recognition_subject);
const recognitionScopeTypeValues = enumValues(PrismaClient.financial_recognition_scope_type);
const recognitionPolicyValues = enumValues(PrismaClient.financial_recognition_policy);
const recognitionPolicyStatusValues = enumValues(PrismaClient.financial_recognition_policy_status);
const transactionTypeValues = enumValues(PrismaClient.financial_transaction_type);
const transactionStatusValues = enumValues(PrismaClient.financial_transaction_status);
const paymentMethodValues = enumValues(PrismaClient.financial_payment_method);
const sourceTypeValues = enumValues(PrismaClient.financial_source_type);
const originTypeValues = enumValues(PrismaClient.financial_origin_type);
const directionValues = enumValues(PrismaClient.financial_direction);
const allocationTypeValues = enumValues(PrismaClient.financial_transaction_allocation_type);
const linkTypeValues = enumValues(PrismaClient.financial_transaction_link_type);

export const financeAccountsListQuerySchema = paginationSchema().extend({
  search: optionalStrictString(120),
  type: z.enum(accountTypeValues).optional(),
  is_active: optionalStrictBooleanQuery(),
  is_cash_equivalent: optionalStrictBooleanQuery(),
  allows_negative_balance: optionalStrictBooleanQuery(),
});

export const financeCategoriesListQuerySchema = paginationSchema().extend({
  kind: z.enum(categoryKindValues).optional(),
  parent_id: optionalStrictString(120),
  is_active: optionalStrictBooleanQuery(),
  is_system: optionalStrictBooleanQuery(),
});

export const financeCostCentersListQuerySchema = paginationSchema().extend({
  type: z.enum(costCenterTypeValues).optional(),
  parent_id: optionalStrictString(120),
  territory_id: optionalStrictString(120),
  city: optionalStrictString(120),
  state: optionalStrictString(120),
  is_active: optionalStrictBooleanQuery(),
});

export const financeRecognitionPoliciesListQuerySchema = paginationSchema().extend({
  subject: z.enum(recognitionSubjectValues).optional(),
  scope_type: z.enum(recognitionScopeTypeValues).optional(),
  policy: z.enum(recognitionPolicyValues).optional(),
  status: z.enum(recognitionPolicyStatusValues).optional(),
  territory_id: optionalStrictString(120),
  cost_center_id: optionalStrictString(120),
  city: optionalStrictString(120),
  state: optionalStrictString(120),
});

const financeTransactionsListQueryBaseSchema = paginationSchema().extend({
  search: optionalStrictString(180),
  account_id: optionalStrictString(120),
  counterparty_account_id: optionalStrictString(120),
  category_id: optionalStrictString(120),
  cost_center_id: optionalStrictString(120),
  direction: z.enum(directionValues).optional(),
  transaction_type: z.enum(transactionTypeValues).optional(),
  status: z.enum(transactionStatusValues).optional(),
  payment_method: z.enum(paymentMethodValues).optional(),
  source_type: z.enum(sourceTypeValues).optional(),
  origin_type: z.enum(originTypeValues).optional(),
  provider: optionalStrictString(120),
  transfer_group_id: optionalStrictString(120),
  date_field: z.enum(['transaction_date', 'competence_date', 'due_date', 'settlement_date', 'created_at']).default('transaction_date'),
  date_from: strictDateQuery('date_from').optional(),
  date_to: strictDateQuery('date_to').optional(),
});

export const financeTransactionsListQuerySchema = financeTransactionsListQueryBaseSchema.superRefine((value, context) => {
  if (value.date_from && value.date_to && value.date_from.getTime() > value.date_to.getTime()) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'date_from não pode ser posterior a date_to', path: ['date_from'] });
  }
});

export const financeIdParamSchema = z.object({
  id: strictTrimmedString(120),
});

export type FinanceAccountsListQuery = z.infer<typeof financeAccountsListQuerySchema>;
export type FinanceCategoriesListQuery = z.infer<typeof financeCategoriesListQuerySchema>;
export type FinanceCostCentersListQuery = z.infer<typeof financeCostCentersListQuerySchema>;
export type FinanceRecognitionPoliciesListQuery = z.infer<typeof financeRecognitionPoliciesListQuerySchema>;
export type FinanceTransactionsListQuery = z.infer<typeof financeTransactionsListQuerySchema>;
export type FinanceIdParam = z.infer<typeof financeIdParamSchema>;
