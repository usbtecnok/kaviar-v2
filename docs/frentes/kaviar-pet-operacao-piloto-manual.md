# KAVIAR Pet — Operação Piloto Manual

**Versão:** v1.0  
**Data:** Maio/2026  
**Status:** Pronto para execução  
**Responsável:** Operadora Central KAVIAR Pet

---

## 1. Google Forms — Pré-Cadastro de Motorista

### Título
```
KAVIAR Pet — Pré-Cadastro de Motorista
```

### Descrição
```
Formulário de interesse para se tornar Motorista Certificado KAVIAR Pet.

O KAVIAR Pet é uma operação especializada de transporte de animais de estimação
com motoristas treinados e certificados.

Após o pré-cadastro, você será contatado via WhatsApp para iniciar o processo
de homologação, que inclui:
1. Treinamento (vídeos obrigatórios)
2. Questionário de certificação (nota mínima 70%)
3. Envio de fotos do veículo preparado

Preencha com atenção — todos os campos são obrigatórios.
```

### Perguntas

| # | Pergunta | Tipo | Obrigatório |
|---|----------|------|:-----------:|
| 1 | Nome completo | Texto curto | ✅ |
| 2 | WhatsApp (com DDD) | Texto curto | ✅ |
| 3 | E-mail | E-mail | ✅ |
| 4 | CPF | Texto curto | ✅ |
| 5 | Cidade / Região de atuação | Texto curto | ✅ |
| 6 | Modelo do veículo | Texto curto | ✅ |
| 7 | Ano do veículo | Texto curto | ✅ |
| 8 | Seu veículo é 4 portas com banco traseiro adequado para transporte de pets? | Sim / Não | ✅ |
| 9 | Já transportou animais profissionalmente? | Sim / Não | ✅ |
| 10 | Tem disponibilidade para corridas nos próximos 7 dias? | Sim / Não | ✅ |
| 11 | Como conheceu o KAVIAR Pet? | Múltipla escolha: Landing page / WhatsApp / Indicação / Instagram / Outro | ✅ |

### Texto final (após envio)
```
✅ Pré-cadastro recebido!

Você será contatado via WhatsApp em até 48h pela Central KAVIAR Pet
para iniciar o processo de homologação.

Enquanto isso, prepare:
• Capa protetora impermeável para banco traseiro
• Kit de higienização (spray desinfetante, panos, sacos plásticos)
• Veículo limpo e com ar-condicionado funcionando

Dúvidas? Fale com a Central via WhatsApp: [NÚMERO]

— Equipe KAVIAR Pet
```

### Instruções para criar no Google Forms

1. Criar formulário: "KAVIAR Pet — Pré-Cadastro de Motorista"
2. Configurações → Coletar e-mail → Ativar
3. Configurações → Limitar a 1 resposta por e-mail
4. Adicionar perguntas conforme tabela acima
5. Marcar todas como obrigatórias
6. Configurar notificação por e-mail para novos envios
7. Vincular a Google Sheets (aba "Pré-cadastros")

---

## 2. Google Forms — Questionário de Certificação

### Título
```
KAVIAR Pet — Questionário de Homologação
```

### Descrição
```
Questionário obrigatório para certificação como Motorista KAVIAR Pet.

Responda com base no treinamento (Vídeo 1 e Vídeo 2).
Nota mínima: 70% (7 de 10 acertos).
Você tem 2 tentativas. Se reprovar, reassista os vídeos e tente novamente em 24h.
```

### Configuração do Forms

| Configuração | Valor |
|--------------|-------|
| Transformar em teste | ✅ Ativado |
| Mostrar nota após envio | ✅ |
| Coletar e-mail | ✅ |
| Limitar a 1 resposta | ❌ (permitir 2 tentativas) |
| Pontuação por pergunta | 1 ponto |
| Total | 10 pontos |
| Nota mínima | 7/10 (70%) |

### Perguntas (versão curta — 10 perguntas para piloto)

