# KAVIAR Pet — Módulo Restrito e Fluxo do Motorista Homologado

**Versão:** v1.0  
**Data:** Maio/2026  
**Status:** Modelagem conceitual — sem código

---

## 1. Conceito do Módulo Restrito

O KAVIAR Pet opera como módulo isolado dentro da plataforma. Nenhum elemento pet é visível ou acessível para quem não tem autorização.

### Princípios:

| Princípio | Implementação |
|-----------|--------------|
| Invisibilidade | Motorista comum não vê menu, corrida, checklist ou qualquer referência a pet |
| Acesso por selo | Apenas motoristas com `pet_status = 'approved'` e selo ativo |
| Protocolo próprio | Corrida pet tem fluxo diferente de corrida normal (checklist, foto, central) |
| Central obrigatória | Toda corrida pet passa pela central — não é self-service |
| Isolamento de dados | Métricas pet separadas, incidentes pet separados, histórico pet separado |

### O que o módulo contém (quando implementado):

```
Módulo KAVIAR Pet (restrito)
├── Corridas pet (receber, aceitar, checklist, foto, finalizar)
├── Checklist de chegada (formulário digital)
├── Envio de foto de embarque
├── Canal com a central (chat/WhatsApp)
├── Histórico de corridas pet
├── Status do selo (ativo/suspenso)
├── Alertas da central
└── Suporte operacional
```

### O que o motorista comum vê:

```
App motorista (normal)
├── Corridas normais
├── Créditos
├── Histórico
├── Perfil
└── (nenhuma referência a pet)
```

---

## 2. Fluxo Completo do Motorista — Onboarding à Operação

### Fase A — Descoberta e Interesse

```
Motorista vê divulgação (WhatsApp, Instagram, landing)
        ↓
Acessa landing page KAVIAR Pet
        ↓
Preenche formulário de interesse
        ↓
Recebe confirmação automática (WhatsApp)
```

### Fase B — Homologação

```
Admin avalia pré-cadastro
        ↓
  [Aprovado] → Envia lista de itens obrigatórios
  [Recusado] → Informa motivo (não é motorista ativo, histórico ruim, etc)
        ↓
Motorista adquire itens por conta própria
        ↓
Motorista confirma que tem os itens
        ↓
Motorista paga Taxa de Homologação (Pix)
        ↓
Admin confirma pagamento
        ↓
Admin envia links de treinamento (2 vídeos)
        ↓
Motorista assiste vídeos
        ↓
Motorista responde questionário (nota mínima 7/10)
        ↓
  [Aprovado] → Admin pede fotos
  [Reprovado] → Pode refazer em 24h (1 tentativa)
        ↓
Motorista envia fotos (capa, kit, veículo, selfie opcional)
        ↓
Admin valida fotos
        ↓
  [OK] → Ativa selo
  [Não OK] → Pede correção
        ↓
Motorista recebe certificado + selo ativo
```

### Fase C — Início da Operação

```
Motorista com selo ativo
        ↓
Central encaminha corrida pet (WhatsApp MVP / notificação futura)
        ↓
Motorista aceita ou recusa
        ↓
  [Aceita] → Recebe dados do pet + endereço
  [Recusa] → Central encaminha para próximo
        ↓
Motorista vai até o local
        ↓
Motorista envia checklist de chegada + foto obrigatória
        ↓
Central valida
        ↓
  [OK] → "Pode iniciar"
  [Divergência] → Central decide
        ↓
Corrida em andamento (central disponível)
        ↓
Motorista finaliza corrida
        ↓
Motorista confirma higienização
        ↓
Central encerra registro
```

### Fase D — Suporte Contínuo

| Atividade | Frequência |
|-----------|-----------|
| Corridas pet disponíveis | Conforme demanda |
| Reposição de itens | Quando necessário (motorista gerencia) |
| Comunicação da central | A cada corrida |
| Feedback/avaliação | Após cada corrida (futuro) |
| Revalidação do selo | Trimestral ou semestral (futuro) |

### Fase E — Suspensão e Auditoria

| Motivo de suspensão | Processo |
|--------------------|----------|
| 2+ reclamações graves | Central notifica → Conversa → Suspensão temporária |
| Itens não mantidos | Revalidação de fotos → Suspensão até regularizar |
| Recusa de higienização | Advertência → Suspensão se reincidente |
| Corrida sem capa | Advertência → Suspensão |
| Cobrança direta ao tutor | Suspensão imediata |
| Maus-tratos ao animal | Suspensão definitiva + desligamento |
| Fotos falsas na homologação | Suspensão + reavaliação completa |

### Reativação após suspensão:

