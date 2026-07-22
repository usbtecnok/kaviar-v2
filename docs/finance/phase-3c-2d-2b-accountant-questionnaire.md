# Questionário Contábil — KAVIAR Fase 3C-2D.2B

**Para:** Contador responsável  
**De:** KAVIAR Administração  
**Data:** 2026-07-22  
**Assunto:** Validação contábil e fiscal para conclusão do plano de contas  
**Status:** Nenhuma implantação contábil definitiva foi realizada  
**Política de bônus:** BONUS-POLICY-v1.2 (aprovada, aguardando tratamento contábil)

---

## Contexto da operação

A KAVIAR é uma plataforma de mobilidade urbana que conecta passageiros e motoristas.

### Modelo financeiro resumido

| Item | Descrição |
|------|-----------|
| Passageiro paga | valor total da corrida (ex: R$ 100) |
| Motorista recebe | 82% do valor da corrida (ex: R$ 82) |
| KAVIAR retém | taxa de 18% (ex: R$ 18) — única receita da operação de transporte |
| Gestor territorial | pode receber até 40% da taxa da plataforma (ex: R$ 7,20), não da corrida |
| Wallet do motorista | subledger operacional; não é conta bancária |
| Saldo comprado | dinheiro real pago pelo motorista via Pix; não expira |
| Bônus anual 10% | nasce na confirmação do Pix da recarga; financiado 100% pela KAVIAR |
| Compensação de cancelamento | pertence integralmente ao motorista; KAVIAR recebe R$ 0 |
| Conta 3301 | bloqueada; ainda não definido se será dedução, despesa ou passivo |

### O que já foi decidido administrativamente

- Gestor recebe 40% sobre a taxa bruta (R$ 18), sem deduzir gateway/impostos/bônus
- Saldo comprado não expira e não é receita imediata da KAVIAR
- Bônus anual de 10% é presente de reconhecimento pela compra de créditos
- Compensação de cancelamento pertence 100% ao motorista
- Wallet é subledger; valores por motorista vinculados ao passivo coletivo
- Gateway e custos de Pix são suportados pela KAVIAR

### O que ainda depende do contador

- Classificação contábil de cada item
- Momento de reconhecimento da receita
- Tratamento tributário
- Lançamentos definitivos
- Emissão de NFS-e
- Município responsável pelo ISS
- CBS e IBS em 2026
- Plano de contas final

**Os lançamentos conceituais presentes na documentação interna ainda não representam orientação contábil definitiva.**

---

## Perguntas

### Pergunta C-01 — Reconhecimento da receita da taxa de 18%

**Situação da KAVIAR:**
Quando uma corrida é concluída, a KAVIAR retém 18% do valor como taxa de intermediação. O passageiro já pagou antecipadamente (via créditos comprados).

**Entendimento administrativo atual:**
A KAVIAR entende operar como agente/intermediária — reconheceria como receita apenas a taxa de 18%, não o valor bruto da corrida.

**Confirmação necessária do contador:**
A KAVIAR deve reconhecer receita pelo valor bruto da corrida (principal) ou apenas pela taxa de intermediação de 18% (agente)?

**Opções ou tratamentos possíveis:**

* A — Receita líquida (apenas 18%): KAVIAR é agente
* B — Receita bruta (100%): KAVIAR é principal, com custo de 82%
* C — Outro tratamento

**Exemplo numérico:**

| Cenário | Receita reconhecida | Custo reconhecido |
|---------|--------------------|--------------------|
| Agente (A) | R$ 18,00 | — |
| Principal (B) | R$ 100,00 | R$ 82,00 |

**Resposta do contador:**
`________________________`

**Fundamento ou observação:**
`________________________`

**Documento necessário:**
`________________________`

---

### Pergunta C-02 — Separação entre valor do motorista e receita da KAVIAR

**Situação da KAVIAR:**
O passageiro paga R$ 100 via créditos pré-pagos. Desses, R$ 82 pertencem ao motorista e R$ 18 são a taxa da KAVIAR. O dinheiro entra por um único Pix de recarga.

**Entendimento administrativo atual:**
Os R$ 82 nunca são receita da KAVIAR; são obrigação (passivo) com o motorista, transitando pela wallet como subledger.

**Confirmação necessária do contador:**
Os R$ 82 do motorista devem ser registrados como passivo desde o momento da corrida? Ou desde o momento da recarga pelo passageiro? Qual conta de passivo utilizar?

