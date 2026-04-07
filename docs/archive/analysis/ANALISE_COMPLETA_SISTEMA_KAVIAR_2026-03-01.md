# 📊 ANÁLISE COMPLETA DO SISTEMA KAVIAR

**Data:** 01/03/2026 19:39 BRT  
**Objetivo:** Análise técnica completa do sistema para finalizar apps motorista e passageiro  
**Status:** Apenas análise - SEM modificações de código

---

## 📋 ÍNDICE

1. [Arquitetura Geral](#arquitetura-geral)
2. [Sistema de Matching e Geolocalização](#matching-geolocalização)
3. [Métricas de Motorista e Passageiro](#métricas)
4. [Sistema de Comunidades e Geofences](#comunidades-geofences)
5. [Apps Mobile - Estado Atual](#apps-mobile)
6. [Gaps e Próximos Passos](#gaps-próximos-passos)

---

## 🏗️ ARQUITETURA GERAL

### **Stack Tecnológico**

**Backend:**
- Node.js + Express + TypeScript
- PostgreSQL 15 + PostGIS (geometrias nativas)
- Prisma ORM
- AWS ECS (us-east-2)
- Redis (cache)
- S3 (uploads)

**Frontend Web:**
- React + Vite
- Material-UI
- Axios
- React Router

**Apps Mobile:**
- React Native + Expo
- TypeScript
- Expo Router

### **Banco de Dados - Tabelas Principais**

```
drivers
├─ id (uuid)
├─ neighborhood_id (FK neighborhoods) ← BASE DO MOTORISTA
├─ community_id (FK communities)
├─ status (pending|approved|suspended)
├─ last_lat, last_lng (localização atual)
├─ virtual_fence_center_lat/lng (cerca virtual)
└─ territory_type (BAIRRO_OFICIAL|FALLBACK_800M)

passengers
├─ id (uuid)
├─ neighborhood_id (FK neighborhoods)
├─ community_id (FK communities)
└─ status (ACTIVE)

neighborhoods
├─ id (uuid)
├─ name (string)
├─ city (default: "Rio de Janeiro")
├─ center_lat, center_lng (centro geográfico)
├─ is_active (boolean)
└─ area_type (BAIRRO_OFICIAL)

neighborhood_geofences
├─ id (uuid)
├─ neighborhood_id (FK neighborhoods)
├─ geom (geometry MultiPolygon SRID 4326) ← PostGIS nativo
├─ coordinates (JSON - backup)
└─ geofence_type (OFFICIAL|VIRTUAL)

communities
├─ id (uuid)
├─ name (string)
├─ center_lat, center_lng
├─ is_active (boolean)
└─ geofence (JSON)

community_geofences
├─ id (uuid)
├─ community_id (FK communities)
└─ geom (geometry MultiPolygon SRID 4326)

rides_v2
├─ id (uuid)
├─ driver_id (FK drivers)
├─ passenger_id (FK passengers)
├─ origin_lat, origin_lng
├─ destination_lat, destination_lng
├─ status (requested|accepted|completed)
├─ price (decimal)
├─ platform_fee (decimal)
└─ driver_amount (decimal)

match_logs
├─ trip_id (FK rides_v2)
├─ driver_id (FK drivers)
├─ match_type (SAME_NEIGHBORHOOD|ADJACENT_NEIGHBORHOOD|FALLBACK_800M|OUTSIDE_FENCE)
├─ platform_percent (7|12|20)
├─ platform_fee_brl (decimal)
└─ neighborhood_id (FK neighborhoods)
```

---

## 🎯 SISTEMA DE MATCHING E GEOLOCALIZAÇÃO

### **Fluxo de Resolução Territorial**

**Arquivo:** `/backend/src/services/territory-resolver.service.ts`

```
Coordenadas (lat, lng)
    ↓
1. Busca COMMUNITY via PostGIS ST_Covers
   SELECT * FROM community_geofences WHERE ST_Covers(geom, point)
    ↓ ENCONTROU?
    ✅ Retorna community + neighborhood (taxa 7%)
    ↓ NÃO ENCONTROU?
    
2. Busca NEIGHBORHOOD via PostGIS ST_Covers
   SELECT * FROM neighborhood_geofences WHERE ST_Covers(geom, point)
    ↓ ENCONTROU?
    ✅ Retorna neighborhood (taxa 7% ou 12%)
    ↓ NÃO ENCONTROU?
    
3. FALLBACK 800m (Haversine)
   - Busca bairro mais próximo com center_lat/lng
   - Se distância <= 800m
    ↓ ENCONTROU?
    ✅ Retorna neighborhood + flag fallback_800m (taxa 12%)
    ↓ NÃO ENCONTROU?
    
4. OUTSIDE
   ❌ Fora da área de serviço (taxa 20%)
```

### **Cálculo de Taxa**

**Arquivo:** `/backend/src/services/fee-calculation.ts`

**Tabela de Taxas:**

| Situação | Taxa | Match Type | Condição |
|----------|------|------------|----------|
| **Corrida completa no bairro** | 7% | SAME_NEIGHBORHOOD | pickup E dropoff no bairro do motorista |
| **Pickup OU dropoff no bairro** | 12% | ADJACENT_NEIGHBORHOOD | Um dos pontos no bairro |
| **Dentro do raio de 800m** | 12% | FALLBACK_800M | Comunidade sem geofence oficial |
| **Fora da cerca** | 20% | OUTSIDE_FENCE | Nenhum ponto no território |

**Lógica de Cálculo:**

```typescript
// 1. Buscar bairro base do motorista
const driverHomeNeighborhood = await getDriverHomeNeighborhood(driverId);

// 2. Resolver territórios de pickup e dropoff
const pickupTerritory = await resolveTerritory(pickupLng, pickupLat);
const dropoffTerritory = await resolveTerritory(dropoffLng, dropoffLat);

// 3. Aplicar lógica de taxa
if (pickup.neighborhood === driver.neighborhood && 
    dropoff.neighborhood === driver.neighborhood) {
  return { feePercentage: 7, matchType: 'SAME_NEIGHBORHOOD' };
}

if (pickup.neighborhood === driver.neighborhood || 
    dropoff.neighborhood === driver.neighborhood) {
  return { feePercentage: 12, matchType: 'ADJACENT_NEIGHBORHOOD' };
}

if (pickupTerritory.method === 'fallback_800m' || 
    dropoffTerritory.method === 'fallback_800m') {
  return { feePercentage: 12, matchType: 'FALLBACK_800M' };
}

return { feePercentage: 20, matchType: 'OUTSIDE_FENCE' };
```

### **Endpoints de Geolocalização**

**1. Resolver Coordenadas → Bairro**
```
POST /api/geo/resolve
Body: { lat: -22.9881, lng: -43.2492 }
Response: {
  resolved: true,
  neighborhood: { id: "uuid", name: "Rocinha" },
  community: { id: "uuid", name: "Rocinha" },
  method: "community"
}
```

**2. Listar Bairros Próximos**
```
GET /api/neighborhoods/smart-list?lat=-22.9881&lng=-43.2492
Response: {
  neighborhoods: [
    {
      id: "uuid",
      name: "Rocinha",
      distance: 0,
      hasGeofence: true,
      feePercentage: 7
    }
  ]
}
```

**3. Calcular Taxa de Corrida**
```
POST /api/trips/calculate-fee
Body: {
  driverId: "uuid",
  pickupLat: -22.9881,
  pickupLng: -43.2492,
  dropoffLat: -22.9891,
  dropoffLng: -43.2502,
  fareAmount: 25.00
}
Response: {
  feePercentage: 7,
  feeAmount: 1.75,
  driverEarnings: 23.25,
  matchType: "SAME_NEIGHBORHOOD"
}
```

---

## 📊 MÉTRICAS DE MOTORISTA E PASSAGEIRO

### **Métricas de Motorista**

**Endpoint:** `GET /api/drivers/:driverId/dashboard?period=30`

**Dados Retornados:**

```json
{
  "period": {
    "days": 30,
    "startDate": "2026-01-05",
    "endDate": "2026-02-05"
  },
  "driver": {
    "id": "uuid",
    "name": "João Silva",
    "homeNeighborhood": {
      "id": "uuid",
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
      "percentage": "16.0"
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
    "outsideFence": {
      "count": 5,
      "percentage": "11.1",
      "fee": "20%"
    }
  },
  "fenceStatus": {
    "active": true,
    "neighborhood": {
      "id": "uuid",
      "name": "Copacabana"
    },
    "inNeighborhoodRate": "66.7%",
    "recommendation": "Ótimo! Você está aproveitando bem sua cerca virtual."
  }
}
```

**Query SQL:**

```sql
-- Buscar corridas do período
SELECT 
  id,
  fare_amount,
  platform_fee_percentage,
  platform_fee_amount,
  match_type,
  created_at
FROM trips
WHERE driver_id = :driverId
  AND created_at >= :startDate
  AND status IN ('completed', 'finished')
ORDER BY created_at DESC;

-- Calcular métricas
totalTrips = COUNT(*)
totalFare = SUM(fare_amount)
totalKaviarFee = SUM(platform_fee_amount)
totalEarnings = totalFare - totalKaviarFee
avgFeePercentage = AVG(platform_fee_percentage)

-- Breakdown por tipo de match
SELECT 
  match_type,
  COUNT(*) as count,
  (COUNT(*) * 100.0 / :totalTrips) as percentage
FROM match_logs
WHERE driver_id = :driverId
  AND created_at >= :startDate
GROUP BY match_type;
```

### **Métricas de Passageiro**

**Endpoint:** `GET /api/passengers/:passengerId/rides?period=30`

**Dados Retornados:**

```json
{
  "period": {
    "days": 30,
    "startDate": "2026-01-05",
    "endDate": "2026-02-05"
  },
  "passenger": {
    "id": "uuid",
    "name": "Maria Silva",
    "homeNeighborhood": {
      "id": "uuid",
      "name": "Copacabana"
    }
  },
  "summary": {
    "totalRides": 20,
    "totalSpent": "500.00",
    "avgRideValue": "25.00",
    "favoriteDrivers": 3
  },
  "ridesByNeighborhood": {
    "sameNeighborhood": {
      "count": 15,
      "percentage": "75.0"
    },
    "otherNeighborhoods": {
      "count": 5,
      "percentage": "25.0"
    }
  },
  "recentRides": [
    {
      "id": "uuid",
      "driver": {
        "id": "uuid",
        "name": "João Silva"
      },
      "origin": "Rua X, 123",
      "destination": "Rua Y, 456",
      "price": "25.00",
      "status": "completed",
      "createdAt": "2026-02-05T07:30:00Z"
    }
  ]
}
```

---

## 🏘️ SISTEMA DE COMUNIDADES E GEOFENCES

### **Como Funciona**

**1. Cadastro de Bairro Oficial**

```sql
-- Inserir bairro
INSERT INTO neighborhoods (
  id, name, city, center_lat, center_lng, 
  is_active, area_type
) VALUES (
  uuid_generate_v4(),
  'Copacabana',
  'Rio de Janeiro',
  -22.9711,
  -43.1822,
  true,
  'BAIRRO_OFICIAL'
);

-- Inserir geofence oficial (PostGIS)
INSERT INTO neighborhood_geofences (
  id, neighborhood_id, geofence_type, 
  coordinates, geom
) VALUES (
  uuid_generate_v4(),
  :neighborhood_id,
  'OFFICIAL',
  :geojson_coordinates,
  ST_GeomFromGeoJSON(:geojson_geometry)
);
```

**2. Cadastro de Comunidade**

```sql
-- Inserir comunidade
INSERT INTO communities (
  id, name, center_lat, center_lng, is_active
) VALUES (
  uuid_generate_v4(),
  'Rocinha',
  -22.9881,
  -43.2492,
  true
);

-- Inserir geofence da comunidade (PostGIS)
INSERT INTO community_geofences (
  id, community_id, geom
) VALUES (
  uuid_generate_v4(),
  :community_id,
  ST_GeomFromGeoJSON(:geojson_geometry)
);
```

**3. Motorista Sem Geofence Oficial (Fallback 800m)**

Quando o motorista cadastra em uma comunidade **SEM geofence oficial**:

```typescript
// Sistema cria cerca virtual de 800m automaticamente
const neighborhoodCenter = await prisma.neighborhoods.findUnique({
  where: { id: driver.neighborhood_id },
  select: { center_lat: true, center_lng: true }
});

// Verifica se corrida está dentro do raio
const pickupDistance = calculateDistance(
  pickupLat, pickupLng,
  neighborhoodCenter.lat, neighborhoodCenter.lng
);

if (pickupDistance <= 800) {
  return { feePercentage: 12, matchType: 'FALLBACK_800M' };
}
```

### **Endpoints de Comunidades**

**1. Listar Comunidades**
```
GET /api/governance/communities
Response: {
  communities: [
    {
      id: "uuid",
      name: "Rocinha",
      isActive: true,
      hasGeofence: true
    }
  ]
}
```

**2. Criar Comunidade (Admin)**
```
POST /api/admin/communities
Body: {
  name: "Nova Comunidade",
  centerLat: -22.9881,
  centerLng: -43.2492,
  geojson: { ... }
}
```

**3. Verificar se Coordenada está em Comunidade**
```
POST /api/geo/resolve
Body: { lat: -22.9881, lng: -43.2492 }
Response: {
  resolved: true,
  community: { id: "uuid", name: "Rocinha" },
  method: "community"
}
```

### **Quando DÁ Match (Taxa 7%)**

✅ **Pickup E Dropoff no mesmo bairro do motorista**
- Motorista cadastrado em Copacabana
- Pickup em Copacabana
- Dropoff em Copacabana
- **Taxa:** 7% (SAME_NEIGHBORHOOD)

### **Quando DÁ Match Parcial (Taxa 12%)**

✅ **Pickup OU Dropoff no bairro do motorista**
- Motorista cadastrado em Copacabana
- Pickup em Copacabana
- Dropoff em Ipanema
- **Taxa:** 12% (ADJACENT_NEIGHBORHOOD)

✅ **Dentro do raio de 800m (Fallback)**
- Motorista cadastrado em comunidade sem geofence oficial
- Pickup a 300m do centro da comunidade
- Dropoff a 500m do centro da comunidade
- **Taxa:** 12% (FALLBACK_800M)

### **Quando NÃO DÁ Match (Taxa 20%)**

❌ **Fora da cerca virtual**
- Motorista cadastrado em Copacabana
- Pickup em Barra da Tijuca
- Dropoff em Recreio
- **Taxa:** 20% (OUTSIDE_FENCE)

❌ **Motorista sem bairro cadastrado**
- Motorista sem `neighborhood_id`
- **Taxa:** 20% (OUTSIDE_FENCE)

---

## 📱 APPS MOBILE - ESTADO ATUAL

### **App Motorista (kaviar-app)**

**Localização:** `/kaviar-app/`

**Status:** ⚠️ **ESTRUTURA BÁSICA - PRECISA IMPLEMENTAÇÃO**

**Arquivos Existentes:**
```
kaviar-app/
├─ app/
│  ├─ (auth)/
│  │  └─ register.tsx ❌ PLACEHOLDER
│  ├─ (driver)/
│  │  └─ home.tsx ❌ PLACEHOLDER
│  └─ _layout.tsx ✅ OK
├─ src/
│  ├─ api/
│  │  ├─ auth.api.ts ✅ OK
│  │  ├─ driver.api.ts ✅ OK
│  │  └─ rides.api.ts ✅ OK
│  ├─ auth/
│  │  └─ auth.store.ts ✅ OK
│  ├─ components/
│  │  ├─ Button.tsx ✅ OK
│  │  ├─ Input.tsx ✅ OK
│  │  └─ RideCard.tsx ✅ OK
│  └─ config/
│     └─ env.ts ✅ OK
└─ package.json ✅ OK
```

**O que FALTA implementar:**

1. **Tela de Cadastro (register.tsx)**
   - Formulário com: nome, email, telefone, senha
   - Pedir localização GPS
   - Resolver bairro automaticamente via `/api/geo/resolve`
   - Se não encontrar, mostrar lista de bairros próximos
   - Enviar para `POST /api/governance/driver`

2. **Tela de Upload de Documentos**
   - Upload de CNH, RG, CPF
   - Upload de foto do veículo
   - Campos: placa, modelo, cor
   - Enviar para `POST /api/drivers/me/documents`

3. **Tela Home do Motorista**
   - Toggle "Disponível/Indisponível"
   - Mapa com localização atual
   - Lista de corridas disponíveis
   - Aceitar/Rejeitar corridas

4. **Tela de Dashboard**
   - Métricas do período (30 dias)
   - Ganhos totais
   - Taxa média
   - Economia vs Uber
   - Breakdown por tipo de match

5. **Tela de Corrida Ativa**
   - Informações do passageiro
   - Origem e destino
   - Valor da corrida
   - Botões: Iniciar, Finalizar, Cancelar

### **App Passageiro (kaviar-app)**

**Status:** ⚠️ **NÃO IMPLEMENTADO**

**O que PRECISA implementar:**

1. **Tela de Cadastro**
   - Formulário com: nome, email, telefone, senha
   - Pedir localização GPS
   - Resolver bairro automaticamente
   - Enviar para `POST /api/governance/passenger`

2. **Tela Home do Passageiro**
   - Mapa com localização atual
   - Campo de busca de destino
   - Botão "Solicitar Corrida"
   - Estimativa de preço

3. **Tela de Solicitação de Corrida**
   - Origem (GPS atual)
   - Destino (busca)
   - Valor estimado
   - Botão "Confirmar"

4. **Tela de Corrida Ativa**
   - Informações do motorista
   - Localização do motorista no mapa
   - Status da corrida
   - Botão "Cancelar"

5. **Tela de Histórico**
   - Lista de corridas anteriores
   - Filtros por período
   - Detalhes de cada corrida

6. **Tela de Favoritos**
   - Lista de motoristas favoritos
   - Solicitar corrida com favorito

---

## 🔍 GAPS E PRÓXIMOS PASSOS

### **Backend - O que está PRONTO**

✅ Sistema de autenticação (JWT)  
✅ Cadastro de motorista e passageiro  
✅ Upload de documentos (S3)  
✅ Aprovação de motorista (admin)  
✅ Sistema de matching territorial (PostGIS)  
✅ Cálculo de taxa (7%, 12%, 20%)  
✅ Fallback 800m para comunidades sem geofence  
✅ Dashboard de métricas do motorista  
✅ Sistema de corridas (rides_v2)  
✅ Logs de match (analytics)  

### **Backend - O que FALTA**

❌ Validação de `neighborhoodId` no cadastro (verificar se existe e está ativo)  
❌ Endpoint de bairros próximos (`/api/neighborhoods/nearby`)  
❌ Sistema de notificações push (Firebase)  
❌ Sistema de pagamentos (PIX)  
❌ Sistema de avaliações (ratings)  
❌ Sistema de favoritos (passageiro → motorista)  

### **Frontend Web - O que está PRONTO**

✅ Admin: Gestão de motoristas  
✅ Admin: Gestão de passageiros  
✅ Admin: Gestão de comunidades  
✅ Admin: Gestão de geofences  
✅ Admin: Dashboard de métricas  
✅ Admin: Aprovação de documentos  

### **Frontend Web - O que FALTA**

❌ Tela de cadastro de motorista (público)  
❌ Tela de cadastro de passageiro (público)  

### **Apps Mobile - O que FALTA**

❌ **App Motorista:**
  - Tela de cadastro completa
  - Tela de upload de documentos
  - Tela home com mapa e corridas
  - Tela de dashboard de métricas
  - Tela de corrida ativa
  - Sistema de notificações

❌ **App Passageiro:**
  - Tela de cadastro completa
  - Tela home com mapa
  - Tela de solicitação de corrida
  - Tela de corrida ativa
  - Tela de histórico
  - Tela de favoritos
  - Sistema de notificações

---

## 🎯 PRÓXIMOS PASSOS RECOMENDADOS

### **Fase 1: Validações Backend (1-2 dias)**

1. Adicionar validação de `neighborhoodId` no cadastro
2. Criar endpoint `/api/neighborhoods/nearby?lat=X&lng=Y`
3. Adicionar filtro de bairros ativos em `/api/governance/neighborhoods`
4. Implementar persistência automática de bairro via GPS

### **Fase 2: App Motorista - MVP (5-7 dias)**

1. Implementar tela de cadastro com GPS
2. Implementar tela de upload de documentos
3. Implementar tela home com toggle disponível/indisponível
4. Implementar tela de dashboard de métricas
5. Implementar tela de corrida ativa (aceitar/iniciar/finalizar)

### **Fase 3: App Passageiro - MVP (5-7 dias)**

1. Implementar tela de cadastro com GPS
2. Implementar tela home com mapa
3. Implementar tela de solicitação de corrida
4. Implementar tela de corrida ativa
5. Implementar tela de histórico

### **Fase 4: Notificações e Pagamentos (3-5 dias)**

1. Integrar Firebase Cloud Messaging
2. Implementar notificações push (nova corrida, corrida aceita, etc)
3. Integrar sistema de pagamentos PIX
4. Implementar fluxo de pagamento na corrida

### **Fase 5: Features Avançadas (5-7 dias)**

1. Sistema de avaliações (ratings)
2. Sistema de favoritos
3. Sistema de bônus e incentivos
4. Sistema de suporte/chat

---

## 📝 RESUMO EXECUTIVO

### **Sistema Kaviar - Estado Atual**

**Backend:** ✅ **80% COMPLETO**
- Sistema de matching territorial funcionando
- Cálculo de taxa implementado (7%, 12%, 20%)
- Fallback 800m para comunidades sem geofence
- Dashboard de métricas do motorista
- Sistema de corridas (rides_v2)

**Frontend Web (Admin):** ✅ **90% COMPLETO**
- Gestão completa de motoristas, passageiros, comunidades
- Dashboard de métricas
- Aprovação de documentos

**Apps Mobile:** ⚠️ **20% COMPLETO**
- Estrutura básica criada
- APIs de integração prontas
- **FALTA:** Implementar todas as telas

### **Para Finalizar Apps:**

**Tempo Estimado:** 15-20 dias de desenvolvimento

**Prioridades:**
1. Validações backend (2 dias)
2. App Motorista MVP (7 dias)
3. App Passageiro MVP (7 dias)
4. Notificações e Pagamentos (5 dias)

**Recursos Necessários:**
- 1 desenvolvedor React Native (full-time)
- 1 desenvolvedor backend (part-time para ajustes)
- 1 designer UI/UX (part-time para telas)

---

**FIM DA ANÁLISE**
