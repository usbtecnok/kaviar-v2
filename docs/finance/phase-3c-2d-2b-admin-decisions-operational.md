# Fase 3C-2D.2B — Decisões Administrativas Operacionais

**Aprovado por:** Aparecido de Góes (Proprietário KAVIAR)  
**Data:** 2026-07-22T09:36:41Z  
**Escopo:** Decisões operacionais da wallet, gestor e parceiro  
**Política do bônus:** BONUS-POLICY-v1.2 (não reaberta)  
**Status:** APROVADAS — aguardando validações externas indicadas

---

## Resumo

| Nº | Decisão | Resposta | Validação externa |
|----|---------|----------|-------------------|
| 1 | Origem da comissão do parceiro | OUTRA (híbrida) | LEGAL_CONFIRMATION |
| 2 | Base de cálculo do gestor | A (taxa bruta) | — |
| 3 | Expiração dos créditos comprados | D (não expiram + sinalização) | ACCOUNTANT_CONFIRMATION |
| 4 | Saldo comprado é sacável? | A AJUSTADA (não sacável, com reembolso) | LEGAL + REGULATORY |
| 5 | Reembolso de créditos | OUTRA (política objetiva) | LEGAL_CONFIRMATION |
| 6 | Limite da wallet | D (configurável, R$ 500 inicial) | REGULATORY_CONFIRMATION |
| 7 | Prioridade de consumo | A (promocional primeiro) | — |
| 8 | MED/chargeback | B (KAVIAR absorve + recuperação) | — |
| 9 | Ajustes negativos do gestor | OUTRA (processo com contestação) | LEGAL_CONFIRMATION |
| 10 | Encerramento do gestor | A AJUSTADA (fim do mês + exceção) | LEGAL_CONFIRMATION |

---

## DECISÃO 1 — Origem da comissão do parceiro

**Resposta:** OUTRA (híbrida: contratos atuais vs. novos contratos)

### Contratos atuais

Preservar integralmente a remuneração já garantida aos gestores em contratos vigentes.

Se o contrato vigente assegurar ao gestor 40% da taxa da plataforma, a entrada posterior de um parceiro não poderá reduzir esse percentual unilateralmente.

Nesse caso, eventual comissão de parceiro será inicialmente suportada pela KAVIAR como despesa comercial separada, salvo acordo contratual expresso com o gestor.

### Novos contratos

Para contratos futuros, criar uma fatia territorial máxima, definida previamente, destinada ao gestor e aos parceiros vinculados ao território.

Exemplo conceitual:

- fatia territorial total: até 40% da taxa da plataforma;
- gestor recebe percentual X;
- parceiro recebe percentual Y;
- `X + Y` não poderá ultrapassar a fatia territorial definida no contrato.

Os percentuais concretos serão definidos em cada contrato.

Não reduzir retroativamente remuneração já adquirida.

**Validação externa:** `LEGAL_CONFIRMATION` — redação contratual

---

## DECISÃO 2 — Base de cálculo do gestor

**Resposta:** A — taxa bruta da plataforma

A remuneração percentual do gestor será calculada sobre a taxa bruta da plataforma gerada pela corrida elegível.

**Exemplo:**

| Item | Valor |
|------|-------|
| Valor da corrida | R$ 100,00 |
| Taxa da KAVIAR (18%) | R$ 18,00 |
| Percentual do gestor | 40% da taxa |
| Valor do gestor | R$ 7,20 |

**Não deduzir previamente da base:**

- custo de gateway
- custo de Pix
- impostos próprios da KAVIAR
- bônus anual
- outros bônus promocionais
- compensação de cancelamento
- despesas administrativas
- perdas comuns da operação

O gestor recebe 40% da taxa da plataforma, não 40% do valor da corrida.

**Validação externa:** nenhuma pendente para esta decisão

---

## DECISÃO 3 — Expiração dos créditos comprados

**Resposta:** D — não expiram + sinalização de inatividade

Os créditos adquiridos pelo motorista com dinheiro real:

- não expiram;
- não serão apagados por inatividade;
- não serão convertidos automaticamente em receita da KAVIAR;
- permanecerão vinculados ao motorista;
- continuarão registrados no subledger da wallet.

Contas sem atividade por mais de 12 meses serão sinalizadas para:

- tentativa de contato;
- confirmação de dados;
- orientação sobre uso ou reembolso;
- prevenção de abandono de saldo.

A sinalização não autoriza confisco ou expiração.

**Validação externa:** `ACCOUNTANT_CONFIRMATION` — classificação contábil definitiva

---

## DECISÃO 4 — Saldo comprado é sacável?

**Resposta:** A AJUSTADA — não sacável livremente, com reembolso em situações específicas