**Opções ou tratamentos possíveis:**

* A — Passivo nasce na corrida concluída (fato gerador operacional)
* B — Passivo nasce na recarga do passageiro (entrada de caixa)
* C — Conta transitória até a corrida, passivo após
* Outro — ...

**Exemplo numérico:**
Passageiro recarrega R$ 100. Antes de qualquer corrida, os R$ 100 estão na wallet como passivo total (crédito pré-pago). Após corrida de R$ 100: R$ 82 viram "a pagar ao motorista", R$ 18 viram receita.

**Resposta do contador:**
`________________________`

**Fundamento ou observação:**
`________________________`

**Documento necessário:**
`________________________`

---

### Pergunta C-03 — Contabilização da obrigação com o gestor

**Situação da KAVIAR:**
O gestor recebe 40% da taxa de 18% da plataforma por corrida concluída em seu território. Exemplo: corrida de R$ 100 → taxa R$ 18 → gestor R$ 7,20. O pagamento é mensal.

**Entendimento administrativo atual:**
A obrigação nasce na corrida concluída. O pagamento ocorre mensalmente. Bônus, cancelamento, gateway e impostos não reduzem a base.

**Confirmação necessária do contador:**
A provisão mensal do gestor deve ser registrada como despesa operacional, custo do serviço, compartilhamento de receita ou dedução da receita bruta? Em qual momento?

**Opções ou tratamentos possíveis:**

* A — Despesa operacional (resultado)
* B — Custo do serviço vendido
* C — Dedução/redução da receita bruta
* D — Outro

**Exemplo numérico:**

| Mês | Corridas | Taxa total | Gestor (40%) | Classificação? |
|-----|----------|-----------|--------------|----------------|
| Jul/26 | 500 | R$ 9.000 | R$ 3.600 | ? |

**Resposta do contador:**
`________________________`

**Fundamento ou observação:**
`________________________`

**Documento necessário:**
`________________________`

---

### Pergunta C-04 — Comissão de parceiro como despesa

**Situação da KAVIAR:**
Existe um parceiro comercial que recebe comissão. Em contratos vigentes, a KAVIAR suporta essa comissão como despesa separada. Em novos contratos, haverá uma fatia territorial (gestor + parceiro ≤ 40%).

**Entendimento administrativo atual:**
A comissão do parceiro é despesa comercial da KAVIAR (não redução da receita nem custo do gestor).

**Confirmação necessária do contador:**
A comissão de parceiro deve ser classificada como despesa comercial, custo contratual, redução da receita ou outra categoria? Qual o tratamento tributário (ISS, IRRF, INSS)?

**Opções ou tratamentos possíveis:**

* A — Despesa comercial/venda
* B — Custo contratual de operação
* C — Dedução da receita
* D — Outro

**Resposta do contador:**
`________________________`

**Fundamento ou observação:**
`________________________`

**Documento necessário:**
`________________________`

---

### Pergunta C-05 — Saldo comprado pelo motorista na wallet

**Situação da KAVIAR:**
O motorista paga via Pix (ex: R$ 100) e recebe R$ 100 de créditos na wallet. Esses créditos são usados para pagar a taxa de 18% nas corridas. O saldo não expira. A wallet é um subledger operacional.

**Entendimento administrativo atual:**
O valor permanece como passivo (obrigação da KAVIAR para com o motorista) até ser utilizado para pagar a taxa. Não é receita no momento da compra.

**Confirmação necessária do contador:**
O saldo comprado pelo motorista deve ser registrado como passivo circulante (adiantamento de cliente), receita diferida, depósito em garantia ou outra categoria?

**Opções ou tratamentos possíveis:**

* A — Passivo circulante (adiantamento de cliente / crédito pré-pago)
* B — Receita diferida
* C — Depósito em garantia
* D — Outro

**Exemplo numérico:**
Motorista paga R$ 500 → saldo wallet R$ 500 → usa R$ 18 por corrida → saldo restante R$ 482. Os R$ 482 permanecem como...?

**Resposta do contador:**
`________________________`

**Fundamento ou observação:**
`________________________`

**Documento necessário:**
`________________________`

---

### Pergunta C-06 — Créditos que não expiram (classificação contábil)

**Situação da KAVIAR:**
A administração decidiu que os créditos comprados com dinheiro real não expiram. Contas inativas por mais de 12 meses são sinalizadas para contato, mas sem confisco.