| # | Pergunta | Resposta correta |
|---|----------|:----------------:|
| 1 | Antes de aceitar uma corrida pet, o que deve estar instalado no banco traseiro? | B — Capa protetora impermeável, bem presa e sem folgas |
| 2 | Como gatos devem ser transportados no KAVIAR Pet? | C — Obrigatoriamente em caixa de transporte (responsabilidade do tutor) |
| 3 | O que é obrigatório fazer ao chegar no local de embarque, antes de iniciar a corrida? | B — Enviar foto do pet à Central + confirmar checklist de chegada |
| 4 | Sobre janelas durante a corrida pet: | B — Devem ficar fechadas ou com abertura mínima — pet não pode colocar cabeça para fora |
| 5 | Se o tutor informou 1 pet pequeno e aparecem 2 pets grandes, você deve: | B — Não iniciar a corrida e acionar a Central para validação |
| 6 | Se você perceber que o animal é agressivo e o tutor se recusar a colocar focinheira: | B — Acionar a Central KAVIAR Pet — não se expor ao risco |
| 7 | Após cada corrida pet, o que é obrigatório? | C — Higienização simples: retirar pelos, borrifar desinfetante, passar pano |
| 8 | Quem é responsável pelo animal durante a corrida? | C — O tutor/passageiro |
| 9 | Se o animal vomitar durante a corrida, como proceder com a cobrança? | B — Tirar fotos e enviar à Central — a Central avalia e cobra se necessário |
| 10 | Em caso de dúvida sobre uma situação durante a corrida pet, você deve: | B — Acionar a Central KAVIAR Pet antes de tomar decisão |

### Gabarito rápido

```
1-B  2-C  3-B  4-B  5-B  6-B  7-C  8-C  9-B  10-B
```

### Texto final — APROVADO
```
✅ Parabéns! Você foi aprovado no questionário KAVIAR Pet.

Próximo passo: envie as fotos do veículo preparado para a Central via WhatsApp.

Fotos obrigatórias:
1. Capa protetora instalada no banco traseiro
2. Kit visível no veículo (spray, panos, sacos)
3. Banco traseiro preparado (visão geral)

Após aprovação das fotos, seu selo será ativado.

— Equipe KAVIAR Pet
```

### Texto final — REPROVADO
```
❌ Sua nota ficou abaixo de 70%.

Recomendamos reassistir os vídeos de treinamento antes de tentar novamente.
Você pode refazer o questionário em 24 horas.

Vídeo 1: [LINK]
Vídeo 2: [LINK]

Se tiver dúvidas, fale com a Central KAVIAR Pet via WhatsApp.

— Equipe KAVIAR Pet
```

### Regras de repetição

| Situação | Ação |
|----------|------|
| Reprovado 1ª vez | Pode refazer em 24h |
| Reprovado 2ª vez | Reassistir vídeos + aguardar 7 dias |
| Aprovado | Segue para etapa de fotos |

---

## 3. Google Sheets — Central KAVIAR Pet

### Estrutura do arquivo

**Nome:** `KAVIAR Pet — Central Operacional (Piloto)`

---

### Aba 1: Pré-cadastros

| Coluna | Descrição |
|--------|-----------|
| A — Data | Data do pré-cadastro |
| B — Nome | Nome completo |
| C — WhatsApp | Número com DDD |
| D — E-mail | E-mail do motorista |
| E — CPF | CPF |
| F — Cidade | Cidade/região |
| G — Veículo | Modelo do veículo |
| H — Ano | Ano do veículo |
| I — 4 portas | Sim/Não |
| J — Experiência pet | Sim/Não |
| K — Disponibilidade 7d | Sim/Não |
| L — Origem | Como conheceu |
| M — Status | Novo / Contatado / Em treinamento / Desistiu |
| N — Responsável | Quem contatou |
| O — Observações | Notas livres |

**Status possíveis:** `Novo` (amarelo) → `Contatado` (azul) → `Em treinamento` (laranja) → `Desistiu` (cinza)  
**Responsável por preencher:** Operadora Central  

