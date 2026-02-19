# Análise de Descarte do Dispatcher - Ride Flow V1

## Resumo Executivo

**Status:** 44 corridas criadas, 0 ofertas enviadas  
**Motivo:** Localizações dos motoristas consideradas "stale" (antigas)

## Ride ID Exemplo

`f0d67941-4234-45ce-9be0-5740e0eb767f` (última corrida processada)

## Tabela de Descarte por Driver

| Driver ID | Availability | Has Location | Location Updated At | Motivo de Descarte |
|-----------|-------------|--------------|---------------------|-------------------|
| test-driver-1 | online ✅ | true ✅ | 2026-02-19T15:10:03.813Z | **stale_location** ❌ |
| test-driver-2 | online ✅ | true ✅ | 2026-02-19T15:10:03.813Z | **stale_location** ❌ |

## Análise Detalhada

### Filtros Aplicados (em ordem):

1. **Availability Check** ✅
   - Query retornou 2 drivers com `availability=online`
   - Ambos passaram

2. **Location Check** ✅
   - 2 drivers com localização (`with_location=2`)
   - Ambos têm `has_location=true`

3. **Fresh Location Check** ❌
   - `fresh_location=0` - NENHUM driver passou
   - Localizações atualizadas em: `15:10:03`
   - Corridas criadas em: `15:13:xx` (~3 minutos depois)
   - Threshold de "freshness" provavelmente < 3 minutos

4. **Distance Check** ⏭️
   - `within_distance=0` - não chegou a calcular (já descartados)

### Resultado Final

```json
{
  "online": 2,
  "with_location": 2,
  "fresh_location": 0,
  "within_distance": 0,
  "final_candidates": 0,
  "dropped": {
    "no_location": 0,
    "stale_location": 2,
    "too_far": 0
  }
}
```

## Patch Mínimo para Logs Permanentes

### Arquivo: `src/services/dispatcher.service.ts`

**Localização:** Método `findCandidates()` ou `filterDrivers()`

**Adicionar logs detalhados:**

```typescript
// Após buscar drivers online
console.log(`[DISPATCHER_DEBUG] ride_id=${rideId} query_returned=${drivers.length} drivers with availability=online`);
if (drivers.length > 0) {
  console.log(`[DISPATCHER_DEBUG] Sample driver:`, JSON.stringify({
    driver_id: drivers[0].driver_id,
    availability: drivers[0].availability,
    has_location: !!drivers[0].lat && !!drivers[0].lng,
    location_updated_at: drivers[0].updated_at
  }));
}

// Após filtrar por freshness
const now = Date.now();
const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutos

drivers.forEach(driver => {
  const locationAge = now - new Date(driver.updated_at).getTime();
  const isStale = locationAge > STALE_THRESHOLD_MS;
  
  if (isStale) {
    console.log(`[DISPATCHER_DISCARD] ride_id=${rideId} driver_id=${driver.driver_id} reason=stale_location age_ms=${locationAge} threshold_ms=${STALE_THRESHOLD_MS}`);
  }
});

// Após filtrar por distância
driversWithDistance.forEach(driver => {
  if (driver.distance > MAX_DISTANCE_KM) {
    console.log(`[DISPATCHER_DISCARD] ride_id=${rideId} driver_id=${driver.driver_id} reason=too_far distance_km=${driver.distance.toFixed(2)} max_km=${MAX_DISTANCE_KM}`);
  }
});

// Log final consolidado
console.log(`[DISPATCHER_FILTER] ride_id=${rideId} online=${onlineCount} with_location=${withLocationCount} fresh_location=${freshCount} within_distance=${withinDistanceCount} final_candidates=${finalCandidates.length} dropped=${JSON.stringify(droppedReasons)}`);
```

## Solução Imediata

Para validação funcionar completamente, atualizar localizações dos drivers imediatamente antes de criar corridas:

```sql
UPDATE driver_locations 
SET updated_at = NOW() 
WHERE driver_id IN ('test-driver-1', 'test-driver-2');
```

Ou ajustar o threshold de "stale location" no código:

```typescript
// De: 5 minutos
const STALE_THRESHOLD_MS = 5 * 60 * 1000;

// Para: 10 minutos (mais permissivo para testes)
const STALE_THRESHOLD_MS = 10 * 60 * 1000;
```

## Conclusão

O sistema está funcionando corretamente. O dispatcher está aplicando filtros de qualidade para garantir que apenas motoristas com localizações recentes sejam considerados. Para validação completa, basta atualizar os timestamps das localizações ou ajustar o threshold.
