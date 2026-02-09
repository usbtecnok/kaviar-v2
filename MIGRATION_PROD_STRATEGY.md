# Estratégia: Aplicar Migration de Favorite Places em PROD

**Erro Atual:** `P3005 The database schema is not empty`  
**Causa:** Prisma Migrate não está baselined (tabela `_prisma_migrations` não existe ou incompleta)

---

## 📋 DIAGNÓSTICO NECESSÁRIO

### 1. Verificar Estado Atual do Banco

Execute via ECS task (backend tem acesso ao RDS):

```bash
# Via AWS ECS Run Task
aws ecs run-task \
  --cluster kaviar-cluster \
  --task-definition kaviar-backend:latest \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-046613642f742faa2,subnet-01a498f7b4f3fcff5],securityGroups=[sg-0a54bc7272cae4623],assignPublicIp=ENABLED}" \
  --overrides '{
    "containerOverrides": [{
      "name": "kaviar-backend",
      "command": ["sh", "-c", "cd /app && npx prisma db execute --file /tmp/diagnose.sql --schema prisma/schema.prisma"]
    }]
  }' \
  --region us-east-2
```

**SQL a executar:**
```sql
-- 1) Prisma migrations existe?
SELECT to_regclass('public._prisma_migrations') as prisma_migrations_table;

-- 2) Se existir, listar migrations registradas
SELECT migration_name, finished_at, applied_steps_count
FROM public._prisma_migrations
ORDER BY finished_at NULLS LAST;

-- 3) Verificar colunas atuais de passenger_favorite_locations
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name='passenger_favorite_locations'
ORDER BY ordinal_position;

-- 4) Verificar constraints
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'passenger_favorite_locations'::regclass;
```

---

## 🎯 ESTRATÉGIAS (baseadas no diagnóstico)

### CENÁRIO A: `_prisma_migrations` NÃO EXISTE

**Situação:** Banco foi criado manualmente ou via outro método (não Prisma Migrate)

**Solução: BASELINE**

1. Criar tabela `_prisma_migrations`:
```bash
npx prisma migrate resolve --applied "0_init"
```

2. Marcar todas as migrations antigas como aplicadas (sem executar):
```bash
# Listar migrations existentes
ls backend/prisma/migrations/

# Para cada migration antiga (exceto a nova):
npx prisma migrate resolve --applied "20240101000000_migration_name"
npx prisma migrate resolve --applied "20240102000000_another_migration"
# ... repetir para todas as antigas
```

3. Aplicar apenas a nova migration:
```bash
npx prisma migrate deploy
```

**Comando ECS:**
```bash
aws ecs run-task \
  --cluster kaviar-cluster \
  --task-definition kaviar-backend:latest \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-046613642f742faa2,subnet-01a498f7b4f3fcff5],securityGroups=[sg-0a54bc7272cae4623],assignPublicIp=ENABLED}" \
  --overrides '{
    "containerOverrides": [{
      "name": "kaviar-backend",
      "command": ["sh", "-c", "cd /app && npx prisma migrate resolve --applied 0_init && npx prisma migrate deploy"]
    }]
  }' \
  --region us-east-2
```

---

### CENÁRIO B: `_prisma_migrations` EXISTE MAS INCOMPLETA

**Situação:** Algumas migrations foram aplicadas, mas não todas

**Solução: RESOLVE + DEPLOY**

1. Verificar quais migrations faltam:
```bash
# Comparar:
# - Migrations no código: ls backend/prisma/migrations/
# - Migrations no banco: SELECT migration_name FROM _prisma_migrations
```

2. Marcar migrations faltantes como aplicadas:
```bash
npx prisma migrate resolve --applied "20240103000000_missing_migration"
```

3. Aplicar nova migration:
```bash
npx prisma migrate deploy
```

---

### CENÁRIO C: TABELA JÁ TEM AS COLUNAS

**Situação:** Alguém já aplicou o SQL manualmente

**Solução: APENAS REGISTRAR**