---

### Aba 2: Homologação

| Coluna | Descrição |
|--------|-----------|
| A — Nome | Nome do motorista |
| B — WhatsApp | Número |
| C — Vídeos enviados | Data de envio |
| D — Vídeos assistidos | Sim/Não (confirmação do motorista) |
| E — Questionário 1ª tentativa | Data + Nota |
| F — Questionário 2ª tentativa | Data + Nota (se aplicável) |
| G — Status questionário | Aprovado / Reprovado / Pendente |
| H — Fotos enviadas | Data |
| I — Fotos aprovadas | Sim/Não |
| J — Status geral | Em andamento / Aprovado / Reprovado / Aguardando |
| K — Data aprovação | Data final |
| L — Observações | Notas |

**Status possíveis:** `Pendente` (amarelo) → `Em andamento` (azul) → `Aprovado` (verde) → `Reprovado` (vermelho) → `Aguardando` (laranja)  
**Responsável por preencher:** Operadora Central  

---

### Aba 3: Pagamentos

| Coluna | Descrição |
|--------|-----------|
| A — Data corrida | Data da corrida |
| B — Motorista | Nome |
| C — Corrida ID | Identificador (manual ou sistema) |
| D — Valor total | Valor cobrado do passageiro |
| E — Comissão motorista | Valor do motorista |
| F — Taxa KAVIAR | Valor retido |
| G — Método pagamento | Pix / Cartão / Dinheiro |
| H — Status | Pendente / Pago / Estornado |
| I — Data pagamento | Data do repasse |
| J — Comprovante | Link ou referência |
| K — Observações | Notas |

**Status possíveis:** `Pendente` (amarelo) → `Pago` (verde) → `Estornado` (vermelho)  
**Responsável por preencher:** Operadora Central / Financeiro  

---

### Aba 4: Treinamento

| Coluna | Descrição |
|--------|-----------|
| A — Nome | Nome do motorista |
| B — WhatsApp | Número |
| C — Data envio vídeos | Quando foram enviados |
| D — Vídeo 1 assistido | Sim/Não + Data confirmação |
| E — Vídeo 2 assistido | Sim/Não + Data confirmação |
| F — Dúvidas | Perguntas feitas pelo motorista |
| G — Status | Pendente / Em andamento / Concluído |
| H — Observações | Notas |

**Status possíveis:** `Pendente` (amarelo) → `Em andamento` (azul) → `Concluído` (verde)  
**Responsável por preencher:** Operadora Central  

---

### Aba 5: Fotos

| Coluna | Descrição |
|--------|-----------|
| A — Nome | Nome do motorista |
| B — Data envio | Data que enviou fotos |
| C — Foto capa protetora | ✅/❌ + link |
| D — Foto kit higienização | ✅/❌ + link |
| E — Foto banco traseiro | ✅/❌ + link |
| F — Status | Pendente / Aprovado / Reprovado / Reenviar |
| G — Motivo reprovação | Se aplicável |
| H — Data aprovação | Data |
| I — Observações | Notas |

**Status possíveis:** `Pendente` (amarelo) → `Aprovado` (verde) → `Reprovado` (vermelho) → `Reenviar` (laranja)  
**Responsável por preencher:** Operadora Central  

---

### Aba 6: Motoristas Aprovados

| Coluna | Descrição |
|--------|-----------|
| A — Nome | Nome completo |
| B — WhatsApp | Número |
| C — CPF | CPF |
| D — Veículo | Modelo + Ano |
| E — Placa | Placa do veículo |
| F — Data aprovação | Data da homologação |
| G — Selo | Ativo / Suspenso / Revogado |
| H — Corridas realizadas | Contador |
| I — Avaliação média | Nota média |
| J — Última corrida | Data |
| K — Observações | Notas |

**Status possíveis:** `Ativo` (verde) → `Suspenso` (laranja) → `Revogado` (vermelho)  
**Responsável por preencher:** Operadora Central  

---

### Aba 7: Corridas Piloto

