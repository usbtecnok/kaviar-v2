# SPEC_RIDE_FLOW_V1 — Corrida End-to-End (Matching + Offers + Real-Time)

## 1) Objetivo (MVP Rua)

Entregar corrida end-to-end:

- Passageiro solicita corrida
- Backend cria ride em `requested`
- Dispatcher seleciona motoristas candidatos
- Backend cria `ride_offer` para 1 motorista por vez
- Motorista recebe oferta em tempo real e aceita/rejeita
- Se não responder, timeout e redispatch
- Ao aceitar: corrida vira `accepted`, driver vira `busy`
- Status evolui `arrived → in_progress → completed`
- Tracking real-time (status + localização do driver)

**Regra: Sem isso, não é produção.**

---

## 2) Estados (máquina de estados)

### 2.1 RideStatus

- `requested`
- `offered`
- `accepted`
- `arrived`
- `in_progress`
- `completed`
- `canceled_by_passenger`
- `canceled_by_driver`
- `no_driver`

### 2.2 Transições permitidas

- `requested → offered`
- `offered → accepted | no_driver`
- `accepted → arrived | canceled_by_driver | canceled_by_passenger`
- `arrived → in_progress | canceled_by_driver | canceled_by_passenger`
- `in_progress → completed | canceled_by_driver | canceled_by_passenger`

**Proibido:** pular estado (ex.: `requested → accepted`).

### 2.3 Timestamps por estado (audit)

Salvar timestamps no ride:
- `requested_at`, `offered_at`, `accepted_at`, `arrived_at`, `started_at`, `completed_at`, `canceled_at`

---

## 3) Regras do Driver (status operacional)

### 3.1 DriverAvailability

- `offline`
- `online`
- `busy` (tem corrida ativa)

### 3.2 Regras

- Driver só recebe oferta se `online`
- Ao aceitar corrida: vira `busy`
- Ao finalizar/cancelar corrida: volta pra `online` (se ele não marcou offline)

---

## 4) Modelo de Dados (Prisma — mínimo)

### 4.1 Ride

Campos mínimos:
- `id` (text/uuid)
- `passenger_id`
- `driver_id` (nullable até aceitar)
- `status` (enum)
- `origin_lat`, `origin_lng`, `dest_lat`, `dest_lng`
- `origin_text`, `destination_text` (opcional)
- `origin_neighborhood_id` (nullable)
- `dest_neighborhood_id` (nullable)
- `created_at`, `updated_at`
- timestamps por estado (audit)

Índices:
- `status`
- `passenger_id`
- `driver_id`

### 4.2 RideOffer

Representa "oferta enviada a um motorista".

- `id`
- `ride_id`
- `driver_id`
- `status` enum: `pending | accepted | rejected | expired | canceled`
- `sent_at`
- `expires_at`
- `responded_at` (nullable)
- `rank_score` (nullable, debug)

**Constraints:**
- Um ride pode ter várias offers (histórico).
- Para garantir concorrência: no máximo 1 offer pending por ride (via lock/transaction lógica).

Índices:
- `ride_id`
- `driver_id`
- `status`

### 4.3 DriverStatus

- `driver_id` (PK)
- `availability` enum (offline|online|busy)
- `updated_at`

### 4.4 DriverLocation

MVP: só "última localização"

- `driver_id` (PK)
- `lat`, `lng`
- `heading` (opcional)
- `speed` (opcional)
- `updated_at`

---

## 5) Endpoints REST (mínimos)

### 5.1 Passageiro solicita corrida

**POST /api/rides**

Body:
```json
{
  "origin": {"lat": -22.9, "lng": -43.2, "text": "opcional"},
  "destination": {"lat": -22.91, "lng": -43.25, "text": "opcional"},
  "type": "normal"
}
```

Resposta:
```json
{"success": true, "data": {"ride_id": "...", "status": "requested"}}
```

Ação backend imediata:
- Criar ride em `requested`
- Enfileirar/acionar dispatcher

### 5.2 Passageiro cancela corrida

**POST /api/rides/:ride_id/cancel**

Regras:
- permitido até `arrived`
- status vira `canceled_by_passenger`

### 5.3 Driver online/offline

**POST /api/drivers/me/availability**

Body:
```json
{"availability": "online"}
```

### 5.4 Driver envia localização

**POST /api/drivers/me/location**

Body:
```json
{"lat": -22.9, "lng": -43.2, "heading": 0, "speed": 0}
```

### 5.5 Driver aceita oferta

**POST /api/driver/offers/:offer_id/accept**

