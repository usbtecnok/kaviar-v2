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

function optionalNullableTrimmedString(maxLength = 200) {
  return z.preprocess((value) => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed === '' ? null : trimmed;
    }
    return value;
  }, z.string().max(maxLength).nullable().optional());
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

function strictDateOnlyBody(fieldName: string) {
  return z.preprocess(
    (value) => {
      if (value === null) return null;
      if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed === '' ? null : trimmed;
      }
      return value;
    },
    z
      .string()
      .regex(/^(\d{4})-(\d{2})-(\d{2})$/, `${fieldName} deve estar no formato YYYY-MM-DD`)
      .refine((value) => parseStrictDate(value) !== null, { message: `${fieldName} inválida` })
      .transform((value) => parseStrictDate(value) as Date),
  );
}

function strictTimestampBody(fieldName: string) {
  return z.preprocess(
    (value) => (typeof value === 'string' ? value.trim() : value),
    z
      .string()
      .min(1)
      .refine((value) => !Number.isNaN(new Date(value).getTime()), { message: `${fieldName} inválida` })
      .transform((value) => new Date(value)),
  );
}

const PG_BIGINT_MIN = BigInt('-9223372036854775808');
const PG_BIGINT_MAX = BigInt('9223372036854775807');

function strictBigIntStringBody(fieldName: string) {
  return z.preprocess(
    (value) => (typeof value === 'string' ? value.trim() : value),
    z
      .string()
      .regex(/^-?\d+$/, `${fieldName} deve ser string inteira assinada`)
      .refine((value) => {
        try {
          const parsed = BigInt(value);
          return parsed >= PG_BIGINT_MIN && parsed <= PG_BIGINT_MAX;
        } catch {
          return false;
        }
      }, { message: `${fieldName} fora do intervalo de bigint` }),
  );
}

const strictCodeBody = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim().toUpperCase() : value),
  z.string().min(1).max(120).regex(/^[A-Z0-9][A-Z0-9._-]*$/, 'code inválido'),
);

const optionalStateBody = z.preprocess(
  (value) => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed === '' ? null : trimmed.toUpperCase();
    }
    return value;
  },
  z.string().regex(/^[A-Z]{2}$/, 'state deve ter exatamente duas letras').nullable().optional(),
);

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

export const financeAccountCreateBodySchema = z
  .object({
    code: strictCodeBody,
    name: strictTrimmedString(160),
    type: z.enum(accountTypeValues),
    institution_name: optionalNullableTrimmedString(160),
    bank_code: optionalNullableTrimmedString(20),
    currency: z.preprocess((value) => (typeof value === 'string' ? value.trim().toUpperCase() : value), z.string().length(3)).optional(),
    opening_balance_cents: strictBigIntStringBody('opening_balance_cents').optional(),
    opening_balance_date: strictDateOnlyBody('opening_balance_date').nullable().optional(),
    allows_negative_balance: z.boolean().optional(),
    is_cash_equivalent: z.boolean().optional(),
    is_active: z.boolean().optional(),
    notes: optionalNullableTrimmedString(2000),
  })
  .strict();

const financeAccountPatchCoreSchema = z
  .object({
    expected_updated_at: strictTimestampBody('expected_updated_at'),
    code: strictCodeBody.optional(),
    name: strictTrimmedString(160).optional(),
    type: z.enum(accountTypeValues).optional(),
    institution_name: optionalNullableTrimmedString(160),
    bank_code: optionalNullableTrimmedString(20),
    currency: z.preprocess((value) => (typeof value === 'string' ? value.trim().toUpperCase() : value), z.string().length(3)).optional(),
    opening_balance_cents: strictBigIntStringBody('opening_balance_cents').optional(),
    opening_balance_date: strictDateOnlyBody('opening_balance_date').nullable().optional(),
    allows_negative_balance: z.boolean().optional(),
    is_cash_equivalent: z.boolean().optional(),
    is_active: z.boolean().optional(),
    notes: optionalNullableTrimmedString(2000),
  })
  .strict();

export const financeAccountPatchBodySchema = financeAccountPatchCoreSchema.superRefine((value, context) => {
  const updateKeys = Object.keys(value).filter((key) => key !== 'expected_updated_at' && (value as any)[key] !== undefined);
  if (updateKeys.length === 0) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'PATCH requer ao menos um campo para atualização' });
  }
});

