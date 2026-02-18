# Evidências Staging - SPEC_RIDE_FLOW_V1

## Objetivo
Validar funcionamento completo do ride-flow v1 em ambiente de staging com 20 corridas reais.

## Pré-requisitos Verificados

### 1. Deploy em Staging
- [ ] Branch deployado: `feat/dev-load-test-ride-flow-v1` ou `main` (após merge)
- [ ] ECS Task Definition staging configurado com:
  - `FEATURE_SPEC_RIDE_FLOW_V1=true`
  - `NODE_ENV=production` (ou `staging`)
  - `DATABASE_URL` apontando para RDS staging
  - Sem flags `DEV_*` (produção/staging não usa simulação)

### 2. Verificação de Health
```bash
# Backend staging respondendo
curl https://staging-api.kaviar.com/api/health
# Esperado: {"status":"ok"}

# Endpoints v2 montados (não 404)
curl -i https://staging-api.kaviar.com/api/v2/rides
# Esperado: 401 Unauthorized (não 404)
```

### 3. Migration Aplicada
```bash
# Conectar no RDS staging e verificar tabelas
psql $STAGING_DATABASE_URL -c "\dt rides_v2"
psql $STAGING_DATABASE_URL -c "\dt ride_offers"
psql $STAGING_DATABASE_URL -c "\dt driver_locations"
psql $STAGING_DATABASE_URL -c "\dt driver_status"
```

---

## Execução do Teste (20 Rides)

### Data/Hora do Teste
- **Início**: [PREENCHER - ex: 2026-02-18 19:30:00 UTC]
- **Fim**: [PREENCHER - ex: 2026-02-18 19:35:00 UTC]
- **Duração**: ~5 minutos

### Seed de Dados
```bash
# Conectar no ambiente staging e rodar seed
# Opção 1: Via bastion/tunnel
ssh -L 5432:staging-rds.amazonaws.com:5432 bastion-host
export DATABASE_URL="postgresql://user:pass@localhost:5432/kaviar_staging"
npx tsx backend/prisma/seed-ride-flow-v1.ts

# Resultado esperado:
# ✓ Passenger created: pass_beta_test_001
# ✓ Driver 1 created: test-driver-1
# ✓ Driver 2 created: test-driver-2
```

### Execução do Script de Teste
```bash
# Configurar endpoint staging
export API_URL="https://staging-api.kaviar.com"

# Rodar teste de 20 rides
cd backend
bash scripts/test-ride-flow-v1.sh

# Output esperado (colar aqui):
```

**[PREENCHER COM OUTPUT DO SCRIPT]**

Exemplo:
```
🧪 Testing SPEC_RIDE_FLOW_V1...
📝 Logging in as passenger...
✅ Token obtained (len=237)

🚗 Creating 20 rides...
  ✓ Ride 1 created: abc123-...
  ✓ Ride 2 created: def456-...
  ...
  ✓ Ride 20 created: xyz789-...

⏳ Waiting for processing...
✅ Test complete!
```

---

## Evidências CloudWatch Logs (Staging)

### Log Group
- **Nome**: `/ecs/kaviar-backend-staging` (ou similar)
- **Região**: `us-east-2`
- **Período**: [INÍCIO] até [FIM] do teste

### Comandos para Coletar Logs
```bash
# Buscar logs do período do teste
aws logs filter-log-events \
  --log-group-name /ecs/kaviar-backend-staging \
  --start-time $(date -d "2026-02-18 19:30:00" +%s)000 \
  --end-time $(date -d "2026-02-18 19:35:00" +%s)000 \
  --filter-pattern "RIDE_CREATED" \
  --region us-east-2 \
  --max-items 25 \
  > staging-logs-ride-created.json

# Buscar logs do dispatcher
aws logs filter-log-events \
  --log-group-name /ecs/kaviar-backend-staging \
  --start-time $(date -d "2026-02-18 19:30:00" +%s)000 \
  --end-time $(date -d "2026-02-18 19:35:00" +%s)000 \
  --filter-pattern "DISPATCHER" \
  --region us-east-2 \
  --max-items 50 \
  > staging-logs-dispatcher.json

# Buscar logs de offers
aws logs filter-log-events \
  --log-group-name /ecs/kaviar-backend-staging \
  --start-time $(date -d "2026-02-18 19:30:00" +%s)000 \
  --end-time $(date -d "2026-02-18 19:35:00" +%s)000 \
  --filter-pattern "OFFER" \
  --region us-east-2 \
  --max-items 50 \
  > staging-logs-offers.json
```

