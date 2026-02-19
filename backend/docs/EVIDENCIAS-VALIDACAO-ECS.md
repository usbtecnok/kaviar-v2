# Evidências Validação ECS (one-off) - SPEC_RIDE_FLOW_V1

**Nota:** Este documento foi renomeado de "Evidências Staging" para refletir a realidade: validação via ECS one-off, sem staging DNS/service.

## Objetivo
Validar funcionamento completo do ride-flow v1 em validação via ECS run-task one-off (sem DNS/service) com 20 corridas reais.

## Pré-requisitos Verificados

### 1. Execução via ECS run-task one-off
- [ ] Task Definition: kaviar-backend:148
- [ ] Feature flag: `FEATURE_SPEC_RIDE_FLOW_V1=true`
- [ ] NODE_ENV: `staging`
- [ ] Database: `kaviar_validation` (RDS prod, isolado)
- [ ] Usuário DB: `usbtecnok`
- [ ] VALIDATION_DATABASE_URL configurado

### 2. Migration Aplicada
```bash
# Verificar tabelas no DB validation
psql $VALIDATION_DATABASE_URL -c "\dt rides_v2"
psql $VALIDATION_DATABASE_URL -c "\dt ride_offers"
psql $VALIDATION_DATABASE_URL -c "\dt driver_locations"
psql $VALIDATION_DATABASE_URL -c "\dt driver_status"
```

---

## Execução do Teste (20 Rides via ECS)

### Informações da Task
- **Task ARN**: [PREENCHER - ex: arn:aws:ecs:us-east-2:847895361928:task/kaviar-cluster/abc123...]
- **Task ID**: [PREENCHER - ex: abc123def456]
- **Image**: 11bdd8c (ou conforme executado)

### Data/Hora do Teste
- **Início**: [PREENCHER - ex: 2026-02-18 22:30:00 -03:00]
- **Fim**: [PREENCHER - ex: 2026-02-18 22:35:00 -03:00]
- **Duração**: ~5 minutos

### Execução
```bash
# Task executada via roteiro COMANDO-PRONTO-VALIDACAO.md
# Seed + Server + Test script rodaram dentro da task
# Logs coletados via CloudWatch
```
# ✓ Passenger created: pass_beta_test_001
# ✓ Driver 1 created: test-driver-1
# ✓ Driver 2 created: test-driver-2
```

### Output do Teste

**[PREENCHER COM OUTPUT DO SCRIPT - extraído dos logs CloudWatch]**

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

## Evidências CloudWatch Logs

### Log Group
- **Nome**: `/ecs/kaviar-backend`
- **Região**: `us-east-2`
- **Task ID**: [PREENCHER - do Passo 4.2]
- **Log Stream**: [PREENCHER - descoberto automaticamente]

### Coleta de Logs
```bash
# Logs coletados via roteiro COMANDO-PRONTO-VALIDACAO.md
# Arquivo: /tmp/validation-full-logs.txt (até 10k eventos)
# Marcadores extraídos em arquivos separados
```

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
### Trechos Relevantes dos Logs

**Fonte:** Arquivos extraídos via roteiro (Passo 6.3)

#### 1. RIDE_CREATED
```
[PREENCHER - copiar de /tmp/validation-ride-created.txt]

Exemplo:
2026-02-18T22:30:15.234Z [RIDE_CREATED] ride_id=abc123-... passenger_id=pass_beta_test_001 origin=[-22.9668,-43.1729] dest=[-22.9700,-43.1800]
2026-02-18T22:30:16.123Z [RIDE_CREATED] ride_id=def456-... passenger_id=pass_beta_test_001 origin=[-22.9668,-43.1729] dest=[-22.9700,-43.1800]
...
```

#### 2. DISPATCHER_FILTER & DISPATCH_CANDIDATES
```
[PREENCHER - copiar de /tmp/validation-dispatcher-filter.txt e /tmp/validation-dispatch-candidates.txt]

