# Gestão de Motoristas - API Endpoints

## Autenticação
Todos os endpoints requerem autenticação JWT e role SUPER_ADMIN ou OPERATOR.

```
Authorization: Bearer <jwt_token>
```

## 1. Listar Motoristas (com filtros avançados)

```http
GET /api/admin/drivers
```

### Query Parameters:
- `page` (opcional): Página (default: 1)
- `limit` (opcional): Itens por página (default: 10)
- `status` (opcional): pending | approved | suspended | rejected
- `search` (opcional): Busca por nome ou email
- `dateFrom` (opcional): Data inicial (YYYY-MM-DD)
- `dateTo` (opcional): Data final (YYYY-MM-DD)
- `sortBy` (opcional): name | email | createdAt | lastActiveAt (default: createdAt)
- `sortOrder` (opcional): asc | desc (default: desc)

### Exemplos:
```bash
# Listar todos os motoristas suspensos
GET /api/admin/drivers?status=suspended

# Buscar motoristas por nome
GET /api/admin/drivers?search=João

# Motoristas criados nos últimos 7 dias
GET /api/admin/drivers?dateFrom=2026-01-01&sortBy=createdAt&sortOrder=desc
```

### Resposta:
```json
{
  "success": true,
  "data": [
    {
      "id": "clx123...",
      "name": "João Silva",
      "email": "joao@email.com",
      "phone": "+5511999999999",
      "status": "suspended",
      "suspensionReason": "Comportamento inadequado",
      "suspendedAt": "2026-01-02T10:30:00Z",
      "lastActiveAt": "2026-01-01T15:20:00Z",
      "createdAt": "2025-12-15T08:00:00Z",
      "_count": {
        "rides": 45
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

## 2. Detalhes do Motorista

```http
GET /api/admin/drivers/:id
```

### Resposta:
```json
{
  "success": true,
  "data": {
    "id": "clx123...",
    "name": "João Silva",
    "email": "joao@email.com",
    "phone": "+5511999999999",
    "status": "suspended",
    "suspensionReason": "Comportamento inadequado",
    "suspendedAt": "2026-01-02T10:30:00Z",
    "suspendedBy": "admin_id_123",
    "lastActiveAt": "2026-01-01T15:20:00Z",
    "createdAt": "2025-12-15T08:00:00Z",
    "rides": [
      {
        "id": "ride_123",
        "status": "completed",
        "price": "25.50",
        "createdAt": "2026-01-01T14:00:00Z",
        "passenger": {
          "name": "Maria Santos"
        }
      }
    ],
    "_count": {
      "rides": 45
    }
  }
}
```

## 3. Aprovar Motorista

```http
PUT /api/admin/drivers/:id/approve
```

### Resposta:
```json
{
  "success": true,
  "data": {
    "id": "clx123...",
    "status": "approved"
  },
  "message": "Motorista aprovado com sucesso"
}
```

## 4. Suspender Motorista

```http
PUT /api/admin/drivers/:id/suspend
```

### Body:
```json
{
  "reason": "Comportamento inadequado com passageiros"
}
```

### Resposta:
```json
{
  "success": true,
  "data": {
    "id": "clx123...",
    "status": "suspended",
    "suspensionReason": "Comportamento inadequado com passageiros",
    "suspendedAt": "2026-01-02T19:15:00Z"
  },
  "message": "Motorista suspenso com sucesso"
}
```

## 5. Reativar Motorista

```http
PUT /api/admin/drivers/:id/reactivate
```

### Resposta:
```json
{
  "success": true,
  "data": {
    "id": "clx123...",
    "status": "approved",
    "suspensionReason": null,
    "suspendedAt": null
  },
  "message": "Motorista reativado com sucesso"
}
```

## Middleware de Proteção

O middleware `checkDriverStatus` deve ser usado em endpoints onde motoristas interagem com corridas:

```typescript
// Exemplo de uso em rotas de motorista
router.post('/rides/:id/accept', checkDriverStatus, rideController.acceptRide);
router.put('/rides/:id/start', checkDriverStatus, rideController.startRide);
```

## Códigos de Erro

- `400`: Dados inválidos ou regra de negócio violada
- `401`: Token JWT inválido ou ausente
- `403`: Sem permissão (role inadequada ou motorista suspenso)
- `404`: Motorista não encontrado
- `500`: Erro interno do servidor

## Regras de Negócio

1. **Aprovação**: Apenas motoristas com status `pending` podem ser aprovados
2. **Suspensão**: Apenas motoristas com status `approved` podem ser suspensos
3. **Reativação**: Apenas motoristas com status `suspended` podem ser reativados
4. **Aceitação de Corridas**: Apenas motoristas com status `approved` podem aceitar corridas
5. **Motivo Obrigatório**: Suspensão sempre requer um motivo
6. **Auditoria**: Sistema registra quem suspendeu e quando
