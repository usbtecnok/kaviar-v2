# Fase 3C-2D.2B — Perguntas para Contador

Blueprint atual: `1.1.0`

Nenhum item deste documento está aprovado automaticamente.
A resposta deverá ser registrada no arquivo de decisões.

## FIN-2B-01 — 1203 — Accounts Receivable - Chargebacks

**Modelo:** `financial_accounts`<br>
**Status atual:** `PENDING_ACCOUNTANT`<br>
**Escopo:** `FINANCIAL_CATALOG`

**Pergunta:** Em qual evento o chargeback deve ser reconhecido e a conta deve representar direito de recuperação contra qual parte?

**Contexto atual:** Disputed transactions from passengers (chargebacks). Implementation depends on chargeback workflow.

**Resposta:**

- [ ] APPROVE_AS_PROPOSED
- [ ] APPROVE_WITH_CHANGES
- [ ] REJECT
- [ ] DEFER

**Justificativa e evidência:**

____________________________________________

## FIN-2B-02 — 2104 — Payable to Drivers - Refunds

**Modelo:** `financial_accounts`<br>
**Status atual:** `PENDING_ACCOUNTANT`<br>
**Escopo:** `FINANCIAL_CATALOG`

**Pergunta:** O reembolso ao motorista deve gerar passivo específico, estorno de obrigação anterior ou despesa da KAVIAR?

**Contexto atual:** Cancellation/chargeback refunds to drivers. Currently not fully implemented.

**Resposta:**

- [ ] APPROVE_AS_PROPOSED
- [ ] APPROVE_WITH_CHANGES
- [ ] REJECT
- [ ] DEFER

**Justificativa e evidência:**

____________________________________________

## FIN-2B-03 — 2201 — Payable to Managers - Provision

**Modelo:** `financial_accounts`<br>
**Status atual:** `PENDING_ACCOUNTANT`<br>
**Escopo:** `FINANCIAL_CATALOG`

**Pergunta:** A participação do gestor deve ser contabilizada como despesa, comissão, compartilhamento de receita ou redução da receita, e em qual momento deve ser provisionada?

**Contexto atual:** Monthly manager payout accrual (7.2% of rides). Awaiting tax treatment decision (ISS, IRRF, NFS-e).

**Resposta:**

- [ ] APPROVE_AS_PROPOSED
- [ ] APPROVE_WITH_CHANGES
- [ ] REJECT
- [ ] DEFER

**Justificativa e evidência:**

____________________________________________

## FIN-2B-04 — 2203 — Payable to Managers - Adjustments

**Modelo:** `financial_accounts`<br>
**Status atual:** `PENDING_ACCOUNTANT`<br>
**Escopo:** `FINANCIAL_CATALOG`

**Pergunta:** Ajustes negativos do gestor podem reduzir o passivo existente ou devem ser transferidos para uma conta a receber?

**Contexto atual:** Reconciliation, penalties, credits, claw-backs. Treatment depends on accountant decision on negative payouts.

**Resposta:**

- [ ] APPROVE_AS_PROPOSED
- [ ] APPROVE_WITH_CHANGES
- [ ] REJECT
- [ ] DEFER

**Justificativa e evidência:**

____________________________________________

## FIN-2B-05 — 2301 — Taxes Payable - ISS

**Modelo:** `financial_accounts`<br>
**Status atual:** `PENDING_ACCOUNTANT`<br>
**Escopo:** `FINANCIAL_CATALOG`

**Pergunta:** O ISS deve incidir sobre o valor bruto da corrida ou somente sobre a receita da KAVIAR, em qual município e em qual momento?

**Contexto atual:** Service tax on rides. Rate and applicability by municipality pending counter decision. Linked to territory_id.

**Resposta:**

- [ ] APPROVE_AS_PROPOSED
- [ ] APPROVE_WITH_CHANGES
- [ ] REJECT
- [ ] DEFER

**Justificativa e evidência:**

____________________________________________

## FIN-2B-06 — 2303 — Taxes Payable - INSS

**Modelo:** `financial_accounts`<br>
**Status atual:** `PENDING_ACCOUNTANT`<br>
**Escopo:** `FINANCIAL_CATALOG`

**Pergunta:** Existe incidência de INSS nos pagamentos a motoristas, gestores ou parceiros? Informar base, alíquota e responsável.

**Contexto atual:** Social security contribution. Applicability and rate pending counter decision.

**Resposta:**

- [ ] APPROVE_AS_PROPOSED
- [ ] APPROVE_WITH_CHANGES
- [ ] REJECT
- [ ] DEFER

**Justificativa e evidência:**

____________________________________________

## FIN-2B-07 — 2304 — Taxes Payable - PIS/Cofins

**Modelo:** `financial_accounts`<br>
**Status atual:** `PENDING_ACCOUNTANT`<br>
**Escopo:** `FINANCIAL_CATALOG`

**Pergunta:** PIS e Cofins incidem sobre o valor bruto das corridas ou apenas sobre a receita de intermediação da KAVIAR?

**Contexto atual:** Social contribution (PIS/Cofins). Applicability by service code pending counter decision.

**Resposta:**

- [ ] APPROVE_AS_PROPOSED
- [ ] APPROVE_WITH_CHANGES
- [ ] REJECT
- [ ] DEFER

**Justificativa e evidência:**

____________________________________________

## FIN-2B-08 — 2401 — Payable to Partners - Commission

**Modelo:** `financial_accounts`<br>
**Status atual:** `PENDING_ACCOUNTANT`<br>
**Escopo:** `FINANCIAL_CATALOG`

**Pergunta:** A comissão de parceiros deve possuir passivo separado? Definir fato gerador, documento e retenções aplicáveis.

