# DEV Load Test - Validation Checklist

## 0. Pré-condições

Antes de rodar o teste, verificar:

```bash
# Backend rodando
curl http://localhost:3003/api/health

# Logs de boot devem mostrar:
# 🗄️  Database: localhost:5433
# 📊 Environment: development
# 🔧 DEV_AUTO_ACCEPT: true
# 🔧 DEV_AUTO_RELEASE: true
# 🔧 DEV_GEOFENCE_BOOST: 0.35
```

## 1. Executar seed + load test

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Seed + Test
cd backend
npx dotenv -e .env.development -- npx tsx prisma/seed-load-test.ts
bash scripts/test-dev-load-geofence.sh
```

## 2. Logs obrigatórios (Terminal 1)

Para cada ride, deve aparecer:

- ✅ `[RIDE_CREATED] ride_id=...`
- ✅ `[DISPATCHER_FILTER] ... online=10 with_location=10 fresh_location=10 final_candidates>=1`
- ✅ `[DISPATCH_CANDIDATES] ... top3=[...]`
- ✅ `[OFFER_SENT] ...`
- ✅ `[DEV_DRIVER_DECISION] ... action=accept same_geofence=true/false`
- ✅ `[OFFER_ACCEPTED] ...` (quando aceita)
- ✅ `[RIDE_STATUS_CHANGED] ... status=accepted`
- ✅ `[DEV_AUTO_RELEASE_SCHEDULED] ... duration_ms=...`
- ✅ `[DEV_AUTO_RELEASE_DONE] ... availability=online`

## 3. Validação SQL

### A) Status de rides (últimos 30 min)

```sql
PGPASSWORD=dev psql -h localhost -p 5433 -U postgres -d kaviar_dev -c \
"SELECT status, COUNT(*) FROM rides_v2
 WHERE created_at > NOW() - INTERVAL '30 minutes'
 GROUP BY status ORDER BY COUNT(*) DESC;"
```

**Critérios:**
- ✅ `accepted >= 20` (para 30 rides com 85% accept prob)
- ✅ `no_driver <= 10`

### B) Status de offers (últimos 30 min)

```sql
PGPASSWORD=dev psql -h localhost -p 5433 -U postgres -d kaviar_dev -c \
"SELECT status, COUNT(*) FROM ride_offers
 WHERE created_at > NOW() - INTERVAL '30 minutes'
 GROUP BY status ORDER BY COUNT(*) DESC;"
```

**Critérios:**
- ✅ `accepted` deve acompanhar rides aceitas
- ✅ `expired` baixo (ideal 0 com DEV_AUTO_ACCEPT)
- ✅ `pending` não deve acumular

### C) Distribuição por driver

```sql
PGPASSWORD=dev psql -h localhost -p 5433 -U postgres -d kaviar_dev -c \
"SELECT driver_id,
 COUNT(*) FILTER (WHERE status='accepted') as accepted,
 COUNT(*) FILTER (WHERE status='rejected') as rejected,
 COUNT(*) FILTER (WHERE status='expired') as expired
 FROM ride_offers
 WHERE created_at > NOW() - INTERVAL '30 minutes'
 GROUP BY driver_id
 ORDER BY accepted DESC;"
```

**Critérios:**
- ✅ Pelo menos 2 drivers com `accepted > 0`
- ✅ Distribuição razoável (não 100% em um driver)

### D) Geofence boost (INSIDE vs OUTSIDE)

```sql
PGPASSWORD=dev psql -h localhost -p 5433 -U postgres -d kaviar_dev -c \
"SELECT 
  CASE 
    WHEN origin_lat >= -22.975 AND origin_lat <= -22.965 
     AND origin_lng >= -43.185 AND origin_lng <= -43.170 THEN 'INSIDE'
    ELSE 'OUTSIDE'
  END as geofence,
  COUNT(*) FILTER (WHERE status='accepted') as accepted,
  COUNT(*) as total,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status='accepted') / COUNT(*), 1) as accept_rate
FROM rides_v2 
WHERE created_at > NOW() - INTERVAL '30 minutes'
GROUP BY geofence;"
```

**Critérios:**
- ✅ `accept_rate_inside > accept_rate_outside` (boost funcionando)
- ✅ Diferença perceptível (ex: +10-20%)

### E) Drivers INSIDE vs OUTSIDE aceitando rides INSIDE

```sql
PGPASSWORD=dev psql -h localhost -p 5433 -U postgres -d kaviar_dev -c \
"SELECT 
  CASE 
    WHEN d.last_lat >= -22.975 AND d.last_lat <= -22.965 
     AND d.last_lng >= -43.185 AND d.last_lng <= -43.170 THEN 'DRIVER_INSIDE'
    ELSE 'DRIVER_OUTSIDE'
  END as driver_location,
  CASE 
    WHEN r.origin_lat >= -22.975 AND r.origin_lat <= -22.965 
     AND r.origin_lng >= -43.185 AND r.origin_lng <= -43.170 THEN 'RIDE_INSIDE'
    ELSE 'RIDE_OUTSIDE'
  END as ride_location,
  COUNT(*) as accepted_count
FROM rides_v2 r
JOIN drivers d ON r.driver_id = d.id
WHERE r.created_at > NOW() - INTERVAL '30 minutes'
  AND r.status = 'accepted'
GROUP BY driver_location, ride_location
ORDER BY accepted_count DESC;"
```

**Critérios:**
- ✅ `DRIVER_INSIDE + RIDE_INSIDE` deve ter mais aceites (boost aplicado)

## 4. Critérios de PASSOU

✅ **PASSOU** se:
- `accepted >= 20/30` (67%+)
- `expired ~ 0`
- Logs completos (filter → offer → accept → release)
- Auto-release funciona (drivers voltam online)
- Geofence boost visível (inside > outside)

## 5. Diagnóstico se NÃO PASSOU

**Se `accepted` baixo e `no_driver` alto:**
- Verificar auto-release: drivers devem voltar `online`
- Verificar logs `[DEV_AUTO_RELEASE_DONE]`

**Se `offers pending` acumulando:**
- DEV_AUTO_ACCEPT não rodou
- Verificar logs `*_FAILED`

**Se `fresh_location=0`:**
- Seed não atualizou `driver_locations.updated_at`
- Regressão no `LOCATION_FRESHNESS_SECONDS`

**Se `attemptCount` explode:**
- Verificar patch que conta só `expired|rejected`
