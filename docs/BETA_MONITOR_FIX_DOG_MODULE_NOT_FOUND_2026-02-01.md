# Beta Monitor Fix - MODULE_NOT_FOUND
**Date:** 2026-02-01  
**Time:** 12:34 BRT (15:34 UTC)  
**Status:** ✅ RESOLVED

---

## Incidente Crítico

**Sintoma:**
- POST /api/admin/beta-monitor/.../run retorna 200 "Checkpoint iniciado"
- GET /api/admin/beta-monitor/.../checkpoints retorna []
- UI histórico vazio

**Erro CloudWatch:**
```
Error: Cannot find module '/app/dist/scripts/beta-monitor-dog.js'
code: 'MODULE_NOT_FOUND'
(Node.js v20.20.0)
```

---

## Causa Raiz

**Problema:**
- Script `beta-monitor-dog.js` localizado em `backend/scripts/` (fora de `src/`)
- TypeScript build (`tsc`) não compila arquivos fora de `src/`
- Dockerfile copia `dist/` mas `dist/scripts/beta-monitor-dog.js` não existe
- Controller tenta executar `node /app/dist/scripts/beta-monitor-dog.js` → MODULE_NOT_FOUND

**Arquivos Afetados:**
- `scripts/beta-monitor-dog.js`
- `scripts/beta-phase1-checkpoint.sh`
- `scripts/beta-phase1-go-nogo.sh`
- `scripts/beta-phase2-activate.sh`

---

## Solução

### 1. Adicionar postbuild Script

**Arquivo:** `backend/package.json`

```json
"scripts": {
  "build": "tsc -p tsconfig.build.json",
  "postbuild": "mkdir -p dist/scripts && cp scripts/beta-monitor-dog.js dist/scripts/ && cp scripts/beta-phase1-checkpoint.sh dist/scripts/ && cp scripts/beta-phase1-go-nogo.sh dist/scripts/ && cp scripts/beta-phase2-activate.sh dist/scripts/"
}
```

**Efeito:**
- Após `npm run build`, scripts são copiados para `dist/scripts/`
- Docker image contém `/app/dist/scripts/beta-monitor-dog.js`

### 2. Fix Secundário - ADMIN_DEFAULT_PASSWORD

**Problema Adicional:**
- Security fix anterior removeu fallback `admin123`
- Produção não tinha `ADMIN_DEFAULT_PASSWORD` env var
- Task 35 falhou com: `Error: ADMIN_DEFAULT_PASSWORD must be set in production`

**Solução:**
- Criado secret: `/kaviar/prod/admin-default-password`
- Adicionado à task definition 36

---

## Validação Local

```bash
# 1. Rebuild
cd backend
rm -rf dist && npm run build

# 2. Verificar arquivos copiados
ls -lh dist/scripts/
# Output:
# beta-monitor-dog.js (5.9K)
# beta-phase1-checkpoint.sh (12K)
# beta-phase1-go-nogo.sh (3.2K)
# beta-phase2-activate.sh (4.5K)

# 3. Teste local
node dist/scripts/beta-monitor-dog.js passenger_favorites_matching phase1_beta test-local
# Output:
# [Beta Monitor Dog] Starting checkpoint: test-local
# [Beta Monitor Dog] Checkpoint saved successfully
# [Beta Monitor Dog] FAIL - Rollback triggers detected
```

---

## Deploy

### Commit
```
4ff22ad fix(beta-monitor): ensure dog script shipped in dist image
```

### Docker Image
```bash
docker build -t kaviar-backend:latest .
docker tag kaviar-backend:latest 847895361928.dkr.ecr.us-east-1.amazonaws.com/kaviar-backend:latest
docker push 847895361928.dkr.ecr.us-east-1.amazonaws.com/kaviar-backend:latest
```

**Digest:** `sha256:61815e58602072b3508bace22ea9443029bb4e6452e13ab7122d3251e7266335`

### Task Definitions

**Task 35:** ❌ Failed (missing ADMIN_DEFAULT_PASSWORD)  
**Task 36:** ✅ Success (with ADMIN_DEFAULT_PASSWORD secret)

**Secrets Added:**
```json
{
  "name": "ADMIN_DEFAULT_PASSWORD",
  "valueFrom": "arn:aws:secretsmanager:us-east-1:847895361928:secret:/kaviar/prod/admin-default-password-Zw2BGU"
}
```

---

## Prova Pós-Deploy

### 1. Checkpoint Execution
```bash
POST /api/admin/beta-monitor/passenger_favorites_matching/run
Response:
{
  "success": true,
  "message": "Checkpoint iniciado",
  "label": "manual-run-2026-02-01T15:51"
}
```

### 2. Checkpoint Persistence
```bash
GET /api/admin/beta-monitor/passenger_favorites_matching/checkpoints?limit=5
Response:
{
  "success": true,
  "count": 1,
  "latest": {
    "label": null,
    "status": "PASS",
    "created_at": "2026-02-01T15:51:05.893Z"
  }
}
```

✅ **Checkpoint salvo no banco de dados**

### 3. CloudWatch Logs
```
2026-02-01T15:51:05 [Beta Monitor Dog] Starting checkpoint: manual-run-2026-02-01T15:51
2026-02-01T15:51:05 [Beta Monitor Dog] Feature: passenger_favorites_matching, Phase: phase1_beta
2026-02-01T15:51:05 [Beta Monitor Dog] Config: enabled=true, rollout=0%, allowlist=10
2026-02-01T15:51:05 [Beta Monitor Dog] Metrics: 5xx_rate=0%
2026-02-01T15:51:05 [Beta Monitor Dog] Determinism: PASS
2026-02-01T15:51:05 [Beta Monitor Dog] Status: PASS, Alerts: 0
2026-02-01T15:51:05 [Beta Monitor Dog] Checkpoint saved successfully
2026-02-01T15:51:05 [Beta Monitor Dog] PASS - All checks passed
```

✅ **Sem MODULE_NOT_FOUND**

---

## Checklist de Validação

- [x] Script copiado para dist/scripts/ no build
- [x] Docker image contém /app/dist/scripts/beta-monitor-dog.js
- [x] Teste local executa sem MODULE_NOT_FOUND
- [x] Task definition 36 deployed com ADMIN_DEFAULT_PASSWORD
- [x] POST /run retorna 200
- [x] GET /checkpoints retorna checkpoint salvo
- [x] CloudWatch logs mostram execução bem-sucedida
- [x] Sem MODULE_NOT_FOUND em produção

---

## Impacto

**Antes:**
- ❌ Checkpoints não eram salvos
- ❌ Dog script falhava com MODULE_NOT_FOUND
- ❌ Histórico vazio no UI

**Depois:**
- ✅ Checkpoints salvos no banco
- ✅ Dog script executa corretamente
- ✅ Histórico populado no UI

---

## Lições Aprendidas

1. **Scripts fora de src/ não são compilados pelo TypeScript**
   - Solução: postbuild script para copiar arquivos necessários

2. **Security fixes podem quebrar produção**
   - Solução: Sempre adicionar env vars/secrets necessários antes de deploy

3. **Validação local é essencial**
   - Teste `node dist/scripts/...` antes de deploy

---

**Status:** ✅ RESOLVED  
**Task Definition:** kaviar-backend:36  
**Commit:** 4ff22ad  
**Deploy Time:** 2026-02-01 15:51 UTC
