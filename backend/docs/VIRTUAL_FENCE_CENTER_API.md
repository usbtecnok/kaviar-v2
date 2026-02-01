# Virtual Fence Center API - Exemplos de Uso

## Autenticação

Primeiro, obtenha um token de admin:

```bash
# Login como SUPER_ADMIN
TOKEN=$(curl -s -X POST https://api.kaviar.com.br/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"suporte@kaviar.com.br","password":"Kaviar2026!"}' \
  | jq -r '.token')
```

## 1. Buscar Centro Virtual Atual

```bash
# GET /api/admin/drivers/:driverId/virtual-fence-center
curl -X GET "https://api.kaviar.com.br/api/admin/drivers/DRIVER_ID/virtual-fence-center" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.'
```

**Response (sem centro virtual):**
```json
{
  "success": true,
  "driverId": "uuid",
  "virtualFenceCenter": null,
  "updatedAt": "2026-02-01T00:00:00.000Z"
}
```

**Response (com centro virtual):**
```json
{
  "success": true,
  "driverId": "uuid",
  "virtualFenceCenter": {
    "lat": -23.5505,
    "lng": -46.6333
  },
  "updatedAt": "2026-02-01T00:00:00.000Z"
}
```

## 2. Definir/Atualizar Centro Virtual

```bash
# PUT /api/admin/drivers/:driverId/virtual-fence-center
curl -X PUT "https://api.kaviar.com.br/api/admin/drivers/DRIVER_ID/virtual-fence-center" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "lat": -23.5505,
    "lng": -46.6333
  }' \
  | jq '.'
```

**Response:**
```json
{
  "success": true,
  "driverId": "uuid",
  "before": {
    "lat": null,
    "lng": null
  },
  "after": {
    "lat": -23.5505,
    "lng": -46.6333
  }
}
```

## 3. Remover Centro Virtual

```bash
# DELETE /api/admin/drivers/:driverId/virtual-fence-center
curl -X DELETE "https://api.kaviar.com.br/api/admin/drivers/DRIVER_ID/virtual-fence-center" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.'
```

**Response:**
```json
{
  "success": true,
  "driverId": "uuid",
  "before": {
    "lat": -23.5505,
    "lng": -46.6333
  },
  "after": {
    "lat": null,
    "lng": null
  }
}
```

## Casos de Erro

### 401 - Não autenticado
```bash
curl -X GET "https://api.kaviar.com.br/api/admin/drivers/DRIVER_ID/virtual-fence-center"
```
```json
{
  "success": false,
  "error": "Token não fornecido"
}
```

### 403 - Sem permissão (ANGEL_VIEWER tentando PUT/DELETE)
```json
{
  "success": false,
  "error": "Acesso negado. Permissão insuficiente.",
  "requiredRoles": ["SUPER_ADMIN", "OPERATOR"],
  "userRole": "ANGEL_VIEWER"
}
```

### 400 - Coordenadas inválidas
```bash
curl -X PUT "https://api.kaviar.com.br/api/admin/drivers/DRIVER_ID/virtual-fence-center" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"lat": 100, "lng": -46.6333}'
```
```json
{
  "success": false,
  "error": "Latitude inválida: deve estar entre -90 e 90"
}
```

### 404 - Driver não encontrado
```json
{
  "success": false,
  "error": "Driver não encontrado"
}
```

## Auditoria

Todas as operações de PUT e DELETE geram logs estruturados no CloudWatch:

```json
{
  "event": "VIRTUAL_FENCE_CENTER_UPDATED",
  "adminId": "admin-uuid",
  "adminEmail": "suporte@kaviar.com.br",
  "driverId": "driver-uuid",
  "before": { "lat": null, "lng": null },
  "after": { "lat": -23.5505, "lng": -46.6333 },
  "timestamp": "2026-02-01T00:00:00.000Z",
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0..."
}
```

## Permissões

| Operação | SUPER_ADMIN | OPERATOR | ANGEL_VIEWER |
|----------|-------------|----------|--------------|
| GET      | ✅          | ✅       | ✅           |
| PUT      | ✅          | ✅       | ❌           |
| DELETE   | ✅          | ✅       | ❌           |

## Teste Automatizado

Execute o script de teste completo:

```bash
cd /home/goes/kaviar/backend
./scripts/test-virtual-fence-center-api.sh
```

O script valida:
- ✅ SUPER_ADMIN consegue GET/PUT/DELETE
- ✅ ANGEL_VIEWER consegue GET mas recebe 403 em PUT/DELETE
- ✅ Validação de coordenadas (lat: -90 a 90, lng: -180 a 180)
- ✅ Driver inexistente retorna 404
- ✅ Auditoria registrada em logs
