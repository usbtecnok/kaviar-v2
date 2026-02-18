# Decisão: Deploy "Produção Inativa" - APROVADO COM GUARDS

## A) Recomendação Final: **PRODUÇÃO INATIVA APROVADA**

### ✅ Workflow NÃO tem migration automática
- Confirmado: deploy-backend.yml apenas build + push + ECS update
- Migration é **manual** (seguro para prod inativa)

### ✅ Guards de segurança adicionados (commit a3a3858)
1. **Feature flag**: `FEATURE_SPEC_RIDE_FLOW_V1=false` (default)
   - Rotas `/api/v2/*` só montam se flag=true
   - Prod: flag ausente → endpoints retornam 404
2. **Validação FATAL**: DEV_* flags em prod → `process.exit(1)`
   - Previne acidente de configuração
   - Logs: `❌ FATAL: DEV simulation flags detected in production`

### Risco residual: **BAIXO**
- Código novo não executa (rotas não montadas)
- Migration não aplicada (tabelas não existem)
- DEV simulation bloqueada (fatal error)

---

## B) Plano de Deploy "Produção Inativa"

### Passo 1: Merge para main
```bash
cd /home/goes/kaviar
git checkout main
git pull origin main

# Merge squash (3 commits em 1)
git merge --squash feat/dev-load-test-ride-flow-v1
git commit -m "feat(ride-flow-v1): Add SPEC_RIDE_FLOW_V1 infrastructure (INACTIVE)

- Add rides_v2, ride_offers, driver_locations, driver_status schema
- Add dispatcher service with geofence boost logic
- Add real-time SSE for driver offers
- Add DEV simulation tools (guarded by NODE_ENV !== 'production')
- Add production safety guards (FEATURE_SPEC_RIDE_FLOW_V1 flag + FATAL validation)

PRODUCTION STATUS: INACTIVE
- FEATURE_SPEC_RIDE_FLOW_V1=false (default) → endpoints not mounted
- Migration NOT applied (tables don't exist yet)
- DEV_* flags cause fatal error in production
- All new endpoints (/api/v2/rides, /api/v2/drivers) return 404

Commits included:
- b90191e: feat(dev): Add DEV load test simulation
- b6bd86a: chore(repo): remove accidental backend/PORT=3003 file
- a3a3858: feat(security): Add production safety guards

Next steps:
1. Deploy to staging first
2. Apply migration in staging
3. Validate 24-48h
4. Apply migration in prod (manual)
5. Enable FEATURE_SPEC_RIDE_FLOW_V1=true when ready"

# Push (dispara deploy automático)
git push origin main
```

### Passo 2: Monitorar deploy
```bash
# Acompanhar GitHub Actions
# https://github.com/seu-repo/actions

# Aguardar:
# - Build Docker: ~3-5 min
# - Push ECR: ~1-2 min
# - ECS deployment: ~5-10 min
# Total: ~10-15 min
```

### Passo 3: Validar ECS Task Definition
```bash
# Verificar que NÃO existem:
aws ecs describe-task-definition \
  --task-definition kaviar-backend \
  --region us-east-2 \
  --query 'taskDefinition.containerDefinitions[0].environment[?starts_with(name, `DEV_`)]'

# Esperado: [] (vazio)

# Verificar que NÃO existe:
aws ecs describe-task-definition \
  --task-definition kaviar-backend \
  --region us-east-2 \
  --query 'taskDefinition.containerDefinitions[0].environment[?name==`FEATURE_SPEC_RIDE_FLOW_V1`]'

# Esperado: [] (vazio, usa default false)
```

---

## C) Checklist Pós-Deploy

### 1. Health check básico
```bash
curl https://api.kaviar.com/api/health
# Esperado: {"status":"ok"}
```

### 2. Verificar que endpoints novos retornam 404 (não montados)
```bash
curl -i https://api.kaviar.com/api/v2/rides
# Esperado: 404 Not Found (não 401, porque rota não existe)

curl -i https://api.kaviar.com/api/v2/drivers/me/availability
# Esperado: 404 Not Found
```

### 3. Verificar logs CloudWatch (primeiros 5 min)
```bash
# Buscar por:
✅ "🗄️  Database: kaviar-prod-db" (confirma conexão prod)
✅ "📊 Environment: production" (confirma NODE_ENV)
✅ "⚠️  SPEC_RIDE_FLOW_V1: DISABLED" (confirma flag off)

# NÃO deve ter:
❌ "[DEV_AUTO_ACCEPT]"
❌ "[DEV_GEOFENCE_BOOST]"
❌ "❌ FATAL: DEV simulation flags detected"
```

