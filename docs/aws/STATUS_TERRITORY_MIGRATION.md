# 🗺️ STATUS: Migration Sistema de Território Inteligente

**Data:** 2026-02-05  
**Arquivo:** `backend/migrations/add_territory_system.sql`  
**Status:** ⏳ **AGUARDANDO EXECUÇÃO MANUAL**

---

## 📋 O QUE A MIGRATION FAZ

### **1. Campos Novos em `drivers`**
```sql
- territory_type VARCHAR(20)              -- OFFICIAL | FALLBACK_800M | MANUAL | NULL
- territory_verified_at TIMESTAMP         -- Última verificação
- territory_verification_method VARCHAR   -- GPS_AUTO | MANUAL_SELECTION | ADMIN_OVERRIDE
- virtual_fence_center_lat DECIMAL        -- Centro da cerca virtual
- virtual_fence_center_lng DECIMAL        -- Centro da cerca virtual
```

### **2. Tabela `driver_badges`**
```sql
- id UUID PRIMARY KEY
- driver_id UUID (FK → drivers)
- badge_code VARCHAR(50)                  -- local_hero, territory_master, etc
- unlocked_at TIMESTAMP
- progress INTEGER (0-100)
- metadata JSONB
```

### **3. Tabela `driver_territory_stats`**
```sql
- id UUID PRIMARY KEY
- driver_id UUID (FK → drivers)
- period_start DATE
- period_end DATE
- total_trips INTEGER
- inside_territory_trips INTEGER          -- 7% ou 12%
- adjacent_territory_trips INTEGER        -- 12%
- outside_territory_trips INTEGER         -- 20%
- avg_fee_percentage DECIMAL
- potential_savings_cents INTEGER
```

### **4. Índices de Performance**
- `idx_drivers_territory_type`
- `idx_drivers_neighborhood_territory`
- `idx_driver_badges_driver`
- `idx_driver_badges_code`
- `idx_territory_stats_driver_period`
- `idx_territory_stats_period`

### **5. Trigger Automático**
- `trigger_update_territory_stats` → Atualiza estatísticas quando corrida é completada

### **6. Migração de Dados Existentes**
- Motoristas com `neighborhood_id` recebem `territory_type` automaticamente
- Se bairro tem geofence → `OFFICIAL`
- Se bairro não tem geofence → `FALLBACK_800M`

---

## 🚀 COMO EXECUTAR

### **Opção 1: Neon Console (Recomendado)**
```
1. Acesse: https://console.neon.tech
2. Selecione o projeto Kaviar
3. Vá em "SQL Editor"
4. Cole o conteúdo de: backend/migrations/add_territory_system.sql
5. Execute
6. Verifique mensagens de sucesso
```

### **Opção 2: psql Remoto**
```bash
cd /home/goes/kaviar/backend
source .env
psql "$DATABASE_URL" -f migrations/add_territory_system.sql
```

### **Opção 3: Prisma (após executar SQL)**
```bash
cd /home/goes/kaviar/backend
npx prisma db pull          # Sincronizar schema
npx prisma generate         # Gerar client
```

---

## ✅ VERIFICAÇÃO PÓS-MIGRATION

Execute no SQL Editor:

```sql
-- 1. Verificar campos em drivers
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'drivers' 
  AND column_name LIKE 'territory%';

-- 2. Verificar tabelas criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('driver_badges', 'driver_territory_stats');

-- 3. Verificar índices
SELECT indexname 
FROM pg_indexes 
WHERE indexname LIKE 'idx_%territory%' OR indexname LIKE 'idx_driver_badges%';

-- 4. Verificar triggers
SELECT trigger_name 
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_update_territory_stats';

-- 5. Verificar motoristas migrados
SELECT 
  COUNT(*) as total,
  COUNT(territory_type) as com_territorio,
  territory_type,
  COUNT(*) as qtd
FROM drivers
GROUP BY territory_type;
```

**Resultado esperado:**
```
✅ 5 colunas territory_* em drivers
✅ 2 tabelas criadas
✅ 6 índices criados
✅ 1 trigger criado
✅ Motoristas existentes com territory_type preenchido
```

---

## ⚠️ ROLLBACK (se necessário)

```sql
-- Remover trigger
DROP TRIGGER IF EXISTS trigger_update_territory_stats ON rides;
DROP FUNCTION IF EXISTS update_territory_stats();

-- Remover tabelas
DROP TABLE IF EXISTS driver_territory_stats CASCADE;
DROP TABLE IF EXISTS driver_badges CASCADE;

-- Remover índices
DROP INDEX IF EXISTS idx_drivers_territory_type;
DROP INDEX IF EXISTS idx_drivers_neighborhood_territory;
DROP INDEX IF EXISTS idx_driver_badges_driver;
DROP INDEX IF EXISTS idx_driver_badges_code;
DROP INDEX IF EXISTS idx_territory_stats_driver_period;
DROP INDEX IF EXISTS idx_territory_stats_period;

-- Remover campos
ALTER TABLE drivers 
DROP COLUMN IF EXISTS territory_type,
DROP COLUMN IF EXISTS territory_verified_at,
DROP COLUMN IF EXISTS territory_verification_method,
DROP COLUMN IF EXISTS virtual_fence_center_lat,
DROP COLUMN IF EXISTS virtual_fence_center_lng;
```

---

## 📊 IMPACTO

| Item | Antes | Depois |
|------|-------|--------|
| Campos em `drivers` | 15 | 20 (+5) |
| Tabelas relacionadas | 0 | 2 |
| Índices | 8 | 14 (+6) |
| Triggers | 0 | 1 |
| Motoristas com território | 0 | Todos |

---

## 🔄 PRÓXIMOS PASSOS

Após executar a migration:

1. ✅ Atualizar `schema.prisma`
2. ✅ Executar `npx prisma generate`
3. ✅ Implementar rotas backend
4. ✅ Implementar frontend
5. ✅ Testar fluxo completo

---

## 📝 NOTAS

- Migration usa `IF NOT EXISTS` para segurança
- Não quebra dados existentes
- Motoristas existentes são migrados automaticamente
- Trigger atualiza estatísticas em tempo real
- Rollback disponível se necessário

---

**Status:** ⏳ Aguardando execução manual via Neon Console
