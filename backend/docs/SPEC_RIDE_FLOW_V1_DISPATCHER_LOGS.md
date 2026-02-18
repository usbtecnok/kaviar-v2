# SPEC_RIDE_FLOW_V1 - Logs de Diagnóstico do Dispatcher

**Data:** 2026-02-18 08:37 BRT  
**Status:** ✅ IMPLEMENTADO

---

## 🎯 Objetivo

Adicionar logs de diagnóstico no dispatcher para identificar por que não há candidatos disponíveis.

---

## ✅ Implementação

**Arquivo:** `src/services/dispatcher.service.ts`

### Log de Diagnóstico Adicionado

```typescript
// Log de diagnóstico
console.log(`[DISPATCHER_FILTER] ride_id=${ride.id} online=${onlineDriversCount} with_location=${withLocationCount} fresh_location=${withFreshLocationCount} within_distance=${withinDistanceCount} final_candidates=${candidates.length} dropped=${JSON.stringify(droppedReasons)}`);
```

### Métricas Rastreadas

1. **onlineDriversCount**: Total de motoristas com `availability='online'`
2. **withLocationCount**: Motoristas que têm registro em `driver_locations`
3. **withFreshLocationCount**: Motoristas com localização atualizada (< 30s)
4. **withinDistanceCount**: Motoristas dentro do raio máximo (< 10km)
5. **final_candidates**: Candidatos finais após todos os filtros

### Razões de Descarte

```typescript
droppedReasons: {
  no_location: 0,      // Sem registro em driver_locations
  stale_location: 0,   // Localização desatualizada (> 30s)
  too_far: 0          // Distância > 10km
}
```

---

## 🔍 Exemplo de Log

### Cenário 1: Sem candidatos (sem localização)

```
[DISPATCHER_FILTER] ride_id=abc123 online=2 with_location=0 fresh_location=0 within_distance=0 final_candidates=0 dropped={"no_location":2,"stale_location":0,"too_far":0}
[DISPATCHER] No candidates for ride abc123, setting no_driver
```

**Diagnóstico:** 2 motoristas online, mas nenhum tem localização registrada

### Cenário 2: Sem candidatos (localização antiga)

```
[DISPATCHER_FILTER] ride_id=def456 online=2 with_location=2 fresh_location=0 within_distance=0 final_candidates=0 dropped={"no_location":0,"stale_location":2,"too_far":0}
```

**Diagnóstico:** 2 motoristas com localização, mas ambas desatualizadas (> 30s)

### Cenário 3: Sem candidatos (muito longe)

```
[DISPATCHER_FILTER] ride_id=ghi789 online=2 with_location=2 fresh_location=2 within_distance=0 final_candidates=0 dropped={"no_location":0,"stale_location":0,"too_far":2}
```

**Diagnóstico:** 2 motoristas com localização fresca, mas ambos > 10km de distância

### Cenário 4: Com candidatos

```
[DISPATCHER_FILTER] ride_id=jkl012 online=2 with_location=2 fresh_location=2 within_distance=2 final_candidates=2 dropped={"no_location":0,"stale_location":0,"too_far":0}
[DISPATCH_CANDIDATES] ride_id=jkl012 attempt=1 candidates=2 top3=[{"driver_id":"test-driver-1","distance_km":0.5,"score":0.5}]
[OFFER_SENT] ride_id=jkl012 offer_id=... driver_id=test-driver-1 expires_at=...
```

**Diagnóstico:** 2 motoristas passaram em todos os filtros

---

## 📋 Padronização de Status

### Verificação do Sistema

**Drivers:** Sistema usa `status='active'` (minúsculo)
- Fonte: `src/routes/admin-drivers.ts:448`

**Driver Status:** Sistema usa `availability='online'` (minúsculo)
- Fonte: `src/services/dispatcher.service.ts:93`

### Seed Atual

**Arquivo:** `prisma/seed-ride-flow-v1.ts`

✅ **Já está correto:**
```typescript
// Drivers
status: 'active'  // ✅ Minúsculo

// Driver Status
availability: 'online'  // ✅ Minúsculo
```

**Nenhuma mudança necessária no seed**

---

## 🧪 Como Usar os Logs

### 1. Rodar teste

```bash
export DATABASE_URL="postgresql://postgres:dev@localhost:5433/kaviar_dev?schema=public"
npm run dev:3003
```

### 2. Criar corrida

```bash
curl -X POST http://localhost:3003/api/v2/rides \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"origin":{"lat":-22.9668,"lng":-43.1729},"destination":{"lat":-22.9500,"lng":-43.1800}}'
```

### 3. Ver logs

```bash
tail -f /tmp/kaviar-dev-3003.log | grep DISPATCHER_FILTER
```

### 4. Interpretar resultados

**Se `final_candidates=0`:**
- Verificar `dropped` para ver qual filtro zerou
- `no_location` → Motoristas não enviaram localização
- `stale_location` → Localização desatualizada (> 30s)
- `too_far` → Motoristas muito longe (> 10km)

**Se `online=0`:**
- Nenhum motorista está online
- Verificar `driver_status` no banco

---

## 🔧 Troubleshooting

### Problema: `online=0`

**Causa:** Nenhum motorista com `availability='online'`

**Solução:**
```bash
# Verificar status
psql $DATABASE_URL -c "SELECT driver_id, availability FROM driver_status;"

# Colocar online
psql $DATABASE_URL -c "UPDATE driver_status SET availability='online' WHERE driver_id='test-driver-1';"
```

### Problema: `with_location=0`

**Causa:** Motoristas não têm registro em `driver_locations`

**Solução:**
```bash
# Verificar localizações
psql $DATABASE_URL -c "SELECT driver_id, lat, lng, updated_at FROM driver_locations;"

# Adicionar localização
psql $DATABASE_URL -c "INSERT INTO driver_locations (driver_id, lat, lng, updated_at) VALUES ('test-driver-1', -22.9668, -43.1729, NOW());"
```

### Problema: `fresh_location=0`

**Causa:** Localização desatualizada (> 30s)

**Solução:**
```bash
# Atualizar timestamp
psql $DATABASE_URL -c "UPDATE driver_locations SET updated_at=NOW() WHERE driver_id='test-driver-1';"
```

### Problema: `within_distance=0`

**Causa:** Motoristas muito longe (> 10km)

**Solução:**
- Criar corrida mais próxima dos motoristas
- Ou mover motoristas para perto da origem da corrida

---

## 📦 Arquivo Modificado

- ✅ `src/services/dispatcher.service.ts`

---

## 🎯 Commit Sugerido

```bash
git add src/services/dispatcher.service.ts
git commit -m "feat(dispatcher): add diagnostic logs for candidate filtering

- Add counters for each filter stage (online, with_location, fresh_location, within_distance)
- Track dropped reasons (no_location, stale_location, too_far)
- Log DISPATCHER_FILTER with all metrics before final candidate selection
- Helps diagnose why no candidates are found

Makes debugging easier when rides get 'no_driver' status"
```

---

## ✅ Resultado

- ✅ Logs de diagnóstico implementados
- ✅ Rastreamento de cada filtro
- ✅ Razões de descarte identificadas
- ✅ Seed já usa formato correto ('active', 'online')
- ✅ Facilita troubleshooting de "no candidates"

**Status:** DIAGNÓSTICO IMPLEMENTADO 🚀
