# Fase 3C-2D.2B — Decisões Administrativas Aprovadas

**Aprovado por:** KAVIAR Administration<br>
**Data:** 2026-07-21T15:20:04Z<br>
**Escopo:** administrative_decisions_and_bonus_policy

Aprovação formal das 6 decisões administrativas listadas neste registro e da política de bônus descrita na seção business_policies.bonus.

---

Total de decisões administrativas aprovadas: **6**

## FIN-2B-20 — CC001 — KAVIAR Corporativo

**Modelo:** `financial_cost_centers`<br>
**Status atual:** `PENDING_ADMIN`<br>
**Escopo:** `COST_CENTER`

**Pergunta:** Criar centro de custo corporativo/matriz como padrão para despesas e receitas sem vínculo territorial?

**Contexto atual:** Corporate / Matrix level

**Resposta:** APPROVE_WITH_CHANGES
**Nome aprovado:** KAVIAR Corporativo

**Regra operacional:**

- Centro raiz corporativo.
- Não materializar o código genérico CC001; código real futuro sugerido: CORP.
- Não usar como destino automático para lançamentos sem classificação.
- Primeiro auditar os centros já existentes.

**Justificativa:** O conceito de centro corporativo é aprovado. O código CC001 é provisório — o código real (CORP) deve ser definido após auditoria dos centros existentes. O uso automático como destino de lançamentos sem classificação é explicitamente proibido.
**Decidido por:** KAVIAR Administration
**Decidido em:** 2026-07-21T15:20:04Z
**Evidência:** Decisão administrativa fase-3c-2d-2b aprovada em 2026-07-21
**Status resultante no blueprint:** `PENDING_ADMIN`

## FIN-2B-21 — CC002 — Território financeiro ativo

**Modelo:** `financial_cost_centers`<br>
**Status atual:** `PENDING_ADMIN`<br>
**Escopo:** `COST_CENTER`

**Pergunta:** Criar centros de custo por território e torná-los obrigatórios para operações territoriais?

**Contexto atual:** Per-territory operation

**Resposta:** APPROVE_WITH_CHANGES
**Nome aprovado:** Território financeiro ativo

**Regra operacional:**

- Um centro para cada território financeiramente ativo, subordinado à cidade correspondente.
- Não criar para prospecção, sombra ou reserva.
- Primeiro auditar centros existentes.

**Justificativa:** O conceito de centro territorial é aprovado. A criação deve ser precedida de auditoria dos territórios existentes. Proibido criar centros para territórios apenas prospectados.
**Decidido por:** KAVIAR Administration
**Decidido em:** 2026-07-21T15:20:04Z
**Evidência:** Decisão administrativa fase-3c-2d-2b aprovada em 2026-07-21
**Status resultante no blueprint:** `PENDING_ADMIN`

## FIN-2B-22 — CC003 — Cidade operacional

**Modelo:** `financial_cost_centers`<br>
**Status atual:** `PENDING_ADMIN`<br>
**Escopo:** `COST_CENTER`

**Pergunta:** Criar centros de custo por cidade agora ou manter cidade apenas como atributo do território?

**Contexto atual:** City-level tracking

**Resposta:** APPROVE_WITH_CHANGES
**Nome aprovado:** Cidade operacional

**Regra operacional:**

- Um centro por cidade operacional, piloto ativo, regulatoriamente aprovada ou financeiramente ativa.
- Hierarquia aprovada: COMPANY > CITY > TERRITORY.
- Não criar centro para cidade apenas prospectada.
- Primeiro auditar centros existentes.

**Justificativa:** O nível cidade é aprovado na hierarquia financeira como intermediário entre empresa e território. A hierarquia COMPANY > CITY > TERRITORY está formalmente estabelecida.
**Decidido por:** KAVIAR Administration
**Decidido em:** 2026-07-21T15:20:04Z
**Evidência:** Decisão administrativa fase-3c-2d-2b aprovada em 2026-07-21
**Status resultante no blueprint:** `PENDING_ADMIN`

## FIN-2B-23 — CC004 — Departamento como dimensão financeira futura

