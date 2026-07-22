# Fase 3C-2D.2B — Relatório de Revisão Diagnóstica

**Blueprint:** v1.1.0  
**Data:** 2026-07-22  
**Status:** DIAGNÓSTICO — nenhuma alteração técnica executada  
**Fase:** 3C-2D.2B  
**Documento:** Revisão completa com correções finais

---

## A. Escopo e objetivo

Este relatório é exclusivamente diagnóstico. Não altera código, schema, banco, enums, migrations, contas, lançamentos, wallet, cálculos de gestor ou parceiro, política de cancelamento nem política de bônus.

### A.1 Restrições obrigatórias

- Não editar código
- Não editar contratos
- Não alterar banco
- Não alterar schema
- Não criar migrations
- Não mudar enums
- Não criar contas
- Não registrar lançamentos
- Não alterar status para `READY_TO_APPLY`
- Não desbloquear a conta 3301
- Não implantar em produção
- Não modificar a wallet
- Não alterar cálculo do gestor
- Não alterar cálculo do parceiro
- Não alterar política de cancelamento
- Não alterar política de bônus

### A.2 Documentos de referência

| Documento | Caminho |
|-----------|---------|
| Blueprint de contas | `docs/finance/phase-3c-2d-account-blueprint.md` |
| Registro de decisões | `docs/finance/phase-3c-2d-2b-decision-register.json` |
| Política de bônus | `docs/finance/phase-3c-2d-2b-bonus-policy.md` |
| Decisões administrativas | `docs/finance/phase-3c-2d-2b-admin-decision.md` |
| Materialização controlada | `docs/finance/phase-3c-2d-2-account-materialization.md` |
| Perguntas para contador | `docs/finance/phase-3c-2d-2b-accountant-questions.md` |
| Perguntas jurídicas | `docs/finance/phase-3c-2d-2b-legal-questions.md` |

---

## B. Correções aplicadas nesta revisão

### B.1 Conta 3301 — NÃO desbloqueada

A migration `add_revenue_deduction_to_financial_category_kind` foi **removida** da lista de propostas.

O valor `REVENUE_DEDUCTION` **não será adicionado** ao enum `financial_category_kind` nesta etapa.

**Estado atual confirmado do enum `financial_category_kind` no schema Prisma:**

```
REVENUE, EXPENSE, CONTRIBUTION, WITHDRAWAL, TRANSFER, LIABILITY, CLEARING, ADJUSTMENT
```

`REVENUE_DEDUCTION` não existe e não será criado.

**Estado da conta 3301:**

| Atributo | Valor |
|----------|-------|
| status | `BLOCKED_BY_SCHEMA` |
| is_postable | `false` |
| can_apply | `false` |
| migration | nenhuma |
| enum alterado | não |
| desbloqueio | não autorizado |

**Avaliação pendente (SPECIALIST_ACCOUNTANT_REQUIRED):**

A política atual estabelece que o bônus é 100% financiado pela KAVIAR. Antes de qualquer ação sobre a conta 3301, deve ser avaliado se ela deve ser:

- mantida bloqueada;
- rejeitada;
- substituída por uma despesa promocional;
- substituída por um passivo de bônus;
- ou realmente tratada como dedução da receita.

A conta 3301 aparece neste relatório apenas como **categoria bloqueada do blueprint**, não como uma 26ª decisão.

### B.2 Wallet — tratada como subledger

A wallet **não é** uma conta contábil do razão geral. É um **subledger** — controle detalhado do passivo por motorista.

**Lançamento removido:** `D 2105 / C wallet do motorista` — INCORRETO, não utilizar.

**Fluxo correto — Pix de compensação recebido:**

| # | Débito | Crédito |
|---|--------|---------|
| 1 | Banco ou conta de liquidação | Payable to Drivers - Cancellation Compensation |

**Valor exibido na wallet do motorista:**

- Não gerar novo lançamento no razão geral
- Vincular o passivo ao motorista no subledger
- Manter o passivo até a efetiva liquidação
- Registrar auditoria da origem do crédito

**Saque ou transferência ao motorista:**

| # | Débito | Crédito |
|---|--------|---------|
| 1 | Payable to Drivers - Cancellation Compensation | Banco ou conta de liquidação |

### B.3 Política administrativa da compensação — `DRIVER_FIRST_FINANCIAL_POLICY`

A compensação por cancelamento deve ser:

- separada dos demais tipos de saldo;
- integralmente pertencente ao motorista;
- integralmente sacável;
- sem expiração;
- não utilizada automaticamente para pagar a taxa de 18%;
- não utilizada para pagar dívidas ou ajustes do motorista;
- não utilizada para financiar bônus;
- não sujeita à comissão de gestor;
- não sujeita à comissão de parceiro.

**Exemplo:**

| Item | Valor |
|------|-------|
| Passageiro paga | R$ 5,00 |
| Motorista recebe | R$ 5,00 |
| Receita da KAVIAR | R$ 0,00 |
| Custo do Pix/gateway | despesa da KAVIAR |

### B.4 CBS e IBS de 2026 — corrigido

**Alíquotas de teste em 2026:**

| Tributo | Alíquota |
|---------|----------|
| CBS | 0,9% |
| IBS | 0,1% |
| Total informativo | 1,0% |

**Contexto:**

- 2026 é período de teste e adaptação
- O cumprimento das obrigações acessórias pode permitir dispensa ou compensação do recolhimento, conforme o enquadramento
- Documentos fiscais eletrônicos devem contemplar os campos de CBS e IBS nos leiautes aplicáveis

**Pendência urgente criada: `VERIFY_2026_IBS_CBS_NFSE_READINESS`**

Verificar:

- regime tributário atual da KAVIAR;
- se está ou não no Simples Nacional;
- qual sistema emite a NFS-e;
- se a KAVIAR já emite NFS-e;
- município de emissão;
- inscrição municipal;
- código de serviço;
- campos de CBS e IBS disponíveis;
- fornecedor ou sistema fiscal responsável;
- necessidade de configuração antes das próximas emissões;
- preparação do sistema fiscal para as exigências aplicáveis a partir de agosto de 2026;
- tratamento diferenciado caso a KAVIAR esteja no Simples Nacional;
- se no Simples Nacional: verificar opção aplicável para IBS e CBS em 2027, no período oficial de escolha.

**Não criar** contas a pagar, créditos tributários ou lançamentos automáticos antes da confirmação do contador.

**Classificações:** `SPECIALIST_ACCOUNTANT_REQUIRED`, `NEEDS_EXTERNAL_VALIDATION`, `MUNICIPAL_CONFIRMATION` (quando envolver NFS-e municipal).

### B.5 IRRF e INSS dos motoristas — corrigido

**Removida** qualquer afirmação de que o tratamento está "confirmado pelo modelo de intermediação".

**Substituída por:** Hipótese baseada no modelo contratual atual, ainda dependente da conclusão da análise principal versus agente e de validação previdenciária e tributária.

**Classificação:** `SPECIALIST_ACCOUNTANT_REQUIRED`

**Não tratar como conclusão definitiva:**

- ausência de IRRF
- ausência de INSS
- ausência de obrigação acessória
- inexistência de contribuição da plataforma
- inexistência de responsabilidade previdenciária indireta

**Referências removidas:**

