# BETA MONITOR - PHASE 2 BASELINE FIX
**Data:** 2026-02-01  
**Tipo:** P0 - Phase 2 Baseline (Expected Rollout)  
**Status:** ✅ DEPLOYED & VALIDATED

---

## 🎯 OBJETIVO

Eliminar WARN falso positivo de CONFIG_DRIFT causado por rollout autorizado em Phase 2.

---

## 🐛 PROBLEMA IDENTIFICADO

### Checkpoint Anterior (rollout-1pct-validation)
```
Phase: phase1_beta
Config: enabled=true, rollout=1%, allowlist=12
Status: WARN, Alerts: 1

Alert:
  type: CONFIG_DRIFT
  severity: WARN
  message: rollout=1%, expected=0%
```

### Causa Raiz
- Phase 1 Beta esperava `rollout=0%` (hardcoded)
- Phase 2 Rollout usa `rollout=1%` (intencional)
- Sistema interpretava como drift não autorizado

### Impacto
- WARN em todos os checkpoints Phase 2
- Ruído no monitoramento
- Dificuldade em identificar drifts reais (ex: rollout=7% não autorizado)

---

## 🔧 SOLUÇÃO IMPLEMENTADA

### Mudança no Código
**Arquivo:** `backend/scripts/beta-monitor-dog.js`

**Antes:**
```javascript
const PHASE = process.argv[3] || 'phase1_beta';
const CHECKPOINT_LABEL = process.argv[4] || `hourly-${...}`;

const expectedConfig = {
  enabled: true,
  rollout_percentage: 0,  // ❌ Hardcoded - não suporta Phase 2
  min_allowlist_count: 10,
};
```

**Depois:**
```javascript
const PHASE = process.argv[3] || 'phase1_beta';
const CHECKPOINT_LABEL = process.argv[4] || `hourly-${...}`;

// Parse --expected-rollout flag
const expectedRolloutArg = process.argv.find(arg => arg.startsWith('--expected-rollout='));
const EXPECTED_ROLLOUT = expectedRolloutArg 
  ? parseInt(expectedRolloutArg.split('=')[1]) 
  : (PHASE === 'phase2_rollout' ? 1 : 0);  // ✅ Automático por phase

const expectedConfig = {
  enabled: true,
  rollout_percentage: EXPECTED_ROLLOUT,  // ✅ Dinâmico
  min_allowlist_count: 10,
};

console.log(`Expected config: rollout=${expectedConfig.rollout_percentage}%, enabled=${expectedConfig.enabled}`);
```

### Lógica Atualizada

**Phase Detection:**
- `phase1_beta` → `expected_rollout=0%`
- `phase2_rollout` → `expected_rollout=1%` (default)
- `--expected-rollout=N` → Override manual

**Uso:**
```bash
# Phase 1 Beta (rollout=0%)
node dist/scripts/beta-monitor-dog.js passenger_favorites_matching phase1_beta hourly

# Phase 2 Rollout (rollout=1%)
node dist/scripts/beta-monitor-dog.js passenger_favorites_matching phase2_rollout hourly

# Phase 2 com rollout customizado (ex: 5%)
node dist/scripts/beta-monitor-dog.js passenger_favorites_matching phase2_rollout hourly --expected-rollout=5
```

---

## 🚀 DEPLOY

### Build & Deploy
```bash
cd backend && npm run build
./deploy-ecs.sh
```

**Resultado:**
- ✅ Deploy concluído: `v1.0.20260201-162306`
- ✅ TaskDefinition: `kaviar-backend:51`

### EventBridge Update
```bash
aws events put-targets \
  --rule kaviar-beta-monitor-hourly \
  --targets file:///tmp/eventbridge_phase2.json \
  --region us-east-1
```

**Configuração:**
```json
{
  "Input": "{\"containerOverrides\":[{\"name\":\"kaviar-backend\",\"command\":[\"node\",\"dist/scripts/beta-monitor-dog.js\",\"passenger_favorites_matching\",\"phase2_rollout\",\"hourly\",\"--expected-rollout=1\"]}]}"
}
```

**Resultado:**
- ✅ EventBridge atualizado para `phase2_rollout`
- ✅ Checkpoints hourly usarão `--expected-rollout=1`

---

## ✅ VALIDAÇÃO (DoD)

### Checkpoint Manual Executado
**Label:** `phase2-baseline-validation`  
**Timestamp:** 2026-02-01T19:25:25

### Resultado
```
[Beta Monitor Dog] Starting checkpoint: phase2-baseline-validation
Feature: passenger_favorites_matching, Phase: phase2_rollout
Config: enabled=true, rollout=1%, allowlist=12
Metrics: 5xx_rate=0%
Determinism: PASS
Expected config: rollout=1%, enabled=true
Status: PASS, Alerts: 0
[Beta Monitor Dog] Checkpoint saved successfully
[Beta Monitor Dog] PASS - All checks passed
```

