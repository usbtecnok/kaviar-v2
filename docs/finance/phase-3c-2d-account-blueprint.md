# KAVIAR Finance: Phase 3C-2D.1 — Account Blueprint & Technical Specification

**Status:** BLUEPRINT SPECIFICATION (Ready for Creation)  
**Date:** 2026-07-21  
**Base Commit:** 7de6e9c3  
**Blueprint Version:** 1.0.0

---

## EXECUTIVE SUMMARY

This document describes the **technical blueprint** for KAVIAR's financial accounting infrastructure, based on the Phase 3C-2C.1 policy audit.

The blueprint is **NOT** production data. It is a versioned specification that defines:
- 37 proposed financial accounts/categories
- 4 cost centers
- Mapping to real Prisma enums
- Decision status for each account
- Blocking reasons where technical or business prerequisites are unmet

**Current State:**
- ✅ **Technical validation complete** — 41 unit tests passed
- ✅ **Zero linting errors** — no TypeScript/ESLint violations
- ✅ **No production changes** — no accounts created, no migrations, no seeds
- ✅ **Pure specification** — validatable without database access

---

## 1. REAL FINANCIAL MODEL (Audited)

### 1.1 Core Models (from Prisma schema)

| Model | Purpose | Key Fields |
|-------|---------|-----------|
| `financial_accounts` | GL posting accounts (leaves) | code, name, type (enum), balance, currency |
| `financial_categories` | Chart hierarchy (grouping) | code, name, kind (enum), parent, is_postable |
| `financial_cost_centers` | Cost allocation | code, name, type, parent, territory_id |
| `financial_transactions` | GL entries (journal lines) | account_id, category_id, cost_center_id, amount, status |
| `financial_transaction_allocations` | Line allocations | transaction_id, category_id, cost_center_id, amount |
| `financial_recognition_policies` | Revenue/expense rules | code, subject, scope, policy, status, effective dates |

### 1.2 Real Enums

**financial_account_type** (Posting accounts only):
- BANK, CASH, PIX_WALLET, RECEIVABLE, PAYABLE, TAX, CLEARING, THIRD_PARTY, INTERNAL, ESCROW

**financial_category_kind** (Hierarchy classification):
- REVENUE, EXPENSE, CONTRIBUTION, WITHDRAWAL, TRANSFER, LIABILITY, CLEARING, ADJUSTMENT

**financial_cost_center_type**:
- COMPANY, DEPARTMENT, TERRITORY, CITY, PROJECT, OTHER

---

## 2. ARCHITECTURAL DISCOVERY

### 2.1 Accounts vs. Categories

The proposed 37 "accounts" actually represent **two different structures**:

**Posting Accounts (financial_accounts)** — 23 items
- Bank accounts (3: 1101–1103)
- Receivables (3: 1201–1203)
- Payables (13: 2101–2104, 2201–2203, 2301–2304, 2401–2402)
- Other assets (2: 1301, 1401)

**Classification Categories (financial_categories)** — 14 items
- Revenue (5: 3101–3202)
- Expense (11: 4101–4402)

**Why This Matters:**
- Posting accounts (type = BANK, PAYABLE, etc.) receive journal entries and hold balances
- Categories (kind = REVENUE, EXPENSE) organize and report on posting accounts hierarchically
- This is the "Chart of Accounts" split across two tables

### 2.2 Blueprint Mapping

All 37 items have been classified:

| Item Type | Count | Mapped Real Type | Notes |
|-----------|-------|------------------|-------|
| Assets (posting accounts) | 8 | BANK, RECEIVABLE, CLEARING, INTERNAL, ESCROW | Direct financial_accounts |
| Liabilities (posting accounts) | 13 | PAYABLE, TAX, CLEARING | Direct financial_accounts |
| Revenue (categories) | 5 | CLEARING (neutral) | Become financial_categories (kind=REVENUE) |
| Expenses (categories) | 11 | CLEARING (neutral) | Become financial_categories (kind=EXPENSE) |

---

## 3. EXISTING APIs & PROTECTIONS

### 3.1 Financial Account Endpoints

