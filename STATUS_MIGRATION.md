# ⚠️ STATUS DA MIGRATION - Aguardando Ação Manual

**Data:** 05/02/2026 08:47 BRT  
**Status:** ⚠️ **AGUARDANDO ACESSO AO BANCO**

---

## 🔴 PROBLEMA ENCONTRADO

**Erro:** Não foi possível aplicar migration automaticamente

**Motivo:** 
1. `psql` local não configurado (role "goes" não existe)
2. `prisma db push` encontrou conflito com índice existente no banco
3. Schema Prisma não está 100% sincronizado com banco de produção

**Conflito específico:**
```
ERROR: cannot drop index admins_reset_token_key 
because constraint admins_reset_token_key on table admins requires it
```

---

## ✅ O QUE JÁ FOI FEITO

1. ✅ Schema Prisma atualizado
2. ✅ Prisma Client gerado
3. ✅ Backend compilado
4. ✅ Migration SQL criada
5. ✅ Código corrigido

---

## 🎯 O QUE FALTA FAZER (MANUAL)

### **Opção 1: Aplicar Migration SQL Diretamente**

Conectar no banco de produção e executar:

```sql
-- 1. Adicionar campos em rides
ALTER TABLE rides ADD COLUMN IF NOT EXISTS platform_fee_percentage DECIMAL(5,2);
ALTER TABLE rides ADD COLUMN IF NOT EXISTS match_type VARCHAR(50);
ALTER TABLE rides ADD COLUMN IF NOT EXISTS pickup_neighborhood_id VARCHAR(255);
ALTER TABLE rides ADD COLUMN IF NOT EXISTS dropoff_neighborhood_id VARCHAR(255);
ALTER TABLE rides ADD COLUMN IF NOT EXISTS distance_km DECIMAL(10,2);
ALTER TABLE rides ADD COLUMN IF NOT EXISTS duration_minutes INT;

-- 2. Adicionar ride_id em match_logs
ALTER TABLE match_logs ADD COLUMN IF NOT EXISTS ride_id VARCHAR(255);

-- 3. Criar índices
CREATE INDEX IF NOT EXISTS idx_rides_driver_created ON rides(driver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rides_status ON rides(status);
CREATE INDEX IF NOT EXISTS idx_rides_pickup_neighborhood ON rides(pickup_neighborhood_id);
CREATE INDEX IF NOT EXISTS idx_match_logs_ride ON match_logs(ride_id);

-- 4. Adicionar foreign keys
ALTER TABLE rides 
  ADD CONSTRAINT IF NOT EXISTS fk_rides_pickup_neighborhood 
  FOREIGN KEY (pickup_neighborhood_id) REFERENCES neighborhoods(id) ON DELETE SET NULL;

ALTER TABLE rides 
  ADD CONSTRAINT IF NOT EXISTS fk_rides_dropoff_neighborhood 
  FOREIGN KEY (dropoff_neighborhood_id) REFERENCES neighborhoods(id) ON DELETE SET NULL;

ALTER TABLE match_logs 
  ADD CONSTRAINT IF NOT EXISTS fk_match_logs_ride 
  FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE SET NULL;
```

**Como executar:**
```bash
# Via Neon Console (Web UI)
1. Acessar https://console.neon.tech
2. Selecionar projeto Kaviar
3. Abrir SQL Editor
4. Colar comandos acima
5. Executar

# OU via psql remoto
psql "postgresql://user:password@ep-wispy-thunder-ad850l5j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require" -f migrations/add_metrics_fields.sql
```

---

### **Opção 2: Usar Prisma Studio**

```bash
cd /home/goes/kaviar/backend
npx prisma studio
```

Não permite executar migrations, mas permite verificar se campos foram criados.

---

## 🔄 APÓS APLICAR MIGRATION

### **1. Verificar se campos foram criados**
```sql
-- Verificar rides
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'rides' 
  AND column_name IN ('platform_fee_percentage', 'match_type', 'pickup_neighborhood_id');

-- Verificar match_logs
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'match_logs' 
  AND column_name = 'ride_id';
```

### **2. Restart do servidor**
```bash
# Se usar PM2
pm2 restart kaviar-backend

# Se usar systemd
sudo systemctl restart kaviar-backend

# Se usar Docker
docker-compose restart backend
```

### **3. Testar APIs**
```bash
# Dashboard
curl -H "Authorization: Bearer $TOKEN" \
  https://api.kaviar.com.br/api/drivers/:id/dashboard

# Earnings
curl -H "Authorization: Bearer $TOKEN" \
  https://api.kaviar.com.br/api/drivers/me/earnings

# Neighborhood stats
curl -H "Authorization: Bearer $TOKEN" \
  https://api.kaviar.com.br/api/drivers/:id/neighborhood-stats
```

---

## 📊 RESUMO

**Código:** ✅ Pronto  
**Migration:** ⚠️ Aguardando aplicação manual no banco  
**Restart:** ⚠️ Aguardando após migration

**Arquivo de migration:** `/home/goes/kaviar/backend/migrations/add_metrics_fields.sql`

---

## 🚀 PRÓXIMA AÇÃO

**Você precisa:**
1. Acessar banco de produção (Neon Console ou psql remoto)
2. Executar comandos SQL acima
3. Verificar se campos foram criados
4. Fazer restart do servidor
5. Testar APIs

**Depois disso, o sistema estará 100% funcional.**

---

**Status atualizado em:** 05/02/2026 08:47 BRT  
**Aguardando:** Acesso ao banco de produção para aplicar migration