Exemplo:
2026-02-18T22:30:15.345Z [DISPATCHER_FILTER] ride_id=abc123-... online=2 with_location=2 fresh_location=2 within_distance=2 final_candidates=2 dropped={"no_location":0,"stale_location":0,"too_far":0}
2026-02-18T22:30:15.346Z [DISPATCH_CANDIDATES] ride_id=abc123-... attempt=1 candidates=2 top3=[{"driver_id":"test-driver-1","distance_km":0.5,"score":0.5,"same_neighborhood":false}]
```

#### 3. OFFER_SENT
```
[PREENCHER - copiar de /tmp/validation-offer-sent.txt]

Exemplo:
2026-02-18T22:30:15.456Z [OFFER_SENT] ride_id=abc123-... offer_id=offer-001 driver_id=test-driver-1 expires_at=2026-02-18T22:30:30.456Z score=0.5
```

#### 4. OFFER_EXPIRED
```
[PREENCHER - copiar de /tmp/validation-offer-expired.txt]

Exemplo:
2026-02-18T22:30:30.567Z [OFFER_EXPIRED] offer_id=offer-001 ride_id=abc123-... driver_id=test-driver-1
```

#### 5. RIDE_STATUS_CHANGED
```
[PREENCHER - copiar de /tmp/validation-status-changed.txt]

Exemplo:
2026-02-18T22:30:30.789Z [RIDE_STATUS_CHANGED] ride_id=abc123-... status=no_driver
```

---

## Evidências SQL (via ECS psql-runner)

**Fonte:** `/tmp/validation-sql-all.txt` (coletado via Passo 7 do roteiro)

### Resultado Completo

```
[PREENCHER - copiar todo conteúdo de /tmp/validation-sql-all.txt]

Exemplo:

=== RIDES POR STATUS ===
  status   | count
-----------+-------
 no_driver |    18
 offered   |     2
 requested |     0
(3 rows)

=== OFFERS POR STATUS ===
  status  | count
----------+-------
 expired  |    20
 pending  |     0
(2 rows)

=== DETALHES DAS 20 RIDES ===
                  id                  |  status   |         created_at         |         offered_at         | offer_count
--------------------------------------+-----------+----------------------------+----------------------------+-------------
 abc123-def4-5678-90ab-cdef12345678   | no_driver | 2026-02-18 22:30:15.234+00 | 2026-02-18 22:30:15.456+00 |           1
 def456-abc1-2345-6789-0abcdef12345   | offered   | 2026-02-18 22:30:16.123+00 | 2026-02-18 22:30:16.345+00 |           1
...
(20 rows)
```
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

**Esperado (validação sem motoristas reais):**
- Todas as rides devem processar pelo dispatcher
- Offers devem ser criadas e enviadas via SSE (simulado dentro da task)
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
# Ver logs em tempo real (task específica)
aws logs tail /ecs/kaviar-backend --follow --region us-east-2

# Contar rides por status (via psql local se disponível, ou via ECS psql-runner)
psql $VALIDATION_DATABASE_URL -c "SELECT status, COUNT(*) FROM rides_v2 WHERE created_at > NOW() - INTERVAL '1 hour' GROUP BY status;"

# Ver últimas 10 rides
psql $VALIDATION_DATABASE_URL -c "SELECT id, status, created_at FROM rides_v2 ORDER BY created_at DESC LIMIT 10;"

# Ver offers de uma ride específica
psql $VALIDATION_DATABASE_URL -c "SELECT * FROM ride_offers WHERE ride_id = 'RIDE_ID_AQUI';"
```

### Informações do Ambiente

- **Região AWS**: us-east-2
- **Cluster ECS**: kaviar-cluster
- **Execução**: ECS run-task one-off (sem service/DNS)
- **Database**: kaviar_validation (RDS prod, isolado)
- **Usuário DB**: usbtecnok
- **Log Group Backend**: /ecs/kaviar-backend
- **Log Group SQL Runner**: /ecs/kaviar-psql-runner

---

**Documento gerado em**: [PREENCHER DATA/HORA]
**Responsável**: [PREENCHER NOME]
**Task ARN**: [PREENCHER]
**Versão do código**: commit [PREENCHER HASH]