| Coluna | Descrição |
|--------|-----------|
| A — Data | Data/hora da corrida |
| B — Motorista | Nome |
| C — Passageiro | Nome do tutor |
| D — Pet | Tipo + porte + nome |
| E — Origem | Endereço de embarque |
| F — Destino | Endereço de desembarque |
| G — Valor | Valor cobrado |
| H — Pagamento | Pix / Cartão / Dinheiro |
| I — Foto embarque | Sim/Não |
| J — Incidente | Sim/Não |
| K — Avaliação tutor | 1-5 |
| L — Status | Concluída / Cancelada / Incidente |
| M — Observações | Notas |

**Status possíveis:** `Concluída` (verde) → `Cancelada` (cinza) → `Incidente` (vermelho)  
**Responsável por preencher:** Operadora Central  

---

### Aba 8: Incidentes

| Coluna | Descrição |
|--------|-----------|
| A — Data | Data do incidente |
| B — Corrida ref | Referência da corrida |
| C — Motorista | Nome |
| D — Tipo | Sujeira / Agressão / Divergência / Acidente / Outro |
| E — Descrição | Relato do ocorrido |
| F — Fotos | Links das fotos |
| G — Ação tomada | O que foi feito |
| H — Cobrança | Sim/Não + valor |
| I — Status | Aberto / Resolvido / Pendente |
| J — Responsável | Quem tratou |
| K — Data resolução | Data |

**Status possíveis:** `Aberto` (vermelho) → `Pendente` (amarelo) → `Resolvido` (verde)  
**Responsável por preencher:** Operadora Central  

---

### Aba 9: Financeiro

| Coluna | Descrição |
|--------|-----------|
| A — Mês | Mês de referência |
| B — Total corridas | Quantidade |
| C — Receita bruta | Valor total cobrado |
| D — Repasse motoristas | Total pago aos motoristas |
| E — Receita KAVIAR | Taxa retida |
| F — Estornos | Valor estornado |
| G — Receita líquida | Receita final |
| H — Custos operacionais | Custos do período |
| I — Resultado | Lucro/prejuízo |
| J — Observações | Notas |

**Responsável por preencher:** Financeiro / Operadora Central  

---

## 4. Fluxo Manual da Operadora

### Passo a passo — Homologação de motorista

```
┌─────────────────────────────────────────────────────────┐
│  FLUXO DE HOMOLOGAÇÃO — OPERADORA CENTRAL KAVIAR PET    │
└─────────────────────────────────────────────────────────┘

1. RECEBE INTERESSADO
   • Notificação de novo pré-cadastro (Google Forms → e-mail)
   • Registrar na aba "Pré-cadastros" (status: Novo)

2. CONFERE DADOS
   • Verificar: veículo 4 portas, WhatsApp válido, cidade atendida
   • Se dados incompletos → contatar para complementar
   • Se veículo inadequado → informar requisitos e encerrar

3. PRIMEIRO CONTATO (WhatsApp)
   • Enviar mensagem de boas-vindas
   • Explicar etapas do processo
   • Atualizar status: Contatado

4. ENVIA VÍDEOS DE TREINAMENTO
   • Enviar links dos Vídeos 1 e 2
   • Orientar: "Assista com atenção, o questionário é baseado neles"
   • Registrar na aba "Treinamento"
   • Atualizar status: Em treinamento

5. CONFIRMA QUE ASSISTIU
   • Aguardar confirmação do motorista (mensagem no WhatsApp)
   • Registrar data de confirmação

6. ENVIA QUESTIONÁRIO
   • Enviar link do Google Forms de certificação
   • Orientar: nota mínima 7/10, 2 tentativas, 24h entre tentativas

7. CONFERE NOTA
   • Verificar resultado no Google Sheets vinculado ao Forms
   • Se aprovado (≥7/10) → seguir para fotos
   • Se reprovado 1ª vez → orientar reassistir + tentar em 24h
   • Se reprovado 2ª vez → orientar aguardar 7 dias
   • Registrar na aba "Homologação"

8. SOLICITA FOTOS
   • Enviar mensagem pedindo 3 fotos obrigatórias:
     - Capa protetora instalada
     - Kit de higienização visível
     - Banco traseiro preparado (visão geral)

9. VALIDA KIT
   • Analisar fotos recebidas
   • Verificar: capa bem instalada, kit completo, veículo limpo
   • Se OK → aprovar
   • Se insuficiente → pedir reenvio com orientação específica
   • Registrar na aba "Fotos"

10. APROVA / REPROVA
    • Se tudo OK: marcar como APROVADO
    • Registrar na aba "Motoristas Aprovados"
    • Enviar mensagem de aprovação + selo

11. EMITE SELO
    • Confirmar selo ativo via WhatsApp
    • Orientar sobre primeiras corridas
    • Adicionar ao grupo de motoristas (se houver)

12. REGISTRA NA PLANILHA
    • Atualizar todas as abas relevantes
    • Garantir que "Motoristas Aprovados" está atualizado
    • Status final: Ativo
```

