# BLOQUEIO FORA DO RJ - REVISÃO DE GEOFENCES

## Prova do Bloqueio

### Bbox RJ Implementado:
```typescript
export const RJ_BBOX = {
  minLat: -23.15,
  maxLat: -22.70,
  minLng: -43.85,
  maxLng: -43.00,
};
```

### Função de Validação:
```typescript
export function isLikelyInRioCity(lat: number, lng: number): boolean {
  return (
    lat >= RJ_BBOX.minLat &&
    lat <= RJ_BBOX.maxLat &&
    lng >= RJ_BBOX.minLng &&
    lng <= RJ_BBOX.maxLng
  );
}
```

## Coordenadas Testadas

### ❌ FORA DO RJ (Bloqueadas):
| Nome | Lat | Lng | Resultado |
|------|-----|-----|-----------|
| Alto da Boa Vista (bug) | -10.9005072 | -37.6914723 | ❌ BLOQUEADO |
| Teste Nordeste | -8.0476 | -34.8770 | ❌ BLOQUEADO |
| Teste Sul | -25.4284 | -49.2733 | ❌ BLOQUEADO |

### ✅ DENTRO DO RJ (Permitidas):
| Nome | Lat | Lng | Resultado |
|------|-----|-----|-----------|
| Botafogo | -22.9519 | -43.1864 | ✅ PERMITIDO |
| Copacabana | -22.9711 | -43.1822 | ✅ PERMITIDO |
| Centro | -22.9068 | -43.1729 | ✅ PERMITIDO |

## Mensagens de Erro

### Bloqueio Fora do RJ:
```json
{
  "success": false,
  "error": "Coordenadas fora do RJ (-10.900507, -37.691472).",
  "validationFailed": true
}
```

### Interface Visual:
- **Linha vermelha** na tabela para coordenadas fora do RJ
- **Ícone Warning** ao lado do nome
- **Chip "FORA DO RJ"** em vermelho
- **Switch desabilitado** para verificação
- **Tooltip explicativo** no switch

## Fluxo de Validação

### Backend (routes/admin.ts):
```typescript
// Se tentando marcar como verificado, aplicar validações
if (isVerified === true) {
  const lat = centerLat ?? parseFloat(String(existingGeofence.centerLat));
  const lng = centerLng ?? parseFloat(String(existingGeofence.centerLng));
  
  const validationResult = canVerifyGeofence({
    centerLat: lat,
    centerLng: lng,
    // ... outros parâmetros
  });

  if (!validationResult.ok) {
    return res.status(400).json({ 
      success: false, 
      error: validationResult.reason,
      validationFailed: true
    });
  }
}
```

### Frontend (GeofenceManagement.jsx):
```javascript
// Verificar se pode ser verificado
const canVerify = community.geofenceData ? canVerifyGeofence({
  centerLat: parseFloat(community.geofenceData.centerLat),
  centerLng: parseFloat(community.geofenceData.centerLng),
  // ... outros parâmetros
}) : { ok: false, reason: 'Sem dados' };

// Switch desabilitado se não pode verificar
<Switch
  checked={editForm.isVerified}
  disabled={!canVerify.ok}
/>
```

## ✅ BLOQUEIO COMPROVADO

1. **Guard-rail ativo**: Bbox RJ implementado
2. **Validação funcionando**: Coordenadas fora do RJ são bloqueadas
3. **Mensagem clara**: Operador entende o motivo do bloqueio
4. **Interface consistente**: Visual indica problema claramente
5. **Não permite bypass**: Validação no backend impede burla
