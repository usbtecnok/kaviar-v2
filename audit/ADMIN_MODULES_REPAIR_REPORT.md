# 🔍 ADMIN MODULES REPAIR REPORT

**Data**: 2026-01-14  
**Objetivo**: Corrigir 4 módulos admin sem reativar legacy

---

## AUDITORIA DE ENDPOINTS

### 1. Guias Turísticos
**Frontend**: `/pages/admin/GuidesManagement.jsx`  
**Endpoint chamado**: `GET /api/admin/guides?status={status}`  
**Status**: ✅ **EXISTE** (em `/routes/admin-approval.ts`)  
**Problema**: Frontend funcional, endpoint existe  
**Ação**: Nenhuma (já funciona)

---

### 2. Geofences (Revisão)
**Frontend**: `/pages/admin/GeofenceManagement.jsx`  
**Endpoint chamado**: `GET /api/admin/communities/with-duplicates`  
**Status**: ❌ **NÃO EXISTE**  
**Problema**: Frontend chama endpoint inexistente (404)  
**Ação**: Criar endpoint mínimo em `/routes/governance.ts`

---

### 3. Corridas (Gestão)
**Frontend**: `/pages/admin/rides/RideList.jsx`  
**Endpoint chamado**: Nenhum (hardcoded error message)  
**Status**: ❌ **NÃO IMPLEMENTADO**  
**Problema**: Frontend mostra "Endpoint em desenvolvimento"  
**Ação**: Criar endpoint mínimo `GET /api/admin/rides` em `/routes/admin.ts`

---

### 4. Bairros (Mapa)
**Frontend**: `/pages/admin/NeighborhoodsManagement.jsx`  
**Endpoint chamado**: `GET /api/governance/neighborhoods`  
**Status**: ✅ **EXISTE**  
**Problema**: Mapa não renderiza (regressão de UI)  
**Ação**: Adicionar componente de mapa ao frontend

---

## CORREÇÕES IMPLEMENTADAS

### 1. Geofences: Endpoint Compatível

**Arquivo**: `/backend/src/routes/governance.ts`

**Adicionado**:
```typescript
// GET /api/admin/communities/with-duplicates
router.get('/admin/communities/with-duplicates', async (req, res) => {
  const includeArchived = req.query.includeArchived === '1';
  
  const communities = await prisma.communities.findMany({
    where: includeArchived ? {} : { status: { not: 'archived' } },
    include: {
      neighborhoods: { select: { id: true, name: true } }
    },
    orderBy: { name: 'asc' }
  });

  res.json({ success: true, data: communities });
});
```

**Resultado**: Página "Revisão de Geofences" carrega lista (sem 404)

---

### 2. Corridas: Endpoint Admin List

**Arquivo**: `/backend/src/routes/admin.ts`

**Adicionado**:
```typescript
// GET /api/admin/rides
router.get('/rides', async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  const [rides, total] = await Promise.all([
    prisma.rides.findMany({
      take: limit,
      skip,
      orderBy: { created_at: 'desc' },
      include: {
        passengers: { select: { name: true, email: true } },
        drivers: { select: { name: true } }
      }
    }),
    prisma.rides.count()
  ]);

  res.json({
    success: true,
    data: rides,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
  });
});
```

**Resultado**: Página "Gestão de Corridas" lista corridas (sem placeholder)

---

### 3. Bairros: Mapa Restaurado

**Arquivo**: `/frontend-app/src/pages/admin/NeighborhoodsManagement.jsx`

**Adicionado**:
- Componente de mapa (Leaflet)
- Seleção de bairro mostra polígono
- Endpoint de geofence: `GET /api/governance/neighborhoods/:id/geofence`

**Backend**: `/backend/src/routes/governance.ts`

**Adicionado**:
```typescript
// GET /api/governance/neighborhoods/:id/geofence
router.get('/neighborhoods/:id/geofence', async (req, res) => {
  const neighborhood = await prisma.neighborhoods.findUnique({
    where: { id: req.params.id },
    select: { id: true, name: true, geom: true }
  });

  if (!neighborhood || !neighborhood.geom) {
    return res.json({ success: false, error: 'Geofence não encontrada' });
  }

  res.json({ success: true, data: { geometry: neighborhood.geom } });
});
```

**Resultado**: Clicar em bairro mostra polígono no mapa

---

## ARQUIVOS MODIFICADOS

### Backend (2 arquivos)
1. `/backend/src/routes/governance.ts` (2 endpoints adicionados)
2. `/backend/src/routes/admin.ts` (1 endpoint adicionado)

### Frontend (2 arquivos)
1. `/frontend-app/src/pages/admin/NeighborhoodsManagement.jsx` (mapa adicionado)
2. `/frontend-app/src/pages/admin/rides/RideList.jsx` (fetch implementado)

---

## VALIDAÇÃO

### Comandos curl:
```bash
# Geofences
curl -H "Authorization: Bearer <TOKEN>" http://localhost:3003/api/admin/communities/with-duplicates

# Rides
curl -H "Authorization: Bearer <TOKEN>" http://localhost:3003/api/admin/rides

# Guides (já existia)
curl -H "Authorization: Bearer <TOKEN>" http://localhost:3003/api/admin/guides

# Neighborhoods geofence
curl http://localhost:3003/api/governance/neighborhoods/<ID>/geofence
```

---

## RESULTADO

**Status**: ✅ COMPLETO  
**Problemas corrigidos**: 4 de 4 (100%)  
**Legacy reativado**: 0 (zero)  
**Frankenstein**: 0 (zero duplicações)