Regras:
- aceitar só se offer `pending` e não expirada
- transação atômica:
  - set offer `accepted`
  - set `ride.driver_id = driver_id`
  - set `ride.status = accepted`
  - set driver `busy`
  - cancelar/invalidar qualquer outra offer pending daquela ride

### 5.6 Driver rejeita oferta

**POST /api/driver/offers/:offer_id/reject**

- set offer `rejected`
- aciona dispatcher para próxima oferta

### 5.7 Driver arrived / start / complete

- **POST /api/rides/:ride_id/arrived**
- **POST /api/rides/:ride_id/start**
- **POST /api/rides/:ride_id/complete**

Regras de autorização:
- apenas o `driver_id` atribuído na corrida pode mover esses estados.

---

## 6) Dispatcher (matching + timeout + redispatch)

### 6.1 Execução

MVP: service interno acionado:
- logo após criar ride
- quando offer expira
- quando driver rejeita
- quando driver cancela

### 6.2 Seleção de candidatos (ranking)

MVP ranking:
- distância do driver até origem (Haversine)
- bônus se driver está na mesma geofence/comunidade
- penalidade se driver está longe demais

Regras:
- candidatos = drivers `online` com `DriverLocation.updated_at` recente (< 30s)
- limite: top 10 candidatos
- oferta: 1 por vez (serial), com `expires_at = now + 15s`

### 6.3 Timeout

Job simples (cron interno/interval):
- Se existir `RideOffer.pending` expirada:
  - set `expired`
  - chamar dispatcher novamente

### 6.4 No driver

Após N tentativas (ex.: 5 offers), set ride `no_driver`.

---

## 7) Real-Time (SSE ou WebSocket)

MVP recomendado: SSE (mais simples)

### 7.1 Canal do motorista

**GET /api/realtime/driver** (autenticado)

Eventos:
- `ride.offer.created`
- `ride.offer.expired`
- `ride.offer.canceled`

Payload:
```json
{
  "type": "ride.offer.created",
  "offer": {"id": "...", "ride_id": "...", "expires_at": "..."},
  "ride": {"origin": {...}, "destination": {...}}
}
```

### 7.2 Canal da corrida (passageiro)

**GET /api/realtime/rides/:ride_id** (autenticado; só dono da corrida)

Eventos:
- `ride.status.changed`
- `driver.location.updated`

Payload status:
```json
{"type":"ride.status.changed","ride_id":"...","status":"accepted","at":"..."}
```

Payload location:
```json
{"type":"driver.location.updated","ride_id":"...","driver":{"lat":...,"lng":...,"at":"..."}}
```

---

## 8) Concorrência e Idempotência (obrigatório)

### 8.1 Idempotência na criação de corrida

MVP: use header opcional `Idempotency-Key`.
Se vier repetido, retornar a mesma ride.

### 8.2 Aceite de oferta deve ser atômico

Usar transaction no Prisma:
- checar offer `pending` + `expires_at > now`
- atualizar offer → `accepted`
- atualizar ride → set driver + status `accepted`
- atualizar driver_status → `busy`

Se algum passo falhar, rollback.

---

## 9) Logs e Métricas (mínimo)

### 9.1 Logs (com requestId)

Nos eventos críticos, logar:
- `RIDE_CREATED`
- `DISPATCH_CANDIDATES` (lista/contagem + top3 com score)
- `OFFER_SENT` (ride_id, offer_id, driver_id, expires_at)
- `OFFER_ACCEPTED/REJECTED/EXPIRED`
- `RIDE_STATUS_CHANGED`

### 9.2 Métricas

- `rides_created_total`
- `rides_accepted_total`
- `rides_completed_total`
- `rides_no_driver_total`
- `offers_sent_total`
- `offers_expired_total`

---

## 10) Critérios de aceite

- ✅ 20 corridas em staging: termina em `accepted` ou `no_driver` (sem travar)
- ✅ Timeout funciona (offer expira e redispatch acontece)
- ✅ Concorrência: 2 drivers não aceitam a mesma corrida
- ✅ Passageiro recebe `ride.status.changed` em real-time
- ✅ Passageiro recebe `driver.location.updated` em real-time
- ✅ Logs mostram: candidatos + oferta enviada + decisão

---

## 11) Tarefas para implementação

1. Criar models Prisma (Ride, RideOffer, DriverStatus, DriverLocation) + migrations
2. Implementar endpoints (seção 5)
3. Implementar DispatcherService (seção 6)
4. Implementar Real-Time (seção 7)
5. Adicionar logs/métricas (seção 9)
6. Criar script de teste com curl (20 corridas) + evidências CloudWatch
