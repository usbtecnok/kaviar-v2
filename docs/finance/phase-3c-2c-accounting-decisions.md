# KAVIAR Finance: Phase 3C-2C.1 — Accounting Policy Decisions

**Document Status:** SPECIFICATION - NOT YET IMPLEMENTED  
**Last Updated:** 2026-07-21  
**Base Commit:** 99d821e5c86afe1636bcdc8597059778eded9879

---

## EXECUTIVE SUMMARY

This document defines the complete financial architecture for KAVIAR's automated journal entry system (Phase 3D onwards). It documents current business rules, audits real system flows, proposes accounting treatments, and identifies decisions required from accounting and legal teams.

**Current State:**
- Policy `ride_revenue.default` (RIDE_REVENUE, NET_AGENT, GLOBAL, DRAFT) — preliminary classification
- Four other policies remain UNCLASSIFIED and DRAFT
- No automatic journal entries are generated
- System implements multiple financial operation workflows (wallet, credit, settlements, payouts, bonuses, refunds)

**This phase does NOT:**
- Approve any policy
- Create or modify financial accounts
- Execute journal entries
- Alter production data
- Deploy any code

---

## 1. CURRENT POLICY STATE

### Confirmed: ride_revenue.default

```
Code:        ride_revenue.default
Subject:     RIDE_REVENUE
Scope:       GLOBAL
Policy Type: NET_AGENT
Status:      DRAFT
Created:     During ride completion settlement
Base Rate:   100% of passenger fare
KAVIAR:      18% (platform intermediation fee)
Driver:      82% (economic value due to driver)
```

**Accounting Interpretation (Current Hypothesis):**
- KAVIAR acts as agent/intermediary, not principal
- 18% fee is revenue for intermediation services
- 82% is **not** KAVIAR's expense; it is value owed to driver
- Booking should NOT double-count: neither as revenue+expense, nor as offset

---

### Remaining Policies (Status: UNCLASSIFIED, DRAFT)

| Code | Subject | Scope | Purpose |
|------|---------|-------|---------|
| `prepaid_driver_credits.default` | PREPAID_DRIVER_CREDITS | GLOBAL | Driver wallet recharge via SumUp |
| `manager_payments.default` | MANAGER_PAYMENTS | TERRITORY (future) | Manager/operator monthly payout |
| `commercial_payments.default` | COMMERCIAL_PAYMENTS | GLOBAL | Partner/commerce commission payments |
| `other.default` | OTHER | GLOBAL | Miscellaneous financial operations |

---

## 2. AUDITED FINANCIAL FLOWS

### 2.1 Ride Creation → Completion → Settlement

**Entry Point:** `POST /rides/:id/complete`  
**Flow File:** `/backend/src/routes/rides-v2.ts` (lines 901–1118)  
**Services:** `pricing-engine.ts`, `wallet-settlement.service.ts`

**Sequence:**
1. **Pricing Settlement** (`pricing-engine.settle()`)
   - Calculates final price (base + wait time)
   - Determines net earnings for driver (after platform fee)
   - Identifies settlement territory

2. **Partner Commission** (if applicable)
   - Deducts territorial partner commission from regional share
   - Records in `partner_commission` ledger

3. **Fee Settlement** (`wallet-settlement.settleRide()`)
   - Reserves 18% fee from driver wallet balance
   - If balance insufficient: creates `pending_debit` for later collection
   - If balance sufficient: immediately debits and credits matrix account

4. **Credit Consumption** (if driver has pre-paid credits)
   - Calculates credit cost equivalent (credit exchange rate)
   - Debits from driver's credit balance
   - Records credit consumption ledger entry

5. **Fee Split** (`fee-split.service.recordSplit()`)
   - 18% total fee split:
     - 60% to matrix/platform (10.8%)
     - 40% to territory manager (7.2%)
   - Tracks collected vs. pending portions

**Economic Moments:**
- **Recognition Moment:** Ride completion (service delivered)
- **Cash Moment:** Fee collection (immediate or via pending debit)
- **Value Moment (Driver):** 82% earned when ride completes (obligation recorded)

**Idempotency Key:** `ride_id`  
**Reversibility:** Release reserve on cancellation; reverse fee on refund

---

### 2.2 Wallet/Credit Operations

**Entry Points:** `POST /driver-wallet-v2/recharge/checkout`, `GET /driver-wallet-v2`  
**Flow File:** `/backend/src/services/wallet-v2/`

**Recharge Flow:**
1. Driver initiates SumUp checkout (`driver-wallet-v2.ts` → POST `/recharge/checkout`)
2. Frontend redirects to SumUp payment
3. SumUp webhook confirms payment → `webhooks-sumup.ts`
4. System credits wallet via `creditRecharge()`
5. Post-confirmation: accrues family return bonus, resolves pending debits

**Balance Calculation:**
```
Available Balance = Total Balance - Reserved (for pending rides)
Reserved = Sum of ride reserves (per active ride)
```

**Pending Debit Management:**
- Created when settlement cannot collect full fee (insufficient balance)
- Auto-resolved when driver recharges (via `resolvePending()`)
- Tracks original fee, collected portion, pending portion

**Economic Moments:**
- **Cash In:** SumUp confirms payment
- **Liability Recognition:** Pre-paid credit is ASSET (for KAVIAR), LIABILITY (to driver)
- **Liability Discharge:** Credit consumed on ride reduces obligation

**Idempotency Key:** `external_id` (SumUp checkout ID), `recharge_id`  
**Reversibility:** None fully implemented for paid recharges; cancellation only for expired checkouts

---

### 2.3 Territory Manager Payments

**Entry Points:** `POST /admin-payouts/calculate`, `PATCH /admin-payouts/:id/approve`  
**Flow File:** `/backend/src/routes/admin-payouts.ts`  
**Service:** `/backend/src/services/wallet-v2/territory-ledger.service.ts`

**Monthly Payout Calculation:**
1. **Aggregate Rides:** All completed rides in territory for period
2. **Fee Share Recording** (`territory-ledger.recordFeeShare()`)
   - 40% of 18% platform fee = 7.2% per ride
   - Records in `territory_ledger` by month
3. **Deduct Costs:**
   - Partner commission (if partner exists)
   - Referral rewards paid by manager (R$10 per driver)
   - Family return bonus financed by manager (50% of bonus)
   - Partner commission costs
4. **Create Payout Record:** Status = CALCULATED
5. **Approval Flow:** Admin reviews, approves, records payment method
6. **Mark Paid:** Records payment reference and receipt

**Current Business Rule (From User Requirements):**
```
Provisional Formula:

revenue_kaviar = eligible_value × 18%
base_gestor = revenue_kaviar - tributos_elegíveis_da_kaviar
provisao_bruta_gestor = base_gestor × 40%
retencao_bonus_gestor = provisao_bruta_gestor × 5%
valor_liquido_gestor = provisao_bruta_gestor - retencao_bonus_gestor - ajustes
```

**Pending Definition:**
- Exact tributes that reduce base
- Processor fees treatment (SumUp, payment system)
- Rounding rules
- Cancellation/refund treatment
- Claw-back conditions
- Month-end closure procedures
- NFS-e issuance rules
- Withholding tax treatment (IRRF, ISS, INSS)

**Idempotency Key:** `(territory_id, month, year)`  
**Reversibility:** Partial via `PATCH /admin-payouts/:id/cancel` (only if not paid)

---

### 2.4 Family Return Bonus (Bônus Anual)

**Entry Points:** `POST /admin-retorno-familiar/requests`, `PATCH /admin-retorno-familiar/requests/:id/approve`  
**Flow File:** `/backend/src/routes/admin-retorno-familiar.ts`  
**Service:** `/backend/src/services/wallet-v2/sumup-recharge.service.ts`

**Accrual Logic:**
- Triggered on recharge confirmation: `applyRechargePostConfirmation()`
- Formula: `accrued_bonus = recharge_amount_cents × bonus_percent / 100`
- Example (illustrative): R$100 recharge @ campaign rate → R$X accrued

**Annual Cycle:**
- Accrues during recharges or ride completion (rate per campaign)
- Driver submits claim request (status: PENDING)
- Admin approves (status: APPROVED) with optional amount adjustment
- Admin marks paid (status: PAID)
- Window: October–December (provisional; subject to campaign configuration)

**Current Business Model (From User Requirements):**
```
Base: Configurable per campaign (pending accountant decision)
KAVIAR finances: Configurable percentage (pending decision)
Manager/Territory finances: Configurable percentage (pending decision)
Provisioned: Per-ride or monthly (pending decision)
Bonus is obligation to pay, not expense
Bonus parameters are NOT fixed in code; each campaign is versioned and configurable
```

**Pending Definition:**
- Exact eligible base (gross fare, credit consumed, or other)
- How to separate KAVIAR vs. manager financing in ledger
- Monthly vs. lump-sum provisioning
- Expiration rule for unused bonus (carry-over or forfeiture)
- Tax treatment (income, withholding, etc.)

**Idempotency Key:** `(driver_id, policy_year)`  
**Reversibility:** Partial; reversion tracked separately

---

### 2.5 SumUp Integration & Reconciliation

**Entry Points:** `POST /webhooks-sumup`, scheduled reconciliation job  
**Flow Files:** `/backend/src/services/sumup-service.ts`, `/backend/src/services/wallet-v2/sumup-recharge-reconcile-scheduler.ts`

**Reconciliation Loop:**
1. Driver initiates checkout (SumUp modal)
2. Payment method submitted (card, PIX, etc.)
3. SumUp confirms payment → webhook fires
4. System reconciles: `reconcileSumUpRechargeByExternalId(checkout_id)`
5. If PAID: credits wallet, accrues bonus, resolves pending debits
6. If FAILED/CANCELLED: marks expired, no balance change
7. Scheduled job runs every 5 minutes: reconciles pending recharges

**Idempotency Key:** `checkout_id`, `recharge_id`  
**Potential Issues:**
- Webhook may not arrive (reconciliation job catches this)
- Driver may retry checkout (must be idempotent on same checkout_id)
- Fee from SumUp not currently handled in KAVIAR GL

**Economic Moments:**
- **Cash In:** SumUp confirms (not when checkout created)
- **Liability:** Pre-paid credit (CAVIAR owes value back to driver)
- **Discharge:** On ride completion (credit consumed)

---

### 2.6 Cancellations & Reversals

**Entry Points:** `POST /rides/:id/cancel`, reverse on failed settlement  
**Flow Files:** `rides-v2.ts`, `wallet-settlement.service.ts`

**Reserve Release (Ride Cancellation):**
- Passenger-initiated: cancels ride, releases reserve
- Driver-initiated: cancels ride, releases reserve
- System: timeout cancellation, releases reserve
- Service: `wallet.service.releaseReserve()`
- Idempotency: By `ride_id`

