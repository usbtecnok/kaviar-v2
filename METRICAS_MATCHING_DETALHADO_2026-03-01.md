# 📊 MÉTRICAS E MATCHING - DETALHAMENTO TÉCNICO

**Data:** 01/03/2026 19:39 BRT  
**Foco:** Sistema de matching territorial e métricas de motorista/passageiro

---

## 🎯 SISTEMA DE MATCHING TERRITORIAL

### **Conceito Central**

O Kaviar usa **matching territorial baseado em geolocalização** para calcular a taxa da plataforma. Quanto mais próximo o motorista estiver do seu "bairro base", menor a taxa.

### **Hierarquia de Resolução**

```
1. COMMUNITY (Comunidade)
   ├─ Geofence oficial via PostGIS
   ├─ Taxa: 7% (se pickup E dropoff na mesma comunidade)
   └─ Exemplo: Rocinha, Vidigal, Complexo do Alemão

2. NEIGHBORHOOD (Bairro)
   ├─ Geofence oficial via PostGIS
   ├─ Taxa: 7% (se pickup E dropoff no mesmo bairro)
   └─ Exemplo: Copacabana, Ipanema, Leblon

3. FALLBACK_800M (Cerca Virtual)
   ├─ Raio de 800m ao redor do centro do bairro
   ├─ Taxa: 12% (se pickup E dropoff dentro do raio)
   └─ Usado quando não há geofence oficial

4. OUTSIDE (Fora da Cerca)
   ├─ Nenhum match territorial
   ├─ Taxa: 20%
   └─ Corrida fora do território do motorista
```

### **Fluxo de Cálculo de Taxa**

```typescript
// Arquivo: /backend/src/services/fee-calculation.ts

async function calculateTripFee(
  driverId: string,
  pickupLat: number,
  pickupLng: number,
  dropoffLat: number,
  dropoffLng: number,
  fareAmount: number
): Promise<FeeCalculation> {
  
  // 1. Buscar bairro base do motorista
  const driverHomeNeighborhood = await getDriverHomeNeighborhood(driverId);
  // SELECT neighborhood_id FROM drivers WHERE id = :driverId
  
  // 2. Resolver territórios de pickup e dropoff
  const pickupTerritory = await resolveTerritory(pickupLng, pickupLat);
  const dropoffTerritory = await resolveTerritory(dropoffLng, dropoffLat);
  
  // 3. CASO 1: Motorista sem bairro = taxa máxima
  if (!driverHomeNeighborhood) {
    return {
      feePercentage: 20,
      matchType: 'OUTSIDE_FENCE',
      reason: 'Motorista sem bairro base cadastrado'
    };
  }
  
  // 4. CASO 2: Pickup E dropoff no mesmo bairro = taxa mínima (7%)
  if (pickupTerritory.neighborhood?.id === driverHomeNeighborhood.id &&
      dropoffTerritory.neighborhood?.id === driverHomeNeighborhood.id) {
    return {
      feePercentage: 7,
      matchType: 'SAME_NEIGHBORHOOD',
      reason: `Corrida completa em ${driverHomeNeighborhood.name}`
    };
  }
  
  // 5. CASO 3: Pickup OU dropoff no bairro = taxa média (12%)
  if (pickupTerritory.neighborhood?.id === driverHomeNeighborhood.id ||
      dropoffTerritory.neighborhood?.id === driverHomeNeighborhood.id) {
    return {
      feePercentage: 12,
      matchType: 'ADJACENT_NEIGHBORHOOD',
      reason: 'Um dos pontos no bairro do motorista'
    };
  }
  
  // 6. CASO 4: Fallback 800m
  if (pickupTerritory.method === 'fallback_800m' ||
      dropoffTerritory.method === 'fallback_800m') {
    return {
      feePercentage: 12,
      matchType: 'FALLBACK_800M',
      reason: 'Corrida dentro do raio de 800m'
    };
  }
  
  // 7. CASO 5: Fora da cerca = taxa máxima (20%)
  return {
    feePercentage: 20,
    matchType: 'OUTSIDE_FENCE',
    reason: 'Corrida fora da cerca virtual'
  };
}
```

