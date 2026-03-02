# 📋 CONTRATO DE API - ADMIN & PUBLIC

**Data:** 01/03/2026 22:15 BRT  
**Objetivo:** Documento único e definitivo de endpoints (Admin, Public, Passenger, Driver)

---

## 🔐 AUTENTICAÇÃO E ROLES

### **Tipos de Token**

| Tipo | Header | Formato | Uso |
|------|--------|---------|-----|
| **Admin** | `Authorization: Bearer <token>` | JWT com `role` (SUPER_ADMIN/OPERATOR) | Endpoints `/api/admin/*` e `/api/governance/*` |
| **Driver** | `Authorization: Bearer <token>` | JWT com `driverId` | Endpoints `/api/driver/*` e `/api/rides-v2/*` |
| **Passenger** | `Authorization: Bearer <token>` | JWT com `passengerId` | Endpoints `/api/passenger/*` e `/api/rides-v2/*` |
| **Público** | Nenhum | N/A | Endpoints `/api/public/*` e `/api/governance/tour-packages` |

### **Roles Admin**

| Role | Permissões | Middleware |
|------|------------|------------|
| **SUPER_ADMIN** | Leitura + Escrita (CRUD completo) | `requireSuperAdmin` |
| **OPERATOR** | Apenas leitura | `allowReadAccess` |

### **Middlewares**

**Arquivo:** `/backend/src/middlewares/auth.ts`

```typescript
// Verifica se é admin (qualquer role)
export const authenticateAdmin = async (req, res, next) => {
  // Valida JWT token
  // Verifica se user.role existe (SUPER_ADMIN ou OPERATOR)
};

// Requer SUPER_ADMIN
export const requireSuperAdmin = async (req, res, next) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

// Permite leitura (SUPER_ADMIN ou OPERATOR)
export const allowReadAccess = async (req, res, next) => {
  if (!['SUPER_ADMIN', 'OPERATOR'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};
```

---

## 🔴 ENDPOINTS ADMIN

### **1. MOTORISTAS**

| Endpoint | Método | Token/Role | Middleware | Arquivo Backend | Arquivo Frontend |
|----------|--------|------------|------------|-----------------|------------------|
| `/api/admin/drivers` | GET | Admin (SUPER_ADMIN/OPERATOR) | `authenticateAdmin` + `allowReadAccess` | `admin-drivers.ts:78` | `DriversList.jsx:31` |
| `/api/admin/drivers/:id` | GET | Admin (SUPER_ADMIN/OPERATOR) | `authenticateAdmin` + `allowReadAccess` | `admin-drivers.ts:159` | `DriverDetail.jsx:87` |
| `/api/admin/drivers/:id/documents` | GET | Admin (SUPER_ADMIN/OPERATOR) | `authenticateAdmin` + `allowReadAccess` | `admin-drivers.ts:240` | `DriverDetail.jsx:113` |
| `/api/admin/drivers/:id/approve` | POST | Admin (SUPER_ADMIN) | `authenticateAdmin` + `requireSuperAdmin` | `admin-approval.ts:15` | `DriverDetail.jsx:126` |
| `/api/admin/drivers/:id/reject` | POST | Admin (SUPER_ADMIN) | `authenticateAdmin` + `requireSuperAdmin` | `admin-approval.ts:16` | `DriverDetail.jsx:144` |
| `/api/admin/drivers/:id/credits/balance` | GET | Admin (SUPER_ADMIN/OPERATOR) | `authenticateAdmin` + `allowReadAccess` | `admin-driver-credits.ts:64` | `DriverCreditsCard.jsx:47` |
| `/api/admin/drivers/:id/credits/adjust` | POST | Admin (SUPER_ADMIN) | `authenticateAdmin` + `requireSuperAdmin` | `admin-driver-credits.ts:119` | `DriverCreditsCard.jsx:86` |
| `/api/admin/drivers/:id/premium-eligibility` | GET | Admin (SUPER_ADMIN/OPERATOR) | `authenticateAdmin` + `allowReadAccess` | `admin-drivers.ts:430` | N/A |
| `/api/admin/drivers/:id/promote-premium-tourism` | PATCH | Admin (SUPER_ADMIN) | `authenticateAdmin` + `requireSuperAdmin` | `admin-drivers.ts:554` | N/A |

