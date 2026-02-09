# PR4: Observabilidade - Sentiment Analysis

## Objetivo

Implementar observabilidade essencial para monitorar o pipeline de sentiment analysis antes do rollout em produção.

## Alarmes CloudWatch

### 1. DLQ Not Empty (já existente)
```bash
Alarme: KAVIAR-Sentiment-DLQ-NotEmpty
Métrica: ApproximateNumberOfMessagesVisible (kaviar-sentiment-dlq)
Threshold: >= 1 mensagem
Período: 60s
Avaliação: 1 período
Ação: SNS kaviar-alerts
```

**Significado**: Mensagens falharam 3x e foram para DLQ (erro crítico)

### 2. Lambda Errors
```bash
Alarme: KAVIAR-Sentiment-Lambda-Errors
Métrica: Errors (kaviar-sentiment-processor)
Threshold: >= 1 erro
Período: 300s (5 min)
Avaliação: 1 período
Ação: SNS kaviar-alerts
```

**Significado**: Lambda teve erro não tratado (bug no código ou infra)

**Comando**:
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name KAVIAR-Sentiment-Lambda-Errors \
  --alarm-description "Lambda sentiment processor has errors" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --dimensions Name=FunctionName,Value=kaviar-sentiment-processor \
  --alarm-actions arn:aws:sns:us-east-2:847895361928:kaviar-alerts \
  --treat-missing-data notBreaching \
  --region us-east-2
```

### 3. Lambda Throttles
```bash
Alarme: KAVIAR-Sentiment-Lambda-Throttles
Métrica: Throttles (kaviar-sentiment-processor)
Threshold: >= 1 throttle
Período: 300s (5 min)
Avaliação: 1 período
Ação: SNS kaviar-alerts
```

**Significado**: Lambda atingiu limite de concorrência (precisa aumentar reserved concurrency)

**Comando**:
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name KAVIAR-Sentiment-Lambda-Throttles \
  --alarm-description "Lambda sentiment processor is being throttled" \
  --metric-name Throttles \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --dimensions Name=FunctionName,Value=kaviar-sentiment-processor \
  --alarm-actions arn:aws:sns:us-east-2:847895361928:kaviar-alerts \
  --treat-missing-data notBreaching \
  --region us-east-2
```

### 4. Queue Backlog
```bash
Alarme: KAVIAR-Sentiment-Queue-Backlog
Métrica: ApproximateNumberOfMessagesVisible (kaviar-sentiment-analysis)
Threshold: >= 50 mensagens
Período: 300s (5 min)
Avaliação: 2 períodos consecutivos (10 min)
Ação: SNS kaviar-alerts
```

**Significado**: Fila acumulando mensagens (Lambda não processa rápido o suficiente)

**Comando**:
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name KAVIAR-Sentiment-Queue-Backlog \
  --alarm-description "Sentiment queue has significant backlog" \
  --metric-name ApproximateNumberOfMessagesVisible \
  --namespace AWS/SQS \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 50 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --dimensions Name=QueueName,Value=kaviar-sentiment-analysis \
  --alarm-actions arn:aws:sns:us-east-2:847895361928:kaviar-alerts \
  --treat-missing-data notBreaching \
  --region us-east-2
```

### 5. Queue Age
```bash
Alarme: KAVIAR-Sentiment-Queue-Age
Métrica: ApproximateAgeOfOldestMessage (kaviar-sentiment-analysis)
Threshold: >= 600 segundos (10 min)
Período: 300s (5 min)
Avaliação: 2 períodos consecutivos (10 min)
Ação: SNS kaviar-alerts
```

**Significado**: Mensagem mais antiga está há muito tempo na fila (atraso de processamento)

**Comando**:
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name KAVIAR-Sentiment-Queue-Age \
  --alarm-description "Sentiment queue has old unprocessed messages" \
  --metric-name ApproximateAgeOfOldestMessage \
  --namespace AWS/SQS \
  --statistic Maximum \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 600 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --dimensions Name=QueueName,Value=kaviar-sentiment-analysis \
  --alarm-actions arn:aws:sns:us-east-2:847895361928:kaviar-alerts \
  --treat-missing-data notBreaching \
  --region us-east-2
```

## Estado Atual dos Alarmes

```
KAVIAR-Sentiment-DLQ-NotEmpty: OK
KAVIAR-Sentiment-Lambda-Errors: OK
KAVIAR-Sentiment-Lambda-Throttles: OK
KAVIAR-Sentiment-Queue-Age: OK
KAVIAR-Sentiment-Queue-Backlog: OK
```

**Verificação**:
```bash
aws cloudwatch describe-alarms \
  --region us-east-2 \
  --query 'MetricAlarms[?contains(AlarmName, `KAVIAR-Sentiment`)].{Name:AlarmName,State:StateValue}' \
  --output table
```

## Métricas Monitoradas (sem alarme)

### Lambda
- **Invocations**: Total de invocações
- **Duration**: Tempo de execução (avg/max)
- **ConcurrentExecutions**: Execuções simultâneas

### SQS
- **NumberOfMessagesSent**: Mensagens enviadas (backend enqueue)
- **NumberOfMessagesReceived**: Mensagens recebidas (Lambda poll)
- **NumberOfMessagesDeleted**: Mensagens processadas com sucesso
- **ApproximateNumberOfMessagesNotVisible**: Mensagens em processamento (in-flight)

**Consulta**:
```bash
# Lambda Duration (últimas 24h)
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=kaviar-sentiment-processor \
  --start-time $(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Average,Maximum \
  --region us-east-2

# SQS Message Flow (últimas 24h)
aws cloudwatch get-metric-statistics \
  --namespace AWS/SQS \
  --metric-name NumberOfMessagesSent \
  --dimensions Name=QueueName,Value=kaviar-sentiment-analysis \
  --start-time $(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Sum \
  --region us-east-2
```

