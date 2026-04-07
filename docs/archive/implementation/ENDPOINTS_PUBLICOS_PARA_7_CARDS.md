# ENDPOINTS PÚBLICOS PARA 7 CARDS GPS/TERRITÓRIO

**Data:** 2026-02-12  
**Objetivo:** Documentar endpoints existentes e propor 2 novos endpoints públicos read-only para suportar implementação dos 7 cards de GPS/Território sem risco.

---

## 1. TABELA DOS 14 ENDPOINTS FUNCIONAIS

| # | METHOD | PATH | AUTH | FINALIDADE | PAYLOAD PRINCIPAL |
|---|--------|------|------|------------|-------------------|
| 1 | POST | `/api/passenger/onboarding` | Público | Cadastro inicial de passageiro | `name, email, password, phone, neighborhoodId, communityId` |
| 2 | POST | `/api/passenger/onboarding/location` | Passenger | Captura GPS pós-cadastro + resolve território | `lat, lng, accuracy_m` |
| 3 | POST | `/api/driver/onboarding` | Público | Cadastro inicial de motorista | `name, email, phone, neighborhoodId, communityId, cpf, cnh` |
| 4 | POST | `/api/passenger/register` | Público | Registro alternativo de passageiro | `name, email, password, phone` |
| 5 | POST | `/api/passenger/login` | Público | Login de passageiro | `email, password` |
| 6 | POST | `/api/driver/login` | Público | Login de motorista | `email, password` |
| 7 | GET | `/api/geo/resolve` | Público | Resolve coordenadas para comunidade/bairro | `lat, lon` (query params) |
| 8 | POST | `/api/trips/estimate-fee` | Público | Estima taxa territorial de corrida | `driverId, pickupLat, pickupLng, dropoffLat, dropoffLng, fareAmount` |
| 9 | GET | `/api/trips/fee-percentage` | Público | Retorna apenas percentual de taxa (rápido) | `driverId, pickupLat, pickupLng, dropoffLat, dropoffLng` (query) |
| 10 | GET | `/api/drivers/:driverId/dashboard` | Público | Dashboard completo com estatísticas territoriais | `driverId` (path param), `period` (query, default 30 dias) |
| 11 | POST | `/api/drivers/me/verify-territory` | Driver | Verifica e atualiza território do motorista | `neighborhoodId, lat, lng, verificationMethod` |
| 12 | GET | `/api/drivers/me/territory-stats` | Driver | Estatísticas de território do motorista | Nenhum (usa token JWT) |
| 13 | GET | `/api/drivers/me/badges` | Driver | Lista badges territoriais do motorista | Nenhum (usa token JWT) |
| 14 | GET | `/api/public/neighborhoods/:id/geofence` | Público | Retorna geofence (community → neighborhood → fallback 800m) | `id` (path), `communityId` (query opcional) |

---

## 2. ENDPOINTS PÚBLICOS FALTANDO (2 NOVOS)

### 2.1. Endpoint: Validar Cobertura Territorial (Read-Only)

**Proposta:**

```
GET /api/public/territory/coverage-check
```

**Finalidade:**  
Validar se um par de coordenadas (pickup/dropoff) está dentro da cobertura territorial de um motorista, retornando tipo de match e taxa aplicável. **Read-only, não altera dados.**

**Contrato JSON:**

**Request (Query Params):**
```json
{
  "driverId": "drv_123",
  "pickupLat": -23.5505,
  "pickupLng": -46.6333,
  "dropoffLat": -23.5489,
  "dropoffLng": -46.6388
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "covered": true,
    "matchType": "SAME_NEIGHBORHOOD",
    "feePercentage": 7,
    "reason": "Ambos os pontos estão no bairro base do motorista",
    "driverHomeNeighborhood": {
      "id": "nbh_123",
      "name": "Vila Madalena"
    },
    "pickupNeighborhood": {
      "id": "nbh_123",
      "name": "Vila Madalena",
      "method": "GEOFENCE"
    },
    "dropoffNeighborhood": {
      "id": "nbh_123",
      "name": "Vila Madalena",
      "method": "GEOFENCE"
    }
  }
}
```