- `LC 150`
- Projetos de lei apresentados como legislação vigente
- Percentuais automáticos
- Faixas sem confirmação para 2026

**Análise por tipo de motorista (apenas hipóteses, todas pendentes de validação):**

| Tipo | Relação contratual | Prestador aparente | Documento | Hipótese contábil | Hipótese previdenciária | Risco | Info faltante | Validação |
|------|-------------------|-------------------|-----------|-------------------|------------------------|-------|---------------|-----------|
| Motorista PF | Intermediação | Motorista PF | Cadastro app | Pagamento a contribuinte individual | Possível retenção de 11% INSS | ALTO | Confirmação da natureza jurídica | SPECIALIST_ACCOUNTANT_REQUIRED |
| Contribuinte individual | Intermediação | CI autônomo | CPF + cadastro | Pagamento a CI | Retenção de 11% INSS possível | ALTO | Classificação INSS | SPECIALIST_ACCOUNTANT_REQUIRED |
| MEI | Intermediação | PJ MEI | CNPJ MEI | Pagamento a PJ | Sem retenção INSS pela plataforma (hipótese) | MÉDIO | CNPJ, atividade econômica | SPECIALIST_ACCOUNTANT_REQUIRED |
| PJ | Intermediação | PJ | CNPJ + NF | Pagamento a PJ | Sem retenção direta (hipótese) | MÉDIO | NF emitida, CNAE | SPECIALIST_ACCOUNTANT_REQUIRED |
| Cadastro incompleto | Indeterminada | Indeterminado | Parcial | Bloqueado | Bloqueado | CRÍTICO | Documentação completa | BLOQUEIO |
| Mais de uma atividade | Intermediação | Variável | CPF/CNPJ | Depende da atividade principal | Depende do enquadramento | ALTO | Atividades declaradas | SPECIALIST_ACCOUNTANT_REQUIRED |

### B.6 MED e contestações Pix — corrigido

O MED **não é** um chargeback comercial comum.

**Eventos diferenciados:**

| Evento | Origem notificação | Impacto banco | Impacto passivo motorista | Impacto receita | Análise manual |
|--------|--------------------|---------------|---------------------------|-----------------|----------------|
| Devolução voluntária | KAVIAR/operacional | Débito conta KAVIAR | Nenhum se prestou serviço | Possível estorno | Sim |
| Estorno operacional | Sistema interno | Débito conta KAVIAR | Nenhum se prestou serviço | Estorno da receita | Sim |
| Pix enviado por engano | Pagador/PSP | Bloqueio cautelar | Nenhum automático | Nenhum direto | Sim |
| Fraude | PSP/pagador | Bloqueio + possível débito | Somente com evidência | Possível perda | Obrigatória |
| Golpe | PSP/pagador | Bloqueio + possível débito | Somente com evidência | Possível perda | Obrigatória |
| Falha operacional da instituição | PSP | Variável | Nenhum | Nenhum direto | Sim |
| Bloqueio cautelar | PSP | Valor indisponível | Nenhum automático | Nenhum direto | Sim |
| Abertura de MED | PSP recebedor | Bloqueio do valor | Nenhum automático | Em análise | Obrigatória |
| Contestação comercial | Passageiro | Nenhum automático | Nenhum automático | Nenhum direto | Sim |
| Recuperação parcial | PSP | Débito parcial | Conforme análise | Perda parcial possível | Obrigatória |
| Recuperação integral | PSP | Débito total | Conforme análise | Perda possível | Obrigatória |
| Encerramento sem devolução | PSP | Liberação do bloqueio | Nenhum | Nenhum | Registro |
| Perda parcial | PSP/decisão | Débito confirmado parcial | Conforme análise | Perda confirmada | Obrigatória |
| Perda integral | PSP/decisão | Débito confirmado total | Conforme análise | Perda confirmada | Obrigatória |

**Para cada evento, verificar antes de lançamento definitivo:**

- contrato da SumUp
- documentação da API
- extrato real
- webhooks recebidos
- política da conta de liquidação
- funcionamento do MED para a modalidade utilizada pela KAVIAR

**Política `DRIVER_FIRST_FINANCIAL_POLICY` aplicada ao MED:**

Quando o motorista tiver prestado corretamente o serviço e não houver indício de fraude ou participação dele, não debitar automaticamente seu saldo.

**Qualquer recuperação contra o motorista exige:**

- evidência
- análise administrativa
- direito de contestação
- registro de auditoria
- aprovação autorizada

### B.7 Política permanente de cancelamento — mantida

A política é definitiva:

- A compensação atual de R$ 5,00 pertence integralmente ao motorista
- Qualquer futura taxa obrigatória de cancelamento também pertencerá integralmente ao motorista
- A KAVIAR não retém 18%
- O gestor não participa
- O parceiro não participa
- O valor não financia bônus
- O valor não é receita da KAVIAR
- Custos do meio de pagamento são suportados pela KAVIAR
- O motorista recebe integralmente o valor anunciado

**A conta `3102 — Revenue - Cancellation Fees` não deve receber esses valores.**

Avaliação futura necessária:

- desativar 3102
- mantê-la reservada
- transformá-la em conta apenas gerencial
- criar passivo específico

**Conta proposta, ainda não autorizada:** `Payable to Drivers - Cancellation Compensation` — não criar nesta etapa.

### B.8 Política permanente de bônus — mantida

O bônus é financiado 100% pela KAVIAR.

**Não descontar bônus de:**

- motorista
- gestor
- parceiro
- compensação de cancelamento
- taxa de cancelamento
- carteira do gestor
- payout do gestor
- comissão regularmente adquirida

**Revisão conceitual pendente:**

| Conta | Nome atual | Problema |
|-------|-----------|----------|
| 2202 | Payable to Managers - Bonus | Nome sugere que gestor financia bônus |
| 4203 | Provision - Bonus Manager | Nome sugere que gestor financia bônus |
| 3301 | Revenue Deduction - Driver Earned Bonus | Bloqueada, pendente de validação contábil |

**Hipótese preliminar preferencial:**

- despesa promocional da KAVIAR
- passivo de bônus adquirido
- crédito promocional controlado separadamente na wallet

Ainda depende de validação contábil e de suporte do schema.

### B.9 Base de remuneração do gestor — corrigida

**Removida** a expressão indefinida: "40% da taxa líquida da plataforma"

**Componentes a apresentar separadamente:**

| Componente | Status |
|-----------|--------|
| Percentual contratual | A definir com precisão |
| Taxa da plataforma | 18% do valor da corrida (hipótese) |
| Base de cálculo | Pendente de definição exata |
| Impostos da KAVIAR | Não definidos — pendente contador |
| Custos de gateway | Não definidos — pendente contrato SumUp |
| Bônus | NÃO reduz remuneração do gestor |
| Comissão de parceiro | Pendente (INTERNAL_DECISION_PENDING) |
| Cancelamentos | NÃO participam da base do gestor |
| Estornos | NÃO participam da base do gestor |
| Fraudes | NÃO participam da base do gestor |
| Ajustes manuais | A definir |
| Data de aquisição do direito | Data da corrida válida concluída |
| Data de encerramento | Conforme contrato |

**Decisões já confirmadas:**

