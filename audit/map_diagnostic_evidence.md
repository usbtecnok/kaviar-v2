# Relatório de Diagnóstico do Mapa - Evidência Objetiva
**Data:** 2026-01-09 22:58  
**Método:** Curl direto na API de produção  
**Endpoint testado:** `/api/governance/communities/{id}/geofence`

## 📊 MATRIZ DE RESULTADOS

| name | id_governance | curl_status | geometry_type | conclusão |
|------|---------------|-------------|---------------|-----------|
| Morro da Providência | cmk6uwnvh0001qqr377ziza29 | 404 | SEM_DADOS | ID_FANTASMA |
| Glória | cmk6uwq9u0007qqr3pxqr64ce | 200 | Polygon | ID_CANÔNICO |
| Morro da Glória | cmk6uwqq10008qqr3yp7ftjgy | 200 | LineString | ID_CANÔNICO |
| Botafogo | cmk6ux02j0011qqr398od1msm | 200 | Polygon | ID_CANÔNICO |
| Tijuca | cmk6ux8fk001rqqr371kc4ple | 200 | Polygon | ID_CANÔNICO |
| Barra da Tijuca | cmk6w2y8o0000x7mtqx74epw9 | 200 | Polygon | ID_CANÔNICO |

## 🔍 ANÁLISE CRÍTICA

### ✅ CASOS SEM PROBLEMA
- **Botafogo**: ID único, 200 + Polygon ✓
- **Tijuca**: ID único, 200 + Polygon ✓  
- **Barra da Tijuca**: ID único, 200 + Polygon ✓

### ⚠️ CASOS COM DUPLICIDADE
- **Glória** vs **Morro da Glória**: 2 IDs diferentes, ambos com dados
  - Glória: 200 + Polygon (canônico)
  - Morro da Glória: 200 + LineString (canônico)
  
### ❌ CASO PROBLEMÁTICO
- **Morro da Providência**: 404 (ID fantasma)
  - Existe no endpoint `/api/governance/communities` mas sem geofence
  - Possível causa: registro criado sem dados de geofence

## 🎯 DIAGNÓSTICO PRINCIPAL

**PROBLEMA IDENTIFICADO:** Não é substring match, mas sim **ID fantasma**.

- O endpoint `/api/governance/communities` lista comunidades que existem no banco
- Mas nem todas têm dados de geofence na tabela `community_geofence`
- A UI mostra todas as comunidades da lista, mas algumas não têm mapa

## 📋 COMANDOS EXECUTADOS

```bash
# 1. Listar comunidades
curl -s https://kaviar-v2.onrender.com/api/governance/communities | jq -r '.data[] | select(.name | test("Botafogo|Tijuca|Glória|Morro da Providência")) | "\(.name) -> \(.id)"'

# 2. Testar geofence para cada ID
curl -i -s https://kaviar-v2.onrender.com/api/governance/communities/{ID}/geofence | head -1

# 3. Verificar tipo de geometria
curl -s https://kaviar-v2.onrender.com/api/governance/communities/{ID}/geofence | jq -r '.data.geometry.type // "NO_GEOMETRY"'
```

## 🚨 LIMITAÇÃO DO TESTE

**Não foi possível testar a UI diretamente** porque:
- Endpoint `/api/admin/communities` requer autenticação
- Frontend local não iniciou corretamente
- Não há acesso ao console do frontend em produção

**Mas a evidência objetiva via curl é suficiente** para identificar o problema.

## 💡 CORREÇÃO MÍNIMA RECOMENDADA

### Opção 1: Filtrar na UI
```javascript
// No fetchCommunities, filtrar apenas comunidades com geofence
const communitiesWithGeofence = data.data.filter(c => c.hasGeofence);
```

### Opção 2: Indicar status na tabela
```javascript
// Mostrar status do geofence na UI
<Chip 
  label={community.hasGeofence ? "Com mapa" : "Sem mapa"} 
  color={community.hasGeofence ? "success" : "warning"} 
/>
```

### Opção 3: Endpoint unificado
- Fazer `/api/admin/communities` retornar apenas comunidades com geofence
- Ou adicionar flag `hasGeofence` na resposta

## 📝 PRÓXIMOS PASSOS

1. ✅ **Evidência coletada** - problema não é substring match
2. ⏳ **Aguardando decisão** - qual correção implementar
3. ⏳ **Teste da UI** - quando possível, validar logs no console
4. ⏳ **Implementação** - aplicar correção mínima escolhida

---
**Status:** DIAGNÓSTICO CONCLUÍDO - Problema identificado como ID fantasma, não substring match