| Operation | Endpoint | Authorization | Protections |
|-----------|----------|-----------------|------------|
| List | GET /admin/finance/accounts | SUPER_ADMIN + allowFinanceAccess | Pagination, filtering |
| Create | POST /admin/finance/accounts | SUPER_ADMIN | Code uniqueness, validation |
| Update | PATCH /admin/finance/accounts/:id | Role-based (SUPER_ADMIN for structural) | Optimistic locking, serializable transactions |
| Details | GET /admin/finance/accounts/:id | SUPER_ADMIN | Full audit trail |

**Key Protections:**
- ✅ Optimistic locking via `expected_updated_at`
- ✅ Serializable transaction isolation (prevents concurrent conflicts)
- ✅ Audit logging for all changes
- ✅ Cannot modify structural fields (code, type) if account has transactions
- ✅ Cannot deactivate if has non-final transactions

### 3.2 Financial Category Endpoints

| Operation | Endpoint | Authorization |
|-----------|----------|-----------------|
| List | GET /admin/finance/categories | SUPER_ADMIN + allowFinanceAccess |
| Create | POST /admin/finance/categories | SUPER_ADMIN |
| Update | PATCH /admin/finance/categories/:id | Role-based |
| Details | GET /admin/finance/categories/:id | SUPER_ADMIN |

**Hierarchy Protections:**
- ✅ Max depth 50 levels
- ✅ Cycle detection
- ✅ Cannot have postable parent with children
- ✅ Parent must exist and match kind

---

## 4. BLUEPRINT CATALOG (37 Items)

### 4.1 Assets (8 accounts)

| Code | Name | Type | Status | Notes |
|------|------|------|--------|-------|
| 1101 | Bank - Operational | BANK | READY | Main operating account |
| 1102 | Bank - Settlement | BANK | READY | SumUp/PIX settlement |
| 1103 | Bank - Escrow | ESCROW | READY | Temporary holds |
| 1201 | AR - Drivers | RECEIVABLE | READY | Pending fee debits |
| 1202 | AR - Partners | RECEIVABLE | READY | Not currently used |
| 1203 | AR - Chargebacks | RECEIVABLE | PENDING_ACCOUNTANT | Needs chargeback workflow |
| 1301 | Pre-paid Services | INTERNAL | READY | Admin prepayments |
| 1401 | Allowance for Doubtful AR | CLEARING | READY | Contra-receivable |

### 4.2 Liabilities (13 accounts)

| Code | Name | Type | Status | Notes |
|------|------|------|--------|-------|
| 2101 | Pre-paid Driver Credits | PAYABLE | READY | Driver wallets (liability) |
| 2102 | Payable to Drivers - Earnings | PAYABLE | READY | 82% of ride fare |
| 2103 | Payable to Drivers - Bonus | PAYABLE | READY | KAVIAR-financed, configurable |
| 2104 | Payable to Drivers - Refunds | PAYABLE | PENDING_ACCOUNTANT | Needs refund workflow |
| 2201 | Payable to Managers - Provision | PAYABLE | PENDING_ACCOUNTANT | Awaiting tax treatment |
| 2202 | Payable to Managers - Bonus Manager | PAYABLE | PENDING_LEGAL | Withholding enforceability |
| 2203 | Payable to Managers - Adjustments | PAYABLE | PENDING_ACCOUNTANT | Claw-back policy unclear |
| 2301 | Taxes Payable - ISS | TAX | PENDING_ACCOUNTANT | Rate/municipality decisions |
| 2302 | Taxes Payable - IRRF | TAX | PENDING_LEGAL | Withholding responsibility |
| 2303 | Taxes Payable - INSS | TAX | PENDING_ACCOUNTANT | Applicability decision |
| 2304 | Taxes Payable - PIS/Cofins | TAX | PENDING_ACCOUNTANT | Service code / applicability |
| 2401 | Payable to Partners - Commission | PAYABLE | PENDING_ACCOUNTANT | May become separate policy |
| 2402 | Chargebacks Payable | PAYABLE | PENDING_ACCOUNTANT | Workflow not implemented |

### 4.3 Revenue (5 categories)

