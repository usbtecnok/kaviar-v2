# Fase 3C-2D.2B — Política Oficial do Bônus KAVIAR

**Política:** `BONUS-POLICY-v1.2`<br>
**Aprovado por:** KAVIAR Administration<br>
**Data de aprovação inicial:** 2026-07-21T15:20:04Z<br>
**Última atualização:** 2026-07-22T09:20:17Z<br>
**Status:** CONGELADA para esta implementação

Política oficial do bônus KAVIAR — congelada para esta implementação.

Esta política contém duas modalidades de bônus:

1. **Bônus por campanha** (BP-01 a BP-10) — configurável, vinculado a corridas válidas
2. **Bônus anual de reconhecimento** (BP-11 a BP-29) — 10% sobre recargas elegíveis, presente de reconhecimento

### Histórico de versões

| Versão | Data | Alteração |
|--------|------|-----------|
| v1.0 | 2026-07-21 | Política original do bônus por campanha (BP-01 a BP-10) |
| v1.1 | 2026-07-22 | Bônus anual de reconhecimento como direito adquirido (BP-11 a BP-23) |
| v1.2 | 2026-07-22 | Exibição imediata, acumulação fora da janela, validade da solicitação, separação de saldos e exclusões da base (BP-24 a BP-29) |

---

## Parte I — Bônus por campanha (configurável)

## Regras

### BP-01

O motorista recebe 100% do valor comprado como saldo consumível.

> **Exemplo:** Pagamento de R$100 gera R$100 em créditos. Nenhum valor da compra é retido para financiar bônus.

### BP-02

O bônus é integralmente financiado pela KAVIAR.

### BP-03

O bônus não nasce na compra dos créditos.

### BP-04

O evento gerador é uma corrida válida concluída.

### BP-05

A base do bônus é a taxa de intermediação efetivamente reconhecida pela KAVIAR, não o valor total da corrida.

### BP-06

O percentual é configurável e versionado por campanha. Nenhum percentual fixo deve aparecer em nome de conta, código, blueprint, regra de domínio fixa ou teste.

### BP-07

Após a corrida válida gerar o bônus, o direito torna-se incondicional.

### BP-08

Corrida cancelada, fraudulenta, estornada ou invalidada não gera bônus definitivo.

### BP-09

O bônus pode ser liquidado por PIX/transferência ou conversão para créditos no aplicativo.

### BP-10

Tratamento contábil: contraprestação a pagar ao cliente, redução da receita, passivo certo após o evento gerador.

## Lançamentos contábeis conceituais

| Evento | Débito | Crédito |
|--------|--------|---------|
| Conclusão da corrida | Créditos pré-pagos de motoristas (2101) | Receita bruta de intermediação (3101) |
| Reconhecimento do bônus | Dedução da receita — bônus adquirido (3301) | Bônus adquirido a pagar aos motoristas (2103) |
| Pagamento em dinheiro | Bônus adquirido a pagar (2103) | Banco |
| Conversão em créditos | Bônus adquirido a pagar (2103) | Créditos pré-pagos de motoristas (2101) |

> Estes lançamentos são conceituais. O tratamento contábil definitivo depende de validação do contador.

---

## Parte II — Bônus anual de 10% como presente de reconhecimento

**Política:** `BONUS-RECOGNITION-POLICY-v1`<br>
**Aprovado por:** KAVIAR Administration<br>
**Data de aprovação:** 2026-07-22T09:07:43Z<br>
**Status:** DEFINITIVA

### BP-11 — Finalidade do bônus anual

O bônus anual de 10% é um presente de reconhecimento concedido pela KAVIAR ao motorista que:

- confiou na plataforma;
- colocou recursos próprios na KAVIAR;
- comprou créditos para utilizar os serviços da plataforma;
- contribuiu financeiramente para o desenvolvimento e crescimento da operação.

O bônus possui natureza de:

- incentivo;
- reconhecimento;
- agradecimento;
- benefício comercial prometido pela KAVIAR.

**Ele não é prêmio por desempenho em corridas.**