### Validação DoD

| Critério | Status | Evidência |
|----------|--------|-----------|
| Checkpoint Phase 2 com rollout=1% = PASS | ✅ | `Status: PASS, Alerts: 0` |
| Sem WARN de CONFIG_DRIFT | ✅ | `Alerts: 0` |
| Expected config correto | ✅ | `Expected config: rollout=1%` |
| Determinism PASS | ✅ | `Determinism: PASS` |
| 5xx rate = 0% | ✅ | `5xx_rate=0%` |

**✅ TODOS OS CRITÉRIOS ATENDIDOS**

---

## 📊 COMPARAÇÃO ANTES/DEPOIS

### Antes do Patch (Phase 1 Beta)
```
Checkpoint: rollout-1pct-validation
Phase: phase1_beta
Config: enabled=true, rollout=1%, allowlist=12
Expected: rollout=0%
Status: WARN
Alerts: 1
  - CONFIG_DRIFT: rollout=1%, expected=0% (severity=WARN)
```

### Depois do Patch (Phase 2 Rollout)
```
Checkpoint: phase2-baseline-validation
Phase: phase2_rollout
Config: enabled=true, rollout=1%, allowlist=12
Expected: rollout=1%
Status: PASS
Alerts: 0
```

**Resultado:** ✅ CONFIG_DRIFT eliminado, rollout=1% agora é esperado e válido

---

## 🔍 DETECÇÃO DE DRIFT REAL

### Cenários de Drift (WARN/FAIL)

**✅ Rollout autorizado (PASS):**
```
rollout=1%, expected=1% → PASS
```

**⚠️ Rollout não autorizado (WARN):**
```
rollout=7%, expected=1% → WARN (CONFIG_DRIFT)
rollout=0%, expected=1% → WARN (CONFIG_DRIFT - rollback não autorizado)
```

**⚠️ Enabled alterado (WARN):**
```
enabled=false, expected=true → WARN (CONFIG_DRIFT)
```

**Sistema continua detectando drifts reais!**

---

## 📝 GOVERNANÇA

### Commit
```
fix(beta-monitor): support phase2_rollout with expected-rollout flag

- Add --expected-rollout flag to beta-monitor-dog.js
- Auto-detect expected rollout based on phase (phase1_beta=0, phase2_rollout=1)
- Allow manual override via --expected-rollout=N
- Update EventBridge to use phase2_rollout with --expected-rollout=1
- Eliminates false positive WARN for authorized rollout changes

Validation:
- Checkpoint phase2-baseline-validation: PASS, Alerts: 0
- rollout=1% now accepted as expected (was triggering WARN)
- Drift detection still works for unauthorized changes
```

### Deploy Info
- **Version:** v1.0.20260201-162306
- **TaskDefinition:** kaviar-backend:51
- **EventBridge:** Updated to phase2_rollout
- **Region:** us-east-1
- **Cluster:** kaviar-prod

---

## 🔄 PRÓXIMOS CHECKPOINTS

### Comportamento Esperado (Phase 2 Rollout)
- ✅ `rollout=1%` → PASS (esperado)
- ⚠️ `rollout!=1%` → WARN (drift não autorizado)
- ⚠️ `enabled!=true` → WARN (drift de enabled)
- ✅ `allowlist>=10` → PASS (crescimento permitido)

### Quando Avançar para 5%
```bash
# 1. Atualizar rollout no banco
node dist/scripts/update-rollout.js passenger_favorites_matching 5

# 2. Atualizar EventBridge
aws events put-targets --rule kaviar-beta-monitor-hourly \
  --targets '{"Input": "...--expected-rollout=5..."}'

# 3. Validar checkpoint
node dist/scripts/beta-monitor-dog.js passenger_favorites_matching phase2_rollout manual --expected-rollout=5
```

---

## ✅ CONCLUSÃO

**PHASE 2 BASELINE APLICADO COM SUCESSO**

- ✅ Código corrigido e deployado
- ✅ EventBridge atualizado para phase2_rollout
- ✅ Validação manual PASS sem WARN
- ✅ CONFIG_DRIFT falso positivo eliminado
- ✅ Drift detection funcional para mudanças não autorizadas
- ✅ Sistema pronto para monitoramento Phase 2

**Status:** ✅ **PHASE 2 ROLLOUT 1% - MONITORAMENTO LIMPO**

---

**Assinatura Digital:**  
Data: 2026-02-01 16:25 BRT  
Patch: P0 - Phase 2 Baseline  
Validado por: Checkpoint phase2-baseline-validation
