# Feature Flag Rollout - Passenger Favorites Matching

**Data:** 2026-02-01  
**Feature:** `passenger_favorites_matching`  
**Status:** Implementado, aguardando rollout

---

## Arquitetura do Resolver

### 3 Camadas de Prioridade (maior para menor):

```
┌─────────────────────────────────────────────────────────┐
│ Layer 1: Allowlist DB (passenger_id)                   │
│ → Sempre ON se passenger está na allowlist             │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ Layer 2: Rollout Percentual Determinístico             │
│ → hash(passenger_id) % 100 < rollout_percentage        │
│ → Mesmo passenger sempre recebe mesmo resultado        │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ Layer 3: Master Switch (env var)                       │
│ → FEATURE_PASSENGER_FAVORITES_MATCHING=false           │
│ → Força OFF global (ignora allowlist e percentual)     │
└─────────────────────────────────────────────────────────┘
```

### Comportamento do Master Switch:

- **`false`**: Desliga globalmente (allowlist ignorada)
- **`true`** ou **undefined**: Respeita configuração do DB (allowlist + percentual)

### Determinismo:

```javascript
// Mesmo passenger_id sempre retorna mesmo hash
hash('passenger-123') % 100 = 42  // Sempre 42

// Com rollout_percentage = 50:
// - hash < 50 → ON
// - hash >= 50 → OFF
// passenger-123 (hash=42) → Sempre ON
```

---

## Exemplos de Chamadas

### 1. Consultar Feature Flag

```bash
GET /api/admin/feature-flags/passenger_favorites_matching
Authorization: Bearer {token}

Response:
{
  "success": true,
  "flag": {
    "key": "passenger_favorites_matching",
    "enabled": true,
    "rolloutPercentage": 10,
    "updatedByAdminId": "admin-123",
    "updatedAt": "2026-02-01T12:00:00Z",
    "createdAt": "2026-02-01T10:00:00Z"
  }
}
```

### 2. Atualizar Feature Flag

```bash
PUT /api/admin/feature-flags/passenger_favorites_matching
Authorization: Bearer {token}
Content-Type: application/json

{
  "enabled": true,
  "rolloutPercentage": 25
}

Response:
{
  "success": true,
  "flag": {
    "key": "passenger_favorites_matching",
    "enabled": true,
    "rolloutPercentage": 25,
    "updatedAt": "2026-02-01T12:30:00Z"
  }
}
```

### 3. Listar Allowlist

```bash
GET /api/admin/feature-flags/passenger_favorites_matching/allowlist?page=1&limit=50
Authorization: Bearer {token}

Response:
{
  "success": true,
  "allowlist": [
    {
      "id": "uuid-1",
      "passengerId": "passenger-001",
      "createdByAdminId": "admin-123",
      "createdAt": "2026-02-01T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 10,
    "totalPages": 1
  }
}
```

### 4. Adicionar à Allowlist

```bash
POST /api/admin/feature-flags/passenger_favorites_matching/allowlist
Authorization: Bearer {token}
Content-Type: application/json

{
  "passengerId": "passenger-beta-001"
}

Response:
{
  "success": true,
  "entry": {
    "id": "uuid-2",
    "passengerId": "passenger-beta-001",
    "createdAt": "2026-02-01T12:00:00Z"
  }
}
```

### 5. Remover da Allowlist

```bash
DELETE /api/admin/feature-flags/passenger_favorites_matching/allowlist/passenger-beta-001
Authorization: Bearer {token}

Response:
{
  "success": true,
  "message": "Passenger removido da allowlist"
}
```

---

## Plano de Rollout

### Fase 1: Beta Testing (Semana 1)
**Objetivo:** Validar funcionalidade com grupo controlado

```bash
# Configuração
enabled: true
rolloutPercentage: 0

# Allowlist: 10 passengers selecionados
- passenger-beta-001
- passenger-beta-002
- ...
- passenger-beta-010
```

**Métricas a monitorar:**
- Taxa de sucesso de matching
- Latência de matching
- Erros 500 em endpoints
- Feedback dos passengers beta

**Critério de sucesso:** 
- Zero erros críticos
- Latência < 200ms
- Feedback positivo

---

### Fase 2: Rollout 1% (Semana 2)
**Objetivo:** Validar em escala pequena

```bash
# Configuração
enabled: true
rolloutPercentage: 1

# Allowlist mantida (prioridade sobre percentual)
```

**População estimada:** ~1% dos passengers ativos  
**Monitoramento:** Diário

**Critério de sucesso:**
- Taxa de erro < 0.1%
- Latência média < 150ms
- Sem regressão no matching atual

---

### Fase 3: Rollout 10% (Semana 3)
**Objetivo:** Validar comportamento em escala média

```bash
# Configuração
enabled: true
rolloutPercentage: 10
```

**População estimada:** ~10% dos passengers ativos  
**Monitoramento:** Diário

**Critério de sucesso:**
- Taxa de erro < 0.1%
- Latência P95 < 200ms
- Métricas de matching melhoradas

---

