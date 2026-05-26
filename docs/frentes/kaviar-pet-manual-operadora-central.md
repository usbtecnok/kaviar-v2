# Manual Prático — Operadora da Central KAVIAR Pet

> Documento de treinamento e referência diária para a operadora responsável pela Central KAVIAR Pet.
> Versão 1.0 — Fase 1 (piloto).

---

## 1. Papel da Operadora

A operadora da Central KAVIAR Pet é o ponto de contato entre motoristas, tutores e a plataforma durante toda a operação pet.

### Responsabilidades

| Área | O que faz |
|------|-----------|
| Atendimento motorista | Tira dúvidas, orienta sobre protocolo, acompanha homologação |
| Atendimento tutor | Confirma embarque, resolve divergências, registra reclamações |
| Acompanhamento de corrida | Monitora status, intervém se necessário |
| Validação de fotos | Aprova ou reprova fotos do kit/veículo |
| Divergência porte/quantidade | Verifica se o pet embarcado corresponde ao informado |
| Registro de incidentes | Documenta qualquer ocorrência na planilha |
| Orientação ao motorista | Relembra protocolo quando necessário |
| Escalação | Aciona supervisor ou SUPER_ADMIN para decisões sensíveis |

### O que a operadora NÃO faz

- Não cadastra a si mesma no sistema
- Não aprova/remove outros operadores
- Não altera configurações do sistema
- Não toma decisões de suspensão permanente (escala para SUPER_ADMIN)
- Não acessa dados financeiros ou de pagamento

---

## 2. Cadastro e Acesso da Operadora

### Premissa fundamental

> A operadora **não se cadastra sozinha**. Todo acesso é criado, liberado, suspenso ou removido exclusivamente pelo SUPER_ADMIN.

### Dados cadastrados pelo SUPER_ADMIN

| Campo | Obrigatório | Exemplo |
|-------|-------------|---------|
| Nome completo | ✓ | Maria Souza |
| Telefone | ✓ | (21) 99999-0000 |
| E-mail | ✓ | maria@kaviar.com.br |
| Função | ✓ | Operadora Central Pet |
| Status | ✓ | Ativo / Inativo |
| Região de atuação | ✓ | RJ — Zona Norte (piloto) |

### Permissões

- Acesso restrito ao módulo KAVIAR Pet
- Visualiza apenas dados necessários para operação pet
- Não vê dados financeiros, configurações globais ou outros módulos
- Ações sensíveis (suspensão, revogação de selo) exigem aprovação do supervisor/SUPER_ADMIN
- **Todas as ações ficam registradas** (log de auditoria)

### Ciclo de vida do acesso

```
SUPER_ADMIN cria conta → Operadora recebe credenciais → Acesso ativo
    → SUPER_ADMIN pode inativar a qualquer momento
    → Operadora desligada → SUPER_ADMIN remove acesso
```

---

## 3. Responsabilidades do SUPER_ADMIN

| Ação | Frequência |
|------|-----------|
| Cadastrar nova operadora | Sob demanda |
| Remover/inativar acesso | Sob demanda |
| Revisar log de auditoria | Semanal |
| Aprovar permissões especiais | Sob demanda |
| Definir região piloto | Início da operação |
| Validar quem pode operar a central | Antes de liberar acesso |
| Decidir suspensões permanentes | Quando escalado |
| Aprovar alterações no protocolo | Quando necessário |

---

## 4. Fluxo Completo da Homologação

### Passo a passo

| # | Etapa | Quem faz | Canal | Prazo |
|---|-------|----------|-------|-------|
| 1 | Receber motorista interessado | Operadora | WhatsApp | — |
| 2 | Enviar vídeos de treinamento (1 e 2) | Operadora | WhatsApp | Imediato |
| 3 | Aguardar conclusão dos vídeos | Motorista | — | Até 48h |
| 4 | Enviar link do questionário | Operadora | WhatsApp | Após confirmação |
| 5 | Conferir nota (mín. 7/10) | Operadora | Planilha | Imediato |
| 6 | Pedir fotos do veículo preparado | Operadora | WhatsApp | Após aprovação |
| 7 | Validar kit (capa, cinto, desinfetante) | Operadora | WhatsApp + Planilha | Até 24h |
| 8 | Aprovar selo KAVIAR Pet | Operadora | Sistema/Planilha | Imediato |
| 9 | Registrar motorista aprovado | Operadora | Planilha | Imediato |
| 10 | Comunicar motorista | Operadora | WhatsApp | Imediato |

