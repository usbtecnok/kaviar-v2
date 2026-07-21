/**
 * Account Blueprint - Technical specification for financial accounts
 *
 * This is a versioned blueprint that represents proposed financial accounts
 * WITHOUT creating any records in the database. It serves as a specification
 * for future account creation and validation.
 *
 * Status: PHASE 3C-2D.2B (Administrative decisions and bonus policy incorporated)
 *
 * Changes in v1.1.0:
 * - 2103: renamed to "Payable to Drivers - Earned Bonus" (bonus policy finalized)
 * - 3201: renamed; status PENDING_ACCOUNTANT (admin approved concept, accounting pending)
 * - 4102: renamed; status PENDING_ACCOUNTANT (admin approved concept, accounting pending)
 * - 4202: REJECTED — superseded by revenue-deduction treatment (policy change)
 * - 4402: REJECTED — duplicate of same economic fact as 4202/2103; cannot coexist
 * - 3301: NEW — Revenue Deduction - Driver Earned Bonus (BLOCKED_BY_SCHEMA, economic_nature=REVENUE_DEDUCTION)
 * - 2101: notes updated to reflect 100% credit policy and no bonus financing from purchase
 * - 3101: notes updated to reflect agent/intermediary role and 82% passthrough
 */

export const BLUEPRINT_VERSION = '1.1.0';
export const BLUEPRINT_DATE = '2026-07-21';

export enum AccountBlueprintStatus {
  // Account is ready for technical creation (all dependencies met)
  READY_FOR_TECHNICAL_CREATION = 'READY_FOR_TECHNICAL_CREATION',

  // Pending decision from accountant (counter)
  PENDING_ACCOUNTANT = 'PENDING_ACCOUNTANT',

  // Pending decision from legal
  PENDING_LEGAL = 'PENDING_LEGAL',

  // Pending decision from administration
  PENDING_ADMIN = 'PENDING_ADMIN',

  // Blocked by schema limitation or missing infrastructure
  BLOCKED_BY_SCHEMA = 'BLOCKED_BY_SCHEMA',

  // Rejected or deprecated
  REJECTED = 'REJECTED',
}

export enum AccountBlueprintBlockingReason {
  // financial_account_type enum doesn't match proposed type
  TYPE_NOT_IN_ENUM = 'TYPE_NOT_IN_ENUM',

  // Parent account doesn't exist in blueprint
  PARENT_NOT_FOUND = 'PARENT_NOT_FOUND',

  // Account type cannot be leaf (postable) but has no children
  ACCOUNT_TYPE_CONFLICT = 'ACCOUNT_TYPE_CONFLICT',

  // Hierarchy would create a cycle
  CIRCULAR_HIERARCHY = 'CIRCULAR_HIERARCHY',

  // Account is marked as third-party but financial_account_type doesn't support it
  THIRD_PARTY_NOT_SUPPORTED = 'THIRD_PARTY_NOT_SUPPORTED',

  // Account requires cost center but schema doesn't enforce it
  COST_CENTER_REQUIREMENT_NOT_ENFORCED = 'COST_CENTER_REQUIREMENT_NOT_ENFORCED',

  // Account should not be postable but structure forces it
  POSTABILITY_CONFLICT = 'POSTABILITY_CONFLICT',

  // Waiting for upstream infrastructure
  UPSTREAM_DEPENDENCY = 'UPSTREAM_DEPENDENCY',

  // Pending counter approval
  COUNTER_REVIEW_REQUIRED = 'COUNTER_REVIEW_REQUIRED',

  // Pending legal compliance check
  LEGAL_COMPLIANCE_REQUIRED = 'LEGAL_COMPLIANCE_REQUIRED',

  // Account violates business rule (e.g., fixed percentage on bonus)
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',

  // economic_nature REVENUE_DEDUCTION is not yet representable in current schema/materializer
  REVENUE_DEDUCTION_NOT_SUPPORTED = 'REVENUE_DEDUCTION_NOT_SUPPORTED',
}

export interface AccountBlueprint {
  // Unique identifier
  code: string;

  // Human-readable name
  name: string;

  // Parent account code (for hierarchical structure), null for root
  parent_code: string | null;

  // Proposed account type (from Phase 3C-2C.1 proposal)
  proposed_account_type: string;

  // Mapped real account type (from financial_account_type enum)
  mapped_real_account_type: string;

  // Normal balance direction (DEBIT or CREDIT)
  normal_balance: 'DEBIT' | 'CREDIT';

  // Currency code (e.g., BRL, USD)
  currency: string;

  // Economic nature / kind (e.g., REVENUE, EXPENSE, LIABILITY)
  economic_nature: string;

  // Whether this account can receive postings (true = leaf, false = grouping)
  is_postable: boolean;

  // Whether transactions on this account MUST have a cost center
  requires_cost_center: boolean;

  // Whether transactions on this account MUST have a territory
  requires_territory: boolean;

  // Whether this account requires a counterparty account reference
  requires_counterparty: boolean;

  // Whether this account requires reconciliation/matching
  requires_reconciliation: boolean;

