# 🎯 PLANO ESTRATÉGICO PÓS-ALINHAMENTO - KAVIAR
**Data:** 2026-03-01 14:26 BRT  
**Contexto:** Main limpa, WIP isolado, Frankenstein risk = BAIXO

---

## 📊 ANÁLISE DO WIP

### Mudanças Identificadas (branch wip/admin-ride-service-20260301)

**Backend (crítico):**
1. `src/modules/admin/ride-service.ts` (+77 linhas)
   - Mudança de `include` para `select` explícito (evita colunas inexistentes)
   - Mapeamento camelCase → snake_case (sortBy)
   - Adiciona campos: platform_fee, driver_amount, diamond_*, bonus_*

2. `prisma/schema.prisma` (+6 linhas)
   - Adiciona `@@map()` para enums (RideStatus, OfferStatus, DriverAvailability)
   - **RISCO:** Pode quebrar queries existentes se enums não estiverem mapeados no DB

**Frontend (menor impacto):**
- Ajustes em componentes admin (DriverCreditsCard, PassengerFavoritesCard)
- Mudanças em `api/index.js` e `config/api.js`

**Lixo:**
- 80+ arquivos de docs/evidências/scripts (já commitados, podem ser limpos depois)

---

## 🎯 RESPOSTAS ÀS PERGUNTAS

### 1. PRs menores ou único PR?

**RECOMENDAÇÃO: PRs MENORES (3 PRs sequenciais)**

**Motivo:**
- Mudanças no schema (enums) são CRÍTICAS e podem quebrar produção
- ride-service tem mudanças defensivas (select explícito) que são independentes
- Frontend tem ajustes cosméticos que podem ir separados

**Proposta:**
- **PR1:** Versioning/Health (GIT_SHA) - PRIORIDADE 1
- **PR2:** Admin ride-service (select explícito) - PRIORIDADE 2
- **PR3:** Schema enums (@@map) - PRIORIDADE 3 (REQUER VALIDAÇÃO DB)

---

### 2. Prioridade: WIP ou Versioning?

**RECOMENDAÇÃO: VERSIONING PRIMEIRO**

**Motivo:**
- Sem versioning, impossível rastrear qual código está em produção
- Facilita rollback e debugging
- Não tem risco (apenas adiciona info)
- Pode ser deployado imediatamente

**Depois:** Revisar WIP com calma, testar em staging

---

### 3. Testes mínimos antes de deploy?

**TESTES OBRIGATÓRIOS:**

**Local/Staging:**
1. Health check com version
2. Admin rides list (GET /api/admin/rides)
3. Admin ride detail (GET /api/admin/rides/:id)
4. Schema validation (Prisma generate)

**Produção (pós-deploy):**
1. Health check (200 + version correta)
2. CloudWatch logs (sem erros Prisma)
3. Admin rides endpoint (200 + dados corretos)

**Endpoints Críticos:**
- `/api/health` (público)
- `/api/admin/rides` (admin)
- `/api/admin/rides/:id` (admin)
- `/api/v2/rides` (passenger - não tocar)

---

## 📋 PLANO EM 10 PASSOS

### FASE 1: VERSIONING (PRIORIDADE 1) - Deploy Imediato

#### ✅ PASSO 1: Adicionar GIT_SHA ao health check
**Objetivo:** Rastrear versão em produção

**Ações:**
```bash
# 1. Adicionar version ao health endpoint
# backend/src/app.ts (já existe, verificar se tem GIT_SHA)

# 2. Adicionar ao Dockerfile
# ARG GIT_SHA=unknown
# ENV GIT_SHA=${GIT_SHA}

# 3. Build com SHA
docker build --build-arg GIT_SHA=$(git rev-parse --short HEAD) -t kaviar-backend:v1.1.0 .
```

**Critério Go/No-Go:**
- [ ] Health retorna `{"version": "abc1234"}`
- [ ] Sem erros no build
- [ ] Teste local: `curl localhost:3001/api/health | jq .version`

**Tempo estimado:** 30 min  
**Risco:** 🟢 BAIXO

---

#### ✅ PASSO 2: Deploy versioning para produção
**Objetivo:** Produção com rastreabilidade

**Ações:**
```bash
# 1. Build com SHA
GIT_SHA=$(git rev-parse --short HEAD)
docker build --build-arg GIT_SHA=$GIT_SHA -t kaviar-backend:v1.1.0-$GIT_SHA .

# 2. Tag imutável
docker tag kaviar-backend:v1.1.0-$GIT_SHA \
  847895361928.dkr.ecr.us-east-2.amazonaws.com/kaviar-backend:v1.1.0-$GIT_SHA

# 3. Push
aws ecr get-login-password --region us-east-2 | docker login ...
docker push 847895361928.dkr.ecr.us-east-2.amazonaws.com/kaviar-backend:v1.1.0-$GIT_SHA

# 4. Update ECS task definition
# 5. Deploy
```

