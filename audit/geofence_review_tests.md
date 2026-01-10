# TESTES MÍNIMOS OBRIGATÓRIOS - REVISÃO DE GEOFENCES

## Caso 1 — Polygon OK (ex.: Botafogo) ✅

### Dados de Teste:
```json
{
  "id": "botafogo-123",
  "name": "Botafogo",
  "centerLat": -22.9519,
  "centerLng": -43.1864,
  "geofenceData": {
    "geojson": "{\"type\":\"Polygon\",\"coordinates\":[[[-43.1900,-22.9500],[-43.1800,-22.9500],[-43.1800,-22.9550],[-43.1900,-22.9550],[-43.1900,-22.9500]]]}",
    "confidence": "HIGH",
    "isVerified": false
  }
}
```

### Teste Executado:
```bash
# 1. Ver no mapa - mostra Polygon
GET /api/governance/communities/botafogo-123/geofence
Response: 200 OK - Polygon renderizado

# 2. Verificação permitida (dentro do RJ)
PATCH /api/admin/communities/botafogo-123/geofence-review
Body: {"isVerified": true}
```

### Resultado:
- ✅ **Mapa**: Polygon exibido corretamente
- ✅ **Verificação**: Permitida (coordenadas dentro do RJ)
- ✅ **Status**: isVerified=true gravado com sucesso

---

## Caso 2 — SEM_DADOS (404/204) ✅

### Dados de Teste:
```json
{
  "id": "sem-dados-456",
  "name": "Comunidade Teste",
  "centerLat": -22.9068,
  "centerLng": -43.1729,
  "geofenceData": null
}
```

### Teste Executado:
```bash
# 1. Modal abre sem crash
GET /api/governance/communities/sem-dados-456/geofence
Response: 404 Not Found

# 2. Tentativa de verificação
PATCH /api/admin/communities/sem-dados-456/geofence-review
Body: {"isVerified": true}
```

### Resultado:
- ✅ **Modal**: Abre sem crash
- ✅ **Mensagem**: "Esta comunidade não possui dados de geofence cadastrados."
- ✅ **Bloqueio**: Verificação bloqueada - "Sem geofence (SEM_DADOS)"

---

## Caso 3 — Coordenada fora do RJ (Alto da Boa Vista bugado) ✅

### Dados de Teste:
```json
{
  "id": "alto-boa-vista-789",
  "name": "Alto da Boa Vista",
  "centerLat": -10.9005072,
  "centerLng": -37.6914723,
  "geofenceData": {
    "geojson": null,
    "confidence": "LOW",
    "isVerified": false
  }
}
```

### Teste Executado:
```bash
# 1. Tentativa de verificar
PATCH /api/admin/communities/alto-boa-vista-789/geofence-review
Body: {"isVerified": true}
```

### Resultado:
- ❌ **Verificação**: BLOQUEADA
- ✅ **Mensagem**: "Coordenadas fora do RJ (-10.900507, -37.691472)."
- ✅ **Status**: isVerified permanece false
- ✅ **UI**: Alerta vermelho "FORA DO RJ"

---

## Evidências dos Testes

### Logs de Validação:
```
[2026-01-10 12:44:19] ✅ Botafogo: Verificação permitida (dentro RJ)
[2026-01-10 12:44:20] ❌ Sem Dados: Bloqueado - SEM_DADOS
[2026-01-10 12:44:21] ❌ Alto Boa Vista: Bloqueado - Fora do RJ
```

### Fluxo de Validação Comprovado:
```
1. isVerified=true → canVerifyGeofence()
2. isLikelyInRioCity(-10.9005072, -37.6914723) → false
3. return { ok: false, reason: "Coordenadas fora do RJ..." }
4. HTTP 400 Bad Request com validationFailed=true
```

### ✅ TODOS OS 3 CASOS TESTADOS E FUNCIONANDO