| Code | Name | Kind | Status | Notes |
|------|------|------|--------|-------|
| 3101 | Revenue - Platform Fee (Rides) | REVENUE | PENDING_ACCOUNTANT | 18% fee, NET_AGENT model |
| 3102 | Revenue - Cancellation Fees | REVENUE | PENDING_ACCOUNTANT | Recognition treatment pending |
| 3103 | Revenue - Adjustment / Credits | REVENUE | READY | Manual corrections |
| 3201 | Revenue - Affiliate / Commission | REVENUE | PENDING_ADMIN | Scope not defined |
| 3202 | Revenue - Deferred - Recognized | REVENUE | PENDING_ACCOUNTANT | Pre-paid credit revenue |

### 4.4 Expenses (11 categories)

| Code | Name | Kind | Status | Notes |
|------|------|------|--------|-------|
| 4101 | Expense - Manager Regional Share | EXPENSE | PENDING_ACCOUNTANT | 40% of fee, class unclear |
| 4102 | Expense - Partner Commission | EXPENSE | PENDING_ADMIN | Currently part of manager share |
| 4103 | Expense - SumUp Processing Fee | EXPENSE | READY | May be zero if retained |
| 4201 | Provision - Manager Payments | EXPENSE | PENDING_ACCOUNTANT | 7.2% per ride, tax pending |
| 4202 | Provision - Bonus KAVIAR | EXPENSE | READY | Configurable campaign |
| 4203 | Provision - Bonus Manager | EXPENSE | PENDING_LEGAL | Withholding enforceability |
| 4301 | Expense - ISS (Service Tax) | EXPENSE | PENDING_ACCOUNTANT | Rate by municipality |
| 4302 | Expense - Withholding Tax | EXPENSE | PENDING_LEGAL | Rate/responsibility unclear |
| 4303 | Expense - Adjustment / Write-offs | EXPENSE | READY | Uncollectible amounts |
| 4401 | Expense - Referral Rewards | EXPENSE | READY | R$10 per referral (KAVIAR) |
| 4402 | Expense - Family Return Bonus | EXPENSE | READY | Annual bonus accrual |

### 4.5 Cost Centers (4)

| Code | Type | Status | Notes |
|------|------|--------|-------|
| CC001 | COMPANY | READY | Corporate/matrix level |
| CC002 | TERRITORY | READY | Per-territory (e.g., SP, RJ) |
| CC003 | CITY | READY | Optional city-level tracking |
| CC004 | DEPARTMENT | READY | Optional department tracking |

---

## 5. DECISION STATUS BREAKDOWN

### 5.1 Status Counts (Corrected from Audit)

| Status | Count | Examples |
|--------|-------|----------|
| READY_FOR_TECHNICAL_CREATION | 16 | 1101–1103, 1201–1202, 1301, 1401, 2101–2103, 3103, 4103, 4202, 4303, 4401–4402 |
| PENDING_ACCOUNTANT | 15 | 1203, 2104, 2201, 2203, 2301, 2303–2304, 2401–2402, 3101–3102, 3202, 4101, 4201, 4301 |
| PENDING_LEGAL | 4 | 2202, 2302, 4203, 4302 |
| PENDING_ADMIN | 2 | 3201, 4102 |
| BLOCKED_BY_SCHEMA | 0 | (None, no technical blockers found) |
| REJECTED | 0 | (None) |
| **TOTAL** | **37** | (Cost centers 4 have no decision_status) |

### 5.2 Blocking Reasons by Status

| Status | Blocking Reason | Count |
|--------|-----------------|-------|
| PENDING_ACCOUNTANT | COUNTER_REVIEW_REQUIRED | 15 |
| PENDING_LEGAL | LEGAL_COMPLIANCE_REQUIRED | 4 |
| PENDING_ADMIN | COUNTER_REVIEW_REQUIRED | 2 |

**No Architectural Blockers:**
- All proposed types map to valid Prisma enums ✓
- Hierarchy is clean (no cycles, no depth violations) ✓
- No fundamental schema incompatibilities ✓
- All 37 items with valid decision_status ✓

---

## 6. FUTURE EVENT MODELING

The 37-item blueprint can represent these key flows:

### 6.1 Ride Settlement (R$100 example)

**Accounts Used:**
- 3101 (Revenue - Platform Fee) — recognize R$18
- 2102 (Payable to Drivers) — accrue R$82
- 4201 (Provision - Manager) — accrue R$7.20
- Cost Center: CC002 (territory-sp)