### Critérios de reprovação

- Nota < 7/10 no questionário
- Fotos inadequadas (capa solta, cinto ausente, veículo sujo)
- Veículo incompatível (sem banco traseiro adequado)
- Motorista não responde em 72h → arquivar e recontatar depois

---

## 5. Checklist Diário da Central

### Antes da corrida (ao receber solicitação pet)

- [ ] Motorista tem selo ativo?
- [ ] Selo está dentro da validade?
- [ ] Motorista confirmou que capa está instalada?
- [ ] Tutor informou porte e tipo do pet?
- [ ] Há divergência entre o informado e o habitual?

### No embarque

- [ ] Motorista enviou foto do pet embarcado?
- [ ] Pet está com peitoral/guia ou em caixa de transporte?
- [ ] Porte/quantidade confere com o solicitado?
- [ ] Tutor confirmou embarque?

### Durante a corrida

- [ ] Motorista reportou alguma intercorrência?
- [ ] Corrida está dentro do tempo esperado?
- [ ] Tutor ou motorista acionou a central?

### Na finalização

- [ ] Motorista confirmou entrega segura do pet?
- [ ] Tutor confirmou recebimento?
- [ ] Houve alguma reclamação?

### Após higienização

- [ ] Motorista confirmou higienização realizada?
- [ ] Foto da higienização enviada (se solicitada)?
- [ ] Veículo liberado para próxima corrida?

---

## 6. Scripts WhatsApp Prontos

### 6.1 Boas-vindas

```
Olá, [NOME]! 👋

Bem-vindo(a) ao programa KAVIAR Pet!

Você foi indicado(a) para se tornar motorista certificado(a) para transporte de pets.

Vou te enviar o treinamento obrigatório. São 2 vídeos curtos (~10 min cada).

Depois dos vídeos, você responde um questionário rápido e envia fotos do seu veículo preparado.

Vamos começar? 🐾
```

### 6.2 Envio dos vídeos

```
Aqui estão os vídeos de treinamento:

📹 Vídeo 1 — Segurança e Condução de Pets
[LINK_VIDEO_1]

📹 Vídeo 2 — Protocolo e Atendimento
[LINK_VIDEO_2]

⚠️ Assista os dois até o final. O questionário cobra o conteúdo de ambos.

Me avise quando terminar! ✅
```

### 6.3 Envio do questionário

```
Ótimo! Agora responda o questionário:

📝 [LINK_QUESTIONARIO]

• 10 perguntas
• Nota mínima: 7/10
• Você tem até 3 tentativas

Boa sorte! 🍀
```

### 6.4 Pedido de fotos

```
Parabéns pela aprovação no questionário! ✅

Agora preciso de 4 fotos do seu veículo preparado:

1️⃣ Capa protetora instalada no banco traseiro
2️⃣ Cinto pet visível e funcional
3️⃣ Kit de higienização (desinfetante + pano)
4️⃣ Banco traseiro limpo, sem objetos soltos

📸 Envie aqui mesmo no WhatsApp.
Fotos claras, com boa iluminação.
```

### 6.5 Aprovação

```
🎉 Parabéns, [NOME]!

Você foi aprovado(a) como motorista certificado(a) KAVIAR Pet! 🐾✨

Seu selo está ativo. Validade: 6 meses.

A partir de agora você pode receber corridas pet pela plataforma.

Lembre-se:
• Capa SEMPRE antes da corrida
• Foto do pet no embarque
• Higienização após cada corrida

Qualquer dúvida, estou aqui. Boas corridas! 🚗🐕
```

### 6.6 Reprovação

```
Oi, [NOME].

Infelizmente sua nota no questionário ficou abaixo do mínimo (7/10).

Você pode tentar novamente em 24h.
Recomendo reassistir os vídeos antes.

Tentativas restantes: [X]/3

Se precisar de ajuda, estou aqui! 📚
```