O saldo comprado não será livremente sacável como se a wallet fosse conta bancária ou conta de livre movimentação.

Finalidade principal: pagar taxas e obrigações relacionadas ao uso da plataforma.

Entretanto:

- o saldo comprado permanece pertencendo ao motorista;
- poderá ser objeto de reembolso nas situações da Decisão 5;
- a ausência de saque livre não autoriza confisco;
- o encerramento da conta não elimina o saldo legítimo;
- o saldo não utilizado deverá continuar identificável.

Não declarar que essa decisão elimina automaticamente qualquer enquadramento regulatório.

**Validação externa:** `LEGAL_CONFIRMATION` + `REGULATORY_CONFIRMATION` — avaliação completa da wallet e do modelo de propósito limitado

---

## DECISÃO 5 — Reembolso de créditos não utilizados

**Resposta:** OUTRA — política objetiva de reembolso

### Reembolso obrigatório administrativamente

Permitir reembolso nas seguintes hipóteses:

- compra duplicada;
- erro técnico;
- valor creditado incorretamente;
- Pix confirmado em conta errada;
- encerramento definitivo da conta;
- impossibilidade permanente de utilização causada pela KAVIAR;
- pagamento posteriormente anulado;
- determinação legal ou judicial.

### Solicitações comuns

O motorista poderá solicitar devolução de saldo comprado não utilizado.

Processo:

1. confirmar identidade;
2. confirmar titularidade do Pix;
3. verificar se o saldo permanece disponível;
4. verificar se houve uso parcial;
5. verificar MED, contestação ou fraude;
6. calcular o valor efetivamente reembolsável;
7. devolver preferencialmente para a conta de origem;
8. registrar auditoria.

### Reembolso parcial

Se parte do saldo já tiver sido utilizada, somente a parte não utilizada poderá ser analisada para devolução.

### Efeito sobre o bônus

- Reembolso integral da recarga → cancela integralmente o bônus anual correspondente
- Reembolso parcial → cancela proporcionalmente o bônus relacionado

Não reembolsar em dinheiro:

- bônus promocional;
- bônus anual ainda não elegível para pagamento;
- créditos concedidos gratuitamente;
- compensações por meio do fluxo de reembolso de recarga.

**Validação externa:** `LEGAL_CONFIRMATION` — aplicabilidade do CDC e direito de arrependimento

---

## DECISÃO 6 — Limite do saldo comprado na wallet

**Resposta:** D — configurável pelo administrador, inicialmente R$ 500

**Limite inicial:** `R$ 500,00`

O limite aplica-se ao saldo comprado acumulado, sem somar:

- bônus anual;
- outros bônus;
- compensação de cancelamento;
- ganhos de corridas;
- valores pendentes de pagamento.

Alteração do limite exige:

- perfil autorizado;
- justificativa;
- registro anterior e posterior;
- data e responsável;
- auditoria.

Finalidade do limite:

- controlar exposição financeira;
- reduzir compras excessivas;
- facilitar testes do MVP;
- limitar erros operacionais;
- reduzir saldo ocioso.

Não afirmar que o limite de R$ 500 elimina risco regulatório, dispensa análise do BACEN, impede enquadramento financeiro ou configura volume automaticamente irrelevante.

**Validação externa:** `REGULATORY_CONFIRMATION`

---

## DECISÃO 7 — Prioridade de consumo da wallet

**Resposta:** A — saldo promocional primeiro

Ordem obrigatória para pagar a taxa da plataforma:

1. **Saldo promocional elegível**
2. **Saldo comprado**
3. **Compensação de cancelamento** — NUNCA consumida para taxa de 18%

O bônus anual de reconhecimento também NÃO deve ser consumido automaticamente para pagar taxa da plataforma.

Cada utilização deve registrar:

- categoria de saldo;
- valor anterior;
- valor consumido;
- valor posterior;
- corrida ou obrigação relacionada;
- data e identificador;
- auditoria.

Finalidade: utilizar primeiro o benefício da KAVIAR e preservar por mais tempo o dinheiro do motorista.

**Validação externa:** nenhuma pendente para esta decisão

---

## DECISÃO 8 — MED, chargeback e contestação

**Resposta:** B — KAVIAR absorve + busca recuperação

Quando o motorista tiver prestado corretamente o serviço:

- não debitar automaticamente o motorista;
- pagar ou preservar o valor legitimamente devido;
- KAVIAR absorve a perda imediata;
- KAVIAR poderá buscar recuperação contra o passageiro responsável;
- passageiro poderá ser bloqueado durante a investigação;
- registrar evidências e auditoria.

### Diferenciação obrigatória

**Fraude, golpe ou falha operacional:** pode justificar MED, investigação, bloqueio e recuperação.

