# BETA MONITOR - PATCH P0: ALLOWLIST BASELINE FIX
**Data:** 2026-02-01  
**Tipo:** Patch P0 (Normalização de CONFIG_DRIFT)  
**Status:** ✅ DEPLOYED & VALIDATED

---

## 🎯 OBJETIVO

Eliminar WARN falso positivo de CONFIG_DRIFT causado por baseline de allowlist hardcoded.

---

## 🐛 PROBLEMA IDENTIFICADO

### Checkpoint Anterior (manual-run-2026-02-01T18:52)
```
Status: WARN
Alerts: 1

Alert:
  type: CONFIG_DRIFT
  severity: WARN
  message: allowlist=12, expected=10
```

### Causa Raiz
- Baseline de allowlist estava **hardcoded em 10**
- Allowlist atual cresceu para **12** (mudança legítima - Fase C adicionou 2 passageiros beta)
- Sistema interpretava crescimento como drift não autorizado

### Impacto
- Falso positivo em todos os checkpoints
- Ruído no monitoramento
- Dificuldade em identificar drifts reais

---

## 🔧 SOLUÇÃO IMPLEMENTADA

### Mudança no Código
**Arquivo:** `backend/scripts/beta-monitor-dog.js`

**Antes:**
```javascript
const expectedConfig = {
  enabled: true,
  rollout_percentage: 0,
  allowlist_count: 10,  // ❌ Hardcoded - não tolera crescimento
};

if (allowlistCount !== expectedConfig.allowlist_count) {
  checkpoint.alerts.push({
    type: 'CONFIG_DRIFT',
    severity: 'WARN',
    message: `allowlist=${allowlistCount}, expected=${expectedConfig.allowlist_count}`,
  });
  checkpoint.status = 'WARN';
}
```

**Depois:**
```javascript
const expectedConfig = {
  enabled: true,
  rollout_percentage: 0,
  min_allowlist_count: 10,  // ✅ Baseline mínimo - permite crescimento
};

// Phase 1 Beta: allowlist can grow (adding beta users), but not shrink below minimum
if (allowlistCount < expectedConfig.min_allowlist_count) {
  checkpoint.alerts.push({
    type: 'CONFIG_DRIFT',
    severity: 'WARN',
    message: `allowlist=${allowlistCount} < min=${expectedConfig.min_allowlist_count}`,
  });
  checkpoint.status = 'WARN';
}
```

### Lógica Atualizada

**Phase 1 Beta - Regras de Allowlist:**
- ✅ **Permitido:** `allowlist_count >= 10` (crescimento natural ao adicionar beta users)
- ⚠️ **WARN:** `allowlist_count < 10` (remoção não autorizada)

**Mantido drift para:**
- `rollout_percentage != 0` → WARN
- `enabled != true` → WARN

---

## 🚀 DEPLOY

### Build & Deploy
```bash
cd backend && npm run build
./deploy-ecs.sh
```

**Resultado:**
- ✅ Deploy concluído: `v1.0.20260201-155750`
- ✅ TaskDefinition: `kaviar-backend:46`

### EventBridge Update
```bash
aws events put-targets \
  --rule kaviar-beta-monitor-hourly \
  --targets file:///tmp/updated_target_p0.json \
  --region us-east-1
```

**Resultado:**
- ✅ EventBridge target atualizado para TaskDefinition:46
- ✅ Checkpoints hourly usarão código corrigido

---

## ✅ VALIDAÇÃO (DoD)

### Checkpoint Manual Executado
**Label:** `manual-run-p0-validation`  
**Timestamp:** 2026-02-01T19:00:19

### Resultado
```
[Beta Monitor Dog] Starting checkpoint: manual-run-p0-validation
Feature: passenger_favorites_matching, Phase: phase1_beta
Config: enabled=true, rollout=0%, allowlist=12
Metrics: 5xx_rate=0%
Determinism: PASS
Status: PASS, Alerts: 0
[Beta Monitor Dog] Checkpoint saved successfully
[Beta Monitor Dog] PASS - All checks passed
```

### Validação DoD

| Critério | Status | Evidência |
|----------|--------|-----------|
| Status = PASS | ✅ | `Status: PASS` |
| Alerts array vazio | ✅ | `Alerts: 0` |
| Sem CONFIG_DRIFT por allowlist=12 | ✅ | Nenhum alerta de CONFIG_DRIFT |
| Determinism PASS | ✅ | `Determinism: PASS` |
| 5xx rate = 0% | ✅ | `5xx_rate=0%` |

**✅ TODOS OS CRITÉRIOS ATENDIDOS**

---

## 📊 COMPARAÇÃO ANTES/DEPOIS

### Antes do Patch
```
Checkpoint: manual-run-2026-02-01T18:52
Config: enabled=true, rollout=0%, allowlist=12
Status: WARN
Alerts: 1
  - CONFIG_DRIFT: allowlist=12, expected=10 (severity=WARN)
```

### Depois do Patch
```
Checkpoint: manual-run-p0-validation
Config: enabled=true, rollout=0%, allowlist=12
Status: PASS
Alerts: 0
```

**Resultado:** ✅ CONFIG_DRIFT eliminado, allowlist=12 agora é aceito como válido

---

## 📝 GOVERNANÇA

### Commit
```
fix(beta-monitor): tolerate allowlist growth in phase1_beta

- Change allowlist validation from exact match to minimum threshold
- Phase 1 Beta: allowlist can grow (adding beta users) but not shrink below baseline
- Eliminates false positive WARN when allowlist increases legitimately
- Maintains drift detection for rollout_percentage and enabled flag

Validation:
- Checkpoint manual-run-p0-validation: PASS, Alerts: 0
- allowlist=12 now accepted (was triggering WARN with expected=10)
```

### Deploy Info
- **Version:** v1.0.20260201-155750
- **TaskDefinition:** kaviar-backend:46
- **EventBridge:** Updated to :46
- **Region:** us-east-1
- **Cluster:** kaviar-prod

---

## 🔄 PRÓXIMOS CHECKPOINTS

### Comportamento Esperado
- ✅ `allowlist=12` → PASS (sem CONFIG_DRIFT)
- ✅ `allowlist=13+` → PASS (crescimento permitido)
- ⚠️ `allowlist=9` → WARN (abaixo do mínimo)
- ⚠️ `rollout!=0` → WARN (drift de rollout)
- ⚠️ `enabled!=true` → WARN (drift de enabled)

### Monitoramento
- Checkpoints hourly continuarão executando automaticamente
- Próximo checkpoint hourly: ~19:00 UTC (16:00 BRT)
- Esperado: PASS com 0 alerts

---

## ✅ CONCLUSÃO

**PATCH P0 APLICADO COM SUCESSO**

- ✅ Código corrigido e deployado
- ✅ EventBridge atualizado
- ✅ Validação manual PASS
- ✅ CONFIG_DRIFT falso positivo eliminado
- ✅ Sistema pronto para Phase 2 Rollout

**Status:** ✅ **READY FOR PHASE 2 ROLLOUT**

---

**Assinatura Digital:**  
Data: 2026-02-01 16:00 BRT  
Patch: P0 - Allowlist Baseline Fix  
Validado por: Checkpoint manual-run-p0-validation
