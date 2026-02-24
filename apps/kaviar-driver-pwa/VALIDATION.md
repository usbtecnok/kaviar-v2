# Validação de Endpoints

Todos os endpoints foram confirmados no código-fonte do backend.

## Método de Validação

```bash
cd ~/kaviar/backend

# 1. Login
rg -n "router\.post.*'/driver/login'" src/routes/driver-auth.ts
# Resultado: linha 19

# 2. Availability
rg -n "router\.post.*'/me/availability'" src/routes/drivers-v2.ts
# Resultado: linha 36

# 3. Location
rg -n "router\.post.*'/me/location'" src/routes/drivers-v2.ts
# Resultado: linha 66

# 4. SSE
rg -n "router\.get.*'/driver'" src/routes/realtime.ts
# Resultado: linha 58

# 5. Accept Offer
rg -n "router\.post.*'/offers/:offer_id/accept'" src/routes/drivers-v2.ts
# Resultado: linha 100

# 6. Montagem das rotas
rg -n "app\.use.*'/api/auth'.*driverAuthRoutes" src/app.ts
# Resultado: linha 279

rg -n "app\.use.*'/api/v2/drivers'.*driversV2Routes" src/app.ts
# Resultado: linha 285

rg -n "app\.use.*'/api/realtime'.*realtimeRoutes" src/app.ts
# Resultado: linha 286
```

## URLs Finais

| Endpoint | URL Completa |
|----------|--------------|
| Login | `POST /api/auth/driver/login` |
| Availability | `POST /api/v2/drivers/me/availability` |
| Location | `POST /api/v2/drivers/me/location` |
| SSE | `GET /api/realtime/driver` |
| Accept | `POST /api/v2/drivers/offers/:offer_id/accept` |

## Autenticação

Todos os endpoints (exceto login) requerem:
```
Authorization: Bearer {token}
```

Confirmado em:
- `backend/src/routes/drivers-v2.ts:10-32` (middleware `requireDriver`)
- `backend/src/routes/realtime.ts:7-28` (middleware `requireDriver`)

## Payloads

### Login
```json
{
  "email": "driver@example.com",
  "password": "senha123"
}
```

### Availability
```json
{
  "availability": "online"
}
```
Valores aceitos: `"online"`, `"offline"`, `"busy"`
(Confirmado em `backend/src/routes/drivers-v2.ts:41`)

### Location
```json
{
  "lat": -23.550520,
  "lng": -46.633308,
  "heading": 90,
  "speed": 30
}
```
(Schema em `backend/src/routes/drivers-v2.ts:66-75`)

### Accept Offer
Sem body, apenas `:offer_id` no path.

## Status: ✅ VALIDADO

Data: 2026-02-19
Método: Busca direta no código-fonte (ripgrep)
Resultado: Todos os endpoints confirmados