- O gestor não financia bônus
- O bônus não reduz a remuneração do gestor
- A remuneração regularmente adquirida deve ser paga integralmente
- O gestor é temporário
- Não existe participação perpétua
- O gestor não recebe valores após o encerramento, exceto valores adquiridos antes da data de corte
- O gestor não recebe percentual sobre compensações ou taxas de cancelamento destinadas ao motorista

**Decisão pendente (`INTERNAL_DECISION_PENDING`):**

Se a comissão do parceiro:
- sai dos 40% do gestor;
- é uma despesa adicional da KAVIAR;
- ou se gestor e parceiro compartilham uma base previamente definida.

Não presumir que `partner_commissions` reduz automaticamente os 40% do gestor.

### B.10 Simples Nacional e ISS — corrigido

**Removida** a afirmação: "ISS não aplicável porque a empresa está no Simples Nacional"

O Simples pode alterar a forma de apuração e recolhimento, mas **não elimina automaticamente:**

- incidência do ISS
- obrigação de emitir NFS-e
- inscrição municipal
- código de serviço
- retenção na fonte
- obrigações municipais
- regras do estabelecimento prestador

**Separação necessária:**

| Aspecto | Verificação |
|---------|-------------|
| ISS incluído no DAS | Confirmar enquadramento |
| ISS retido | Verificar retenções na fonte |
| ISS recolhido fora do DAS | Verificar exceções |
| Município competente | Definir local da prestação |
| Matriz | Endereço sede |
| Filial | Se aplicável |
| Local da corrida | Não é automaticamente a unidade fiscal |
| Estabelecimento prestador | Definir conforme LC 116 |
| Código municipal | Identificar código de serviço |
| NFS-e | Verificar emissão e modelo |

Não considerar território operacional como unidade fiscal automática.

**Classificações:** `ACCOUNTANT_CONFIRMATION`, `SPECIALIST_ACCOUNTANT_REQUIRED`, `MUNICIPAL_CONFIRMATION`, `NEEDS_EXTERNAL_VALIDATION`

---

## C. Políticas permanentes consolidadas

### C.1 DRIVER_FIRST_FINANCIAL_POLICY

| Regra | Aplica-se a |
|-------|-------------|
| Compensação por cancelamento pertence integralmente ao motorista | Cancelamentos |
| Motorista não pode ser debitado automaticamente sem evidência | MED, fraude, contestação |
| Compensação não financia bônus | Bônus |
| Compensação não paga taxa de 18% | Receita KAVIAR |
| Compensação sem expiração | Wallet |
| Compensação sacável integralmente | Wallet |
| Custos de meio de pagamento suportados pela KAVIAR | Gateway/Pix |
| Gestor não participa da compensação | Gestor |
| Parceiro não participa da compensação | Parceiro |

### C.2 BONUS-POLICY-v1.2 (congelada)

#### Parte I — Bônus por campanha (configurável)

| Regra ID | Resumo |
|----------|--------|
| BP-01 | Motorista recebe 100% do valor comprado |
| BP-02 | Bônus integralmente financiado pela KAVIAR |
| BP-03 | Bônus não nasce na compra de créditos |
| BP-04 | Evento gerador: corrida válida concluída |
| BP-05 | Base: taxa de intermediação da KAVIAR |
| BP-06 | Percentual configurável e versionado |
| BP-07 | Após corrida válida, direito incondicional |
| BP-08 | Corrida inválida não gera bônus |
| BP-09 | Liquidável por Pix ou conversão em créditos |
| BP-10 | Contabilmente: contraprestação/passivo certo |

#### Parte II — Bônus anual de 10% como presente de reconhecimento

| Regra ID | Resumo |
|----------|--------|
| BP-11 | Bônus é presente de reconhecimento pela confiança e compra de créditos |
| BP-12 | Evento gerador exclusivo: recarga elegível confirmada por Pix |
| BP-13 | Notas baixas não cancelam o bônus |
| BP-14 | Indisciplina não cancela o bônus adquirido |
| BP-15 | Remoção da plataforma não cancela o bônus adquirido |
| BP-16 | Canal alternativo obrigatório para motorista removido solicitar bônus |
| BP-17 | Janela anual: 1º de outubro a 31 de dezembro; não solicitado permanece acumulado |
| BP-18 | Proibição de compensação ou confisco por fatos não relacionados à recarga |
| BP-19 | Reversão somente por problema comprovado na recarga originadora |
| BP-20 | Fraude operacional ≠ fraude na recarga; tratamento em processos separados |
| BP-21 | Registro do direito adquirido vinculado à recarga, Pix, ciclo e auditoria |
| BP-22 | Comunicação clara ao motorista sobre natureza e permanência do bônus |
| BP-23 | Regra consolidada: 10%, KAVIAR financia, sem expiração, janela anual |
| BP-24 | Exibição imediata no aplicativo após confirmação do Pix |
| BP-25 | Acumulação contínua entre janeiro e setembro; bônus nasce em qualquer data |
| BP-26 | Solicitação enviada até 31/dez permanece válida até liquidação |
| BP-27 | Fluxo de solicitação exclusivo para bônus anual |
| BP-28 | Separação do saldo de bônus na wallet (PURCHASED_BALANCE, ANNUAL_BONUS, CANCELLATION_COMPENSATION) |
| BP-29 | Compensação de cancelamento e outros créditos não geram bônus |

---

## D. Pendências urgentes

### D.1 VERIFY_2026_IBS_CBS_NFSE_READINESS

| Item | Verificação |
|------|-------------|
| Regime tributário | Lucro real, presumido ou Simples? |
| Simples Nacional | Confirmar se está ou não |
| Sistema NFS-e | Qual emite? |
| Emissão atual | KAVIAR já emite NFS-e? |
| Município | Qual município de emissão? |
| Inscrição municipal | Número |
| Código de serviço | Qual código? |
| Campos CBS/IBS | Disponíveis no leiaute? |
| Fornecedor fiscal | Quem é responsável? |
| Configuração | Antes de agosto 2026? |
| Simples 2027 | Opção IBS/CBS no período oficial |

**Classificações:** `SPECIALIST_ACCOUNTANT_REQUIRED`, `NEEDS_EXTERNAL_VALIDATION`, `MUNICIPAL_CONFIRMATION`

### D.2 Conta 3301 — avaliação conceitual

| Opção | Descrição | Requer |
|-------|-----------|--------|
| Manter bloqueada | Sem ação | Nenhuma |
| Rejeitar | Remover do blueprint | Decisão contábil |
| Despesa promocional | Substituir por conta de despesa | Validação contábil + schema |
| Passivo de bônus | Usar apenas 2103 | Validação contábil |
| Dedução da receita | Criar enum REVENUE_DEDUCTION | Migration + validação contábil |

**Classificação:** `SPECIALIST_ACCOUNTANT_REQUIRED`

---

## E. Classificações utilizadas neste relatório

| Classificação | Significado |
|---------------|-------------|
| SPECIALIST_ACCOUNTANT_REQUIRED | Exige contador especialista em tributação digital/plataformas |
| NEEDS_EXTERNAL_VALIDATION | Depende de confirmação de fonte externa (RFB, prefeitura, PSP) |
| MUNICIPAL_CONFIRMATION | Depende de confirmação municipal (NFS-e, ISS, inscrição) |
| ACCOUNTANT_CONFIRMATION | Contador regular pode confirmar |
| INTERNAL_DECISION_PENDING | Decisão interna da KAVIAR ainda necessária |
| BLOCKED_BY_SCHEMA | Bloqueado por limitação técnica do schema atual |