## Dashboard CloudWatch

**Nome**: `KAVIAR-Sentiment-Analysis`

**Widgets**:
1. Lambda: Invocations / Errors / Throttles (timeseries)
2. Lambda: Duration avg/max (timeseries)
3. SQS: Queue Depth (Visible + NotVisible)
4. SQS: Age of Oldest Message
5. SQS: Message Flow (Sent/Received/Deleted)
6. SQS: DLQ Messages

**Acesso**: Console AWS CloudWatch → Dashboards → KAVIAR-Sentiment-Analysis

**Nota**: Dashboard criado via console (sintaxe JSON via CLI tem limitações)

## Notificações SNS

**Tópico**: `kaviar-alerts`  
**ARN**: `arn:aws:sns:us-east-2:847895361928:kaviar-alerts`  
**Subscriber**: Email confirmado e testado

**Teste**:
```bash
aws sns publish \
  --topic-arn arn:aws:sns:us-east-2:847895361928:kaviar-alerts \
  --subject "Test: Sentiment Observability" \
  --message "PR4 observability setup complete" \
  --region us-east-2
```

## Logs CloudWatch

**Log Group**: `/aws/lambda/kaviar-sentiment-processor`

**Retention**: 7 dias (padrão Lambda)

**Queries úteis**:

### 1. Erros nas últimas 24h
```
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 100
```

### 2. Timings médios por etapa
```
fields @timestamp, @message
| filter @message like /Step:/
| parse @message /Step: (?<step>\w+) { duration_ms: (?<duration>\d+) }/
| stats avg(duration) by step
```

### 3. Sentiments detectados
```
fields @timestamp, @message
| filter @message like /SUCCESS/
| parse @message /sentiment: '(?<sentiment>\w+)'/
| stats count() by sentiment
```

### 4. Taxa de sucesso vs erro
```
fields @timestamp, @message
| filter @message like /SUCCESS/ or @message like /ERROR/
| stats count(@message) by @message like /SUCCESS/ as success
```

**Acesso via CLI**:
```bash
# Tail logs em tempo real
aws logs tail /aws/lambda/kaviar-sentiment-processor \
  --follow \
  --region us-east-2

# Buscar erros nas últimas 2h
aws logs filter-log-events \
  --log-group-name /aws/lambda/kaviar-sentiment-processor \
  --start-time $(($(date +%s) - 7200))000 \
  --filter-pattern "ERROR" \
  --region us-east-2
```

## Critérios de Sucesso PR4

- [x] 5 alarmes criados e em estado OK
- [x] SNS topic configurado com email confirmado
- [x] DLQ purgada (alarme OK)
- [x] Logs Lambda acessíveis e estruturados
- [x] Documentação completa

## Próximos Passos (PR5)

1. **Rollout Controlado**:
   - Flag `SENTIMENT_ANALYSIS_ENABLED=true` em janela controlada
   - Monitorar alarmes por 1h
   - Validar % de feedbacks com sentiment != null

2. **Critérios de Rollback**:
   - Qualquer alarme em ALARM por > 5 min
   - DLQ com mensagens
   - Lambda Errors > 5% das invocações
   - Queue Age > 10 min

3. **Ação de Rollback**:
   ```bash
   # Flag OFF no backend
   SENTIMENT_ANALYSIS_ENABLED=false
   
   # Desabilitar event source mapping (opcional)
   aws lambda update-event-source-mapping \
     --uuid <mapping-uuid> \
     --enabled false \
     --region us-east-2
   ```

## Custos Estimados

- **CloudWatch Alarmes**: $0.10/alarme/mês × 5 = **$0.50/mês**
- **CloudWatch Logs**: $0.50/GB ingestão + $0.03/GB armazenamento ≈ **$1-2/mês**
- **SNS**: $0.50/milhão notificações ≈ **$0.01/mês**
- **Total PR4**: **~$2-3/mês**

## Evidências

### Alarmes Criados
```bash
$ aws cloudwatch describe-alarms --region us-east-2 \
  --query 'MetricAlarms[?contains(AlarmName, `KAVIAR-Sentiment`)].{Name:AlarmName,State:StateValue}'

KAVIAR-Sentiment-DLQ-NotEmpty: OK
KAVIAR-Sentiment-Lambda-Errors: OK
KAVIAR-Sentiment-Lambda-Throttles: OK
KAVIAR-Sentiment-Queue-Age: OK
KAVIAR-Sentiment-Queue-Backlog: OK
```

### DLQ Purgada
```bash
$ aws sqs get-queue-attributes \
  --queue-url https://sqs.us-east-2.amazonaws.com/847895361928/kaviar-sentiment-dlq \
  --attribute-names ApproximateNumberOfMessages \
  --region us-east-2

ApproximateNumberOfMessages: 0
```

### Lambda Logs Estruturados
```
2026-02-09T11:39:51 [Sentiment] Step: db_fetch { duration_ms: 26 }
2026-02-09T11:39:52 [Sentiment] Step: comprehend_call { duration_ms: 271 }
2026-02-09T11:39:52 [Sentiment] Step: db_upsert { duration_ms: 9 }
2026-02-09T11:39:52 [Sentiment] SUCCESS: {
  messageId: '99cc9aa5-e24f-4446-9878-f82c9d9d0032',
  sentiment: 'POSITIVE',
  timings: { db_fetch_ms: 26, comprehend_ms: 271, db_upsert_ms: 9, total_ms: 306 }
}
```

---

**Status**: ✅ PR4 Concluído  
**Data**: 2026-02-09  
**Próximo**: PR5 - Rollout Controlado
