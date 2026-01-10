# Implementação - Correção Mínima Frontend

## ✅ IMPLEMENTADO

### 1. Badge de Status do Geofence
```javascript
<Chip
  label={getGeofenceStatus(community)}
  color={getGeofenceColor(community)}
  size="small"
  variant="outlined"
/>
```

**Status possíveis:**
- `Polygon/MultiPolygon` (verde) - Dados completos
- `Point/LineString` (amarelo) - Dados parciais  
- `SEM DADOS` (vermelho) - Sem geofence
- `Verificar mapa` (cinza) - Não testado ainda

### 2. Toggle "Mostrar apenas com mapa"
```javascript
<FormControlLabel
  control={<Switch checked={showOnlyWithMap} onChange={(e) => setShowOnlyWithMap(e.target.checked)} />}
  label="Mostrar apenas com mapa"
/>
```

**Filtro aplicado:**
```javascript
.filter(community => !showOnlyWithMap || community.geofenceStatus !== 'SEM_DADOS')
```

### 3. Modal com Mensagem Clara para SEM_DADOS
```javascript
{mapDialog.community?.hasNoGeofence && (
  <Alert severity="warning">
    ⚠️ Sem dados de cerca ainda
    Esta comunidade não possui dados de geofence cadastrados.
  </Alert>
)}
```

### 4. Atualização Local do Status
```javascript
// Após fetch do geofence, atualiza o status localmente
setCommunities(prev => prev.map(c => 
  c.id === community.id 
    ? { ...c, geofenceStatus: geometryType || 'SEM_DADOS' }
    : c
));
```

## 🎯 COMPORTAMENTO

1. **Primeira carga:** Todos os badges mostram "Verificar mapa"
2. **Após clicar "Ver no mapa":** Badge atualiza com status real
3. **Toggle ativo:** Oculta comunidades com "SEM DADOS"
4. **Modal SEM_DADOS:** Mostra mensagem clara + centro (se existir)

## 📋 PRÓXIMA AÇÃO OBRIGATÓRIA

**Deploy/teste da UI com CHECKs:**
1. Capturar logs: `[MAP DIAGNOSTIC] clicked row { name, id }`
2. Capturar logs: `[MAP DIAGNOSTIC] fetching geofence { url }`
3. Executar curl para o mesmo ID
4. Atualizar matriz de evidência

## 🚫 RESTRIÇÕES RESPEITADAS

- ✅ Não mexeu em migrations/seeds
- ✅ Não deduplicou registros automaticamente  
- ✅ Não inventou regra "bairro mais próximo"
- ✅ Frontend-only, sem Frankenstein
- ✅ Não usa `hasGeofence` do backend (calcula localmente)

## 📊 MATRIZ PENDENTE

| name | clicked_id | fetched_id | curl_status | geometry_type | conclusão |
|------|------------|------------|-------------|---------------|-----------|
| Botafogo | ? | ? | ? | ? | PENDENTE |
| Tijuca | ? | ? | ? | ? | PENDENTE |
| Glória | ? | ? | ? | ? | PENDENTE |
| Morro da Providência | ? | ? | ? | ? | PENDENTE |

**Status:** IMPLEMENTAÇÃO CONCLUÍDA - Aguardando teste da UI
