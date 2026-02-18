# Load Test - Instruções de Execução

## Ajustes aplicados:

1. ✅ **Boot log padronizado**: `DEV_GEOFENCE_BOOST` agora mostra valor numérico (0.35)
2. ✅ **PGPASSWORD no validate script**: Não pede senha interativa
3. ✅ **Logs determinísticos no seed**: Mostra coordenadas exatas de cada driver INSIDE/OUTSIDE + validação automática

## Executar Load Test:

### Terminal 1: Backend DEV
```bash
cd backend
npm run dev
```

**Aguarde logs de boot:**
```
🗄️  Database: localhost:5433
📊 Environment: development
🔧 DEV_AUTO_ACCEPT: true
🔧 DEV_AUTO_RELEASE: true
🔧 DEV_GEOFENCE_BOOST: 0.35
```

### Terminal 2: Seed + Load Test
```bash
cd backend

# Seed (10 drivers: 5 INSIDE, 5 OUTSIDE)
npx dotenv -e .env.development -- npx tsx prisma/seed-load-test.ts

# Aguarde confirmação:
# ✅ Seed completed!
# 📍 Geofence boundaries (INSIDE): ...
# 🚗 Drivers INSIDE geofence (5): ...
# 🚗 Drivers OUTSIDE geofence (5): ...

# Load test (30 rides em 60s)
bash scripts/test-dev-load-geofence.sh
```

### Terminal 3: Validação (após teste)
```bash
cd backend
bash scripts/validate-load-test.sh
```

## Evidências esperadas:

### 1. Logs (Terminal 1)
Para cada ride, deve aparecer:
- `[RIDE_CREATED]`
- `[DISPATCHER_FILTER] ... online=10 fresh_location=10 final_candidates>=1`
- `[DISPATCH_CANDIDATES] ... top3=[{..., same_geofence: true}]`
- `[OFFER_SENT]`
- `[DEV_DRIVER_DECISION] ... same_geofence=true/false`
- `[OFFER_ACCEPTED]` (quando aceita)
- `[DEV_AUTO_RELEASE_SCHEDULED]`
- `[DEV_AUTO_RELEASE_DONE]`

### 2. Métricas SQL (Terminal 3)

**Critérios de PASSOU:**
- ✅ `accepted >= 20/30` (67%+)
- ✅ `expired ~ 0-2` (5% ignore prob)
- ✅ `rejected ~ 3` (10% reject prob)
- ✅ Pelo menos 2 drivers com `accepted > 0`
- ✅ **Geofence boost**: `accept_rate_inside > accept_rate_outside` por +10-20%
- ✅ **Driver matching**: `DRIVER_INSIDE + RIDE_INSIDE` tem mais aceites

### 3. Comparação INSIDE vs OUTSIDE

Exemplo esperado:
```
geofence | accepted | total | accept_rate
---------|----------|-------|------------
INSIDE   |    18    |  20   |   90.0
OUTSIDE  |     7    |  10   |   70.0
```

**Boost funcionando**: 90% vs 70% = +20% para INSIDE (boost de 35% aplicado)

## Parâmetros do cenário:

- **Drivers**: 10 (5 INSIDE, 5 OUTSIDE)
- **Rides**: 30 (20 INSIDE, 10 OUTSIDE)
- **Janela**: 60s (comprimido de 20 min simulados)
- **Accept prob**: 85%
- **Reject prob**: 10%
- **Ignore prob**: 5%
- **Ride duration**: 4-8 min (240-480s)
- **Geofence boost**: 35% (score reduction para INSIDE+INSIDE)

## Troubleshooting:

**Se `accepted` baixo (<15):**
- Verificar auto-release: `[DEV_AUTO_RELEASE_DONE]` nos logs
- Drivers devem voltar `online` após 4-8 min

**Se `expired` alto (>5):**
- Verificar `DEV_AUTO_ACCEPT=true` no boot log
- Verificar logs `[DEV_DRIVER_DECISION]`

**Se boost não aparece:**
- Verificar `[DISPATCH_CANDIDATES] top3` tem `same_geofence: true`
- Verificar coordenadas no seed estão dentro do range