**Pending Debit Handling:**
- If ride cancelled after partial fee collection, pending debit remains
- Pending debit can be resolved on next recharge or admin adjustment

**Chargeback/Refund (Passenger):**
- Not currently implemented in rides
- Likely needed for payment disputes
- Would reverse ride settlement and credit driver

**Economic Moments:**
- Cancellation reverses all economic effects (if before settlement)
- Post-settlement cancellation: reverse revenue, credit driver back

---

### 2.7 Referral Rewards

**Entry Point:** Automatic on driver's first completed ride  
**Flow File:** `/backend/src/services/wallet-v2/referral-reward.service.ts`

**Reward Structure:**
- Reward: R$20 per qualified referral
- KAVIAR Cost: R$10
- Manager Cost: R$10
- Status Flow: ELIGIBLE → APPROVED → PAYOUT_PENDING → PAID

**Cost Recording:**
- KAVIAR: Deducted from revenue (via `territory-ledger.recordReferralCost()`)
- Manager: Deducted from manager's share

**Idempotency Key:** `(driver_id, referred_driver_id)`

---

### 2.8 Other Operations

**Admin Credit Adjustments:**
- Manual adjustment of driver credit balance
- Service: `credit.service.applyCreditDelta()`
- Creates ledger entry with adjustment reason
- May trigger referral auto-qualification
- Idempotency: By `adjustment_id`

**Partner Commission:**
- Deducted from regional fee share (7.2% manager allocation)
- Service: Records in ride settlement flow
- Idempotency: By `ride_id`

---

## 3. POLICY DECISION MATRIX

### 3.1 RIDE_REVENUE (ride_revenue.default)

| Aspect | Current | Recommendation | Confidence | Decision Needed |
|--------|---------|-----------------|------------|-----------------|
| **Code** | ride_revenue.default | Keep | High | ✓ Approved |
| **Subject** | RIDE_REVENUE | Keep | High | ✓ Approved |
| **Scope** | GLOBAL | Keep (default) | High | ✓ Approved |
| **Policy Type** | NET_AGENT | Keep | High | ✓ Approved by user |
| **Status** | DRAFT | Remains DRAFT (preliminary classification only) | High | ⚠ Pending accountant & legal confirmation |
| **Recognition Base** | 100% of passenger fare | 18% (fee portion) | High | ✓ Approved |
| **Economic Value** | Driver 82%, KAVIAR 18% | Correct interpretation | High | ✓ Approved |
| **Fato Gerador** | Ride completion | Confirmed | High | ✓ Correct |
| **Cash Recognition** | Fee settlement (immediate or pending) | Confirmed | High | ✓ Correct |
| **Journal Entry Type** | REVENUE + PAYABLE | Correct | High | ✓ Correct |
| **Accounting Treatment** | Debit: Bank/Receivable; Credit: Revenue | Yes, with payable | Medium | ⚠ See below |
| **Reversal Event** | Cancellation or chargeback | Confirmed | Medium | ⚠ Partial implementation needed |

**RIDE_REVENUE Accounting (Simplified Example: R$100 fare)**

```
At Settlement (Ride Complete):

Debit: Bank / Receivable (18%)           R$18.00
Debit: Driver Payable (82%)              R$82.00
  Credit: Revenue - Platform Fee         R$18.00
  Credit: Payable to Driver              R$82.00

Driver Pays Later (via ride earnings):

Debit: Driver Payable                    R$82.00
  Credit: Bank/PIX                       R$82.00
  (or automatically deducted from future balance)
```

**Decision for Accountant:**
1. Is treatment as NET_AGENT correct for regulatory purposes?
2. Should 82% be in a separate "driver payable" account vs. contra-revenue?
3. Tax treatment: Is 18% subject to ISS? At what rate?
4. Should fee be recognized gross (100%) then split?

---

### 3.2 PREPAID_DRIVER_CREDITS (prepaid_driver_credits.default)

| Aspect | Current | Recommendation | Confidence | Decision Needed |
|--------|---------|-----------------|------------|-----------------|
| **Code** | prepaid_driver_credits.default | Keep | High | ✓ Nominated |
| **Subject** | PREPAID_DRIVER_CREDITS | Keep | High | ✓ Nominal |
| **Scope** | GLOBAL | Keep | High | ✓ Correct |
| **Policy Type** | UNCLASSIFIED (should be distinct) | See below | Low | ⚠ **NEEDS DECISION** |
| **Status** | DRAFT | Keep until accounting treatment chosen | Medium | ⚠ Pending |
| **Recognition Base** | Recharge amount (SumUp payment) | Correct | High | ✓ Confirmed |
| **Economic Moment** | SumUp confirms payment | Correct | High | ✓ Confirmed |
| **Cash Moment** | SumUp webhook (after payment) | Correct | High | ✓ Confirmed |
| **Accounting Treatment** | NOT revenue; it is deferred revenue / liability | **KEY DECISION** | Low | ⚠ REQUIRES COUNTER |
| **Entry Type** | RECEIVABLE + LIABILITY | Correct | High | ✓ Correct |
| **Discharge Mechanism** | Credit consumed on ride → revenue recognized | Correct | Medium | ⚠ Needs implementation |

**PREPAID_DRIVER_CREDITS Accounting (Simplified Example: R$100 SumUp recharge)**

```
At SumUp Confirmation:

Debit: Bank / PIX Wallet                 R$100.00
  Credit: Pre-paid Credits Liability     R$100.00
  (Driver has R$100 credit; KAVIAR owes equivalent value)

At Ride Completion (Example: R$30 credit used toward R$100 fare):

If No Recharge:
  Debit: Driver Payable                  R$70.00 (82% of R$100)
    Credit: Revenue - Platform Fee       R$18.00 (18% of R$100)
    Credit: Pre-paid Credits Liability   R$30.00 (credit consumed)
    Credit: Bank/Pending Debit           R$22.00 (if insufficient balance)

If Driver Recharges (resolves pending):
  Debit: Pre-paid Credits Liability      R$22.00 (pending from above)
    Credit: Bank                         R$22.00 (pending debit paid)
```

**Policy Classification Problem:**
- **Current Enum:** `UNCLASSIFIED`, `GROSS_PRINCIPAL`, `NET_AGENT`
- **This Operation:** Neither GROSS nor NET; it's a **LIABILITY/DEFERRED REVENUE**
- **Required:** Either expand enum or separate pre-paid from recognition policies

**Decision for Accountant:**
1. Accounting treatment: deferred revenue vs. payable?
2. When to recognize revenue: at recharge or at consumption?
3. Expiration rules: if driver never uses credit, when to recognize? (if ever)
4. Tax implications: advance payment, PIS/Cofins timing?

---

### 3.3 MANAGER_PAYMENTS (manager_payments.default)

| Aspect | Current | Recommendation | Confidence | Decision Needed |
|--------|---------|-----------------|------------|-----------------|
| **Code** | manager_payments.default | Keep | High | ✓ Nominated |
| **Subject** | MANAGER_PAYMENTS | Keep | High | ✓ Nominal |
| **Scope** | TERRITORY | Should be TERRITORY-scoped | High | ✓ Correct |
| **Policy Type** | UNCLASSIFIED (is this expense, provision, payable?) | **SEE BELOW** | Low | ⚠ **NEEDS DECISION** |
| **Status** | DRAFT | Keep until role clarified | Medium | ⚠ Pending |
| **Recognition Base** | 40% of 18% fee (7.2% per ride) | Correct | High | ✓ Confirmed by user |
| **Economic Moment** | Ride completion | Correct | High | ✓ Confirmed |
| **Cash Moment** | Monthly payout (30 days) | Confirmed | High | ✓ Confirmed |
| **Accounting Treatment** | Provision + Payable (not immediate expense) | Correct | Medium | ⚠ Needs implementation |
| **Taxes to Deduct** | ISS, INSS, IRRF, PIS/Cofins? | Unknown | Low | ⚠ **REQUIRES COUNTER** |
| **Withholding Treaty** | NFS-e, IRRF rates? | Unknown | Low | ⚠ **REQUIRES LEGAL** |

**MANAGER_PAYMENTS Accounting (Simplified Example: R$100 fare - Provisional Structure Only)**

```
⚠️  NOTE: Tax rates and applicability are NOT determined. This structure shows
   WHERE entries would go, not the actual amounts.

At Ride Completion:

Debit: Manager Provision Expense         R$2.88 (40% of R$7.20)
  Credit: Manager Payable Provision      R$2.88
  (Recorded daily; accrued obligation)

At Month-End (IF Tributes Apply - Pending Counter Decision):

Debit: Manager Expense - Tributes         R$X.XX (⚠️  rate/base unknown)
  Credit: Tax Payable                    R$X.XX
  (Exact amount depends on: ISS rate by municipality, service code, business
   structure, invoice type, and other factors per counter determination)

Net Payable to Manager (Provisional):
  R$2.88 - R$X.XX - (other withholding if applicable) = net

At Payment (Day 30):

Debit: Manager Payable Provision        R$Y.YY (net after all deductions)
  Credit: Bank / PIX                    R$Y.YY
  (Exact amount and withholding responsibility pending counter/legal review)
```

**Policy Classification Problem:**
- Not an expense in traditional sense (manager is external party)
- Not strictly GROSS/NET; it's a **PROVISION + PAYABLE**
- May be cost-share partner (50% financed), not pure expense

**Decision for Accountant:**
1. Is manager remuneration: salary, fee, revenue share, or cost-share?
2. What tributes reduce the 7.2% base? (ISS, INSS, IRRF, etc.)
3. NFS-e issuance: when, to whom, what value?
4. IRRF withholding: 15% standard or conditional?
5. Treatment of 5% bonus retention: tax impact?
6. Claw-back rules: penalties, adjustments, reconciliation?

**Decision for Legal:**
1. Employment risk: is manager an employee, independent contractor, partner?
2. Contract requirements: terms, termination, dispute resolution?
3. Retenção contratual de 5%: enforceability for bonus pool?
4. Change of territory: what happens to accrued obligations?

---

### 3.4 COMMERCIAL_PAYMENTS (commercial_payments.default)

| Aspect | Current | Recommendation | Confidence | Decision Needed |
|--------|---------|-----------------|------------|-----------------|
| **Code** | commercial_payments.default | Keep | High | ✓ Nominated |
| **Subject** | COMMERCIAL_PAYMENTS | Keep | High | ✓ Nominal |
| **Scope** | GLOBAL (for now; may vary) | Confirm | Medium | ⚠ Confirm scope |
| **Policy Type** | UNCLASSIFIED | Likely EXPENSE or FEE | Low | ⚠ **NEEDS DECISION** |
| **Status** | DRAFT | Keep pending classification | Medium | ⚠ Pending |
| **Recognition Base** | Variable (partner commission, affiliate fee, etc.) | Confirm | Low | ⚠ **NEEDS SCOPE** |
| **Economic Moment** | Transaction dependent | Unknown | Low | ⚠ **NEEDS DEFINITION** |
| **Cash Moment** | Transaction dependent | Unknown | Low | ⚠ **NEEDS DEFINITION** |
| **Accounting Treatment** | EXPENSE or COST-SHARE | Unknown | Low | ⚠ **NEEDS DECISION** |

