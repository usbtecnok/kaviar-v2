# Evidências - Driver PWA

## Endpoints Confirmados no Código

### 1. Login
**Arquivo:** `backend/src/routes/driver-auth.ts:19`
```
POST /api/auth/driver/login
```
**Montagem:** `backend/src/app.ts:279` → `app.use('/api/auth', driverAuthRoutes)`

### 2. Availability
**Arquivo:** `backend/src/routes/drivers-v2.ts:36`
```
POST /api/v2/drivers/me/availability
Body: { "availability": "online" | "offline" | "busy" }
```
**Montagem:** `backend/src/app.ts:285` → `app.use('/api/v2/drivers', driversV2Routes)`

### 3. Location
**Arquivo:** `backend/src/routes/drivers-v2.ts:66`
```
POST /api/v2/drivers/me/location
Body: { "lat": number, "lng": number, "heading"?: number, "speed"?: number }
```

### 4. Realtime (SSE)
**Arquivo:** `backend/src/routes/realtime.ts:58`
```
GET /api/realtime/driver
Header: Authorization: Bearer {token}
```
**Montagem:** `backend/src/app.ts:286` → `app.use('/api/realtime', realtimeRoutes)`

### 5. Accept Offer
**Arquivo:** `backend/src/routes/drivers-v2.ts:100`
```
POST /api/v2/drivers/offers/:offer_id/accept
```

## Logs Estruturados

Todos os logs usam tags `[PWA_DRIVER_*]`:

- `[PWA_DRIVER_AUTH_LOGIN_START]` - Início do login
- `[PWA_DRIVER_AUTH_LOGIN_SUCCESS]` - Login bem-sucedido
- `[PWA_DRIVER_AUTH_LOGOUT]` - Logout
- `[PWA_DRIVER_GPS_START]` - GPS iniciado
- `[PWA_DRIVER_GPS_UPDATE]` - Localização atualizada
- `[PWA_DRIVER_GPS_SEND]` - Enviando localização ao backend
- `[PWA_DRIVER_GPS_ERROR]` - Erro no GPS
- `[PWA_DRIVER_SSE_CONNECT]` - Conectando ao SSE
- `[PWA_DRIVER_SSE_OFFER_RECEIVED]` - Offer recebida
- `[PWA_DRIVER_SSE_ERROR]` - Erro no SSE
- `[PWA_DRIVER_SSE_DISCONNECT]` - Desconectado do SSE
- `[PWA_DRIVER_AVAILABILITY_TOGGLE]` - Mudando status
- `[PWA_DRIVER_AVAILABILITY_SUCCESS]` - Status alterado
- `[PWA_DRIVER_AVAILABILITY_ERROR]` - Erro ao alterar status
- `[PWA_DRIVER_OFFER_ACCEPT_START]` - Aceitando offer
- `[PWA_DRIVER_OFFER_ACCEPT_SUCCESS]` - Offer aceita
- `[PWA_DRIVER_OFFER_ACCEPT_ERROR]` - Erro ao aceitar
- `[PWA_DRIVER_API_REQUEST]` - Request HTTP
- `[PWA_DRIVER_API_SUCCESS]` - Response HTTP sucesso
- `[PWA_DRIVER_API_ERROR]` - Response HTTP erro
- `[PWA_DRIVER_API_EXCEPTION]` - Exceção na request
- `[PWA_DRIVER_LOGS_EXPORTED]` - Logs exportados

## Como Coletar Evidências

### 1. Durante Teste Manual

1. Abrir DevTools → Console
2. Filtrar por `PWA_DRIVER`
3. Executar fluxo completo
4. Clicar no botão "📥 Logs" no app
5. Salvar arquivo JSON em `docs/evidencias/`

### 2. CloudWatch (Produção)

```bash
# Filtrar logs do driver PWA
aws logs filter-log-events \
  --log-group-name /aws/lambda/kaviar-api \
  --filter-pattern "[PWA_DRIVER" \
  --start-time $(date -d '1 hour ago' +%s)000
```

### 3. Validar no Backend

```bash
# Login events
rg "driver/login" backend/logs/

# GPS updates
rg "me/location" backend/logs/

# Offer accepts
rg "offers/.*/accept" backend/logs/
```

## Formato de Log

```json
{
  "timestamp": "2026-02-19T21:07:00.000Z",
  "tag": "[PWA_DRIVER_API_REQUEST]",
  "message": "POST /api/v2/drivers/me/availability",
  "requestId": 1708380420000,
  "body": {
    "availability": "online"
  }
}
```

## Checklist de Teste

- [ ] Login com credenciais válidas
- [ ] Token salvo no localStorage
- [ ] Toggle Online → ONLINE
- [ ] GPS capturado e exibido
- [ ] GPS enviado a cada 10s (verificar logs)
- [ ] SSE conectado (verificar Network → EventStream)
- [ ] Offer recebida via SSE
- [ ] Accept offer → sucesso
- [ ] Download de logs funcionando
- [ ] Logout limpa token

## Segurança

- ✅ Token nunca aparece nos logs
- ✅ Password nunca aparece nos logs
- ✅ Apenas payloads de request/response (sem headers sensíveis)
- ✅ Logs limitados a 100 entradas (evita memory leak)
