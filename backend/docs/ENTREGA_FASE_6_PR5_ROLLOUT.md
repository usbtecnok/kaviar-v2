# PR5: Rollout Controlado - Sentiment Analysis

## Objetivo

Ativar sentiment analysis em produção de forma controlada e reversível, com critérios claros de sucesso e rollback.

## Pré-requisitos

- [x] PR1: Backend integration (flag + enqueue + reconciler)
- [x] PR2: AWS infrastructure (SQS + Lambda + IAM)
- [x] PR3: Lambda processor (Comprehend + DB + retry logic)
- [x] PR4: Observabilidade (alarmes + logs)
- [x] Hotfix: Networking (NAT Gateway) + retry logic corrigido

## Estratégia de Rollout

### Fase 1: Smoke Test (Flag ON, 15 min)

**Objetivo**: Validar fluxo E2E com tráfego real mínimo

**Ações**:
1. Ativar flag `SENTIMENT_ANALYSIS_ENABLED=true` no backend
2. Deploy backend (ECS rolling update)
3. Criar 1-2 feedbacks via API (tráfego real)
4. Monitorar alarmes por 15 min

**Critérios de Sucesso**:
- ✅ Backend enfileira mensagens (log `[SentimentQueue] Enqueued`)
- ✅ Lambda processa com sucesso (log `SUCCESS`)
- ✅ DB tem sentiment preenchido (Admin API retorna `sentimentAnalysis`)
- ✅ Todos os alarmes em OK
- ✅ DLQ vazia (0 mensagens)
- ✅ Lambda Duration < 2s (avg)

**Critérios de Rollback**:
- ❌ Qualquer alarme em ALARM
- ❌ DLQ com mensagens
- ❌ Lambda Errors > 0
- ❌ Feedback sem sentiment após 2 min

### Fase 2: Monitoramento Estendido (1-2h)

**Objetivo**: Validar estabilidade com tráfego orgânico

**Ações**:
1. Manter flag ON
2. Monitorar métricas a cada 15 min
3. Validar % de feedbacks com sentiment

**Critérios de Sucesso**:
- ✅ 95%+ dos feedbacks têm sentiment em até 1 min
- ✅ Lambda Duration estável (< 2s avg)
- ✅ Queue Age < 60s
- ✅ Zero erros Lambda
- ✅ Zero mensagens DLQ

**Critérios de Rollback**:
- ❌ Alarme em ALARM por > 5 min
- ❌ Lambda Errors > 5% das invocações
- ❌ Queue Age > 10 min (backlog)
- ❌ < 80% dos feedbacks com sentiment

### Fase 3: Produção Estável (24-48h)

**Objetivo**: Confirmar operação normal antes de frontend

**Ações**:
1. Monitorar diariamente
2. Revisar custos (NAT Gateway + Lambda + Comprehend)
3. Ajustar alarmes se necessário

**Critérios de Sucesso**:
- ✅ 48h sem alarmes
- ✅ Custo dentro do esperado (~$35-40/mês)
- ✅ Reconciler processa < 5% dos feedbacks (maioria via SQS)

## Comandos de Rollout

### 1. Ativar Flag (Backend)

```bash
# Editar backend/src/config/index.ts
sentiment: {
  enabled: true,  // <-- ON
  sqsQueueUrl: process.env.SENTIMENT_SQS_QUEUE_URL,
  reconcilerIntervalMinutes: parseInt(process.env.SENTIMENT_RECONCILER_INTERVAL_MINUTES || '5'),
  reconcilerBatchSize: parseInt(process.env.SENTIMENT_RECONCILER_BATCH_SIZE || '100')
}
```

**Ou via Environment Variable** (preferível):
```bash
# ECS Task Definition
SENTIMENT_ANALYSIS_ENABLED=true
```

### 2. Deploy Backend