### 6.7 Divergência no embarque

```
⚠️ [NOME], identificamos uma divergência:

O pet embarcado não corresponde ao informado pelo tutor.
• Informado: [PORTE/TIPO INFORMADO]
• Embarcado: [PORTE/TIPO REAL]

Por favor, confirme a situação e envie foto atualizada.

Se o porte for maior que o suportado, a corrida pode ser cancelada sem penalidade para você.
```

### 6.8 Incidente

```
🚨 [NOME], registramos um incidente na corrida [ID_CORRIDA]:

[DESCRIÇÃO DO INCIDENTE]

Ação necessária:
[AÇÃO SOLICITADA]

Prazo para resposta: 24h.

Se precisar de suporte, responda esta mensagem.
```

### 6.9 Cobrança extra (sujeira extraordinária)

```
[NOME], a corrida [ID_CORRIDA] gerou uma taxa de limpeza extraordinária.

Motivo: [MOTIVO]
Valor: R$ [VALOR]

Essa taxa será creditada automaticamente na sua próxima compensação.

Você NÃO precisa cobrar o tutor diretamente — a plataforma cuida disso.
```

### 6.10 Encerramento

```
[NOME], obrigada pelo contato! 🙏

Resumo:
• [RESUMO DA INTERAÇÃO]

Se precisar de algo mais, é só chamar.

Central KAVIAR Pet 🐾
```

---

## 7. Como Validar Fotos

### Critérios por tipo de foto

| Foto | Aprovar se... | Reprovar se... |
|------|---------------|----------------|
| **Peitoral/cinto** | Cinto visível, clip funcional, preso ao banco | Cinto solto, danificado, ausente |
| **Caixa do gato** | Caixa rígida, grade íntegra, tamanho adequado | Caixa quebrada, sem trava, muito pequena |
| **Capa protetora** | Cobre todo o banco, bem presa, sem folgas | Parcial, solta, rasgada, fina demais |
| **Kit no carro** | Desinfetante + pano visíveis e acessíveis | Ausente, vencido, inacessível |
| **Pet no embarque** | Pet com peitoral/guia ou em caixa, motorista visível | Pet solto, sem contenção, foto escura |
| **Higienização** | Banco limpo, sem pelos visíveis, pano/spray na foto | Banco sujo, pelos visíveis, sem evidência |

### Dicas de validação

- Foto escura ou borrada → pedir nova foto (não reprovar direto)
- Dúvida sobre material da capa → perguntar ao motorista
- Cinto de modelo diferente do padrão → aceitar se funcional
- Foto antiga (data no EXIF) → pedir foto atual

### Fluxo de reprovação de foto

```
Foto inadequada → Feedback específico ao motorista → Nova tentativa (até 3x)
    → 3 reprovações → Escalar para supervisor
```

---

## 8. Regras de Decisão da Central

### Quando AUTORIZAR

- Motorista com selo ativo + veículo preparado + pet dentro do porte informado
- Divergência leve de porte (ex: médio informado, médio-grande real) se motorista aceita
- Tutor com 2 pets pequenos (dentro do limite de 2 pets por corrida)

### Quando CANCELAR

- Pet sem contenção (sem peitoral, sem caixa) e tutor recusa providenciar
- Porte muito acima do informado (ex: informou pequeno, é grande)
- Motorista sem selo ativo
- Animal visivelmente agressivo sem focinheira

### Quando PEDIR AJUSTE

- Foto inadequada → pedir nova
- Capa mal instalada → orientar e pedir confirmação
- Kit incompleto → informar o que falta

### Quando SUSPENDER MOTORISTA

- Incidente grave com animal
- Veículo sem capa/cinto em corrida pet (flagrado)
- Reclamação grave de tutor (confirmada)
- Não renovação do selo no prazo

### Quando COBRAR TAXA EXTRAORDINÁRIA

- Sujeira que exige limpeza profissional (vômito, fezes no estofado)
- Dano ao veículo causado pelo pet (arranhões profundos)
- Motorista documenta com foto ANTES de limpar

### Quando ESCALAR para SUPER_ADMIN

