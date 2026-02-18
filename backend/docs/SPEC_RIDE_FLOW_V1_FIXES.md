# SPEC_RIDE_FLOW_V1 - Evidências de Correção

**Data:** 2026-02-18 00:36 BRT  
**Status:** ✅ 3 PROBLEMAS CORRIGIDOS

---

## ✅ Problema 1: Model rides duplicado (P1012)

### Correção Aplicada

- Renomeado segundo `model rides` (linha ~780) para `model rides_v2`
- Adicionado `@@map("rides_v2")` para mapear para tabela `rides_v2`
- Atualizadas relações:
  - `drivers.rides_v2` → `@relation("DriverRidesV2")`
  - `passengers.rides_v2` → `@relation("PassengerRidesV2")`
  - `communities.rides_v2_origin` → `@relation("RideOriginV2")`
  - `communities.rides_v2_dest` → `@relation("RideDestV2")`
- Atualizado `ride_offers.ride` para referenciar `rides_v2`

### Evidência

```bash
$ cd /home/goes/kaviar/backend && npx prisma validate
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
The schema at prisma/schema.prisma is valid 🚀
```

✅ **Prisma validate passou sem erros**

---

## ✅ Problema 2: Import errado no job (Cannot find module)

### Correção Aplicada

Arquivo: `src/jobs/offer-timeout.job.ts`

**Antes:**
```typescript
import { dispatcherService } from './services/dispatcher.service';
```

**Depois:**
```typescript
import { dispatcherService } from '../services/dispatcher.service';
```

### Evidência

```bash
$ cd /home/goes/kaviar/backend && timeout 5 npm run dev:3003
...
✅ SPEC_RIDE_FLOW_V1: /api/v2/rides/*, /api/v2/drivers/*, /api/realtime/*
[OFFER_TIMEOUT_JOB] Started (interval: 5s)
🚀 KAVIAR Backend running on port 3003
```

✅ **Servidor subiu sem crash, job iniciado com sucesso**

---

## ✅ Problema 3: Testes apontando para RDS PROD

### Correções Aplicadas

1. **Script de teste** (`scripts/test-ride-flow-v1.sh`):
   - Adicionada verificação de `DATABASE_URL`
   - Bloqueia execução se detectar "kaviar-prod-db" ou "production"
   - Mostra aviso se `DATABASE_URL` não estiver configurado

2. **Documentação atualizada**:
   - `scripts/QUICKSTART.md` - Adicionado passo 0 com configuração de DATABASE_URL
   - `scripts/README-RIDE-FLOW-V1.md` - Adicionado aviso no início

3. **Arquivo de exemplo** (`.env.test`):
   - Criado com configuração segura para testes locais
   - DATABASE_URL aponta para localhost

### Evidência

```bash
$ export DATABASE_URL="postgresql://kaviar:pass@kaviar-prod-db.rds.amazonaws.com:5432/kaviar"
$ ./scripts/test-ride-flow-v1.sh

❌ ERRO: DATABASE_URL aponta para PRODUÇÃO!
   DATABASE_URL=postgresql://kaviar:pass@kaviar-prod-db.rds.amazonaws.com:5432/kaviar

Configure para banco local ou staging:
   export DATABASE_URL="postgresql://postgres:dev@localhost:5432/kaviar_dev?schema=public"
```

✅ **Script bloqueia execução se DATABASE_URL apontar para produção**

---

## 📦 Arquivos Modificados

### Prisma
- ✅ `prisma/schema.prisma` - Renomeado model para rides_v2
- ✅ `prisma/migrations/20260218_ride_flow_v1/migration.sql` - Atualizado para criar rides_v2

### Backend
- ✅ `src/jobs/offer-timeout.job.ts` - Corrigido import path
- ✅ `src/services/dispatcher.service.ts` - Atualizado para usar rides_v2
- ✅ `src/routes/rides-v2.ts` - Atualizado para usar rides_v2
- ✅ `src/routes/drivers-v2.ts` - Atualizado para usar rides_v2

### Documentação
- ✅ `scripts/QUICKSTART.md` - Adicionado aviso sobre DATABASE_URL
- ✅ `scripts/README-RIDE-FLOW-V1.md` - Adicionado aviso sobre DATABASE_URL
- ✅ `scripts/test-ride-flow-v1.sh` - Adicionada verificação de DATABASE_URL
- ✅ `.env.test` - Criado arquivo de exemplo para testes

---

## 🧪 Validação Completa

### 1. Prisma Validate
```bash
$ npx prisma validate
✅ The schema at prisma/schema.prisma is valid 🚀
```

### 2. Servidor Sobe Sem Crash
```bash
$ npm run dev:3003
✅ SPEC_RIDE_FLOW_V1: /api/v2/rides/*, /api/v2/drivers/*, /api/realtime/*
[OFFER_TIMEOUT_JOB] Started (interval: 5s)
🚀 KAVIAR Backend running on port 3003
```

### 3. Proteção Contra Prod
```bash
$ export DATABASE_URL="postgresql://...@kaviar-prod-db..."
$ ./scripts/test-ride-flow-v1.sh
❌ ERRO: DATABASE_URL aponta para PRODUÇÃO!
```

---

## 📋 Próximos Passos

1. **Rodar migration em ambiente de teste:**
   ```bash
   export DATABASE_URL="postgresql://postgres:dev@localhost:5432/kaviar_dev"
   npx prisma migrate dev --name ride_flow_v1
   ```

2. **Seed de teste:**
   ```bash
   npx tsx prisma/seed-ride-flow-v1.ts
   ```

3. **Testar 20 corridas:**
   ```bash
   ./scripts/test-ride-flow-v1.sh
   ```

4. **Coletar logs:**
   - `RIDE_CREATED`
   - `DISPATCH_CANDIDATES`
   - `OFFER_SENT`
   - `OFFER_ACCEPTED/REJECTED/EXPIRED`
   - `RIDE_STATUS_CHANGED`

---

## 🎯 Commits Sugeridos

```bash
# Commit 1: Prisma
git add prisma/
git commit -m "fix(prisma): avoid rides model conflict in ride flow v1

- Rename second rides model to rides_v2
- Add @@map(\"rides_v2\") to avoid table conflict
- Update relations in drivers, passengers, communities
- Update migration to create rides_v2 table

Fixes P1012 error (model rides already exists)"

# Commit 2: Job
git add src/jobs/offer-timeout.job.ts
git commit -m "fix(job): correct dispatcher import path

- Fix import from './services' to '../services'
- Prevents 'Cannot find module' error on server startup"

# Commit 3: Docs
git add scripts/ .env.test
git commit -m "docs(test): prevent local tests from using prod DATABASE_URL

- Add DATABASE_URL validation in test script
- Block execution if prod database detected
- Add .env.test example for local testing
- Update QUICKSTART and README with safety warnings"
```

---

**Status:** ✅ TODOS OS PROBLEMAS CORRIGIDOS  
**Validação:** ✅ Prisma validate + Servidor sobe + Proteção prod  
**Pronto para:** Testes locais com banco de desenvolvimento
