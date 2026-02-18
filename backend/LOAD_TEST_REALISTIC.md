# Load Test Realista - 30 Rides / 10 Drivers / Geofence Boost

## Objetivo
Validar sistema DEV com:
- 30 rides em 60s (20 min simulados com time_scale=20)
- 10 drivers (5 INSIDE, 5 OUTSIDE geofence)
- Auto-accept com probabilidades + geofence boost
- Auto-release para sustentar throughput
- **Meta: >= 24 accepted (80%+), expired ~0-2, geofence boost visível**

## Parâmetros (fonte única: .env.development)

```bash
NODE_ENV=development
DATABASE_URL=postgresql://postgres:dev@localhost:5433/kaviar_dev?schema=public

# Simulação DEV
DEV_AUTO_ACCEPT=true
DEV_AUTO_RELEASE=true
DEV_RELEASE_MIN_MS=90000        # 90s simulado = 4.5s real
DEV_RELEASE_MAX_MS=180000       # 180s simulado = 9s real
DEV_ACCEPT_PROB=0.85            # 85% base
DEV_REJECT_PROB=0.10            # 10%
DEV_IGNORE_PROB=0.05            # 5% (expira)
DEV_GEOFENCE_BOOST=0.35         # +7% accept prob quando INSIDE+INSIDE (0.35*0.2)
DEV_TIME_SCALE=20               # 1s real = 20s simulado
```

## Execução

### Terminal 1: Backend
```bash
cd backend
npm run dev
```

**Aguarde boot logs:**
```
🗄️  Database: localhost:5433
📊 Environment: development
🔧 DEV_AUTO_ACCEPT: true
🔧 DEV_AUTO_RELEASE: true
🔧 DEV_ACCEPT_PROB: 0.85
🔧 DEV_REJECT_PROB: 0.10
🔧 DEV_IGNORE_PROB: 0.05
🔧 DEV_RELEASE_MIN_MS: 90000
🔧 DEV_RELEASE_MAX_MS: 180000
🔧 DEV_GEOFENCE_BOOST: 0.35
🔧 DEV_TIME_SCALE: 20
```

### Terminal 2: Seed + Load Test
```bash
cd backend

# Seed (10 drivers)
npx dotenv -e .env.development -- npx tsx prisma/seed-load-test.ts

# Aguarde confirmação de coordenadas INSIDE/OUTSIDE

# Load test (30 rides)
bash scripts/test-dev-load-geofence.sh
```

### Terminal 3: Validação
```bash
cd backend
bash scripts/validate-load-test.sh
```

## Logs esperados (Terminal 1)

Para cada ride:
```
[RIDE_CREATED] ride_id=...
[DISPATCHER_FILTER] ... online=10 fresh_location=10 final_candidates>=1
[DISPATCH_CANDIDATES] ... top3=[{..., same_geofence: true, score: X}]
[OFFER_SENT] ...
[DEV_DRIVER_DECISION] ... action=accept accept_prob=0.920 same_geofence=true jitter_ms=15
[DEV_AUTO_ACCEPT_DONE] ...
[OFFER_ACCEPTED] ...
[RIDE_STATUS_CHANGED] ... status=accepted
[DEV_AUTO_RELEASE_SCHEDULED] ... duration_ms_sim=135000 duration_ms_real=6750
[DEV_AUTO_RELEASE_DONE] ... availability=online
```

**Nota**: `accept_prob=0.920` quando `same_geofence=true`
- Base: 0.85 (85%)
- Boost factor: 0.35 (configurado)
- Boost prob: 0.35 * 0.2 = 0.07 (7 pontos percentuais)
- Final: min(0.98, 0.85 + 0.07) = 0.92 (92%)
- Cap: Limitado a 98% via `Math.min(0.98, ...)`

## Métricas esperadas (Terminal 3)

### 1. Rides by status
```
  status   | count
-----------+-------
 accepted  |  26   ← >= 24 (80%+)
 rejected  |   2   ← ~10%
 expired   |   1   ← ~5%
 no_driver |   1   ← baixo
```

### 2. Offers by status
```
  status   | count
-----------+-------
 accepted  |  26
 rejected  |   3
 expired   |   2
```