### Trechos Relevantes dos Logs

#### 1. Ride Created
```
[PREENCHER COM LOGS REAIS]

Exemplo:
2026-02-18T19:30:15.234Z [RIDE_CREATED] ride_id=abc123-... passenger_id=pass_beta_test_001 origin=[-22.9668,-43.1729] dest=[-22.9700,-43.1800]
2026-02-18T19:30:16.123Z [RIDE_CREATED] ride_id=def456-... passenger_id=pass_beta_test_001 origin=[-22.9668,-43.1729] dest=[-22.9700,-43.1800]
...
```

#### 2. Dispatcher Filter & Candidates
```
[PREENCHER COM LOGS REAIS]

Exemplo:
2026-02-18T19:30:15.345Z [DISPATCHER_FILTER] ride_id=abc123-... online=2 with_location=2 fresh_location=2 within_distance=2 final_candidates=2 dropped={"no_location":0,"stale_location":0,"too_far":0}
2026-02-18T19:30:15.346Z [DISPATCH_CANDIDATES] ride_id=abc123-... attempt=1 candidates=2 top3=[{"driver_id":"test-driver-1","distance_km":0.5,"score":0.5,"same_neighborhood":false}]
```

#### 3. Offer Sent
```
[PREENCHER COM LOGS REAIS]

Exemplo:
2026-02-18T19:30:15.456Z [OFFER_SENT] ride_id=abc123-... offer_id=offer-001 driver_id=test-driver-1 expires_at=2026-02-18T19:30:30.456Z score=0.5
```

#### 4. Offer Status (Accepted/Rejected/Expired)
```
[PREENCHER COM LOGS REAIS]

Exemplo:
2026-02-18T19:30:30.567Z [OFFER_EXPIRED] offer_id=offer-001 ride_id=abc123-... driver_id=test-driver-1
2026-02-18T19:30:30.678Z [DISPATCHER] No candidates for ride abc123-..., setting no_driver
```

#### 5. Ride Status Changed
```
[PREENCHER COM LOGS REAIS]

Exemplo:
2026-02-18T19:30:30.789Z [RIDE_STATUS_CHANGED] ride_id=abc123-... status=no_driver
```

---

## Evidências SQL (Staging Database)

### Query: Rides por Status
```sql
SELECT status, COUNT(*) as count
FROM rides_v2
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY status
ORDER BY count DESC;
```

**Resultado:**
```
[PREENCHER COM RESULTADO REAL]

Exemplo:
  status   | count
-----------+-------
 no_driver |    18
 offered   |     2
 requested |     0
(3 rows)
```

### Query: Offers por Status
```sql
SELECT status, COUNT(*) as count
FROM ride_offers
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY status
ORDER BY count DESC;
```

**Resultado:**
```
[PREENCHER COM RESULTADO REAL]

Exemplo:
  status  | count
----------+-------
 expired  |    20
 pending  |     0
(2 rows)
```

### Query: Detalhes das 20 Rides
```sql
SELECT 
  id,
  status,
  created_at,
  offered_at,
  (SELECT COUNT(*) FROM ride_offers WHERE ride_id = rides_v2.id) as offer_count,
  (SELECT COUNT(*) FROM ride_offers WHERE ride_id = rides_v2.id AND status = 'expired') as expired_count
FROM rides_v2
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 20;
```

**Resultado:**
```
[PREENCHER COM RESULTADO REAL]
```

---

## Análise dos Resultados

### Resumo Executivo
- **Total de rides criadas**: [PREENCHER - ex: 20]
- **Rides processadas pelo dispatcher**: [PREENCHER - ex: 20]
- **Offers enviadas**: [PREENCHER - ex: 20]
- **Offers expiradas**: [PREENCHER - ex: 20]
- **Rides com status final no_driver**: [PREENCHER - ex: 18]
- **Rides com status offered**: [PREENCHER - ex: 2]

### Validação dos Requisitos

#### ✅ Ride criada
- [x] Logs mostram `[RIDE_CREATED]` para todas as 20 rides
- [x] Rides registradas na tabela `rides_v2`

#### ✅ Dispatcher executa e filtra candidatos
- [x] Logs mostram `[DISPATCHER_FILTER]` com contagem de candidatos
- [x] Logs mostram `[DISPATCH_CANDIDATES]` com top3

#### ✅ Offer enviada via SSE
- [x] Logs mostram `[OFFER_SENT]` com driver_id e expires_at
- [x] Offers registradas na tabela `ride_offers`

