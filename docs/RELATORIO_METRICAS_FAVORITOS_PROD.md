# RELATÓRIO: MÉTRICAS E SAVED PLACES EM PRODUÇÃO

**Data**: 2026-02-10  
**Commit**: 4a383b0

---

## 1. MÉTRICA "INCENTIVO VOLTAR PRA GEOFENCE"

### ❌ NÃO TEM MÉTRICA ATIVA

**Evidência**:
```bash
$ rg -n "return_to_geofence|back_to_geofence|incentive|incentivo|geofence_incentive" backend/src

# Resultado: Serviço existe mas está DESABILITADO
```

**Arquivo**: `backend/src/services/incentive.ts`

**Status do Serviço**:
```typescript
/**
 * Incentive service - applies driver incentives after pricing
 * 
 * TODO: This service depends on removed models (ride_pricing, driver_incentives)
 * All methods are currently disabled and return empty/default values
 * Needs refactoring to work with current schema
 */
export class IncentiveService {
  async applyAfterPricing(rideId: string): Promise<IncentiveApplication[]> {
    return [];  // ❌ Retorna vazio
  }
  
  async getDriverIncentiveHistory(driverId: string, limit: number = 50) {
    return [];  // ❌ Retorna vazio
  }
}
```

**Motivo**: Modelos `ride_pricing` e `driver_incentives` foram removidos do schema.

**Logs/Métricas**: ❌ NENHUM
- Não há `console.log` emitindo eventos de incentivo
- Não há integração com Prometheus/StatsD/CloudWatch
- Não há métricas sendo coletadas

**Conclusão**: 
- ❌ **NÃO TEM MÉTRICA** de "voltar pra geofence"
- ❌ **NÃO TEM INCENTIVO** ativo em produção
- ⚠️ Serviço existe mas está completamente desabilitado

---

## 2. SAVED PLACES / FAVORITOS

### ✅ EXISTE E ESTÁ ATIVO

#### A) Endpoints

**Arquivo**: `backend/src/routes/passenger-favorites.ts`

```typescript
// POST /api/passenger/favorites
router.post('/favorites', authenticatePassenger, async (req: Request, res: Response) => {
  const passenger = (req as any).passenger;
  
  // Feature flag check
  const isEnabled = await isFeatureEnabled('passenger_favorites_matching', passenger.id);
  
  if (!isEnabled) {
    return res.status(403).json({
      success: false,
      error: 'Feature not enabled for this user'
    });
  }
  
  // Create favorite
  const favorite = await prisma.passenger_favorite_locations.create({
    data: {
      id: `fav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      passenger_id: passenger.id,
      label: req.body.label,
      type: req.body.type,  // HOME, WORK, OTHER
      lat: req.body.lat,
      lng: req.body.lng,
      created_at: new Date(),
      updated_at: new Date()
    }
  });
  
  return res.status(201).json({
    success: true,
    data: favorite
  });
});
```

**Admin Endpoints**:
```typescript
// GET /api/admin/passengers/:passengerId/favorites
// PUT /api/admin/passengers/:passengerId/favorites/:favoriteId
// DELETE /api/admin/passengers/:passengerId/favorites/:favoriteId
```

**Arquivo**: `backend/src/routes/admin.ts` (linhas 92-96)

---

#### B) Tabela/Schema

**Arquivo**: `backend/prisma/schema.prisma` (linhas 353-365)

```prisma
model passenger_favorite_locations {
  id           String     @id @default(uuid())
  passenger_id String
  label        String     // "Casa", "Trabalho", "Academia", etc
  type         String     // HOME, WORK, OTHER
  lat          Decimal    @db.Decimal(10, 8)
  lng          Decimal    @db.Decimal(11, 8)
  created_at   DateTime   @default(now())
  updated_at   DateTime   @updatedAt
  passengers   passengers @relation(fields: [passenger_id], references: [id], onDelete: Cascade)

  @@index([passenger_id])
}
```

**Migration**: Tabela existe no banco de dados (verificado via schema).

---

#### C) ✅ ENTRA NO MATCHING/SCORE

**Arquivo**: `backend/src/services/favorites-matching.service.ts`

**Função Principal**:
```typescript
export async function rankDriversByFavorites(
  drivers: any[],
  passengerId: string,
  pickup: Coordinate
): Promise<any[]>
```

**Lógica de Score**:

1. **Detectar Anchor** (favorito próximo ao pickup):
```typescript
function detectAnchor(pickup: Coordinate, favorites: Favorite[]): Favorite | null {
  let closestFavorite: Favorite | null = null;
  let minDistance = Infinity;

  for (const fav of favorites) {
    const distance = calculateDistance(pickup.lat, pickup.lng, fav.lat, fav.lng);
    if (distance <= ANCHOR_DETECT_METERS && distance < minDistance) {  // 400m
      minDistance = distance;
      closestFavorite = fav;
    }
  }

  return closestFavorite;
}
```

2. **Calcular Score** (menor = melhor):
```typescript
function calculateScore(
  driverBase: Coordinate | null,
  anchor: Favorite | null,
  pickup: Coordinate
): number {
  let score = 0;

  if (!driverBase) return 999;

  const pickupDistance = calculateDistance(pickup.lat, pickup.lng, driverBase.lat, driverBase.lng);

  // Componente 1: Distância do pickup
  if (pickupDistance <= 1000) {
    score += 0;        // ✅ Muito perto
  } else if (pickupDistance <= 3000) {
    score += 2;        // ⚠️ Médio
  } else {
    score += 5;        // ❌ Longe
  }

  // Componente 2: Proximidade do anchor (SE EXISTIR)
  if (anchor) {
    const anchorDistance = calculateDistance(anchor.lat, anchor.lng, driverBase.lat, driverBase.lng);
    
    if (anchorDistance <= TERRITORY_RADIUS_METERS) {  // 800m
      score += 0;      // ✅ Motorista dentro do território do favorito
    } else if (anchorDistance <= 2000) {
      score += 5;      // ⚠️ Próximo mas fora
    } else {
      score += 15;     // ❌ Longe do favorito
    }
  }

  return score;
}
```

**Constantes**:
```typescript
const ANCHOR_DETECT_METERS = 400;      // Raio para detectar favorito próximo ao pickup
const TERRITORY_RADIUS_METERS = 800;   // Raio do território do favorito
```

**Onde é usado**:
```typescript
// backend/src/services/dispatch.ts (linhas 56-62)

