# EVIDÊNCIAS: FIX BUGS MAPA E AVALIAÇÃO

**Data**: 2026-02-10  
**Prioridade**: ALTA  
**Commits**: bee4377

---

## BUG A: PIN CAI NO LUGAR ERRADO (COORDENADAS)

### Problema Reportado
**Sintoma**: Campo origem mostra `-22.9015552, -43.2799744` (LAT,LNG) mas marker cai em ponto incorreto.

**Suspeita**: Inversão lat/lng em algum ponto do pipeline.

### Análise Técnica

#### Ordem Correta por Tecnologia
```
Google Maps Marker:  { lat, lng }
Leaflet:             [lat, lng]
GeoJSON/PostGIS:     [lng, lat]
PostGIS ST_MakePoint: (lng, lat)
```

#### Backend (✅ CORRETO)
```typescript
// backend/src/services/territory-service.ts (linha 52)
ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)  // ✅ lng primeiro

// backend/src/services/ride.ts (linha 56-57)
origin: `${request.pickup.lat},${request.pickup.lng}`,      // Salva como "lat,lng"
destination: `${request.dropoff.lat},${request.dropoff.lng}`,

// backend/src/services/dispatch.ts (linha 57)
const [pickupLat, pickupLng] = ride.origin.split(',').map(Number);  // ✅ Parse correto
```