  // Whether this is a third-party account (driver, manager, partner, etc.)
  is_third_party: boolean;

  // Current decision status
  decision_status: AccountBlueprintStatus;

  // Blocking reasons if status is BLOCKED_BY_SCHEMA or PENDING_*
  blocking_reasons: AccountBlueprintBlockingReason[];

  // Additional notes or migration guidance
  notes: string;
}

// ASSETS SECTION (1000-1400)

export const BLUEPRINT_ASSETS: AccountBlueprint[] = [
  // Bank Accounts (1101-1103)
  {
    code: '1101',
    name: 'Bank - Operational',
    parent_code: null,
    proposed_account_type: 'BANK',
    mapped_real_account_type: 'BANK',
    normal_balance: 'DEBIT',
    currency: 'BRL',
    economic_nature: 'ASSET',
    is_postable: true,
    requires_cost_center: false,
    requires_territory: false,
    requires_counterparty: false,
    requires_reconciliation: true,
    is_third_party: false,
    decision_status: AccountBlueprintStatus.READY_FOR_TECHNICAL_CREATION,
    blocking_reasons: [],
    notes: 'Main operating bank account for daily cash transactions',
  },
  {
    code: '1102',
    name: 'Bank - Settlement',
    parent_code: null,
    proposed_account_type: 'BANK',
    mapped_real_account_type: 'BANK',
    normal_balance: 'DEBIT',
    currency: 'BRL',
    economic_nature: 'ASSET',
    is_postable: true,
    requires_cost_center: false,
    requires_territory: false,
    requires_counterparty: false,
    requires_reconciliation: true,
    is_third_party: false,
    decision_status: AccountBlueprintStatus.READY_FOR_TECHNICAL_CREATION,
    blocking_reasons: [],
    notes: 'SumUp, PIX settlement account. External wallet for payment processing.',
  },
  {
    code: '1103',
    name: 'Bank - Escrow',
    parent_code: null,
    proposed_account_type: 'ESCROW',
    mapped_real_account_type: 'ESCROW',
    normal_balance: 'DEBIT',
    currency: 'BRL',
    economic_nature: 'ASSET',
    is_postable: true,
    requires_cost_center: false,
    requires_territory: false,
    requires_counterparty: false,
    requires_reconciliation: true,
    is_third_party: false,
    decision_status: AccountBlueprintStatus.READY_FOR_TECHNICAL_CREATION,
    blocking_reasons: [],
    notes: 'Temporary holds/escrow for conditional releases. Rare usage.',
  },

  // Receivables (1201-1203)
  {
    code: '1201',
    name: 'Accounts Receivable - Drivers',
    parent_code: null,
    proposed_account_type: 'RECEIVABLE',
    mapped_real_account_type: 'RECEIVABLE',
    normal_balance: 'DEBIT',
    currency: 'BRL',
    economic_nature: 'ASSET',
    is_postable: true,
    requires_cost_center: true,
    requires_territory: false,
    requires_counterparty: true,
    requires_reconciliation: true,
    is_third_party: true,
    decision_status: AccountBlueprintStatus.READY_FOR_TECHNICAL_CREATION,
    blocking_reasons: [],
    notes: 'Pending fee debits and advances to drivers. Paired with driver_id as counterparty.',
  },
  {
    code: '1202',
    name: 'Accounts Receivable - Partners',
    parent_code: null,
    proposed_account_type: 'RECEIVABLE',
    mapped_real_account_type: 'RECEIVABLE',
    normal_balance: 'DEBIT',
    currency: 'BRL',
    economic_nature: 'ASSET',
    is_postable: true,
    requires_cost_center: false,
    requires_territory: false,
    requires_counterparty: true,
    requires_reconciliation: true,
    is_third_party: true,
    decision_status: AccountBlueprintStatus.READY_FOR_TECHNICAL_CREATION,
    blocking_reasons: [],
    notes: 'Credit terms extended to partners/affiliates. Not currently used.',
  },
  {
    code: '1203',
    name: 'Accounts Receivable - Chargebacks',
    parent_code: null,
    proposed_account_type: 'RECEIVABLE',
    mapped_real_account_type: 'RECEIVABLE',
    normal_balance: 'DEBIT',
    currency: 'BRL',
    economic_nature: 'ASSET',
    is_postable: true,
    requires_cost_center: false,
    requires_territory: false,
    requires_counterparty: false,
    requires_reconciliation: true,
    is_third_party: false,
    decision_status: AccountBlueprintStatus.PENDING_ACCOUNTANT,
    blocking_reasons: [AccountBlueprintBlockingReason.COUNTER_REVIEW_REQUIRED],
    notes: 'Disputed transactions from passengers (chargebacks). Implementation depends on chargeback workflow.',
  },

  // Pre-paid & Other (1301, 1401)
  {
    code: '1301',
    name: 'Pre-paid Services',
    parent_code: null,
    proposed_account_type: 'INTERNAL',
    mapped_real_account_type: 'INTERNAL',
    normal_balance: 'DEBIT',
    currency: 'BRL',
    economic_nature: 'ASSET',
    is_postable: true,
    requires_cost_center: false,
    requires_territory: false,
    requires_counterparty: false,
    requires_reconciliation: false,
    is_third_party: false,
    decision_status: AccountBlueprintStatus.READY_FOR_TECHNICAL_CREATION,
    blocking_reasons: [],
    notes: 'Administrative prepayments (e.g., annual software licenses, insurance). Not for driver credits.',
  },
  {
    code: '1401',
    name: 'Allowance for Doubtful Receivables',
    parent_code: null,
    proposed_account_type: 'CLEARING',
    mapped_real_account_type: 'CLEARING',
    normal_balance: 'CREDIT',
    currency: 'BRL',
    economic_nature: 'ASSET_CONTRA',
    is_postable: true,
    requires_cost_center: false,
    requires_territory: false,
    requires_counterparty: false,
    requires_reconciliation: false,
    is_third_party: false,
    decision_status: AccountBlueprintStatus.READY_FOR_TECHNICAL_CREATION,
    blocking_reasons: [],
    notes: 'Contra-receivable (provision for uncollectible amounts). Credit balance offsets AR accounts.',
  },
];