**Exemplo cURL - Listar Motoristas:**

```bash
curl -X GET "http://localhost:3000/api/admin/drivers?status=pending&page=1&limit=20" \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json"
```

**Resposta:**

```json
{
  "drivers": [
    {
      "id": "driver_123",
      "name": "João Silva",
      "email": "joao@example.com",
      "phone": "+5511999999999",
      "status": "pending",
      "created_at": "2026-03-01T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 45,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

---

### **2. PASSAGEIROS**

| Endpoint | Método | Token/Role | Middleware | Arquivo Backend | Arquivo Frontend |
|----------|--------|------------|------------|-----------------|------------------|
| `/api/admin/passengers` | GET | Admin (SUPER_ADMIN/OPERATOR) | `authenticateAdmin` + `allowReadAccess` | `admin.ts:45` | N/A |
| `/api/admin/passengers/:id` | GET | Admin (SUPER_ADMIN/OPERATOR) | `authenticateAdmin` + `allowReadAccess` | `admin.ts:87` | N/A |
| `/api/admin/passengers/:id/favorites` | GET | Admin (SUPER_ADMIN/OPERATOR) | `authenticateAdmin` + `allowReadAccess` | `admin.ts:154` | N/A |

---

### **3. CORRIDAS**

| Endpoint | Método | Token/Role | Middleware | Arquivo Backend | Arquivo Frontend |
|----------|--------|------------|------------|-----------------|------------------|
| `/api/admin/rides` | GET | Admin (SUPER_ADMIN/OPERATOR) | `authenticateAdmin` + `allowReadAccess` | `admin.ts:123` | N/A |
| `/api/admin/rides/:id` | GET | Admin (SUPER_ADMIN/OPERATOR) | `authenticateAdmin` + `allowReadAccess` | `admin.ts:126` | N/A |
| `/api/admin/rides/:id/status` | PATCH | Admin (SUPER_ADMIN) | `authenticateAdmin` + `requireSuperAdmin` | `admin.ts:129` | N/A |
| `/api/admin/rides/:id/cancel` | POST | Admin (SUPER_ADMIN) | `authenticateAdmin` + `requireSuperAdmin` | `admin.ts:132` | N/A |
| `/api/admin/rides/:id/force-complete` | POST | Admin (SUPER_ADMIN) | `authenticateAdmin` + `requireSuperAdmin` | `admin.ts:135` | N/A |

**Exemplo cURL - Detalhes de Corrida:**

```bash
curl -X GET "http://localhost:3000/api/admin/rides/ride_abc123" \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json"
```

---

### **4. COMUNIDADES (GOVERNANCE)**

| Endpoint | Método | Token/Role | Middleware | Arquivo Backend | Arquivo Frontend |
|----------|--------|------------|------------|-----------------|------------------|
| `/api/governance/communities` | GET | Admin (SUPER_ADMIN/OPERATOR) | `authenticateAdmin` + `requireRole` | `governance.ts:151` | `CommunitiesManagement.jsx:51` |
| `/api/governance/communities/:id/geofence` | GET | Admin (SUPER_ADMIN/OPERATOR) | `authenticateAdmin` + `requireRole` | Via public route | `CommunitiesManagement.jsx:170` |

**Exemplo cURL - Listar Comunidades:**

```bash
curl -X GET "http://localhost:3000/api/governance/communities" \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json"
```

**Resposta:**

```json
{
  "communities": [
    {
      "id": "comm_001",
      "name": "Rocinha",
      "city": "Rio de Janeiro",
      "state": "RJ",
      "active": true,
      "created_at": "2026-01-15T10:00:00Z"
    }
  ]
}
```

---

### **5. GEOFENCES (GOVERNANCE)**

| Endpoint | Método | Token/Role | Middleware | Arquivo Backend | Arquivo Frontend |
|----------|--------|------------|------------|-----------------|------------------|
| `/api/governance/neighborhoods` | GET | Admin (SUPER_ADMIN/OPERATOR) | `authenticateAdmin` + `requireRole` | `governance.ts:175` | `NeighborhoodsByCity.jsx:36` |
| `/api/governance/neighborhoods/:id/geofence` | GET | Admin (SUPER_ADMIN/OPERATOR) | `authenticateAdmin` + `requireRole` | `governance.ts:432` | N/A |

**Exemplo cURL - Listar Bairros:**

```bash
curl -X GET "http://localhost:3000/api/governance/neighborhoods?city=Rio+de+Janeiro" \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json"
```

---

### **6. TURISMO PREMIUM (ADMIN)**

| Endpoint | Método | Token/Role | Middleware | Arquivo Backend | Arquivo Frontend |
|----------|--------|------------|------------|-----------------|------------------|
| `/api/admin/tour-packages` | GET | Admin (SUPER_ADMIN/OPERATOR) | `authenticateAdmin` + `allowReadAccess` | `premium-tourism.ts:30` | N/A |
| `/api/admin/tour-packages` | POST | Admin (SUPER_ADMIN) | `authenticateAdmin` + `requireSuperAdmin` | `premium-tourism.ts:29` | N/A |
| `/api/admin/tour-packages/:id` | GET | Admin (SUPER_ADMIN/OPERATOR) | `authenticateAdmin` + `allowReadAccess` | `premium-tourism.ts:31` | N/A |
| `/api/admin/tour-packages/:id` | PUT | Admin (SUPER_ADMIN) | `authenticateAdmin` + `requireSuperAdmin` | `premium-tourism.ts:32` | N/A |
| `/api/admin/tour-packages/:id/deactivate` | PATCH | Admin (SUPER_ADMIN) | `authenticateAdmin` + `requireSuperAdmin` | `premium-tourism.ts:33` | N/A |
| `/api/admin/tour-bookings` | GET | Admin (SUPER_ADMIN/OPERATOR) | `authenticateAdmin` + `allowReadAccess` | `premium-tourism.ts:36` | N/A |
| `/api/admin/tour-bookings/:id/confirm` | POST | Admin (SUPER_ADMIN) | `authenticateAdmin` + `requireSuperAdmin` | `premium-tourism.ts:37` | N/A |
| `/api/admin/tour-bookings/:id/status` | PATCH | Admin (SUPER_ADMIN) | `authenticateAdmin` + `requireSuperAdmin` | `premium-tourism.ts:38` | N/A |

**Exemplo cURL - Criar Pacote de Turismo:**

```bash
curl -X POST "http://localhost:3000/api/admin/tour-packages" \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tour Cristo Redentor",
    "description": "Visita guiada ao Cristo Redentor",
    "duration_hours": 4,
    "price": 250.00,
    "max_passengers": 4,
    "city": "Rio de Janeiro",
    "active": true
  }'
