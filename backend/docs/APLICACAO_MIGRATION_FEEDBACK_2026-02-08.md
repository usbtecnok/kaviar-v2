# APLICAÇÃO DA MIGRATION: Feedback System

**Data:** 2026-02-08 21:59 BRT  
**Status:** ✅ Prisma Client Gerado | ⏸️ Migration Pendente (RDS inacessível localmente)  
**Ambiente:** DEV

---

## ✅ EXECUTADO

### 1. Prisma Client Gerado
```bash
$ cd backend && npx prisma generate
✔ Generated Prisma Client (v5.22.0) to ./node_modules/@prisma/client in 503ms
```

**Resultado:**
- ✅ Models `ride_feedbacks` e `ride_feedback_sentiment_analysis` disponíveis no client
- ✅ Tipos TypeScript gerados
- ✅ Relações configuradas (`rides.ride_feedbacks`, `passengers.ride_feedbacks`)

---

## ⏸️ PENDENTE: APLICAÇÃO NO BANCO

### Contexto
RDS não acessível via `psql` local (esperado - security group restrito).

### Opções de Aplicação

#### Opção A: Via ECS Task (SSM Session)
```bash
# 1. Conectar via SSM no container ECS
aws ecs execute-command \
  --cluster kaviar-cluster \
  --task <TASK_ID> \
  --container kaviar-backend \
  --command "/bin/sh" \
  --interactive \
  --region us-east-2

# 2. Dentro do container
cd /app
npx prisma migrate deploy
```

#### Opção B: Via EC2 Bastion (se existir)
```bash
# 1. SSH no bastion
ssh -i kaviar-key.pem ec2-user@<BASTION_IP>

# 2. Copiar migration
scp backend/prisma/migrations/20260208215522_add_ride_feedback_system.sql ec2-user@<BASTION_IP>:/tmp/

# 3. Aplicar via psql
psql "$DATABASE_URL" -f /tmp/20260208215522_add_ride_feedback_system.sql
```

#### Opção C: Via RDS Query Editor (Console AWS)
```bash
# 1. Abrir AWS Console → RDS → Query Editor
# 2. Conectar no kaviar-prod-db
# 3. Copiar/colar conteúdo de:
#    backend/prisma/migrations/20260208215522_add_ride_feedback_system.sql
# 4. Executar
```

#### Opção D: Temporariamente Abrir Security Group
```bash
# 1. Adicionar IP local ao RDS security group
aws ec2 authorize-security-group-ingress \
  --group-id sg-0bb23baec5c65234a \
  --protocol tcp \
  --port 5432 \
  --cidr $(curl -s ifconfig.me)/32 \
  --region us-east-2

# 2. Aplicar migration
cd backend
npx prisma migrate deploy

# 3. REMOVER IP (CRÍTICO)
aws ec2 revoke-security-group-ingress \
  --group-id sg-0bb23baec5c65234a \
  --protocol tcp \
  --port 5432 \
  --cidr $(curl -s ifconfig.me)/32 \
  --region us-east-2
```

---

## 🧪 TESTE DE ROLLBACK (Após Aplicação)

### 1. Verificar Tabelas Criadas
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('ride_feedbacks', 'ride_feedback_sentiment_analysis');
```

**Esperado:** 2 linhas

### 2. Aplicar Rollback
```bash
psql "$DATABASE_URL" -f backend/prisma/migrations/20260208215522_rollback_ride_feedback_system.sql
```

### 3. Verificar Remoção
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('ride_feedbacks', 'ride_feedback_sentiment_analysis');
```

**Esperado:** 0 linhas

### 4. Reaplicar Migration
```bash
psql "$DATABASE_URL" -f backend/prisma/migrations/20260208215522_add_ride_feedback_system.sql
```

### 5. Verificar Integridade
```sql
-- Verificar foreign keys
SELECT 
  tc.constraint_name, 
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN ('ride_feedbacks', 'ride_feedback_sentiment_analysis');
```

**Esperado:** 3 foreign keys
- `ride_feedbacks.ride_id` → `rides.id`
- `ride_feedbacks.passenger_id` → `passengers.id`
- `ride_feedback_sentiment_analysis.ride_feedback_id` → `ride_feedbacks.id`

---

## 📝 REGISTRO DE APLICAÇÃO

### Quando Aplicado (preencher após execução):
- **Data/Hora:** _____________
- **Método:** [ ] ECS Task [ ] Bastion [ ] Query Editor [ ] Security Group
- **Executado por:** _____________
- **Resultado:** [ ] Sucesso [ ] Falha
- **Rollback testado:** [ ] Sim [ ] Não
- **Observações:** _____________

---

## ✅ PRÓXIMO PASSO

**Aguardando decisão:**
- Qual método de aplicação usar? (A, B, C ou D)
- Aplicar agora ou agendar janela de manutenção?

**Após aplicação:**
- Testar rollback
- Commit isolado (schema + migration + ADR + docs)