---

## F. Conta 3301 — Categoria bloqueada do blueprint (não é uma decisão)

| Atributo | Valor |
|----------|-------|
| Código | 3301 |
| Nome conceitual | Revenue Deduction - Driver Earned Bonus |
| Modelo destino | `financial_categories` |
| Kind necessário | `REVENUE_DEDUCTION` (não existe no enum) |
| status | `BLOCKED_BY_SCHEMA` |
| is_postable | `false` |
| can_apply | `false` |
| migration proposta | nenhuma |
| enum alterado | não |
| desbloqueio autorizado | não |
| aparece na matriz G | não (é item separado) |
| classificação | `SPECIALIST_ACCOUNTANT_REQUIRED` |

**Lançamento conceitual associado (BP-10, não executável):**

| Evento | Débito | Crédito |
|--------|--------|---------|
| Reconhecimento do bônus | 3301 (dedução) | 2103 (passivo) |

Este lançamento é **apenas conceitual**. Não pode ser executado porque:
1. A conta 3301 não existe no banco
2. O enum `REVENUE_DEDUCTION` não existe no schema
3. A decisão contábil sobre a natureza do bônus (dedução vs. despesa vs. passivo) não foi tomada
4. A política de bônus pode ser melhor representada como despesa promocional

**Próximo passo:** Aguardar parecer do contador especialista sobre a classificação correta.

---

## G. Matriz completa de decisões (25/25)

### FIN-2B-01

| Campo | Valor |
|-------|-------|
| Código | FIN-2B-01 |
| Título | Accounts Receivable - Chargebacks (1203) |
| Área responsável | ACCOUNTANT |
| Status atual | PENDING_ACCOUNTANT |
| Política administrativa | Não definida |
| Fato comprovado | Chargebacks existem no modelo de negócio; workflow não implementado |
| Premissa não comprovada | Que o chargeback gera automaticamente direito de recuperação contra o motorista |
| Recomendação preliminar | Aguardar definição do fluxo MED e do contrato SumUp antes de definir conta |
| Classificação | SPECIALIST_ACCOUNTANT_REQUIRED, NEEDS_EXTERNAL_VALIDATION |
| Risco | ALTO — débito indevido ao motorista se mal classificado |
| Responsável pela validação | Contador especialista + análise do contrato SumUp |
| Pergunta necessária | Em qual evento o chargeback deve ser reconhecido e contra qual parte? |
| Alteração de código | Futura — workflow de chargeback |
| Alteração de schema | Nenhuma nesta etapa |
| Pode aplicar agora | NÃO |
| Evidência | Contrato SumUp não analisado, webhook MED não documentado |
| Arquivo | `docs/finance/phase-3c-2d-2b-decision-register.json` |
| Trecho | decisions[0] |

### FIN-2B-02

| Campo | Valor |
|-------|-------|
| Código | FIN-2B-02 |
| Título | Payable to Drivers - Refunds (2104) |
| Área responsável | ACCOUNTANT |
| Status atual | PENDING_ACCOUNTANT |
| Política administrativa | DRIVER_FIRST_FINANCIAL_POLICY |
| Fato comprovado | Cancelamentos existem; motorista recebe compensação de R$ 5,00 |
| Premissa não comprovada | Que todo reembolso ao motorista deve gerar passivo específico |
| Recomendação preliminar | Separar compensação de cancelamento de outros tipos de reembolso |
| Classificação | SPECIALIST_ACCOUNTANT_REQUIRED |
| Risco | MÉDIO — classificação incorreta pode misturar receita com repasse |
| Responsável pela validação | Contador |
| Pergunta necessária | Reembolso gera passivo específico, estorno de obrigação ou despesa? |
| Alteração de código | Futura — fluxo de reembolso |
| Alteração de schema | Nenhuma nesta etapa |
| Pode aplicar agora | NÃO |
| Evidência | Política de cancelamento definida (motorista recebe 100%) |
| Arquivo | `docs/finance/phase-3c-2d-2b-decision-register.json` |
| Trecho | decisions[1] |

### FIN-2B-03

| Campo | Valor |
|-------|-------|
| Código | FIN-2B-03 |
| Título | Payable to Managers - Provision (2201) |
| Área responsável | ACCOUNTANT |
| Status atual | PENDING_ACCOUNTANT |
| Política administrativa | Base do gestor pendente (INTERNAL_DECISION_PENDING parcial) |
| Fato comprovado | Gestor recebe percentual da taxa; é temporário; não financia bônus |
| Premissa não comprovada | Que 40% é a base líquida exata; que não há retenção tributária |
| Recomendação preliminar | Definir base de cálculo exata e tratamento tributário antes de provisionar |
| Classificação | SPECIALIST_ACCOUNTANT_REQUIRED |
| Risco | ALTO — erro tributário, sub ou sobrepagamento |
| Responsável pela validação | Contador especialista |
| Pergunta necessária | Despesa, comissão, compartilhamento ou redução de receita? Momento de provisionamento? |
| Alteração de código | Futura — cálculo de provisão |
| Alteração de schema | Nenhuma nesta etapa |
| Pode aplicar agora | NÃO |
| Evidência | Decisões admin confirmam que gestor não financia bônus |
| Arquivo | `docs/finance/phase-3c-2d-2b-decision-register.json` |
| Trecho | decisions[2] |

### FIN-2B-04

| Campo | Valor |
|-------|-------|
| Código | FIN-2B-04 |
| Título | Payable to Managers - Adjustments (2203) |
| Área responsável | ACCOUNTANT |
| Status atual | PENDING_ACCOUNTANT |
| Política administrativa | Gestor temporário; valores adquiridos devem ser pagos |
| Fato comprovado | Ajustes negativos podem existir (penalidades, reconciliações) |
| Premissa não comprovada | Que claw-back pode reduzir passivo existente sem restrição |
| Recomendação preliminar | Definir limites legais do claw-back e separar de ajustes operacionais |
| Classificação | SPECIALIST_ACCOUNTANT_REQUIRED |
| Risco | MÉDIO — risco trabalhista/contratual se claw-back indevido |
| Responsável pela validação | Contador + jurídico |
| Pergunta necessária | Ajustes negativos reduzem passivo ou geram conta a receber? |
| Alteração de código | Futura |
| Alteração de schema | Nenhuma nesta etapa |
| Pode aplicar agora | NÃO |
| Evidência | Política de gestor temporário confirmada |
| Arquivo | `docs/finance/phase-3c-2d-2b-decision-register.json` |
| Trecho | decisions[3] |

### FIN-2B-05

| Campo | Valor |
|-------|-------|
| Código | FIN-2B-05 |
| Título | Taxes Payable - ISS (2301) |
| Área responsável | ACCOUNTANT |
| Status atual | PENDING_ACCOUNTANT |
| Política administrativa | Não presumir eliminação pelo Simples |
| Fato comprovado | KAVIAR presta serviço de intermediação de transporte |
| Premissa não comprovada | Que o ISS incide apenas sobre receita líquida; que está no Simples; município competente |
| Recomendação preliminar | Confirmar regime tributário, município, código de serviço, retenção |
| Classificação | SPECIALIST_ACCOUNTANT_REQUIRED, MUNICIPAL_CONFIRMATION |
| Risco | ALTO — multa, auto de infração, ISS retroativo |
| Responsável pela validação | Contador + prefeitura |
| Pergunta necessária | Base bruta ou líquida? Qual município? Qual momento? |
| Alteração de código | Futura — parametrização de alíquotas |
| Alteração de schema | Nenhuma nesta etapa |
| Pode aplicar agora | NÃO |
| Evidência | Regime tributário não confirmado |
| Arquivo | `docs/finance/phase-3c-2d-2b-decision-register.json` |
| Trecho | decisions[4] |