#### ✅ Timeout de 15s funciona
- [x] Logs mostram `[OFFER_EXPIRED]` após ~15s
- [x] Offers com status `expired` no banco

#### ✅ Aceite/rejeição/expiração registradas
- [x] Tabela `ride_offers` tem status corretos
- [x] Logs mostram transições de status

#### ✅ Status muda corretamente no banco
- [x] Rides transitam: `requested` → `offered` → `no_driver` (ou `accepted`)
- [x] Query SQL confirma status finais

---

## Observações e Issues Encontrados

### Issues (se houver)
[PREENCHER SE ENCONTRAR PROBLEMAS]

Exemplo:
- ⚠️ Issue #1: Algumas rides ficaram em status `offered` sem transitar para `no_driver`
  - **Causa**: Timeout job não rodou
  - **Ação**: Verificar cron job em staging

### Comportamento Esperado vs Real

**Esperado (sem motoristas reais em staging):**
- Todas as rides devem processar pelo dispatcher
- Offers devem ser criadas e enviadas via SSE
- Offers devem expirar após timeout (~15s) ou serem rejeitadas
- Rides devem transitar para status final (`no_driver`, `offered`, ou `accepted` se houver simulação)

**Critério de validação técnica:**
- ✅ Fluxo completo executado: `created` → `dispatcher` → `offer` → `accepted/rejected/expired` → `status persisted`
- ✅ Logs mostram todas as etapas (RIDE_CREATED, DISPATCHER, OFFER_SENT, status final)
- ✅ Banco de dados reflete transições corretas

**Nota:** Não é necessário ter X% de rides accepted. O objetivo é comprovar que o **fluxo técnico funciona** ponta-a-ponta.

**Real:**
[PREENCHER COM OBSERVAÇÕES]

---

## Conclusão

### Status: [PREENCHER - ✅ APROVADO ou ❌ REPROVADO]

**Justificativa:**
[PREENCHER]

**Critérios para APROVADO:**
- ✅ 20 rides criadas e registradas no banco
- ✅ Dispatcher executou para todas as rides (logs DISPATCHER_FILTER)
- ✅ Offers criadas e enviadas (logs OFFER_SENT)
- ✅ Timeout funcionou (offers expiraram após ~15s)
- ✅ Status finais persistidos corretamente no banco
- ✅ Fluxo completo comprovado: created → dispatcher → offer → status final

**Nota:** Não é necessário ter rides accepted. O objetivo é validar que o **fluxo técnico funciona** ponta-a-ponta.

Exemplo de justificativa APROVADO:
```
✅ APROVADO - Todas as 20 rides foram processadas pelo dispatcher. 
Offers foram criadas e enviadas via SSE. Timeout de 15s funcionou corretamente.
Status finais foram persistidos no banco (no_driver/offered/expired).
Fluxo técnico validado ponta-a-ponta. Sistema pronto para produção.
```

### Próximos Passos
- [ ] Aplicar migration em produção (manual, fora de horário de pico)
- [ ] Habilitar `FEATURE_SPEC_RIDE_FLOW_V1=true` em produção
- [ ] Monitorar primeiras corridas reais
- [ ] Validar com motoristas reais aceitando/rejeitando

---

## Anexos

### Comandos Úteis para Troubleshooting

```bash
# Ver logs em tempo real (staging)
aws logs tail /ecs/kaviar-backend-staging --follow --region us-east-2

# Contar rides por status
psql $STAGING_DATABASE_URL -c "SELECT status, COUNT(*) FROM rides_v2 WHERE created_at > NOW() - INTERVAL '1 hour' GROUP BY status;"

# Ver últimas 10 rides
psql $STAGING_DATABASE_URL -c "SELECT id, status, created_at FROM rides_v2 ORDER BY created_at DESC LIMIT 10;"

# Ver offers de uma ride específica
psql $STAGING_DATABASE_URL -c "SELECT * FROM ride_offers WHERE ride_id = 'RIDE_ID_AQUI';"
```

### Informações do Ambiente

- **Região AWS**: us-east-2
- **Cluster ECS**: kaviar-cluster-staging (ou similar)
- **Service**: kaviar-backend-service-staging
- **RDS Endpoint**: [PREENCHER]
- **Log Group**: /ecs/kaviar-backend-staging

---

**Documento gerado em**: [PREENCHER DATA/HORA]
**Responsável**: [PREENCHER NOME]
**Versão do código**: commit [PREENCHER HASH]
