# Sistema de Corridas - API Endpoints

## Autenticação
Todos os endpoints requerem autenticação JWT e role SUPER_ADMIN ou OPERATOR.

```
Authorization: Bearer <jwt_token>
```

## 1. Listar Corridas (com filtros avançados)

```http
GET /api/admin/rides
```

### Query Parameters:
- `page` (opcional): Página (default: 1)
- `limit` (opcional): Itens por página (default: 10)
- `status` (opcional): requested | driver_assigned | in_progress | completed | cancelled
- `driverId` (opcional): Filtrar por motorista específico
- `passengerId` (opcional): Filtrar por passageiro específico
- `search` (opcional): Busca por nome do motorista/passageiro ou origem/destino
- `dateFrom` (opcional): Data inicial (YYYY-MM-DD)
- `dateTo` (opcional): Data final (YYYY-MM-DD)
- `sortBy` (opcional): createdAt | updatedAt | price | status (default: createdAt)
- `sortOrder` (opcional): asc | desc (default: desc)

### Exemplos:
```bash
# Corridas em andamento
GET /api/admin/rides?status=in_progress

# Corridas de um motorista específico
GET /api/admin/rides?driverId=clx123...

# Buscar por origem/destino
GET /api/admin/rides?search=Shopping

# Corridas do último mês
GET /api/admin/rides?dateFrom=2025-12-01&dateTo=2026-01-01
```

### Resposta:
```json
{
  "success": true,
  "data": [
    {
      "id": "ride_123",
      "origin": "Shopping Center",
      "destination": "Aeroporto Internacional",
      "status": "in_progress",
      "price": "45.50",
      "cancelReason": null,
      "cancelledBy": null,
      "cancelledAt": null,
      "createdAt": "2026-01-02T10:30:00Z",
      "updatedAt": "2026-01-02T10:45:00Z",
      "driver": {
        "id": "driver_123",
        "name": "João Silva",
        "email": "joao@email.com",
        "phone": "+5511999999999"
      },
      "passenger": {
        "id": "passenger_123",
        "name": "Maria Santos",
        "email": "maria@email.com",
        "phone": "+5511888888888"
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

## 2. Detalhes da Corrida (com timeline)

```http
GET /api/admin/rides/:id
```

### Resposta:
```json
{
  "success": true,
  "data": {
    "id": "ride_123",
    "origin": "Shopping Center",
    "destination": "Aeroporto Internacional",
    "status": "completed",
    "price": "45.50",
    "cancelReason": null,
    "forcedCompletedBy": "admin_456",
    "forcedCompletedAt": "2026-01-02T11:30:00Z",
    "createdAt": "2026-01-02T10:30:00Z",
    "updatedAt": "2026-01-02T11:30:00Z",
    "driver": {
      "id": "driver_123",
      "name": "João Silva",
      "email": "joao@email.com",
      "phone": "+5511999999999"
    },
    "passenger": {
      "id": "passenger_123",
      "name": "Maria Santos",
      "email": "maria@email.com",
      "phone": "+5511888888888"
    },
    "statusHistory": [
      {
        "id": "history_1",
        "status": "requested",
        "createdAt": "2026-01-02T10:30:00Z"
      },
      {
        "id": "history_2",
        "status": "driver_assigned",
        "createdAt": "2026-01-02T10:32:00Z"
      },
      {
        "id": "history_3",
        "status": "in_progress",
        "createdAt": "2026-01-02T10:45:00Z"
      },
      {
        "id": "history_4",
        "status": "completed",
        "createdAt": "2026-01-02T11:30:00Z"
      }
    ],
    "adminActions": [
      {
        "id": "action_1",
        "action": "force_complete",
        "reason": "Passageiro confirmou chegada por telefone",
        "createdAt": "2026-01-02T11:30:00Z"
      }
    ]
  }
}
```

## 3. Cancelar Corrida Administrativamente

```http
PUT /api/admin/rides/:id/cancel
```

### Body:
```json
{
  "reason": "Problema técnico no aplicativo do motorista"
}
```

### Resposta:
```json
{
  "success": true,
  "data": {
    "id": "ride_123",
    "status": "cancelled",
    "cancelReason": "Problema técnico no aplicativo do motorista",
    "cancelledBy": "admin_456",
    "cancelledAt": "2026-01-02T19:21:00Z"
  },
  "message": "Corrida cancelada com sucesso"
}
```

## 4. Reatribuir Motorista

```http
PUT /api/admin/rides/:id/reassign-driver
```

### Body:
```json
{
  "newDriverId": "driver_789",
  "reason": "Motorista original teve problema mecânico"
}
```

### Resposta:
```json
{
  "success": true,
  "data": {
    "id": "ride_123",
    "driverId": "driver_789",
    "status": "driver_assigned"
  },
  "message": "Motorista reatribuído com sucesso"
}
```

## 5. Forçar Finalização de Corrida

```http
PUT /api/admin/rides/:id/force-complete
```

### Body:
```json
{
  "reason": "Passageiro confirmou chegada por telefone, app com problema"
}
```

### Resposta:
```json
{
  "success": true,
  "data": {
    "id": "ride_123",
    "status": "completed",
    "forcedCompletedBy": "admin_456",
    "forcedCompletedAt": "2026-01-02T19:21:00Z"
  },
  "message": "Corrida finalizada com sucesso"
}
```

## Códigos de Erro

- `400`: Dados inválidos ou regra de negócio violada
- `401`: Token JWT inválido ou ausente
- `403`: Sem permissão (role inadequada)
- `404`: Corrida não encontrada
- `500`: Erro interno do servidor

## Regras de Negócio

### Cancelamento:
- Apenas corridas não finalizadas podem ser canceladas
- Motivo é obrigatório
- Registra admin responsável e timestamp

### Reatribuição:
- Apenas corridas não finalizadas podem ser reatribuídas
- Novo motorista deve existir e estar aprovado
- Corrida volta para status `driver_assigned`
- Registra motorista anterior e novo

### Finalização Forçada:
- Apenas corridas não finalizadas podem ser forçadas
- Motivo é obrigatório
- Registra admin responsável e timestamp
- Útil para casos excepcionais (problemas técnicos)

### Auditoria:
- Todas as ações administrativas são registradas
- Histórico de status preservado
- Rastreabilidade completa de mudanças

## Filtros Úteis para Operação

```bash
# Corridas problemáticas (em andamento há mais de 2 horas)
GET /api/admin/rides?status=in_progress&dateFrom=2026-01-02T17:00:00Z

# Corridas canceladas hoje
GET /api/admin/rides?status=cancelled&dateFrom=2026-01-02

# Corridas de motorista específico
GET /api/admin/rides?driverId=driver_123&sortBy=createdAt&sortOrder=desc

# Buscar corridas por região
GET /api/admin/rides?search=Centro&status=in_progress
```
