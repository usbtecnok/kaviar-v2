# OPS SNAPSHOT - 2026-02-03 19:12 BRT

## 🎯 Propósito
Snapshot operacional antes de corrigir config drift e TODOs críticos.
Permite rollback completo do estado de produção.

---

## 📦 Git State

**Commit SHA:** `44ca2f04f368187240de0baf66d6f08e2d82ce34`  
**Branch:** `main`  
**Tag:** `snapshot-2026-02-03`  
**Backup Branch:** `backup/snapshot-2026-02-03`

**Último Commit:**
```
chore(snapshot): state before drift fix + analysis (2026-02-03)
```

---

## 🚀 Feature Flags (Database)

### passenger_favorites_matching
```json
{
  "key": "passenger_favorites_matching",
  "enabled": true,
  "rollout_percentage": 1,
  "updated_at": "2026-02-03T13:29:22.330Z",
  "created_at": "2026-02-01T04:33:58.711Z"
}
```

**Allowlist:** 12 passengers

---

## 📊 Beta Monitor Checkpoints (Últimos 3)

### 1. 2026-02-03 19:05 BRT
- Status: **PASS** ✅
- Phase: `phase2_rollout`
- Label: `manual`

### 2. 2026-02-03 10:29 BRT
- Status: **PASS** ✅
- Phase: `ROLLOUT_1PCT`
- Label: `final-check`

### 3. 2026-02-03 10:27 BRT
- Status: **WARN** ⚠️
- Phase: `ROLLOUT_1PCT`
- Label: `smoke-test-final`
- Motivo: Config drift (esperava rollout=1%, encontrou 5% - FALSO POSITIVO)

---

## 🔍 Análise do Drift

**Situação Real:**
- Rollout no banco: **1%** ✅
- Checkpoints esperando: **1%** ✅
- WARNs anteriores: Falso positivo (config_json mostrava 5% temporariamente)

**Conclusão:** NÃO há drift real. Sistema está consistente em 1%.

---

## 🏗️ Infraestrutura AWS

### ECS Task Definition
```bash
# Obter revision atual:
aws ecs describe-services \
  --cluster kaviar-cluster \
  --services kaviar-backend \
  --region us-east-2 \
  --query 'services[0].taskDefinition'
```

### RDS
- Instance: `kaviar-db`
- Engine: PostgreSQL 15.x
- Region: us-east-2

### Environment Variables (ECS)
```bash
# Verificar em:
aws ecs describe-task-definition \
  --task-definition kaviar-backend \
  --region us-east-2 \
  --query 'taskDefinition.containerDefinitions[0].environment'
```

---

## 📝 TODOs Críticos Identificados

### Alta Prioridade (23 total)
1. `incentive.ts`: Serviço depende de models removidos
2. `pricing.ts`: Usando valores hardcoded
3. `guide-auth.ts`: Falta password_hash
4. `admin/service.ts`: CommunityActivationService desativado

---

## 🔄 Rollback Instructions

### Rollback de Código
```bash
# Voltar para este snapshot
cd ~/kaviar
git checkout snapshot-2026-02-03

# Ou usar a branch de backup
git checkout backup/snapshot-2026-02-03
```

### Rollback de Feature Flag
```bash
# Se precisar desabilitar
cd ~/kaviar/backend
node dist/scripts/update-rollout.js passenger_favorites_matching 0
```

### Rollback de Database
```bash
# Backup antes de qualquer migration
pg_dump $DATABASE_URL > backup-2026-02-03.sql
```

---

## ✅ Validação Pós-Rollback

```bash
# 1. Verificar commit
git rev-parse HEAD
# Deve retornar: 44ca2f04f368187240de0baf66d6f08e2d82ce34

# 2. Verificar feature flag
node scripts/rollout-status.js
# Deve mostrar: rollout=1%, enabled=true

# 3. Verificar checkpoints
node dist/scripts/beta-monitor-dog.js passenger_favorites_matching phase2_rollout manual --expected-rollout=1
# Deve retornar: PASS
```

---

## 📞 Contatos de Emergência

**Responsável:** goes  
**Data:** 2026-02-03  
**Timezone:** America/Sao_Paulo (BRT)

---

## 🔐 Segurança

⚠️ Este arquivo NÃO contém:
- Senhas ou secrets
- Dados pessoais (PII)
- Tokens de API
- Connection strings completas

Todos os valores sensíveis estão em:
- AWS SSM Parameter Store
- ECS Task Definition (encrypted)
- `.env` (não versionado)