**Critério Go/No-Go:**
- [ ] Health produção retorna version correta
- [ ] CloudWatch sem erros
- [ ] Rollout COMPLETED

**Tempo estimado:** 15 min  
**Risco:** 🟢 BAIXO

---

### FASE 2: REVISAR WIP (PRIORIDADE 2) - Análise Detalhada

#### ⚠️ PASSO 3: Validar schema enums no DB de produção
**Objetivo:** Verificar se @@map vai quebrar

**Ações:**
```sql
-- Conectar no RDS produção (read-only)
SELECT 
  t.typname as enum_name,
  e.enumlabel as enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname IN ('ride_status', 'offer_status', 'driver_availability')
ORDER BY t.typname, e.enumsortorder;
```

**Critério Go/No-Go:**
- [ ] Enums existem no DB com nomes corretos
- [ ] Valores batem com schema.prisma
- [ ] Se NÃO existir: **BLOQUEAR PR3** (schema enums)

**Tempo estimado:** 15 min  
**Risco:** 🟡 MÉDIO (pode descobrir incompatibilidade)

---

#### ⚠️ PASSO 4: Testar ride-service em staging
**Objetivo:** Garantir que select explícito funciona

**Ações:**
```bash
# 1. Criar branch limpa
git checkout -b feat/admin-ride-service-select-explicit

# 2. Cherry-pick apenas ride-service.ts
git cherry-pick <commit-do-wip> -- src/modules/admin/ride-service.ts

# 3. Deploy em staging
# 4. Testar endpoints
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://staging-api.kaviar.com.br/api/admin/rides?limit=5

curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://staging-api.kaviar.com.br/api/admin/rides/<RIDE_ID>
```

**Critério Go/No-Go:**
- [ ] GET /api/admin/rides retorna 200
- [ ] GET /api/admin/rides/:id retorna 200
- [ ] Dados corretos (driver, passenger, price)
- [ ] CloudWatch sem erros Prisma
- [ ] Sem campos undefined/null inesperados

**Tempo estimado:** 45 min  
**Risco:** 🟡 MÉDIO

---

#### ✅ PASSO 5: PR2 - Admin ride-service (se PASSO 4 OK)
**Objetivo:** Deploy defensivo (select explícito)

**Ações:**
```bash
# 1. Criar PR do branch feat/admin-ride-service-select-explicit
# 2. Code review
# 3. Merge para main
# 4. Deploy produção
```

**Critério Go/No-Go:**
- [ ] Testes staging passaram
- [ ] Code review aprovado
- [ ] Sem breaking changes

**Tempo estimado:** 30 min  
**Risco:** 🟢 BAIXO (já testado em staging)

---

### FASE 3: SCHEMA ENUMS (PRIORIDADE 3) - ALTO RISCO

#### 🔴 PASSO 6: Decidir sobre schema enums
**Objetivo:** Avaliar se vale o risco

**Análise:**
- **Benefício:** Alinhamento Prisma ↔ DB (melhor prática)
- **Risco:** Pode quebrar queries existentes se enums não mapeados
- **Alternativa:** Deixar como está (funciona)

**Critério Go/No-Go:**
- [ ] PASSO 3 confirmou que enums existem no DB
- [ ] Testes locais com `prisma generate` passaram
- [ ] Staging testado por 24h sem erros
- [ ] Rollback plan documentado

**Decisão:** **ADIAR** até ter staging estável por 1 semana

**Tempo estimado:** N/A  
**Risco:** 🔴 ALTO

---

### FASE 4: LIMPEZA (PRIORIDADE 4) - Housekeeping

#### ✅ PASSO 7: Limpar branch WIP
**Objetivo:** Remover lixo (docs/evidências)

**Ações:**
```bash
# 1. Criar branch limpa apenas com código
git checkout -b feat/admin-adjustments-clean

# 2. Cherry-pick apenas arquivos de código
git checkout wip/admin-ride-service-20260301 -- \
  frontend-app/src/api/index.js \
  frontend-app/src/config/api.js \
  frontend-app/src/components/admin/DriverCreditsCard.jsx

# 3. Revisar mudanças
git diff main

# 4. Se fizer sentido: commit + PR
# 5. Se não: descartar
```

