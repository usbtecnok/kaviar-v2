# PONTOS DE ATENÇÃO - REVISÃO DE GEOFENCES

## 1. Diferença entre "Gerenciamento de bairros" e "Revisão de geofences"

### Gerenciamento de Bairros:
- **Dados**: `community.centerLat`, `community.centerLng`
- **Fonte**: Campo direto na tabela `communities`
- **Uso**: Centralizar mapa, fitBounds

### Revisão de Geofences:
- **Dados**: `communityGeofence.centerLat`, `communityGeofence.centerLng`
- **Fonte**: Tabela `community_geofences` (relacionada)
- **Uso**: Centro do polígono real, validação

### ⚠️ IMPORTANTE:
- São dados **diferentes** que podem estar **dessincronizados**
- A validação RJ usa os dados do `communityGeofence` (mais precisos)
- O "centro" pode estar fora do polígono se mal configurado

## 2. Identificação Correta de "Alto da Boa Vista"

### ❌ NÃO confundir:
- **Alto da Boa Vista (RJ)**: lat ~-22.96, lng ~-43.28 ✅ CORRETO
- **Alto da Boa Vista (bug)**: lat -10.90, lng -37.69 ❌ INCORRETO

### Verificação:
```sql
SELECT id, name, centerLat, centerLng 
FROM communities 
WHERE name ILIKE '%alto%boa%vista%';
```

### Ação:
- IDs com coordenadas fora do RJ devem ser **arquivados**
- ID correto (dentro do RJ) deve ser mantido como canônico

## 3. Google Maps Provider - Endereço Errado

### Causas Identificadas:

#### 3.1 Centro (lat/lng) inválido:
- **Problema**: `community.centerLat/centerLng` fora do RJ
- **Sintoma**: Google Maps mostra local errado
- **Solução**: Validação RJ bloqueia verificação

#### 3.2 Geofence ausente/errado:
- **Problema**: `communityGeofence.geojson` null ou inválido
- **Sintoma**: "Sem dados de cerca" no mapa
- **Solução**: Validação SEM_DADOS bloqueia verificação

#### 3.3 Fallback de geocoding:
- **Problema**: Google usa nome da community para geocoding
- **Sintoma**: Coordenada "inventada" pelo Google
- **Solução**: Validação RJ + duplicados evita uso de dados ruins

### ⇒ OBJETIVO DA OS:
**Impedir que coordenadas/geofences incorretos sejam "verificados" como se fossem corretos**

## 4. Fluxo de Correção Recomendado

### Para Coordenadas Fora do RJ:
1. **Detectar**: Validação RJ identifica automaticamente
2. **Alertar**: UI mostra "FORA DO RJ" em vermelho
3. **Bloquear**: Não permite verificação
4. **Arquivar**: Operador arquiva registro incorreto
5. **Buscar**: Procurar ID correto ou criar novo (se necessário)

### Para Duplicados:
1. **Detectar**: Algoritmo identifica nomes iguais
2. **Sugerir**: Escolhe canônico automaticamente
3. **Alertar**: UI mostra "DUPLICADO" + canônico sugerido
4. **Escolher**: Operador confirma ou seleciona outro
5. **Arquivar**: IDs não-canônicos são arquivados

### Para SEM_DADOS:
1. **Detectar**: Ausência de geojson
2. **Informar**: "Sem dados de cerca"
3. **Orientar**: "Busque polígono → salve geofence → UI renderiza"
4. **Bloquear**: Não permite verificação sem geofence real

## ✅ RESULTADO FINAL:
- **Operador não consegue mais "verificar" dados incorretos**
- **Sistema força correção antes da verificação**
- **Dados ruins ficam evidentes e são arquivados**
- **Motoristas/passageiros não caem mais em bairros errados**