**Audit Finding:**
- Partner commissions are currently deducted from manager regional share (ride settlement flow)
- Not a separate "commercial payment"; it's a reduction in manager allocation
- Policy may be intended for: affiliate fees, marketplace commissions, licensing fees, etc.

**Decision Needed:**
1. Scope: Is this for partner commissions (already implemented) or new commerce category?
2. If partner commissions: should this be separate policy?
3. If new category: what transactions fall under COMMERCIAL_PAYMENTS?
4. Base: % of revenue, fixed fee, or other?
5. Tax treatment, payment method, invoice requirements?

---

### 3.5 OTHER (other.default)

| Aspect | Current | Recommendation | Confidence | Decision Needed |
|--------|---------|-----------------|------------|-----------------|
| **Code** | other.default | Keep | High | ✓ Nominated |
| **Subject** | OTHER | Keep as catch-all | Medium | ⚠ Use sparingly |
| **Scope** | GLOBAL | Keep | High | ✓ Default |
| **Policy Type** | UNCLASSIFIED | Should not use until category clarified | Low | ⚠ **MUST AVOID** |
| **Status** | DRAFT | Keep | Medium | ⚠ Reserve for future |
| **Usage** | Ad-hoc/miscellaneous | Not recommended for regular use | Low | ⚠ **DISCOURAGE** |

**Recommendation:**
- Do NOT use `other.default` for regular operations
- Reserve for one-time adjustments, manual entries
- When `OTHER` operations accumulate, extract into dedicated policy

---

## 4. PROPOSED ACCOUNTING CHART

Based on audit of system flows and business rules, the following accounts are required for Phase 3C-2D.

### 4.1 ASSETS

#### Bank Accounts
| Code | Account Name | Type | Currency | Normal Balance | Description |
|------|--------------|------|----------|-----------------|-------------|
| 1101 | Bank - Operational | BANK | BRL | Debit | Main operating account for daily cash |
| 1102 | Bank - Settlement | BANK | BRL | Debit | SumUp, PIX settlement account |
| 1103 | Bank - Escrow | ESCROW | BRL | Debit | Temporary holds (if needed) |

#### Receivables
| Code | Account Name | Type | Currency | Normal Balance | Description |
|------|--------------|------|----------|-----------------|-------------|
| 1201 | Accounts Receivable - Drivers | RECEIVABLE | BRL | Debit | From pending fee debits, advances |
| 1202 | Accounts Receivable - Partners | RECEIVABLE | BRL | Debit | If credit terms extended |
| 1203 | Accounts Receivable - Chargebacks | RECEIVABLE | BRL | Debit | Disputed transactions |

#### Pre-paid & Other
| Code | Account Name | Type | Currency | Normal Balance | Description |
|------|--------------|------|----------|-----------------|-------------|
| 1301 | Pre-paid Services | INTERNAL | BRL | Debit | Administrative prepayments |
| 1401 | Allowance for Doubtful Receivables | CLEARING | BRL | **Credit** | Contra-receivable (provision) |

---

### 4.2 LIABILITIES

#### Driver-Related Payables
| Code | Account Name | Type | Currency | Normal Balance | Description |
|------|--------------|------|----------|-----------------|-------------|
| 2101 | Pre-paid Driver Credits - Liability | PAYABLE | BRL | Credit | Driver wallets (revenue not yet earned) |
| 2102 | Payable to Drivers - Earnings | PAYABLE | BRL | Credit | Driver earnings from completed rides |
| 2103 | Payable to Drivers - Bonus | PAYABLE | BRL | Credit | Annual bonus accruals (KAVIAR portion) |
| 2104 | Payable to Drivers - Refunds | PAYABLE | BRL | Credit | Cancellation/chargeback refunds |

#### Manager/Territory Payables
| Code | Account Name | Type | Currency | Normal Balance | Description |
|------|--------------|------|----------|-----------------|-------------|
| 2201 | Payable to Managers - Provision | PAYABLE | BRL | Credit | Monthly manager payout accrual |
| 2202 | Payable to Managers - Bonus (Manager 50%) | PAYABLE | BRL | Credit | Manager's portion of annual bonus |
| 2203 | Payable to Managers - Adjustments | PAYABLE | BRL | Credit | Reconciliation, penalties, credits |

#### Tax Payables
| Code | Account Name | Type | Currency | Normal Balance | Description |
|------|--------------|------|----------|-----------------|-------------|
| 2301 | Taxes Payable - ISS | TAX | BRL | Credit | Service tax on rides |
| 2302 | Taxes Payable - IRRF | TAX | BRL | Credit | Withholding tax from manager payments |
| 2303 | Taxes Payable - INSS | TAX | BRL | Credit | Social security (if applicable) |
| 2304 | Taxes Payable - PIS/Cofins | TAX | BRL | Credit | Social contribution (if applicable) |

#### Other Payables
| Code | Account Name | Type | Currency | Normal Balance | Description |
|------|--------------|------|----------|-----------------|-------------|
| 2401 | Payable to Partners - Commission | PAYABLE | BRL | Credit | Partner/affiliate commission |
| 2402 | Chargebacks Payable | PAYABLE | BRL | Credit | Disputed passenger transactions |

---

### 4.3 REVENUE

#### Ride Revenue
| Code | Account Name | Type | Direction | Currency | Description |
|------|--------------|------|-----------|----------|-------------|
| 3101 | Revenue - Platform Fee (Rides) | REVENUE | IN | BRL | 18% intermediation fee from rides |
| 3102 | Revenue - Cancellation Fees | REVENUE | IN | BRL | No-show/cancellation penalties |
| 3103 | Revenue - Adjustment / Credit Corrections | REVENUE | IN | BRL | Manual corrections, disputed resolution |

#### Other Revenue
| Code | Account Name | Type | Direction | Currency | Description |
|------|--------------|------|-----------|----------|-------------|
| 3201 | Revenue - Affiliate / Commission | REVENUE | IN | BRL | Partner program, other sources |
| 3202 | Revenue - Deferred - Recognized | REVENUE | IN | BRL | Pre-paid credits converted to revenue |

---

### 4.4 EXPENSES & PROVISIONS

#### Ride-Related Expenses
| Code | Account Name | Type | Direction | Currency | Description |
|------|--------------|------|-----------|----------|-------------|
| 4101 | Expense - Manager Regional Share | EXPENSE | OUT | BRL | 40% of fee shared to manager (provisional) |
| 4102 | Expense - Partner Commission | EXPENSE | OUT | BRL | Commission/fees to partners |
| 4103 | Expense - SumUp Processing Fee | EXPENSE | OUT | BRL | Payment processor fee (if not retained) |

#### Provisioning & Accruals
| Code | Account Name | Type | Direction | Currency | Description |
|------|--------------|------|-----------|----------|-------------|
| 4201 | Provision - Manager Payments (Monthly) | EXPENSE | OUT | BRL | 7.2% per ride (40% of 18%) |
| 4202 | Provision - Bonus KAVIAR (Annual) | EXPENSE | OUT | BRL | 5% of eligible base (KAVIAR-financed) |
| 4203 | Provision - Bonus Manager (Annual) | EXPENSE | OUT | BRL | 5% of eligible base (manager-financed, withheld from payout) |

#### Taxes & Withholding
| Code | Account Name | Type | Direction | Currency | Description |
|------|--------------|------|-----------|----------|-------------|
| 4301 | Expense - ISS (Service Tax) | EXPENSE | OUT | BRL | Service tax on rides (⚠️  rate and applicability pending counter decision) |
| 4302 | Expense - Withholding Tax | TAX | OUT | BRL | Temporary holding for withholding from third parties (pending counter decision on IRRF) |
| 4303 | Expense - Adjustment / Write-offs | EXPENSE | OUT | BRL | Uncollectible amounts, fraud losses |

#### Referral & Incentives
| Code | Account Name | Type | Direction | Currency | Description |
|------|--------------|------|-----------|----------|-------------|
| 4401 | Expense - Referral Rewards (KAVIAR) | EXPENSE | OUT | BRL | R$10 per successful referral |
| 4402 | Expense - Family Return Bonus (Accrual) | EXPENSE | OUT | BRL | Linked to accrual in 4202 |

---

### 4.5 COST CENTERS

**Note:** Motoristas devem ser rastreados como dimensão analítica/contraparte, não como centro de custo.
Clearing deve ser uma conta de compensação na estrutura GL, não um centro de custo.

| Code | Type | Description | Requires Territory? | Requires Manager? |
|------|------|-------------|-------------------|-----------------|
| CC001 | COMPANY | Corporate / Matrix | No | No |
| CC002 | TERRITORY | Per-territory operation | **Yes** | **Yes** |
| CC003 | CITY | (Optional) City-level tracking | Yes | No |
| CC004 | DEPARTMENT | (Optional) Department/function | No | No |

---

### 4.6 Accounting Requirements by Account

| Account | Requires Cost Center? | Requires Territory? | Accepts Reversals? | Requires Idempotency? |
|---------|--------|-------------|---|---|
| Bank accounts | Maybe (by source) | No | Yes (with approval) | Yes |
| Receivables | Yes | No | Yes | Yes |
| Payables (drivers) | Yes | No | Yes (partial) | Yes |
| Payables (managers) | Yes | **Yes** | Yes (partial) | Yes |
| Tax payables | No | No | Yes (rare) | Yes |
| Revenue accounts | Yes | **Yes** | Yes | Yes |
| Expense accounts | Yes | **Yes** | Yes | Yes |

---

## 5. JOURNAL ENTRY EXAMPLES

### 5.1 Ride Settlement Example: R$100 Fare

**Scenario:** Driver completes R$100 ride, sufficient wallet balance

```
Transaction: RIDE SETTLED
Date: 2026-07-21
Ride ID: ride-abc123
Driver: driver-001
Territory: territorio-sp

Entry 1: REVENUE RECOGNITION
────────────────────────────
Debit:   1101 Bank - Operational         R$18.00 (18% fee)
  Credit: 3101 Revenue - Platform Fee    R$18.00

Entry 2: DRIVER PAYABLE
────────────────────────────
Debit:   1201 AR - Drivers                R$82.00 (net to driver)
  Credit: 2102 Payable to Drivers - Earnings  R$82.00

Entry 3: MANAGER PROVISION (40% of fee)
────────────────────────────
Debit:   4201 Provision - Manager        R$7.20 (40% of 18%)
  Credit: 2201 Payable to Managers       R$7.20

Cost Centers: CC002 (Territory = territorio-sp)
```

