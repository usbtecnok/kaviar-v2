# Relatório de Auditoria - Evidência Objetiva via API

## 📊 DADOS COMPROVADOS (curl produção)

**Total de comunidades:** 85  
**Status 200:** 62  
**Status 404:** 23  
**Endpoint testado:** `/api/governance/communities/:id/geofence`

## 🔍 DUPLICIDADES DETECTADAS

### Casos de Substring Match Identificados:

| Nome Base | Variação | ID Base | ID Variação | Status Base | Status Variação |
|-----------|----------|---------|-------------|-------------|-----------------|
| **Glória** | Morro da Glória | cmk6uwq9u0007qqr3pxqr64ce | cmk6uwqq10008qqr3yp7ftjgy | 200 (Polygon) | 200 (LineString) |
| **Tijuca** | Barra da Tijuca | cmk6ux8fk001rqqr371kc4ple | cmk6w2y8o0000x7mtqx74epw9 | 200 (Polygon) | 200 (Polygon) |
| **Providência** | Morro da Providência | - | cmk6uwnvh0001qqr377ziza29 | - | 404 (SEM_DADOS) |
| **Livramento** | Morro do Livramento | - | cmk6uwo7w0002qqr3v5605hpv, cmk6uwvhk000nqqr3l2f8t72s | - | 404, 404 |
| **São Carlos** | Morro de São Carlos | - | cmk6uws0f000cqqr3wjkizs87, cmk6uwtlb000hqqr3i5ozthxz | - | 404, 404 |
| **Turano** | Morro do Turano | - | cmk6uwsn6000eqqr3dg5pr9d0, cmk6uwxdu000tqqr3e50a0of4 | - | 404, 404 |
| **Estácio** | Morro do Estácio | cmk6uwsyk000fqqr3t67e9of3 | cmk6uwt9x000gqqr3n1v9tozj | 200 (Polygon) | 404 (SEM_DADOS) |
| **Saúde** | Morro da Saúde | cmk6uwuto000lqqr3at33yd8u | cmk6uwv67000mqqr3vkssj8vw | 200 (LineString) | 404 (SEM_DADOS) |
| **Gamboa** | Morro da Gamboa | cmk6uwvsy000oqqr3dherrtpj | cmk6uww4c000pqqr3lxpkypws | 200 (Point) | 200 (Polygon) |
| **Santo Cristo** | Morro do Santo Cristo | cmk6uwwfp000qqqr3uj390nph | cmk6uwwr3000rqqr3276gidms | 200 (Point) | 200 (LineString) |
| **São Cristóvão** | Morro do São Cristóvão | cmk6uwy0e000vqqr366pb2x1a | cmk6uwybz000wqqr37g94fwpx | 200 (Point) | 200 (Polygon) |
| **Catete** | Morro do Catete | cmk6uwzfs000zqqr3npc3pqq5 | cmk6uwzr60010qqr3pwhe8cbi | 200 (Point) | 200 (LineString) |
| **Leme** | Morro do Leme | cmk6ux1hr0015qqr3jce1r8dk | cmk6ux1t40016qqr35694dt2o | 200 (Polygon) | 200 (Polygon) |
| **Cantagalo** | Morro do Cantagalo | cmk7ay4uf0000818tqcvflkf7 | cmk6ux2fv0018qqr3alvmstok | 404 (SEM_DADOS) | 200 (Polygon) |
| **Cosme Velho** | Morro do Cosme Velho | cmk6ux7tb001pqqr3zpt630mw | cmk6ux84o001qqqr36hrviau4 | 200 (Point) | 200 (LineString) |
| **Maracanã** | Morro do Maracanã | cmk6ux9pl001vqqr3hy1rngz7 | cmk6ux9zs001wqqr3qbpb63vq | 200 (Polygon) | 404 (SEM_DADOS) |
| **Macacos** | Morro dos Macacos | - | cmk6uxatd001yqqr3d5rfqrba | - | 200 (Polygon) |
| **Grajaú** | Morro do Grajaú | cmk6uxb4r001zqqr3pk7hl435 | cmk6uxbg50020qqr3l8u925pt | 200 (MultiPolygon) | 404 (SEM_DADOS) |
| **Andaraí** | Morro do Andaraí | cmk6uxbud0021qqr38v4pkba1 | cmk6uxc5q0022qqr38edtr7ix | 200 (LineString) | 200 (Polygon) |

