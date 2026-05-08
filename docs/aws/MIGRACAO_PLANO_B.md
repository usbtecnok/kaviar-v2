# 🚀 MIGRAÇÃO KAVIAR: PLANO B

## 📋 SITUAÇÃO

- ✅ RDS criado em us-east-2
- ✅ Backup do Neon (9.7MB)
- ❌ RDS em subnet privada (sem acesso externo)

## ✅ SOLUÇÃO

Usar o **backend em produção** (que está na mesma VPC) para fazer a migração!

### **PASSO 1: Atualizar .env no servidor**

```bash
# SSH no servidor backend
DATABASE_URL="postgresql://kaviaradmin:<ROTATED>@kaviar-prod-db.cxuuaq46o1o5.us-east-2.rds.amazonaws.com:5432/kaviar?sslmode=require"
```

### **PASSO 2: Executar migrations via Prisma**

```bash
cd /app/backend
npx prisma db push
```

### **PASSO 3: Importar dados do Neon**

Opção A: Via script no servidor
```bash
# Upload do backup para servidor
scp kaviar_neon_backup.sql servidor:/tmp/

# No servidor
psql $DATABASE_URL < /tmp/kaviar_neon_backup.sql
```

Opção B: Via Prisma Migrate
```bash
# Gerar migration do estado atual
npx prisma migrate dev --create-only

# Aplicar
npx prisma migrate deploy
```

### **PASSO 4: Restart**

```bash
pm2 restart kaviar-backend
```

---

## 🎯 ALTERNATIVA RÁPIDA

**Manter Neon temporariamente** e apenas executar a migration de território:

```sql
-- Via Neon Console
ALTER TABLE drivers 
ADD COLUMN IF NOT EXISTS territory_type VARCHAR(20),
ADD COLUMN IF NOT EXISTS territory_verified_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS territory_verification_method VARCHAR(20),
ADD COLUMN IF NOT EXISTS virtual_fence_center_lat DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS virtual_fence_center_lng DECIMAL(11, 8);
```

Depois migramos para RDS com calma.

---

## 📊 RECOMENDAÇÃO

**OPÇÃO 1:** Executar migration no Neon AGORA (5 segundos)
**OPÇÃO 2:** Migrar para RDS via servidor backend (15 minutos)

**Qual prefere?** 🎯