**Idempotency Key:** `ride-abc123` (prevents duplicate entries if replayed)

---

### 5.2 Ride with Insufficient Balance (Pending Debit)

**Scenario:** Driver has R$10 balance; 18% fee is R$18; creates R$8 pending

```
Transaction: RIDE SETTLED (Partial Collection)
Date: 2026-07-21
Ride ID: ride-abc124

Entry 1: REVENUE (full, regardless of collection)
────────────────────────────
Debit:   1101 Bank - Operational         R$10.00 (collected)
Debit:   1201 AR - Drivers               R$8.00 (pending)
  Credit: 3101 Revenue - Platform Fee    R$18.00

Entry 2: DRIVER PAYABLE (full 82%)
────────────────────────────
Debit:   1201 AR - Drivers               R$82.00
  Credit: 2102 Payable to Drivers        R$82.00

Entry 3: MANAGER PROVISION
────────────────────────────
Debit:   4201 Provision - Manager        R$7.20
  Credit: 2201 Payable to Managers       R$7.20

Idempotency Key: ride-abc124
Pending Debit Record: pending-def456 (tracks R$8 owed, resolves on recharge)
```

---

### 5.3 Pre-paid Driver Credit Purchase (SumUp)

**Scenario:** Driver purchases R$100 via SumUp, paid immediately

```
Transaction: SUMUP RECHARGE CONFIRMED
Date: 2026-07-21
Checkout ID: checkout-xyz789
Driver: driver-002

Entry 1: CASH IN (from SumUp)
────────────────────────────
Debit:   1102 Bank - Settlement          R$100.00
  Credit: 2101 Pre-paid Driver Credits - Liability  R$100.00

Note: KAVIAR has received R$100 but owes equivalent value (liability)
      Revenue will be recognized when driver uses credit on a ride

Idempotency Key: checkout-xyz789
```

---

### 5.4 Credit Consumed on Ride (R$30 of R$100)

**Scenario:** Driver uses R$30 credit + balance toward R$100 ride

```
Transaction: RIDE SETTLED (CREDIT + CASH)
Date: 2026-07-21
Ride ID: ride-abc125
Driver: driver-002
Credit Used: R$30
Balance Used: R$70

Entry 1: REVENUE
────────────────────────────
Debit:   1101 Bank - Operational         R$18.00 (fee from R$100)
Debit:   1201 AR - Drivers               R$82.00
  Credit: 2101 Pre-paid Credits Liability  R$30.00 (credit consumed)
  Credit: 2102 Payable to Drivers        R$70.00 (82% of remaining R$70)
  Credit: 3101 Revenue - Platform Fee    R$18.00

Entry 2: MANAGER PROVISION
────────────────────────────
Debit:   4201 Provision - Manager        R$7.20
  Credit: 2201 Payable to Managers       R$7.20

Note: Credit liability (2101) reduced by R$30
      Driver's pre-paid credit balance now R$70
      
Idempotency Key: ride-abc125
```

---

### 5.5 Manager Monthly Payout (Multiple Rides)

**Scenario:** Territory-SP, July 2026. Aggregated 100 rides @ avg R$100

```
Transaction: MANAGER MONTHLY PAYOUT CALCULATION
Date: 2026-08-05
Territory: territorio-sp
Month: 2026-07
Total Rides: 100
Total Fares: R$10,000.00

Calculations:
─────────────
Platform Fee (18%):    R$1,800.00
Manager Share (40%):   R$720.00
Partner Commission:    R$50.00 (estimated)
Referral Costs (20):   R$200.00 (R$10 each × manager pays half)
Family Return Costs:   R$80.00 (estimated manager half of accruals)

Provision Subtotal:    R$720.00 - R$50.00 - R$200.00 - R$80.00 = R$390.00

Entry 1: MANAGER PROVISION (monthly accrual)
─────────────────────────────────────────────
Debit:   4201 Provision - Manager        R$390.00
  Credit: 2201 Payable to Managers - Provision  R$390.00

Cost Center: CC002 (Territory = territorio-sp)
Idempotency Key: (territorio-sp, 2026-07)

Later Entry 2: MANAGER PAYOUT APPROVAL (if withheld taxes apply)
────────────────────────────────────────────────
Debit:   2201 Payable to Managers        R$390.00
Debit:   2302 Taxes Payable - IRRF       R$58.50 (estimated 15%)
  Credit: 1101 Bank                      R$331.50 (net payment)
  Credit: Tax Payable - IRRF             R$58.50 (withheld for government)

(Withholding rates TBD by accountant/legal)

Idempotency Key: payout-rec789
```

---

### 5.6 Annual Bonus Accrual (Family Return)

**Scenario:** Driver recharges R$500; bonus rate 10%; accrues R$50

```
Transaction: FAMILY RETURN BONUS ACCRUAL
Date: 2026-07-21
Checkout ID: checkout-xyz790
Driver: driver-003
Recharge Amount: R$500.00
Bonus Rate: 10%
Accrued Bonus: R$50.00
  KAVIAR Portion (5%): R$25.00
  Manager Portion (5%): R$25.00 (withheld from payout)

Entry 1: BONUS ACCRUAL (KAVIAR-financed)
────────────────────────────────────────
Debit:   4202 Provision - Bonus KAVIAR   R$25.00
  Credit: 2103 Payable to Drivers - Bonus  R$25.00

Entry 2: BONUS ACCRUAL (Manager-financed)
────────────────────────────────────────
Debit:   Territory Ledger (via 4203)      R$25.00 (withheld from manager payout)
  Credit: Bonus Manager Reserve          R$25.00

Note: Entry 2 is recorded in territory ledger as cost to manager's allocation
      When manager is paid, R$25 is withheld from their R$X payout

Idempotency Key: (driver-003, bonus-accrual-2026-07)
```

---

### 5.7 Referral Reward (R$20 total: R$10 KAVIAR, R$10 Manager)

**Scenario:** Driver completes first ride; referral reward triggered

```
Transaction: REFERRAL REWARD CREATION
Date: 2026-07-21
Ride ID: ride-abc126 (first ride)
Driver: driver-004
Referred By: driver-001
Reward Total: R$20.00
  KAVIAR Cost: R$10.00
  Manager Cost: R$10.00

Entry 1: KAVIAR REFERRAL COST
────────────────────────────
Debit:   4401 Expense - Referral (KAVIAR)  R$10.00
  Credit: 2402 Payable - Referral Reward  R$10.00

Entry 2: MANAGER REFERRAL COST (via territory ledger)
────────────────────────────────────────────────
Debit:   Territory Ledger (deduction)     R$10.00
  Credit: (withheld from manager payout)  R$10.00

Note: Reward is recorded as eligible for payout by driver/territory
      When approved and paid, entries reverse (no net P&L impact)
      But delay between accrual and payment is tracked

Idempotency Key: referral-reward-(driver-001, driver-004)
```

---

### 5.8 Ride Cancellation (Reserve Release)

**Scenario:** Passenger cancels R$100 ride before completion; R$18 fee was reserved

```
Transaction: RIDE CANCELLED
Date: 2026-07-21
Ride ID: ride-abc127
Cancellation Reason: Passenger requested
Reserved Amount: R$18.00

Entry 1: REVERSE FEE RESERVE (if collected immediately)
─────────────────────────────────────────────────────
Debit:   2102 Payable to Drivers          R$18.00 (reverses revenue/provision)
  Credit: 1101 Bank - Operational         R$18.00

Entry 2: REVERSE MANAGER PROVISION
─────────────────────────────────────
Debit:   2201 Payable to Managers         R$7.20
  Credit: 4201 Provision - Manager        R$7.20

Note: If fee was not yet collected (pending debit), only provision reverses
      Driver retains reserve until cancellation confirmation

Idempotency Key: cancellation-ride-abc127
Transaction Type: REVERSAL
```

---

## 6. MANAGER PROVISIONING MODEL (DETAILED)

### 6.1 Monthly Calculation Example (Without Automatic Deductions)

**Scenario:** Territory = São Paulo; Month = July 2026

**IMPORTANT:** Referral rewards, family return, partner commission, and SumUp processing fees are NOT automatic deductions from the manager's base. They are separate operational decisions and may be tracked in different cost allocations. The examples below separate the manager provisioning formula (correct) from operational cost tracking (not yet decided).

```
INPUT DATA:
───────────
Completed Rides:          150
Total Ride Fares:         R$15,000.00

MANAGER PROVISIONING CALCULATION (PRELIMINARY FORMULA):
──────────────────────────────────────────────────────

1. KAVIAR Revenue (18% of fares):
   R$15,000.00 × 18% = R$2,700.00

2. Tributes Eligible to Reduce Base:
   ⚠️  PENDING ACCOUNTANT DECISION
   (Which tributes actually reduce the base for manager calculation?)
   Placeholder: R$0.00 (assuming none until confirmed)

3. Base for Manager Provisioning:
   R$2,700.00 - R$0.00 = R$2,700.00

4. Manager Provision (40% of base):
   R$2,700.00 × 40% = R$1,080.00

5. Manager Bonus Withholding (5% of provision):
   R$1,080.00 × 5% = R$54.00

6. Manager Net Payout (before additional tributes on remuneration):
   R$1,080.00 - R$54.00 = R$1,026.00

OPERATIONAL COST ALLOCATION (NOT YET DEDUCTED FROM FORMULA - PENDING DECISION):
──────────────────────────────────────────────────────────────────────────────
These are tracked separately and MAY affect manager payout, but are NOT
automatic reductions to the provisioning base until explicitly decided:

   a) Partner Commissions:      R$500.00 (unclear who bears)
   b) Referral Rewards:         R$250.00 (unclear who bears; KAVIAR 50% or all?)
   c) Family Return:            R$300.00 (unclear who bears; KAVIAR 50% or all?)
   d) SumUp Processing:         Unknown (unclear allocation)

⚠️  Each of these requires explicit decision before being deducted from manager payout.

MANAGER WITHHOLDING TAX (NOT AUTOMATIC - PENDING ACCOUNTANT):
──────────────────────────────────────────────────────────────
   Gross Provision: R$1,080.00
   Withholding Tax: ⚠️ RATE UNKNOWN (15% IRRF? Other? Municipal? None?)
   
   Example only if IRRF applied: R$1,080.00 × 15% = R$162.00
   Example net if IRRF applied: R$1,080.00 - R$162.00 = R$918.00
   
   ⚠️  Rate, timing, and responsibility must be confirmed by accountant/legal.

JOURNAL ENTRIES (MANAGER PROVISIONING ONLY):
──────────────────────────────────────────────
Per-ride entries (150 × 7.2% = R$1,080.00 total):
  Debit: 4201 Provision - Manager          R$1,080.00
    Credit: 2201 Payable to Managers       R$1,080.00
    (Cost Center: CC002 Territory = territorio-sp)

Month-end (Manager Bonus Withholding):
  Debit: 2201 Payable to Managers          R$54.00
    Credit: Manager Bonus Reserve (sub-account)  R$54.00
    (Withheld for Oct-Dec bonus pool)

Payment (assumed no tax deduction, requires legal/tax decision):
  Debit: 2201 Payable to Managers          R$1,026.00
    Credit: 1101 Bank                      R$1,026.00

⚠️  If withholding taxes apply, separate payment entries required.
```