## 🎯 CASOS CRÍTICOS PARA A UI

### 1. **Glória vs Morro da Glória** ⚠️
- Ambos têm geofence válido
- Risco de confusão na UI: usuário clica "Glória" mas pode ver "Morro da Glória"
- **Solução:** Mostrar nome completo na tabela

### 2. **Tijuca vs Barra da Tijuca** ⚠️
- Ambos têm geofence válido (Polygon)
- Risco alto de confusão
- **Solução:** Mostrar nome completo na tabela

### 3. **Morro da Providência** ❌
- Único registro, mas sem geofence (404)
- **Solução:** Ocultar da lista ou marcar como "Sem mapa"

## 📋 EVIDÊNCIA OBJETIVA DOS CHECKS

### ✅ CHECK 1: UI Log
```javascript
console.log("[MAP DIAGNOSTIC] clicked row", { name: community.name, id: community.id });
```
**Status:** Implementado no código

### ✅ CHECK 2: Fetch Log  
```javascript
console.log("[MAP DIAGNOSTIC] fetching geofence", `/api/governance/communities/${community.id}/geofence`);
```
**Status:** Implementado no código

### ✅ CHECK 3: Handler Audit
- `onClick={() => openMapDialog(community)}` ✓
- `key={community.id}` ✓  
- Sem uso de index/array externo ✓
- Sem busca por substring ✓

## 🔧 CORREÇÕES MÍNIMAS RECOMENDADAS

### 1. **Filtrar comunidades sem geofence**
```javascript
const communitiesWithGeofence = communities.filter(c => c.hasGeofence !== false);
```

### 2. **Mostrar status na tabela**
```javascript
<Chip 
  label={community.hasGeofence ? "Com mapa" : "Sem mapa"} 
  color={community.hasGeofence ? "success" : "warning"} 
/>
```

### 3. **Endpoint unificado**
- Fazer `/api/admin/communities` incluir flag `hasGeofence`
- Ou retornar apenas comunidades com geofence válido

## 📊 ESTATÍSTICAS FINAIS

- **Comunidades com Polygon:** 42 (49.4%)
- **Comunidades com Point:** 11 (12.9%)  
- **Comunidades com LineString:** 7 (8.2%)
- **Comunidades com MultiPolygon:** 2 (2.4%)
- **Comunidades sem dados:** 23 (27.1%)

## ⚠️ LIMITAÇÃO CRÍTICA

**NÃO foi possível testar a UI diretamente:**
- Endpoint `/api/admin/communities` requer autenticação
- Frontend local não iniciou
- Sem acesso ao console do frontend em produção

**PRÓXIMA AÇÃO OBRIGATÓRIA:**
1. Deploy/rodar frontend com CHECKs implementados
2. Capturar logs do console para Botafogo/Tijuca/Glória/Providência
3. Executar curl para o mesmo ID usado no fetch
4. Atualizar matriz: `name | clicked_id | fetched_id | curl_status | geometry_type | conclusão`

## ✅ CONCLUSÃO LIMITADA

**Comprovado via curl:**
- 23 comunidades retornam 404 no geofence
- Existem nomes duplicados/similares com IDs diferentes

**NÃO comprovado:**
- "UI usando ID errado" (requer logs do console + curl do mesmo ID)
- Causa raiz do problema relatado pelo usuário

**Status:** EVIDÊNCIA PARCIAL - Aguardando teste da UI para conclusão definitiva