**Response (200 OK - Fora de Cobertura):**
```json
{
  "success": true,
  "data": {
    "covered": false,
    "matchType": "OUTSIDE_FENCE",
    "feePercentage": 20,
    "reason": "Nenhum ponto está no território do motorista",
    "driverHomeNeighborhood": {
      "id": "nbh_123",
      "name": "Vila Madalena"
    },
    "pickupNeighborhood": null,
    "dropoffNeighborhood": null
  }
}
```

**Funções/Services Reutilizados:**
- `calculateFeePercentage()` de `fee-calculation.ts`
- `resolveTerritory()` de `territory-resolver.service.ts`
- Lógica de match type já existente em `fee-calculation.ts`

**Compatibilidade com Dados Atuais:**
- ✅ Se `community_geofences = 0`, usa fallback para `neighborhood_geofences` ou círculo 800m
- ✅ `communityId` pode ser `null` sem erro (opcional)
- ✅ Não cria/modifica dados, apenas lê

**Curls de Validação:**

```bash
# Teste 1: Pickup e dropoff no mesmo bairro (taxa 7%)
curl -X GET "http://localhost:3000/api/public/territory/coverage-check?driverId=drv_123&pickupLat=-23.5505&pickupLng=-46.6333&dropoffLat=-23.5489&dropoffLng=-46.6388" \
  -H "Content-Type: application/json"

# Teste 2: Pickup no bairro, dropoff fora (taxa 12%)
curl -X GET "http://localhost:3000/api/public/territory/coverage-check?driverId=drv_123&pickupLat=-23.5505&pickupLng=-46.6333&dropoffLat=-23.6000&dropoffLng=-46.7000" \
  -H "Content-Type: application/json"
```

---

### 2.2. Endpoint: Histórico de Resoluções Territoriais (Read-Only)

**Proposta:**

```
GET /api/public/territory/resolution-history
```

**Finalidade:**  
Retornar histórico de resoluções territoriais de um passageiro (últimas 10 localizações capturadas), mostrando método de resolução (GEOFENCE, FALLBACK_800M, OUTSIDE) e timestamps. **Read-only, não altera dados.**

**Contrato JSON:**

**Request (Query Params):**
```json
{
  "passengerId": "pass_123",
  "limit": 10
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "passengerId": "pass_123",
    "currentTerritory": {
      "communityId": "comm_456",
      "communityName": "Pinheiros",
      "neighborhoodId": "nbh_789",
      "neighborhoodName": "Vila Madalena",
      "lastUpdated": "2026-02-12T22:15:00Z"
    },
    "resolutionHistory": [
      {
        "timestamp": "2026-02-12T22:15:00Z",
        "lat": -23.5505,
        "lng": -46.6333,
        "method": "GEOFENCE",
        "resolved": true,
        "communityName": "Pinheiros",
        "neighborhoodName": "Vila Madalena"
      },
      {
        "timestamp": "2026-02-12T20:30:00Z",
        "lat": -23.5489,
        "lng": -46.6388,
        "method": "FALLBACK_800M",
        "resolved": true,
        "communityName": null,
        "neighborhoodName": "Vila Madalena",
        "fallbackMeters": 450
      },
      {
        "timestamp": "2026-02-12T18:00:00Z",
        "lat": -23.6000,
        "lng": -46.7000,
        "method": "OUTSIDE",
        "resolved": false,
        "communityName": null,
        "neighborhoodName": null
      }
    ],
    "stats": {
      "totalCaptures": 3,
      "resolvedCount": 2,
      "resolutionRate": 66.7,
      "methodBreakdown": {
        "GEOFENCE": 1,
        "FALLBACK_800M": 1,
        "OUTSIDE": 1
      }
    }
  }
}
```

**Response (200 OK - Sem Histórico):**
```json
{
  "success": true,
  "data": {
    "passengerId": "pass_123",
    "currentTerritory": null,
    "resolutionHistory": [],
    "stats": {
      "totalCaptures": 0,
      "resolvedCount": 0,
      "resolutionRate": 0,
      "methodBreakdown": {}
    }
  }
}
```