---

**EXAMPLE 2: Simpler Scenario (R$10,000 in Rides — User-Requested Format)**

```
Scenario: Same territory, simpler volumes

Completed Rides:     50
Total Ride Fares:    R$10,000.00

CALCULATION:
────────────

1. KAVIAR Revenue (18%):
   R$10,000.00 × 18% = R$1,800.00

2. Tributes (Hypothesis only - NOT YET VALIDATED):
   R$180.00 (10% assumed; marked as hypothesis pending counter review)

3. Base for Manager:
   R$1,800.00 - R$180.00 = R$1,620.00

4. Manager Provision (40%):
   R$1,620.00 × 40% = R$648.00

5. Manager Bonus Withholding (5%):
   R$648.00 × 5% = R$32.40

6. Manager Net (before withholding taxes on remuneration):
   R$648.00 - R$32.40 = R$615.60

⚠️  IMPORTANT NOTES ON THIS EXAMPLE:
   - R$180 tribute is purely HYPOTHETICAL (for illustration)
   - Actual tribute rate, base, and allocation MUST be confirmed by accountant
   - This is NOT a tax estimate; it is a placeholder showing the structure
   - Withholding tax on manager's R$648 gross remuneration is NOT included
     (pending decision on rate, timing, and responsibility)
```

**Accounting Challenges (Pending Decisions by Counter & Legal):**
1. **What tributes, if any, reduce the R$1,800.00 KAVIAR revenue base?** (ISS? INSS? PIS/Cofins? CSLL? Municipal tax? Other?)
2. **At what rate and under what rules?** (Depends on municipality, service code, business structure, invoice type)
3. **When are tributes recognized?** (On accrual, on payment, or per billing regulation?)
4. **Is IRRF withholding required on manager's R$648 gross remuneration?** (Rate? 15%? Other? Conditional?)
5. **NFS-e responsibility:** Who issues (KAVIAR or manager)? When? To whom?
6. **Negative scenario:** If tributes exceed manager's share, how is it handled? (Claw-back? Credit? Other?)
7. **How are operational costs (referral, bonus, partner commission) allocated?** (Are they deducted from manager base, tracked separately, or borne by KAVIAR?)

---

### 6.2 Year-End Reconciliation (Provisional)

**Scenario:** End of Q3 2026. Reconcile accrued vs. paid.

```
Q1-Q3 Summary:
──────────────
Total Accrued (3 months @ avg R$1,080/month):     R$3,240.00
Total Deductions (commissions, rewards):          R$3,150.00
Total Tax Provisions:                             (R$420.00)
Total Paid to Manager:                            R$75.00
Total Withheld (5% bonus):                        R$4.50
Remaining Payable:                                (R$90.00) [NEGATIVE]

Possible Adjustment Scenarios:
1. KAVIAR waives: R$90 write-off to P&L
2. Manager credit: R$90 carried forward to Q4
3. Recalculation: Error found in prior month, adjustment entry
4. Clawback: Contract term allows KAVIAR to deduct from future payout

Journal Entry (if write-off):
──────────────────────────
Debit: 4303 Expense - Adjustment / Write-offs   R$90.00
  Credit: 2201 Payable to Managers              R$90.00
```

---

## 7. ANNUAL BONUS CAMPAIGN MODEL (CONFIGURABLE & VERSIONED)

### 7.0A Bonus as Configurable Campaign (Architecture Specification)

The annual bonus is **NOT** a fixed percentage in code. It is a configurable campaign, versioned, with defined vigency and parameterized rules.

#### Campaign Structure

**Campaign 2026 (Example Reference):**
```
campaign_id:         2026-bonus-default
version:             1.0
status:              ACTIVE
effective_from:      2026-01-01
effective_until:     2026-12-31
total_percentage:    10.0%
kaviar_percentage:   5.0%
manager_percentage:  5.0%
base_calculation:    (Pending decision: Gross Fare, Credit Consumed, or KAVIAR Revenue)
currency:            BRL
allocation_window:   October 01 - December 31, 2026
unused_balance_rule: (Pending decision: Forfeiture, Carry-over, or Pool)
rounding_rule:       (Pending decision: Banker's rounding, floor, ceil, etc.)
scope:               GLOBAL
created_at:          2026-01-01
created_by:          (Admin ID)
description:         "Preliminary 2026 annual bonus campaign"
```

**Campaign 2027 (Alternative Example — Hypothetical):**
```
campaign_id:         2027-bonus-reduced
version:             1.0
total_percentage:    4.0%
kaviar_percentage:   2.0%
manager_percentage:  2.0%
effective_from:      2027-01-01
effective_until:     2027-12-31
```

**Campaign with Unequal Split (Alternative Example — Hypothetical):**
```
campaign_id:         2027-bonus-unequal
version:             1.0
total_percentage:    4.0%
kaviar_percentage:   3.0%
manager_percentage:  1.0%
effective_from:      2027-01-01
effective_until:     2027-12-31
```

#### Campaign Validation Rules (To Be Implemented)

- Percentual total is configurable (no fixed 10%)
- Percentual KAVIAR is independently configurable
- Percentual manager is independently configurable
- Constraint: `percentual_total = percentual_kaviar + percentual_manager`
- Effective date (from) is mandatory
- Effective date (until) is optional or mandatory per future decision
- Campaign status must be: DRAFT, ACTIVE, SUSPENDED, ENDED, or future values
- **Version becomes immutable after first use in provisions**
- Scope can be: GLOBAL, TERRITORY, CITY, or product/modality per future design
- Base calculation is identified, documented, and versioned with the campaign
- All percentage limits validated against administrative thresholds
- No overlapping ACTIVE campaigns for the same scope/base unless composition explicitly allowed
- No negative percentages
- Administrative approval required before ACTIVE status

#### Provisioning Vínculo (Immutable Reference to Campaign Version)

Every bonus provision must record and never modify:
```
provision_id:        prov-driver-002-2026-07
driver_id:           driver-002
manager_id:          manager-sp-001
campaign_id:         2026-bonus-default
campaign_version:    1.0
ride_id:             ride-abc-123 (or event_id)
territory_id:        territorio-sp
cost_center:         CC002
base_used:           R$1,000.00 (or other base from campaign)
base_calculation:    (Which rule was used: Gross Fare, Credit Consumed, etc.)
total_percentage:    10.0%
kaviar_percentage:   5.0%
manager_percentage:  5.0%
value_kaviar:        R$50.00
value_manager:       R$50.00
value_total:         R$100.00
currency:            BRL
competency_date:     2026-07-15
idempotency_key:     (ride-abc-123, driver-002, 2026-bonus-default, version-1.0)
reversal_link:       (If reversed, reference the reversal event)
created_at:          (Timestamp)
status:              ACCRUED or PAID
```

**CRITICAL PRINCIPLE:**
- Editing or ending a campaign does NOT recalculate provisions already using an old version
- Retroactive corrections require explicit adjustment or reversal event
- Historical data is never overwritten
- Campaign version change affects only events whose competency_date falls within the new vigency

#### No Retroactive Recalculation

Example:
- Provisions accrued in 2026 using 2026-bonus-default (10% / 5% / 5%) remain locked to that version
- Campaign 2027 can use 4% / 2% / 2%
- Events in Jan 2027 use the new campaign
- Events in Dec 2026 are unaffected by 2027 campaign changes
- If a 2026 provision needs correction, it requires a separate reversal + correction entry, not an update

#### Concurrent Campaigns (Validation & Conflict Management)

The following must be validated before activation:

1. **No Overlapping Active Campaigns** (unless composition is explicitly allowed)
   - Prevent two ACTIVE campaigns for same scope + base during overlapping period
   - Exception: Explicitly configured composition rule (e.g., seasonal + annual stacking)

2. **Date Validation**
   - Effective dates must be logically valid (from ≤ until, or until undefined)
   - No campaigns with effective_from in the past (only ACTIVE or future-dated)

3. **Percentage Validation**
   - No negative percentages
   - Total percentage ≤ administrative limit (e.g., 20% maximum)
   - Sum of financiers = total (kaviar + manager = total)

4. **Preconditions for Activation**
   - Base of calculation must be explicitly defined and versioned
   - Administrative approval required before moving to ACTIVE
   - Cannot activate with status DRAFT indefinitely

5. **Immutability After Use**
   - Once a version is used in a provision, it cannot be edited
   - Edit attempts must create a new campaign version

#### Campaign Configuration Decisions Matrix

| Decision | Current State | Options | Recommendation | Owner |
|----------|---------------|---------|-----------------|-------|
| **Who creates campaigns?** | Not defined | A. Admin only; B. CFO approval; C. Finance team; D. Committee | TBD | Admin/Finance |
| **Maximum total percentage?** | Not limited | A. 20% cap; B. 15% cap; C. No limit; D. By role approval | TBD | CFO |
| **Unequal KAVIAR/Manager split allowed?** | Yes (3%/1% example) | A. Always; B. With approval; C. Not allowed; D. By administrator | Yes | CFO/Admin |
| **Campaign scopes allowed?** | GLOBAL (primary) | A. GLOBAL only; B. GLOBAL + TERRITORY; C. All scopes; D. By decision | TBD | Product |
| **Precedence/priority rule (overlapping campaigns)?** | Not defined | A. Earliest wins; B. Highest rate wins; C. Explicit ranking; D. No overlap allowed | TBD | Finance |
| **Suspended campaign handling?** | Not addressed | A. Pause provisioning; B. Complete period normally; C. Reverse accruals; D. Pool strategy | TBD | Finance |
| **Rollover/carry-over window?** | Oct-Dec (assumed) | A. Fixed (Oct-Dec); B. Flexible; C. On-demand; D. Rolling quarterly | TBD | Product |
| **Expiration rule (unused bonus)?** | Not decided | A. No expiration; B. Annual forfeiture; C. Pool model; D. Carry-over indefinite | TBD | Finance/Legal |
| **Pre-notification (campaign change)?** | Not required | A. Immediate change; B. 30-day notice; C. Start of next period; D. Per regulation | TBD | Legal |
| **Contractual impact (rate reduction)?** | Not addressed | A. Can reduce freely; B. Requires consent; C. Trigger review; D. Protected by minimum | TBD | Legal |

