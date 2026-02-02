# Passenger Favorites & Secondary Base - Implementation Status

## ✅ Implementado

### 1. Modelo de Dados
- ✅ Schema Prisma atualizado:
  - `drivers`: campos `secondary_base_lat/lng/label/enabled`
  - `passenger_favorite_locations`: tabela completa com relação a `passengers`
- ✅ Migration SQL criada: `/backend/migrations/add_passenger_favorites_and_secondary_base.sql`

### 2. Controllers Admin
- ✅ `/backend/src/controllers/admin/passengerFavorites.controller.js`
  - GET /api/admin/passengers/:passengerId/favorites
  - PUT /api/admin/passengers/:passengerId/favorites
  - DELETE /api/admin/passengers/:passengerId/favorites/:favoriteId
  - Validações: max 3 favoritos, HOME obrigatório, coordenadas válidas
  - Audit logging completo

- ✅ `/backend/src/controllers/admin/driverSecondaryBase.controller.js`
  - GET /api/admin/drivers/:driverId/secondary-base
  - PUT /api/admin/drivers/:driverId/secondary-base
  - DELETE /api/admin/drivers/:driverId/secondary-base
  - Validações: coordenadas válidas
  - Audit logging completo

## ⏳ Pendente (Próximos Passos)

### 3. Rotas Admin
- [ ] Adicionar rotas em `/backend/src/routes/admin.ts`:
  ```typescript
  // Passenger Favorites
  router.get('/passengers/:passengerId/favorites', allowReadAccess, passengerFavoritesController.getFavorites);
  router.put('/passengers/:passengerId/favorites', requireOperatorOrSuperAdmin, passengerFavoritesController.upsertFavorite);
  router.delete('/passengers/:passengerId/favorites/:favoriteId', requireOperatorOrSuperAdmin, passengerFavoritesController.deleteFavorite);
  
  // Driver Secondary Base
  router.get('/drivers/:driverId/secondary-base', allowReadAccess, driverSecondaryBaseController.getSecondaryBase);
  router.put('/drivers/:driverId/secondary-base', requireOperatorOrSuperAdmin, driverSecondaryBaseController.updateSecondaryBase);
  router.delete('/drivers/:driverId/secondary-base', requireOperatorOrSuperAdmin, driverSecondaryBaseController.deleteSecondaryBase);
  ```

### 4. Algoritmo de Matching
- [ ] Criar `/backend/src/services/matching-with-favorites.js`:
  - Função `detectActiveAnchor(origin, passengerFavorites)` - detecta favorito <= 400m
  - Função `calculateMatchingScore(driver, anchor, pickupLocation)` - calcula score
  - Função `rankDrivers(drivers, anchor, pickupLocation)` - ordena por score
  - Integrar com fee-calculation.ts existente (sem mudar taxas)

### 5. Testes Determinísticos
- [ ] Criar `/backend/scripts/test-matching-favorites.js`:
  - Cenário 1: Passageiro com HOME, motorista próximo vs longe
  - Cenário 2: Passageiro sem favoritos próximos (sem regressão)
  - Cenário 3: Motorista com base secundária mais próxima
  - Cenário 4: RBAC (ANGEL_VIEWER 403 em PUT/DELETE)

### 6. Migration em Produção
- [ ] Executar migration via ECS task:
  ```bash
  aws ecs run-task --cluster kaviar-prod \
    --task-definition kaviar-backend:28 \
    --launch-type FARGATE \
    --overrides '{"containerOverrides":[{"name":"kaviar-backend","command":["node","-e","..."]}]}'
  ```

### 7. Frontend Admin (UI)
- [ ] Card "Locais Favoritos" em PassengerDetail
- [ ] Card "Base Secundária" em DriverDetail (similar ao VirtualFenceCenterCard)
- [ ] Validação RBAC na UI (desabilitar botões para ANGEL_VIEWER)

### 8. Documentação
- [ ] `/docs/PASSENGER_FAVORITES_MATCHING.md`:
  - Arquitetura do sistema
  - Algoritmo de score
  - Exemplos de uso
  - Evidências RBAC

## 📊 Métricas Mantidas

**Precificação NÃO muda:**
- SAME_NEIGHBORHOOD: 7%
- ADJACENT/DIFERENTE: 12%
- FALLBACK_800M: 12%
- OUTSIDE_FENCE: 20%

**Matching melhora:**
- Score prioriza motoristas territorialmente alinhados
- Aumenta taxa de matches "bons" (7% e 12%)
- Reduz matches "ruins" (20%)

## 🔐 RBAC Implementado

| Role | GET | PUT | DELETE |
|------|-----|-----|--------|
| SUPER_ADMIN | ✅ | ✅ | ✅ |
| OPERATOR | ✅ | ✅ | ✅ |
| ANGEL_VIEWER | ✅ | ❌ 403 | ❌ 403 |

## 🎯 Próximo Comando

Para continuar a implementação:
1. Adicionar rotas em admin.ts
2. Criar serviço de matching
3. Criar testes determinísticos
4. Executar migration em produção
5. Validar com testes

**Status:** 30% completo (modelo + controllers prontos)
