# KAVIAR Pet — Arquitetura Técnica Futura

**Versão:** v1.0  
**Data:** Maio/2026  
**Status:** Proposta arquitetural — sem implementação  
**Regra:** Este documento é referência para quando código for autorizado. Não implementar sem aprovação explícita por fase.

---

## 1. Arquitetura Geral

```
┌─────────────────────────────────────────────────────────────────┐
│                        KAVIAR Platform                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌───────────────────────┐    ┌────────────────────────────┐    │
│  │     KAVIAR Core       │    │    KAVIAR Pet Operacional   │    │
│  │                       │    │                             │    │
│  │  • Corridas normais   │    │  • Corridas pet assistidas  │    │
│  │  • Dispatch padrão    │    │  • Dispatch filtrado (pet)  │    │
│  │  • Pricing padrão     │    │  • Pricing + surcharge pet  │    │
│  │  • Auth/RBAC          │    │  • Checklist operacional    │    │
│  │  • Créditos/Asaas     │    │  • Foto de embarque        │    │
│  │  • WhatsApp           │    │  • Incidentes pet           │    │
│  │  • Feature flags      │    │  • Homologação motorista    │    │
│  │                       │    │  • Termos pet               │    │
│  └───────────────────────┘    └────────────────────────────┘    │
│           │                              │                       │
│           │         ┌────────────────────┤                       │
│           │         │                    │                       │
│  ┌────────▼─────────▼──┐    ┌───────────▼──────────────────┐   │
│  │   Motoristas         │    │   Central KAVIAR Pet          │   │
│  │                      │    │                               │   │
│  │  Comum: corridas     │    │  • Operador pet               │   │
│  │  normais apenas      │    │  • Monitoramento corridas     │   │
│  │                      │    │  • Validação checklist/foto   │   │
│  │  Pet Aprovado:       │    │  • Decisão divergências       │   │
│  │  corridas normais    │    │  • Registro incidentes        │   │
│  │  + corridas pet      │    │  • Cobrança extraordinária    │   │
│  └──────────────────────┘    └───────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────┐    ┌───────────────────────────────┐   │
│  │   Tutores/Passageiros│    │   Admin                        │   │
│  │                      │    │                               │   │
│  │  Solicita corrida    │    │  • Aprovar motoristas pet     │   │
│  │  pet (com dados do   │    │  • Gerenciar selos            │   │
│  │  animal)             │    │  • Métricas pet               │   │
│  │                      │    │  • Configuração               │   │
│  └──────────────────────┘    └───────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Princípios arquiteturais:

| Princípio | Aplicação |
|-----------|-----------|
| Extensão, não reescrita | Pet estende o core — não duplica |
| Feature flag first | Tudo controlado por `KAVIAR_PET_ENABLED` |
| Isolamento de acesso | Middleware `requirePetApproved` nos endpoints pet |
| Aditivo | Migrations adicionam, nunca removem ou alteram existente |
| Fallback seguro | Se flag desligada ou campo null, comportamento = normal (sem pet) |

---

## 2. Modelo de Acesso Restrito

### Roles futuras:

| Role | Acesso | Herda de |
|------|--------|----------|
| `SUPER_ADMIN` | Tudo (inclusive pet) | — |
| `PET_ADMIN` | Aprovar motoristas, suspender, configurar, métricas | — |
| `PET_OPERATOR` | Central pet: corridas, checklists, incidentes, taxas | — |
| `PET_DRIVER_APPROVED` | Não é role admin — é status do motorista (`pet_status = 'approved'`) | — |

### Matriz de visibilidade:

| Recurso | Motorista comum | Motorista pet | Operador pet | Pet admin | Super admin |
|---------|:-:|:-:|:-:|:-:|:-:|
| Endpoints `/api/v2/rides` (normal) | ✅ | ✅ | — | — | ✅ |
| Endpoints `/api/pet/*` | ❌ 403 | ✅ | ✅ | ✅ | ✅ |
| Endpoints `/api/admin/pet/*` | ❌ | ❌ | ✅ | ✅ | ✅ |
| Endpoints `/api/admin/pet/config` | ❌ | ❌ | ❌ | ✅ | ✅ |
| App: seção pet | Invisível | Visível | — | — | — |
| Admin: Central Pet | — | — | Visível | Visível | Visível |
| Admin: Aprovações pet | — | — | ❌ | Visível | Visível |

### Middleware de acesso:

```
requirePetApproved(req)
  → Verifica driver.pet_status === 'approved'
  → Se não: 403 { error: 'pet_not_approved' }
  → Se feature flag desligada: 403 { error: 'pet_disabled' }

requirePetOperator(req)
  → Verifica admin.role IN ('SUPER_ADMIN', 'PET_ADMIN', 'PET_OPERATOR')
  → Se não: 403

requirePetAdmin(req)
  → Verifica admin.role IN ('SUPER_ADMIN', 'PET_ADMIN')
  → Se não: 403
```

---

## 3. Modelo de Dados Futuro

### 3.1 Campos em `drivers` (extensão):

```sql
-- Adicionados à tabela drivers existente
pet_status                  VARCHAR(20) DEFAULT 'inactive'
  -- inactive | interested | training | pending_approval | approved | suspended
pet_applied_at              TIMESTAMP
pet_homologation_paid_at    TIMESTAMP
pet_training_completed_at   TIMESTAMP
pet_quiz_score              INTEGER
pet_quiz_passed_at          TIMESTAMP
pet_photos_submitted_at     TIMESTAMP
pet_approved_at             TIMESTAMP
pet_approved_by             VARCHAR(255)  -- admin_id
pet_suspended_at            TIMESTAMP
pet_suspended_reason        TEXT
pet_terms_accepted_at       TIMESTAMP
```

### 3.2 Fotos pet (reutiliza `driver_documents`):

```sql
-- Novos tipos em driver_documents.type:
'pet_cover_installed'       -- capa protetora instalada
'pet_kit_visible'           -- kit visível no veículo
'pet_vehicle_rear'          -- banco traseiro preparado
'pet_seatbelt'              -- cinto/guia de segurança pet
'pet_selfie_kit'            -- selfie com kit (opcional)
```

### 3.3 Nova tabela: `pet_ride_details`

```sql
CREATE TABLE pet_ride_details (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id         UUID NOT NULL REFERENCES rides_v2(id),
  animal_type     VARCHAR(20) NOT NULL,  -- dog | cat | other
  animal_size     VARCHAR(20) NOT NULL,  -- small | medium | large
  animal_count    INTEGER NOT NULL DEFAULT 1,
  has_carrier     BOOLEAN DEFAULT false, -- caixa de transporte
  has_leash       BOOLEAN DEFAULT false, -- guia/peitoral
  tutor_present   BOOLEAN DEFAULT true,
  tutor_notes     TEXT,
  -- Checklist de chegada
  checklist_submitted_at    TIMESTAMP,
  checklist_quantity_ok     BOOLEAN,
  checklist_size_ok         BOOLEAN,
  checklist_tutor_present   BOOLEAN,
  checklist_carrier_ok      BOOLEAN,  -- se gato
  checklist_leash_ok        BOOLEAN,  -- se cão
  checklist_animal_safe     BOOLEAN,
  checklist_muzzle_needed   BOOLEAN DEFAULT false,
  checklist_vehicle_ready   BOOLEAN,
  checklist_photo_sent      BOOLEAN DEFAULT false,
  -- Validação central
  central_validated_at      TIMESTAMP,
  central_validated_by      VARCHAR(255),
  central_decision          VARCHAR(20), -- approved | adjusted | canceled
  central_notes             TEXT,
  -- Finalização
  hygiene_confirmed_at      TIMESTAMP,
  created_at                TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_pet_ride_details_ride ON pet_ride_details(ride_id);
```

### 3.4 Nova tabela: `pet_boarding_photos`

```sql
CREATE TABLE pet_boarding_photos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id     UUID NOT NULL REFERENCES rides_v2(id),
  driver_id   VARCHAR(255) NOT NULL,
  photo_url   TEXT NOT NULL,
  photo_type  VARCHAR(30) NOT NULL,  -- boarding | incident | damage | hygiene
  uploaded_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_pet_photos_ride ON pet_boarding_photos(ride_id);
```

### 3.5 Nova tabela: `pet_incidents`

```sql
CREATE TABLE pet_incidents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id         UUID REFERENCES rides_v2(id),
  driver_id       VARCHAR(255) NOT NULL,
  passenger_id    VARCHAR(255),
  incident_type   VARCHAR(30) NOT NULL,
    -- dirt | damage | aggression | escape | abandonment | divergence
    -- refusal | cancellation | sick_animal | hygiene | dispute | other
  severity        VARCHAR(10) NOT NULL,  -- low | medium | high | critical
  moment          VARCHAR(20),  -- boarding | during | disembark | post
  description     TEXT,
  operator_id     VARCHAR(255),
  decision        TEXT,
  fee_applied     BOOLEAN DEFAULT false,
  fee_amount      DECIMAL(8,2),
  status          VARCHAR(20) DEFAULT 'open',  -- open | analyzing | resolved | escalated
  resolved_at     TIMESTAMP,
  resolved_by     VARCHAR(255),
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_pet_incidents_ride ON pet_incidents(ride_id);
CREATE INDEX idx_pet_incidents_driver ON pet_incidents(driver_id);
CREATE INDEX idx_pet_incidents_status ON pet_incidents(status);
```

### 3.6 Nova tabela: `pet_central_log`

```sql
CREATE TABLE pet_central_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id     UUID REFERENCES rides_v2(id),
  operator_id VARCHAR(255),
  action      VARCHAR(50) NOT NULL,
    -- ride_assigned | checklist_validated | divergence_reported
    -- ride_approved | ride_canceled | incident_opened | fee_applied
    -- hygiene_confirmed | ride_closed
  details     JSONB,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_pet_central_log_ride ON pet_central_log(ride_id);
```

### 3.7 Consentimentos (reutiliza `driver_consents`):

```sql
-- Novo tipo em driver_consents:
consent_type = 'pet_terms_v1'
consent_type = 'pet_protocol_v1'

-- Para passageiro (user_consents):
consent_type = 'pet_tutor_terms_v1'
```

---

## 4. Fluxo Operacional Técnico

### 4.1 Homologação do motorista

```
[App/Landing] POST /api/pet/driver/apply
  → Cria registro: pet_status = 'interested'
  → Notifica admin

[Admin] GET /api/admin/pet/applications
  → Lista motoristas interessados

[Admin] POST /api/admin/pet/applications/:id/approve-pre
  → pet_status = 'training'
  → Envia links de treinamento (WhatsApp/notificação)

[App] POST /api/pet/driver/quiz
  → Recebe respostas, calcula nota
  → Se ≥ 7/10: pet_quiz_passed_at = now()
  → Se < 7/10: pode refazer em 24h

[App] POST /api/pet/driver/documents
  → Upload fotos (S3, tipos pet_*)
  → pet_status = 'pending_approval'

[Admin] POST /api/admin/pet/applications/:id/approve
  → pet_status = 'approved', pet_approved_at = now()
  → Notifica motorista (selo ativo)

[Admin] POST /api/admin/pet/applications/:id/reject
  → pet_status = 'training' (pode reenviar fotos)
  → Notifica motorista com motivo
```

### 4.2 Corrida pet

```
[Tutor] POST /api/v2/rides { ride_type: 'pet', pet_details: {...} }
  → Cria ride + pet_ride_details
  → Notifica central

[Central/Dispatch] Filtra motoristas: pet_status = 'approved' + online + próximo
  → Envia oferta (apenas para pet_approved)

[Motorista] Aceita oferta
  → Recebe dados do pet

[Motorista] POST /api/pet/rides/:id/checklist
  → Envia checklist de chegada
  → checklist_submitted_at = now()

[Motorista] POST /api/pet/rides/:id/boarding-photo
  → Upload foto do pet embarcado
  → checklist_photo_sent = true

[Central] POST /api/admin/pet/rides/:id/validate
  → central_validated_at = now()
  → central_decision = 'approved' | 'adjusted' | 'canceled'

[Motorista] Inicia corrida (fluxo normal rides_v2)

[Motorista] Finaliza corrida

[Motorista] POST /api/pet/rides/:id/hygiene-confirm
  → hygiene_confirmed_at = now()

[Central] POST /api/admin/pet/rides/:id/close
  → Registra pet_central_log: 'ride_closed'
```

### 4.3 Divergência

```
[Motorista] POST /api/pet/rides/:id/divergence
  → { type: 'size' | 'quantity' | 'no_carrier' | 'aggressive' | 'no_tutor', description }
  → Notifica central imediatamente

[Central] POST /api/admin/pet/rides/:id/decision
  → { decision: 'approve' | 'adjust_fee' | 'cancel', notes, adjusted_amount? }
  → Se cancel: ride cancelada sem penalidade para motorista
  → Se adjust_fee: informa tutor, aguarda aceite
```

### 4.4 Incidente

```
[Motorista] POST /api/pet/rides/:id/incident
  → { type, severity, description }
  → Cria pet_incidents
  → Notifica central (prioridade por severity)

[Motorista] POST /api/pet/incidents/:id/photos
  → Upload fotos de evidência

[Central] PUT /api/admin/pet/incidents/:id
  → { decision, fee_applied, fee_amount, status }
  → Se fee_applied: aciona cobrança ao tutor (Asaas)
```

---

## 5. APIs Futuras (endpoints sugeridos)

### Driver Pet (autenticado como motorista):

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/pet/driver/apply` | Candidatar-se ao KAVIAR Pet |
| GET | `/api/pet/driver/status` | Status da homologação |
| POST | `/api/pet/driver/quiz` | Enviar respostas do questionário |
| POST | `/api/pet/driver/documents` | Upload fotos do kit |
| POST | `/api/pet/driver/terms/accept` | Aceitar termos pet |
| POST | `/api/pet/rides/:id/checklist` | Enviar checklist de chegada |
| POST | `/api/pet/rides/:id/boarding-photo` | Enviar foto de embarque |
| POST | `/api/pet/rides/:id/divergence` | Reportar divergência |
| POST | `/api/pet/rides/:id/hygiene-confirm` | Confirmar higienização |
| POST | `/api/pet/rides/:id/incident` | Reportar incidente |
| POST | `/api/pet/incidents/:id/photos` | Enviar fotos de incidente |

### Admin Pet (autenticado como admin com role pet):

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/admin/pet/applications` | Listar candidaturas |
| POST | `/api/admin/pet/applications/:id/approve-pre` | Aprovar pré-cadastro |
| POST | `/api/admin/pet/applications/:id/approve` | Aprovar motorista (ativar selo) |
| POST | `/api/admin/pet/applications/:id/reject` | Reprovar (com motivo) |
| POST | `/api/admin/pet/drivers/:id/suspend` | Suspender selo |
| POST | `/api/admin/pet/drivers/:id/reactivate` | Reativar selo |
| GET | `/api/admin/pet/drivers` | Listar motoristas pet |
| GET | `/api/admin/pet/rides` | Listar corridas pet (central) |
| POST | `/api/admin/pet/rides/:id/validate` | Validar checklist/foto |
| POST | `/api/admin/pet/rides/:id/decision` | Decidir divergência |
| POST | `/api/admin/pet/rides/:id/close` | Encerrar corrida pet |
| GET | `/api/admin/pet/incidents` | Listar incidentes |
| PUT | `/api/admin/pet/incidents/:id` | Atualizar/resolver incidente |
| POST | `/api/admin/pet/incidents/:id/fee` | Aplicar taxa extraordinária |
| GET | `/api/admin/pet/metrics` | Métricas operacionais pet |

### Passageiro/Tutor:

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/v2/rides` | Criar corrida com `ride_type: 'pet'` + `pet_details` |
| POST | `/api/pet/tutor/terms/accept` | Aceitar termos pet (tutor) |

---

## 6. Frontend Futuro (telas/módulos)

### Admin — Central KAVIAR Pet:

| Tela | Função | Prioridade |
|------|--------|-----------|
| Dashboard Central Pet | Corridas ativas, pendentes, métricas do dia | Fase 3 |
| Detalhe Corrida Pet | Timeline, checklist, foto, decisões, incidente | Fase 3 |
| Aprovação Motoristas Pet | Lista de candidaturas, fotos, quiz, aprovar/reprovar | Fase 2 |
| Lista Motoristas Pet | Status, corridas, incidentes, suspensão | Fase 2 |
| Incidentes Pet | Lista, filtros, detalhes, resolução, cobrança | Fase 3 |
| Métricas Pet | KPIs, gráficos, tendências | Fase 4 |
| Configuração Pet | Taxa, limites, feature flags | Fase 4 |

### App Motorista — Módulo Pet (restrito):

| Tela | Função | Prioridade |
|------|--------|-----------|
| Status Homologação | Progresso (treinamento, quiz, fotos, aprovação) | Fase 4 |
| Corrida Pet (oferta) | Dados do pet + aceitar/recusar | Fase 4 |
| Checklist de Chegada | Formulário digital + envio de foto | Fase 4 |
| Reportar Divergência | Formulário + foto | Fase 4 |
| Confirmar Higienização | Botão pós-corrida | Fase 4 |
| Reportar Incidente | Formulário + fotos | Fase 4 |

### App Passageiro — Solicitar Pet:

| Tela | Função | Prioridade |
|------|--------|-----------|
| Seleção "Corrida Pet" | Opção no mapa/solicitação | Fase 5 |
| Dados do Pet | Tipo, porte, quantidade, contenção | Fase 5 |
| Termos Pet (tutor) | Aceite obrigatório | Fase 5 |
| Acompanhamento Pet | Status com etapas (checklist, validação) | Fase 5 |

---

## 7. Fases de Implementação

| Fase | Escopo | Toca em | Risco | Estimativa |
|------|--------|---------|-------|-----------|
| **1** | Manual: WhatsApp + planilha + formulário externo | Nada | Zero | 0 dias dev |
| **2** | Campos `pet_*` em drivers + upload fotos + tela admin aprovação | Migration aditiva, nova rota isolada, nova página admin | Baixo | 3-5 dias |
| **3** | Central Pet web (painel admin) + `pet_ride_details` + `pet_incidents` + `pet_central_log` | Migration aditiva, novas rotas admin, novas páginas admin | Baixo-Médio | 5-8 dias |
| **4** | Módulo pet no app motorista (checklist digital, foto in-app) | App motorista (novo APK), novas rotas driver | Médio | 5-7 dias |
| **5** | Passageiro solicita pet no app + `ride_type: 'pet'` | **map.tsx** ⚠️, app passageiro (novo APK) | **Alto** | 3-5 dias |
| **6** | Dispatch filtrado + pricing surcharge | **dispatcher.service.ts** ⚠️, **pricing-engine.ts** ⚠️ | **Alto** | 3-5 dias |

### Dependências entre fases:

```
Fase 1 (manual) → independente
Fase 2 (homologação) → independente do core
Fase 3 (central web) → depende de Fase 2
Fase 4 (app motorista) → depende de Fase 2 + 3
Fase 5 (app passageiro) → depende de Fase 3 + 4
Fase 6 (dispatch/pricing) → depende de Fase 5
```

---

## 8. Zonas de Risco

| Zona | Quando é tocada | Risco | Mitigação |
|------|----------------|-------|-----------|
| `dispatcher.service.ts` | Fase 6 | **Alto** — regressão no dispatch normal | Filtro condicional: `if (ride.ride_type === 'pet') { ... }`. Testes obrigatórios. Feature flag. |
| `pricing-engine.ts` | Fase 6 | **Alto** — preço errado em corridas normais | Surcharge isolado: `if (ride_type === 'pet') { addSurcharge() }`. Não alterar cálculo base. |
| `app/(passenger)/map.tsx` | Fase 5 | **Alto** — quebrar mapa/solicitação | Componente condicional: `{isPetEnabled && <PetSelector />}`. Não alterar fluxo existente. |
| `app/(driver)/online.tsx` | Fase 4 | **Médio** — quebrar tela principal motorista | Seção pet separada, renderizada condicionalmente. |
| Banco (migrations) | Fase 2+ | **Baixo** — migrations aditivas | Nunca ALTER/DROP. Sempre ADD COLUMN com DEFAULT. |
| Asaas (webhooks) | Fase 6 | **Médio** — cobrança errada | Novo tipo de cobrança (`pet_cleaning_fee`), não alterar fluxo existente. |
| WhatsApp/Twilio | Fase 3+ | **Baixo** — novo template | Template separado, não altera existentes. |
| S3 (uploads) | Fase 2+ | **Zero** — novo prefixo | Prefixo `pet/` no mesmo bucket. |
| Feature flags | Fase 2+ | **Zero** — aditivo | Nova flag `KAVIAR_PET_ENABLED`. |

---

## 9. Recomendação — O que implementar primeiro

Quando código for autorizado, a ordem de menor risco é:

### Primeiro (Fase 2 — menor risco possível):

1. **Migration aditiva:** campos `pet_status`, `pet_applied_at`, `pet_approved_at`, `pet_approved_by`, `pet_training_completed_at`, `pet_quiz_score`, `pet_terms_accepted_at` em `drivers`.
2. **Feature flag:** `KAVIAR_PET_ENABLED` na tabela `feature_flags`.
3. **Endpoint isolado:** `POST /api/pet/driver/apply` (nova rota, não toca em nada existente).
4. **Upload de fotos pet:** reutiliza `driver_documents` com novos tipos (sem migration — campo `type` é String livre).
5. **Tela admin:** "KAVIAR Pet — Aprovações" (nova página em `frontend-app`, não altera rotas existentes).

**Por que é seguro:**
- Migration apenas adiciona colunas com DEFAULT (zero impacto em queries existentes).
- Rota nova isolada (não toca em `app.ts` existente além de 1 linha de mount).
- Página admin nova (não altera páginas existentes).
- Feature flag controla tudo (se desligada, pet não existe).
- Zero impacto em: dispatcher, pricing, apps mobile, map.tsx, corridas normais.

### Segundo (Fase 3 — risco baixo-médio):

- Tabelas `pet_ride_details`, `pet_incidents`, `pet_central_log` (migrations aditivas).
- Endpoints admin pet (rotas novas isoladas).
- Painel Central Pet (páginas admin novas).

### Último (Fases 5-6 — risco alto, requer autorização explícita):

- Alteração em `map.tsx` (passageiro seleciona pet).
- Alteração no dispatcher (filtro por `pet_status`).
- Alteração no pricing (surcharge pet).
- Novos APKs.

---

## 10. Compatibilidade com Infraestrutura Existente

| Recurso existente | Como o Pet usa | Alteração necessária |
|-------------------|---------------|---------------------|
| `rides_v2.ride_type` | Já existe com default `'normal'`. Pet usa `'pet'`. | Nenhuma (campo já aceita qualquer string). |
| `driver_documents` | Novos tipos (`pet_*`). | Nenhuma migration (campo `type` é String livre). |
| `driver_consents` | Novo tipo `pet_terms_v1`. | Nenhuma migration. |
| `feature_flags` | Nova flag `KAVIAR_PET_ENABLED`. | INSERT (não migration). |
| S3 `kaviar-uploads-*` | Novo prefixo `pet/`. | Nenhuma. |
| Asaas | Novo tipo de cobrança para taxa de limpeza. | Extensão do webhook handler (Fase 6). |
| WhatsApp/Twilio | Novos templates pet. | Submissão de template (não altera código). |
| CloudWatch | Novos logs `[PET]`. | Nenhuma configuração extra. |

---

*KAVIAR Pet — Arquitetura Técnica Futura v1.0 — Maio/2026*  
*Este documento é referência. Não implementar sem autorização explícita por fase.*