---

### 7.0 Bonus Base: Candidate Options (Pending Decision)

The exact base for bonus calculation has NOT been decided. The examples below show **campaign 2026 reference** with a hypothetical 10% rate, but this is illustrative only and subject to change.

**Candidate Base A: Gross Fare Value**
- Base = Sum of 100% passenger fares for all eligible rides in the period
- Advantages: Simple, transparent to driver, mirrors revenue
- Disadvantages: Includes platform fee portion, doesn't account for credit usage

**Candidate Base B: Credit Actually Consumed**
- Base = Sum of credit points (or R$ equivalent) actually consumed by driver in transactions
- Advantages: Only counts utilization, not theoretical fares
- Disadvantages: Excludes cash-only rides, complex to track with mixed payment

**Candidate Base C: KAVIAR Revenue Portion**
- Base = Sum of 18% platform fee (KAVIAR's revenue share) from eligible rides
- Advantages: Aligns bonus with KAVIAR's actual gain
- Disadvantages: Driver sees 5% of 18% = effective 0.9% of gross fare

**Current Illustrations Use:** Gross Fare Value (Candidate A) - but this is NOT a decision, only illustrative.

⚠️ **DECISION PENDING:** Accountant and legal must confirm which base to use before Phase 3D-2B implementation.

---

### 7.1 Monthly Accrual Example — Campaign 2026 (Reference, Not Fixed)

**Important Caveat:**
This example uses the 2026 reference campaign parameters (10% total, 5% KAVIAR, 5% manager) as a baseline. These percentages are NOT locked in code and CAN change in future campaigns. Base calculation is still hypothetical (Candidate A: Gross Fare).

**Scenario:** Driver accumulates bonus from July to September 2026 under Campaign 2026-bonus-default

```
CAMPAIGN 2026 REFERENCE PARAMETERS (ILLUSTRATIVE):
──────────────────────────────────────────────────
Total Percentage:        10.0%
KAVIAR Percentage:       5.0%
Manager Percentage:      5.0%
Base:                    Gross Fare (HYPOTHESIS - not decided)

JULY 2026 (ILLUSTRATIVE - Campaign 2026, Version 1.0):
─────────────────────────────────────────────────────
Rides Completed:         20
Avg Fare:                R$100
Total Fares (Base):      R$2,000 (HYPOTHESIS)
Bonus Rate (10%):        R$200.00
  KAVIAR (5%):           R$100.00
  Manager (5%):          R$100.00 (recorded in territory ledger as withheld)

Entry 1 (KAVIAR):
  Debit: 4202 Provision - Bonus KAVIAR    R$100.00
    Credit: 2103 Payable to Drivers - Bonus  R$100.00

Entry 2 (Territory):
  Territory ledger: Bonus deduction = R$100.00
  (Withheld from manager's provisioning)

AUGUST 2026 (ILLUSTRATIVE):
────────────────────────────
Rides Completed:        22
Total Fares (Base):     R$2,200 (hypothesis)
Bonus Rate:             R$220.00
  KAVIAR (5%):          R$110.00
  Manager (5%):         R$110.00

Cumulative Bonus (July + Aug):
  KAVIAR: R$100.00 + R$110.00 = R$210.00
  Manager: R$100.00 + R$110.00 = R$210.00

SEPTEMBER 2026 (ILLUSTRATIVE):
───────────────────────────────
Rides Completed:        25
Total Fares (Base):     R$2,500 (hypothesis)
Bonus Rate:             R$250.00
  KAVIAR (5%):          R$125.00
  Manager (5%):         R$125.00

CUMULATIVE Q3 (ILLUSTRATIVE):
──────────────────────────────
Rides:                  67
Total Fares (Base):     R$6,700.00 (HYPOTHESIS - NOT CONFIRMED)
Total Bonus (10%):      R$670.00
  KAVIAR (5%):          R$335.00
  Manager (5%):         R$335.00

YTD (if Jan-Sep):       Depends on prior months and actual base definition
```

**NOTE:** All calculations above are illustrative using gross fares and 2026 campaign parameters. Replace with Candidate B or C once the base is confirmed by the accountant.

---

### 7.1B Alternative Campaign Example — 2027 (Hypothetical Reduced Rate)

**Scenario:** Campaign 2027-bonus-reduced with 4% total rate (2% KAVIAR, 2% manager)

**Campaign 2027 Parameters:**
```
Total Percentage:        4.0% (reduced from 2026)
KAVIAR Percentage:       2.0% (reduced from 2026)
Manager Percentage:      2.0% (reduced from 2026)
Base:                    Gross Fare (HYPOTHESIS)
Effective Period:        Jan 1 - Dec 31, 2027
Status:                  DRAFT (subject to approval)
```

**Monthly Example — January 2027:**
```
Rides Completed:         20
Avg Fare:                R$100
Total Fares (Base):      R$2,000
Bonus Rate (4%):         R$80.00
  KAVIAR (2%):           R$40.00
  Manager (2%):          R$40.00
```

**Quarterly Illustration — Q1 2027:**
```
Total Fares (Base):      R$6,000.00
Total Bonus (4%):        R$240.00
  KAVIAR (2%):           R$120.00
  Manager (2%):          R$120.00
```

**Key Points:**
- Campaign 2027 uses DIFFERENT percentages than 2026
- Provisions are linked to campaign version (never retroactive changes to 2026 rates)
- Driver earning in Dec 2026 uses 2026 rates; driver earning in Jan 2027 uses 2027 rates
- If a third campaign is created for Q4 2027 with even different rates, it requires a new campaign record

---

### 7.1C Unequal Split Example — Alternative Campaign (Hypothetical)

**Scenario:** Campaign 2027-bonus-unequal with 4% total, but 3% KAVIAR and 1% manager (unequal distribution)

**Campaign Parameters:**
```
Total Percentage:        4.0%
KAVIAR Percentage:       3.0% (higher than manager)
Manager Percentage:      1.0% (lower than KAVIAR)
Effective Period:        Hypothetical future period
Status:                  DRAFT (example only)
```

**Monthly Example:**
```
Rides Completed:         20
Avg Fare:                R$100
Total Fares (Base):      R$2,000
Bonus Rate (4%):         R$80.00
  KAVIAR (3%):           R$60.00
  Manager (1%):          R$20.00
```

**Key Points:**
- Percentages do NOT need to be equal
- Can be configured as 3%/1%, 2.5%/1.5%, or any split that totals 4%
- Each split is a distinct campaign version
- Unequal splits may reflect different strategic priorities or business decisions
- Once activated, split is immutable for that campaign version

---

### 7.2 Q4 Claim & Payout

**Scenario:** October 1–15, driver submits bonus claim

```
CLAIM SUBMISSION (Oct 2):
──────────────────────────
Driver Claims:    R$335.00 (KAVIAR portion only)
Status:           PENDING (awaiting approval)

ADMIN APPROVAL (Oct 10):
──────────────────────
Admin Reviews:    Confirms R$335.00 correct
Approves:         R$335.00 (or adjusted amount)
Status:           APPROVED

Entry 1 (Approval):
  No new journal entry; bonus was already accrued in 4202/2103

PAYMENT (Oct 20):
──────────────────
Debit: 2103 Payable to Drivers - Bonus   R$335.00
  Credit: 1101 Bank                      R$335.00
Status: PAID

Note: Manager's R$335 is NOT paid separately
      It remains in territory ledger as withheld amount
      Used for future manager payout or as credits
```

### 7.3 Expiration / Forfeiture Rule (Pending Decision)

**Hypothesis 1: No Expiration (Carry-over)**
```
If driver doesn't claim in Oct-Dec window:
  Bonus remains accrued in 2103 (Payable to Drivers - Bonus)
  Can be claimed in future years
  Continues to accrue in subsequent years

Journal Impact: No reversal entry; bonus is permanent liability
```

**Hypothesis 2: Annual Expiration**
```
If driver doesn't claim by Dec 31:
  Bonus is forfeited to pool or KAVIAR
  Reversal entry (Dec 31):
    Debit: 2103 Payable to Drivers - Bonus  R$335.00
      Credit: 3103 Revenue - Bonus Forfeiture  R$335.00
  
  Journal Impact: Reversal of accrual; re-recognize as revenue

Accounting Impact: Creates revenue spike in Dec
  Risk: May violate revenue recognition standards
```

**Hypothesis 3: Pool Model**
```
Forfeited bonuses accumulate in central pool
  Debit: 2103 Payable - Bonus  R$335.00
    Credit: 2105 Bonus Pool Reserve  R$335.00

Pool is redistributed or used for future bonuses
  Tracking: Separate GL sub-account
```

---

## 8. SYSTEM FLOWS: TIMING AND IDEMPOTENCY

### 8.1 Idempotency Keys (Critical for Automation)

| Flow | Current Implementation | Idempotency Key | Reversible? | Notes |
|------|------------------------|-----------------|------------|-------|
| **Ride Settlement** | ✓ Implemented | ride_id | Partial (cancellation only) | Must be safe for replay |
| **Pre-paid Credit** | ✓ Implemented | checkout_id, recharge_id | No (post-payment) | SumUp confirms once |
| **Pending Debit** | ✓ Implemented | (ride_id, driver_id) | Partial (resolve on recharge) | Handled automatically |
| **Manager Payout** | ✓ Implemented | (territory_id, month, year) | Partial (before payment) | Recalculation may occur |
| **Bonus Accrual** | ✓ Implemented | (driver_id, month) or per-ride | Partial (reversal on cancellation) | Aggregated monthly |
| **Referral Reward** | ✓ Implemented | (driver_id_referrer, driver_id_new) | Partial (before payout) | One per pair |
| **SumUp Reconciliation** | ✓ Implemented (scheduled) | checkout_id (external) | No (idempotent on retry) | Handles webhook gaps |

---

### 8.2 Economic vs. Cash Timing

| Operation | Economic Moment | Cash Moment | Gap | Handling |
|-----------|-----------------|-------------|-----|----------|
| **Ride completion** | Ride ends | Immediate (if balance) or pending | 0 or delayed | Pending debit system |
| **Pre-paid credit** | Recharge confirmed | SumUp webhook | < 1 second | Webhook + scheduled reconciliation |
| **Manager payout** | Ride completes | Month-end + 30 days | 30–40 days | Provision + accrual |
| **Annual bonus** | Ride completes | Oct–Dec (future) | 3–9 months | Progressive provisioning |
| **Referral reward** | First ride completes | Month-end or on-demand | 1–30 days | Accrual + tracking |

---

## 8.3 Administrative Decisions (Bonus Campaign Configuration)

The following decisions must be made by the Finance/Product team and documented as policy before implementation:

| Question | Current State | Options | Recommendation |
|----------|---------------|---------|-----------------|
| **Who is authorized to create campaigns?** | Not defined | A. Admin with approval; B. CFO only; C. Finance team member; D. Committee | Pending admin decision |
| **What is the maximum total bonus percentage?** | Uncapped | A. Hard cap at 20%; B. Hard cap at 15%; C. No technical limit (policy-based); D. Percentage limits per role | Pending admin decision |
| **Can campaigns have unequal splits (e.g., 3%/1%)?** | Yes (permitted) | A. Unrestricted; B. Requires CFO approval; C. Not permitted; D. By administrator role | Yes; pending approval |
| **What scopes are supported?** | GLOBAL only | A. GLOBAL only; B. GLOBAL + TERRITORY; C. Support all scopes; D. By future design | Pending product decision |
| **How to handle overlapping campaigns?** | Not addressed | A. Latest effective date wins; B. Highest rate wins; C. Explicit precedence; D. Prevent all overlaps | Pending admin decision |
| **What happens if campaign is suspended mid-period?** | Not defined | A. Provisioning pauses; B. Completes normally; C. Reverse accruals; D. Roll to pool | Pending decision |
| **When can drivers claim/roll over bonus?** | Oct-Dec (assumed) | A. Fixed annual window (Oct-Dec); B. Flexible windows; C. On-demand; D. Per campaign | Pending product decision |
| **What happens to unused bonus (forfeiture)?** | Undecided | A. No expiration (carry-over indefinite); B. Annual forfeiture to KAVIAR; C. Pool model for redistribution; D. Partial carry-over | Pending finance decision |
| **Must campaigns have advance notice to stakeholders?** | Not required | A. Immediate effect; B. 30-day advance notice; C. Start of next period; D. Pre-communication to affected drivers | Pending legal/product decision |
| **Can bonus rates be reduced retroactively?** | Not addressed | A. No (rates are locked per campaign); B. Yes (with approval); C. Only prospective; D. Contractually protected minimum | Pending legal decision |

---

## 9. DECISIONS REQUIRED FROM ACCOUNTANT

### 9.1 Revenue Recognition

| Question | Current State | Options | Recommendation |
|----------|---------------|---------|-----------------|
| **1. Is NET_AGENT correct for rides?** | Assumed | A. Yes, always; B. Yes, conditional; C. No, use GROSS_PRINCIPAL | Pending counter opinion |
| **2. Should 18% be recognized gross then split?** | Currently recognized net | A. Gross; B. Net; C. By method | Pending counter opinion |
| **3. Tax basis: is 18% subject to ISS?** | Unknown | A. Full 18%; B. Partial (less tributes); C. No ISS | Critical for P&L |
| **4. ISS rate by municipality?** | Not implemented | A. Single rate; B. By CEST code; C. By city/service | Affects tax provision |
| **5. Pre-paid credit: when to recognize?** | Not recognized | A. On recharge; B. On consumption; C. Over time | Critical decision |
| **6. Refund/chargeback treatment?** | Not currently tracked | A. Reverse revenue; B. Expense; C. Separate account | Needs implementation |

### 9.2 Manager Remuneration

| Question | Current State | Options | Recommendation |
|----------|---------------|---------|-----------------|
| **7. Is 40% of fee share or cost?** | Treated as expense | A. Expense; B. Cost-share; C. Revenue split; D. Remuneration | Impacts P&L structure |
| **8. Which tributes reduce base?** | Unknown | A. ISS only; B. ISS+INSS; C. All employment taxes; D. No reduction | Critical for calculation |
| **9. Is IRRF 15% or conditional?** | Assumed 15% | A. 15% standard; B. By region; C. By manager type; D. None | Affects net payout |
| **10. NFS-e issuance responsibility?** | Unknown | A. KAVIAR issues; B. Manager issues; C. Conditional; D. Not required | Affects compliance |
| **11. Manager bonus withholding (5% for campaign pool): tax or cost allocation?** | Ambiguous | A. Tax-like withholding (held for government); B. Cost-share deduction (business logic); C. Bonus pool allocation (held for redistribution) | Pending counter opinion |
| **12. Negative monthly payout: what happens?** | Not addressed | A. Credit carry-forward; B. Claw-back; C. Write-off; D. Waived by contract | Edge case handling |

### 9.3 Annual Bonus Accounting Treatment

| Question | Current State | Options | Recommendation |
|----------|---------------|---------|-----------------|
| **13. Eligible base for bonus (Three candidates)?** | Not specified | A. Gross fare (100% of passenger payment); B. Credit consumed (R$ value used by driver); C. KAVIAR revenue (18% platform fee) | Pending counter opinion |
| **13A. If Candidate A (Gross Fare): Tax treatment?** | Illustrative only | A. Pre-tax (full gross); B. Post-tribute; C. Other adjustment | Pending counter opinion |
| **13B. If Candidate C (KAVIAR Revenue): Correct for tributes first?** | Illustrative only | A. Gross 18% then deduct tributes; B. Tributes already deducted; C. Other method | Pending counter opinion |
| **14. Provisioning frequency?** | Unclear | A. Per-ride; B. Monthly aggregate; C. Quarterly; D. Annual lump-sum | Pending counter opinion |
| **15. Expiration rule (unused bonus)?** | Not decided | A. No expiration (indefinite carry-over); B. Annual forfeiture; C. Forfeiture to pool; D. Carry-over limited to N years | Pending counter opinion |
| **16. Payment window (Oct-Dec)?** | Assumed | A. Fixed Oct-Dec; B. Flexible per campaign; C. On-demand; D. Year-end only | Pending counter opinion |
| **17. Tax treatment (withholding on payout)?** | Unknown | A. Bonus as taxable income (withhold IRRF); B. Tax-deferred; C. No withholding required; D. Depends on campaign terms | Pending counter opinion |
| **17A. Is manager's 5% withholding (from provision) a tax or pool allocation?** | Ambiguous | A. Tax-like withholding (holds for gov); B. Bonus pool allocation (holds for redistribution); C. Cost-share deduction | Pending counter opinion |

### 9.4 Chart of Accounts

| Question | Current State | Options | Recommendation |
|----------|---------------|---------|-----------------|
| **18. Accept proposed chart?** | Attached (Section 4) | A. Accept as-is; B. Consolidate accounts; C. Expand; D. Reorganize | Design review needed |
| **19. Should pre-paid credits be "revenue" or "liability"?** | Currently liability (2101) | A. Liability (current); B. Revenue account; C. Clearing account | Accounting standard |
| **20. Separate account for pending debits?** | Tracked in sub-ledger | A. GL account; B. Sub-ledger only; C. Aging schedule; D. Allowance | Audit trail needs |

### 9.5 Tributes & Taxes

| Question | Current State | Options | Recommendation |
|----------|---------------|---------|-----------------|
| **21. PIS/Cofins applicability?** | Unknown | A. Applies to all rides; B. Conditional; C. Not applicable; D. Depends on service code | Critical for cost |
| **22. CSLL applicability?** | Unknown | A. Yes; B. No; C. Conditional; D. Depends on business structure | Tax planning |
| **23. INSS social contribution?** | Assumed for managers | A. Yes, for manager payout; B. No; C. Conditional | Affects payout calc |
| **24. Service codes (CNAEs)?** | Not implemented | A. Single code (7999-90-00 or similar); B. Multiple codes; C. By service type | Tax filing |

### 9.6 Reversals & Adjustments

| Question | Current State | Options | Recommendation |
|----------|---------------|---------|-----------------|
| **25. Chargeback handling?** | Not implemented | A. Reverse revenue; B. Create receivable; C. Fraud account; D. Insurance claim | Need process |
| **26. Refund/cancellation after payout?** | Clawback unclear | A. Mandatory claw-back; B. Voluntary adjustment; C. Write-off; D. Contract term | Legal/financial |
| **27. Audit corrections: retroactive or current?** | Not addressed | A. Retro journal entry; B. Current period adjustment; C. By period; D. Opening balance | Accounting policy |

---

## 10. DECISIONS REQUIRED FROM LEGAL

### 10.1 Manager Status & Contract

| Question | Current State | Options | Recommendation |
|----------|---------------|---------|-----------------|
| **1. Is manager an employee, contractor, or partner?** | Not defined | A. Employee (CLT); B. PJ/Contractor; C. Strategic Partner; D. Mixed | Employment law |
| **2. Can 5% bonus be withheld contractually?** | Policy assumed | A. Yes (enforceable); B. No (violates labor law); C. Conditional; D. Requires specific terms | Labor law |
| **3. Can manager remuneration include mandatory cost-share (50% of bonus)?** | Policy assumed | A. Yes (commercial); B. No (violates labor law); C. Requires explicit consent; D. Conditional | Labor law |
| **4. What triggers manager dismissal or territory change?** | Not defined | A. Cause only; B. No-cause; C. Mutual consent; D. Contract term | Employment contract |
| **5. Accrued obligations upon termination?** | Not defined | A. Paid in full; B. Forfeited; C. Pro-rata; D. Contract term | Severance |
| **6. Can KAVIAR apply claw-back (negative payout)?** | Not defined | A. Yes, fully; B. Partial only; C. Requires pre-approval; D. Not permitted | Commercial law |

### 10.2 Driver Rights & Obligations

| Question | Current State | Options | Recommendation |
|----------|---------------|---------|-----------------|
| **7. Is driver earnings from ride 82%?** | Business rule | A. Yes; B. Conditional; C. Subject to review; D. Open to negotiation | Contract terms |
| **8. Is pre-paid credit a loan or sale?** | Treated as sale | A. Sale (revenue deferred); B. Loan (repayment owed); C. Conditional; D. Deposits | Consumer protection |
| **9. Can KAVIAR offset driver earnings vs. platform fees?** | Not implemented | A. Yes (netting); B. No (separate flows); C. Conditional; D. Requires consent | Payment law |
| **10. Bonus as wage or discretionary?** | Assumed discretionary | A. Discretionary; B. Wage (must pay); C. Conditional; D. Requires contract clarity | Labor law |
| **11. Unused bonus: forfeiture allowed?** | Not decided | A. Yes (forfeiture); B. No (must pay); C. Carry-over; D. Contract term | Statutory law |

### 10.3 Consumer / Passenger Protections

| Question | Current State | Options | Recommendation |
|----------|---------------|---------|-----------------|
| **12. Chargeback responsibility: KAVIAR or driver?** | Not defined | A. KAVIAR absorbs; B. Driver absorbs; C. Split; D. Contractually assigned | Payment law |
| **13. Refund timeline & conditions?** | Partial (cancellation only) | A. Same-day; B. 30 days; C. Per regulation; D. Contractual | Consumer law |
| **14. Liability for driver cancellation fees?** | Retained by KAVIAR | A. Yes, KAVIAR retains; B. No, must refund; C. Partial; D. By regulation | Consumer law |

### 10.4 Data & Privacy

| Question | Current State | Options | Recommendation |
|----------|---------------|---------|-----------------|
| **15. Data retention: payables, refunds, disputes?** | Not addressed | A. Minimal (compliance only); B. 6 months; C. 5 years; D. Per regulation | LGPD / Tax law |
| **16. Audit trail: must be tamper-proof?** | Implemented in DB | A. DB only; B. Immutable ledger (blockchain?); C. Signed PDF; D. Regulatory standard | Audit/Compliance |

### 10.5 Regulatory Compliance

| Question | Current State | Options | Recommendation |
|----------|---------------|---------|-----------------|
| **17. NFS-e (Municipal Service Invoice) required?** | Unknown | A. Yes (mandatory); B. No; C. By municipality; D. By revenue threshold | Tax compliance |
| **18. Who must issue NFS-e?** | Unknown | A. KAVIAR; B. Manager/Driver; C. Joint; D. Platform provider | Service law |
| **19. Withholding tax responsibility (IRRF)?** | Unknown | A. KAVIAR withholds; B. Processor withholds; C. Manager withholds; D. No withholding | Tax law |
| **20. PIS/Cofins obligation?** | Unknown | A. Yes (KAVIAR); B. Yes (Third party); C. No; D. By business structure | Tax law |
| **21. Minimum documentation for payment?** | Partial (receipts only) | A. Invoice + receipt; B. NFS-e + ID; C. Contract + receipt; D. Regulatory standard | Audit standard |

---

## 11. IMPLEMENTATION ROADMAP

### Phase 3C-2C.1 (Current) — COMPLETE
- ✅ Audit financial flows
- ✅ Document policy matrix
- ✅ Propose chart of accounts
- ✅ List decisions for counter/legal

### Phase 3C-2D — PENDING
- [ ] Create financial accounts in GL
- [ ] Configure system parameters (tax rates, bonus rates, etc.)
- [ ] Implement account reconciliation procedures
- [ ] **Accountant & Legal review & approval required**

### Phase 3D-1 — PENDING
- [ ] Implement financial event service
- [ ] Wire events to GL posting engine
- [ ] Add audit trail for all journal entries

### Phase 3D-2 — PENDING
- [ ] Implement automatic ride settlement entries
- [ ] Implement wallet transaction entries
- [ ] Testing with sample data (non-prod)

### Phase 3D-2G — PENDING
- [ ] Implement manager provisioning entries
- [ ] Implement manager payout workflow

### Phase 3D-2B — PENDING
- [ ] Implement bonus accrual entries
- [ ] Implement bonus payout workflow

### Phase 3D-3 to 3D-6 — PENDING
- [ ] SumUp reconciliation entries
- [ ] Chargeback/refund entries
- [ ] Reversal entries
- [ ] Conciliation procedures

---

## 12. RISKS & LIMITATIONS

### 12.1 Technical Risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| **Idempotency failure:** Replay of same ride settlement creates duplicate entry | High | Verify idempotency key on all writes; use database unique constraints |
| **Webhook timeout (SumUp):** Payment confirmed but KAVIAR doesn't receive webhook | Medium | Implement scheduled reconciliation job (✓ already done) |
| **Pending debit accumulation:** Driver leaves platform with unpaid balance | Medium | Document write-off policy; implement aging schedule |
| **Concurrent updates:** Manager payout + new ride in same millisecond | Low | Use database transaction locks (already implemented) |
| **Reversal of complex entry:** Multi-leg transaction must reverse atomically | Medium | Test reversal logic; implement reversal entries (not overwrites) |

### 12.2 Accounting Risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| **Revenue timing error:** Recognition before cash receipt | High | Implement accrual-based provisioning; confirm with accountant |
| **Double-counting:** 82% driver value counted as both revenue and payable | High | Use liability model (payable, not expense) |
| **Tributes miscalculation:** ISS/IRRF rates differ by region/service code | High | Implement tax rate lookup table; document assumptions |
| **Negative manager payout:** Unhandled edge case | Medium | Define claw-back policy; test scenarios |
| **Bonus forfeiture:** Revenue recognition timing unclear | Medium | Confirm expiration rule with accountant before implementation |

### 12.3 Compliance Risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| **NFS-e non-compliance:** Missing invoices for tax audit | High | Clarify responsibility with legal; implement mandatory issuance |
| **Withholding tax underwithheld:** IRRF underpayment | High | Confirm rates with accountant; implement validation rules |
| **LGPD breach:** Sensitive financial data exposed | High | Implement encryption, access controls, audit logs |
| **Audit trail tampering:** GL entries modified after posting | Medium | Implement immutable ledger; cryptographic signing (optional) |

---

## 13. RECOMMENDED NEXT STEPS

### For Product/Engineering
1. **Freeze current financial flows** — Document as baseline for auditing
2. **Create integration test suite** — Validate journal entries before going live
3. **Implement GL posting API** — Abstract from business logic
4. **Add transaction reversal endpoint** — Support audit corrections
5. **Document all idempotency keys** — Critical for safety

### For Accounting
1. **Review policy matrix** (Section 3) — Confirm treatments
2. **Review proposed chart** (Section 4) — Approve GL structure
3. **Answer critical questions** (Section 9) — Revenue, taxes, tributes
4. **Define edge cases** — Negative payouts, chargebacks, write-offs
5. **Provide tax compliance checklist** — ISS, IRRF, NFS-e, PIS/Cofins

### For Legal
1. **Review manager contract** — Confirm 5% withholding enforceability
2. **Review driver terms** — Confirm 82%/18% split and bonus rules
3. **Confirm bonus expiration rule** — No legal blocker to forfeiture?
4. **NFS-e responsibility** — Who must issue and when?
5. **Withholding compliance** — IRRF rates, cutoff dates, filing obligations

### For Finance/CFO
1. **Approve GL structure** — Endorsement of Section 4
2. **Review examples** (Section 5) — Validate entry logic
3. **Confirm tax assumptions** (Section 9) — ISS, tributes, rates
4. **Plan Phase 3C-2D budget** — Account creation, configuration, testing
5. **Schedule go/no-go review** — Gating for Phases 3D-1 onwards

---

## 14. APPENDIX: FLOW DIAGRAMS (TEXTUAL)

### A1. Ride Settlement Flow

```
┌─ Ride Complete (Event)
│
├─ Calculate Earnings
│  ├─ Driver:   82% of fare
│  └─ KAVIAR:   18% of fare
│
├─ Reserve Fee (if possible)
│  ├─ Check Balance
│  ├─ If sufficient: Debit balance
│  └─ If insufficient: Create pending_debit
│
├─ Record Revenue
│  ├─ Entry 1: Revenue (18%)
│  ├─ Entry 2: Driver Payable (82%)
│  └─ Entry 3: Manager Provision (7.2% of 18%)
│
├─ Handle Reversals
│  ├─ If cancelled: Release reserve
│  └─ If charged back: Reverse entries + issue credit
│
└─ Idempotency Check: ride_id (must be unique)
```

### A2. Pre-paid Credit Flow

```
┌─ Driver Recharge Request (SumUp)
│
├─ Initiate Checkout
│  ├─ Create SumUp checkout URL
│  └─ Store checkpoint locally (status: pending)
│
├─ Driver Pays
│  ├─ SumUp processes payment
│  └─ SumUp confirms (PAID status)
│
├─ Webhook Received (or Scheduled Reconciliation)
│  ├─ Query SumUp: Get checkout status
│  ├─ If PAID:
│  │  ├─ Entry 1: Cash In
│  │  ├─ Entry 2: Pre-paid Credit Liability
│  │  ├─ Accrue Bonus (10% of recharge)
│  │  └─ Resolve pending debits
│  └─ If not paid: Retry later
│
└─ Idempotency Check: checkout_id (external key from SumUp)
```

### A3. Manager Payout Flow

```
┌─ Month End (e.g., Aug 31)
│
├─ Aggregate Rides
│  ├─ Query all completed rides in month
│  ├─ Sum fares by territory
│  └─ Calculate 18% platform fee
│
├─ Calculate Manager Share
│  ├─ 40% of 18% = 7.2% per ride
│  ├─ Sum for all rides (7.2% × ride_count)
│  ├─ Deduct partner commissions
│  ├─ Deduct referral costs (manager pays 50%)
│  └─ Deduct family return costs (manager pays 50%)
│
├─ Accrue Provision
│  ├─ Entry: Provision - Manager (debit) / Payable (credit)
│  └─ Status: CALCULATED
│
├─ Admin Approval (Day 5)
│  ├─ Review accrual
│  ├─ Approve or adjust amount
│  └─ Status: APPROVED
│
├─ Tax Provision (Day 5)
│  ├─ Estimate ISS, IRRF, other tributes
│  ├─ Accrue as liability
│  └─ Entry: Tax Expense / Tax Payable
│
├─ Payment (Day 30)
│  ├─ Entry: Payable (debit) / Bank (credit)
│  ├─ Withhold taxes if applicable
│  └─ Status: PAID
│
└─ Idempotency Check: (territory_id, month, year) tuple
```

### A4. Annual Bonus Flow

```
┌─ Driver Recharges or Completes Ride (Continuous)
│
├─ Accrue Bonus
│  ├─ Calculate: recharge_amount × bonus_rate (10%)
│  ├─ Entry 1: Provision - Bonus KAVIAR (5%)
│  ├─ Entry 2: Provision - Bonus Manager (5%, withheld from payout)
│  └─ Status: ACCRUED
│
└─ Oct 1 – Dec 31 (Claim Window)
   │
   ├─ Driver Submits Claim
   │  ├─ Requests accrued amount
   │  └─ Status: PENDING
   │
   ├─ Admin Approves
   │  ├─ Confirms or adjusts amount
   │  └─ Status: APPROVED
   │
   ├─ Payout Issued
   │  ├─ Entry: Payable (debit) / Bank (credit)
   │  ├─ Apply withholding if applicable
   │  └─ Status: PAID
   │
   └─ Idempotency Check: (driver_id, bonus_year)
```

---

## 15. DOCUMENT METADATA

- **Status:** Draft / Pending Review
- **Approval Chain:** Engineering → Finance → Accounting → Legal → CFO
- **Version:** 1.0 (2026-07-21)
- **Last Review:** None (Initial)
- **Next Review:** After counter/legal feedback

---

**END OF DOCUMENT**