### **Resolução de Território (PostGIS)**

```typescript
// Arquivo: /backend/src/services/territory-resolver.service.ts

async function resolveTerritory(
  lng: number,
  lat: number
): Promise<TerritoryResolution> {
  
  // 1. Tentar resolver COMMUNITY via PostGIS
  const community = await prisma.$queryRaw`
    SELECT c.id, c.name
    FROM communities c
    JOIN community_geofences cg ON c.id = cg.community_id
    WHERE cg.geom IS NOT NULL
      AND c.is_active = true
      AND ST_Covers(
        cg.geom,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)
      )
    LIMIT 1
  `;
  
  if (community[0]) {
    return {
      resolved: true,
      community: community[0],
      method: 'community'
    };
  }
  
  // 2. Tentar resolver NEIGHBORHOOD via PostGIS
  const neighborhood = await prisma.$queryRaw`
    SELECT n.id, n.name
    FROM neighborhoods n
    JOIN neighborhood_geofences ng ON ng.neighborhood_id = n.id
    WHERE ng.geom IS NOT NULL
      AND n.is_active = true
      AND ST_Covers(
        ng.geom,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)
      )
    LIMIT 1
  `;
  
  if (neighborhood[0]) {
    return {
      resolved: true,
      neighborhood: neighborhood[0],
      method: 'neighborhood'
    };
  }
  
  // 3. Fallback: buscar bairro mais próximo dentro de 800m
  const fallback = await resolveFallback(lng, lat);
  
  if (fallback) {
    return {
      resolved: true,
      neighborhood: fallback,
      method: 'fallback_800m',
      fallbackMeters: fallback.distance
    };
  }
  
  // 4. Fora da área de serviço
  return {
    resolved: false,
    method: 'outside'
  };
}
```

### **Fallback 800m (Haversine)**

```typescript
async function resolveFallback(
  lng: number,
  lat: number
): Promise<{ id: string; name: string; distance: number } | null> {
  
  // Buscar todos os bairros ativos com centro definido
  const neighborhoods = await prisma.neighborhoods.findMany({
    where: {
      is_active: true,
      center_lat: { not: null },
      center_lng: { not: null }
    },
    select: {
      id: true,
      name: true,
      center_lat: true,
      center_lng: true
    }
  });
  
  // Calcular distância Haversine para cada bairro
  const withDistance = neighborhoods
    .map(n => ({
      id: n.id,
      name: n.name,
      distance: calculateDistance(
        lat, lng,
        Number(n.center_lat),
        Number(n.center_lng)
      )
    }))
    .filter(n => n.distance <= 800) // Apenas dentro de 800m
    .sort((a, b) => a.distance - b.distance); // Mais próximo primeiro
  
  return withDistance[0] || null;
}

function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Raio da Terra em metros
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distância em metros
}
```

---

## 📊 MÉTRICAS DE MOTORISTA

### **Dashboard Completo**

**Endpoint:** `GET /api/drivers/:driverId/dashboard?period=30`

**Query SQL:**

```sql
-- 1. Buscar corridas do período
SELECT 
  r.id,
  r.price as fare_amount,
  r.platform_fee as platform_fee_amount,
  r.driver_amount,
  ml.match_type,
  ml.platform_percent as platform_fee_percentage,
  r.created_at
FROM rides_v2 r
LEFT JOIN match_logs ml ON ml.trip_id = r.id
WHERE r.driver_id = :driverId
  AND r.created_at >= :startDate
  AND r.created_at <= :endDate
  AND r.status IN ('completed', 'finished')
ORDER BY r.created_at DESC;

-- 2. Calcular métricas agregadas
SELECT 
  COUNT(*) as total_trips,
  SUM(r.price) as total_fare,
  SUM(r.platform_fee) as total_kaviar_fee,
  SUM(r.driver_amount) as total_earnings,
  AVG(ml.platform_percent) as avg_fee_percentage
FROM rides_v2 r
LEFT JOIN match_logs ml ON ml.trip_id = r.id
WHERE r.driver_id = :driverId
  AND r.created_at >= :startDate
  AND r.status IN ('completed', 'finished');

-- 3. Breakdown por tipo de match
SELECT 
  ml.match_type,
  COUNT(*) as count,
  (COUNT(*) * 100.0 / :totalTrips) as percentage
FROM match_logs ml
WHERE ml.driver_id = :driverId
  AND ml.created_at >= :startDate
GROUP BY ml.match_type
ORDER BY count DESC;
```