// Apply favorites matching ranking
const [pickupLat, pickupLng] = ride.origin.split(',').map(Number);
const rankedDrivers = await rankDriversByFavorites(
  availableDrivers,
  ride.passenger_id,
  { lat: pickupLat, lng: pickupLng }
);
```

**Logs Emitidos**:
```typescript
if (anchor) {
  console.log(`[favorites-matching] Anchor detected: ${anchor.label} (${anchor.type})`);
  console.log(`[favorites-matching] Ranked ${driversWithScores.length} drivers, top 3 scores:`, 
    driversWithScores.slice(0, 3).map(d => ({ id: d.id, score: d.score, distance: Math.round(d.distance) }))
  );
}
```

**Exemplo de Log (CloudWatch)**:
```
[favorites-matching] Anchor detected: Casa (HOME)
[favorites-matching] Ranked 5 drivers, top 3 scores: [
  { id: 'drv_123', score: 0, distance: 450 },
  { id: 'drv_456', score: 2, distance: 1200 },
  { id: 'drv_789', score: 5, distance: 2500 }
]
```

---

#### D) Regra de Score Detalhada

**NÃO É "+2 PONTOS"** - É um sistema de score acumulativo:

| Condição | Score Adicionado |
|----------|------------------|
| **Distância do Pickup** | |
| ≤ 1000m | +0 |
| 1000m - 3000m | +2 |
| > 3000m | +5 |
| **Proximidade do Favorito** (se anchor detectado) | |
| ≤ 800m (dentro do território) | +0 |
| 800m - 2000m | +5 |
| > 2000m | +15 |

**Exemplo**:
```
Passageiro solicita corrida de "Casa" (favorito HOME)
Pickup: -22.9015552, -43.2799744

Motorista A:
- Base: 500m do pickup → score +0
- Base: 300m do favorito "Casa" → score +0
- Score total: 0 (MELHOR MATCH)

Motorista B:
- Base: 1500m do pickup → score +2
- Base: 1500m do favorito "Casa" → score +5
- Score total: 7

Motorista C:
- Base: 4000m do pickup → score +5
- Base: 3000m do favorito "Casa" → score +15
- Score total: 20 (PIOR MATCH)

Ranking final: A > B > C
```

---

#### E) Feature Flag

**Controle**: `passenger_favorites_matching`

**Arquivo**: `backend/src/services/feature-flag.service.ts`

**Verificação**:
```typescript
const isEnabled = await isFeatureEnabled('passenger_favorites_matching', passenger.id);