### 4. Verificar que fluxo antigo ainda funciona
```bash
# Endpoint antigo de rides (se existir)
curl -H "Authorization: Bearer $PROD_TOKEN" https://api.kaviar.com/api/rides
# Esperado: resposta normal (não erro)

# Admin panel
curl https://api.kaviar.com/api/admin/health
# Esperado: 200 OK
```

---

## D) Guards de Segurança (Como Garantir)

### 1. Feature Flag (app.ts)
```typescript
if (process.env.FEATURE_SPEC_RIDE_FLOW_V1 === 'true') {
  app.use('/api/v2/rides', ridesV2Routes);
  // ...
} else {
  console.log('⚠️  SPEC_RIDE_FLOW_V1: DISABLED');
}
```

**Garantia:**
- Default: `false` (flag ausente)
- Prod: flag não configurada → rotas não montam → 404

### 2. Validação FATAL (server.ts)
```typescript
if (process.env.NODE_ENV === 'production') {
  const devFlags = ['DEV_AUTO_ACCEPT', 'DEV_AUTO_RELEASE', ...];
  const found = devFlags.filter(flag => process.env[flag] === 'true' || ...);
  
  if (found.length > 0) {
    console.error(`❌ FATAL: DEV simulation flags detected: ${found.join(', ')}`);
    process.exit(1);
  }
}
```

**Garantia:**
- Qualquer DEV_* flag em prod → crash imediato
- ECS health check falha → rollback automático
- Logs CloudWatch mostram erro fatal

### 3. Guards no código (dispatcher.service.ts)
```typescript
if (process.env.NODE_ENV !== 'production' && process.env.DEV_AUTO_ACCEPT === 'true') {
  // Simulação DEV
}
```

**Garantia:**
- Dupla verificação: NODE_ENV + flag
- Mesmo se flag vazar, NODE_ENV=production bloqueia

### 4. Migration manual
**Garantia:**
- Workflow não aplica migration
- Tabelas não existem em prod
- Código não pode acessar tabelas inexistentes

---

## E) Rollback Plan (Se Necessário)

### Se deploy falhar:
```bash
# GitHub Actions faz rollback automático se health check falhar
# Ou manual:
aws ecs update-service \
  --cluster kaviar-cluster \
  --service kaviar-backend-service \
  --task-definition kaviar-backend:PREVIOUS_REVISION \
  --force-new-deployment \
  --region us-east-2
```

### Se precisar reverter código:
```bash
git revert HEAD
git push origin main
# Dispara novo deploy com código anterior
```

---

## F) Próximos Passos (Após Deploy Prod Inativa)

### 1. Staging (imediato)
```bash
# Aplicar migration em staging
psql $STAGING_DATABASE_URL < backend/prisma/migrations/20260218_ride_flow_v1/migration.sql

# Habilitar feature flag em staging
# ECS Task Definition staging: FEATURE_SPEC_RIDE_FLOW_V1=true

# Validar 24-48h
```

### 2. Produção (após validação staging)
```bash
# Aplicar migration em prod (manual, fora de horário de pico)
psql $PROD_DATABASE_URL < backend/prisma/migrations/20260218_ride_flow_v1/migration.sql

# Habilitar feature flag em prod
# ECS Task Definition prod: FEATURE_SPEC_RIDE_FLOW_V1=true

# Monitorar logs e métricas
```

---

## Resumo Executivo

### ✅ APROVADO: Deploy "Produção Inativa"

**Razão:**
- Workflow NÃO tem migration automática (seguro)
- Guards de segurança adicionados (feature flag + fatal validation)
- Risco residual: BAIXO (código não executa, tabelas não existem)

**Garantias:**
1. FEATURE_SPEC_RIDE_FLOW_V1=false → endpoints 404
2. DEV_* flags → process.exit(1) fatal
3. Migration manual → tabelas não existem
4. Código novo não executa → sem impacto

**Próximos passos:**
1. Deploy prod inativa (agora)
2. Staging + migration (imediato)
3. Validar 24-48h
4. Prod + migration (manual, após validação)
5. Habilitar flag quando pronto

**Risco vs Benefício:**
- Risco: BAIXO (múltiplos guards, código inativo)
- Benefício: MÉDIO (infra pronta, reduz risco futuro)
- Decisão: VALE A PENA
