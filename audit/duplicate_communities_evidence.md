# Evidência - Análise de Duplicatas e IDs

**Data:** 2026-01-09T21:59:00.000Z
**Análise:** Comparação entre endpoints público e admin

## 📊 Tabela de Evidência

| name | endpoint | id | geofenceType | sourceEndpoint |
|------|----------|----|--------------|----|
| Botafogo | público | cmk6ux02j0011qqr398od1msm | Polygon | /api/governance/communities |
| Botafogo | admin UI | cmk6ux0dx0012qqr3sx949css | SEM_DADOS (404) | /api/admin/communities |
| Tijuca | público | cmk6ux8fk001rqqr371kc4ple | Polygon | /api/governance/communities |
| Tijuca | admin UI | cmk6ux8rf001sqqr38hes7gqf | SEM_DADOS (404) | /api/admin/communities |
| Glória | público | cmk6uwq9u0007qqr3pxqr64ce | Polygon | /api/governance/communities |
| Glória | admin UI | cmk6uwr250009qqr3jaiz54s5 | SEM_DADOS (404) | /api/admin/communities |
| Providência | ambos | cmk6uwnvh0001qqr377ziza29 | SEM_DADOS (404) | ambos endpoints |

## 🔍 Análise dos Resultados

### ✅ Confirmações
1. **Não há duplicatas no endpoint público**: Cada nome tem apenas 1 ID
2. **IDs públicos TÊM POLYGON**: Botafogo, Tijuca, Glória retornam Polygon
3. **Admin UI usa IDs diferentes**: IDs que não têm geofence
4. **Providência consistente**: Mesmo ID em ambos (ambos 404)

### 🚨 Problema Identificado
**Endpoint admin `/api/admin/communities` retorna IDs diferentes do endpoint público `/api/governance/communities`**

- **Endpoint público**: Retorna IDs com geofence (Polygon)
- **Endpoint admin**: Retorna IDs sem geofence (404)

### 🎯 Hipóteses
1. **Query diferente**: Admin pode estar usando query diferente (ex: incluir inativos)
2. **Ordenação diferente**: Admin pode estar ordenando diferente e pegando registros errados
3. **Filtros diferentes**: Admin pode ter filtros que excluem os registros com geofence
4. **Join diferente**: Admin pode estar fazendo join que altera os resultados

## 🔧 Fix Recomendado

### Opção 1: Alinhar query admin com público
Fazer o endpoint `/api/admin/communities` usar a mesma lógica do público, priorizando registros com geofence.

### Opção 2: Priorizar registros com geofence
No endpoint admin, quando houver múltiplos registros com mesmo nome, escolher o que tem melhor geofence:
1. Polygon/MultiPolygon
2. Point  
3. SEM_DADOS

### Opção 3: Usar endpoint público no admin
Fazer a UI admin consumir `/api/governance/communities` em vez de `/api/admin/communities` para a tabela.

---
*Evidência coletada. Próximo passo: implementar fix mínimo no endpoint admin.*