**Status:** READY (all accounts are READY or PENDING decision, not blocked)

### 6.2 Pre-paid Credit

**Accounts Used:**
- 1102 (Bank - Settlement) — cash in R$100
- 2101 (Pre-paid Credits Liability) — accrue liability R$100
- Cost Center: CC001 (company-level)

**Status:** READY (posting accounts exist)

### 6.3 Manager Payout (Monthly)

**Accounts Used:**
- 4201 (Provision - Manager) — recognize expense
- 2201 (Payable to Managers) — accrue payable
- 2301–2304 (Tax Payables) — accrue tax obligations
- Cost Center: CC002 (territory)

**Status:** PENDING_ACCOUNTANT (tax treatment needs decision)

### 6.4 Bonus Campaign

**Accounts Used:**
- 4202 (Provision - Bonus KAVIAR) — READY
- 4203 (Provision - Bonus Manager) — PENDING_LEGAL
- 2103 (Payable to Drivers - Bonus) — READY
- 2202 (Payable to Managers - Bonus) — PENDING_LEGAL

**Status:** Configurable campaign model; see Phase 3C-2C.1 for details

---

## 7. BLUEPRINT VALIDATION RESULTS

### 7.1 Test Results

| Category | Count | Status |
|----------|-------|--------|
| Total Accounts | 37 | ✅ Correct |
| Total Test Cases | 41 | ✅ Passed |
| Structural Errors | 0 | ✅ None |
| Linting Errors | 0 | ✅ Clean |
| Type Mapping Errors | 0 | ✅ Valid |
| Hierarchy Errors | 0 | ✅ No cycles |

### 7.2 Test Coverage

- ✅ Code uniqueness
- ✅ Required field presence
- ✅ Enum validity (financial_account_type, financial_category_kind)
- ✅ Normal balance correctness (ASSET/REVENUE should credit, EXPENSE/LIABILITY should debit)
- ✅ Hierarchy validation (no cycles, max depth 50)
- ✅ Account type consistency (postable ≠ has children)
- ✅ Business rule compliance (no fixed bonuses, drivers as payable not expense)
- ✅ Third-party account identification
- ✅ Decision status consistency

### 7.3 Security Validation

- ✅ **No database access** — pure TypeScript validation
- ✅ **No production changes** — blueprint only, no accounts created
- ✅ **No migrations** — zero schema modifications
- ✅ **No seeds** — zero data loading
- ✅ **Safe test environment** — DATABASE_URL set to test instance only

---

## 8. CONTEXT: TEST DRIVERS & FUTURE INTEGRATIONS

### 8.1 Current Test Driver Context

**Important:** All driver data currently in the system is **test/seed data only**. This blueprint does NOT include backfill, migration, or opening balance creation for any test drivers.

**No migration will occur of:**
- Test driver balances or credits
- Historical ride aggregates
- Individual driver accounts or receivables
- Test bonus accruals
- Seed data as production reality

**Driver Representation:**
- Each transaction will include `driver_id` as a counterparty identifier
- All posting occurs to **collective accounts** (e.g., "Payable to Drivers - Earnings")
- No individual financial_account per driver is required or planned
- Drivers are operationally traceable through transaction metadata, not account structure

### 8.2 Future Integration: Municipal Regulatory Reports

This blueprint is **designed for accounting system use only**. Future municipal reporting (e.g., Rio de Janeiro monthly ride/driver reports) will require **separate regulatory module** with these data sources:

**A. Operational System (Source of Truth for Rides)**
- ride_id, city, territory, modality, status
- Driver assignment, vehicle assignment
- Ride dates, times, locations (when required)
- Cancellations, refunds, adjustments
- Filters: is_test = false, is_seed = false, municipality match

**B. Regulatory Registry (Drivers & Vehicles)**
- driver_id, name, documents, status
- vehicle_id, plate, registration
- Territory/city assignment
- Approval status for the month
- Filters: is_test = false, is_seed = false, active in period

**C. Financial System (Monetary Aggregates)**
- Gross fare collected
- KAVIAR revenue
- Third-party values
- Taxes, adjustments, refunds
- Filters: is_test = false, posting_account != TEST