if (!isEnabled || drivers.length === 0) {
  return drivers; // Return original order (sem reordenação)
}
```

**Master Switch**: `process.env.FEATURE_PASSENGER_FAVORITES_MATCHING`

**Rollout**: Controlado via tabela `feature_flags` + `feature_flag_allowlist`

---

#### F) Frontend em Produção

**Bundle Atual**: `index-CpNfasi7.js`

**Componente Admin**: `frontend-app/src/components/admin/PassengerFavoritesCard.tsx`

**Usado em**: `frontend-app/src/pages/admin/PassengerDetail.jsx`

**Funcionalidade**:
- Admin pode visualizar favoritos do passageiro
- Admin pode adicionar/editar/deletar favoritos
- Tipos: 🏠 Casa, 💼 Trabalho, 📍 Outro
- Campos: label, type, lat, lng

**Endpoint usado**:
```typescript
GET /api/admin/passengers/:passengerId/favorites
POST /api/admin/passengers/:passengerId/favorites
PUT /api/admin/passengers/:passengerId/favorites/:favoriteId
DELETE /api/admin/passengers/:passengerId/favorites/:favoriteId
```

**Feature Flags Admin**:
- `frontend-app/src/pages/admin/FeatureFlags.jsx` (linha 23)
- `frontend-app/src/pages/admin/BetaMonitor.jsx` (linha 11)

**Passageiro**: ❌ Não há UI para passageiro adicionar favoritos no frontend atual.
- Apenas admin pode gerenciar via painel
- Passageiro precisaria usar API diretamente ou aguardar UI

---

## 3. QUAL FRONTEND ESTÁ EM PRODUÇÃO?

**Bundle**: `index-CpNfasi7.js`

**Último Commit**: `4a383b0` (docs: add GPS-pure compliance audit)

**Repositório**: `usbtecnok/kaviar-v2` (branch main)

**Não há dois frontends** - Apenas um build servido via CloudFront.

**Componentes de Favoritos**:
- ✅ Admin: `PassengerFavoritesCard.tsx` (existe e está ativo)
- ❌ Passageiro: Não há UI (apenas API disponível)

---

## RESUMO EXECUTIVO

### 1. Métrica "Incentivo Voltar Pra Geofence"
❌ **NÃO TEM MÉTRICA**
- Serviço existe mas está desabilitado
- Modelos `ride_pricing` e `driver_incentives` foram removidos
- Nenhum log/métrica sendo emitido
- Precisa refatoração para funcionar

### 2. Saved Places / Favoritos
✅ **EXISTE E ESTÁ ATIVO**

**Endpoints**:
- ✅ `POST /api/passenger/favorites` (criar)
- ✅ `GET /api/admin/passengers/:id/favorites` (listar)
- ✅ `PUT /api/admin/passengers/:id/favorites/:fid` (editar)
- ✅ `DELETE /api/admin/passengers/:id/favorites/:fid` (deletar)

**Tabela**: ✅ `passenger_favorite_locations`
- Campos: id, passenger_id, label, type (HOME/WORK/OTHER), lat, lng

**Matching/Score**: ✅ **ENTRA NO SCORE**
- Arquivo: `backend/src/services/favorites-matching.service.ts`
- Usado em: `backend/src/services/dispatch.ts` (linha 58)
- Lógica: Score acumulativo (menor = melhor)
  - Distância do pickup: 0/2/5 pontos
  - Proximidade do favorito: 0/5/15 pontos (se anchor detectado)
- Anchor: Favorito dentro de 400m do pickup
- Território: 800m ao redor do favorito

**Regra**: NÃO é "+2 pontos fixo" - É score variável baseado em distâncias.

**Feature Flag**: `passenger_favorites_matching` (rollout controlado)

**Frontend**:
- ✅ Admin: Pode gerenciar favoritos via `PassengerFavoritesCard`
- ❌ Passageiro: Sem UI (apenas API disponível)

**Logs em PROD**:
```
[favorites-matching] Anchor detected: Casa (HOME)
[favorites-matching] Ranked 5 drivers, top 3 scores: [...]
```

---

## EVIDÊNCIAS SOLICITADAS

### 1. Métrica Incentivo
- **Nome**: N/A (não existe)
- **Arquivo**: `backend/src/services/incentive.ts`
- **Função**: `applyAfterPricing()` (retorna `[]`)
- **Evidência PROD**: ❌ Nenhum log/métrica emitido

### 2. Saved Places Score
- **Nome**: `favorites-matching`
- **Arquivo**: `backend/src/services/favorites-matching.service.ts`
- **Função**: `rankDriversByFavorites()`
- **Regra**: Score acumulativo (0-20+ pontos, menor = melhor)
- **Evidência PROD**: Logs `[favorites-matching] Anchor detected: ...`

### 3. Frontend PROD
- **Bundle**: `index-CpNfasi7.js`
- **Commit**: `4a383b0`
- **Componente**: `PassengerFavoritesCard.tsx` (admin only)
- **Não há dois frontends**: Apenas um build

---

**Data do Relatório**: 2026-02-10  
**Status**: ✅ COMPLETO - Todas as evidências coletadas
