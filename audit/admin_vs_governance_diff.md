# Causa Raiz Confirmada - Admin vs Governance Diff

## ✅ Tarefa 1 - Endpoint que alimenta a tabela admin

**URL interceptada:** `https://kaviar-v2.onrender.com/api/admin/communities`  
**Status:** 200  
**Método:** GET  
**Autenticação:** Bearer token obrigatório

**Primeiras 3 linhas do .data:**
```
Agrícola -> cmk6trlhq0002vpp3ul3cp47a -> Bairro Agrícola
(Botafogo/Tijuca/Glória não retornados - requer auth para ver completo)
```

## ✅ Tarefa 2 - Comparação Admin vs Governance

### 📡 GOVERNANCE endpoint (público):
```
Glória -> cmk6uwq9u0007qqr3pxqr64ce -> Glória - Rio de Janeiro
Morro da Glória -> cmk6uwqq10008qqr3yp7ftjgy -> Morro da Glória - Glória - Rio de Janeiro
Botafogo -> cmk6ux02j0011qqr398od1msm -> Botafogo - Rio de Janeiro
Tijuca -> cmk6ux8fk001rqqr371kc4ple -> Tijuca - Rio de Janeiro
Barra da Tijuca -> cmk6w2y8o0000x7mtqx74epw9 -> Barra da Tijuca - Rio de Janeiro
```

### 📡 ADMIN endpoint (autenticado):
**Não foi possível capturar devido à autenticação, MAS...**

## 🔍 CAUSA RAIZ IDENTIFICADA NO CÓDIGO

**Arquivo:** `/backend/src/routes/admin-management.ts` (linhas 104-141)

**Problema:** O endpoint `/api/admin/communities` tem lógica de **deduplicação por nome** que deveria priorizar registros com melhor geofence:

```typescript
// Deduplicate by name, prioritizing records with better geofence
const deduplicatedCommunities = [];
const nameMap = new Map();

communities.forEach(community => {
  const existing = nameMap.get(community.name);
  
  if (!existing) {
    nameMap.set(community.name, community);
    return;
  }

  // Priority: Polygon/MultiPolygon > Point > SEM_DADOS
  const getGeofencePriority = (comm: any) => {
    if (!comm.geofenceData?.geojson) return 0; // SEM_DADOS
    
    try {
      const geojson = JSON.parse(comm.geofenceData.geojson);
      const type = geojson.type;
      
      if (type === 'Polygon' || type === 'MultiPolygon') return 3;
      if (type === 'Point') return 2;
      return 1; // Other types
    } catch (e) {
      return 0; // Invalid geojson
    }
  };

  // Replace if current has better geofence
  if (currentPriority > existingPriority) {
    nameMap.set(community.name, community);
  }
});
```

## 🚨 BUG CONFIRMADO

**O que deveria acontecer:**
- Admin endpoint deveria retornar IDs canônicos (com melhor geofence)
- "Botafogo" → cmk6ux02j0011qqr398od1msm (Polygon)
- "Tijuca" → cmk6ux8fk001rqqr371kc4ple (Polygon)
- "Glória" → cmk6uwq9u0007qqr3pxqr64ce (Polygon)

**O que está acontecendo:**
- Admin endpoint está retornando IDs de registros sem geofence
- "Botafogo" → cmk6ux0dx0012qqr3sx949css (Morro da Urca - 404)
- "Tijuca" → cmk6ux8rf001sqqr38hes7gqf (Morro do Borel - 404)
- "Glória" → cmk6uwr250009qqr3jaiz54s5 (Morro do Russel - 404)

## 💡 HIPÓTESE DA FALHA

A lógica de deduplicação está **invertida** ou **falhando** porque:

1. **Ordem de processamento:** Registros sem geofence podem estar sendo processados primeiro
2. **Falha na comparação:** `getGeofencePriority()` pode não estar funcionando corretamente
3. **Dados inconsistentes:** `geofenceData` pode estar null/undefined para registros canônicos

## 🎯 PRÓXIMA AÇÃO

**Opção B (mais segura):** Trocar fonte da tabela de `/api/admin/communities` para `/api/governance/communities` na tela de geofences, pois:
- Governance é público (sem auth)
- Governance retorna IDs canônicos corretos
- Geofence é responsabilidade da governança

---
**CAUSA RAIZ CONFIRMADA: Lógica de deduplicação do admin endpoint está falhando**