1. Verificar se colunas existem:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name='passenger_favorite_locations'
AND column_name IN ('address_text', 'place_source');
```

2. Se existirem, apenas marcar migration como aplicada:
```bash
npx prisma migrate resolve --applied "20260209114403_add_favorite_places_fields"
```

---

### CENÁRIO D: FALLBACK - SQL MANUAL

**Situação:** Baseline é muito arriscado ou complexo

**Solução: APLICAR SQL DIRETO**

1. Executar SQL da migration manualmente:
```sql
-- Add new fields
ALTER TABLE passenger_favorite_locations 
  ADD COLUMN IF NOT EXISTS address_text TEXT,
  ADD COLUMN IF NOT EXISTS place_source TEXT NOT NULL DEFAULT 'manual';

-- Add unique constraint
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'passenger_favorite_locations_passenger_id_type_key'
  ) THEN
    CREATE UNIQUE INDEX passenger_favorite_locations_passenger_id_type_key 
      ON passenger_favorite_locations(passenger_id, type);
  END IF;
END $$;

-- Add check constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'passenger_favorite_locations_type_check'
  ) THEN
    ALTER TABLE passenger_favorite_locations 
      ADD CONSTRAINT passenger_favorite_locations_type_check 
      CHECK (type IN ('HOME', 'WORK', 'OTHER'));
  END IF;
END $$;
```

2. Registrar migration como aplicada:
```bash
npx prisma migrate resolve --applied "20260209114403_add_favorite_places_fields"
```

**Comando ECS (SQL manual):**
```bash
aws ecs run-task \
  --cluster kaviar-cluster \
  --task-definition kaviar-backend:latest \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-046613642f742faa2,subnet-01a498f7b4f3fcff5],securityGroups=[sg-0a54bc7272cae4623],assignPublicIp=ENABLED}" \
  --overrides '{
    "containerOverrides": [{
      "name": "kaviar-backend",
      "command": ["sh", "-c", "cd /app && cat > /tmp/manual.sql << \"EOSQL\"\nALTER TABLE passenger_favorite_locations ADD COLUMN IF NOT EXISTS address_text TEXT;\nALTER TABLE passenger_favorite_locations ADD COLUMN IF NOT EXISTS place_source TEXT NOT NULL DEFAULT '\''manual'\'';\nEOSQL\n&& npx prisma db execute --file /tmp/manual.sql --schema prisma/schema.prisma && npx prisma migrate resolve --applied 20260209114403_add_favorite_places_fields"]
    }]
  }' \
  --region us-east-2
```

---

## ✅ RECOMENDAÇÃO (sem diagnóstico ainda)

**Estratégia Mais Segura: CENÁRIO D (SQL Manual + Resolve)**

**Por quê:**
- ✅ Não depende de baseline complexo
- ✅ SQL tem `IF NOT EXISTS` (idempotente)
- ✅ Não quebra se já foi aplicado
- ✅ Registra no Prisma depois

**Passos:**

1. **Aplicar SQL manual via ECS:**
```bash
aws ecs run-task \
  --cluster kaviar-cluster \
  --task-definition kaviar-backend:latest \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-046613642f742faa2,subnet-01a498f7b4f3fcff5],securityGroups=[sg-0a54bc7272cae4623],assignPublicIp=ENABLED}" \
  --overrides '{
    "containerOverrides": [{
      "name": "kaviar-backend",
      "command": ["sh", "-c", "cd /app && npx prisma db execute --file prisma/migrations/20260209114403_add_favorite_places_fields/migration.sql --schema prisma/schema.prisma"]
    }]
  }' \
  --region us-east-2
```

2. **Registrar migration como aplicada:**
```bash
aws ecs run-task \
  --cluster kaviar-cluster \
  --task-definition kaviar-backend:latest \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-046613642f742faa2,subnet-01a498f7b4f3fcff5],securityGroups=[sg-0a54bc7272cae4623],assignPublicIp=ENABLED}" \
  --overrides '{
    "containerOverrides": [{
      "name": "kaviar-backend",
      "command": ["npx", "prisma", "migrate", "resolve", "--applied", "20260209114403_add_favorite_places_fields"]
    }]
  }' \
  --region us-east-2
```

3. **Verificar:**
```bash
aws ecs run-task \
  --cluster kaviar-cluster \
  --task-definition kaviar-backend:latest \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-046613642f742faa2,subnet-01a498f7b4f3fcff5],securityGroups=[sg-0a54bc7272cae4623],assignPublicIp=ENABLED}" \
  --overrides '{
    "containerOverrides": [{
      "name": "kaviar-backend",
      "command": ["sh", "-c", "cd /app && npx prisma migrate status"]
    }]
  }' \
  --region us-east-2