```

---

### **7. DASHBOARD & MÉTRICAS**

| Endpoint | Método | Token/Role | Middleware | Arquivo Backend | Arquivo Frontend |
|----------|--------|------------|------------|-----------------|------------------|
| `/api/admin/dashboard/overview` | GET | Admin (SUPER_ADMIN/OPERATOR) | `authenticateAdmin` + `allowReadAccess` | `dashboard.ts` | `NeighborhoodsByCity.jsx:84` |
| `/api/admin/presign` | GET | Admin (SUPER_ADMIN/OPERATOR) | `authenticateAdmin` + `allowReadAccess` | `admin-presign.ts` | `DriverDetail.jsx:260` |

---

## 🟢 ENDPOINTS PÚBLICOS

### **1. TURISMO PREMIUM (PÚBLICO)**

| Endpoint | Método | Token/Role | Middleware | Arquivo Backend | Arquivo Frontend |
|----------|--------|------------|------------|-----------------|------------------|
| `/api/governance/tour-packages` | GET | Público (sem token) | `requirePremiumTourismEnabled` | `premium-tourism.ts:58` + `tour-controller.ts:8` | N/A |
| `/api/governance/tour-bookings` | POST | Público (sem token) | `requirePremiumTourismEnabled` | `premium-tourism.ts:59` + `tour-controller.ts:27` | N/A |

**Exemplo cURL - Listar Pacotes Ativos (Público):**

```bash
curl -X GET "http://localhost:3000/api/governance/tour-packages" \
  -H "Content-Type: application/json"
