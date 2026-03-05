# 📋 PR1: VERSIONING - EXECUÇÃO SIMPLIFICADA
**Data:** 2026-03-01 14:55 BRT  
**Objetivo:** Garantir rastreabilidade de versão em produção (abordagem simples)  
**Risco:** 🟢 BAIXO

---

## ✅ ESTADO ATUAL

**Produção:**
```bash
$ curl https://api.kaviar.com.br/api/health | jq .version
"57502ff7441d9f03fdfcc73e2cdcfad5556da95d"
```

**Código atual (backend/src/app.ts):**
```typescript
version: process.env.GIT_COMMIT || 'unknown'
```

**Status:** ✅ **JÁ IMPLEMENTADO**

---

## 🎯 AJUSTE PROPOSTO (OPCIONAL)

### Problema
- Usa `GIT_COMMIT` (específico)
- Pode não estar setado em todos os ambientes

### Solução: Fallback múltiplo
```typescript
version: process.env.GIT_SHA || process.env.GIT_COMMIT || process.env.SOURCE_VERSION || 'unknown'
```

**Vantagens:**
- Compatível com múltiplos pipelines (GitHub Actions, GitLab CI, AWS CodeBuild)
- Fallback robusto
- Sem mudança em Dockerfile/build

---

## 📋 CHECKLIST DE EXECUÇÃO

### PASSO 1: Atualizar código (se necessário)

**Arquivo:** `backend/src/app.ts`

**Mudança:**
```diff
- version: process.env.GIT_COMMIT || 'unknown',
+ version: process.env.GIT_SHA || process.env.GIT_COMMIT || process.env.SOURCE_VERSION || 'unknown',
```

**Commit:**
```bash
git add backend/src/app.ts
git commit -m "feat(health): add fallback for version env vars (GIT_SHA, SOURCE_VERSION)"
```

---

### PASSO 2: Testar localmente

**Teste 1: Com GIT_SHA**
```bash
cd backend
GIT_SHA=$(git rev-parse --short HEAD) npm run dev

# Em outro terminal:
curl http://localhost:3001/api/health | jq .version
# Esperado: "b05022e" (SHA curto)
```

**Teste 2: Com GIT_COMMIT (atual)**
```bash
GIT_COMMIT=$(git rev-parse HEAD) npm run dev

curl http://localhost:3001/api/health | jq .version
# Esperado: "b05022e..." (SHA completo)
```

**Teste 3: Sem env (fallback)**
```bash
npm run dev

curl http://localhost:3001/api/health | jq .version
# Esperado: "unknown"
```

---

### PASSO 3: Atualizar ECS Task Definition

**Opção A: Via AWS Console**
1. ECS → Task Definitions → kaviar-backend
2. Create new revision
3. Container → Environment variables
4. Adicionar: `GIT_SHA = b05022e` (SHA do commit atual)
5. Create

**Opção B: Via CLI**
```bash
# 1. Obter SHA atual
GIT_SHA=$(git rev-parse --short HEAD)
echo "GIT_SHA=$GIT_SHA"

# 2. Baixar task definition atual
aws ecs describe-task-definition \
  --task-definition kaviar-backend \
  --region us-east-2 \
  --query 'taskDefinition' > /tmp/taskdef.json

# 3. Adicionar GIT_SHA ao environment
jq --arg SHA "$GIT_SHA" \
  '.containerDefinitions[0].environment += [{"name":"GIT_SHA","value":$SHA}]' \
  /tmp/taskdef.json > /tmp/taskdef-new.json

# 4. Remover campos read-only
jq 'del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy)' \
  /tmp/taskdef-new.json > /tmp/taskdef-clean.json

# 5. Registrar nova task definition
aws ecs register-task-definition \
  --cli-input-json file:///tmp/taskdef-clean.json \
  --region us-east-2
```

---

### PASSO 4: Deploy (se houver mudança no código)

**Build:**
```bash
cd backend
npm run build

# Verificar dist/
ls -lh dist/app.js
```