**Contexto atual:** Partner/affiliate commission. Currently deducted from manager share; may become separate policy.

**Resposta:**

- [ ] APPROVE_AS_PROPOSED
- [ ] APPROVE_WITH_CHANGES
- [ ] REJECT
- [ ] DEFER

**Justificativa e evidência:**

____________________________________________

## FIN-2B-09 — 2402 — Chargebacks Payable

**Modelo:** `financial_accounts`<br>
**Status atual:** `PENDING_ACCOUNTANT`<br>
**Escopo:** `FINANCIAL_CATALOG`

**Pergunta:** O chargeback a pagar representa obrigação ao adquirente, passageiro ou outra parte, e como se relaciona com a conta 1203?

**Contexto atual:** Disputed passenger transactions. Chargeback workflow not yet implemented.

**Resposta:**

- [ ] APPROVE_AS_PROPOSED
- [ ] APPROVE_WITH_CHANGES
- [ ] REJECT
- [ ] DEFER

**Justificativa e evidência:**

____________________________________________

## FIN-2B-10 — 3101 — Revenue - Platform Fee (Rides)

**Modelo:** `financial_categories`<br>
**Status atual:** `PENDING_ACCOUNTANT`<br>
**Escopo:** `FINANCIAL_CATALOG`

**Pergunta:** A KAVIAR atua contabilmente como agente, reconhecendo somente a taxa da plataforma, ou como principal, reconhecendo o valor bruto?

**Contexto atual:** 18% intermediation fee from rides. Will be a financial_category (kind=REVENUE). Treatment as NET_AGENT pending counter validation. Tax base pending. KAVIAR acts as agent/intermediary; recognizes only the platform fee. The 82% paid directly to driver does not transit through KAVIAR. Recognition occurs on valid completed ride. Taxation and fiscal emission pending municipal parametrization and tax regime.

**Resposta:**

- [ ] APPROVE_AS_PROPOSED
- [ ] APPROVE_WITH_CHANGES
- [ ] REJECT
- [ ] DEFER

**Justificativa e evidência:**

____________________________________________

## FIN-2B-11 — 3102 — Revenue - Cancellation Fees

**Modelo:** `financial_categories`<br>
**Status atual:** `PENDING_ACCOUNTANT`<br>
**Escopo:** `FINANCIAL_CATALOG`

**Pergunta:** A taxa de cancelamento pertence à KAVIAR, ao motorista ou deve ser dividida? Classificar como receita, repasse ou indenização.

**Contexto atual:** No-show/cancellation penalties. Rare usage. Will be a financial_category. Recognition treatment pending.

**Resposta:**

- [ ] APPROVE_AS_PROPOSED
- [ ] APPROVE_WITH_CHANGES
- [ ] REJECT
- [ ] DEFER

**Justificativa e evidência:**

____________________________________________

## FIN-2B-12 — 3202 — Revenue - Deferred - Recognized

**Modelo:** `financial_categories`<br>
**Status atual:** `PENDING_ACCOUNTANT`<br>
**Escopo:** `FINANCIAL_CATALOG`

**Pergunta:** Créditos pré-pagos de motorista geram receita diferida? Em qual evento haveria reconhecimento de receita?

**Contexto atual:** Pre-paid credits converted to revenue when consumed. Recognition timing pending counter decision. Will be a financial_category.

**Resposta:**

- [ ] APPROVE_AS_PROPOSED
- [ ] APPROVE_WITH_CHANGES
- [ ] REJECT
- [ ] DEFER

**Justificativa e evidência:**

____________________________________________

## FIN-2B-13 — 4101 — Expense - Manager Regional Share

**Modelo:** `financial_categories`<br>
**Status atual:** `PENDING_ACCOUNTANT`<br>
**Escopo:** `FINANCIAL_CATALOG`

**Pergunta:** A participação regional do gestor deve ser despesa operacional ou redução da receita da plataforma?

**Contexto atual:** 40% of fee shared to manager. Will be a financial_category. Classification as expense vs. cost-share pending counter decision.

**Resposta:**

- [ ] APPROVE_AS_PROPOSED
- [ ] APPROVE_WITH_CHANGES
- [ ] REJECT
- [ ] DEFER

**Justificativa e evidência:**

____________________________________________

## FIN-2B-14 — 4201 — Provision - Manager Payments (Monthly)

**Modelo:** `financial_categories`<br>
**Status atual:** `PENDING_ACCOUNTANT`<br>
**Escopo:** `FINANCIAL_CATALOG`

**Pergunta:** A provisão mensal do gestor deve existir separadamente da categoria 4101 ou ambas representam o mesmo fato contábil?

**Contexto atual:** 7.2% per ride (40% of 18%). Paired with 2201 (Payable to Managers). Will be a financial_category. Pending tax treatment.

**Resposta:**

- [ ] APPROVE_AS_PROPOSED
- [ ] APPROVE_WITH_CHANGES
- [ ] REJECT
- [ ] DEFER

**Justificativa e evidência:**

____________________________________________

## FIN-2B-15 — 4301 — Expense - ISS (Service Tax)

**Modelo:** `financial_categories`<br>
**Status atual:** `PENDING_ACCOUNTANT`<br>
**Escopo:** `FINANCIAL_CATALOG`

**Pergunta:** O ISS deve ser registrado como despesa, dedução da receita ou somente como contrapartida do passivo tributário 2301?

**Contexto atual:** Service tax on rides. Will be a financial_category. Rate and applicability by municipality pending counter decision.

**Resposta:**

- [ ] APPROVE_AS_PROPOSED
- [ ] APPROVE_WITH_CHANGES
- [ ] REJECT
- [ ] DEFER

**Justificativa e evidência:**

____________________________________________