### Tempo estimado por etapa

| Etapa | Tempo operadora | Tempo motorista |
|-------|:--------------:|:--------------:|
| Conferir dados | 2 min | — |
| Primeiro contato | 3 min | — |
| Enviar vídeos | 2 min | 30-45 min (assistir) |
| Enviar questionário | 1 min | 10-15 min |
| Conferir nota | 2 min | — |
| Solicitar fotos | 2 min | 10-20 min (preparar + tirar) |
| Validar kit | 5 min | — |
| Aprovar + selo | 3 min | — |
| **Total operadora** | **~20 min** | — |
| **Total motorista** | — | **~1-2h (espalhado)** |

---

## 5. Mensagens WhatsApp Prontas

### 5.1 — Primeiro contato

```
Olá, [NOME]! 👋

Aqui é a Central KAVIAR Pet.

Recebemos seu pré-cadastro para se tornar Motorista Certificado KAVIAR Pet. 🐾🚗

O KAVIAR Pet é uma operação especializada de transporte de animais de estimação — com treinamento, certificação e acompanhamento da Central em todas as corridas.

Para ser homologado, você vai passar por 3 etapas:

1️⃣ Treinamento — 2 vídeos curtos (total ~15 min)
2️⃣ Questionário — 10 perguntas, nota mínima 70%
3️⃣ Fotos do veículo — capa protetora + kit instalados

Vamos começar? Posso enviar os vídeos agora?
```

---

### 5.2 — Envio dos vídeos

```
Perfeito! Aqui estão os vídeos de treinamento KAVIAR Pet: 🎬

📹 Vídeo 1 — Protocolo operacional:
[LINK VÍDEO 1]

📹 Vídeo 2 — Situações práticas:
[LINK VÍDEO 2]

⚠️ Importante:
• Assista os dois com atenção
• O questionário é 100% baseado neles
• Não precisa decorar — é sobre entender o protocolo

Quando terminar de assistir, me avisa aqui que eu envio o questionário. 👍
```

---

### 5.3 — Envio do questionário

```
Ótimo! Agora vamos para o questionário de certificação: 📝

🔗 Link: [LINK DO GOOGLE FORMS]

📋 Regras:
• 10 perguntas de múltipla escolha
• Nota mínima: 7/10 (70%)
• Você tem 2 tentativas
• Se não passar de primeira, pode refazer em 24h

Dica: se tiver dúvida em alguma pergunta, lembre do que viu nos vídeos. Todas as respostas estão lá.

Boa sorte! 🍀 Me avisa quando terminar.
```

---

### 5.4 — Pedido de fotos

```
Parabéns pela aprovação no questionário! ✅🎉

Agora falta a última etapa: fotos do veículo preparado.

📸 Envie 3 fotos:

1. Capa protetora instalada no banco traseiro (bem presa, sem folgas)
2. Kit de higienização visível no veículo (spray, panos, sacos)
3. Banco traseiro preparado — visão geral

💡 Dicas:
• Tire com boa iluminação
• Mostre que a capa cobre todo o banco
• O kit pode estar no porta-malas ou bolso do banco

Pode enviar aqui mesmo no WhatsApp. 📲
```