1. Motorista solicita reativação.
2. Admin avalia motivo da suspensão.
3. Se aplicável: novas fotos, novo questionário ou conversa.
4. Admin reativa selo.
5. Motorista volta a receber corridas pet.

---

## 3. Auditoria do Motorista Pet

### O que é auditado:

| Item | Como | Frequência |
|------|------|-----------|
| Fotos de embarque | Central arquiva e revisa | Toda corrida |
| Checklists enviados | Registro na planilha/sistema | Toda corrida |
| Incidentes | Registro completo com evidências | Quando ocorrer |
| Reclamações de tutores | Registro + investigação | Quando ocorrer |
| Revalidação de itens | Novas fotos do veículo preparado | Trimestral (futuro) |
| Questionário de atualização | Novas perguntas sobre protocolo | Semestral (futuro) |

### Histórico do motorista pet:

```
Motorista: João Silva
Selo ativo desde: 2026-06-01
Corridas pet realizadas: 23
Incidentes: 1 (sujeira leve, resolvido)
Divergências: 2 (porte diferente, ajustado)
Reclamações: 0
Última revalidação: 2026-08-01
Status: ✅ Ativo
```

---

## 4. Conceito do Painel Central KAVIAR Pet (futuro)

### Telas conceituais:

#### 4.1 Dashboard principal

```
┌─────────────────────────────────────────────────────────┐
│  Central KAVIAR Pet                        [Operador: X] │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Corridas ativas: 3    Pendentes: 1    Hoje: 12         │
│                                                          │
│  ┌──────────────────┐  ┌──────────────────┐            │
│  │ 🟢 Em andamento  │  │ 🟡 Checklist     │            │
│  │ João → Vet Norte │  │ Pedro → Banho    │            │
│  │ 1 cão médio      │  │ 2 gatos (caixa)  │            │
│  │ 15min            │  │ Aguardando foto   │            │
│  └──────────────────┘  └──────────────────┘            │
│                                                          │
│  ┌──────────────────┐  ┌──────────────────┐            │
│  │ 🔴 Divergência   │  │ 🟢 Finalizada    │            │
│  │ Ana → Creche Pet │  │ Carlos → Casa    │            │
│  │ 3 pets (informou │  │ 1 cão pequeno    │            │
│  │ 2) — Decidir     │  │ Higienização OK   │            │
│  └──────────────────┘  └──────────────────┘            │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

#### 4.2 Detalhe da corrida pet

```
┌─────────────────────────────────────────────────────────┐
│  Corrida Pet #047                          Status: 🟡    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Tutor: Maria Santos          Motorista: João Silva     │
│  Origem: Tijuca               Destino: Vet Norte        │
│  Pet: 1 cão médio, com guia   Hora pedido: 14:20       │
│                                                          │
│  Timeline:                                               │
│  14:20 ✅ Solicitada                                    │
│  14:22 ✅ Motorista aceitou                             │
│  14:35 ✅ Motorista chegou                              │
│  14:36 ✅ Checklist enviado                             │
│  14:36 ✅ Foto recebida [📷 Ver]                       │
│  14:37 ✅ Central autorizou início                      │
│  14:37 🟢 Em andamento                                  │
│  --:-- ⏳ Aguardando finalização                        │
│                                                          │
│  [Registrar incidente]  [Cancelar corrida]              │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

#### 4.3 Lista de motoristas pet

```
┌─────────────────────────────────────────────────────────┐
│  Motoristas KAVIAR Pet                    Total: 12     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Nome          Status    Corridas  Incidentes  Desde    │
│  ─────────────────────────────────────────────────────  │
│  João Silva    🟢 Ativo    23        1         Jun/26   │
│  Pedro Lima    🟢 Ativo    15        0         Jun/26   │
│  Ana Costa     🟡 Suspenso  8        3         Jul/26   │
│  Carlos Reis   🟢 Ativo    31        0         Jun/26   │
│                                                          │
│  [+ Aprovar novo motorista]                             │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Implementação por Fase (sem código agora)

| Fase | Módulo restrito funciona como |
|------|------------------------------|
| **Fase 1** | Lista manual de motoristas aprovados. Central via WhatsApp. Planilha. Nenhum código. |
| **Fase 2** | Campo `pet_status` no banco. Tela admin "Motoristas Pet". Feature flag. Endpoints restritos (403 se não aprovado). |
| **Fase 3** | Seção pet no app motorista (visível só para aprovados). Checklist digital. Foto in-app. Notificação de corrida pet. |
| **Fase 4** | Painel "Central KAVIAR Pet" completo. Dashboard. Timeline. Alertas. Relatórios. Role `PET_OPERATOR`. |

---

*KAVIAR Pet — Módulo Restrito e Fluxo do Motorista v1.0 — Maio/2026*