**Entendimento administrativo atual:**
O passivo permanece enquanto houver saldo. Não há conversão em receita por decurso de prazo.

**Confirmação necessária do contador:**
Há necessidade de reclassificação entre circulante e não circulante para saldos inativos há mais de 12 meses? Existe tratamento de "breakage" aplicável? Em caso afirmativo, qual o critério?

**Opções ou tratamentos possíveis:**

* A — Mantém passivo circulante indefinidamente
* B — Reclassifica para não circulante após 12 meses
* C — Aplica breakage estimado (reconhece receita proporcional à probabilidade de não uso)
* D — Outro

**Resposta do contador:**
`________________________`

**Fundamento ou observação:**
`________________________`

**Documento necessário:**
`________________________`

---

### Pergunta C-07 — Reembolso de saldo não utilizado

**Situação da KAVIAR:**
O motorista pode solicitar devolução de saldo comprado não utilizado em situações específicas (encerramento de conta, erro, duplicidade, determinação judicial). O reembolso é devolvido à conta de origem.

**Entendimento administrativo atual:**
Reembolso reduz o passivo. Reembolso integral da recarga cancela integralmente o bônus de 10% correspondente. Parcial cancela proporcionalmente.

**Confirmação necessária do contador:**
Qual o lançamento correto para o reembolso? Há impacto tributário (estorno de NFS-e, reversão de impostos)? O cancelamento do bônus correspondente gera lançamento adicional?

**Opções ou tratamentos possíveis:**

* A — D: Passivo (créditos) / C: Banco — simples redução de passivo
* B — Necessidade de nota de crédito ou estorno fiscal
* C — Lançamento adicional para reversão do bônus
* D — Outro

**Exemplo numérico:**
Motorista comprou R$ 200, usou R$ 50, solicita devolução de R$ 150. Bônus de R$ 20 (10% de R$ 200) → cancela R$ 15 (proporcional a R$ 150 devolvidos).

**Resposta do contador:**
`________________________`

**Fundamento ou observação:**
`________________________`

**Documento necessário:**
`________________________`

---

### Pergunta C-08 — Bônus anual de 10% — natureza e momento de reconhecimento

**Situação da KAVIAR:**
Na confirmação do Pix da recarga, o motorista adquire direito a bônus de 10% sobre o valor recarregado. O bônus é financiado 100% pela KAVIAR. O pagamento é solicitável entre outubro e dezembro. Não expira.

**Entendimento administrativo atual:**
O bônus é reconhecido como obrigação certa no momento da confirmação do Pix. É presente de reconhecimento (não depende de corridas). A KAVIAR financia integralmente.

**Confirmação necessária do contador:**
O bônus de 10% deve ser contabilizado como: despesa comercial/promocional com passivo correspondente? Redução da receita? Custo de aquisição de cliente? Em qual momento reconhecer a despesa e o passivo?

**Opções ou tratamentos possíveis:**

* A — Despesa promocional (D: Despesa de marketing / C: Passivo — bônus a pagar)
* B — Dedução da receita (D: Dedução de receita / C: Passivo)
* C — Custo de aquisição de cliente
* D — Outro

**Exemplo numérico:**
Motorista recarrega R$ 1.000 → bônus adquirido R$ 100. KAVIAR reconhece R$ 100 como...?

| Momento | Tratamento A | Tratamento B |
|---------|-------------|-------------|
| Confirmação Pix | D: Despesa R$100 / C: Passivo R$100 | D: Dedução receita R$100 / C: Passivo R$100 |
| Pagamento (out-dez) | D: Passivo R$100 / C: Banco R$100 | D: Passivo R$100 / C: Banco R$100 |

**Resposta do contador:**
`________________________`

**Fundamento ou observação:**
`________________________`

**Documento necessário:**
`________________________`

---

### Pergunta C-09 — Bônus não solicitado: transporte entre exercícios

**Situação da KAVIAR:**
O bônus adquirido pode ser solicitado entre outubro e dezembro. Se o motorista não solicitar, o valor permanece acumulado e transportado para a janela do próximo ano. Não expira.

**Entendimento administrativo atual:**
O passivo permanece indefinidamente até a efetiva liquidação.

**Confirmação necessária do contador:**
Bônus acumulado que transita de um exercício para o outro deve permanecer como passivo circulante? Reclassificar para não circulante? Há necessidade de divulgação em nota explicativa? Há impacto na apuração de tributos?