// LIABILITIES SECTION (2100-2400)

export const BLUEPRINT_LIABILITIES: AccountBlueprint[] = [
  // Driver-Related Payables (2101-2104)
  {
    code: '2101',
    name: 'Pre-paid Driver Credits - Liability',
    parent_code: null,
    proposed_account_type: 'PAYABLE',
    mapped_real_account_type: 'PAYABLE',
    normal_balance: 'CREDIT',
    currency: 'BRL',
    economic_nature: 'LIABILITY',
    is_postable: true,
    requires_cost_center: true,
    requires_territory: false,
    requires_counterparty: true,
    requires_reconciliation: true,
    is_third_party: true,
    decision_status: AccountBlueprintStatus.READY_FOR_TECHNICAL_CREATION,
    blocking_reasons: [],
    notes: 'Driver pre-paid credits (from SumUp recharge). 100% of purchased value becomes consumable credit — no portion of the purchase is retained to finance bonuses. KAVIAR owes the full value back to the driver. Liability decreases as the platform fee is consumed on valid completed rides (the 18% fee is debited here; the 82% driver earnings are settled separately via 2102). The purchase itself generates no revenue.',
  },
  {
    code: '2102',
    name: 'Payable to Drivers - Earnings',
    parent_code: null,
    proposed_account_type: 'PAYABLE',
    mapped_real_account_type: 'PAYABLE',
    normal_balance: 'CREDIT',
    currency: 'BRL',
    economic_nature: 'LIABILITY',
    is_postable: true,
    requires_cost_center: true,
    requires_territory: false,
    requires_counterparty: true,
    requires_reconciliation: true,
    is_third_party: true,
    decision_status: AccountBlueprintStatus.READY_FOR_TECHNICAL_CREATION,
    blocking_reasons: [],
    notes: '82% of ride fare owed to driver. Paired with driver_id as counterparty. Settled via wallet or direct payout.',
  },
  {
    code: '2103',
    name: 'Payable to Drivers - Earned Bonus',
    parent_code: null,
    proposed_account_type: 'PAYABLE',
    mapped_real_account_type: 'PAYABLE',
    normal_balance: 'CREDIT',
    currency: 'BRL',
    economic_nature: 'LIABILITY',
    is_postable: true,
    requires_cost_center: true,
    requires_territory: false,
    requires_counterparty: true,
    requires_reconciliation: true,
    is_third_party: true,
    decision_status: AccountBlueprintStatus.READY_FOR_TECHNICAL_CREATION,
    blocking_reasons: [],
    notes: 'Obligation financed entirely by KAVIAR. Arises after a valid completed ride. Amount is defined by a configurable, versioned campaign — no fixed percentage. Can be settled via PIX/bank transfer or converted to driver credits. driver_id is a counterparty reference, not an individual accounting account. Do not create one account per driver.',
  },
  {
    code: '2104',
    name: 'Payable to Drivers - Refunds',
    parent_code: null,
    proposed_account_type: 'PAYABLE',
    mapped_real_account_type: 'PAYABLE',
    normal_balance: 'CREDIT',
    currency: 'BRL',
    economic_nature: 'LIABILITY',
    is_postable: true,
    requires_cost_center: true,
    requires_territory: false,
    requires_counterparty: true,
    requires_reconciliation: true,
    is_third_party: true,
    decision_status: AccountBlueprintStatus.PENDING_ACCOUNTANT,
    blocking_reasons: [AccountBlueprintBlockingReason.COUNTER_REVIEW_REQUIRED],
    notes: 'Cancellation/chargeback refunds to drivers. Currently not fully implemented.',
  },

  // Manager/Territory Payables (2201-2203)
  {
    code: '2201',
    name: 'Payable to Managers - Provision',
    parent_code: null,
    proposed_account_type: 'PAYABLE',
    mapped_real_account_type: 'PAYABLE',
    normal_balance: 'CREDIT',
    currency: 'BRL',
    economic_nature: 'LIABILITY',
    is_postable: true,
    requires_cost_center: true,
    requires_territory: true,
    requires_counterparty: true,
    requires_reconciliation: true,
    is_third_party: true,
    decision_status: AccountBlueprintStatus.PENDING_ACCOUNTANT,
    blocking_reasons: [AccountBlueprintBlockingReason.COUNTER_REVIEW_REQUIRED],
    notes: 'Monthly manager payout accrual (7.2% of rides). Awaiting tax treatment decision (ISS, IRRF, NFS-e).',
  },
  {
    code: '2202',
    name: 'Payable to Managers - Bonus',
    parent_code: null,
    proposed_account_type: 'PAYABLE',
    mapped_real_account_type: 'PAYABLE',
    normal_balance: 'CREDIT',
    currency: 'BRL',
    economic_nature: 'LIABILITY',
    is_postable: true,
    requires_cost_center: true,
    requires_territory: true,
    requires_counterparty: true,
    requires_reconciliation: true,
    is_third_party: true,
    decision_status: AccountBlueprintStatus.PENDING_LEGAL,
    blocking_reasons: [AccountBlueprintBlockingReason.LEGAL_COMPLIANCE_REQUIRED],
    notes: 'Manager-financed portion of bonus (withheld from manager payout). Pending legal validation of withholding enforceability.',
  },
  {
    code: '2203',
    name: 'Payable to Managers - Adjustments',
    parent_code: null,
    proposed_account_type: 'PAYABLE',
    mapped_real_account_type: 'PAYABLE',
    normal_balance: 'CREDIT',
    currency: 'BRL',
    economic_nature: 'LIABILITY',
    is_postable: true,
    requires_cost_center: true,
    requires_territory: true,
    requires_counterparty: true,
    requires_reconciliation: true,
    is_third_party: true,
    decision_status: AccountBlueprintStatus.PENDING_ACCOUNTANT,
    blocking_reasons: [AccountBlueprintBlockingReason.COUNTER_REVIEW_REQUIRED],
    notes: 'Reconciliation, penalties, credits, claw-backs. Treatment depends on accountant decision on negative payouts.',
  },

  // Tax Payables (2301-2304)
  {
    code: '2301',
    name: 'Taxes Payable - ISS',
    parent_code: null,
    proposed_account_type: 'TAX',
    mapped_real_account_type: 'TAX',
    normal_balance: 'CREDIT',
    currency: 'BRL',
    economic_nature: 'LIABILITY',
    is_postable: true,
    requires_cost_center: false,
    requires_territory: true,
    requires_counterparty: false,
    requires_reconciliation: true,
    is_third_party: false,
    decision_status: AccountBlueprintStatus.PENDING_ACCOUNTANT,
    blocking_reasons: [AccountBlueprintBlockingReason.COUNTER_REVIEW_REQUIRED],
    notes: 'Service tax on rides. Rate and applicability by municipality pending counter decision. Linked to territory_id.',
  },
  {
    code: '2302',
    name: 'Taxes Payable - IRRF',
    parent_code: null,
    proposed_account_type: 'TAX',
    mapped_real_account_type: 'TAX',
    normal_balance: 'CREDIT',
    currency: 'BRL',
    economic_nature: 'LIABILITY',
    is_postable: true,
    requires_cost_center: false,
    requires_territory: false,
    requires_counterparty: false,
    requires_reconciliation: true,
    is_third_party: false,
    decision_status: AccountBlueprintStatus.PENDING_LEGAL,
    blocking_reasons: [AccountBlueprintBlockingReason.LEGAL_COMPLIANCE_REQUIRED],
    notes: 'Withholding tax from manager payments. Rate (15%? conditional?) pending legal/counter decision.',
  },
  {
    code: '2303',
    name: 'Taxes Payable - INSS',
    parent_code: null,
    proposed_account_type: 'TAX',
    mapped_real_account_type: 'TAX',
    normal_balance: 'CREDIT',
    currency: 'BRL',
    economic_nature: 'LIABILITY',
    is_postable: true,
    requires_cost_center: false,
    requires_territory: false,
    requires_counterparty: false,
    requires_reconciliation: true,
    is_third_party: false,
    decision_status: AccountBlueprintStatus.PENDING_ACCOUNTANT,
    blocking_reasons: [AccountBlueprintBlockingReason.COUNTER_REVIEW_REQUIRED],
    notes: 'Social security contribution. Applicability and rate pending counter decision.',
  },
  {
    code: '2304',
    name: 'Taxes Payable - PIS/Cofins',
    parent_code: null,
    proposed_account_type: 'TAX',
    mapped_real_account_type: 'TAX',
    normal_balance: 'CREDIT',
    currency: 'BRL',
    economic_nature: 'LIABILITY',
    is_postable: true,
    requires_cost_center: false,
    requires_territory: false,
    requires_counterparty: false,
    requires_reconciliation: true,
    is_third_party: false,
    decision_status: AccountBlueprintStatus.PENDING_ACCOUNTANT,
    blocking_reasons: [AccountBlueprintBlockingReason.COUNTER_REVIEW_REQUIRED],
    notes: 'Social contribution (PIS/Cofins). Applicability by service code pending counter decision.',
  },

  // Other Payables (2401-2402)
  {
    code: '2401',
    name: 'Payable to Partners - Commission',
    parent_code: null,
    proposed_account_type: 'PAYABLE',
    mapped_real_account_type: 'PAYABLE',
    normal_balance: 'CREDIT',
    currency: 'BRL',
    economic_nature: 'LIABILITY',
    is_postable: true,
    requires_cost_center: false,
    requires_territory: true,
    requires_counterparty: true,
    requires_reconciliation: true,
    is_third_party: true,
    decision_status: AccountBlueprintStatus.PENDING_ACCOUNTANT,
    blocking_reasons: [AccountBlueprintBlockingReason.COUNTER_REVIEW_REQUIRED],
    notes: 'Partner/affiliate commission. Currently deducted from manager share; may become separate policy.',
  },
  {
    code: '2402',
    name: 'Chargebacks Payable',
    parent_code: null,
    proposed_account_type: 'PAYABLE',
    mapped_real_account_type: 'PAYABLE',
    normal_balance: 'CREDIT',
    currency: 'BRL',
    economic_nature: 'LIABILITY',
    is_postable: true,
    requires_cost_center: false,
    requires_territory: false,
    requires_counterparty: false,
    requires_reconciliation: true,
    is_third_party: false,
    decision_status: AccountBlueprintStatus.PENDING_ACCOUNTANT,
    blocking_reasons: [AccountBlueprintBlockingReason.COUNTER_REVIEW_REQUIRED],
    notes: 'Disputed passenger transactions. Chargeback workflow not yet implemented.',
  },
];

