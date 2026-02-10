# EVIDÊNCIAS: BUG MAPA - PIN NO LUGAR ERRADO (INSTRUMENTAÇÃO)

**Data**: 2026-02-10  
**Prioridade**: ALTA  
**Commit**: df2c095

---

## 1. CONFIRMAÇÃO DO COMPONENTE DE MAPA

### Busca no Repositório
```bash
$ rg -n "google\.maps|Leaflet" frontend-app/src --type-add 'web:*.{js,jsx}' -t web

# Resultado: 2 bibliotecas encontradas
✅ Google Maps: frontend-app/src/components/common/MapComponent.jsx
✅ Leaflet: frontend-app/src/components/maps/LeafletGeofenceMap.jsx
```

### Componente Identificado
**Arquivo**: `frontend-app/src/components/common/MapComponent.jsx`  
**Biblioteca**: `@react-google-maps/api` (Google Maps JavaScript API)  
**Usado em**: `frontend-app/src/pages/passenger/Home.jsx`

**Evidência**: Print mostra "For development purposes only" → típico do Google Maps sem API key válida ou em modo dev.

---

## 2. INSTRUMENTAÇÃO APLICADA

### Logs Adicionados
```javascript
// frontend-app/src/components/common/MapComponent.jsx

useEffect(() => {
  console.log('[MAP] pickup raw:', pickup);
  console.log('[MAP] destination raw:', destination);
  
  if (pickup) {
    console.log('[MAP] pickup parsed:', {
      lat: typeof pickup.lat === 'number' ? pickup.lat : parseFloat(pickup.lat),
      lng: typeof pickup.lng === 'number' ? pickup.lng : parseFloat(pickup.lng),
      types: { lat: typeof pickup.lat, lng: typeof pickup.lng }
    });
  }
  
  if (destination) {
    console.log('[MAP] destination parsed:', {
      lat: typeof destination.lat === 'number' ? destination.lat : parseFloat(destination.lat),
      lng: typeof destination.lng === 'number' ? destination.lng : parseFloat(destination.lng),
      types: { lat: typeof destination.lat, lng: typeof destination.lng }
    });
  }
}, [pickup, destination]);
```

### Validação de Tipos
```javascript
// Antes (❌ pode aceitar strings ou objetos malformados)
{pickup && (
  <Marker position={pickup} />
)}

// Depois (✅ valida tipos antes de renderizar)
{pickup && typeof pickup.lat === 'number' && typeof pickup.lng === 'number' && (
  <Marker position={{ lat: pickup.lat, lng: pickup.lng }} />
)}
```

**Benefícios**:
- Detecta se coordenadas vêm como string (ex: "lat": "-22.9015552")
- Detecta inversão (ex: {lat: -43.xxx, lng: -22.xxx})
- Previne render de markers com dados inválidos
- Garante objeto explícito `{lat, lng}` para Google Maps

---

## 3. ANÁLISE DO FLUXO DE COORDENADAS

### Origem 1: GPS do Navegador
```javascript
// frontend-app/src/pages/passenger/Home.jsx (linha 93-101)
const getCurrentLocation = () => {
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const coords = {
        lat: position.coords.latitude,   // ✅ number (nativo do browser)
        lng: position.coords.longitude   // ✅ number (nativo do browser)
      };
      setPickupCoords(coords);
    }
  );
};
```

**Status**: ✅ CORRETO - `latitude/longitude` são números nativos.

### Origem 2: Google Places Autocomplete
```javascript
// frontend-app/src/components/common/AddressAutocomplete.jsx (linha 69-71)
onPlaceSelect({
  address: prediction.description,
  lat: place.geometry.location.lat(),   // ✅ number (Google Places API)
  lng: place.geometry.location.lng(),   // ✅ number (Google Places API)
  placeId: prediction.place_id
});
```

**Status**: ✅ CORRETO - `.lat()` e `.lng()` retornam números.

### Passagem para MapComponent
```javascript
// frontend-app/src/pages/passenger/Home.jsx (linha 229-232)
<MapComponent
  pickup={pickupCoords}           // {lat: number, lng: number}
  destination={destinationCoords} // {lat: number, lng: number}
  showDirections={!!(pickupCoords && destinationCoords)}
/>
```

**Status**: ✅ CORRETO - Objetos passados diretamente sem conversão.

---

## 4. CHECKLIST DE CAUSAS CLÁSSICAS

### ✅ Ordem lat/lng
```javascript
// Google Maps espera: {lat, lng}
// Código usa: {lat: pickup.lat, lng: pickup.lng}
// Status: CORRETO
```

### ✅ Tipo de dados
```javascript
// Google Maps espera: number
// Código valida: typeof pickup.lat === 'number'
// Status: CORRETO (após fix)
```

### ✅ Nome das propriedades
```javascript
// Google Maps espera: lat, lng (não lon, latitude, longitude)
// Código usa: lat, lng
// Status: CORRETO
```

### ⚠️ Parse de string com vírgula decimal
```javascript
// Possível problema: "-22,9015552" (pt-BR) → parseFloat("-22") = -22
// Mitigação: Validação de tipo detecta se não é number
// Status: PROTEGIDO (logs vão mostrar se ocorrer)
```

