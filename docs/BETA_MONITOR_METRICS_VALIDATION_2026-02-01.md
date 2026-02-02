# Beta Monitor - Metrics Validation & API Fix
**Date:** 2026-02-01  
**Time:** 12:59 BRT (15:59 UTC)  
**Status:** ✅ VALIDATED

---

## Objetivo

Validar que o Beta Monitor exibe métricas completas no modal "Detalhes" e corrigir mapeamento de campos da API.

---

## Problema Identificado

**Sintoma:**
- Modal "Detalhes" mostrava `metrics: null`, `config: null`, `determinism: null`, `alerts: null`
- Dados existiam no banco de dados

**Causa Raiz:**
- Database schema usa campos com underscore: `metrics_json`, `config_json`, `determinism_json`, `alerts_json`
- Controller retornava objeto direto do Prisma (com underscores)
- Frontend esperava campos sem underscore: `metrics`, `config`, `determinism`, `alerts`

---

## Solução

### Fix no Controller

**Arquivo:** `backend/src/controllers/admin/betaMonitor.controller.ts`

**Mudança:**
```typescript
// Antes
res.json({
  success: true,
  checkpoint,
});

// Depois
const response = {
  id: checkpoint.id,
  feature_key: checkpoint.feature_key,
  phase: checkpoint.phase,
  checkpoint_label: checkpoint.checkpoint_label,
  created_at: checkpoint.created_at,
  status: checkpoint.status,
  metrics: checkpoint.metrics_json,      // ← Mapeamento
  config: checkpoint.config_json,        // ← Mapeamento
  determinism: checkpoint.determinism_json, // ← Mapeamento
  alerts: checkpoint.alerts_json,        // ← Mapeamento
  notes: checkpoint.notes,
};

res.json({
  success: true,
  checkpoint: response,
});
```

---

## Validação Pós-Fix

### 1. Checkpoint Detail API

**Request:**
```bash
GET /api/admin/beta-monitor/passenger_favorites_matching/checkpoints/{id}
```

**Response:**
```json
{
  "status": "PASS",
  "metrics": {
    "status_2xx": 0,
    "status_3xx": 0,
    "status_401": 0,
    "status_403": 0,
    "status_429": 0,
    "status_4xx": 0,
    "status_5xx": 0,
    "error_rate_5xx": 0,
    "total_requests": 0,
    "error_rate_total": 0,
    "matching_requests": 0,
    "feature_flag_requests": 0
  },
  "config": {
    "enabled": true,
    "updated_at": "2026-02-01T04:52:50.531Z",
    "allowlist_count": 10,
    "rollout_percentage": 0
  },
  "determinism": {
    "results": [
      {
        "expected": true,
        "in_allowlist": true,
        "passenger_id": "pass_beta_001_2026"
      },
      {
        "expected": true,
        "in_allowlist": true,
        "passenger_id": "pass_beta_005_2026"
      }
    ],
    "test_ids": [
      "pass_beta_001_2026",
      "pass_beta_005_2026"
    ]
  },
  "alerts": []
}
```

✅ **Todos os campos retornados corretamente**

### 2. Modal UI (Esperado)

**Config:**
```json
{
  "enabled": true,
  "rollout_percentage": 0,
  "allowlist_count": 10,
  "updated_at": "2026-02-01T04:52:50.531Z"
}
```

**Metrics:**
```json
{
  "total_requests": 0,
  "feature_flag_requests": 0,
  "matching_requests": 0,
  "status_2xx": 0,
  "status_3xx": 0,
  "status_4xx": 0,
  "status_5xx": 0,
  "error_rate_total": 0,
  "error_rate_5xx": 0
}
```

**Determinism:**
```json
{
  "test_ids": ["pass_beta_001_2026", "pass_beta_005_2026"],
  "results": [
    {"passenger_id": "pass_beta_001_2026", "expected": true, "in_allowlist": true},
    {"passenger_id": "pass_beta_005_2026", "expected": true, "in_allowlist": true}
  ]
}
```