**Opções ou tratamentos possíveis:**

* A — Mantém como passivo circulante (expectativa de liquidação no próximo ciclo)
* B — Reclassifica para não circulante após 1 ano sem solicitação
* C — Mantém circulante com nota explicativa
* D — Outro

**Resposta do contador:**
`________________________`

**Fundamento ou observação:**
`________________________`

**Documento necessário:**
`________________________`

---

### Pergunta C-10 — Compensação de cancelamento (R$ 5,00 ao motorista)

**Situação da KAVIAR:**
Quando o passageiro cancela, o motorista recebe R$ 5,00 de compensação. Esse valor pertence integralmente ao motorista. A KAVIAR não retém taxa, gestor e parceiro não participam. O custo do Pix é suportado pela KAVIAR.

**Entendimento administrativo atual:**
O valor entra como passivo para com o motorista. KAVIAR reconhece R$ 0 de receita. O custo do meio de pagamento é despesa da KAVIAR.

**Confirmação necessária do contador:**
Qual o lançamento correto? O valor pago pelo passageiro deve transitar pelo resultado da KAVIAR ou ser registrado diretamente como passivo? O custo do Pix/gateway é dedutível?

**Opções ou tratamentos possíveis:**

* A — D: Banco / C: Passivo com motorista (não transita pelo resultado)
* B — D: Banco / C: Receita + D: Custo / C: Passivo (transita pelo resultado)
* C — Outro

**Exemplo numérico:**
Em uma compensação de cancelamento de R$ 5,00, os R$ 5,00 pertencem integralmente ao motorista. Eventual custo de gateway, em valor variável conforme o provedor e a transação, será suportado pela KAVIAR. (O valor do gateway é meramente ilustrativo — não representa tarifa contratual fixa e deverá ser substituído pelo valor efetivamente cobrado e conciliado.)

**Resposta do contador:**
`________________________`

**Fundamento ou observação:**
`________________________`

**Documento necessário:**
`________________________`

---

### Pergunta C-11 — Custo de gateway e Pix

**Situação da KAVIAR:**
A KAVIAR utiliza SumUp como provedor de pagamento. Há custos de recebimento (Pix de recarga) e de envio (pagamento ao motorista). Todos os custos são suportados pela KAVIAR.

**Entendimento administrativo atual:**
Custos de gateway são despesa operacional da KAVIAR. Não reduzem a base de cálculo do gestor nem a taxa do motorista.

**Confirmação necessária do contador:**
Custos de gateway devem ser classificados como despesa financeira, despesa operacional ou custo dos serviços prestados? Há dedutibilidade? Momento de reconhecimento?

**Opções ou tratamentos possíveis:**

* A — Despesa financeira
* B — Despesa operacional / administrativa
* C — Custo dos serviços prestados
* D — Outro

**Resposta do contador:**
`________________________`

**Fundamento ou observação:**
`________________________`

**Documento necessário:**
`________________________`

---

### Pergunta C-12 — MED, chargeback e perdas absorvidas

**Situação da KAVIAR:**
Quando um passageiro contesta um pagamento (MED Pix ou chargeback) e o motorista prestou o serviço corretamente, a KAVIAR absorve a perda. Pode buscar recuperação contra o passageiro.

**Entendimento administrativo atual:**
A perda é despesa da KAVIAR. Valores recuperados são receita ou redução da despesa. O motorista não é debitado.

**Confirmação necessária do contador:**
Perdas por MED/chargeback devem ser reconhecidas como despesa no momento do bloqueio, no momento da confirmação da perda, ou apenas quando encerrado o processo? Recuperações posteriores são receita ou estorno?

**Opções ou tratamentos possíveis:**

* A — Despesa na confirmação da perda; recuperação como estorno (redução da despesa)
* B — Despesa na confirmação da perda; recuperação como receita eventual
* C — Provisão no bloqueio; despesa na confirmação; estorno na recuperação
* D — Outro

**Resposta do contador:**
`________________________`

**Fundamento ou observação:**
`________________________`

**Documento necessário:**
`________________________`

---

### Pergunta C-13 — Ajustes e valores contestados do gestor

**Situação da KAVIAR:**
Em situações de fraude, dolo ou erro operacional comprovado, a KAVIAR pode descontar valores do gestor. O gestor tem 15 dias para contestar. Valores contestados ficam separados até decisão final.