```

**Resposta:**

```json
{
  "success": true,
  "packages": [
    {
      "id": "pkg_001",
      "name": "Tour Cristo Redentor",
      "description": "Visita guiada ao Cristo Redentor",
      "duration_hours": 4,
      "price": "250.00",
      "max_passengers": 4,
      "city": "Rio de Janeiro",
      "active": true,
      "created_at": "2026-02-15T10:00:00Z"
    }
  ]
}
```

**Exemplo cURL - Criar Reserva (Público):**

```bash
curl -X POST "http://localhost:3000/api/governance/tour-bookings" \
  -H "Content-Type: application/json" \
  -d '{
    "package_id": "pkg_001",
    "passenger_name": "Maria Santos",
    "passenger_email": "maria@example.com",
    "passenger_phone": "+5521999999999",
    "pickup_location": {
      "lat": -22.9068,
      "lng": -43.1729,
      "address": "Copacabana, Rio de Janeiro"
    },
    "scheduled_date": "2026-03-15T09:00:00Z",
    "num_passengers": 2
  }'
```

**Resposta:**

```json
{
  "success": true,
  "booking": {
    "id": "booking_001",
    "package_id": "pkg_001",
    "status": "pending",
    "scheduled_date": "2026-03-15T09:00:00Z",
    "created_at": "2026-03-01T22:00:00Z"
  },
  "premiumDriversAvailable": 3,
  "message": "Booking created successfully"
}
```

---

### **2. GEOLOCALIZAÇÃO**

| Endpoint | Método | Token/Role | Middleware | Arquivo Backend | Arquivo Frontend |
|----------|--------|------------|------------|-----------------|------------------|
| `/api/public/neighborhoods/:id/geofence` | GET | Público (sem token) | Nenhum | `public.ts` | N/A |
| `/api/geo/reverse` | POST | Público (sem token) | Nenhum | `geo.ts` | N/A |

---

### **3. HEALTH CHECK**

| Endpoint | Método | Token/Role | Middleware | Arquivo Backend | Arquivo Frontend |
|----------|--------|------------|------------|-----------------|------------------|
| `/health` | GET | Público (sem token) | Nenhum | `app.ts` | N/A |
| `/api/health` | GET | Público (sem token) | Nenhum | `premium-tourism.ts:68` | N/A |

**Exemplo cURL - Health Check:**

```bash
curl -X GET "http://localhost:3000/health"
```

**Resposta:**

```json
{
  "status": "ok",
  "timestamp": "2026-03-01T22:15:00Z",
  "uptime": 3600,
  "database": "connected"
}
```

---

## 🔵 ENDPOINTS PASSENGER

### **1. CORRIDAS**

| Endpoint | Método | Token/Role | Middleware | Arquivo Backend | Arquivo Frontend |
|----------|--------|------------|------------|-----------------|------------------|
| `/api/rides-v2` | POST | Passenger | `requirePassenger` | `rides-v2.ts:62` | N/A |
| `/api/rides-v2/:ride_id/cancel` | POST | Passenger | `requirePassenger` | `rides-v2.ts:115` | N/A |

**Exemplo cURL - Solicitar Corrida:**

```bash
curl -X POST "http://localhost:3000/api/rides-v2" \
  -H "Authorization: Bearer <PASSENGER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "pickup": {
      "lat": -22.9068,
      "lng": -43.1729,
      "address": "Copacabana, Rio de Janeiro"
    },
    "dropoff": {
      "lat": -22.9519,
      "lng": -43.2105,
      "address": "Ipanema, Rio de Janeiro"
    },
    "fare_amount": 25.00
  }'
