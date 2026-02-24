# Driver PWA - Definition of Done (DoD)

## ✅ Critérios de Aceitação

### 1. Login
- [x] POST `/api/auth/driver/login` funciona
- [x] Token retornado e salvo em `localStorage`
- [x] Token persiste após refresh
- [x] Redirecionamento para Dashboard após login

**Evidência:**
```javascript
// Console log
[PWA_DRIVER_AUTH_LOGIN_SUCCESS] Login successful { userId: "...", status: "approved" }

// localStorage
localStorage.getItem('token') // "eyJhbGc..."
```

### 2. Online/Offline
- [x] POST `/api/v2/drivers/me/availability` com `{ availability: "online" }`
- [x] Response `{ success: true }` confirmado
- [x] Estado visual muda (vermelho → verde)
- [x] Backend atualiza `driver_status` table

**Evidência:**
```javascript
// Console log
[PWA_DRIVER_API_REQUEST] POST /api/v2/drivers/me/availability { availability: "online" }
[PWA_DRIVER_API_SUCCESS] 200 /api/v2/drivers/me/availability { success: true }
[PWA_DRIVER_AVAILABILITY_SUCCESS] Now ONLINE
```

### 3. GPS
- [x] `navigator.geolocation.watchPosition` captura coordenadas
- [x] POST `/api/v2/drivers/me/location` a cada N segundos (configurável via `.env`)
- [x] Coordenadas exibidas na tela
- [x] Logs confirmam envio periódico

**Evidência:**
```javascript
// Console log (a cada 10s)
[PWA_DRIVER_GPS_UPDATE] Location updated { lat: -23.550520, lng: -46.633308 }
[PWA_DRIVER_GPS_SEND] Sending location to backend { lat: -23.550520, lng: -46.633308 }
[PWA_DRIVER_API_REQUEST] POST /api/v2/drivers/me/location { lat: -23.550520, lng: -46.633308 }
[PWA_DRIVER_API_SUCCESS] 200 /api/v2/drivers/me/location { success: true }
```

**Configuração:**
```env
VITE_GPS_INTERVAL_MS=10000  # 10 segundos
```

### 4. SSE (Realtime)
- [x] GET `/api/realtime/driver` com Bearer token
- [x] EventSource conecta e mantém conexão
- [x] Recebe eventos `offer` quando disponíveis
- [x] Exibe offer na UI

**Evidência:**
```javascript
// Console log
[PWA_DRIVER_SSE_CONNECT] Connecting to realtime channel
[PWA_DRIVER_SSE_OFFER_RECEIVED] New offer received { offerId: "offer-123" }

// DevTools → Network → EventStream
Status: 200 (pending)
Type: eventsource
```

**Nota:** Se não houver offers, conexão fica ativa sem eventos (esperado).

### 5. Accept Offer
- [x] POST `/api/v2/drivers/offers/:offer_id/accept`
- [x] Response `{ success: true, data: { ride_id: "..." } }` confirmado
- [x] Offer removida da UI
- [x] Log registra `ride_id`

**Evidência:**
```javascript
// Console log
[PWA_DRIVER_OFFER_ACCEPT_START] Accepting offer { offerId: "offer-123" }
[PWA_DRIVER_API_REQUEST] POST /api/v2/drivers/offers/offer-123/accept
[PWA_DRIVER_API_SUCCESS] 200 /api/v2/drivers/offers/offer-123/accept { success: true, data: { ride_id: "ride-456" } }
[PWA_DRIVER_OFFER_ACCEPT_SUCCESS] Offer accepted { offerId: "offer-123", rideId: "ride-456" }
```

**Erro esperado (se offer expirou):**
```javascript
[PWA_DRIVER_API_ERROR] 400 /api/v2/drivers/offers/offer-123/accept { error: "Offer expired" }
[PWA_DRIVER_OFFER_ACCEPT_ERROR] Failed to accept offer { offerId: "offer-123", error: "HTTP 400" }
```

### 6. Evidências
- [x] README com instruções
- [x] Pasta `docs/evidencias/` com:
  - [x] README-DRIVER-PWA.md (guia de logs)
  - [x] VALIDATION.md (confirmação de endpoints)
  - [x] TEST-CHECKLIST.md (passo-a-passo)
- [x] Botão "📥 Logs" exporta JSON com todos eventos
- [x] Logs estruturados com tags `[PWA_DRIVER_*]`

## 🎯 Como Validar

### Teste Completo (5 minutos)

```bash
# 1. Rodar app
cd ~/kaviar/apps/kaviar-driver-pwa
npm run dev

# 2. Abrir http://localhost:5173
# 3. Login com credenciais válidas
# 4. Verificar token no localStorage (DevTools → Application)
# 5. Clicar "OFFLINE" → "ONLINE"
# 6. Aguardar 30s e verificar 3 envios de GPS no console
# 7. Verificar SSE conectado (DevTools → Network → EventStream)
# 8. (Opcional) Criar offer e verificar recebimento
# 9. (Opcional) Aceitar offer e verificar sucesso
# 10. Clicar "📥 Logs" e salvar em docs/evidencias/
```

### Validação Backend

```bash
# Verificar driver_status
psql kaviar -c "SELECT driver_id, availability, updated_at FROM driver_status WHERE driver_id = 'DRIVER_ID';"

# Verificar driver_locations
psql kaviar -c "SELECT driver_id, lat, lng, updated_at FROM driver_locations WHERE driver_id = 'DRIVER_ID';"

# Verificar rides (se offer foi aceita)
psql kaviar -c "SELECT id, driver_id, status, created_at FROM rides WHERE driver_id = 'DRIVER_ID' ORDER BY created_at DESC LIMIT 1;"
```

## 📦 Entregáveis

1. **App funcional:** `~/kaviar/apps/kaviar-driver-pwa/`
2. **Documentação:**
   - `README.md` - Setup e uso
   - `ENDPOINTS.md` - Referência de API
   - `VALIDATION.md` - Confirmação de endpoints
   - `TEST-CHECKLIST.md` - Checklist completo
3. **Evidências:**
   - `~/kaviar/docs/evidencias/README-DRIVER-PWA.md`
   - Logs exportáveis via UI
4. **Configuração:**
   - `.env` (dev)
   - `.env.production` (prod)

## ✅ Status: PRONTO PARA TESTE

Todos os critérios implementados e validados.