### 3. Distribution by driver
```
   driver_id      | accepted
------------------+----------
 driver-inside-1  |    6
 driver-inside-2  |    5
 driver-inside-3  |    5
 driver-outside-1 |    4
 driver-outside-2 |    3
 ...
```
**Critério**: Pelo menos 5 drivers com `accepted > 0`

### 4. Geofence boost (INSIDE vs OUTSIDE)
```
 geofence | accepted | total | accept_rate
----------+----------+-------+-------------
 INSIDE   |    18    |  20   |   90.0
 OUTSIDE  |     8    |  10   |   80.0
```

**Critério**: `accept_rate_inside - accept_rate_outside >= 5pp` (preferível >= 7pp)
- Diferença: 90.0 - 80.0 = 10pp >= 7pp ✅
- Nota: Com amostra pequena (10 OUTSIDE), diferença pode variar 70-90%
- Critério >= 5pp é robusto para detectar boost mesmo com variância

### 5. Driver location vs Ride location
```
   driver_loc    |  ride_loc   | count
-----------------+-------------+-------
 DRIVER_INSIDE  | RIDE_INSIDE |   18   ← Maior (boost aplicado)
 DRIVER_OUTSIDE | RIDE_OUTSIDE|    6
 DRIVER_INSIDE  | RIDE_OUTSIDE|    1
 DRIVER_OUTSIDE | RIDE_INSIDE |    1
```

**Critério**: `DRIVER_INSIDE + RIDE_INSIDE` deve ser o maior grupo

## Critérios de PASSOU ✅

**Critérios obrigatórios:**
- ✅ `accepted >= 24/30` (80%+)
- ✅ `expired <= 2` (ideal 0, tolerância 5% ignore prob)
- ✅ `rejected ~ 3` (10% reject prob)
- ✅ `no_driver <= 3` (auto-release funcionando)
- ✅ Pelo menos 5 drivers com `accepted > 0`
- ✅ `accept_rate_inside - accept_rate_outside >= 5pp` (preferível >= 7pp para casar com boost_prob)
- ✅ `DRIVER_INSIDE + RIDE_INSIDE` é o maior grupo
- ✅ Logs mostram `accept_prob` maior quando `same_geofence=true`

**Nota sobre variância estatística:**
Com apenas 10 rides OUTSIDE, a variância é alta:
- 8/10 = 80%, 9/10 = 90% → diferença de 1 ride = 10pp
- Critério >= 5pp é robusto para detectar boost mesmo com variância
- Para auditoria rigorosa: rodar 60 rides (40 INSIDE / 20 OUTSIDE) ou 2x execuções de 30

## Troubleshooting

**Se `accepted < 20`:**
- Verificar `[DEV_AUTO_RELEASE_DONE]` nos logs
- Verificar `duration_ms_real` está entre 4.5-9s
- Drivers devem voltar `online` rapidamente

**Se `expired > 5`:**
- Verificar `DEV_IGNORE_PROB=0.05` no boot log
- Verificar `[DEV_DRIVER_DECISION]` mostra `action=ignore` em ~5% dos casos

**Se boost não aparece:**
- Verificar `accept_prob` nos logs: deve ser 0.92 quando `same_geofence=true`
- Verificar coordenadas do seed estão dentro do range INSIDE
- Verificar `[DISPATCH_CANDIDATES] top3` tem `same_geofence: true`

## Matemática do cenário

Com 10 drivers e time_scale=20:
- Ride duration real: 4.5-9s (média 6.75s)
- 30 rides em 60s = 1 ride a cada 2s
- Capacidade teórica: 10 drivers * (60s / 6.75s) = ~89 rides
- **30 rides é ~34% da capacidade → deve ter throughput sobrando**

Com accept_prob=0.85 (base) e boost_prob=0.07:
- INSIDE boosted: 0.85 + 0.07 = 0.92 (92%)
- OUTSIDE base: 0.85 (85%)
- 20 rides INSIDE * 0.92 = ~18 accepted
- 10 rides OUTSIDE * 0.85 = ~8.5 accepted
- **Total esperado: ~26-27 accepted (87%)**

**Diferença esperada**: 92% - 85% = 7pp (boost_prob)

**Opcional - Teste com 60 rides (mais robusto):**
- 40 INSIDE * 0.92 = ~37 accepted
- 20 OUTSIDE * 0.85 = ~17 accepted
- Total: ~54 accepted
- Diferença mais estável: 1 ride = 2.5pp (vs 10pp com 10 rides)
