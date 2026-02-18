# SPEC_RIDE_FLOW_V1 - Implementação Completa

## ✅ O que foi implementado

### 1. Models Prisma + Migrations
- ✅ `rides` - Corridas com máquina de estados
- ✅ `ride_offers` - Ofertas enviadas aos motoristas
- ✅ `driver_status` - Status operacional (offline/online/busy)
- ✅ `driver_locations` - Última localização do motorista
- ✅ Enums: `RideStatus`, `OfferStatus`, `DriverAvailability`
- ✅ Migration SQL completa em `prisma/migrations/20260218_ride_flow_v1/`

### 2. Endpoints REST

**Passageiro:**
- ✅ `POST /api/v2/rides` - Solicitar corrida
- ✅ `POST /api/v2/rides/:ride_id/cancel` - Cancelar corrida

**Motorista:**
- ✅ `POST /api/v2/drivers/me/availability` - Ficar online/offline
- ✅ `POST /api/v2/drivers/me/location` - Atualizar localização
- ✅ `POST /api/v2/drivers/offers/:offer_id/accept` - Aceitar oferta
- ✅ `POST /api/v2/drivers/offers/:offer_id/reject` - Rejeitar oferta
- ✅ `POST /api/v2/rides/:ride_id/arrived` - Marcar chegada
- ✅ `POST /api/v2/rides/:ride_id/start` - Iniciar corrida
- ✅ `POST /api/v2/rides/:ride_id/complete` - Finalizar corrida

### 3. DispatcherService
- ✅ Seleção de candidatos (ranking por distância + bairro)
- ✅ Ofertas seriais (1 por vez)
- ✅ Timeout de 15 segundos
- ✅ Redispatch automático
- ✅ Limite de 5 tentativas → `no_driver`
- ✅ Logs estruturados: `DISPATCH_CANDIDATES`, `OFFER_SENT`, `OFFER_EXPIRED`

### 4. Real-Time (SSE)
- ✅ `GET /api/realtime/driver` - Canal do motorista
- ✅ `GET /api/realtime/rides/:ride_id` - Canal da corrida (passageiro)
- ✅ Eventos: `ride.offer.created`, `ride.status.changed`, `driver.location.updated`
- ✅ Heartbeat a cada 30s

### 5. Concorrência e Idempotência
- ✅ Transação atômica no aceite de oferta
- ✅ Idempotency-Key header suportado
- ✅ Cancelamento de outras ofertas ao aceitar

### 6. Logs e Métricas
- ✅ Logs com requestId (já existente)
- ✅ Logs específicos: `RIDE_CREATED`, `OFFER_ACCEPTED/REJECTED/EXPIRED`, `RIDE_STATUS_CHANGED`

---

## 🚀 Como testar

### ⚠️ IMPORTANTE: Nunca use banco de produção para testes!

Antes de qualquer teste, configure o DATABASE_URL:

```bash
# Opção 1: Banco local (Docker)
export DATABASE_URL="postgresql://postgres:dev@localhost:5432/kaviar_dev?schema=public"

# Opção 2: Banco de staging
export DATABASE_URL="postgresql://user:pass@staging-db.example.com:5432/kaviar_staging?schema=public"

# Verificar
echo $DATABASE_URL
# NÃO deve conter "kaviar-prod-db" ou "production"
```

### Passo 1: Rodar migration

```bash
cd backend

# Aplicar migration
npx prisma migrate dev --name ride_flow_v1

# Gerar Prisma Client
npx prisma generate
```

### Passo 2: Seed de dados de teste

```bash
# Criar passageiro e 2 motoristas de teste
npx tsx prisma/seed-ride-flow-v1.ts
```

Isso cria:
- `pass_beta_test_001` (email: passenger@test.com, senha: test1234)
- `test-driver-1` (online, em Copacabana)
- `test-driver-2` (online, próximo)

### Passo 3: Iniciar backend

```bash
npm run dev:3003
```

Você deve ver:
```
✅ SPEC_RIDE_FLOW_V1: /api/v2/rides/*, /api/v2/drivers/*, /api/realtime/*
[OFFER_TIMEOUT_JOB] Started (interval: 5s)
```

### Passo 4: Testar fluxo manual