### FIN-2B-06

| Campo | Valor |
|-------|-------|
| Código | FIN-2B-06 |
| Título | Taxes Payable - INSS (2303) |
| Área responsável | ACCOUNTANT |
| Status atual | PENDING_ACCOUNTANT |
| Política administrativa | Hipótese — não confirmada |
| Fato comprovado | Motoristas prestam serviço via plataforma |
| Premissa não comprovada | Que não há incidência de INSS em nenhum cenário; que a plataforma não tem responsabilidade previdenciária indireta |
| Recomendação preliminar | Analisar por tipo de motorista (PF, CI, MEI, PJ); não assumir isenção |
| Classificação | SPECIALIST_ACCOUNTANT_REQUIRED |
| Risco | ALTO — responsabilidade solidária, autuação previdenciária |
| Responsável pela validação | Contador especialista em previdência |
| Pergunta necessária | Existe incidência? Base, alíquota e responsável por tipo de motorista? |
| Alteração de código | Futura |
| Alteração de schema | Nenhuma nesta etapa |
| Pode aplicar agora | NÃO |
| Evidência | Classificação de motoristas não confirmada |
| Arquivo | `docs/finance/phase-3c-2d-2b-decision-register.json` |
| Trecho | decisions[5] |

### FIN-2B-07

| Campo | Valor |
|-------|-------|
| Código | FIN-2B-07 |
| Título | Taxes Payable - PIS/Cofins (2304) |
| Área responsável | ACCOUNTANT |
| Status atual | PENDING_ACCOUNTANT |
| Política administrativa | Não definida |
| Fato comprovado | KAVIAR opera intermediação de transporte |
| Premissa não comprovada | Que PIS/Cofins incide apenas sobre receita de intermediação; regime cumulativo ou não-cumulativo |
| Recomendação preliminar | Confirmar regime tributário e base de cálculo |
| Classificação | SPECIALIST_ACCOUNTANT_REQUIRED |
| Risco | MÉDIO — cálculo incorreto, créditos indevidos |
| Responsável pela validação | Contador |
| Pergunta necessária | Incide sobre bruto das corridas ou apenas receita de intermediação? |
| Alteração de código | Futura |
| Alteração de schema | Nenhuma nesta etapa |
| Pode aplicar agora | NÃO |
| Evidência | Regime tributário não confirmado |
| Arquivo | `docs/finance/phase-3c-2d-2b-decision-register.json` |
| Trecho | decisions[6] |

### FIN-2B-08

| Campo | Valor |
|-------|-------|
| Código | FIN-2B-08 |
| Título | Payable to Partners - Commission (2401) |
| Área responsável | ACCOUNTANT |
| Status atual | PENDING_ACCOUNTANT |
| Política administrativa | Separação conceitual aprovada (FIN-2B-25); base pendente (INTERNAL_DECISION_PENDING) |
| Fato comprovado | Parceiros existem; comissão separada do gestor foi aprovada administrativamente |
| Premissa não comprovada | Que a comissão de parceiro sai automaticamente dos 40% do gestor |
| Recomendação preliminar | Definir fato gerador, documento, retenções; não presumir redução da base do gestor |
| Classificação | SPECIALIST_ACCOUNTANT_REQUIRED, INTERNAL_DECISION_PENDING |
| Risco | MÉDIO — pagamento indevido ou duplicidade |
| Responsável pela validação | Contador + decisão interna KAVIAR |
| Pergunta necessária | Passivo separado? Fato gerador? Documento? Retenções? |
| Alteração de código | Futura |
| Alteração de schema | Nenhuma nesta etapa |
| Pode aplicar agora | NÃO |
| Evidência | Decisão admin FIN-2B-25 aprovada |
| Arquivo | `docs/finance/phase-3c-2d-2b-decision-register.json` |
| Trecho | decisions[7] |

### FIN-2B-09

| Campo | Valor |
|-------|-------|
| Código | FIN-2B-09 |
| Título | Chargebacks Payable (2402) |
| Área responsável | ACCOUNTANT |
| Status atual | PENDING_ACCOUNTANT |
| Política administrativa | DRIVER_FIRST_FINANCIAL_POLICY |
| Fato comprovado | Chargebacks/MED podem ocorrer |
| Premissa não comprovada | Que o chargeback gera obrigação automática da KAVIAR ao adquirente ou pagador |
| Recomendação preliminar | Separar MED de chargeback comercial; analisar contrato SumUp; não debitar motorista sem evidência |
| Classificação | SPECIALIST_ACCOUNTANT_REQUIRED, NEEDS_EXTERNAL_VALIDATION |
| Risco | ALTO — perda financeira, débito indevido ao motorista |
| Responsável pela validação | Contador + análise contrato SumUp + PSP |
| Pergunta necessária | Obrigação ao adquirente, passageiro ou outra parte? Relação com 1203? |
| Alteração de código | Futura — workflow MED |
| Alteração de schema | Nenhuma nesta etapa |
| Pode aplicar agora | NÃO |
| Evidência | Contrato SumUp não analisado |
| Arquivo | `docs/finance/phase-3c-2d-2b-decision-register.json` |
| Trecho | decisions[8] |

### FIN-2B-10

| Campo | Valor |
|-------|-------|
| Código | FIN-2B-10 |
| Título | Revenue - Platform Fee / Rides (3101) |
| Área responsável | ACCOUNTANT |
| Status atual | PENDING_ACCOUNTANT |
| Política administrativa | KAVIAR atua como agente/intermediária (hipótese operacional) |
| Fato comprovado | KAVIAR cobra 18% de taxa; motorista recebe 82%; dinheiro do passageiro transita parcialmente |
| Premissa não comprovada | Que o modelo NET_AGENT está correto contabilmente; que a receita é apenas 18% |
| Recomendação preliminar | Confirmar modelo principal vs. agente com contador; definir base tributária |
| Classificação | SPECIALIST_ACCOUNTANT_REQUIRED |
| Risco | ALTO — reconhecimento de receita incorreto afeta todas as obrigações |
| Responsável pela validação | Contador especialista |
| Pergunta necessária | KAVIAR é agente (reconhece só a taxa) ou principal (reconhece bruto)? |
| Alteração de código | Futura — regra de reconhecimento |
| Alteração de schema | Nenhuma nesta etapa |
| Pode aplicar agora | NÃO |
| Evidência | Operação atual indica agente, mas sem confirmação contábil formal |
| Arquivo | `docs/finance/phase-3c-2d-2b-decision-register.json` |
| Trecho | decisions[9] |

### FIN-2B-11