### BP-12 — Evento gerador exclusivo

O bônus nasce exclusivamente da recarga elegível confirmada por Pix.

Regra definitiva: `Recarga elegível confirmada → bônus de 10% adquirido`

O direito ao bônus **não depende de:**

- quantidade de corridas;
- nota média;
- avaliação de passageiros;
- índice de aceitação;
- índice de cancelamento;
- disciplina operacional;
- metas;
- produtividade;
- tempo conectado;
- território;
- gestor responsável;
- parceiro comercial;
- modalidade utilizada;
- permanência futura na plataforma.

### BP-13 — Notas baixas não cancelam o bônus

Ainda que o motorista receba avaliações baixas, tenha reclamações, não mantenha boa nota, tenha baixa produtividade, recuse corridas ou deixe de utilizar regularmente o aplicativo, o bônus legitimamente adquirido continuará pertencendo a ele.

A avaliação do serviço prestado e o bônus por compra de crédito são assuntos independentes.

### BP-14 — Indisciplina não cancela o bônus

Ainda que o motorista descumpra regras operacionais, receba advertência, seja suspenso, tenha acesso temporariamente bloqueado, esteja sujeito a investigação ou seja considerado indisciplinado, o bônus adquirido por recargas válidas não poderá ser confiscado, cancelado ou reduzido por esse motivo.

As consequências disciplinares devem ser tratadas separadamente.

### BP-15 — Remoção da plataforma não cancela o bônus

Mesmo que o motorista seja definitivamente removido da plataforma, ele mantém o direito aos bônus adquiridos antes da remoção.

A remoção:

- impede novas operações, conforme a decisão administrativa;
- pode impedir novas recargas;
- pode impedir o uso futuro do aplicativo;
- **não elimina valores legitimamente adquiridos;**
- **não transforma o bônus em receita da KAVIAR;**
- **não autoriza confisco;**
- **não autoriza expiração antecipada.**

### BP-16 — Canal alternativo para motorista removido

Se o cadastro estiver suspenso, encerrado ou removido, a KAVIAR deverá manter um canal alternativo para que o motorista solicite o bônus durante a janela anual.

O canal poderá ser:

- área específica com acesso limitado;
- portal web;
- atendimento administrativo;
- solicitação por e-mail institucional;
- outro fluxo autenticado.

Exigir:

- confirmação de identidade;
- confirmação da titularidade das recargas;
- dados bancários pertencentes ao motorista;
- verificação de reversões legítimas;
- registro de auditoria.

A impossibilidade de acessar normalmente o aplicativo não pode eliminar o direito ao bônus.

### BP-17 — Janela anual de solicitação

O motorista ativo, suspenso ou removido seguirá a mesma janela: **1º de outubro a 31 de dezembro**.

Se não solicitar até 31 de dezembro:

- o bônus não expira;
- permanece acumulado;
- fica aguardando a próxima janela;
- poderá ser solicitado a partir de 1º de outubro do ano seguinte.

O status operacional do motorista não altera a janela nem o transporte do saldo.

### BP-18 — Proibição de compensação ou confisco

O bônus adquirido não pode ser utilizado automaticamente para compensar:

- notas baixas;
- advertências;
- multas operacionais;
- penalidades disciplinares;
- metas não cumpridas;
- prejuízos genéricos da operação;
- saldo negativo não relacionado à recarga;
- débitos do gestor;
- débitos do parceiro;
- taxas da plataforma;
- taxa de 18%;
- valores de cancelamento;
- ajustes administrativos;
- custos da remoção do motorista.

Não permitir desconto unilateral do bônus por fatos não relacionados à recarga que o originou.

### BP-19 — Únicas hipóteses de reversão

O bônus poderá ser revertido **somente** quando houver problema comprovado na própria recarga originadora.

**Hipóteses permitidas:**

- Pix não confirmado;
- webhook duplicado;
- recarga duplicada;
- reembolso integral do valor principal;
- reembolso parcial, com reversão proporcional;
- devolução efetiva do Pix;
- pagamento comprovadamente fraudulento;
- crédito criado por erro técnico;
- crédito manual sem pagamento correspondente;
- decisão judicial relacionada à transação.