// REVENUE SECTION (3100-3200)
// NOTE: These are actually financial_categories (kind=REVENUE), not financial_accounts
// They represent revenue classification nodes, not posting accounts.
// Posting occurs to specific account types (e.g., BANK for cash receipts).

export const BLUEPRINT_REVENUE: AccountBlueprint[] = [
  // Ride Revenue (3101-3103)
  {
    code: '3101',
    name: 'Revenue - Platform Fee (Rides)',
    parent_code: null,
    proposed_account_type: 'REVENUE (Category)',
    mapped_real_account_type: 'CLEARING', // Categories use CLEARING or neutral type
    normal_balance: 'CREDIT',
    currency: 'BRL',
    economic_nature: 'REVENUE',
    is_postable: true,
    requires_cost_center: true,
    requires_territory: true,
    requires_counterparty: false,
    requires_reconciliation: true,
    is_third_party: false,
    decision_status: AccountBlueprintStatus.PENDING_ACCOUNTANT,
    blocking_reasons: [AccountBlueprintBlockingReason.COUNTER_REVIEW_REQUIRED],
    notes: 'KAVIAR acts as agent/intermediary — recognizes only the platform fee (approximately 18%), not the gross ride value. The 82% paid directly to the driver does not transit through KAVIAR accounting. Revenue recognition occurs on a valid completed ride. Taxation (ISS) and fiscal emission (NFS-e) remain dependent on municipal parametrization and applicable tax regime. Gross vs. net recognition treatment pending counter validation.',
  },
  {
    code: '3102',
    name: 'Revenue - Cancellation Fees',
    parent_code: null,
    proposed_account_type: 'REVENUE (Category)',
    mapped_real_account_type: 'CLEARING',
    normal_balance: 'CREDIT',
    currency: 'BRL',
    economic_nature: 'REVENUE',
    is_postable: true,
    requires_cost_center: true,
    requires_territory: false,
    requires_counterparty: false,
    requires_reconciliation: true,
    is_third_party: false,
    decision_status: AccountBlueprintStatus.PENDING_ACCOUNTANT,
    blocking_reasons: [AccountBlueprintBlockingReason.COUNTER_REVIEW_REQUIRED],
    notes: 'No-show/cancellation penalties. Rare usage. Will be a financial_category. Recognition treatment pending.',
  },
  {
    code: '3103',
    name: 'Revenue - Adjustment / Credit Corrections',
    parent_code: null,
    proposed_account_type: 'REVENUE (Category)',
    mapped_real_account_type: 'CLEARING',
    normal_balance: 'CREDIT',
    currency: 'BRL',
    economic_nature: 'REVENUE',
    is_postable: true,
    requires_cost_center: true,
    requires_territory: false,
    requires_counterparty: false,
    requires_reconciliation: false,
    is_third_party: false,
    decision_status: AccountBlueprintStatus.READY_FOR_TECHNICAL_CREATION,
    blocking_reasons: [],
    notes: 'Manual corrections and disputed resolution. Rare usage. Will be a financial_category.',
  },

  // Other Revenue (3201-3202)
  {
    code: '3201',
    name: 'Revenue - Commercial Partnerships / Referral Commission',
    parent_code: null,
    proposed_account_type: 'REVENUE (Category)',
    mapped_real_account_type: 'CLEARING',
    normal_balance: 'CREDIT',
    currency: 'BRL',
    economic_nature: 'REVENUE',
    is_postable: true,
    requires_cost_center: false,
    requires_territory: false,
    requires_counterparty: false,
    requires_reconciliation: false,
    is_third_party: false,
    decision_status: AccountBlueprintStatus.PENDING_ACCOUNTANT,
    blocking_reasons: [AccountBlueprintBlockingReason.COUNTER_REVIEW_REQUIRED],
    notes: 'Admin-approved: represents only values economically belonging to KAVIAR (commission received for referral, advertising or commercial intermediation). Must not represent gross commerce sales, driver money, manager share or commissions owed by KAVIAR. Requires contract, triggering event, calculation rule, validity period and documentation. Gross vs. net recognition remains pending counter decision.',
  },
  {
    code: '3202',
    name: 'Revenue - Deferred - Recognized',
    parent_code: null,
    proposed_account_type: 'REVENUE (Category)',
    mapped_real_account_type: 'CLEARING',
    normal_balance: 'CREDIT',
    currency: 'BRL',
    economic_nature: 'REVENUE',
    is_postable: true,
    requires_cost_center: true,
    requires_territory: false,
    requires_counterparty: false,
    requires_reconciliation: true,
    is_third_party: false,
    decision_status: AccountBlueprintStatus.PENDING_ACCOUNTANT,
    blocking_reasons: [AccountBlueprintBlockingReason.COUNTER_REVIEW_REQUIRED],
    notes: 'Pre-paid credits converted to revenue when consumed. Recognition timing pending counter decision. Will be a financial_category.',
  },
  // Revenue Deduction (3301)
  // BLOCKED_BY_SCHEMA: the current schema and materializer do not have an unambiguous
  // representation for REVENUE_DEDUCTION economic_nature. This entry is recorded in the
  // blueprint as a proposal. It must NOT be materialized as EXPENSE or plain REVENUE.
  // Unblock condition: schema must add native support for REVENUE_DEDUCTION kind so the
  // materializer can represent it unambiguously (e.g., as a contra-revenue category).
  {
    code: '3301',
    name: 'Revenue Deduction - Driver Earned Bonus',
    parent_code: null,
    proposed_account_type: 'REVENUE_DEDUCTION (Category)',
    mapped_real_account_type: 'CLEARING',
    normal_balance: 'DEBIT',
    currency: 'BRL',
    economic_nature: 'REVENUE_DEDUCTION',
    is_postable: false,
    requires_cost_center: true,
    requires_territory: false,
    requires_counterparty: false,
    requires_reconciliation: true,
    is_third_party: false,
    decision_status: AccountBlueprintStatus.BLOCKED_BY_SCHEMA,
    blocking_reasons: [AccountBlueprintBlockingReason.REVENUE_DEDUCTION_NOT_SUPPORTED],
    notes: 'Dedução da Receita - Bônus Adquirido por Motoristas. BLOCKED_BY_SCHEMA: the current financial_category_kind enum and materializer do not support REVENUE_DEDUCTION as a distinct economic nature — classifying it as EXPENSE or REVENUE would be incorrect. Counterpart of 2103 (Payable to Drivers - Earned Bonus). Triggered by a valid completed ride. Amount is campaign-configurable (no fixed percentage). Unblock condition: add REVENUE_DEDUCTION to financial_category_kind enum and update the materializer to handle it as a contra-revenue item (separate from operating expenses).',
  },
];