#### 4.1 Passageiro solicita corrida

Primeiro, faça login:

```bash
# Login
curl -X POST http://localhost:3003/api/auth/passenger/login \
  -H "Content-Type: application/json" \
  -d '{"email":"passenger@test.com","password":"test1234"}'

# Extrair token
TOKEN="<token_do_response>"

# Criar corrida
curl -X POST http://localhost:3003/api/v2/rides \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "origin": {"lat": -22.9668, "lng": -43.1729},
    "destination": {"lat": -22.9500, "lng": -43.1800}
  }'
```

Resposta esperada:
```json
{"success":true,"data":{"ride_id":"...","status":"requested"}}
```

Logs esperados:
```
[RIDE_CREATED] ride_id=... passenger_id=pass_beta_test_001
[DISPATCH_CANDIDATES] ride_id=... attempt=1 candidates=2 top3=[...]
[OFFER_SENT] ride_id=... offer_id=... driver_id=test-driver-1 expires_at=...
```

#### 4.2 Motorista aceita oferta

Primeiro, pegue o `offer_id` dos logs ou consulte o banco:

```bash
# Consultar ofertas pendentes
psql $DATABASE_URL -c "SELECT id, ride_id, driver_id, status, expires_at FROM ride_offers WHERE status='pending' ORDER BY sent_at DESC LIMIT 5;"
```

Aceitar oferta:

```bash
curl -X POST http://localhost:3003/api/v2/drivers/offers/<OFFER_ID>/accept \
  -H "x-driver-id: test-driver-1"
```

Resposta esperada:
```json
{"success":true,"data":{"ride_id":"..."}}
```

Logs esperados:
```
[OFFER_ACCEPTED] offer_id=... ride_id=... driver_id=test-driver-1
[RIDE_STATUS_CHANGED] ride_id=... status=accepted driver_id=test-driver-1
```

#### 4.3 Motorista completa corrida

```bash
# Arrived
curl -X POST http://localhost:3003/api/v2/rides/<RIDE_ID>/arrived \
  -H "x-driver-id: test-driver-1"

# Start
curl -X POST http://localhost:3003/api/v2/rides/<RIDE_ID>/start \
  -H "x-driver-id: test-driver-1"

# Complete
curl -X POST http://localhost:3003/api/v2/rides/<RIDE_ID>/complete \
  -H "x-driver-id: test-driver-1"
```

### Passo 5: Testar timeout e redispatch

#### 5.1 Criar corrida e NÃO aceitar

```bash
curl -X POST http://localhost:3003/api/v2/rides \
  -H "Content-Type: application/json" \
  -H "x-passenger-id: test-passenger-1" \
  -d '{
    "origin": {"lat": -22.9668, "lng": -43.1729},
    "destination": {"lat": -22.9500, "lng": -43.1800}
  }'
```

#### 5.2 Aguardar 15 segundos

Após 15s, você deve ver nos logs:

```
[OFFER_EXPIRED] offer_id=... ride_id=... driver_id=test-driver-1
[DISPATCH_CANDIDATES] ride_id=... attempt=2 candidates=2 top3=[...]
[OFFER_SENT] ride_id=... offer_id=... driver_id=test-driver-2 expires_at=...
```

### Passo 6: Testar script de 20 corridas

```bash
cd backend
./scripts/test-ride-flow-v1.sh
```

Isso cria 20 corridas e mostra estatísticas.

### Passo 7: Testar Real-Time (SSE)

#### 7.1 Conectar como motorista

```bash
curl -N -H "x-driver-id: test-driver-1" \
  http://localhost:3003/api/realtime/driver
```

Deixe rodando em um terminal. Você deve ver:
```
: connected

: heartbeat
```

#### 7.2 Criar corrida em outro terminal

```bash
curl -X POST http://localhost:3003/api/v2/rides \
  -H "Content-Type: application/json" \
  -H "x-passenger-id: test-passenger-1" \
  -d '{
    "origin": {"lat": -22.9668, "lng": -43.1729},
    "destination": {"lat": -22.9500, "lng": -43.1800}
  }'
```

No terminal do SSE, você deve receber:
```
data: {"type":"ride.offer.created","offer":{"id":"...","ride_id":"...","expires_at":"..."},"ride":{...}}
```