**Cálculos:**

```typescript
// Resumo geral
const totalTrips = rides.length;
const totalFare = rides.reduce((sum, r) => sum + r.fare_amount, 0);
const totalKaviarFee = rides.reduce((sum, r) => sum + r.platform_fee_amount, 0);
const totalEarnings = totalFare - totalKaviarFee;
const avgFeePercentage = rides.reduce((sum, r) => sum + r.platform_fee_percentage, 0) / totalTrips;

// Comparação com Uber
const UBER_FEE = 25; // Taxa fixa Uber
const uberFeeAmount = (totalFare * UBER_FEE) / 100;
const savings = uberFeeAmount - totalKaviarFee;
const savingsPercentage = (savings / totalFare) * 100;

// Breakdown por tipo de match
const matchBreakdown = {
  sameNeighborhood: {
    count: rides.filter(r => r.match_type === 'SAME_NEIGHBORHOOD').length,
    percentage: (count / totalTrips) * 100,
    fee: 7
  },
  adjacentNeighborhood: {
    count: rides.filter(r => r.match_type === 'ADJACENT_NEIGHBORHOOD').length,
    percentage: (count / totalTrips) * 100,
    fee: 12
  },
  fallback800m: {
    count: rides.filter(r => r.match_type === 'FALLBACK_800M').length,
    percentage: (count / totalTrips) * 100,
    fee: 12
  },
  outsideFence: {
    count: rides.filter(r => r.match_type === 'OUTSIDE_FENCE').length,
    percentage: (count / totalTrips) * 100,
    fee: 20
  }
};

// Status da cerca virtual
const inNeighborhoodCount = matchBreakdown.sameNeighborhood.count;
const inNeighborhoodRate = (inNeighborhoodCount / totalTrips) * 100;

const fenceStatus = {
  active: !!driverHomeNeighborhood,
  neighborhood: driverHomeNeighborhood,
  inNeighborhoodRate: `${inNeighborhoodRate.toFixed(1)}%`,
  recommendation: inNeighborhoodRate >= 50
    ? 'Ótimo! Você está aproveitando bem sua cerca virtual.'
    : 'Tente fazer mais corridas no seu bairro para economizar!'
};
```

### **Exemplo de Resposta**

