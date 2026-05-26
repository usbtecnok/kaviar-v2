# Central KAVIAR Pet — Estrutura Operacional

**Versão:** v1.0  
**Data:** Maio/2026  
**Status:** Modelagem conceitual

---

## 1. O que é a Central KAVIAR Pet

A Central é o núcleo de coordenação de todas as corridas pet. Não existe corrida pet sem acompanhamento da central.

| Aspecto | Definição |
|---------|-----------|
| Função | Coordenar, validar, acompanhar e resolver corridas pet |
| Quem opera | Operador treinado no protocolo KAVIAR Pet |
| Quando atua | Em toda corrida pet — do pedido ao encerramento |
| Como se comunica | WhatsApp (MVP) → Painel web (futuro) |
| Autoridade | Pode aprovar, ajustar, cancelar ou escalar |

---

## 2. Papel do Operador

### Responsabilidades:

| # | Responsabilidade | Quando |
|---|-----------------|--------|
| 1 | Receber solicitação do tutor | Início |
| 2 | Registrar dados do pet (tipo, porte, quantidade, contenção) | Início |
| 3 | Designar motorista pet aprovado e disponível | Início |
| 4 | Repassar dados do pet ao motorista | Após aceite |
| 5 | Receber e validar checklist de chegada | Chegada do motorista |
| 6 | Receber e arquivar foto obrigatória do embarque | Chegada |
| 7 | Comparar informado vs encontrado (porte, quantidade) | Chegada |
| 8 | Decidir em caso de divergência | Divergência |
| 9 | Autorizar início da corrida | Após validação |
| 10 | Estar disponível durante a corrida | Em andamento |
| 11 | Receber relato de incidente | Se ocorrer |
| 12 | Orientar motorista em situação de risco | Se ocorrer |
| 13 | Confirmar finalização | Fim |
| 14 | Confirmar higienização | Pós-corrida |
| 15 | Avaliar fotos de dano/sujeira | Se reportado |
| 16 | Acionar cobrança de taxa extraordinária | Se aplicável |
| 17 | Registrar ocorrência completa | Sempre que houver |
| 18 | Fechar registro na planilha/sistema | Encerramento |

### Decisões que o operador toma:

| Situação | Opções do operador |
|----------|-------------------|
| Divergência de porte | Ajustar cobrança / Orientar / Cancelar |
| Divergência de quantidade | Ajustar cobrança / Cancelar |
| Animal sem contenção | Cancelar / Exigir contenção |
| Animal agressivo | Cancelar / Exigir focinheira |
| Tutor ausente | Cancelar / Aguardar (com limite) |
| Sujeira extraordinária | Avaliar fotos → Cobrar tutor |
| Dano ao veículo | Avaliar fotos → Cobrar tutor / Escalar |
| Fuga do animal | Registrar / Orientar / Escalar |
| Motorista inseguro | Orientar / Cancelar sem penalidade |

---

## 3. Monitoramento de Corridas

### Timeline que o operador acompanha:

```
[PEDIDO] → [ACEITE] → [A CAMINHO] → [CHEGOU] → [CHECKLIST] → [FOTO] → [VALIDAÇÃO]
    → [INÍCIO] → [EM ANDAMENTO] → [FINALIZAÇÃO] → [HIGIENIZAÇÃO] → [ENCERRADO]
```

### Status da corrida pet:

| Status | Significado | Cor |
|--------|------------|-----|
| `solicitada` | Tutor pediu, aguardando motorista | Cinza |
| `aceita` | Motorista aceitou, a caminho | Azul |
| `chegou` | Motorista no local, aguardando checklist | Âmbar |
| `checklist_ok` | Checklist + foto validados | Verde |
| `divergencia` | Divergência reportada, operador decidindo | Vermelho |
| `em_andamento` | Corrida iniciada | Verde |
| `incidente` | Problema durante corrida | Vermelho |
| `finalizada` | Corrida concluída, aguardando higienização | Âmbar |
| `encerrada` | Tudo OK, registro fechado | Verde-escuro |
| `cancelada` | Cancelada (com motivo registrado) | Cinza |

### Alertas automáticos (futuro):

| Alerta | Condição | Ação |
|--------|----------|------|
| Checklist pendente | Motorista chegou há >5min sem enviar checklist | Operador cobra |
| Foto pendente | Checklist enviado sem foto | Operador cobra |
| Corrida longa | Em andamento há >45min | Operador verifica |
| Incidente reportado | Motorista acionou | Operador responde imediatamente |

---

## 4. Recebimento e Arquivamento de Fotos

### Fotos que a central recebe:

| Momento | Foto | Obrigatória | Finalidade |
|---------|------|-------------|-----------|
| Embarque | Pet embarcado (peitoral, quantidade, condição) | ✅ Sim | Prova operacional, proteção do motorista |
| Incidente | Estado do veículo/animal após problema | Condicional | Evidência para cobrança |
| Dano | Detalhe do dano ao veículo | Condicional | Evidência para cobrança |
| Higienização | Veículo limpo após corrida (futuro) | ❌ Opcional | Comprovação de protocolo |

### Arquivamento (MVP):