**Desacordo comercial:** reclamação sobre atendimento, preço, trajeto ou qualidade não deve ser automaticamente tratada como MED.

### Participação comprovada do motorista

Motorista poderá ser responsabilizado somente com evidência de:

- corrida simulada;
- conluio;
- fraude;
- participação deliberada;
- recebimento indevido;
- manipulação da operação.

Antes de qualquer débito:

1. abrir ocorrência;
2. reunir evidências;
3. notificar o motorista;
4. conceder direito de contestação;
5. obter decisão administrativa autorizada;
6. registrar auditoria.

**Validação externa:** nenhuma pendente para esta decisão

---

## DECISÃO 9 — Ajustes negativos do gestor

**Resposta:** OUTRA — processo com contestação e limites

### Hipóteses permitidas

Ajustes negativos somente quando houver:

- fraude comprovada;
- apropriação indevida;
- dolo;
- erro operacional comprovado;
- prejuízo financeiro mensurável causado diretamente pelo gestor;
- obrigação expressamente prevista em contrato válido.

### Processo obrigatório

1. abrir ocorrência;
2. apresentar o valor e o motivo;
3. reunir documentos e evidências;
4. notificar o gestor;
5. conceder prazo de **15 dias** para contestação;
6. exigir decisão do `SUPER_ADMIN`;
7. limitar o ajuste ao prejuízo comprovado ou ao valor contratualmente previsto;
8. manter trilha de auditoria.

### Proibições

Não permitir ajustes negativos por:

- bônus anual;
- campanhas promocionais;
- risco normal da operação;
- compensação de cancelamento;
- meta não atingida sem previsão válida;
- reclamação sem evidência;
- decisão unilateral sem processo;
- prejuízo sem relação com o gestor.

Valores não contestados: seguem fluxo normal.  
Valores contestados: permanecem identificados até decisão final.

**Validação externa:** `LEGAL_CONFIRMATION` — regra contratual

---

## DECISÃO 10 — Encerramento e transição do gestor

**Resposta:** A AJUSTADA — fim do mês + suspensão excepcional

### Encerramento normal

- aviso formal;
- data de corte no último dia do mês;
- corridas elegíveis concluídas até a data de corte permanecem atribuídas ao gestor;
- novas corridas posteriores ao corte pertencem ao novo gestor ou à KAVIAR;
- pagamento final em até 30 dias após apuração;
- impedir novas apropriações depois da data de corte;
- manter histórico e auditoria;
- transferir operação sem interromper atendimento aos motoristas.

### Suspensão imediata excepcional

Permitir suspensão imediata quando houver:

- fraude;
- apropriação indevida;
- risco à segurança;
- uso indevido de dados;
- falta grave;
- risco operacional relevante;
- descumprimento contratual grave.

A suspensão imediata do acesso não elimina valores legitimamente adquiridos antes da data de corte.

### Pagamento final

- pagar a parcela não contestada normalmente;
- identificar separadamente valores em disputa;
- não reter toda a remuneração por divergência parcial;
- permitir contestação;
- registrar decisão final;
- manter auditoria.

### Parceiros vinculados

No encerramento do gestor, parceiros vinculados deverão ser:

- reatribuídos;
- encerrados;
- ou mantidos diretamente pela KAVIAR,

conforme seus respectivos contratos.

**Validação externa:** `LEGAL_CONFIRMATION` — prazos e cláusulas de encerramento

---

## Validações externas pendentes (não são decisões administrativas)

### Contador (`ACCOUNTANT_CONFIRMATION`)

- classificação contábil dos saldos comprados
- reconhecimento da obrigação
- tratamento tributário da taxa
- tratamento da remuneração do gestor
- tratamento da comissão do parceiro
- tratamento de reembolsos
- CBS e IBS
- NFS-e
- lançamentos definitivos

### Jurídico (`LEGAL_CONFIRMATION`)

- natureza contratual da compra de créditos
- aplicabilidade do CDC e direito de arrependimento
- política de reembolso
- ajustes negativos do gestor
- encerramento contratual
- recuperação de perdas
- termos da wallet
- redação dos novos contratos de gestor e parceiro

### Regulatório (`REGULATORY_CONFIRMATION`)

- enquadramento da wallet
- arranjo de propósito limitado
- necessidade ou não de autorização
- limites operacionais
- saque, reembolso e movimentação
- fluxo com o provedor de pagamento

---

## Confirmações

- `10 decisões administrativas registradas`
- `política BONUS-POLICY-v1.2 não reaberta`
- `wallet mantida como subledger`
- `classificação regulatória não presumida`
- `nenhuma alteração técnica executada`
- `nenhuma migration criada`