**Docker:**
```bash
# Build
docker build -t kaviar-backend:v1.1.0 .

# Tag
GIT_SHA=$(git rev-parse --short HEAD)
docker tag kaviar-backend:v1.1.0 \
  847895361928.dkr.ecr.us-east-2.amazonaws.com/kaviar-backend:v1.1.0-$GIT_SHA

# Push
aws ecr get-login-password --region us-east-2 | \
  docker login --username AWS --password-stdin \
  847895361928.dkr.ecr.us-east-2.amazonaws.com

docker push 847895361928.dkr.ecr.us-east-2.amazonaws.com/kaviar-backend:v1.1.0-$GIT_SHA
```

**ECS Update:**
```bash
# Atualizar service com nova task definition
aws ecs update-service \
  --cluster kaviar-cluster \
  --service kaviar-backend-service \
  --task-definition kaviar-backend:160 \
  --force-new-deployment \
  --region us-east-2
```

---

### PASSO 5: Validação pós-deploy

**Teste 1: Health check**
```bash
curl https://api.kaviar.com.br/api/health | jq '{version, status, uptime}'

# Esperado:
# {
#   "version": "b05022e",
#   "status": "ok",
#   "uptime": 123.45
# }
```

**Teste 2: CloudWatch Logs**
```bash
aws logs tail /ecs/kaviar-backend \
  --since 5m \
  --region us-east-2 \
  --filter-pattern "version" | head -10

# Verificar: sem erros, version aparece nos logs
```

**Teste 3: ECS Task**
```bash
# Verificar env vars na task rodando
TASK_ARN=$(aws ecs list-tasks \
  --cluster kaviar-cluster \
  --service-name kaviar-backend-service \
  --region us-east-2 \
  --query 'taskArns[0]' --output text)

aws ecs describe-tasks \
  --cluster kaviar-cluster \
  --tasks $TASK_ARN \
  --region us-east-2 \
  --query 'tasks[0].containers[0].environment' | grep -i git
```

---

## 🚦 CRITÉRIOS GO/NO-GO

### ✅ GO (pode deployar)
- [ ] Testes locais passaram (3 cenários)
- [ ] Build sem erros
- [ ] Task definition atualizada com GIT_SHA
- [ ] Code review OK (se houver mudança)
- [ ] Horário comercial (seg-sex 10h-16h BRT)

### 🛑 NO-GO (NÃO deployar)
- [ ] Testes locais falharam
- [ ] Erro no build
- [ ] Fora do horário comercial
- [ ] Outro deploy em andamento

---

## 📊 ROLLBACK PLAN

**Se algo der errado:**

```bash
# 1. Reverter para task definition anterior
aws ecs update-service \
  --cluster kaviar-cluster \
  --service kaviar-backend-service \
  --task-definition kaviar-backend:159 \
  --force-new-deployment \
  --region us-east-2

# 2. Verificar rollback
curl https://api.kaviar.com.br/api/health | jq .version

# 3. Aguardar rollout
aws ecs wait services-stable \
  --cluster kaviar-cluster \
  --services kaviar-backend-service \
  --region us-east-2
```

**Tempo de rollback:** ~2 minutos

---

## 📝 EVIDÊNCIAS FINAIS

**Antes:**
```json
{
  "version": "57502ff7441d9f03fdfcc73e2cdcfad5556da95d",
  "status": "ok"
}
```

**Depois (se aplicar mudança):**
```json
{
  "version": "b05022e",
  "status": "ok"
}
```

**Registro:**
```bash
# Salvar evidência
curl https://api.kaviar.com.br/api/health > /tmp/health-after-pr1.json
git log -1 --oneline > /tmp/commit-pr1.txt
```

---

## ⏱️ TEMPO ESTIMADO

- **Mudança código:** 5 min (se necessário)
- **Testes locais:** 10 min
- **Build + Push:** 10 min
- **Deploy ECS:** 5 min
- **Validação:** 5 min

**Total:** 35 minutos

---

## 🎯 DECISÃO FINAL

**RECOMENDAÇÃO:** ✅ **NÃO FAZER NADA**

**Motivo:**
- Produção já retorna version corretamente
- Usa `GIT_COMMIT` (funciona)
- Adicionar fallbacks é opcional (nice-to-have)
- Risco > benefício para mudança cosmética

**Se quiser adicionar fallbacks:**
- Fazer em PR separado
- Testar em staging primeiro
- Deploy em horário comercial

---

**Gerado por:** Kiro CLI  
**Timestamp:** 2026-03-01T14:55:01-03:00  
**Status:** ✅ VERSIONING JÁ IMPLEMENTADO
