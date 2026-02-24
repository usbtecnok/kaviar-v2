# Evidência de Teste - Driver PWA

**Data:** YYYY-MM-DD HH:MM  
**Testador:** Nome  
**Ambiente:** Local / Staging / Production  
**Backend URL:** http://localhost:3000 ou https://api.kaviar.com  

---

## 1. Login

**Credenciais usadas:**
- Email: `driver@example.com`
- Password: `***` (não registrar)

**Resultado:**
- [ ] ✅ Login bem-sucedido
- [ ] ❌ Erro: _descrever_

**Token recebido:** `eyJhbGc...` (primeiros 20 chars)

**Logs relevantes:**
```
[PWA_DRIVER_AUTH_LOGIN_START] Attempting login { email: "driver@example.com" }
[PWA_DRIVER_API_REQUEST] POST /api/auth/driver/login
[PWA_DRIVER_API_SUCCESS] 200 /api/auth/driver/login { token: "...", user: {...} }
[PWA_DRIVER_AUTH_LOGIN_SUCCESS] Login successful { userId: "abc-123", status: "approved" }
```

---

## 2. Online/Offline

**Ação:** Clicar em "OFFLINE" → "ONLINE"

**Resultado:**
- [ ] ✅ Mudou para verde
- [ ] ✅ Backend confirmou (response success: true)
- [ ] ❌ Erro: _descrever_

**Logs relevantes:**
```
[PWA_DRIVER_AVAILABILITY_TOGGLE] Changing to ONLINE
[PWA_DRIVER_API_REQUEST] POST /api/v2/drivers/me/availability { availability: "online" }
[PWA_DRIVER_API_SUCCESS] 200 /api/v2/drivers/me/availability { success: true }
[PWA_DRIVER_AVAILABILITY_SUCCESS] Now ONLINE
```

**Validação backend:**
```sql
SELECT availability FROM driver_status WHERE driver_id = 'abc-123';
-- Resultado: online
```

---

## 3. GPS

**Intervalo configurado:** 10000ms (10s)

**Coordenadas capturadas:**
- Lat: -23.550520
- Lng: -46.633308

**Resultado:**
- [ ] ✅ GPS capturado
- [ ] ✅ Enviado 3x em 30s
- [ ] ❌ Erro: _descrever_

**Logs relevantes (3 ciclos):**
```
[PWA_DRIVER_GPS_UPDATE] Location updated { lat: -23.550520, lng: -46.633308 }
[PWA_DRIVER_GPS_SEND] Sending location to backend { lat: -23.550520, lng: -46.633308 }
[PWA_DRIVER_API_SUCCESS] 200 /api/v2/drivers/me/location { success: true }

(10s depois)
[PWA_DRIVER_GPS_SEND] Sending location to backend { lat: -23.550521, lng: -46.633309 }
[PWA_DRIVER_API_SUCCESS] 200 /api/v2/drivers/me/location { success: true }

(10s depois)
[PWA_DRIVER_GPS_SEND] Sending location to backend { lat: -23.550522, lng: -46.633310 }
[PWA_DRIVER_API_SUCCESS] 200 /api/v2/drivers/me/location { success: true }
```

**Validação backend:**
```sql
SELECT lat, lng, updated_at FROM driver_locations WHERE driver_id = 'abc-123';
-- Resultado: -23.550522, -46.633310, 2026-02-19 21:15:00
```

---

## 4. SSE (Realtime)

**Resultado:**
- [ ] ✅ Conectado (EventSource ativo)
- [ ] ✅ Offer recebida
- [ ] ⚠️ Conectado mas sem offers (esperado se não houver)
- [ ] ❌ Erro: _descrever_

**Logs relevantes:**
```
[PWA_DRIVER_SSE_CONNECT] Connecting to realtime channel
(aguardando offers...)
```

**DevTools → Network:**
- URL: `/api/realtime/driver`
- Status: 200 (pending)
- Type: eventsource

**Se offer recebida:**
```
[PWA_DRIVER_SSE_OFFER_RECEIVED] New offer received { offerId: "offer-789" }
```

---

## 5. Accept Offer

**Offer ID:** offer-789

**Resultado:**
- [ ] ✅ Aceita com sucesso
- [ ] ❌ Erro: _descrever_

**Logs relevantes:**
```
[PWA_DRIVER_OFFER_ACCEPT_START] Accepting offer { offerId: "offer-789" }
[PWA_DRIVER_API_REQUEST] POST /api/v2/drivers/offers/offer-789/accept
[PWA_DRIVER_API_SUCCESS] 200 /api/v2/drivers/offers/offer-789/accept { success: true, data: { ride_id: "ride-999" } }
[PWA_DRIVER_OFFER_ACCEPT_SUCCESS] Offer accepted { offerId: "offer-789", rideId: "ride-999" }
```

**Validação backend:**
```sql
SELECT id, driver_id, status FROM rides WHERE id = 'ride-999';
-- Resultado: ride-999, abc-123, accepted
```

---

## 6. Export de Logs

**Resultado:**
- [ ] ✅ Arquivo baixado
- [ ] ✅ JSON válido
- [ ] ✅ Contém todos eventos

**Nome do arquivo:** `driver-pwa-logs-1708380000000.json`

**Tamanho:** ~15KB

**Eventos registrados:** 23

---

## Screenshots

- [ ] Login screen
- [ ] Dashboard com GPS
- [ ] Offer recebida
- [ ] Offer aceita
- [ ] Logs exportados

---

## Conclusão

**Status geral:** ✅ APROVADO / ⚠️ APROVADO COM RESSALVAS / ❌ REPROVADO

**Observações:**
_Descrever qualquer comportamento inesperado ou sugestão de melhoria_

**Próximos passos:**
_Se houver issues, listar aqui_