| Campo | Valor |
|-------|-------|
| Código | FIN-2B-11 |
| Título | Revenue - Cancellation Fees (3102) |
| Área responsável | ACCOUNTANT |
| Status atual | PENDING_ACCOUNTANT |
| Política administrativa | DRIVER_FIRST_FINANCIAL_POLICY — compensação pertence ao motorista |
| Fato comprovado | Compensação de R$ 5,00 pertence integralmente ao motorista; KAVIAR não retém |
| Premissa não comprovada | Que esta conta deveria receber valores de cancelamento |
| Recomendação preliminar | Esta conta NÃO deve receber compensações de cancelamento; avaliar desativação ou reclassificação |
| Classificação | SPECIALIST_ACCOUNTANT_REQUIRED |
| Risco | BAIXO (desde que não receba lançamentos indevidos) |
| Responsável pela validação | Contador |
| Pergunta necessária | Conta deve ser desativada, reservada ou reclassificada como gerencial? |
| Alteração de código | Futura — possível desativação |
| Alteração de schema | Nenhuma nesta etapa |
| Pode aplicar agora | NÃO |
| Evidência | Política permanente de cancelamento definida |
| Arquivo | `docs/finance/phase-3c-2d-2b-decision-register.json` |
| Trecho | decisions[10] |

### FIN-2B-12

| Campo | Valor |
|-------|-------|
| Código | FIN-2B-12 |
| Título | Revenue - Deferred - Recognized (3202) |
| Área responsável | ACCOUNTANT |
| Status atual | PENDING_ACCOUNTANT |
| Política administrativa | Créditos pré-pagos geram passivo (2101), não receita imediata |
| Fato comprovado | Motorista compra créditos antecipadamente; uso ocorre em corridas futuras |
| Premissa não comprovada | Que existe receita diferida a reconhecer separadamente da taxa de intermediação |
| Recomendação preliminar | Confirmar se o consumo do crédito gera receita diferida ou se a receita é apenas a taxa de 18% |
| Classificação | SPECIALIST_ACCOUNTANT_REQUIRED |
| Risco | MÉDIO — reconhecimento antecipado de receita |
| Responsável pela validação | Contador |
| Pergunta necessária | Créditos pré-pagos geram receita diferida? Quando reconhecer? |
| Alteração de código | Futura |
| Alteração de schema | Nenhuma nesta etapa |
| Pode aplicar agora | NÃO |
| Evidência | Modelo de créditos existe no sistema |
| Arquivo | `docs/finance/phase-3c-2d-2b-decision-register.json` |
| Trecho | decisions[11] |

### FIN-2B-13

| Campo | Valor |
|-------|-------|
| Código | FIN-2B-13 |
| Título | Expense - Manager Regional Share (4101) |
| Área responsável | ACCOUNTANT |
| Status atual | PENDING_ACCOUNTANT |
| Política administrativa | Gestor temporário; não financia bônus; base exata pendente |
| Fato comprovado | Gestor recebe percentual da taxa; é temporário; bônus não reduz sua base |
| Premissa não comprovada | Que deve ser classificada como despesa operacional e não redução de receita |
| Recomendação preliminar | Definir se é despesa, custo ou compartilhamento de receita; não usar "40% da taxa líquida" sem definição |
| Classificação | SPECIALIST_ACCOUNTANT_REQUIRED |
| Risco | MÉDIO — classificação afeta resultado operacional e tributação |
| Responsável pela validação | Contador |
| Pergunta necessária | Despesa operacional ou redução da receita? |
| Alteração de código | Futura |
| Alteração de schema | Nenhuma nesta etapa |
| Pode aplicar agora | NÃO |
| Evidência | Decisões admin confirmam independência do bônus |
| Arquivo | `docs/finance/phase-3c-2d-2b-decision-register.json` |
| Trecho | decisions[12] |

### FIN-2B-14

| Campo | Valor |
|-------|-------|
| Código | FIN-2B-14 |
| Título | Provision - Manager Payments / Monthly (4201) |
| Área responsável | ACCOUNTANT |
| Status atual | PENDING_ACCOUNTANT |
| Política administrativa | Vinculada à decisão de 4101/2201 |
| Fato comprovado | Pagamentos mensais existem; percentual por corrida |
| Premissa não comprovada | Que 4201 e 4101 representam fatos contábeis distintos |
| Recomendação preliminar | Confirmar se provisão separada é necessária ou se 4101 já cobre o mesmo fato |
| Classificação | SPECIALIST_ACCOUNTANT_REQUIRED |
| Risco | BAIXO — duplicidade contábil se mal separada |
| Responsável pela validação | Contador |
| Pergunta necessária | Provisão existe separadamente de 4101 ou ambas representam o mesmo fato? |
| Alteração de código | Futura |
| Alteração de schema | Nenhuma nesta etapa |
| Pode aplicar agora | NÃO |
| Evidência | Ambas as contas constam no blueprint |
| Arquivo | `docs/finance/phase-3c-2d-2b-decision-register.json` |
| Trecho | decisions[13] |

### FIN-2B-15

| Campo | Valor |
|-------|-------|
| Código | FIN-2B-15 |
| Título | Expense - ISS / Service Tax (4301) |
| Área responsável | ACCOUNTANT |
| Status atual | PENDING_ACCOUNTANT |
| Política administrativa | ISS não é automaticamente eliminado pelo Simples |
| Fato comprovado | KAVIAR presta serviço tributável pelo ISS |
| Premissa não comprovada | Que ISS é despesa e não dedução; que o Simples elimina obrigação separada |
| Recomendação preliminar | Separar ISS no DAS, ISS retido, ISS fora do DAS; confirmar município competente |
| Classificação | SPECIALIST_ACCOUNTANT_REQUIRED, MUNICIPAL_CONFIRMATION |
| Risco | ALTO — auto de infração municipal |
| Responsável pela validação | Contador + prefeitura |
| Pergunta necessária | ISS como despesa, dedução ou apenas contrapartida do passivo 2301? |
| Alteração de código | Futura — parametrização |
| Alteração de schema | Nenhuma nesta etapa |
| Pode aplicar agora | NÃO |
| Evidência | Regime tributário não confirmado |
| Arquivo | `docs/finance/phase-3c-2d-2b-decision-register.json` |
| Trecho | decisions[14] |

### FIN-2B-16

| Campo | Valor |
|-------|-------|
| Código | FIN-2B-16 |
| Título | Payable to Managers - Bonus (2202) |
| Área responsável | LEGAL |
| Status atual | PENDING_LEGAL |
| Política administrativa | BONUS-POLICY-v1 — bônus financiado 100% pela KAVIAR; gestor não financia |
| Fato comprovado | Política aprovada proíbe gestor de financiar bônus |
| Premissa não comprovada | Que o contrato atual permite reter valores do gestor para qualquer finalidade de bônus |
| Recomendação preliminar | Nome da conta sugere que gestor financia bônus — revisar nomenclatura; validar contrato |
| Classificação | SPECIALIST_ACCOUNTANT_REQUIRED (nomenclatura), PENDING_LEGAL (contrato) |
| Risco | ALTO — retenção indevida, conflito contratual |
| Responsável pela validação | Jurídico |
| Pergunta necessária | Contrato permite retenção? Quais cláusulas? Limites? Efeitos da rescisão? |
| Alteração de código | Futura — revisão de nome |
| Alteração de schema | Nenhuma nesta etapa |
| Pode aplicar agora | NÃO |
| Evidência | Política de bônus congelada (BP-02: KAVIAR financia 100%) |
| Arquivo | `docs/finance/phase-3c-2d-2b-decision-register.json` |
| Trecho | decisions[15] |

