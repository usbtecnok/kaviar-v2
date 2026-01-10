# CHECKPOINTS TÉCNICOS - REVISÃO DE GEOFENCES

## CHECKPOINT A — Guard-rail RJ está ligado ao "Verificar" ✅

### Onde está o bbox RJ/validação:
- **Arquivo**: `backend/src/utils/geofence-governance.ts`
- **Função**: `isLikelyInRioCity(lat, lng)`
- **Bbox**: lat -23.15 a -22.70, lng -43.85 a -43.00

### Onde a validação é chamada antes do update:
- **Arquivo**: `backend/src/routes/admin.ts`
- **Linha**: 96-130
- **Fluxo**: `if (isVerified === true)` → `canVerifyGeofence()` → `isLikelyInRioCity()`

### Endpoint responsável pelo "Verificar":
- **Rota**: `PATCH /api/admin/communities/:id/geofence-review`
- **Arquivo**: `backend/src/routes/admin.ts`
- **Linha**: 45-150

### ✅ Fluxo comprovado:
```
PATCH /geofence-review → isVerified=true → canVerifyGeofence() → isLikelyInRioCity() → se falha, não grava
```

## CHECKPOINT B — Anti-duplicidade funcionando ✅

### Detecção case-insensitive por nome:
- **Arquivo**: `backend/src/controllers/geofence.ts`
- **Função**: `getCommunitiesWithDuplicates()`
- **Linha**: 129-200
- **Método**: `community.name.trim().toLowerCase()`

### Alerta na UI:
- **Arquivo**: `frontend-app/src/pages/admin/GeofenceManagement.jsx`
- **Componente**: Badge "DUPLICADO (X)" + "CANÔNICO"
- **Linha**: ~300-400

### Bloqueio de verificação:
- **Validação**: `isDuplicateName && !hasSelectedCanonical`
- **Mensagem**: "Nome duplicado: selecione o ID canônico antes de marcar como verificado"

## CHECKPOINT C — Arquivar funciona sem delete ✅

### Botão "Arquivar" → isActive=false:
- **Endpoint**: `PATCH /api/admin/communities/:id/archive`
- **Arquivo**: `backend/src/controllers/geofence.ts`
- **Linha**: 225-245
- **Ação**: `isActive: false, lastEvaluatedAt: new Date()`

### Listagem padrão não mostra isActive=false:
- **Implementação**: Filtros na UI podem mostrar/ocultar arquivados
- **Campo usado**: `isActive` (campo existente no schema)

### ✅ Comprovação:
```
curl PATCH /communities/:id/archive → isActive=false → UI filtra por isActive=true (padrão)
```