**Entendimento administrativo atual:**
Valores não contestados reduzem o passivo normalmente. Valores contestados permanecem identificados separadamente.

**Confirmação necessária do contador:**
Valores contestados em disputa devem ser mantidos no passivo original, transferidos para conta de contingência, ou segregados em subconta? Como registrar a decisão final?

**Opções ou tratamentos possíveis:**

* A — Mantém no passivo original com marca de disputa
* B — Transfere para conta de contingência passiva
* C — Subconta separada dentro do passivo com gestor
* D — Outro

**Resposta do contador:**
`________________________`

**Fundamento ou observação:**
`________________________`

**Documento necessário:**
`________________________`

---

### Pergunta C-14 — NFS-e: emissão, código de serviço e município

**Situação da KAVIAR:**
A KAVIAR cobra taxa de intermediação de transporte. Precisa confirmar se já emite NFS-e, qual sistema utiliza, qual código de serviço e qual município é responsável.

**Entendimento administrativo atual:**
Ainda não confirmado se a KAVIAR já emite NFS-e. Operação em mais de um município.

**Confirmação necessária do contador:**
A KAVIAR já emite NFS-e? Se sim: qual sistema, qual código de serviço, qual município? Se não: quais são as obrigações imediatas? O ISS é recolhido pelo DAS (Simples) ou separadamente?

**Informações necessárias:**

* Regime tributário atual da KAVIAR (Simples Nacional? Lucro presumido? Real?)
* CNPJ e inscrição municipal
* Sistema de emissão de NFS-e
* Código de serviço utilizado
* Município de emissão
* Se há retenção na fonte

**Resposta do contador:**
`________________________`

**Fundamento ou observação:**
`________________________`

**Documento necessário:**
`________________________`

---

### Pergunta C-15 — ISS: base de cálculo e município competente

**Situação da KAVIAR:**
A KAVIAR opera em múltiplos municípios. A sede pode estar em um município e as corridas ocorrem em outros.

**Entendimento administrativo atual:**
O Simples Nacional não elimina automaticamente a obrigação de ISS, NFS-e ou inscrição municipal. A KAVIAR precisa confirmar o município competente.

**Confirmação necessária do contador:**
O ISS incide sobre o valor bruto da corrida ou sobre a taxa de 18%? Qual o município competente para recolhimento (sede, local da corrida, estabelecimento prestador)? Há necessidade de inscrição em múltiplos municípios?

**Opções ou tratamentos possíveis:**

* A — ISS sobre 18% (taxa de intermediação), recolhido na sede
* B — ISS sobre 18%, recolhido no local da prestação
* C — ISS sobre valor bruto, recolhido na sede
* D — ISS incluído no DAS (Simples Nacional) sem separação
* E — Outro

**Resposta do contador:**
`________________________`

**Fundamento ou observação:**
`________________________`

**Documento necessário:**
`________________________`

---

### Pergunta C-16 — CBS e IBS em 2026 (período de teste)

**Situação da KAVIAR:**
Em 2026, entram em teste a CBS (0,9%) e o IBS (0,1%), totalizando 1% informativo. A KAVIAR precisa verificar se seus documentos fiscais já contemplam os campos necessários.

**Entendimento administrativo atual:**
A administração criou uma pendência urgente de verificação. Não foram criados lançamentos automáticos nem contas a pagar.

**Confirmação necessária do contador:**
A KAVIAR precisa incluir CBS e IBS nos documentos fiscais emitidos em 2026? Há obrigação acessória de teste? O sistema de NFS-e utilizado já contempla os campos? Se a KAVIAR estiver no Simples Nacional, qual o tratamento diferenciado?

**Informações necessárias:**

* Regime tributário atual
* Sistema de NFS-e (já tem campo CBS/IBS?)
* Obrigações acessórias aplicáveis em 2026
* Diferença de tratamento se Simples Nacional
* Prazo para adequação (agosto 2026?)

**Resposta do contador:**
`________________________`

**Fundamento ou observação:**
`________________________`

**Documento necessário:**
`________________________`

---

### Pergunta C-17 — PIS/Cofins: base e regime

**Situação da KAVIAR:**
A KAVIAR cobra taxa de intermediação de transporte. Precisa confirmar a incidência de PIS e Cofins.

**Entendimento administrativo atual:**
Não definido. Depende do regime tributário (cumulativo ou não cumulativo) e da base (bruto ou intermediação).