### FIN-2B-17

| Campo | Valor |
|-------|-------|
| Código | FIN-2B-17 |
| Título | Taxes Payable - IRRF (2302) |
| Área responsável | LEGAL |
| Status atual | PENDING_LEGAL |
| Política administrativa | Hipótese — não confirmada; depende da análise principal vs. agente |
| Fato comprovado | Pagamentos a gestores e parceiros existem |
| Premissa não comprovada | Ausência de IRRF; ausência de obrigação acessória; classificação dos beneficiários |
| Recomendação preliminar | Não assumir isenção; separar PF, PJ, MEI; verificar tabela progressiva e retenções |
| Classificação | SPECIALIST_ACCOUNTANT_REQUIRED |
| Risco | ALTO — multa por não retenção, responsabilidade solidária |
| Responsável pela validação | Jurídico + contador |
| Pergunta necessária | Quais pagamentos a gestores/parceiros obrigam IRRF? PF e PJ? |
| Alteração de código | Futura |
| Alteração de schema | Nenhuma nesta etapa |
| Pode aplicar agora | NÃO |
| Evidência | Modelo contratual não analisado formalmente |
| Arquivo | `docs/finance/phase-3c-2d-2b-decision-register.json` |
| Trecho | decisions[16] |

### FIN-2B-18

| Campo | Valor |
|-------|-------|
| Código | FIN-2B-18 |
| Título | Provision - Bonus Manager / Annual (4203) |
| Área responsável | LEGAL |
| Status atual | PENDING_LEGAL |
| Política administrativa | BONUS-POLICY-v1 — gestor não financia bônus |
| Fato comprovado | Política proíbe gestor de financiar bônus |
| Premissa não comprovada | Que a KAVIAR pode contratualmente obrigar gestor a contribuir para bônus |
| Recomendação preliminar | Conta pode ser desnecessária se bônus for 100% KAVIAR; nome inadequado |
| Classificação | PENDING_LEGAL |
| Risco | MÉDIO — conta pode ser obsoleta à luz da política aprovada |
| Responsável pela validação | Jurídico |
| Pergunta necessária | KAVIAR pode obrigar gestor a financiar bônus? Cláusulas necessárias? Riscos? |
| Alteração de código | Futura — possível remoção ou reclassificação |
| Alteração de schema | Nenhuma nesta etapa |
| Pode aplicar agora | NÃO |
| Evidência | Política BP-02 aprovada |
| Arquivo | `docs/finance/phase-3c-2d-2b-decision-register.json` |
| Trecho | decisions[17] |

### FIN-2B-19

| Campo | Valor |
|-------|-------|
| Código | FIN-2B-19 |
| Título | Expense - Withholding Tax (4302) |
| Área responsável | LEGAL |
| Status atual | PENDING_LEGAL |
| Política administrativa | Não definida |
| Fato comprovado | Se houver retenção de terceiros, haverá obrigação de recolher |
| Premissa não comprovada | Que tributo retido é despesa da KAVIAR; pode ser apenas passivo transitório |
| Recomendação preliminar | Confirmar se é despesa ou apenas valor retido e recolhido (passivo transitório) |
| Classificação | SPECIALIST_ACCOUNTANT_REQUIRED, PENDING_LEGAL |
| Risco | BAIXO — classificação incorreta afeta resultado mas não gera multa adicional |
| Responsável pela validação | Jurídico + contador |
| Pergunta necessária | Tributo retido de terceiro é despesa da KAVIAR ou valor transitório? |
| Alteração de código | Futura |
| Alteração de schema | Nenhuma nesta etapa |
| Pode aplicar agora | NÃO |
| Evidência | Nenhuma retenção praticada até o momento |
| Arquivo | `docs/finance/phase-3c-2d-2b-decision-register.json` |
| Trecho | decisions[18] |

### FIN-2B-20

| Campo | Valor |
|-------|-------|
| Código | FIN-2B-20 |
| Título | Centro de custo corporativo — KAVIAR Corporativo (CC001) |
| Área responsável | ADMIN |
| Status atual | DECIDIDO (APPROVE_WITH_CHANGES) |
| Política administrativa | Centro raiz; código provisório CC001 → futuro CORP |
| Fato comprovado | Conceito aprovado pela administração em 2026-07-21 |
| Premissa não comprovada | Nenhuma — decisão tomada |
| Recomendação preliminar | Auditar centros existentes antes de materializar; não usar como destino automático |
| Classificação | DECIDIDO |
| Risco | BAIXO |
| Responsável pela validação | Administração (já validou) |
| Pergunta necessária | Nenhuma pendente |
| Alteração de código | Futura — criação do centro após auditoria |
| Alteração de schema | Nenhuma nesta etapa |
| Pode aplicar agora | NÃO (aguarda auditoria de centros existentes) |
| Evidência | `docs/finance/phase-3c-2d-2b-admin-decision.md` |
| Arquivo | `docs/finance/phase-3c-2d-2b-decision-register.json` |
| Trecho | decisions[19] |

### FIN-2B-21

| Campo | Valor |
|-------|-------|
| Código | FIN-2B-21 |
| Título | Centro de custo territorial — Território financeiro ativo (CC002) |
| Área responsável | ADMIN |
| Status atual | DECIDIDO (APPROVE_WITH_CHANGES) |
| Política administrativa | Um centro por território financeiramente ativo; subordinado à cidade |
| Fato comprovado | Conceito aprovado em 2026-07-21; hierarquia COMPANY > CITY > TERRITORY |
| Premissa não comprovada | Nenhuma — decisão tomada |
| Recomendação preliminar | Auditar territórios existentes; não criar para prospecção |
| Classificação | DECIDIDO |
| Risco | BAIXO |
| Responsável pela validação | Administração (já validou) |
| Pergunta necessária | Nenhuma pendente |
| Alteração de código | Futura — criação após auditoria |
| Alteração de schema | Nenhuma nesta etapa |
| Pode aplicar agora | NÃO (aguarda auditoria) |
| Evidência | `docs/finance/phase-3c-2d-2b-admin-decision.md` |
| Arquivo | `docs/finance/phase-3c-2d-2b-decision-register.json` |
| Trecho | decisions[20] |

### FIN-2B-22

| Campo | Valor |
|-------|-------|
| Código | FIN-2B-22 |
| Título | Centro de custo cidade — Cidade operacional (CC003) |
| Área responsável | ADMIN |
| Status atual | DECIDIDO (APPROVE_WITH_CHANGES) |
| Política administrativa | Um centro por cidade operacional ativa; hierarquia COMPANY > CITY > TERRITORY |
| Fato comprovado | Conceito aprovado em 2026-07-21 |
| Premissa não comprovada | Nenhuma — decisão tomada |
| Recomendação preliminar | Auditar cidades existentes; não criar para prospecção |
| Classificação | DECIDIDO |
| Risco | BAIXO |
| Responsável pela validação | Administração (já validou) |
| Pergunta necessária | Nenhuma pendente |
| Alteração de código | Futura — criação após auditoria |
| Alteração de schema | Nenhuma nesta etapa |
| Pode aplicar agora | NÃO (aguarda auditoria) |
| Evidência | `docs/finance/phase-3c-2d-2b-admin-decision.md` |
| Arquivo | `docs/finance/phase-3c-2d-2b-decision-register.json` |
| Trecho | decisions[21] |