```json
{
  "success": true,
  "data": {
    "period": {
      "days": 30,
      "startDate": "2026-01-05T00:00:00Z",
      "endDate": "2026-02-05T23:59:59Z"
    },
    "driver": {
      "id": "driver-uuid",
      "name": "João Silva",
      "homeNeighborhood": {
        "id": "neighborhood-uuid",
        "name": "Copacabana",
        "city": "Rio de Janeiro"
      }
    },
    "summary": {
      "totalTrips": 45,
      "totalFare": "1125.00",
      "totalEarnings": "1023.75",
      "avgFeePercentage": "9.0"
    },
    "comparison": {
      "kaviar": {
        "fee": "101.25",
        "percentage": "9.0"
      },
      "uber": {
        "fee": "281.25",
        "percentage": "25"
      },
      "savings": {
        "amount": "180.00",
        "percentage": "16.0",
        "message": "Você economizou R$ 180.00 vs Uber!"
      }
    },
    "matchBreakdown": {
      "sameNeighborhood": {
        "count": 30,
        "percentage": "66.7",
        "fee": "7%"
      },
      "adjacentNeighborhood": {
        "count": 10,
        "percentage": "22.2",
        "fee": "12%"
      },
      "fallback800m": {
        "count": 0,
        "percentage": "0.0",
        "fee": "12%"
      },
      "outsideFence": {
        "count": 5,
        "percentage": "11.1",
        "fee": "20%"
      }
    },
    "fenceStatus": {
      "active": true,
      "neighborhood": {
        "id": "neighborhood-uuid",
        "name": "Copacabana",
        "city": "Rio de Janeiro"
      },
      "inNeighborhoodRate": "66.7%",
      "recommendation": "Ótimo! Você está aproveitando bem sua cerca virtual."
    },
    "recentTrips": [
      {
        "id": "ride-uuid-1",
        "fare": "25.00",
        "fee": "7%",
        "feeAmount": "1.75",
        "earnings": "23.25",
        "matchType": "SAME_NEIGHBORHOOD",
        "date": "2026-02-05T07:30:00Z",
        "origin": "Rua X, 123 - Copacabana",
        "destination": "Rua Y, 456 - Copacabana"
      },
      {
        "id": "ride-uuid-2",
        "fare": "30.00",
        "fee": "12%",
        "feeAmount": "3.60",
        "earnings": "26.40",
        "matchType": "ADJACENT_NEIGHBORHOOD",
        "date": "2026-02-04T18:15:00Z",
        "origin": "Rua A, 789 - Copacabana",
        "destination": "Rua B, 321 - Ipanema"
      }
    ]
  }
}
```

---

## 📊 MÉTRICAS DE PASSAGEIRO

### **Histórico de Corridas**

**Endpoint:** `GET /api/passengers/:passengerId/rides?period=30`

**Query SQL:**

```sql
-- Buscar corridas do passageiro
SELECT 
  r.id,
  r.driver_id,
  d.name as driver_name,
  r.origin_lat,
  r.origin_lng,
  r.origin_address,
  r.destination_lat,
  r.destination_lng,
  r.destination_address,
  r.price,
  r.status,
  r.created_at,
  r.completed_at
FROM rides_v2 r
LEFT JOIN drivers d ON d.id = r.driver_id
WHERE r.passenger_id = :passengerId
  AND r.created_at >= :startDate
  AND r.created_at <= :endDate
ORDER BY r.created_at DESC;

-- Métricas agregadas
SELECT 
  COUNT(*) as total_rides,
  SUM(r.price) as total_spent,
  AVG(r.price) as avg_ride_value,
  COUNT(DISTINCT r.driver_id) as unique_drivers
FROM rides_v2 r
WHERE r.passenger_id = :passengerId
  AND r.created_at >= :startDate
  AND r.status IN ('completed', 'finished');
```

### **Motoristas Favoritos**

**Endpoint:** `GET /api/passengers/:passengerId/favorites`

**Query SQL:**

```sql
-- Buscar motoristas favoritos
SELECT 
  pf.driver_id,
  d.name as driver_name,
  d.vehicle_model,
  d.vehicle_color,
  d.vehicle_plate,
  COUNT(r.id) as total_rides,
  AVG(r.rating) as avg_rating,
  pf.created_at as favorited_at
FROM passenger_favorites pf
LEFT JOIN drivers d ON d.id = pf.driver_id
LEFT JOIN rides_v2 r ON r.driver_id = pf.driver_id AND r.passenger_id = pf.passenger_id
WHERE pf.passenger_id = :passengerId
GROUP BY pf.driver_id, d.name, d.vehicle_model, d.vehicle_color, d.vehicle_plate, pf.created_at
ORDER BY total_rides DESC;
```

---

## 🎯 CENÁRIOS DE MATCHING

### **Cenário 1: Motorista em Copacabana**

**Cadastro:**
- `neighborhood_id`: "copacabana-uuid"
- `neighborhood.name`: "Copacabana"
- `neighborhood.center_lat`: -22.9711
- `neighborhood.center_lng`: -43.1822