```

---

### **2. CADASTRO & CONSENTIMENTO**

| Endpoint | Método | Token/Role | Middleware | Arquivo Backend | Arquivo Frontend |
|----------|--------|------------|------------|-----------------|------------------|
| `/api/governance/passenger` | POST | Admin (SUPER_ADMIN/OPERATOR) | `authenticateAdmin` + `requireRole` | `governance.ts:60` | N/A |
| `/api/governance/consent` | POST | Admin (SUPER_ADMIN/OPERATOR) | `authenticateAdmin` + `requireRole` | `governance.ts:113` | N/A |

---

## 🟡 ENDPOINTS DRIVER

### **1. CORRIDAS**

| Endpoint | Método | Token/Role | Middleware | Arquivo Backend | Arquivo Frontend |
|----------|--------|------------|------------|-----------------|------------------|
| `/api/rides/:id/accept` | PUT | Driver | `authenticateDriver` | `rides.ts:156` | N/A |
| `/api/rides/:id/complete` | PUT | Driver | `authenticateDriver` | `rides.ts:213` | N/A |
| `/api/rides-v2/:ride_id/arrived` | POST | Driver | `requireDriver` | `rides-v2.ts:169` | N/A |
| `/api/rides-v2/:ride_id/start` | POST | Driver | `requireDriver` | `rides-v2.ts:202` | N/A |
| `/api/rides-v2/:ride_id/complete` | POST | Driver | `requireDriver` | `rides-v2.ts:235` | N/A |

**Exemplo cURL - Aceitar Corrida:**

```bash
curl -X PUT "http://localhost:3000/api/rides/ride_abc123/accept" \
  -H "Authorization: Bearer <DRIVER_TOKEN>" \
  -H "Content-Type: application/json"
```

---

### **2. CADASTRO & DASHBOARD**

| Endpoint | Método | Token/Role | Middleware | Arquivo Backend | Arquivo Frontend |
|----------|--------|------------|------------|-----------------|------------------|
| `/api/governance/driver` | POST | Admin (SUPER_ADMIN/OPERATOR) | `authenticateAdmin` + `requireRole` | `governance.ts:237` | N/A |
| `/api/driver/dashboard` | GET | Driver | `authenticateDriver` | `driver-dashboard.ts` | N/A |

---

## 📊 RESUMO POR MÓDULO

### **ADMIN**

| Módulo | Endpoints | Token Required | Roles |
|--------|-----------|----------------|-------|
| Motoristas | 9 | ✅ Admin | SUPER_ADMIN (escrita) / OPERATOR (leitura) |
| Passageiros | 3 | ✅ Admin | SUPER_ADMIN (escrita) / OPERATOR (leitura) |
| Corridas | 5 | ✅ Admin | SUPER_ADMIN (escrita) / OPERATOR (leitura) |
| Comunidades | 2 | ✅ Admin | SUPER_ADMIN / OPERATOR |
| Geofences | 2 | ✅ Admin | SUPER_ADMIN / OPERATOR |
| Turismo Premium | 8 | ✅ Admin | SUPER_ADMIN (escrita) / OPERATOR (leitura) |
| Dashboard | 2 | ✅ Admin | SUPER_ADMIN / OPERATOR |

### **PÚBLICO**

| Módulo | Endpoints | Token Required | Roles |
|--------|-----------|----------------|-------|
| Turismo Premium | 2 | ❌ Não | N/A |
| Geolocalização | 2 | ❌ Não | N/A |
| Health Check | 2 | ❌ Não | N/A |

### **PASSENGER**

| Módulo | Endpoints | Token Required | Roles |
|--------|-----------|----------------|-------|
| Corridas | 2 | ✅ Passenger | N/A |
| Cadastro | 2 | ✅ Admin (via governance) | SUPER_ADMIN / OPERATOR |

### **DRIVER**

| Módulo | Endpoints | Token Required | Roles |
|--------|-----------|----------------|-------|
| Corridas | 5 | ✅ Driver | N/A |
| Cadastro | 1 | ✅ Admin (via governance) | SUPER_ADMIN / OPERATOR |
| Dashboard | 1 | ✅ Driver | N/A |

---

## 🔍 VALIDAÇÃO RÁPIDA

### **1. Testar Health Check (Público)**

```bash
curl -X GET "http://localhost:3000/health"
```

**Esperado:** `{"status":"ok"}`

---

### **2. Testar Comunidades (Admin)**

```bash
curl -X GET "http://localhost:3000/api/governance/communities" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