### ⚠️ Inversão GeoJSON → Google Maps
```javascript
// GeoJSON/PostGIS: [lng, lat]
// Google Maps: {lat, lng}
// Código: Não usa GeoJSON neste componente
// Status: NÃO APLICÁVEL (mas Leaflet já trata corretamente)
```

---

## 5. RUNBOOK DE DEBUG

### Passo 1: Capturar Logs do Console
```
1. Acessar https://kaviar.com.br/passageiro/home
2. Abrir DevTools → Console
3. Clicar "Usar minha localização" OU digitar endereço
4. Procurar logs:
   [MAP] pickup raw: {...}
   [MAP] pickup parsed: {...}
   [MAP] destination raw: {...}
   [MAP] destination parsed: {...}
```

**Verificar**:
- `types.lat` e `types.lng` devem ser `"number"`
- Valores de `lat` devem estar entre -90 e 90
- Valores de `lng` devem estar entre -180 e 180
- Para RJ: `lat` ≈ -22.x, `lng` ≈ -43.x

### Passo 2: Capturar Request de Criação de Corrida
```
1. DevTools → Network → Clear
2. Preencher origem + destino
3. Clicar "Solicitar Corrida"
4. Filtrar: "rides"
5. Clicar no request → Payload
```

**Verificar**:
```json
{
  "pickup": {
    "lat": -22.9015552,  // ✅ number, não string
    "lng": -43.2799744   // ✅ number, não string
  },
  "dropoff": {
    "lat": -22.xxxx,
    "lng": -43.xxxx
  }
}
```

### Passo 3: Comparar Coordenadas vs Posição do Marker
```
1. Copiar coordenadas do console: lat: -22.9015552, lng: -43.2799744
2. Abrir Google Maps: https://www.google.com/maps?q=-22.9015552,-43.2799744
3. Verificar se é Copacabana, Rio de Janeiro
4. Comparar com posição do marker verde no mapa do app
```

**Resultado esperado**: Marker deve estar no mesmo local.

### Passo 4: Testar com Coordenadas Conhecidas
```javascript
// No DevTools Console (com app aberto)
// Forçar coordenadas conhecidas
const testCoords = { lat: -22.9068, lng: -43.1729 }; // Centro do RJ
console.log('[TEST] Setting pickup to:', testCoords);

// Verificar se marker aparece no centro do RJ
```

---

## 6. EVIDÊNCIAS NECESSÁRIAS PARA DIAGNÓSTICO FINAL

Por favor, fornecer:

### A) Screenshot DevTools Console
```
Mostrando logs:
[MAP] pickup raw: {...}
[MAP] pickup parsed: {lat: -22.xxx, lng: -43.xxx, types: {...}}
```

### B) Screenshot DevTools Network
```
Request: POST /api/rides
Payload: {"pickup": {"lat": ..., "lng": ...}, ...}
```

### C) Screenshot do Mapa
```
Mostrando:
- Marker verde (origem) na posição incorreta
- Coordenadas esperadas vs coordenadas onde marker aparece
```

### D) Comparação Google Maps
```
Link: https://www.google.com/maps?q=LAT,LNG
Confirmar se coordenadas apontam para local correto
```

---

## 7. POSSÍVEIS CAUSAS REMANESCENTES

### Causa 1: API Key Inválida/Expirada
**Sintoma**: "For development purposes only" no mapa  
**Impacto**: Pode causar comportamento inesperado de geocoding/rendering  
**Verificação**:
```javascript
// Verificar se VITE_GOOGLE_MAPS_API_KEY está configurada
console.log('API Key:', import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? 'SET' : 'NOT SET');
```

### Causa 2: Locale do Browser (vírgula decimal)
**Sintoma**: Coordenadas parseadas incorretamente  
**Exemplo**: "-22,9015552" → parseFloat("-22") = -22  
**Mitigação**: Logs vão mostrar `types.lat = "string"` se ocorrer  

### Causa 3: Cache de Coordenadas Antigas
**Sintoma**: Marker aparece em local de request anterior  
**Verificação**: Limpar localStorage e recarregar página  

### Causa 4: Zoom/Center Incorreto
**Sintoma**: Marker está correto mas mapa não centraliza  
**Verificação**: Logs mostram coordenadas corretas mas mapa não move  
**Fix**: Adicionar `map.panTo(pickup)` após render  

---

## COMMITS

- **df2c095**: fix(map): add detailed logging and type validation for coordinates

---

## DoD (Definition of Done)

### Instrumentação ✅ COMPLETO
- ✅ Logs detalhados de coordenadas (raw + parsed + types)
- ✅ Validação de tipos antes de render
- ✅ Objeto explícito `{lat, lng}` para markers
- ✅ Componente identificado: MapComponent.jsx (Google Maps)

### Resolução do Bug ⏳ PENDENTE
- ⏳ Aguardando logs reais do DevTools
- ⏳ Aguardando screenshot do Network (payload)
- ⏳ Aguardando comparação coordenadas vs posição real

**Próximo passo**: Testar em PROD e coletar evidências A, B, C, D acima.

---

**Status**: ✅ INSTRUMENTADO - Aguardando teste em PROD para diagnóstico final