- Fotos recebidas via WhatsApp.
- Operador salva em pasta Google Drive organizada por data + motorista.
- Estrutura: `KAVIAR Pet / Corridas / YYYY-MM-DD / [Motorista] - [Tutor]/`

### Arquivamento (futuro):

- Fotos vinculadas à corrida no sistema (S3 + referência no banco).
- Acessíveis pelo painel da Central.

---

## 5. Gestão de Divergências

### Fluxo de decisão:

```
Motorista reporta divergência
        ↓
Operador recebe (WhatsApp/painel)
        ↓
Operador avalia gravidade:
        ↓
┌─────────────────────────────────────────┐
│ LEVE (porte levemente diferente)        │
│ → Registrar. Autorizar continuação.     │
├─────────────────────────────────────────┤
│ MÉDIA (2 pets em vez de 1, porte maior) │
│ → Informar tutor do ajuste de cobrança. │
│ → Se aceitar: autorizar.               │
│ → Se recusar: cancelar.                │
├─────────────────────────────────────────┤
│ GRAVE (sem contenção, agressivo, tutor  │
│ ausente, >3 pets sem autorização)       │
│ → Cancelar corrida.                    │
│ → Sem penalidade para motorista.        │
│ → Registrar ocorrência no tutor.        │
└─────────────────────────────────────────┘
```

### Registro de divergência:

| Campo | Exemplo |
|-------|---------|
| Data/hora | 2026-05-26 14:30 |
| Motorista | João Silva |
| Tutor | Maria Santos |
| Informado | 1 cão pequeno, com guia |
| Encontrado | 2 cães médios, 1 sem guia |
| Gravidade | Média |
| Decisão | Ajuste de cobrança (+R$5) |
| Resultado | Tutor aceitou, corrida seguiu |
| Operador | [Nome] |

---

## 6. Suporte ao Motorista

### Quando o motorista aciona a central:

| Situação | Resposta esperada |
|----------|------------------|
| Dúvida sobre checklist | Orientar em <2min |
| Animal agressivo | Autorizar recusa, cancelar sem penalidade |
| Tutor não aparece | Aguardar 5min → cancelar → compensar motorista |
| Sujeira durante corrida | Orientar limpeza, pedir fotos depois |
| Acidente/fuga | Prioridade máxima. Orientar. Registrar. |
| Dúvida sobre entrega | Orientar (porta vs estabelecimento) |

### SLA de resposta (meta):

| Prioridade | Tempo de resposta |
|-----------|------------------|
| Incidente/emergência | <1 minuto |
| Divergência | <3 minutos |
| Dúvida operacional | <5 minutos |
| Registro pós-corrida | <15 minutos |

---

## 7. Suporte ao Tutor

### Quando o tutor aciona a central:

| Situação | Resposta |
|----------|----------|
| Quer solicitar corrida pet | Coletar dados, designar motorista |
| Motorista atrasado | Verificar status, informar ETA |
| Quer cancelar | Cancelar, informar motorista |
| Reclamação pós-corrida | Registrar, avaliar, responder em 24h |
| Dúvida sobre taxa | Explicar modelo de cobrança |
| Cobrança de limpeza contestada | Avaliar fotos, decidir |

---

## 8. Evolução por Escala

### MVP Manual (1 operador, até 10 corridas/dia):

| Ferramenta | Uso |
|-----------|-----|
| WhatsApp Business | Comunicação com motoristas e tutores |
| Google Sheets | Planilha de controle (corridas, status, incidentes) |
| Google Drive | Arquivo de fotos |
| Celular do operador | Receber fotos, responder rápido |

### Escala Intermediária (2-3 operadores, 10-50 corridas/dia):

| Ferramenta | Uso |
|-----------|-----|
| WhatsApp Business + etiquetas | Organização por status |
| Google Sheets compartilhado | Múltiplos operadores |
| Tela admin KAVIAR (nova) | Lista de corridas pet com status |
| Notificações | Alerta quando checklist pendente |

### Visão Futura (painel dedicado, 50+ corridas/dia):

| Ferramenta | Uso |
|-----------|-----|
| Painel "Central KAVIAR Pet" | Dashboard em tempo real |
| Corridas com timeline visual | Status, fotos, checklist, incidentes |
| Alertas automáticos | Checklist pendente, corrida longa |
| Histórico por motorista/tutor | Reincidências, padrões |
| Relatórios | Métricas operacionais, financeiras |
| Role `PET_OPERATOR` | Acesso restrito ao painel pet |

---

## 9. Métricas Operacionais da Central

| Métrica | Meta | Frequência |
|---------|------|-----------|
| Tempo médio de resposta | <3min | Semanal |
| Corridas com divergência | <15% | Semanal |
| Corridas canceladas por condição insegura | <5% | Semanal |
| Incidentes graves | 0 | Contínuo |
| Satisfação do motorista | >8/10 | Mensal |
| Satisfação do tutor | >8/10 | Mensal |
| Fotos de embarque recebidas | 100% | Contínuo |
| Checklists completos | 100% | Contínuo |

---

*Central KAVIAR Pet — Estrutura Operacional v1.0 — Maio/2026*