**Corrida 1: Copacabana → Copacabana**
- Pickup: Rua X, 123 - Copacabana (-22.9711, -43.1822)
- Dropoff: Rua Y, 456 - Copacabana (-22.9721, -43.1832)
- **Resultado:** Taxa 7% (SAME_NEIGHBORHOOD)
- **Motivo:** Pickup E dropoff no bairro do motorista

**Corrida 2: Copacabana → Ipanema**
- Pickup: Rua X, 123 - Copacabana (-22.9711, -43.1822)
- Dropoff: Rua Z, 789 - Ipanema (-22.9831, -43.1951)
- **Resultado:** Taxa 12% (ADJACENT_NEIGHBORHOOD)
- **Motivo:** Pickup no bairro do motorista, dropoff fora

**Corrida 3: Barra → Recreio**
- Pickup: Av. A, 1000 - Barra da Tijuca (-23.0045, -43.3641)
- Dropoff: Av. B, 2000 - Recreio (-23.0245, -43.4641)
- **Resultado:** Taxa 20% (OUTSIDE_FENCE)
- **Motivo:** Nenhum ponto no bairro do motorista

### **Cenário 2: Motorista em Comunidade Sem Geofence (Rocinha)**

**Cadastro:**
- `neighborhood_id`: "rocinha-uuid"
- `neighborhood.name`: "Rocinha"
- `neighborhood.center_lat`: -22.9881
- `neighborhood.center_lng`: -43.2492
- **Geofence oficial:** ❌ NÃO TEM

**Corrida 1: Dentro do raio de 800m**
- Pickup: 50m do centro da Rocinha (-22.9886, -43.2497)
- Dropoff: 300m do centro da Rocinha (-22.9908, -43.2522)
- **Resultado:** Taxa 12% (FALLBACK_800M)
- **Motivo:** Ambos os pontos dentro do raio de 800m

**Corrida 2: Fora do raio de 800m**
- Pickup: 50m do centro da Rocinha (-22.9886, -43.2497)
- Dropoff: 1.5km do centro da Rocinha (-23.0016, -43.2622)
- **Resultado:** Taxa 20% (OUTSIDE_FENCE)
- **Motivo:** Dropoff fora do raio de 800m

### **Cenário 3: Motorista Sem Bairro Cadastrado**

**Cadastro:**
- `neighborhood_id`: NULL
- **Resultado:** Taxa 20% (OUTSIDE_FENCE) para TODAS as corridas
- **Motivo:** Motorista sem bairro base cadastrado

---

## 📈 COMO CRIAR COMUNIDADE OU GEOFENCE

### **1. Criar Bairro Oficial (Admin)**

**Endpoint:** `POST /api/admin/neighborhoods`

**Payload:**
```json
{
  "name": "Novo Bairro",
  "city": "Rio de Janeiro",
  "centerLat": -22.9711,
  "centerLng": -43.1822,
  "geojson": {
    "type": "Feature",
    "geometry": {
      "type": "Polygon",
      "coordinates": [
        [
          [-43.1822, -22.9711],
          [-43.1832, -22.9711],
          [-43.1832, -22.9721],
          [-43.1822, -22.9721],
          [-43.1822, -22.9711]
        ]
      ]
    }
  }
}
```

**SQL Executado:**
```sql
-- Inserir bairro
INSERT INTO neighborhoods (
  id, name, city, center_lat, center_lng, is_active, area_type
) VALUES (
  uuid_generate_v4(),
  'Novo Bairro',
  'Rio de Janeiro',
  -22.9711,
  -43.1822,
  true,
  'BAIRRO_OFICIAL'
);

-- Inserir geofence (PostGIS)
INSERT INTO neighborhood_geofences (
  id, neighborhood_id, geofence_type, coordinates, geom
) VALUES (
  uuid_generate_v4(),
  :neighborhood_id,
  'OFFICIAL',
  :geojson_coordinates,
  ST_GeomFromGeoJSON(:geojson_geometry)
);
```

