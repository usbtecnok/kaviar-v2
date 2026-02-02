# Passenger Favorites Matching - Documentação Completa

## Data: 2026-02-01

## 🎯 Objetivo

Melhorar o matching territorial priorizando motoristas alinhados ao território do passageiro, **sem alterar a precificação** (7/12/12/20%).

---

## 📊 Precificação Mantida

| Match Type | Taxa | Descrição |
|------------|------|-----------|
| SAME_NEIGHBORHOOD | 7% | Origem e destino no mesmo bairro |
| ADJACENT/DIFERENTE | 12% | Bairros adjacentes ou diferentes |
| FALLBACK_800M | 12% | Território virtual de 800m |
| OUTSIDE_FENCE | 20% | Fora do território |

**✅ Garantia:** Nenhuma mudança na lógica de cálculo de taxa.

---

## 🏗️ Arquitetura

### 1. Modelo de Dados

#### Tabela: `passenger_favorite_locations`
```sql
CREATE TABLE passenger_favorite_locations (
  id UUID PRIMARY KEY,
  passenger_id UUID REFERENCES passengers(id),
  label VARCHAR(255),
  type VARCHAR(50) CHECK (type IN ('HOME', 'WORK', 'OTHER')),
  lat NUMERIC(10,8) CHECK (lat >= -90 AND lat <= 90),
  lng NUMERIC(11,8) CHECK (lng >= -180 AND lng <= 180),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Regras:**
- Máximo 3 favoritos por passageiro
- HOME obrigatório
- Coordenadas validadas

#### Campos em `drivers`:
```sql
ALTER TABLE drivers ADD COLUMN secondary_base_lat NUMERIC(10,8);
ALTER TABLE drivers ADD COLUMN secondary_base_lng NUMERIC(11,8);
ALTER TABLE drivers ADD COLUMN secondary_base_label VARCHAR(255);
ALTER TABLE drivers ADD COLUMN secondary_base_enabled BOOLEAN DEFAULT false;
```

---

### 2. API Admin

#### Passenger Favorites

**GET** `/api/admin/passengers/:passengerId/favorites`
- RBAC: SUPER_ADMIN, OPERATOR, ANGEL_VIEWER
- Retorna lista de favoritos

**PUT** `/api/admin/passengers/:passengerId/favorites`
- RBAC: SUPER_ADMIN, OPERATOR
- Upsert favorito (cria ou atualiza)
- Validação: max 3, coordenadas válidas

**DELETE** `/api/admin/passengers/:passengerId/favorites/:favoriteId`
- RBAC: SUPER_ADMIN, OPERATOR
- Remove favorito (HOME não pode ser o único)

#### Driver Secondary Base

**GET** `/api/admin/drivers/:driverId/secondary-base`
- RBAC: SUPER_ADMIN, OPERATOR, ANGEL_VIEWER
- Retorna base secundária ou null

**PUT** `/api/admin/drivers/:driverId/secondary-base`
- RBAC: SUPER_ADMIN, OPERATOR
- Define base secundária
- Validação: coordenadas válidas

**DELETE** `/api/admin/drivers/:driverId/secondary-base`
- RBAC: SUPER_ADMIN, OPERATOR
- Remove base secundária

---

### 3. Algoritmo de Matching

#### Constantes
```javascript
ANCHOR_DETECT_METERS = 400  // Detectar favorito próximo
TERRITORY_RADIUS_METERS = 800  // Raio do território
```

#### Fluxo

**1. Detectar Âncora Ativa**
- Calcular distância entre origem e cada favorito do passageiro
- Se algum favorito <= 400m → selecionar como âncora
- Senão → âncora = null

**2. Obter Base do Motorista**
- Prioridade:
  1. Centroide da geofence (se existir)
  2. `virtual_fence_center_lat/lng` (se existir)
  3. `secondary_base_lat/lng` (se enabled)
- Usar a base **mais próxima da âncora**

**3. Calcular Score** (menor = melhor)

| Componente | Valor |
|------------|-------|
| **Território** | |
| SAME_NEIGHBORHOOD | +0 |
| ADJACENT/FALLBACK | +10 |
| OUTSIDE_FENCE | +30 |
| **Proximidade à Âncora** | |
| <= 800m | +0 |
| 800m - 2000m | +5 |
| > 2000m | +15 |
| **Distância Pickup** | |
| <= 1km | +0 |
| 1km - 3km | +2 |
| > 3km | +5 |

**4. Ordenar Motoristas**
- Ordenar por score (ascendente)
- Tie-breaker: distância de pickup

---

### 4. Feature Flag

```bash
FEATURE_PASSENGER_FAVORITES_MATCHING=true
```

- **OFF:** Matching atual intacto (sem reordenação)
- **ON:** Aplica score e ordena motoristas

---

## 🧪 Testes

### Testes Determinísticos

**Script:** `/backend/scripts/test-matching-favorites.js`

**Cenários:**

1. **Âncora Ativa**
   - Origem 100m do HOME
   - Driver A: base 300m do HOME
   - Driver B: base 3km do HOME
   - ✅ Esperado: A rankeado acima de B

2. **Sem Âncora**
   - Origem 5km dos favoritos
   - ✅ Esperado: Sem regressão (ranking igual ao atual)

3. **Base Secundária**
   - Base secundária mais próxima da âncora
   - ✅ Esperado: Score usa base secundária

### Testes RBAC

**Script:** `/backend/scripts/test-rbac-favorites.sh`

**Validações:**

| Role | GET | PUT | DELETE |
|------|-----|-----|--------|
| SUPER_ADMIN | ✅ 200 | ✅ 200 | ✅ 200 |
| OPERATOR | ✅ 200 | ✅ 200 | ✅ 200 |
| ANGEL_VIEWER | ✅ 200 | ❌ 403 | ❌ 403 |

---

## 📦 Deployment

### 1. Migration

```bash
# Aplicar migration em produção
psql -h kaviar-prod.rds.amazonaws.com -U postgres -d kaviar \
  -f migrations/add_passenger_favorites_and_secondary_base.sql