// EXPENSES & PROVISIONS SECTION (4100-4400)
// NOTE: These are actually financial_categories (kind=EXPENSE), not financial_accounts
// They represent expense/provision classification nodes, not posting accounts.
// Posting occurs to specific account types (e.g., PAYABLE for accruals).

export const BLUEPRINT_EXPENSES: AccountBlueprint[] = [
  // Ride-Related Expenses (4101-4103)
  {
    code: '4101',
    name: 'Expense - Manager Regional Share',
    parent_code: null,
    proposed_account_type: 'EXPENSE (Category)',
    mapped_real_account_type: 'CLEARING',
    normal_balance: 'DEBIT',
    currency: 'BRL',
    economic_nature: 'EXPENSE',
    is_postable: true,
    requires_cost_center: true,
    requires_territory: true,
    requires_counterparty: true,
    requires_reconciliation: true,
    is_third_party: true,
    decision_status: AccountBlueprintStatus.PENDING_ACCOUNTANT,
    blocking_reasons: [AccountBlueprintBlockingReason.COUNTER_REVIEW_REQUIRED],
    notes: '40% of fee shared to manager. Will be a financial_category. Classification as expense vs. cost-share pending counter decision.',
  },
  {
    code: '4102',
    name: 'Expense - Commercial Partner Commission',
    parent_code: null,
    proposed_account_type: 'EXPENSE (Category)',
    mapped_real_account_type: 'CLEARING',
    normal_balance: 'DEBIT',
    currency: 'BRL',
    economic_nature: 'EXPENSE',
    is_postable: true,
    requires_cost_center: false,
    requires_territory: true,
    requires_counterparty: true,
    requires_reconciliation: true,
    is_third_party: true,
    decision_status: AccountBlueprintStatus.PENDING_ACCOUNTANT,
    blocking_reasons: [AccountBlueprintBlockingReason.COUNTER_REVIEW_REQUIRED],
    notes: 'Admin-approved: commercial partner commission must be separated from manager territorial share and from referral rewards. Requires partner_id, contract, versioned rule, triggering event and accrual period. Treatment as expense, contractual cost or revenue deduction remains pending counter decision.',
  },
  {
    code: '4103',
    name: 'Expense - SumUp Processing Fee',
    parent_code: null,
    proposed_account_type: 'EXPENSE (Category)',
    mapped_real_account_type: 'CLEARING',
    normal_balance: 'DEBIT',
    currency: 'BRL',
    economic_nature: 'EXPENSE',
    is_postable: true,
    requires_cost_center: false,
    requires_territory: false,
    requires_counterparty: false,
    requires_reconciliation: true,
    is_third_party: false,
    decision_status: AccountBlueprintStatus.READY_FOR_TECHNICAL_CREATION,
    blocking_reasons: [],
    notes: 'Payment processor fee from SumUp (if not retained by processor). May be zero if retained. Will be a financial_category.',
  },

  // Provisioning & Accruals (4201-4203)
  {
    code: '4201',
    name: 'Provision - Manager Payments (Monthly)',
    parent_code: null,
    proposed_account_type: 'EXPENSE (Category)',
    mapped_real_account_type: 'CLEARING',
    normal_balance: 'DEBIT',
    currency: 'BRL',
    economic_nature: 'EXPENSE',
    is_postable: true,
    requires_cost_center: true,
    requires_territory: true,
    requires_counterparty: false,
    requires_reconciliation: true,
    is_third_party: false,
    decision_status: AccountBlueprintStatus.PENDING_ACCOUNTANT,
    blocking_reasons: [AccountBlueprintBlockingReason.COUNTER_REVIEW_REQUIRED],
    notes: '7.2% per ride (40% of 18%). Paired with 2201 (Payable to Managers). Will be a financial_category. Pending tax treatment.',
  },
  {
    code: '4202',
    name: 'Provision - Bonus KAVIAR (Annual)',
    parent_code: null,
    proposed_account_type: 'EXPENSE (Category)',
    mapped_real_account_type: 'CLEARING',
    normal_balance: 'DEBIT',
    currency: 'BRL',
    economic_nature: 'EXPENSE',
    is_postable: false,
    requires_cost_center: true,
    requires_territory: false,
    requires_counterparty: false,
    requires_reconciliation: true,
    is_third_party: false,
    decision_status: AccountBlueprintStatus.REJECTED,
    blocking_reasons: [AccountBlueprintBlockingReason.BUSINESS_RULE_VIOLATION],
    notes: 'REJECTED — superseded by revenue-deduction treatment per approved bonus policy (v1.1.0). The bonus must be classified as a revenue deduction (REVENUE_DEDUCTION), not as an operating expense. Use 3301 (Revenue Deduction - Driver Earned Bonus) and 2103 (Payable to Drivers - Earned Bonus) instead. Do not delete existing database records; do not create destructive logic; do not attempt to correct production.',
  },
  {
    code: '4203',
    name: 'Provision - Bonus Manager (Annual)',
    parent_code: null,
    proposed_account_type: 'EXPENSE (Category)',
    mapped_real_account_type: 'CLEARING',
    normal_balance: 'DEBIT',
    currency: 'BRL',
    economic_nature: 'EXPENSE',
    is_postable: true,
    requires_cost_center: true,
    requires_territory: true,
    requires_counterparty: false,
    requires_reconciliation: true,
    is_third_party: false,
    decision_status: AccountBlueprintStatus.PENDING_LEGAL,
    blocking_reasons: [AccountBlueprintBlockingReason.LEGAL_COMPLIANCE_REQUIRED],
    notes: 'Manager-financed bonus (withheld from payout). Configurable campaign model. Will be a financial_category. Pending legal validation.',
  },

  // Taxes & Withholding (4301-4303)
  {
    code: '4301',
    name: 'Expense - ISS (Service Tax)',
    parent_code: null,
    proposed_account_type: 'EXPENSE (Category)',
    mapped_real_account_type: 'CLEARING',
    normal_balance: 'DEBIT',
    currency: 'BRL',
    economic_nature: 'EXPENSE',
    is_postable: true,
    requires_cost_center: false,
    requires_territory: true,
    requires_counterparty: false,
    requires_reconciliation: true,
    is_third_party: false,
    decision_status: AccountBlueprintStatus.PENDING_ACCOUNTANT,
    blocking_reasons: [AccountBlueprintBlockingReason.COUNTER_REVIEW_REQUIRED],
    notes: 'Service tax on rides. Will be a financial_category. Rate and applicability by municipality pending counter decision.',
  },
  {
    code: '4302',
    name: 'Expense - Withholding Tax',
    parent_code: null,
    proposed_account_type: 'EXPENSE (Category)',
    mapped_real_account_type: 'CLEARING',
    normal_balance: 'DEBIT',
    currency: 'BRL',
    economic_nature: 'EXPENSE',
    is_postable: true,
    requires_cost_center: false,
    requires_territory: false,
    requires_counterparty: false,
    requires_reconciliation: true,
    is_third_party: false,
    decision_status: AccountBlueprintStatus.PENDING_LEGAL,
    blocking_reasons: [AccountBlueprintBlockingReason.LEGAL_COMPLIANCE_REQUIRED],
    notes: 'Temporary holding of withholding from third parties. Will be a financial_category. Rate and applicability pending legal decision.',
  },
  {
    code: '4303',
    name: 'Expense - Adjustment / Write-offs',
    parent_code: null,
    proposed_account_type: 'EXPENSE (Category)',
    mapped_real_account_type: 'CLEARING',
    normal_balance: 'DEBIT',
    currency: 'BRL',
    economic_nature: 'EXPENSE',
    is_postable: true,
    requires_cost_center: true,
    requires_territory: false,
    requires_counterparty: false,
    requires_reconciliation: false,
    is_third_party: false,
    decision_status: AccountBlueprintStatus.READY_FOR_TECHNICAL_CREATION,
    blocking_reasons: [],
    notes: 'Uncollectible amounts and fraud losses. Rare usage. Will be a financial_category.',
  },

  // Referral & Incentives (4401-4402)
  {
    code: '4401',
    name: 'Expense - Referral Rewards (KAVIAR)',
    parent_code: null,
    proposed_account_type: 'EXPENSE (Category)',
    mapped_real_account_type: 'CLEARING',
    normal_balance: 'DEBIT',
    currency: 'BRL',
    economic_nature: 'EXPENSE',
    is_postable: true,
    requires_cost_center: true,
    requires_territory: true,
    requires_counterparty: false,
    requires_reconciliation: true,
    is_third_party: false,
    decision_status: AccountBlueprintStatus.READY_FOR_TECHNICAL_CREATION,
    blocking_reasons: [],
    notes: 'KAVIAR-financed portion of referral rewards (R$10 per successful referral). Manager pays R$10 (deducted from payout). Will be a financial_category.',
  },
  {
    code: '4402',
    name: 'Expense - Family Return Bonus (Accrual)',
    parent_code: null,
    proposed_account_type: 'EXPENSE (Category)',
    mapped_real_account_type: 'CLEARING',
    normal_balance: 'DEBIT',
    currency: 'BRL',
    economic_nature: 'EXPENSE',
    is_postable: false,
    requires_cost_center: true,
    requires_territory: false,
    requires_counterparty: false,
    requires_reconciliation: true,
    is_third_party: false,
    decision_status: AccountBlueprintStatus.REJECTED,
    blocking_reasons: [AccountBlueprintBlockingReason.BUSINESS_RULE_VIOLATION],
    notes: 'REJECTED — duplicate of the same economic fact as 4202 and the driver earned bonus. Cannot coexist as a second materializable category for the same bonus. The approved policy establishes a single revenue-deduction treatment via 3301. Do not use this code for new postings.',
  },
];