```bash
cd /home/goes/kaviar

# Build e push
docker build -t kaviar-backend:sentiment-rollout ./backend
docker tag kaviar-backend:sentiment-rollout 847895361928.dkr.ecr.us-east-2.amazonaws.com/kaviar-backend:sentiment-rollout
docker push 847895361928.dkr.ecr.us-east-2.amazonaws.com/kaviar-backend:sentiment-rollout

# Update ECS service
aws ecs update-service \
  --cluster kaviar-cluster \
  --service kaviar-backend-service \
  --force-new-deployment \
  --region us-east-2
```

### 3. Verificar Deploy

```bash
# Aguardar rolling update
aws ecs wait services-stable \
  --cluster kaviar-cluster \
  --services kaviar-backend-service \
  --region us-east-2

# Verificar versão
curl -s https://api.kaviar.com.br/api/health | jq -r '.version'
```

### 4. Criar Feedback de Teste

```bash
# Obter token de passageiro
PASSENGER_TOKEN="<token>"

# Criar feedback
FEEDBACK_RESPONSE=$(curl -X POST https://api.kaviar.com.br/api/passenger/ride-feedback \
  -H "Authorization: Bearer $PASSENGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rideId": "<ride-id>",
    "rating": 5,
    "comment": "Motorista muito educado e pontual!"
  }')

FEEDBACK_ID=$(echo $FEEDBACK_RESPONSE | jq -r '.id')
echo "Feedback criado: $FEEDBACK_ID"
```

### 5. Monitorar Processamento

```bash
# Verificar SQS
aws sqs get-queue-attributes \
  --queue-url https://sqs.us-east-2.amazonaws.com/847895361928/kaviar-sentiment-analysis \
  --attribute-names ApproximateNumberOfMessagesVisible,ApproximateNumberOfMessagesNotVisible \
  --region us-east-2

# Aguardar Lambda (30s)
sleep 30

# Verificar logs Lambda
aws logs tail /aws/lambda/kaviar-sentiment-processor \
  --since 2m \
  --region us-east-2 \
  --format short | grep -E "(SUCCESS|ERROR)"
```

### 6. Validar DB via Admin API

```bash
# Obter token admin
ADMIN_TOKEN="<token>"

# Buscar feedback
curl https://api.kaviar.com.br/api/admin/ride-feedback/$FEEDBACK_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | jq '.sentimentAnalysis'

# Esperado:
# {
#   "sentimentLabel": "POSITIVE",
#   "sentimentScore": 0.98,
#   "confidenceScore": 0.98,
#   "modelVersion": "aws-comprehend-2023",
#   "analyzedAt": "2026-02-09T12:30:00.000Z"
# }
```

### 7. Monitorar Alarmes

```bash
# Verificar estado dos alarmes
aws cloudwatch describe-alarms \
  --region us-east-2 \
  --query 'MetricAlarms[?contains(AlarmName, `KAVIAR-Sentiment`)].{Name:AlarmName,State:StateValue,Reason:StateReason}' \
  --output table

# Esperado: todos em OK
```

### 8. Verificar Métricas

```bash
# Lambda Invocations (últimas 1h)
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=kaviar-sentiment-processor \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum \
  --region us-east-2

# Lambda Errors (últimas 1h)
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Errors \
  --dimensions Name=FunctionName,Value=kaviar-sentiment-processor \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum \
  --region us-east-2

# SQS Messages Sent (últimas 1h)
aws cloudwatch get-metric-statistics \
  --namespace AWS/SQS \
  --metric-name NumberOfMessagesSent \
  --dimensions Name=QueueName,Value=kaviar-sentiment-analysis \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum \
  --region us-east-2
```

## Comandos de Rollback

### Rollback Rápido (< 1 min)