- Suspensão permanente
- Recurso de motorista contra suspensão
- Incidente com lesão ao animal
- Dúvida sobre protocolo não coberta neste manual
- Conflito entre motorista e tutor sem resolução
- Qualquer situação que envolva risco legal

---

## 9. Treinamento da Operadora

### Roteiro de 1 dia (8h)

| Horário | Atividade | Duração |
|---------|-----------|---------|
| 09:00 | Apresentação do KAVIAR Pet e papel da operadora | 30min |
| 09:30 | Assistir Vídeo 1 + Vídeo 2 (como motorista) | 20min |
| 09:50 | Responder questionário (como motorista) | 15min |
| 10:05 | Intervalo | 15min |
| 10:20 | Leitura deste manual (seções 1-5) | 40min |
| 11:00 | Prática: validação de fotos (10 exemplos) | 30min |
| 11:30 | Prática: scripts WhatsApp (role-play) | 30min |
| 12:00 | Almoço | 60min |
| 13:00 | Leitura deste manual (seções 6-8) | 40min |
| 13:40 | Simulação: fluxo completo de homologação | 40min |
| 14:20 | Simulação: divergência no embarque | 20min |
| 14:40 | Simulação: incidente durante corrida | 20min |
| 15:00 | Intervalo | 15min |
| 15:15 | Planilha operacional: preenchimento prático | 30min |
| 15:45 | Regras de decisão: cenários e discussão | 30min |
| 16:15 | Dúvidas finais + checklist de aprovação | 30min |
| 16:45 | Avaliação final (oral + escrita) | 15min |

### O que a operadora precisa assistir

- [x] Vídeo 1 — Segurança e Condução de Pets
- [x] Vídeo 2 — Protocolo e Atendimento
- [x] Teaser vertical (para entender o material de divulgação)

### O que a operadora precisa decorar

- Checklist diário (seção 5)
- Critérios de aprovação/reprovação de fotos (seção 7)
- Quando escalar para SUPER_ADMIN (seção 8)
- Scripts de boas-vindas e aprovação (seção 6)

### Simulações práticas obrigatórias

| # | Cenário | Resultado esperado |
|---|---------|-------------------|
| 1 | Motorista novo quer se certificar | Fluxo completo de homologação |
| 2 | Foto com capa solta | Reprovar + feedback específico |
| 3 | Tutor informa 1 pet pequeno, embarca 2 médios | Divergência + decisão |
| 4 | Pet vomita no banco durante corrida | Registro + taxa + orientação |
| 5 | Motorista não renova selo há 2 semanas | Inativação + comunicação |

### Checklist de aprovação da operadora

- [ ] Assistiu os 2 vídeos completos
- [ ] Respondeu questionário com nota ≥ 8/10
- [ ] Validou 10 fotos corretamente (≥ 8 acertos)
- [ ] Executou 3 simulações sem erro grave
- [ ] Preencheu planilha operacional corretamente
- [ ] Demonstrou conhecimento das regras de escalação
- [ ] Aprovada pelo SUPER_ADMIN

---

## 10. Planilha Operacional

### Aba 1: Motoristas

| Coluna | Tipo | Exemplo |
|--------|------|---------|
| ID Motorista | Texto | KAV-2024-00847 |
| Nome | Texto | João Carlos |
| Telefone | Texto | (21) 99999-0000 |
| Status homologação | Lista | Pendente / Em treinamento / Questionário / Fotos / Aprovado / Reprovado |
| Nota questionário | Número | 8/10 |
| Data aprovação | Data | 2026-05-26 |
| Validade selo | Data | 2026-11-26 |
| Fotos aprovadas | Sim/Não | Sim |
| Observações | Texto | — |

### Aba 2: Corridas Pet

| Coluna | Tipo | Exemplo |
|--------|------|---------|
| ID Corrida | Texto | PET-20260526-001 |
| Data/hora | DateTime | 2026-05-26 14:30 |
| Motorista | Texto | João Carlos |
| Tutor | Texto | Ana Paula |
| Pet (tipo/porte) | Texto | Cão / Médio |
| Quantidade | Número | 1 |
| Status | Lista | Aguardando / Em andamento / Finalizada / Cancelada / Incidente |
| Foto embarque | Sim/Não | Sim |
| Higienização confirmada | Sim/Não | Sim |
| Observações | Texto | — |