**Não são hipóteses de reversão:**

- nota baixa;
- indisciplina;
- suspensão;
- bloqueio;
- exclusão;
- baixa produtividade;
- poucas corridas;
- término da relação com a KAVIAR;
- conflito com gestor;
- mudança de território.

### BP-20 — Fraude operacional vs. fraude na recarga

#### Fraude na recarga

Quando o pagamento que originou o bônus é fraudulento, inexistente, devolvido ou anulado. Nesse caso, o bônus correspondente pode ser revertido mediante evidência.

#### Fraude em corrida ou na operação

Quando o motorista participa de corrida simulada, conluio ou outra irregularidade operacional. Nesse caso:

- a KAVIAR poderá aplicar medidas disciplinares;
- poderá suspender ou remover o motorista;
- poderá buscar ressarcimento pelos meios adequados;
- **mas não deverá cancelar automaticamente bônus legítimos originados por outras recargas válidas.**

Qualquer tentativa de compensação deverá ter:

- fundamento específico;
- evidência;
- direito de contestação;
- aprovação do `SUPER_ADMIN`;
- validação jurídica;
- trilha completa de auditoria.

A regra administrativa preferencial é manter o bônus protegido e tratar eventual prejuízo em processo separado.

### BP-21 — Registro do direito adquirido

Cada bônus deverá permanecer vinculado a:

- motorista beneficiário;
- recarga originadora;
- identificador do Pix;
- valor principal;
- percentual de 10%;
- valor do bônus;
- data de aquisição;
- ciclo anual;
- status;
- reversões legítimas;
- solicitações;
- pagamentos;
- auditoria.

O sistema deverá conseguir provar que o direito nasceu antes de eventual suspensão ou remoção.

### BP-22 — Comunicação ao motorista

A comunicação deverá deixar claro:

> O bônus anual de 10% é um reconhecimento da KAVIAR pela sua recarga e pela confiança depositada na plataforma.

Também deverá informar:

> Depois de adquirido por uma recarga válida, o bônus não será perdido por nota baixa, suspensão ou encerramento do cadastro.

E:

> O pagamento poderá ser solicitado entre 1º de outubro e 31 de dezembro. Valores não solicitados permanecem acumulados para a próxima janela.

### BP-23 — Regra consolidada

| Atributo | Valor |
|----------|-------|
| Bônus | 10% |
| Origem | Recarga elegível confirmada |
| Finalidade | Presente de reconhecimento |
| Depende de corridas | Não |
| Depende de nota | Não |
| Depende de disciplina | Não |
| Depende de produtividade | Não |
| Depende de permanência ativa | Não |
| Motorista suspenso mantém direito | Sim |
| Motorista removido mantém direito | Sim |
| Remoção cancela bônus | Não |
| Bônus não solicitado expira | Não |
| Janela de solicitação | 1º de outubro a 31 de dezembro |
| Fora da janela | Permanece acumulado |
| Financiador | Exclusivamente a KAVIAR |
| Gestor participa | Não |
| Parceiro participa | Não |
| Reversão | Somente por problema comprovado na recarga originadora |
| Conta 3301 | Permanece bloqueada |

### BP-24 — Exibição imediata do bônus no aplicativo

O bônus anual de 10% deve ser registrado e exibido imediatamente no aplicativo após a confirmação efetiva do Pix da recarga elegível.

Regras de exibição:

- Pix apenas criado ou pendente **não** gera bônus;
- Pix confirmado gera o bônus **imediatamente**;
- não é necessário realizar corrida;
- não é necessário consumir o saldo comprado;
- o motorista visualiza separadamente o saldo principal e o bônus.

### BP-25 — Acumulação contínua entre janeiro e setembro

Novas recargas elegíveis confirmadas entre 1º de janeiro e 30 de setembro continuam gerando normalmente o bônus anual de 10%.

Esclarecimentos:

- o bônus continua acumulando fora da janela de solicitação;
- o motorista continua visualizando o valor acumulado;
- apenas a função de nova solicitação de pagamento permanece bloqueada até 1º de outubro;
- os bônus acumulados ficam disponíveis quando a janela abrir em 1º de outubro;
- bônus transportados de anos anteriores permanecem somados e protegidos.

O bônus não nasce apenas em outubro. Ele nasce em qualquer data em que houver recarga elegível confirmada.

### BP-26 — Validade da solicitação enviada até 31 de dezembro

Uma solicitação corretamente enviada entre 1º de outubro e 31 de dezembro permanece válida até sua análise e efetiva liquidação, ainda que a aprovação ou o pagamento ocorram depois de 31 de dezembro.

Esclarecimentos:

- o que define a validade é a data e a hora do envio da solicitação;
- a mudança de calendário para janeiro não cancela a solicitação;
- o valor solicitado não retorna automaticamente para o estado "não solicitado";
- atrasos administrativos ou bancários não prejudicam o motorista;
- não permitir pedidos duplicados sobre o mesmo saldo já solicitado.

### BP-27 — Fluxo exclusivo para solicitação do bônus anual

O fluxo anual de solicitação é exclusivo para o pagamento de valores de bônus anual adquiridos.

Esse fluxo **não permite** solicitar:

- saldo principal comprado;
- compensação de cancelamento;
- reembolso de recarga;
- ganhos de corridas;
- ajustes;
- outros créditos promocionais que não pertençam à política anual.

Somente o bônus anual elegível pode ser solicitado nesse fluxo.

### BP-28 — Separação do saldo de bônus na wallet

O bônus anual deve ser controlado separadamente do saldo principal comprado, da compensação de cancelamento e de quaisquer outras categorias da wallet.

Categorias conceituais de saldo (não autorizam alteração de schema nesta etapa):

- `PURCHASED_BALANCE` — dinheiro colocado pelo motorista;
- `ANNUAL_BONUS` — presente de reconhecimento da KAVIAR;
- `CANCELLATION_COMPENSATION` — compensação recebida por cancelamento;
- outros saldos, se existirem futuramente.

A exibição na wallet deve permitir identificar claramente:

- dinheiro colocado pelo motorista;
- presente de reconhecimento da KAVIAR;
- compensação recebida por cancelamento.

### BP-29 — Compensação de cancelamento e outros créditos não geram bônus

A compensação de cancelamento creditada ao motorista **não** constitui recarga elegível e **não** gera bônus anual de 10%.

Também não geram bônus:

- futura taxa obrigatória de cancelamento;
- créditos manuais;
- reembolsos;
- valores de corridas;
- bônus anteriores;
- outros créditos promocionais;
- ajustes administrativos.

**Somente dinheiro novo, efetivamente pago pelo motorista e confirmado como recarga elegível, gera o bônus anual.**

---

## Confirmações obrigatórias desta atualização

- `bônus reconhece a confiança e a compra de créditos pelo motorista`
- `bônus não é prêmio por desempenho`
- `notas baixas não cancelam o bônus`
- `indisciplina não cancela o bônus adquirido`
- `suspensão não cancela o bônus adquirido`
- `remoção da plataforma não cancela o bônus adquirido`
- `motorista removido terá canal alternativo para solicitar o bônus`
- `reversão somente pode decorrer da recarga originadora`
- `bônus não solicitado não expira`
- `janela anual permanece de 1º de outubro a 31 de dezembro`
- `bônus aparece imediatamente no aplicativo após confirmação do Pix`
- `novos bônus continuam acumulando entre janeiro e setembro`
- `solicitação enviada até 31 de dezembro permanece válida até pagamento`
- `fluxo de solicitação é exclusivo para bônus anual`
- `saldo de bônus é controlado separadamente do saldo principal`
- `compensação de cancelamento não gera bônus`
- `3301 mantida bloqueada`
- `nenhuma alteração técnica executada`
- `BONUS-POLICY-v1.2 registrada com 29 regras`