```bash
# 1. Desabilitar flag (backend)
# Editar backend/src/config/index.ts
sentiment: {
  enabled: false,  // <-- OFF
  ...
}

# 2. Deploy backend
docker build -t kaviar-backend:rollback ./backend
docker tag kaviar-backend:rollback 847895361928.dkr.ecr.us-east-2.amazonaws.com/kaviar-backend:rollback
docker push 847895361928.dkr.ecr.us-east-2.amazonaws.com/kaviar-backend:rollback

aws ecs update-service \
  --cluster kaviar-cluster \
  --service kaviar-backend-service \
  --force-new-deployment \
  --region us-east-2

# 3. Aguardar deploy
aws ecs wait services-stable \
  --cluster kaviar-cluster \
  --services kaviar-backend-service \
  --region us-east-2

# 4. Verificar
curl -s https://api.kaviar.com.br/api/health | jq -r '.version'
```

**Comportamento após rollback**:
- ✅ POST /api/passenger/ride-feedback não enfileira (sem log `Enqueued`)
- ✅ Lambda continua processando fila existente (drena naturalmente)
- ✅ Reconciler para de processar (flag OFF)
- ✅ Sistema volta ao estado Fase 5 (sem sentiment)

### Rollback Emergencial (desabilitar Lambda)

```bash
# Desabilitar event source mapping (para processamento imediato)
EVENT_SOURCE_UUID=$(aws lambda list-event-source-mappings \
  --function-name kaviar-sentiment-processor \
  --region us-east-2 \
  --query 'EventSourceMappings[0].UUID' \
  --output text)

aws lambda update-event-source-mapping \
  --uuid $EVENT_SOURCE_UUID \
  --enabled false \
  --region us-east-2

echo "Lambda desabilitada. Mensagens ficam na fila (não são perdidas)."
```

**Quando usar**:
- Lambda causando erros críticos no DB
- Custo inesperado (Comprehend throttling)
- Bug crítico descoberto

**Reabilitar**:
```bash
aws lambda update-event-source-mapping \
  --uuid $EVENT_SOURCE_UUID \
  --enabled true \
  --region us-east-2
```

## Checklist de Validação

### Smoke Test (15 min)
- [ ] Flag ON no backend
- [ ] Deploy backend concluído
- [ ] Feedback criado via API (201)
- [ ] Backend enfileirou (log `Enqueued`)
- [ ] SQS recebeu mensagem (ApproximateNumberOfMessages > 0)
- [ ] Lambda processou (log `SUCCESS`)
- [ ] DB tem sentiment (Admin API retorna `sentimentAnalysis`)
- [ ] Todos os alarmes em OK
- [ ] DLQ vazia (0 mensagens)

### Monitoramento Estendido (1-2h)
- [ ] 10+ feedbacks processados
- [ ] 95%+ com sentiment em < 1 min
- [ ] Lambda Duration < 2s (avg)
- [ ] Lambda Errors = 0
- [ ] Queue Age < 60s
- [ ] DLQ vazia
- [ ] Alarmes em OK

### Produção Estável (24-48h)
- [ ] 48h sem alarmes
- [ ] Custo dentro do esperado
- [ ] Reconciler processa < 5%
- [ ] Logs sem erros críticos

## Métricas de Sucesso

### SLA Target
- **Latência**: 95% dos feedbacks com sentiment em < 1 min
- **Disponibilidade**: 99.9% (< 43 min downtime/mês)
- **Taxa de erro**: < 0.1% (1 erro a cada 1000 feedbacks)

### Performance Target
- **Lambda Duration**: < 2s (avg), < 5s (p99)
- **Queue Age**: < 60s (normal), < 600s (alarme)
- **Throughput**: 100 feedbacks/hora (pico esperado)

### Custo Target
- **NAT Gateway**: $32/mês
- **Lambda**: $5/mês (100k invocações)
- **Comprehend**: $3/mês (100k caracteres)
- **SQS**: $0.50/mês
- **CloudWatch**: $2/mês
- **Total**: ~$42/mês

## Troubleshooting

### Problema: Feedback sem sentiment após 2 min

**Diagnóstico**:
```bash
# 1. Verificar se backend enfileirou
# Buscar logs ECS com feedback ID

# 2. Verificar se mensagem está na fila
aws sqs receive-message \
  --queue-url https://sqs.us-east-2.amazonaws.com/847895361928/kaviar-sentiment-analysis \
  --max-number-of-messages 10 \
  --region us-east-2

# 3. Verificar logs Lambda
aws logs tail /aws/lambda/kaviar-sentiment-processor \
  --since 5m \
  --region us-east-2 \
  --format short | grep -i error
```