### Fase 4: Rollout 50% (Semana 4)
**Objetivo:** Preparar para ativação completa

```bash
# Configuração
enabled: true
rolloutPercentage: 50
```

**População estimada:** ~50% dos passengers ativos  
**Monitoramento:** Contínuo

**Critério de sucesso:**
- Sistema estável por 7 dias
- Métricas positivas consistentes

---

### Fase 5: Rollout 100% (Semana 5)
**Objetivo:** Ativação completa

```bash
# Configuração
enabled: true
rolloutPercentage: 100
```

**População:** Todos os passengers  
**Monitoramento:** Contínuo por 30 dias

**Critério de sucesso:**
- Sistema estável
- Métricas de matching superiores ao baseline

---

## Rollback

### Rollback Imediato (< 1 minuto)

**Opção A: Desativar via Admin UI**
1. Acessar Admin → Feature Flags
2. Clicar em "Desativar (emergência)"
3. Confirmar

**Opção B: Desativar via API**
```bash
curl -X PUT https://api.kaviar.com.br/api/admin/feature-flags/passenger_favorites_matching \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false, "rolloutPercentage": 0}'
```

**Opção C: Master Switch (env var)**
```bash
# Adicionar ao task definition
FEATURE_PASSENGER_FAVORITES_MATCHING=false

# Atualizar serviço
aws ecs update-service --cluster kaviar-prod \
  --service kaviar-backend-service \
  --force-new-deployment
```

### Rollback Gradual

**Reduzir percentual progressivamente:**
```bash
100% → 50% → 10% → 1% → 0%
```

Aguardar 5-10 minutos entre cada redução para observar métricas.

---

## Critérios de Aceite

### Funcional
- ✅ Allowlist tem prioridade absoluta
- ✅ Rollout percentual é determinístico
- ✅ Master switch OFF desliga globalmente
- ✅ Cache de 1 minuto funciona corretamente
- ✅ Audit logs registram todas as mudanças

### RBAC
- ✅ SUPER_ADMIN: GET/PUT/POST/DELETE permitido
- ✅ OPERATOR: GET/PUT/POST/DELETE permitido
- ✅ ANGEL_VIEWER: apenas GET (writes retornam 403)

### Performance
- ✅ Latência de resolver < 50ms (com cache)
- ✅ Latência de resolver < 200ms (sem cache)
- ✅ Sem impacto no matching atual quando OFF

### Auditoria
- ✅ Todas as mudanças logadas com before/after
- ✅ Admin ID registrado em todas as operações
- ✅ Timestamp preciso em todos os eventos

---

## Monitoramento

### Métricas Críticas

**Matching:**
- Taxa de sucesso de matching
- Latência P50, P95, P99
- Taxa de erro (500)

**Feature Flag:**
- Número de passengers na allowlist
- Percentual de rollout atual
- Frequência de mudanças de configuração

**Sistema:**
- CPU/Memory do backend
- Latência de queries ao DB
- Taxa de cache hit

### Alertas

**Crítico (PagerDuty):**
- Taxa de erro > 1%
- Latência P95 > 500ms
- Sistema indisponível

**Warning (Slack):**
- Taxa de erro > 0.5%
- Latência P95 > 300ms
- Mudança de configuração de feature flag

---

## Testes

### Testes Automatizados

**1. Determinismo:**
```bash
cd /home/goes/kaviar/backend
node scripts/test-feature-flag-rollout.js
```

**2. RBAC:**
```bash
cd /home/goes/kaviar/backend
SUPER_ADMIN_EMAIL=super@kaviar.com.br \
SUPER_ADMIN_PASSWORD=xxx \
ANGEL_EMAIL=angel1@kaviar.com \
ANGEL_PASSWORD=xxx \
bash scripts/test-rbac-feature-flags.sh
```

### Testes Manuais

**1. Verificar determinismo:**
```javascript
// Mesmo passenger sempre retorna mesmo resultado
const hash1 = getPassengerHash('passenger-123');
const hash2 = getPassengerHash('passenger-123');
assert(hash1 === hash2);
```

**2. Verificar allowlist:**
```javascript
// Passenger na allowlist sempre ON (mesmo com 0%)
await addToAllowlist('passenger_favorites_matching', 'passenger-123');
const enabled = await isFeatureEnabled('passenger_favorites_matching', 'passenger-123');
assert(enabled === true);
```

---

## Governança

### Segurança
- ❌ Sem credenciais em código ou docs
- ✅ Todas as operações auditadas
- ✅ RBAC aplicado em todos os endpoints
- ✅ Validação de inputs

### Qualidade
- ✅ Testes determinísticos
- ✅ Testes de RBAC
- ✅ Documentação completa
- ✅ Código revisado

### Operação
- ✅ Rollback em < 1 minuto
- ✅ Monitoramento configurado
- ✅ Alertas definidos
- ✅ Runbook de incidentes

---

## Contatos

**Responsável Técnico:** Equipe Backend  
**Responsável Produto:** Equipe Produto  
**Oncall:** PagerDuty #kaviar-backend
