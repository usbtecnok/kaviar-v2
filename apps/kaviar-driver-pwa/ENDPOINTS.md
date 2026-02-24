# Endpoints Reais do Backend

Mapeamento dos endpoints usados pelo Driver PWA.

## 🔐 Auth

### Login Driver
```http
POST /api/auth/driver/login
Content-Type: application/json

{
  "email": "driver@example.com",
  "password": "senha123"
}
```

**Response:**
```json
{
  "token": "eyJhbGc...",
  "user": {
    "id": "driver-uuid",
    "name": "João Silva",
    "email": "driver@example.com",
    "status": "approved"
  }
}
```

## 🚗 Driver Operations

### Set Availability (Online/Offline)
```http
POST /api/v2/drivers/me/availability
Authorization: Bearer {token}
Content-Type: application/json

{
  "availability": "online"  // "online" | "offline" | "busy"
}
```

**Response:**
```json
{
  "success": true
}
```

### Update Location (GPS)
```http
POST /api/v2/drivers/me/location
Authorization: Bearer {token}
Content-Type: application/json

{
  "lat": -23.550520,
  "lng": -46.633308,
  "heading": 90,    // opcional
  "speed": 30       // opcional
}
```

**Response:**
```json
{
  "success": true
}
```

## 📡 Realtime (SSE)

### Connect to Driver Channel
```http
GET /api/realtime/driver
Authorization: Bearer {token}
```

**Response:** SSE stream

**Events:**
```
event: offer
data: {"id":"offer-123","pickup":"Rua A","dropoff":"Rua B"}
```

## 🎯 Offers

### Accept Offer
```http
POST /api/v2/drivers/offers/:offer_id/accept
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "ride_id": "ride-uuid"
  }
}
```

## 📝 Notas

- Todos os endpoints (exceto login) requerem `Authorization: Bearer {token}`
- Token JWT expira em 24h
- SSE usa Bearer token no header (não query string)
- Availability aceita 3 valores: `online`, `offline`, `busy`
- Location aceita campos opcionais `heading` e `speed`


### Password Reset
```http
POST /api/admin/auth/forgot-password
Content-Type: application/json

{
  "email": "driver@example.com",
  "userType": "driver"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Se o email existir, você receberá instruções para redefinir sua senha."
}
```

**Nota:** Por segurança, sempre retorna sucesso (não revela se email existe).

### Driver Onboarding (Signup)
```http
POST /api/driver/onboarding
Content-Type: application/json

{
  "name": "João Silva",
  "email": "joao@example.com",
  "phone": "21987654321",
  "password": "senha123",
  "neighborhoodId": "neighborhood-uuid",
  "communityId": "community-uuid-or-slug",
  "familyBonusAccepted": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cadastro realizado com sucesso",
  "data": {
    "id": "driver-123",
    "name": "João Silva",
    "email": "joao@example.com",
    "status": "pending"
  }
}
```

**Nota:** Driver criado com status `pending` (aguarda aprovação admin).

## 📱 WhatsApp Fallback

Se feature flags estiverem desabilitadas (`VITE_FEATURE_PASSWORD_RESET=false` ou `VITE_FEATURE_DRIVER_SIGNUP=false`), os botões abrem WhatsApp:

**Número:** +55 21 98066-9989

**Mensagens:**
- **Password Reset:** "Olá! Preciso resetar minha senha no KAVIAR Driver. Email: {email}. Por favor, me ajude a recuperar o acesso."
- **Solicitar Acesso:** "Olá! Quero acesso ao KAVIAR Driver. Nome: {nome}. Email: {email}. Telefone: {tel}. Preciso criar minha conta."