**Soluções**:
- Backend não enfileirou: verificar flag + SQS permissions
- Mensagem na fila: Lambda não está processando (verificar event source mapping)
- Lambda com erro: verificar logs (DB connection, Comprehend throttling)

### Problema: Lambda Errors > 0

**Diagnóstico**:
```bash
# Buscar erro específico
aws logs filter-log-events \
  --log-group-name /aws/lambda/kaviar-sentiment-processor \
  --start-time $(($(date +%s) - 3600))000 \
  --filter-pattern "ERROR" \
  --region us-east-2 \
  | jq -r '.events[].message'
```

**Soluções**:
- `ETIMEDOUT`: Verificar NAT Gateway + Comprehend endpoint
- `P2024/P2034`: DB connection issue (verificar RDS + SG)
- `ThrottlingException`: Comprehend rate limit (reduzir batch size)

### Problema: Queue Backlog (> 50 mensagens)

**Diagnóstico**:
```bash
# Verificar Lambda concurrency
aws lambda get-function-concurrency \
  --function-name kaviar-sentiment-processor \
  --region us-east-2

# Verificar Lambda throttles
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Throttles \
  --dimensions Name=FunctionName,Value=kaviar-sentiment-processor \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum \
  --region us-east-2
```

**Soluções**:
- Aumentar reserved concurrency (default: 10)
- Aumentar batch size (10 → 20)
- Reduzir Lambda timeout (90s → 60s)

## Próximos Passos (PR6)

Após 48h de operação estável:

1. **Frontend - Admin Dashboard**:
   - Chip de sentiment na lista de feedbacks
   - Estado "Processando..." quando `sentimentAnalysis === null`
   - Tooltip com confidence score

2. **Frontend - Passenger App** (opcional):
   - Mostrar sentiment do próprio feedback
   - Estatísticas agregadas (% positive/negative)

3. **Analytics**:
   - Dashboard com distribuição de sentiments
   - Correlação sentiment × rating
   - Alertas para spike de negative sentiment

---

## Evidências - Smoke Test

### 1. Task Definition Atualizada

**Revision**: 74

**Environment Variables**:
```
SENTIMENT_ANALYSIS_ENABLED=true
SENTIMENT_RECONCILER_BATCH_SIZE=100
SENTIMENT_QUEUE_URL=https://sqs.us-east-2.amazonaws.com/847895361928/kaviar-sentiment-analysis
SENTIMENT_RECONCILER_INTERVAL=5
```

**Comando**:
```bash
$ aws ecs describe-task-definition \
  --task-definition kaviar-backend:74 \
  --region us-east-2 \
  --query 'taskDefinition.containerDefinitions[0].environment'

SENTIMENT_ANALYSIS_ENABLED=true
SENTIMENT_RECONCILER_BATCH_SIZE=100
SENTIMENT_QUEUE_URL=https://sqs.us-east-2.amazonaws.com/847895361928/kaviar-sentiment-analysis
SENTIMENT_RECONCILER_INTERVAL=5
```

### 2. Service Deployment

**Service**: kaviar-backend-service  
**Task Definition**: kaviar-backend:74  
**Status**: STABLE  
**Desired Count**: 2

**Comando**:
```bash
$ aws ecs update-service \
  --cluster kaviar-cluster \
  --service kaviar-backend-service \
  --task-definition kaviar-backend:74 \
  --force-new-deployment \
  --region us-east-2

ServiceName: kaviar-backend-service
TaskDefinition: arn:aws:ecs:us-east-2:847895361928:task-definition/kaviar-backend:74
DesiredCount: 2

$ aws ecs wait services-stable --cluster kaviar-cluster --services kaviar-backend-service --region us-east-2
✅ Service estável
```

### 3. Feedback Processado