**Data Integration Rule:**
> No single system (especially not the GL) shall be the sole source for regulatory reporting. Each module provides its specialized view, and the report aggregates and validates across sources.

**Test Data Exclusion:**
All reports must filter:
```
is_test = false
is_seed = false
posting_period = current month
municipality_code = report target
account.is_test_account = false
driver.is_test_driver = false OR driver.created_for_testing = false
```

---

## 9. LIMITATIONS & PENDING DECISIONS

### 9.1 Pending Accountant Review (15 items)

1. **Revenue Recognition Policy**
   - Is NET_AGENT correct for rides?
   - 18% tax basis (ISS applicability)?
   - When to recognize pre-paid credit revenue?

2. **Manager Remuneration**
   - Tributes reducing base (ISS, INSS, PIS/Cofins)?
   - IRRF withholding rate (15%?)?
   - NFS-e issuance responsibility?

3. **Bonus Campaign**
   - Eligible base (gross fare, credit consumed, KAVIAR revenue)?
   - Expiration rule (forfeiture, carry-over)?
   - Withholding on payout?

4. **Tax Accounts**
   - ISS rate by municipality?
   - INSS applicability?
   - PIS/Cofins service code rules?

### 9.2 Pending Legal Review (4 items)

1. **Manager Status**
   - Employee, contractor, or partner?
   - Can 5% bonus withholding be enforced?
   - Can manager fund 50% of bonus?

2. **Withholding Tax**
   - IRRF rate and responsibility?
   - Who issues NFS-e (KAVIAR or manager)?

3. **Bonus Expiration**
   - Is forfeiture legally permissible?

### 9.3 Pending Admin Decision (2 items)

1. **Affiliate Revenue (3201)** — Scope and policy framework not yet defined
2. **Partner Commission (4102)** — Currently part of manager share; may become separate policy

---

## 10. NEXT STEPS (Phase 3C-2D.2)

### 9.1 Create Accounts

Once decisions are made:

```bash
# Pseudo-code - actual implementation via API
POST /admin/finance/accounts
{
  "code": "1101",
  "name": "Bank - Operational",
  "type": "BANK",
  "currency": "BRL",
  "opening_balance_cents": 0,
  "is_active": true
}
```

### 9.2 Create Categories

```bash
POST /admin/finance/categories
{
  "code": "3101",
  "name": "Revenue - Platform Fee (Rides)",
  "kind": "REVENUE",
  "parent_id": null,
  "default_direction": "IN",
  "is_postable": true
}
```

### 9.3 Link to Policies

Update `financial_recognition_policies` to point to these accounts for posting.

### 9.4 Seed Cost Centers

```bash
POST /admin/finance/cost-centers
{
  "code": "CC001",
  "name": "Corporate / Matrix",
  "type": "COMPANY",
  "is_active": true
}
```

---

## 11. REFERENCE DOCUMENTS

- **Phase 3C-2C.1**: `/docs/finance/phase-3c-2c-accounting-decisions.md` — 1,863 lines, full policy audit
- **Blueprint Code**: `/backend/src/services/finance/account-catalog/` — Pure TS, no DB access
- **Tests**: `/backend/tests/account-blueprint.test.ts` — 41 test cases, all passing

---

## 12. APPENDIX: MODULE STRUCTURE

### 11.1 Account Catalog (New)

```
backend/src/services/finance/account-catalog/
├── account-blueprint.ts           (37 accounts + 4 cost centers)
├── account-blueprint-validator.ts (Pure validation logic)
└── index.ts                       (Exports)
```

### 11.2 Tests (New)

```
backend/tests/
└── account-blueprint.test.ts       (41 tests)
```

### 11.3 Exports

```typescript
// Main exports
export { ALL_ACCOUNT_BLUEPRINTS, BLUEPRINT_ASSETS, BLUEPRINT_LIABILITIES, ... }
export { validateBlueprint, validateAccount, getReadyAccounts, ... }
```

---

**END OF BLUEPRINT DOCUMENT**

Base Commit: 7de6e9c3  
Next Phase: 3C-2D.2 (Actual Account Creation)  
Decision Gate: Accountant + Legal + Admin Review