---

### 5.5 — Aprovado

```
🎉 Parabéns, [NOME]! Você foi APROVADO como Motorista Certificado KAVIAR Pet! 🐾✅

Seu selo está ativo a partir de agora.

O que isso significa:
• Você está habilitado para corridas KAVIAR Pet
• A Central acompanha todas as corridas
• Em caso de dúvida durante uma corrida, acione a Central

📋 Lembrete rápido:
• Capa protetora SEMPRE antes de embarcar o pet
• Foto do pet embarcado → enviar à Central
• Higienização simples após cada corrida
• Janelas fechadas ou abertura mínima

Bem-vindo à equipe! 🚗🐕

Em breve você receberá sua primeira corrida piloto.
```

---

### 5.6 — Reprovado

```
[NOME], sua nota no questionário ficou abaixo de 70%. 😕

Não se preocupe — você pode tentar novamente em 24 horas.

📌 Recomendação:
Reassista os vídeos antes de refazer:

📹 Vídeo 1: [LINK]
📹 Vídeo 2: [LINK]

Foque nos pontos:
• Capa protetora e kit
• Responsabilidade do tutor vs motorista
• Quando acionar a Central
• Procedimento com gatos e divergências

Amanhã eu envio o link novamente. Qualquer dúvida, estou aqui. 👍
```

---

### 5.7 — Pendência de kit

```
[NOME], analisei suas fotos e preciso de um ajuste: ⚠️

[ESCOLHER O APLICÁVEL:]

❌ Capa protetora: precisa cobrir TODO o banco, sem folgas nas laterais.
❌ Kit incompleto: não vi o spray desinfetante / panos / sacos plásticos.
❌ Foto não está clara: tire novamente com melhor iluminação.

📸 Envie novas fotos quando ajustar. Sem pressa — mas preciso validar antes de ativar o selo.

Dúvidas sobre o kit? Me pergunta aqui. 👍
```

---

### 5.8 — Selo liberado

```
✅ Selo KAVIAR Pet ATIVADO! 🐾🏅

[NOME], seu veículo foi aprovado na inspeção visual.

Você agora é oficialmente um Motorista Certificado KAVIAR Pet.

🔑 Resumo do seu status:
• Selo: ATIVO
• Certificação: APROVADA
• Pronto para corridas: SIM

Aguarde o convite para sua primeira corrida piloto. Será acompanhada pela Central do início ao fim.

Bem-vindo! 🚗🐕🐈
```

---

### 5.9 — Convite para primeira corrida piloto

```
[NOME], temos sua primeira corrida piloto! 🚗🐾

📋 Detalhes:
• Tutor: [NOME DO TUTOR]
• Pet: [TIPO + PORTE + NOME]
• Embarque: [ENDEREÇO]
• Destino: [ENDEREÇO]
• Horário: [HORÁRIO]
• Valor: [VALOR]

📌 Checklist antes de sair:
☐ Capa protetora instalada
☐ Kit de higienização no carro
☐ Ar-condicionado funcionando
☐ WhatsApp da Central aberto

🔔 Durante a corrida:
1. Ao chegar → foto do pet embarcado → enviar aqui
2. Qualquer divergência → acionar Central ANTES de decidir
3. Ao finalizar → higienização + confirmar conclusão aqui

Pode confirmar que aceita? 👍
```

---

## Notas operacionais

- Todo o fluxo é manual via WhatsApp + Google Sheets durante o piloto
- Não há integração com backend/app nesta fase
- A operadora é o ponto central de controle
- Escalar para sistema automatizado após validar o fluxo com 5-10 motoristas
- Manter registro de tempo gasto por homologação para dimensionar equipe futura

---

*KAVIAR Pet — Operação Piloto Manual v1.0 — Maio/2026*