```

### 2. Validação

```sql
-- Verificar tabela criada
SELECT COUNT(*) FROM passenger_favorite_locations;

-- Verificar colunas adicionadas
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'drivers' 
AND column_name LIKE 'secondary_base%';
```

### 3. Feature Flag

```bash
# Habilitar feature
export FEATURE_PASSENGER_FAVORITES_MATCHING=true

# Restart service
aws ecs update-service --cluster kaviar-prod --service kaviar-backend --force-new-deployment
```

---

## 🔐 Segurança

### Audit Logging

Todos os endpoints PUT/DELETE logam:
```json
{
  "action": "passenger_favorite_upsert",
  "adminId": "uuid",
  "passengerId": "uuid",
  "before": {"lat": -23.5505, "lng": -46.6333},
  "after": {"lat": -23.5515, "lng": -46.6343},
  "timestamp": "2026-02-01T00:00:00Z",
  "ip": "1.2.3.4",
  "userAgent": "Mozilla/5.0..."
}
```

### RBAC

- ANGEL_VIEWER: **read-only** (GET 200, PUT/DELETE 403)
- SUPER_ADMIN/OPERATOR: **full access**

---

## 📈 Métricas Esperadas

**Antes:**
- Matches SAME/ADJACENT/FALLBACK: ~60%
- Matches OUTSIDE: ~40%

**Depois (com feature ativa):**
- Matches SAME/ADJACENT/FALLBACK: ~75-80%
- Matches OUTSIDE: ~20-25%

**Impacto:**
- Motoristas ganham mais (mais corridas 7-12% vs 20%)
- Passageiros têm motoristas mais próximos
- Plataforma reduz taxa média (mais corridas 7-12%)

---

## 🎯 Status de Implementação

### ✅ Completo (100%)

- [x] Schema Prisma atualizado
- [x] Migration SQL criada
- [x] Controllers admin (CRUD completo)
- [x] Rotas admin com RBAC
- [x] Serviço de matching score
- [x] Feature flag implementada
- [x] Testes determinísticos
- [x] Testes RBAC
- [x] Audit logging
- [x] Documentação

### ⏳ Pendente

- [ ] Migration em produção
- [ ] Frontend Admin (cards UI)
- [ ] Validação E2E em produção
- [ ] Monitoramento de métricas

---

## 📚 Referências

- `/backend/src/services/matching-score.service.js` - Algoritmo de score
- `/backend/src/controllers/admin/passengerFavorites.controller.js` - CRUD favoritos
- `/backend/src/controllers/admin/driverSecondaryBase.controller.js` - CRUD base secundária
- `/backend/scripts/test-matching-favorites.js` - Testes determinísticos
- `/backend/scripts/test-rbac-favorites.sh` - Testes RBAC

---

**Data de Implementação:** 2026-02-01  
**Versão:** 1.0  
**Status:** ✅ Pronto para deploy