**Modelo:** `financial_cost_centers`<br>
**Status atual:** `PENDING_ADMIN`<br>
**Escopo:** `COST_CENTER`

**Pergunta:** Criar centros de custo por departamento agora? Definir quais departamentos iniciais existirão.

**Contexto atual:** Department/function level (optional, for internal allocation)

**Resposta:** DEFER

**Regra operacional:**

- Não misturar departamento na árvore territorial.
- Não materializar agora.
- Retomar quando houver suporte a dimensões independentes para departamento, produto, projeto e localização.

**Justificativa:** O conceito de departamento como dimensão financeira é reconhecido mas adiado. O modelo atual de árvore territorial não comporta dimensões independentes. A decisão de implementação fica bloqueada até que o schema suporte múltiplas dimensões ortogonais.
**Decidido por:** KAVIAR Administration
**Decidido em:** 2026-07-21T15:20:04Z
**Evidência:** Decisão administrativa fase-3c-2d-2b aprovada em 2026-07-21
**Status resultante no blueprint:** `PENDING_ADMIN`

**Condição de desbloqueio:** Schema deve suportar dimensões financeiras independentes (departamento, produto, projeto, localização) antes de retomar esta decisão.

## FIN-2B-24 — 3201 — Revenue - Commercial Partnerships / Referral Commission

**Modelo:** `financial_categories`<br>
**Status atual:** `PENDING_ACCOUNTANT`<br>
**Escopo:** `FINANCIAL_CATALOG`

**Pergunta:** Existe atualmente um programa de receita de afiliados? Definir produtos, beneficiários, fato gerador e início.

**Contexto atual:** Partner program and other revenue sources. Scope defined by admin. Will be a financial_category.

**Resposta:** APPROVE_WITH_CHANGES
**Nome aprovado:** Revenue - Commercial Partnerships / Referral Commission

**Regra operacional:**

- Representa somente valores economicamente pertencentes à KAVIAR.
- Pode representar comissão recebida por indicação, publicidade ou intermediação comercial.
- Não pode representar venda bruta do comércio, dinheiro do motorista, participação do gestor nem comissão que a KAVIAR deva pagar.
- Exige contrato, fato gerador, regra de cálculo, vigência e documentação.
- Reconhecimento bruto/líquido continua dependendo do contador.

**Justificativa:** O conceito e o nome foram aprovados administrativamente. O tratamento contábil (bruto vs. líquido) e tributário permanecem pendentes de validação do contador.
**Decidido por:** KAVIAR Administration
**Decidido em:** 2026-07-21T15:20:04Z
**Evidência:** Decisão administrativa fase-3c-2d-2b aprovada em 2026-07-21
**Status resultante no blueprint:** `PENDING_ACCOUNTANT`

## FIN-2B-25 — 4102 — Expense - Commercial Partner Commission

**Modelo:** `financial_categories`<br>
**Status atual:** `PENDING_ACCOUNTANT`<br>
**Escopo:** `FINANCIAL_CATALOG`

**Pergunta:** A comissão de parceiro será separada do repasse do gestor? Definir beneficiários, regra configurável e início.

**Contexto atual:** Partner/affiliate commission/fees. Separated from manager share per admin decision. Will be a financial_category.

**Resposta:** APPROVE_WITH_CHANGES
**Nome aprovado:** Expense - Commercial Partner Commission

**Regra operacional:**

- Comissão de parceiro comercial deve ser separada da participação do gestor territorial e de recompensa de indicação.
- Exige partner_id, contrato, regra versionada, fato gerador e competência.
- Tratamento como despesa, custo contratual ou redução de receita continua pendente do contador.

**Justificativa:** A separação conceitual entre comissão de parceiro e participação do gestor foi aprovada administrativamente. O tratamento contábil final depende do contador.
**Decidido por:** KAVIAR Administration
**Decidido em:** 2026-07-21T15:20:04Z
**Evidência:** Decisão administrativa fase-3c-2d-2b aprovada em 2026-07-21
**Status resultante no blueprint:** `PENDING_ACCOUNTANT`