**Confirmação necessária do contador:**
PIS e Cofins incidem sobre o valor bruto das corridas ou apenas sobre a receita de intermediação (18%)? Qual o regime (cumulativo/não cumulativo)? Há créditos aproveitáveis?

**Opções ou tratamentos possíveis:**

* A — Regime cumulativo sobre 18% (Simples ou presumido)
* B — Regime não cumulativo sobre 18% com créditos
* C — Incidência sobre valor bruto
* D — Outro

**Resposta do contador:**
`________________________`

**Fundamento ou observação:**
`________________________`

**Documento necessário:**
`________________________`

---

### Pergunta C-18 — INSS sobre pagamentos a motoristas e gestores

**Situação da KAVIAR:**
A KAVIAR paga motoristas (82% da corrida) e gestores (40% da taxa). Motoristas podem ser PF, MEI ou PJ. Gestores podem ser PF ou PJ.

**Entendimento administrativo atual:**
Não foi presumida ausência de INSS. A análise depende do tipo de motorista/gestor e da natureza da relação.

**Confirmação necessária do contador:**
Existe obrigação de retenção ou contribuição patronal de INSS nos pagamentos a motoristas e/ou gestores? Diferenciar por tipo: PF, contribuinte individual, MEI, PJ.

**Informações necessárias:**

| Tipo | Relação | INSS retido? | INSS patronal? |
|------|---------|--------------|----------------|
| Motorista PF | Intermediação | ? | ? |
| Motorista MEI | Intermediação | ? | ? |
| Motorista PJ | Intermediação | ? | ? |
| Gestor PF | Contrato | ? | ? |
| Gestor PJ | Contrato | ? | ? |

**Resposta do contador:**
`________________________`

**Fundamento ou observação:**
`________________________`

**Documento necessário:**
`________________________`

---

### Pergunta C-19 — IRRF sobre pagamentos a gestores e parceiros

**Situação da KAVIAR:**
A KAVIAR paga gestores mensalmente e parceiros conforme contrato. Podem ser PF ou PJ.

**Entendimento administrativo atual:**
Não foi presumida ausência de IRRF. Depende da natureza jurídica do beneficiário e do tipo de serviço prestado.

**Confirmação necessária do contador (escopo contábil e tributário):**
Considerando que gestores e parceiros prestam serviços à KAVIAR (intermediação territorial e captação comercial), há obrigação de retenção de IRRF nos pagamentos mensais? Qual alíquota aplicável por tipo de beneficiário?

**Opções ou tratamentos possíveis:**

* A — Gestor PF: retenção pela tabela progressiva; PJ: retenção conforme art. 647 RIR
* B — Retenção de 1,5% sobre serviços (PJ)
* C — Sem retenção (serviço específico dispensado)
* D — Depende do valor mínimo mensal
* E — Outro

**Nota:** A definição da natureza jurídica do vínculo (se é prestação de serviço, representação comercial ou outra modalidade) depende de análise contratual separada (`LEGAL_CONFIRMATION`). Solicita-se aqui apenas a orientação tributária sobre retenção, assumindo que se trata de prestação de serviço.

**Resposta do contador:**
`________________________`

**Fundamento ou observação:**
`________________________`

**Documento necessário:**
`________________________`

---

### Pergunta C-20 — Plano de contas necessário

**Situação da KAVIAR:**
A KAVIAR possui um blueprint com 37 contas/categorias propostas. 16 estão prontas tecnicamente, 15 aguardam validação contábil, 4 aguardam validação jurídica, 1 está bloqueada (3301).

**Entendimento administrativo atual:**
Nenhuma conta será criada nem lançamento realizado sem a validação do contador.

**Confirmação necessária do contador:**
O contador pode revisar o blueprint proposto e indicar quais contas estão corretas, quais precisam de ajuste e quais devem ser eliminadas ou adicionadas?

**Informações disponíveis para revisão:**

- Blueprint de 37 contas com tipo, nome e classificação proposta
- Separação entre contas de lançamento (posting accounts) e categorias (hierarchy)
- Centros de custo propostos (corporativo, cidade, território)
- Documento interno: `docs/finance/phase-3c-2d-account-blueprint.md`

**Resposta do contador:**
`________________________`

**Fundamento ou observação:**
`________________________`

**Documento necessário:**
`________________________`

---

### Pergunta C-21 — Conciliação: wallet, gateway, banco e razão