// Cost Centers (not GL accounts, but part of GL structure)
export interface CostCenterBlueprint {
  code: string;
  type: string;
  description: string;
  materialization_status: AccountBlueprintStatus;
}

export const BLUEPRINT_COST_CENTERS: CostCenterBlueprint[] = [
  {
    code: 'CC001',
    materialization_status:
      AccountBlueprintStatus.PENDING_ADMIN,
    type: 'COMPANY',
    description: 'Corporate / Matrix level',
  },
  {
    code: 'CC002',
    materialization_status:
      AccountBlueprintStatus.PENDING_ADMIN,
    type: 'TERRITORY',
    description: 'Per-territory operation (e.g., São Paulo, Rio de Janeiro)',
  },
  {
    code: 'CC003',
    materialization_status:
      AccountBlueprintStatus.PENDING_ADMIN,
    type: 'CITY',
    description: 'City-level tracking (optional, for refined cost allocation)',
  },
  {
    code: 'CC004',
    materialization_status:
      AccountBlueprintStatus.PENDING_ADMIN,
    type: 'DEPARTMENT',
    description: 'Department/function level (optional, for internal allocation)',
  },
];

// Summary counts
export const BLUEPRINT_SUMMARY = {
  total_accounts: 38,
  assets: 8,
  liabilities: 13,
  revenue: 6,
  expenses_and_provisions: 11,
  cost_centers: 4,
  ready_for_technical_creation: 0, // Will be calculated by validator
  pending_decisions: 0,
  blocked: 0,
};

// Export all blueprints as a single collection
export const ALL_ACCOUNT_BLUEPRINTS: AccountBlueprint[] = [
  ...BLUEPRINT_ASSETS,
  ...BLUEPRINT_LIABILITIES,
  ...BLUEPRINT_REVENUE,
  ...BLUEPRINT_EXPENSES,
];