export const financeCategoryCreateBodySchema = z
  .object({
    code: strictCodeBody,
    name: strictTrimmedString(160),
    kind: z.enum(categoryKindValues),
    parent_id: optionalNullableTrimmedString(120),
    default_direction: z.enum(directionValues).nullable().optional(),
    requires_document: z.boolean().optional(),
    is_active: z.boolean().optional(),
    sort_order: z.number().int().min(0).max(100000).optional(),
  })
  .strict();

const financeCategoryPatchCoreSchema = z
  .object({
    expected_updated_at: strictTimestampBody('expected_updated_at'),
    code: strictCodeBody.optional(),
    name: strictTrimmedString(160).optional(),
    kind: z.enum(categoryKindValues).optional(),
    parent_id: optionalNullableTrimmedString(120),
    default_direction: z.enum(directionValues).nullable().optional(),
    requires_document: z.boolean().optional(),
    is_active: z.boolean().optional(),
    sort_order: z.number().int().min(0).max(100000).optional(),
  })
  .strict();

export const financeCategoryPatchBodySchema = financeCategoryPatchCoreSchema.superRefine((value, context) => {
  const updateKeys = Object.keys(value).filter((key) => key !== 'expected_updated_at' && (value as any)[key] !== undefined);
  if (updateKeys.length === 0) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'PATCH requer ao menos um campo para atualização' });
  }
});

const financeCostCenterCreateBodyBaseSchema = z
  .object({
    code: strictCodeBody,
    name: strictTrimmedString(160),
    type: z.enum(costCenterTypeValues),
    parent_id: optionalNullableTrimmedString(120),
    territory_id: optionalNullableTrimmedString(120),
    city: optionalNullableTrimmedString(120),
    state: optionalStateBody,
    is_active: z.boolean().optional(),
  })
  .strict();

export const financeCostCenterCreateBodySchema = financeCostCenterCreateBodyBaseSchema.superRefine((value, context) => {
  if (value.city && !value.state) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'state é obrigatório quando city for informada', path: ['state'] });
  }
});

const financeCostCenterPatchCoreSchema = z
  .object({
    expected_updated_at: strictTimestampBody('expected_updated_at'),
    code: strictCodeBody.optional(),
    name: strictTrimmedString(160).optional(),
    type: z.enum(costCenterTypeValues).optional(),
    parent_id: optionalNullableTrimmedString(120),
    territory_id: optionalNullableTrimmedString(120),
    city: optionalNullableTrimmedString(120),
    state: optionalStateBody,
    is_active: z.boolean().optional(),
  })
  .strict();

export const financeCostCenterPatchBodySchema = financeCostCenterPatchCoreSchema.superRefine((value, context) => {
  const updateKeys = Object.keys(value).filter((key) => key !== 'expected_updated_at' && (value as any)[key] !== undefined);
  if (updateKeys.length === 0) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'PATCH requer ao menos um campo para atualização' });
  }
  if (value.city && !value.state) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'state é obrigatório quando city for informada', path: ['state'] });
  }
});

export type FinanceAccountsListQuery = z.infer<typeof financeAccountsListQuerySchema>;
export type FinanceCategoriesListQuery = z.infer<typeof financeCategoriesListQuerySchema>;
export type FinanceCostCentersListQuery = z.infer<typeof financeCostCentersListQuerySchema>;
export type FinanceRecognitionPoliciesListQuery = z.infer<typeof financeRecognitionPoliciesListQuerySchema>;
export type FinanceTransactionsListQuery = z.infer<typeof financeTransactionsListQuerySchema>;
export type FinanceIdParam = z.infer<typeof financeIdParamSchema>;
export type FinanceAccountCreateBody = z.infer<typeof financeAccountCreateBodySchema>;
export type FinanceAccountPatchBody = z.infer<typeof financeAccountPatchBodySchema>;
export type FinanceCategoryCreateBody = z.infer<typeof financeCategoryCreateBodySchema>;
export type FinanceCategoryPatchBody = z.infer<typeof financeCategoryPatchBodySchema>;
export type FinanceCostCenterCreateBody = z.infer<typeof financeCostCenterCreateBodySchema>;
export type FinanceCostCenterPatchBody = z.infer<typeof financeCostCenterPatchBodySchema>;