**Situação da KAVIAR:**
A KAVIAR possui: wallet (subledger por motorista), gateway SumUp (extrato), conta bancária e razão contábil. Esses quatro devem estar conciliados.

**Entendimento administrativo atual:**
A conciliação é necessária mas o processo ainda não foi implementado. A wallet é subledger que detalha o passivo coletivo.

**Confirmação necessária do contador:**
Qual o processo de conciliação recomendado? Quais relatórios mensais o sistema deve gerar? Qual a tolerância aceitável? Quais divergências devem ser escaladas?

**Informações necessárias:**

* Periodicidade da conciliação (diária/semanal/mensal)
* Relatórios necessários
* Formato esperado
* Tolerância
* Procedimento para divergências

**Resposta do contador:**
`________________________`

**Fundamento ou observação:**
`________________________`

**Documento necessário:**
`________________________`

---

### Pergunta C-22 — Documentos e relatórios mensais para a contabilidade

**Situação da KAVIAR:**
A KAVIAR precisa definir quais documentos e relatórios enviar mensalmente à contabilidade.

**Entendimento administrativo atual:**
Não definido. O sistema pode gerar relatórios automatizados, mas precisa saber o formato e o conteúdo esperado.

**Confirmação necessária do contador:**
Quais documentos e relatórios mensais a KAVIAR deve enviar para que a contabilidade possa realizar a escrituração, apuração de impostos e conciliação?

**Sugestões para validação:**

* Relatório de corridas concluídas por período
* Relatório de recargas recebidas (Pix confirmados)
* Relatório de pagamentos a motoristas
* Relatório de comissões de gestores
* Extrato bancário
* Extrato do gateway (SumUp)
* Relatório de bônus adquiridos
* Relatório de reembolsos
* Relatório de cancelamentos e compensações
* Relatório de chargebacks/MED
* Conciliação wallet vs. banco

**Resposta do contador:**
`________________________`

**Fundamento ou observação:**
`________________________`

**Documento necessário:**
`________________________`

---

## Correspondência entre perguntas e decisões

| Pergunta | Decisão(ões) relacionada(s) | Assunto |
|----------|----------------------------|---------|
| C-01 | FIN-2B-10 | Receita como agente ou principal |
| C-02 | FIN-2B-02, FIN-2B-10 | Separação motorista vs. KAVIAR |
| C-03 | FIN-2B-03, FIN-2B-13, FIN-2B-14 | Obrigação com gestor |
| C-04 | FIN-2B-08, FIN-2B-25 (OP-01) | Comissão de parceiro |
| C-05 | FIN-2B-12, OP-03 | Saldo comprado como passivo |
| C-06 | OP-03 | Créditos que não expiram |
| C-07 | FIN-2B-02, OP-05 | Reembolso |
| C-08 | FIN-2B-11 (3301 bloqueada) | Bônus anual — natureza |
| C-09 | FIN-2B-11 (3301 bloqueada) | Bônus — transporte entre exercícios |
| C-10 | FIN-2B-11 | Compensação de cancelamento |
| C-11 | FIN-2B-09 (4103) | Custo de gateway |
| C-12 | FIN-2B-01, FIN-2B-09 | MED e chargeback |
| C-13 | FIN-2B-04 | Ajustes do gestor |
| C-14 | FIN-2B-05, FIN-2B-15 | NFS-e e ISS |
| C-15 | FIN-2B-05, FIN-2B-15 | ISS município |
| C-16 | VERIFY_2026_IBS_CBS | CBS e IBS 2026 |
| C-17 | FIN-2B-07 | PIS/Cofins |
| C-18 | FIN-2B-06 | INSS |
| C-19 | FIN-2B-17 (parcial) | IRRF |
| C-20 | FIN-2B-01 a FIN-2B-15 | Plano de contas |
| C-21 | Operacional | Conciliação |
| C-22 | Operacional | Relatórios mensais |

---

## Observações finais

1. Nenhum lançamento definitivo foi realizado.
2. Nenhuma conta foi criada em produção.
3. A conta 3301 (Revenue Deduction - Driver Earned Bonus) permanece bloqueada até decisão do contador.
4. A wallet é tratada como subledger operacional, não como conta contábil do razão.
5. Todas as classificações tributárias aqui apresentadas são hipóteses pendentes de confirmação.
6. A KAVIAR disponibilizará os documentos e dados necessários para a análise.
