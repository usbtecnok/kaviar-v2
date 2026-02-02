# BETA PHASE 2 - ROLLOUT 5%
**Data:** 2026-02-01  
**Fase:** E.2 - Rollout 5% (Gradual Expansion)  
**Status:** ✅ DEPLOYED & VALIDATED

---

## 🎯 OBJETIVO

Expandir rollout de 1% para 5% após validação de estabilidade.

---

## ✅ VALIDAÇÃO DE ESTABILIDADE (1%)

### Checkpoints Hourly
| Timestamp | Label | Status | 5xx Rate | Determinism | Alerts |
|-----------|-------|--------|----------|-------------|--------|
| 16:01 BRT | hourly | PASS | 0% | PASS | 0 |
| 16:29 BRT | stability-check-1pct | PASS | 0% | PASS | 0 |

### Critérios Atendidos
- ✅ Mínimo 2 checkpoints PASS
- ✅ 5xx_rate <= 1% (atual: 0%)
- ✅ determinism PASS
- ✅ Sem alerts FAIL

**Decisão:** ✅ **APROVADO PARA AVANÇAR PARA 5%**

---

## 🚀 EXECUÇÃO - ROLLOUT 5%

### 1️⃣ Update Rollout
**Comando:**
```bash
aws ecs run-task \
  --cluster kaviar-prod \
  --task-definition kaviar-backend:51 \
  --overrides '{"containerOverrides":[{"name":"kaviar-backend","command":["sh","-c","cd /app && node dist/scripts/update-rollout.js passenger_favorites_matching 5"]}]}'
```

**Logs:**
```
[Rollout] Updating passenger_favorites_matching to 5%
[Rollout] Before: enabled=true, rollout=1%
[Rollout] After: enabled=true, rollout=5%
[Rollout] ✅ Rollout updated successfully
```

**Timestamp:** 2026-02-01T19:39:34

---

### 2️⃣ Update EventBridge
**Comando:**
```bash
aws events put-targets \
  --rule kaviar-beta-monitor-hourly \
  --targets file:///tmp/eventbridge_5pct.json \
  --region us-east-1
```

**Configuração:**
```json
{
  "Input": "{\"containerOverrides\":[{\"name\":\"kaviar-backend\",\"command\":[\"node\",\"dist/scripts/beta-monitor-dog.js\",\"passenger_favorites_matching\",\"phase2_rollout\",\"hourly\",\"--expected-rollout=5\"]}]}"
}
```

**Resultado:** ✅ EventBridge atualizado para `--expected-rollout=5`

---

### 3️⃣ Validation Checkpoint
**Label:** `rollout-5pct-validation`  
**Timestamp:** 2026-02-01T19:40:33

**Resultado:**
```
[Beta Monitor Dog] Starting checkpoint: rollout-5pct-validation
Feature: passenger_favorites_matching, Phase: phase2_rollout
Config: enabled=true, rollout=5%, allowlist=12
Metrics: 5xx_rate=0%
Determinism: PASS
Expected config: rollout=5%, enabled=true
Status: PASS, Alerts: 0
[Beta Monitor Dog] Checkpoint saved successfully
[Beta Monitor Dog] PASS - All checks passed
```

---

## ✅ VALIDAÇÃO (DoD)

| Critério | Status | Evidência |
|----------|--------|-----------|
| Rollout atualizado para 5% | ✅ | `After: rollout=5%` |
| EventBridge atualizado | ✅ | `--expected-rollout=5` |
| Checkpoint validação PASS | ✅ | `Status: PASS, Alerts: 0` |
| Expected config correto | ✅ | `Expected config: rollout=5%` |
| 5xx rate = 0% | ✅ | `5xx_rate=0%` |
| Determinism PASS | ✅ | `Determinism: PASS` |

**✅ TODOS OS CRITÉRIOS ATENDIDOS**

---

## 📊 COMPARAÇÃO 1% → 5%

### Rollout 1%
```
Config: enabled=true, rollout=1%, allowlist=12
Expected: rollout=1%
Status: PASS, Alerts: 0
```

### Rollout 5%
```
Config: enabled=true, rollout=5%, allowlist=12
Expected: rollout=5%
Status: PASS, Alerts: 0
```

**Resultado:** ✅ Transição suave sem degradação

---

## 🔍 MONITORAMENTO ATIVO

### Checkpoints Hourly
- **Próximo:** ~17:00 BRT (20:00 UTC)
- **Frequência:** A cada hora
- **Esperado:** PASS com `rollout=5%`

### Gatilhos de Rollback
⚠️ **ROLLBACK IMEDIATO se:**
- 5xx_rate > 1% por 2 checkpoints consecutivos
- determinism FAIL
- Alert crítico (FAIL) inesperado

### Comando de Rollback
```bash
# Rollback para 1%
node dist/scripts/update-rollout.js passenger_favorites_matching 1

# Atualizar EventBridge
aws events put-targets --rule kaviar-beta-monitor-hourly \
  --targets '{"Input": "...--expected-rollout=1..."}'
```

---

## 📈 PRÓXIMOS PASSOS

### Janela de Monitoramento (2-4h)
- **16:40 - 18:40 BRT:** Monitorar checkpoints hourly
- **Critérios para avançar para 10%:**
  - ✅ 5xx_rate <= 1%
  - ✅ determinism PASS
  - ✅ Sem alertas FAIL
  - ✅ Mínimo 2 checkpoints PASS

### Se Estável → Rollout 10%
- **Comando:**
  ```bash
  node dist/scripts/update-rollout.js passenger_favorites_matching 10
  aws events put-targets --rule kaviar-beta-monitor-hourly \
    --targets '{"Input": "...--expected-rollout=10..."}'
  ```
- **Monitorar:** 4-6h adicionais

---

## 📝 EVIDÊNCIAS

### Timeline
| Timestamp | Evento | Status |
|-----------|--------|--------|
| 16:01 BRT | Checkpoint hourly 1% | ✅ PASS |
| 16:29 BRT | Stability check 1% | ✅ PASS |
| 16:39 BRT | Update rollout 1% → 5% | ✅ SUCCESS |
| 16:40 BRT | Update EventBridge | ✅ SUCCESS |
| 16:40 BRT | Checkpoint validação 5% | ✅ PASS |

### Requests/Responses

**Update Rollout:**
```
Task: arn:aws:ecs:us-east-1:847895361928:task/kaviar-prod/5a8900cd775d4354ac2bc23cfcb0d60c
[Rollout] Before: enabled=true, rollout=1%
[Rollout] After: enabled=true, rollout=5%
[Rollout] ✅ Rollout updated successfully
```

**Validation Checkpoint:**
```
Task: arn:aws:ecs:us-east-1:847895361928:task/kaviar-prod/427ccb4a86744736b2ccb885c79b2156
Config: enabled=true, rollout=5%, allowlist=12
Status: PASS, Alerts: 0
```

---

## 🎯 STATUS ATUAL

**✅ ROLLOUT 5% ATIVO E VALIDADO**

- ✅ Rollout configurado: 5%
- ✅ EventBridge: `--expected-rollout=5`
- ✅ Checkpoint validação: PASS
- ✅ 5xx rate: 0%
- ✅ Determinism: PASS
- ✅ Monitoramento hourly ativo

**Aguardando:** 2-4h de monitoramento antes de avançar para 10%

---

**Assinatura Digital:**  
Data: 2026-02-01 16:40 BRT  
Fase: E.2 - Rollout 5%  
Status: ✅ DEPLOYED & VALIDATED