#### Frontend (✅ CORRETO)
```javascript
// frontend-app/src/components/maps/LeafletGeofenceMap.jsx (linha 202)
// Converter GeoJSON [lng, lat] para Leaflet [lat, lng]
const latLngs = geometryData.coordinates[0].map(coord => [coord[1], coord[0]]);  // ✅ Inverte corretamente

// frontend-app/src/pages/passenger/RequestRide.jsx (linha 68, 72)
setPickupAddress(`${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`);  // ✅ Exibe lat,lng
```

### Status
**ANÁLISE INCONCLUSIVA** - Código revisado está correto em todos os pontos críticos.

**Próximos passos para debug**:
1. Capturar coordenadas exatas do DevTools quando bug ocorre
2. Verificar payload do POST /api/rides (lat/lng enviados)
3. Verificar response do GET /api/rides/:id (lat/lng retornados)
4. Comparar com posição real do marker no mapa
5. Testar com coordenadas conhecidas: `-22.9015552,-43.2799744` (Copacabana, RJ)

**Runbook de teste**:
```bash
# 1. Criar ride com coordenadas conhecidas
curl -X POST https://api.kaviar.com.br/api/rides \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "pickup": {"lat": -22.9015552, "lng": -43.2799744},
    "dropoff": {"lat": -22.9068, "lng": -43.1729},
    "passengerId": "pass_xxx"
  }'

# 2. Verificar no banco
SELECT id, origin, destination FROM rides WHERE id = 'ride_xxx';
# Deve retornar: origin = "-22.9015552,-43.2799744"

# 3. No frontend DevTools Console:
console.log('Pickup:', pickupLocation);
// Deve mostrar: {lat: -22.9015552, lng: -43.2799744}
```

---

## BUG B: CORRIDA FINALIZA MAS NÃO ABRE AVALIAÇÃO ✅ RESOLVIDO

### Problema Reportado
**Sintoma**: Após término da corrida, UI não mostra modal/tela de rating.

**Causa raiz**: Frontend não reagia automaticamente ao status `completed`.

### Solução Aplicada

#### Antes (❌)
```javascript
// RideStatus.jsx
{rideStatus === 'completed' && (
  <Button href="/passageiro/rating">  // ❌ Usuário precisa clicar
    Avaliar esta Corrida
  </Button>
)}
```

#### Depois (✅)
```javascript
// RideStatus.jsx

// 1. Auto-abrir modal quando status muda para 'completed'
useEffect(() => {
  if (rideStatus === 'completed' && currentRide && !currentRide.rating) {
    setShowRatingModal(true);  // ✅ Abre automaticamente
  }
}, [rideStatus, currentRide]);

// 2. Modal com rating obrigatório
<Dialog 
  open={showRatingModal} 
  onClose={() => {}}  // ✅ Bloqueia fechar sem avaliar
  disableEscapeKeyDown
>
  <DialogTitle>Avalie sua Corrida</DialogTitle>
  <DialogContent>
    <Rating
      value={rating}
      onChange={(event, newValue) => setRating(newValue || 5)}
      size="large"
    />
    <TextField
      label="Comentário (opcional)"
      multiline
      rows={3}
      value={comment}
      onChange={(e) => setComment(e.target.value)}
    />
  </DialogContent>
  <DialogActions>
    <Button onClick={handleSubmitRating} variant="contained" fullWidth>
      Enviar Avaliação
    </Button>
  </DialogActions>
</Dialog>

// 3. Submissão
const handleSubmitRating = () => {
  if (rateRide) {
    rateRide(rating, comment);  // Salva no context/backend
  }
  setShowRatingModal(false);
  navigate('/passageiro/home');
};
```

### Validação

#### Fluxo Esperado
1. Corrida em andamento: `rideStatus = 'on_trip'`
2. Motorista finaliza: `rideStatus = 'completed'`
3. **Modal abre automaticamente** ✅
4. Passageiro avalia (1-5 estrelas + comentário)
5. Clica "Enviar Avaliação"
6. Rating salvo: `currentRide.rating = X`
7. Redirect para `/passageiro/home`

#### Teste Manual
```
1. Acessar /passageiro/status com corrida ativa
2. Aguardar status mudar para 'completed' (ou simular no RideContext)
3. Verificar: Modal "Avalie sua Corrida" aparece automaticamente
4. Selecionar estrelas (1-5)
5. Digitar comentário (opcional)
6. Clicar "Enviar Avaliação"
7. Verificar: Redirect para /passageiro/home
8. Recarregar página: Modal NÃO deve reaparecer (já avaliado)
```

### Persistência de Avaliação Pendente

**Implementação atual**: Rating salvo em `RideContext` (estado local).

**Limitação**: Se usuário recarregar página antes de avaliar, perde o estado.

**Solução futura** (não implementada neste commit):
```javascript
// Salvar no localStorage quando corrida completa
useEffect(() => {
  if (rideStatus === 'completed' && currentRide && !currentRide.rating) {
    localStorage.setItem('pendingRating', JSON.stringify({
      rideId: currentRide.id,
      timestamp: Date.now()
    }));
  }
}, [rideStatus, currentRide]);

// Restaurar ao montar componente
useEffect(() => {
  const pending = localStorage.getItem('pendingRating');
  if (pending) {
    const { rideId } = JSON.parse(pending);
    // Buscar ride do backend e abrir modal
    setShowRatingModal(true);
  }
}, []);

// Limpar após avaliar
const handleSubmitRating = () => {
  rateRide(rating, comment);
  localStorage.removeItem('pendingRating');  // ✅ Limpa pendência
  setShowRatingModal(false);
  navigate('/passageiro/home');
};
```

---

## COMMITS

- **bee4377**: fix(ride): add automatic rating modal on ride completion

---

## DoD (Definition of Done)

### BUG A (Coordenadas)
- ⏳ **PENDENTE** - Aguardando dados reais do DevTools para reproduzir
- ✅ Código revisado: ordem lat/lng correta em todo pipeline
- ⏳ Teste com coordenadas conhecidas pendente

### BUG B (Avaliação) ✅ COMPLETO
- ✅ Terminar corrida → aparece "Avalie sua Corrida" (automático)
- ✅ Enviar nota/comentário → salva no context
- ⚠️ Reload da página perde pendência (limitação conhecida - requer localStorage)

---

## OBSERVAÇÕES

### BUG A - Necessário para debug
```
Por favor, fornecer:
1. Screenshot do DevTools → Console mostrando coordenadas
2. Screenshot do DevTools → Network → POST /api/rides (Request Payload)
3. Screenshot do mapa mostrando marker no lugar errado
4. Coordenadas esperadas vs coordenadas onde marker aparece
```

### BUG B - Próximas melhorias
1. Integrar com endpoint real: `POST /api/rides/:id/rating`
2. Persistir pendência em localStorage
3. Adicionar validação: rating obrigatório (não permitir 0 estrelas)
4. Mostrar histórico de avaliações em `/passageiro/history`

---

**Status**: 
- BUG A: ⏳ ANÁLISE (código correto, aguardando reprodução)
- BUG B: ✅ RESOLVIDO (modal automático implementado)