---

## 📊 Critérios de aceite

### ✅ Checklist

- [ ] 20 corridas em staging terminam em `accepted` ou `no_driver`
- [ ] Timeout funciona (oferta expira após 15s e redispatch acontece)
- [ ] Concorrência: 2 motoristas não aceitam a mesma corrida
- [ ] Passageiro recebe `ride.status.changed` em real-time
- [ ] Passageiro recebe `driver.location.updated` em real-time
- [ ] Logs mostram: candidatos + oferta enviada + decisão

### 📋 Evidências necessárias

1. **Script de 20 corridas:**
   - Output do `./scripts/test-ride-flow-v1.sh`
   - Screenshot mostrando corridas criadas

2. **Logs CloudWatch (ou local):**
   - `RIDE_CREATED` (20x)
   - `DISPATCH_CANDIDATES` com top3 candidatos
   - `OFFER_SENT` com expires_at
   - `OFFER_EXPIRED` (se timeout)
   - `OFFER_ACCEPTED` ou `OFFER_REJECTED`

3. **Teste de timeout:**
   - Criar corrida
   - Aguardar 15s sem aceitar
   - Mostrar log de `OFFER_EXPIRED` + redispatch

4. **Teste de concorrência:**
   - Criar corrida
   - 2 motoristas tentam aceitar simultaneamente
   - Apenas 1 consegue (transação atômica)

5. **Real-time:**
   - Screenshot do SSE recebendo evento `ride.offer.created`

---

## 🔧 Troubleshooting

### Erro: "Offer not found"
- Verifique se o `offer_id` está correto
- Consulte: `SELECT * FROM ride_offers WHERE id='...'`

### Erro: "Offer expired"
- A oferta expirou (15s)
- Crie uma nova corrida

### Nenhum candidato encontrado
- Verifique se motoristas estão `online`:
  ```sql
  SELECT * FROM driver_status WHERE availability='online';
  ```
- Verifique se localização está recente (< 30s):
  ```sql
  SELECT * FROM driver_locations WHERE updated_at > NOW() - INTERVAL '30 seconds';
  ```

### Timeout não funciona
- Verifique se o job está rodando:
  ```
  [OFFER_TIMEOUT_JOB] Started (interval: 5s)
  ```
- Verifique logs a cada 5s

---

## 📁 Arquivos criados

```
backend/
├── docs/
│   └── SPEC_RIDE_FLOW_V1.md                    # Especificação completa
├── prisma/
│   ├── migrations/
│   │   └── 20260218_ride_flow_v1/
│   │       └── migration.sql                   # Migration SQL
│   ├── schema.prisma                           # Models atualizados
│   └── seed-ride-flow-v1.ts                    # Seed de teste
├── src/
│   ├── services/
│   │   ├── dispatcher.service.ts               # Matching + timeout
│   │   └── realtime.service.ts                 # SSE
│   ├── routes/
│   │   ├── rides-v2.ts                         # Rotas de corridas
│   │   ├── drivers-v2.ts                       # Rotas de motoristas
│   │   └── realtime.ts                         # Rotas SSE
│   ├── jobs/
│   │   └── offer-timeout.job.ts                # Job de timeout
│   ├── app.ts                                  # Rotas registradas
│   └── server.ts                               # Job iniciado
└── scripts/
    ├── test-ride-flow-v1.sh                    # Script de teste
    └── README-RIDE-FLOW-V1.md                  # Este arquivo
```

---

## 🎯 Próximos passos (pós-MVP)

1. **Persistir eventos SSE** (Redis Pub/Sub para múltiplas instâncias)
2. **Fila de dispatch** (SQS/Redis para escalar)
3. **Métricas Prometheus** (contador de corridas, latência de matching)
4. **Alertas** (corridas sem match > 5min)
5. **Dashboard admin** (corridas em tempo real)
6. **Histórico de rota** (salvar pontos GPS durante corrida)
7. **Cancelamento pelo motorista** (com penalidade)
8. **Pagamento integrado** (Stripe/Mercado Pago)

---

**Status:** ✅ Implementação completa  
**Data:** 2026-02-18  
**Autor:** Kiro (AWS AI Assistant)