**Critério Go/No-Go:**
- [ ] Mudanças têm valor claro
- [ ] Não quebram nada
- [ ] Code review OK

**Tempo estimado:** 30 min  
**Risco:** 🟢 BAIXO

---

#### ✅ PASSO 8: Adicionar .gitignore para evidências
**Objetivo:** Evitar commit de lixo futuro

**Ações:**
```bash
# Já feito no alinhamento anterior
# Verificar se está OK:
cat .gitignore | grep -E "evidencias-|\.bak-|\.broken-"
```

**Critério Go/No-Go:**
- [ ] .gitignore protege contra lixo
- [ ] `git status` não mostra evidências

**Tempo estimado:** 5 min  
**Risco:** 🟢 BAIXO

---

### FASE 5: MONITORAMENTO (CONTÍNUO)

#### ✅ PASSO 9: Setup alertas CloudWatch
**Objetivo:** Detectar problemas antes de usuários

**Ações:**
```bash
# 1. Criar alarme para erros 500
aws cloudwatch put-metric-alarm \
  --alarm-name kaviar-backend-5xx-errors \
  --metric-name 5XXError \
  --threshold 10 \
  --evaluation-periods 2

# 2. Criar alarme para Prisma errors
aws logs put-metric-filter \
  --log-group-name /ecs/kaviar-backend \
  --filter-name PrismaErrors \
  --filter-pattern "\"PrismaClientKnownRequestError\""
```

**Critério Go/No-Go:**
- [ ] Alarmes criados
- [ ] Notificações configuradas (SNS/email)

**Tempo estimado:** 30 min  
**Risco:** 🟢 BAIXO

---

#### ✅ PASSO 10: Documentar versões em produção
**Objetivo:** Histórico de deploys

**Ações:**
```bash
# Criar docs/PRODUCTION_VERSIONS.md
# Registrar cada deploy:
# - Data/hora
# - Version (GIT_SHA)
# - Task definition
# - Mudanças principais
# - Rollback plan
```

**Critério Go/No-Go:**
- [ ] Documento criado
- [ ] Atualizado a cada deploy

**Tempo estimado:** 15 min  
**Risco:** 🟢 BAIXO

---

## 🚦 CRITÉRIOS GO/NO-GO GERAIS

### ✅ GO (pode deployar)
- [ ] Testes locais passaram (health, endpoints críticos)
- [ ] Staging testado por 24h sem erros
- [ ] CloudWatch sem erros Prisma
- [ ] Code review aprovado
- [ ] Rollback plan documentado
- [ ] Version tag criado (GIT_SHA)
- [ ] Horário: seg-sex 10h-16h BRT (evitar noite/fim de semana)

### 🛑 NO-GO (NÃO deployar)
- [ ] Testes falharam
- [ ] Erros no CloudWatch
- [ ] Mudanças em schema sem validação DB
- [ ] Sem rollback plan
- [ ] Fora do horário comercial
- [ ] Outro deploy em andamento

---

## 📊 RESUMO EXECUTIVO

### Prioridades
1. **AGORA:** Versioning (GIT_SHA) - Deploy imediato
2. **ESTA SEMANA:** Revisar ride-service - Testar staging
3. **PRÓXIMA SEMANA:** Schema enums - Avaliar risco
4. **CONTÍNUO:** Limpeza + monitoramento

### Riscos Mitigados
- ✅ Versioning: rastreabilidade
- ✅ Select explícito: evita colunas inexistentes
- ⚠️ Schema enums: ADIAR até validar DB

### Tempo Total Estimado
- **Fase 1 (Versioning):** 45 min
- **Fase 2 (Ride-service):** 2h
- **Fase 3 (Schema):** ADIADO
- **Fase 4 (Limpeza):** 35 min
- **Fase 5 (Monitoramento):** 45 min

**Total:** ~4h (sem schema enums)

---

## 🎯 PRÓXIMA AÇÃO IMEDIATA

**COMEÇAR AGORA:**
```bash
# 1. Verificar se health já tem version
curl https://api.kaviar.com.br/api/health | jq .version

# 2. Se não tiver: implementar PASSO 1 (versioning)
# 3. Deploy PASSO 2
# 4. Validar produção
```

**DEPOIS (amanhã):**
- Executar PASSO 3 (validar enums no DB)
- Executar PASSO 4 (testar ride-service em staging)

---

**Gerado por:** Kiro CLI  
**Timestamp:** 2026-03-01T14:26:00-03:00  
**Validade:** 7 dias (revisar após)