### FIN-2B-23

| Campo | Valor |
|-------|-------|
| Código | FIN-2B-23 |
| Título | Centro de custo departamento — Dimensão financeira futura (CC004) |
| Área responsável | ADMIN |
| Status atual | DECIDIDO (DEFER) |
| Política administrativa | Adiado até schema suportar dimensões independentes |
| Fato comprovado | Modelo atual não comporta dimensões ortogonais; decisão de adiar aprovada |
| Premissa não comprovada | Nenhuma — decisão tomada (adiamento) |
| Recomendação preliminar | Não materializar; não misturar na árvore territorial |
| Classificação | DECIDIDO (DEFER) |
| Risco | NENHUM (adiado) |
| Responsável pela validação | Administração (já validou) |
| Pergunta necessária | Nenhuma pendente nesta fase |
| Alteração de código | Nenhuma |
| Alteração de schema | Futura — dimensões independentes |
| Pode aplicar agora | NÃO |
| Evidência | `docs/finance/phase-3c-2d-2b-admin-decision.md` |
| Arquivo | `docs/finance/phase-3c-2d-2b-decision-register.json` |
| Trecho | decisions[22] |

### FIN-2B-24

| Campo | Valor |
|-------|-------|
| Código | FIN-2B-24 |
| Título | Revenue - Commercial Partnerships / Referral Commission (3201) |
| Área responsável | ADMIN |
| Status atual | DECIDIDO administrativamente (APPROVE_WITH_CHANGES); PENDING_ACCOUNTANT para tratamento contábil |
| Política administrativa | Representa somente valores economicamente pertencentes à KAVIAR |
| Fato comprovado | Conceito e nome aprovados; exige contrato, fato gerador, vigência |
| Premissa não comprovada | Tratamento contábil bruto vs. líquido |
| Recomendação preliminar | Aguardar contador para definir reconhecimento |
| Classificação | DECIDIDO (admin) + SPECIALIST_ACCOUNTANT_REQUIRED (contábil) |
| Risco | BAIXO (conceito claro; implementação aguarda) |
| Responsável pela validação | Contador (para tratamento contábil) |
| Pergunta necessária | Reconhecimento bruto ou líquido? Base tributária? |
| Alteração de código | Futura |
| Alteração de schema | Nenhuma nesta etapa |
| Pode aplicar agora | NÃO |
| Evidência | `docs/finance/phase-3c-2d-2b-admin-decision.md` |
| Arquivo | `docs/finance/phase-3c-2d-2b-decision-register.json` |
| Trecho | decisions[23] |

### FIN-2B-25

| Campo | Valor |
|-------|-------|
| Código | FIN-2B-25 |
| Título | Expense - Commercial Partner Commission (4102) |
| Área responsável | ADMIN |
| Status atual | DECIDIDO administrativamente (APPROVE_WITH_CHANGES); PENDING_ACCOUNTANT para tratamento contábil |
| Política administrativa | Separação de parceiro e gestor aprovada; exige partner_id, contrato, regra |
| Fato comprovado | Separação conceitual aprovada; não é recompensa de indicação |
| Premissa não comprovada | Se sai dos 40% do gestor ou é despesa adicional (INTERNAL_DECISION_PENDING) |
| Recomendação preliminar | Aguardar decisão interna sobre base + contador para classificação |
| Classificação | DECIDIDO (admin) + SPECIALIST_ACCOUNTANT_REQUIRED + INTERNAL_DECISION_PENDING |
| Risco | MÉDIO — indefinição da base pode gerar dupla contagem |
| Responsável pela validação | Decisão interna KAVIAR + contador |
| Pergunta necessária | Despesa separada, custo contratual ou redução de receita? Base compartilhada com gestor? |
| Alteração de código | Futura |
| Alteração de schema | Nenhuma nesta etapa |
| Pode aplicar agora | NÃO |
| Evidência | `docs/finance/phase-3c-2d-2b-admin-decision.md` |
| Arquivo | `docs/finance/phase-3c-2d-2b-decision-register.json` |
| Trecho | decisions[24] |

---

## H. Resumo executivo

### H.1 Contagem numérica

| Métrica | Valor |
|---------|-------|
| Total de registros de decisão | 25 |
| Decisões administrativas concluídas | 6 |
| Decisões pendentes | 19 |
| Decisões internas (INTERNAL_DECISION_PENDING) | 1 (base parceiro/gestor — afeta FIN-2B-08, FIN-2B-25) |
| Decisões com política já definida | 8 (6 admin + DRIVER_FIRST + BONUS-POLICY) |
| Decisões para contador comum | 0 |
| Decisões para contador especialista | 15 |
| Decisões para jurídico | 4 |
| Decisões dependentes de prefeitura | 2 (FIN-2B-05, FIN-2B-15) |
| Decisões bloqueadas pelo schema | 0 (3301 é item separado, não está nas 25) |
| Decisões prontas para aplicação | 0 |
| Decisões que não podem ser aplicadas | 25 (nenhuma autorizada nesta etapa) |
| Decisões com alteração de código futura | 19 |
| Decisões com alteração de schema futura | 1 (FIN-2B-23 — dimensões independentes) |

### H.2 Próximos passos (em ordem)

1. **Concluir o diagnóstico** — este documento
2. **Separar decisões internas pendentes** — base parceiro/gestor
3. **Obter documentos fiscais e cadastrais** — regime tributário, CNPJ, inscrição municipal, contrato SumUp
4. **Preparar folha curta para o contador** — 15 perguntas objetivas com contexto mínimo
5. **Preparar folha curta para o jurídico** — 4 perguntas objetivas com cláusulas
6. **Registrar respostas** — atualizar decision-register.json
7. **Aprovar arquitetura contábil** — blueprint v1.2.0
8. **Somente depois planejar alterações técnicas** — migrations, enums, contas
9. **Criar testes** — cobertura do fluxo financeiro
10. **Implementar em ambiente de teste** — sem produção
11. **Validar antes da produção** — auditoria final

### H.3 Pendências urgentes

| Pendência | Classificação | Prazo sugerido |
|-----------|---------------|----------------|
| VERIFY_2026_IBS_CBS_NFSE_READINESS | SPECIALIST_ACCOUNTANT_REQUIRED + MUNICIPAL_CONFIRMATION | Antes de agosto 2026 |
| Definir base do parceiro vs. gestor | INTERNAL_DECISION_PENDING | Antes da folha do contador |
| Confirmar regime tributário | SPECIALIST_ACCOUNTANT_REQUIRED | Imediato |
| Analisar contrato SumUp (MED/chargeback) | NEEDS_EXTERNAL_VALIDATION | Antes de implementar workflow |

---

## Confirmações obrigatórias

- `25/25 decisões listadas`
- `seções A até H concluídas`
- `nenhuma alteração técnica executada`
- `nenhuma migration criada`
- `3301 mantida bloqueada`
- `wallet tratada como subledger`
- `compensação de cancelamento mantida integralmente em favor do motorista`
- `bônus mantido como custo exclusivo da KAVIAR`
- `CBS/IBS 2026 encaminhados para verificação urgente`
- `premissas tributárias não confirmadas marcadas como NEEDS_EXTERNAL_VALIDATION`