### **2. Criar Comunidade (Admin)**

**Endpoint:** `POST /api/admin/communities`

**Payload:**
```json
{
  "name": "Nova Comunidade",
  "centerLat": -22.9881,
  "centerLng": -43.2492,
  "geojson": {
    "type": "Feature",
    "geometry": {
      "type": "Polygon",
      "coordinates": [
        [
          [-43.2492, -22.9881],
          [-43.2502, -22.9881],
          [-43.2502, -22.9891],
          [-43.2492, -22.9891],
          [-43.2492, -22.9881]
        ]
      ]
    }
  }
}
```

**SQL Executado:**
```sql
-- Inserir comunidade
INSERT INTO communities (
  id, name, center_lat, center_lng, is_active
) VALUES (
  uuid_generate_v4(),
  'Nova Comunidade',
  -22.9881,
  -43.2492,
  true
);

-- Inserir geofence (PostGIS)
INSERT INTO community_geofences (
  id, community_id, geom
) VALUES (
  uuid_generate_v4(),
  :community_id,
  ST_GeomFromGeoJSON(:geojson_geometry)
);
```

### **3. Verificar se Coordenada está em Geofence**

**Endpoint:** `POST /api/geo/resolve`

**Payload:**
```json
{
  "lat": -22.9881,
  "lng": -43.2492
}
```

**Resposta:**
```json
{
  "resolved": true,
  "community": {
    "id": "community-uuid",
    "name": "Rocinha"
  },
  "neighborhood": {
    "id": "neighborhood-uuid",
    "name": "São Conrado"
  },
  "method": "community",
  "srid": 4326
}
```

---

## 🔍 VALORES QUANDO DÁ E NÃO DÁ MATCH

### **Tabela de Valores**

| Cenário | Pickup | Dropoff | Taxa | Match Type | Valor Corrida | Taxa Kaviar | Motorista Recebe |
|---------|--------|---------|------|------------|---------------|-------------|------------------|
| **Match Perfeito** | Copacabana | Copacabana | 7% | SAME_NEIGHBORHOOD | R$ 25,00 | R$ 1,75 | R$ 23,25 |
| **Match Parcial** | Copacabana | Ipanema | 12% | ADJACENT_NEIGHBORHOOD | R$ 25,00 | R$ 3,00 | R$ 22,00 |
| **Fallback 800m** | Rocinha (300m) | Rocinha (500m) | 12% | FALLBACK_800M | R$ 25,00 | R$ 3,00 | R$ 22,00 |
| **Sem Match** | Barra | Recreio | 20% | OUTSIDE_FENCE | R$ 25,00 | R$ 5,00 | R$ 20,00 |
| **Uber** | Qualquer | Qualquer | 25% | N/A | R$ 25,00 | R$ 6,25 | R$ 18,75 |

### **Economia vs Uber**

**Exemplo: 45 corridas em 30 dias**

| Tipo de Match | Corridas | Taxa Média | Valor Total | Taxa Kaviar | Taxa Uber | Economia |
|---------------|----------|------------|-------------|-------------|-----------|----------|
| SAME_NEIGHBORHOOD | 30 (66.7%) | 7% | R$ 750,00 | R$ 52,50 | R$ 187,50 | R$ 135,00 |
| ADJACENT_NEIGHBORHOOD | 10 (22.2%) | 12% | R$ 250,00 | R$ 30,00 | R$ 62,50 | R$ 32,50 |
| OUTSIDE_FENCE | 5 (11.1%) | 20% | R$ 125,00 | R$ 25,00 | R$ 31,25 | R$ 6,25 |
| **TOTAL** | **45** | **9.0%** | **R$ 1.125,00** | **R$ 107,50** | **R$ 281,25** | **R$ 173,75** |

**Economia total:** R$ 173,75 (15.4% do valor total)

---

**FIM DO DOCUMENTO**