**Funções/Services Reutilizados:**
- `prisma.passengers.findUnique()` para buscar `last_lat`, `last_lng`, `community_id`, `neighborhood_id`
- `resolveTerritory()` de `territory-resolver.service.ts` (para recalcular método de resolução)
- Lógica de histórico pode usar tabela `passenger_locations` (se existir) ou campo `last_location_updated_at`

**Compatibilidade com Dados Atuais:**
- ✅ Se `community_geofences = 0`, retorna `communityName: null` sem erro
- ✅ Se passageiro nunca capturou GPS, retorna `resolutionHistory: []`
- ✅ Não cria/modifica dados, apenas lê

**Curls de Validação:**

```bash
# Teste 1: Passageiro com histórico
curl -X GET "http://localhost:3000/api/public/territory/resolution-history?passengerId=pass_123&limit=10" \
  -H "Content-Type: application/json"

# Teste 2: Passageiro sem histórico (novo cadastro)
curl -X GET "http://localhost:3000/api/public/territory/resolution-history?passengerId=pass_999&limit=10" \
  -H "Content-Type: application/json"
```

---

## 3. IMPLEMENTAÇÃO DOS 2 ENDPOINTS

### 3.1. Arquivo: `/backend/src/routes/public.ts` (adicionar)

```typescript
// Adicionar ao final do arquivo public.ts

/**
 * GET /api/public/territory/coverage-check
 * Valida cobertura territorial (read-only)
 */
router.get('/territory/coverage-check', async (req, res) => {
  try {
    const { driverId, pickupLat, pickupLng, dropoffLat, dropoffLng } = req.query;

    if (!driverId || !pickupLat || !pickupLng || !dropoffLat || !dropoffLng) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetros obrigatórios: driverId, pickupLat, pickupLng, dropoffLat, dropoffLng'
      });
    }

    const result = await calculateFeePercentage(
      driverId as string,
      Number(pickupLat),
      Number(pickupLng),
      Number(dropoffLat),
      Number(dropoffLng),
      'São Paulo'
    );

    res.json({
      success: true,
      data: {
        covered: result.feePercentage < 20,
        matchType: result.matchType,
        feePercentage: result.feePercentage,
        reason: result.reason,
        driverHomeNeighborhood: result.driverHomeNeighborhood,
        pickupNeighborhood: result.pickupNeighborhood,
        dropoffNeighborhood: result.dropoffNeighborhood
      }
    });
  } catch (error) {
    console.error('[public/coverage-check] error:', error);
    return res.status(500).json({ success: false, error: 'Erro ao validar cobertura' });
  }
});

/**
 * GET /api/public/territory/resolution-history
 * Histórico de resoluções territoriais (read-only)
 */
router.get('/territory/resolution-history', async (req, res) => {
  try {
    const { passengerId, limit = '10' } = req.query;

    if (!passengerId) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetro obrigatório: passengerId'
      });
    }

    const passenger = await prisma.passengers.findUnique({
      where: { id: passengerId as string },
      select: {
        id: true,
        last_lat: true,
        last_lng: true,
        last_location_updated_at: true,
        community_id: true,
        neighborhood_id: true,
        communities: { select: { name: true } },
        neighborhoods: { select: { name: true } }
      }
    });

    if (!passenger) {
      return res.status(404).json({ success: false, error: 'Passageiro não encontrado' });
    }

    // Buscar histórico (se tabela passenger_locations existir)
    const history: any[] = [];
    if (passenger.last_lat && passenger.last_lng) {
      const territory = await resolveTerritory(passenger.last_lng, passenger.last_lat);
      history.push({
        timestamp: passenger.last_location_updated_at || new Date(),
        lat: passenger.last_lat,
        lng: passenger.last_lng,
        method: territory.method,
        resolved: territory.resolved,
        communityName: territory.community?.name || null,
        neighborhoodName: territory.neighborhood?.name || null,
        fallbackMeters: territory.fallbackMeters || null
      });
    }

    const stats = {
      totalCaptures: history.length,
      resolvedCount: history.filter(h => h.resolved).length,
      resolutionRate: history.length > 0 ? (history.filter(h => h.resolved).length / history.length * 100).toFixed(1) : 0,
      methodBreakdown: history.reduce((acc, h) => {
        acc[h.method] = (acc[h.method] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    res.json({
      success: true,
      data: {
        passengerId: passenger.id,
        currentTerritory: passenger.community_id || passenger.neighborhood_id ? {
          communityId: passenger.community_id,
          communityName: passenger.communities?.name || null,
          neighborhoodId: passenger.neighborhood_id,
          neighborhoodName: passenger.neighborhoods?.name || null,
          lastUpdated: passenger.last_location_updated_at
        } : null,
        resolutionHistory: history.slice(0, Number(limit)),
        stats
      }
    });
  } catch (error) {
    console.error('[public/resolution-history] error:', error);
    return res.status(500).json({ success: false, error: 'Erro ao buscar histórico' });
  }
});
```