**Alerts:**
```json
[]
```

---

## Observações sobre Métricas

### Métricas Atuais (Todas Zero)

**Motivo:**
- Feature `passenger_favorites_matching` ainda não tem endpoints implementados
- Não há tráfego real para a feature
- Dog script coleta métricas de logs do CloudWatch (filtro por feature_key)
- Sem logs → métricas = 0

### Como Gerar Tráfego (Futuro)

Quando a feature tiver endpoints implementados:

1. **Passenger App:**
   - Salvar favorito: `POST /api/passenger/favorites`
   - Listar favoritos: `GET /api/passenger/favorites`
   - Solicitar matching: `POST /api/passenger/request-ride` (com favorito)

2. **Verificar Logs:**
   - CloudWatch `/ecs/kaviar-backend`
   - Filtro: `passenger_favorites_matching`

3. **Executar Checkpoint:**
   - Manual: Clicar "Executar Agora" na UI
   - Automático: Aguardar EventBridge hourly

4. **Validar Métricas:**
   - `total_requests > 0`
   - `feature_flag_requests > 0`
   - `matching_requests > 0`
   - `status_2xx > 0`

---

## Checkpoint Automático (EventBridge)

### Status Atual

**EventBridge Rule:** `kaviar-beta-monitor-hourly`
- Schedule: `rate(1 hour)`
- State: `ENABLED`
- Target: ECS RunTask (kaviar-backend:37)
- Command: `["node","dist/scripts/beta-monitor-dog.js","passenger_favorites_matching","phase1_beta","hourly"]`

### Validação Pendente

**Próxima Execução:** Dentro de 1 hora (desde último checkpoint manual)

**Como Validar:**
1. Aguardar 1 hora
2. Verificar CloudWatch logs: `/ecs/kaviar-backend`
   - Buscar: `[Beta Monitor Dog] Starting checkpoint: hourly`
3. Verificar UI: Novo checkpoint com label contendo "hourly"
4. Verificar banco: `checkpoint_label LIKE '%hourly%'`

---

## Deploy

### Commit
```
4fc63a4 fix(beta-monitor): map database fields to API response in checkpoint detail
```

### Task Definition
- **Revision:** kaviar-backend:37
- **Status:** ACTIVE, RUNNING
- **Image Digest:** `sha256:99afb611e005744acfc491d85060116d0807f252601c3025f82b3982f20e930b`

---

## Checklist de Validação

- [x] API retorna `metrics` (não `metrics_json`)
- [x] API retorna `config` (não `config_json`)
- [x] API retorna `determinism` (não `determinism_json`)
- [x] API retorna `alerts` (não `alerts_json`)
- [x] Modal UI pode renderizar dados completos
- [x] Config mostra enabled=true, allowlist=10
- [x] Determinism mostra 2 passageiros in_allowlist=true
- [x] Alerts mostra array vazio (sem alertas)
- [ ] Checkpoint automático (aguardar 1 hora)
- [ ] Métricas > 0 (aguardar implementação de endpoints)

---

## Próximos Passos

### FASE B - Validar Automação
1. ⏳ Aguardar próxima execução do EventBridge (< 1 hora)
2. ⏳ Confirmar checkpoint com label "hourly" no histórico
3. ⏳ Verificar CloudWatch logs do dog script

### FASE C - Gerar Tráfego Real
1. ⏳ Implementar endpoints da feature (POST /favorites, GET /favorites)
2. ⏳ Gerar tráfego com passageiros do allowlist
3. ⏳ Executar checkpoint manual
4. ⏳ Validar métricas > 0 no modal

---

**Status:** ✅ API FIX DEPLOYED  
**Task Definition:** kaviar-backend:37  
**Commit:** 4fc63a4  
**Deploy Time:** 2026-02-01 16:02 UTC