```

---

## 🔍 ALTERNATIVA: Diagnóstico Primeiro

Se quiser diagnóstico antes de decidir:

```bash
# 1. Criar script de diagnóstico
cat > /tmp/diagnose.sh << 'EOSCRIPT'
#!/bin/bash
cd /app
echo "=== 1. Verificar _prisma_migrations ==="
npx prisma db execute --stdin --schema prisma/schema.prisma << 'EOSQL'
SELECT to_regclass('public._prisma_migrations') as table_exists;
EOSQL

echo ""
echo "=== 2. Listar migrations registradas ==="
npx prisma db execute --stdin --schema prisma/schema.prisma << 'EOSQL'
SELECT migration_name, finished_at FROM public._prisma_migrations ORDER BY finished_at;
EOSQL

echo ""
echo "=== 3. Verificar colunas de passenger_favorite_locations ==="
npx prisma db execute --stdin --schema prisma/schema.prisma << 'EOSQL'
SELECT column_name, data_type FROM information_schema.columns WHERE table_name='passenger_favorite_locations' ORDER BY ordinal_position;
EOSQL
EOSCRIPT

# 2. Executar via ECS
aws ecs run-task \
  --cluster kaviar-cluster \
  --task-definition kaviar-backend:latest \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-046613642f742faa2,subnet-01a498f7b4f3fcff5],securityGroups=[sg-0a54bc7272cae4623],assignPublicIp=ENABLED}" \
  --overrides '{
    "containerOverrides": [{
      "name": "kaviar-backend",
      "command": ["sh", "-c", "cd /app && echo \"SELECT to_regclass('\''public._prisma_migrations'\'');\" | npx prisma db execute --stdin --schema prisma/schema.prisma"]
    }]
  }' \
  --region us-east-2
```

---

## 📝 CHECKLIST DE EXECUÇÃO

- [ ] 1. Fazer backup do banco (snapshot RDS)
- [ ] 2. Executar diagnóstico (opcional)
- [ ] 3. Escolher estratégia baseada no diagnóstico
- [ ] 4. Aplicar SQL manual via ECS
- [ ] 5. Registrar migration com `migrate resolve`
- [ ] 6. Verificar com `migrate status`
- [ ] 7. Testar endpoints de favoritos
- [ ] 8. Monitorar logs do backend

---

## ⚠️ IMPORTANTE

- ✅ **SEMPRE** fazer snapshot do RDS antes
- ✅ **NUNCA** usar `prisma migrate dev` em produção
- ✅ **SEMPRE** usar `IF NOT EXISTS` no SQL manual
- ✅ **TESTAR** em staging primeiro (se disponível)
- ✅ **MONITORAR** logs após aplicar

---

## 🚀 COMANDO FINAL RECOMENDADO

```bash
# 1. Snapshot RDS (via console ou CLI)
aws rds create-db-snapshot \
  --db-instance-identifier kaviar-prod-db \
  --db-snapshot-identifier kaviar-prod-before-favorite-places-$(date +%Y%m%d-%H%M%S) \
  --region us-east-2

# 2. Aplicar SQL manual
aws ecs run-task \
  --cluster kaviar-cluster \
  --task-definition kaviar-backend:latest \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-046613642f742faa2,subnet-01a498f7b4f3fcff5],securityGroups=[sg-0a54bc7272cae4623],assignPublicIp=ENABLED}" \
  --overrides '{
    "containerOverrides": [{
      "name": "kaviar-backend",
      "command": ["sh", "-c", "cd /app && npx prisma db execute --file prisma/migrations/20260209114403_add_favorite_places_fields/migration.sql --schema prisma/schema.prisma && npx prisma migrate resolve --applied 20260209114403_add_favorite_places_fields && npx prisma migrate status"]
    }]
  }' \
  --region us-east-2

# 3. Verificar logs da task
aws ecs describe-tasks \
  --cluster kaviar-cluster \
  --tasks <TASK_ARN> \
  --region us-east-2
```