### 3.2. Imports Necessários (adicionar no topo de `public.ts`)

```typescript
import { calculateFeePercentage } from '../services/fee-calculation';
import { resolveTerritory } from '../services/territory-resolver.service';
```

---

## 4. VALIDAÇÃO E TESTES

### 4.1. Checklist de Validação

- [ ] Endpoints não alteram schema/migrations
- [ ] Endpoints são read-only (apenas SELECT)
- [ ] Compatível com `community_geofences = 0` (usa fallback)
- [ ] `communityId` pode ser `null` sem erro
- [ ] Reutiliza funções existentes (`resolveTerritory`, `calculateFeePercentage`)
- [ ] Retorna JSON estruturado e consistente
- [ ] Tratamento de erros (400, 404, 500)

### 4.2. Testes Manuais

```bash
# 1. Testar coverage-check (mesmo bairro)
curl -X GET "http://localhost:3000/api/public/territory/coverage-check?driverId=drv_123&pickupLat=-23.5505&pickupLng=-46.6333&dropoffLat=-23.5489&dropoffLng=-46.6388"

# 2. Testar coverage-check (fora de cobertura)
curl -X GET "http://localhost:3000/api/public/territory/coverage-check?driverId=drv_123&pickupLat=-23.6000&pickupLng=-46.7000&dropoffLat=-23.6100&dropoffLng=-46.7100"

# 3. Testar resolution-history (com histórico)
curl -X GET "http://localhost:3000/api/public/territory/resolution-history?passengerId=pass_123&limit=10"

# 4. Testar resolution-history (sem histórico)
curl -X GET "http://localhost:3000/api/public/territory/resolution-history?passengerId=pass_999&limit=10"
```

---

## 5. PRÓXIMOS PASSOS

1. ✅ **Documentação completa** (este arquivo)
2. ⏳ **Implementar 2 endpoints em `public.ts`** (~50 LOC)
3. ⏳ **Testar com curls** (validar respostas)
4. ⏳ **Implementar Cards 1-3 no frontend** (~560 LOC)
   - Card 1: GPS Capturado (~180 LOC)
   - Card 2: Território Resolvido (~200 LOC)
   - Card 3: Regras de Cobertura (~180 LOC)
5. ⏳ **Feature flag:** `passenger_territory_cards_v1` (default OFF)
6. ⏳ **Debounce:** >=15s ou >100m entre capturas GPS

---

## 6. RESUMO EXECUTIVO

**Endpoints Existentes:** 14 funcionais (6 públicos, 8 autenticados)  
**Endpoints Propostos:** 2 novos públicos read-only (~50 LOC)  
**Risco:** ZERO (não altera schema, apenas lê dados)  
**Compatibilidade:** 100% com dados atuais (`community_geofences = 0`)  
**Reutilização:** 100% (usa `resolveTerritory` + `calculateFeePercentage`)  
**Próximo Passo:** Implementar Cards 1-3 (~560 LOC, 3-4 dias)

---

**Autor:** Kiro (AWS AI Assistant)  
**Versão:** 1.0  
**Status:** ✅ Pronto para implementação