**Feedback ID**: test-feedback-pr3-1770635515955  
**Message ID**: bb93a9e8-19ca-4d99-b189-b7b15328ecb3  
**Timestamp**: 2026-02-09T12:45:43Z

**Lambda Logs**:
```
2026-02-09T12:45:43 [Sentiment] Processing: {
  feedbackId: 'test-feedback-pr3-1770635515955',
  messageId: 'bb93a9e8-19ca-4d99-b189-b7b15328ecb3',
  attempt: 1
}

2026-02-09T12:45:43 [Sentiment] Step: db_fetch { duration_ms: 32 }
2026-02-09T12:45:43 [Sentiment] Step: comprehend_call { duration_ms: 235 }
2026-02-09T12:45:43 [Sentiment] Step: db_upsert { duration_ms: 11 }

2026-02-09T12:45:43 [Sentiment] SUCCESS: {
  messageId: 'bb93a9e8-19ca-4d99-b189-b7b15328ecb3',
  sentiment: 'POSITIVE',
  timings: {
    db_fetch_ms: 32,
    comprehend_ms: 235,
    db_upsert_ms: 11,
    total_ms: 280
  }
}
```

**Resultado**:
- ✅ Sentiment: **POSITIVE**
- ✅ Total time: **280ms** (< 1s)
- ✅ DB fetch: 32ms
- ✅ Comprehend: 235ms
- ✅ DB upsert: 11ms

### 4. Alarmes CloudWatch

**Estado**: Todos em OK

```
$ aws cloudwatch describe-alarms --region us-east-2 \
  --query 'MetricAlarms[?contains(AlarmName, `KAVIAR-Sentiment`)].{Name:AlarmName,State:StateValue}'

+-------------------------------------+--------+
|                Name                 | State  |
+-------------------------------------+--------+
|  KAVIAR-Sentiment-DLQ-NotEmpty      |  OK    |
|  KAVIAR-Sentiment-Lambda-Errors     |  OK    |
|  KAVIAR-Sentiment-Lambda-Throttles  |  OK    |
|  KAVIAR-Sentiment-Queue-Age         |  OK    |
|  KAVIAR-Sentiment-Queue-Backlog     |  OK    |
+-------------------------------------+--------+
```

### 5. Filas SQS

**Fila Principal** (kaviar-sentiment-analysis):
```json
{
  "MessagesVisible": "0",
  "MessagesNotVisible": "0",
  "MessagesDelayed": "0"
}
```

**DLQ** (kaviar-sentiment-dlq):
```json
{
  "DLQMessages": "0"
}
```

### 6. Métricas Lambda (última 1h)

**Invocations**: 1  
**Errors**: 0  
**Success Rate**: 100%

```bash
$ aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=kaviar-sentiment-processor \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Sum \
  --region us-east-2

Invocations: 1.0

$ aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Errors \
  --dimensions Name=FunctionName,Value=kaviar-sentiment-processor \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Sum \
  --region us-east-2

Errors: 0.0
```

## Checklist Smoke Test

- [x] Task definition atualizada com SENTIMENT_QUEUE_URL
- [x] Service deployment concluído (STABLE)
- [x] Feedback enviado para SQS
- [x] Lambda processou em < 1s (280ms)
- [x] Sentiment detectado: POSITIVE
- [x] Todos os alarmes em OK
- [x] DLQ vazia (0 mensagens)
- [x] Lambda Errors = 0
- [x] Timings dentro do esperado (< 2s)

## Status

**Fase 1 (Smoke Test)**: ✅ **CONCLUÍDO**  
**Data**: 2026-02-09  
**Duração**: 15 min  
**Resultado**: Sucesso - Sistema processando sentiment corretamente

**Próximo**: Fase 2 - Monitoramento Estendido (1-2h com tráfego orgânico)

---

**Status**: ✅ Smoke Test Concluído  
**Pré-requisito**: PR4 concluído  
**Próximo**: Monitoramento Estendido (aguardar tráfego orgânico)