**Esperado:** Lista de comunidades

---

### **3. Testar Geofences (Admin)**

```bash
curl -X GET "http://localhost:3000/api/governance/neighborhoods?city=Rio+de+Janeiro" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

**Esperado:** Lista de bairros do Rio de Janeiro

---

### **4. Testar Pacotes de Turismo (Público)**

```bash
curl -X GET "http://localhost:3000/api/governance/tour-packages"
```

**Esperado:** Lista de pacotes ativos

---

### **5. Testar Motoristas (Admin)**

```bash
curl -X GET "http://localhost:3000/api/admin/drivers?status=pending" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

**Esperado:** Lista de motoristas pendentes

---

### **6. Testar Corridas (Admin)**

```bash
curl -X GET "http://localhost:3000/api/admin/rides" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

**Esperado:** Lista de corridas

---

## 📝 NOTAS IMPORTANTES

### **1. Turismo Premium - Admin vs Público**

**ADMIN (CRUD completo):**
- Path: `/api/admin/tour-packages`
- Token: Admin (SUPER_ADMIN para escrita, OPERATOR para leitura)
- Operações: GET, POST, PUT, PATCH (deactivate)
- Arquivo: `backend/src/routes/premium-tourism.ts:29-33`

**PÚBLICO (Consulta e reserva):**
- Path: `/api/governance/tour-packages`
- Token: Nenhum (público)
- Operações: GET (listar ativos), POST (criar reserva via `/api/governance/tour-bookings`)
- Arquivo: `backend/src/routes/premium-tourism.ts:58-59` + `backend/src/modules/governance/tour-controller.ts`

**Middleware de Feature Flag:**
- Ambos (admin e público) exigem `requirePremiumTourismEnabled`
- Verifica se feature flag `premium_tourism` está ativa no banco

---

### **2. Governance Routes - SEMPRE Admin**

**IMPORTANTE:** Todas as rotas `/api/governance/*` (exceto tour-packages público) exigem token admin.

**Arquivo:** `backend/src/routes/governance.ts:1-35`

```typescript
router.use(authenticateAdmin);
router.use(requireRole(['SUPER_ADMIN','OPERATOR']));
```

**Rotas afetadas:**
- `/api/governance/passenger` (POST)
- `/api/governance/consent` (POST)
- `/api/governance/communities` (GET)
- `/api/governance/neighborhoods` (GET)
- `/api/governance/driver` (POST)
- `/api/governance/guide` (POST)

**Exceção:** `/api/governance/tour-packages` (GET) e `/api/governance/tour-bookings` (POST) são públicos (montados via `governanceRouter` sem middleware de auth).

---

### **3. Diferença entre /api/admin/* e /api/governance/*

**`/api/admin/*`:**
- CRUD de recursos (motoristas, passageiros, corridas, pacotes de turismo)
- Operações administrativas (aprovar, rejeitar, ajustar créditos)
- Dashboard e métricas

**`/api/governance/*`:**
- Cadastro de entidades (motorista, passageiro, guia)
- Consulta de comunidades e bairros
- Consentimento LGPD
- Turismo Premium (público)

---

## 🎯 PRÓXIMOS PASSOS

1. ✅ Documento consolidado criado
2. ⏳ Commit + push para repositório
3. ⏳ Validação com comandos curl

---

**FIM DO CONTRATO DE API**