### Aba 3: Incidentes

| Coluna | Tipo | Exemplo |
|--------|------|---------|
| ID Incidente | Texto | INC-20260526-001 |
| ID Corrida | Texto | PET-20260526-001 |
| Data/hora | DateTime | 2026-05-26 15:00 |
| Tipo | Lista | Sujeira / Divergência / Reclamação / Acidente / Outro |
| Descrição | Texto | Pet vomitou no banco traseiro |
| Ação tomada | Texto | Taxa extraordinária + orientação |
| Responsável | Texto | Maria (operadora) |
| Escalado | Sim/Não | Não |
| Resolvido | Sim/Não | Sim |

### Aba 4: Pagamentos/Taxas

| Coluna | Tipo | Exemplo |
|--------|------|---------|
| ID Corrida | Texto | PET-20260526-001 |
| Motorista | Texto | João Carlos |
| Taxa limpeza | Valor | R$ 30,00 |
| Motivo | Texto | Vômito no banco |
| Status | Lista | Pendente / Pago / Cancelado |
| Data pagamento | Data | — |

### Aba 5: Homologação

| Coluna | Tipo | Exemplo |
|--------|------|---------|
| Nome | Texto | Pedro Lima |
| Telefone | Texto | (21) 98888-0000 |
| Data contato | Data | 2026-05-26 |
| Vídeos enviados | Sim/Não | Sim |
| Vídeos assistidos | Sim/Não | Sim |
| Questionário enviado | Sim/Não | Sim |
| Nota | Número | 9/10 |
| Fotos enviadas | Sim/Não | Sim |
| Fotos aprovadas | Sim/Não | Pendente |
| Selo ativo | Sim/Não | Não |
| Observações | Texto | Aguardando foto do cinto |

---

## 11. Arquitetura Futura — Roles Específicos

### Sistema atual

O backend KAVIAR usa um campo `role` na tabela `admin_users` com valores como:
- `SUPER_ADMIN` — acesso total
- `OPERATOR` — operações (feature flags, virtual fence)
- `FINANCE` — pagamentos
- `LEAD_AGENT` — captação
- `ANGEL_VIEWER` — leitura (investidores)

Existe também `operator_profiles` vinculado a `admin_users` para operadores territoriais com dados de repasse.

### Avaliação para KAVIAR Pet

| Aspecto | Situação atual | Recomendação |
|---------|---------------|--------------|
| Role `OPERATOR` existente | Genérico, cobre feature flags e virtual fence | Pode ser usado na Fase 1 com restrição manual |
| Granularidade | Não há permissões por módulo | Insuficiente para produção |
| Auditoria | Não há log de ações por operador | Necessário implementar |
| Separação pet vs. geral | Não existe | Necessário para escala |

### Recomendação: criar roles específicos (Fase 2)

```
PET_OPERATOR
├── Visualizar corridas pet
├── Validar fotos
├── Registrar incidentes
├── Enviar comunicações
└── Consultar motoristas certificados

PET_SUPERVISOR
├── Tudo de PET_OPERATOR
├── Suspender/reativar motoristas
├── Aprovar recursos
├── Revisar auditoria pet
└── Alterar protocolo operacional
```

### Caminho de implementação (conceitual)

1. Adicionar valores `PET_OPERATOR` e `PET_SUPERVISOR` ao campo `role`
2. Criar middleware de permissão por módulo (pet, geral, finance)
3. Implementar log de auditoria (`admin_audit_log`)
4. Restringir endpoints pet por role
5. Dashboard da operadora com visão filtrada

### Decisão para Fase 1 (piloto)

Na Fase 1, a operadora usa:
- Role `OPERATOR` no sistema (se precisar de acesso ao admin)
- Planilha Google Sheets como ferramenta principal
- WhatsApp como canal de comunicação
- SUPER_ADMIN valida e supervisiona diretamente

Migração para roles específicos quando houver mais de 1 operadora ou quando o volume justificar automação.

---

## Histórico

| Data | Versão | Alteração |
|------|--------|-----------|
| 2026-05-26 | 1.0 | Documento inicial — manual completo para treinamento de operadora |
