# FASE 6 - PR 2: AWS Infrastructure (SQS + Lambda + IAM)

**Data**: 2026-02-09  
**Status**: ✅ Implementado  
**Commit**: (pending)

---

## Recursos Criados

### 1. SQS Queues

#### Queue Principal (STANDARD)
- **Nome**: `kaviar-sentiment-analysis`
- **URL**: `https://sqs.us-east-2.amazonaws.com/847895361928/kaviar-sentiment-analysis`
- **ARN**: `arn:aws:sqs:us-east-2:847895361928:kaviar-sentiment-analysis`
- **Tipo**: STANDARD (at-least-once delivery)
- **Configuração**:
  - VisibilityTimeout: 300s (5 min)
  - MessageRetentionPeriod: 86400s (24h)
  - ReceiveMessageWaitTimeSeconds: 20s (long polling)
  - RedrivePolicy: Max 3 tentativas → DLQ

#### Dead Letter Queue (DLQ)
- **Nome**: `kaviar-sentiment-dlq`
- **URL**: `https://sqs.us-east-2.amazonaws.com/847895361928/kaviar-sentiment-dlq`
- **ARN**: `arn:aws:sqs:us-east-2:847895361928:kaviar-sentiment-dlq`
- **Retenção**: 14 dias (default)

**Redrive Policy**:
```json
{
  "deadLetterTargetArn": "arn:aws:sqs:us-east-2:847895361928:kaviar-sentiment-dlq",
  "maxReceiveCount": 3
}
```

---

### 2. Lambda Function

- **Nome**: `kaviar-sentiment-processor`
- **ARN**: `arn:aws:lambda:us-east-2:847895361928:function:kaviar-sentiment-processor`
- **Runtime**: nodejs20.x
- **Timeout**: 60s
- **Memory**: 512 MB
- **Handler**: index.handler

**Event Source Mapping**:
- **UUID**: `3c62d911-1b0e-4bed-a562-fa83348d8237`
- **Batch Size**: 10 mensagens
- **Function Response Types**: `ReportBatchItemFailures` (partial batch failure)

**Código (Scaffold)**:
```javascript
export const handler = async (event) => {
  // Recebe mensagens do SQS
  // Loga feedbackId
  // Retorna sucesso (mensagem deletada)
  // TODO PR3: Integrar Comprehend + DB
};
```

---

### 3. IAM Roles e Policies

#### Lambda Role
- **Nome**: `KaviarSentimentLambdaRole`
- **ARN**: `arn:aws:iam::847895361928:role/KaviarSentimentLambdaRole`
- **Trust Policy**: `lambda.amazonaws.com`

#### Lambda Policy (Least Privilege)
- **Nome**: `KaviarSentimentLambdaPolicy`
- **ARN**: `arn:aws:iam::847895361928:policy/KaviarSentimentLambdaPolicy`

**Permissões**:
```json
{
  "CloudWatchLogs": [
    "logs:CreateLogGroup",
    "logs:CreateLogStream",
    "logs:PutLogEvents"
  ],
  "SQS": [
    "sqs:ReceiveMessage",
    "sqs:DeleteMessage",
    "sqs:GetQueueAttributes"
  ],
  "Comprehend": [
    "comprehend:DetectSentiment"
  ]
}
```

#### Backend Policy (ECS Task Role)
- **Nome**: `KaviarBackendSentimentSQSPolicy`
- **ARN**: `arn:aws:iam::847895361928:policy/KaviarBackendSentimentSQSPolicy`
- **Attached to**: `KaviarEcsTaskRole`

**Permissões**:
```json
{
  "SQS": [
    "sqs:SendMessage",
    "sqs:GetQueueUrl"
  ]
}
```

---

## Melhorias Implementadas (PR1 → PR2)

### 1. Enqueue Non-blocking (Garantido)

**Antes**:
```typescript
void enqueueSentimentAnalysis(feedback.id);
```

**Depois**:
```typescript
void enqueueSentimentAnalysis(feedback.id).catch(err => {
  console.error('[Sentiment] Enqueue failed (non-blocking):', err);
});
```

✅ Garante que erros não propagam para o request path

---

### 2. Reconciler Single-Instance Mode

**Problema**: Múltiplas instâncias ECS reenfileirando os mesmos feedbacks

**Solução**: PostgreSQL Advisory Lock

```typescript
const LOCK_ID = 987654321;

// Tentar adquirir lock (non-blocking)
const lockResult = await prisma.$queryRaw`
  SELECT pg_try_advisory_lock(${LOCK_ID})
`;

if (!lockAcquired) {
  console.log('[Sentiment Reconciler] Skipped (another instance running)');
  return;
}

try {
  // Processar feedbacks
} finally {
  await prisma.$queryRaw`SELECT pg_advisory_unlock(${LOCK_ID})`;
}
```

**Comportamento**:
- Instância 1: Adquire lock → Processa
- Instância 2: Falha ao adquirir lock → Skip silencioso
- Instância 3+: Skip silencioso

**Log**:
```
[Sentiment Reconciler] Skipped (another instance running)
```

---

## Testes de Integração

### Teste 1: Enviar Mensagem → Lambda Processa

**Comando**:
```bash
aws sqs send-message \
  --queue-url https://sqs.us-east-2.amazonaws.com/847895361928/kaviar-sentiment-analysis \
  --message-body '{"rideFeedbackId":"test-feedback-123"}' \
  --region us-east-2
```

**Resultado**:
- ✅ MessageId: `049839af-df49-4705-843e-52f3c6b1bc66`

**Lambda Logs**:
```
[Sentiment Lambda] Received event: {"recordCount":1,"timestamp":"2026-02-09T10:58:43.988Z"}
[Sentiment Lambda] Processing feedback: {
  feedbackId: 'test-feedback-123',
  messageId: '049839af-df49-4705-843e-52f3c6b1bc66',
  receiptHandle: 'AQEBSDkg/PKOqn8SwYgn...'
}
[Sentiment Lambda] Processed successfully: test-feedback-123
Duration: 8.65 ms | Billed Duration: 152 ms | Memory Used: 69 MB
```

**Fila após processamento**:
```json
{
  "MessagesAvailable": "0",
  "MessagesInFlight": "0"
}
```

✅ Mensagem deletada com sucesso

---

### Teste 2: Verificar Redrive Policy

**Comando**:
```bash
aws sqs get-queue-attributes \
  --queue-url https://sqs.us-east-2.amazonaws.com/847895361928/kaviar-sentiment-analysis \
  --attribute-names RedrivePolicy \
  --region us-east-2
```

**Resultado**:
```json
{
  "RedrivePolicy": "{\"deadLetterTargetArn\":\"arn:aws:sqs:us-east-2:847895361928:kaviar-sentiment-dlq\",\"maxReceiveCount\":3}"
}
```

✅ Redrive policy configurado corretamente

---

### Teste 3: Verificar Long Polling

**Comando**:
```bash
aws sqs get-queue-attributes \
  --queue-url https://sqs.us-east-2.amazonaws.com/847895361928/kaviar-sentiment-analysis \
  --attribute-names ReceiveMessageWaitTimeSeconds \
  --region us-east-2
```

**Resultado**:
```json
{
  "ReceiveMessageWaitTimeSeconds": "20"
}
```

✅ Long polling habilitado (20s)

---

## Segurança (Least Privilege)

### Lambda Permissions
- ✅ **SQS**: Apenas receive/delete da queue específica
- ✅ **Comprehend**: Apenas DetectSentiment (sem BatchDetect)
- ✅ **CloudWatch**: Apenas logs do próprio log group
- ❌ **Sem acesso**: RDS direto (PR3 vai adicionar via Secrets Manager)

### Backend Permissions
- ✅ **SQS**: Apenas SendMessage da queue específica
- ❌ **Sem acesso**: ReceiveMessage, DeleteMessage, Comprehend

### Network Security
- ✅ Lambda em VPC (mesma do RDS) - PR3
- ✅ Security Group permitindo Lambda → RDS - PR3

---

## Custos Estimados

### SQS
- **Requests**: $0.40 por 1M requests
- **Exemplo**: 1000 mensagens/mês = $0.0004

### Lambda
- **Invocations**: $0.20 por 1M requests
- **Compute**: $0.0000166667 por GB-segundo
- **Exemplo**: 1000 invocações (512MB, 2s) = $0.001

### Comprehend (PR3)
- **DetectSentiment**: $0.0001 por 100 chars
- **Exemplo**: 1000 feedbacks (200 chars) = $0.20

**Total**: ~$0.21/mês para 1000 feedbacks

---

## Checklist PR2

- [x] SQS queue STANDARD criada
- [x] DLQ criada
- [x] Redrive policy configurado (max 3 tentativas)
- [x] Long polling habilitado (20s)
- [x] Lambda function criada (scaffold)
- [x] Event source mapping configurado
- [x] IAM role Lambda (least privilege)
- [x] IAM policy Lambda (SQS + Comprehend + Logs)
- [x] IAM policy Backend (apenas SendMessage)
- [x] Enqueue non-blocking garantido (void + catch)
- [x] Reconciler single-instance mode (advisory lock)
- [x] Teste integração (mensagem → Lambda → delete)
- [x] Logs Lambda verificados
- [x] Fila vazia após processamento

---

## Evidências

### ARNs
```
Queue: arn:aws:sqs:us-east-2:847895361928:kaviar-sentiment-analysis
DLQ: arn:aws:sqs:us-east-2:847895361928:kaviar-sentiment-dlq
Lambda: arn:aws:lambda:us-east-2:847895361928:function:kaviar-sentiment-processor
Lambda Role: arn:aws:iam::847895361928:role/KaviarSentimentLambdaRole
Lambda Policy: arn:aws:iam::847895361928:policy/KaviarSentimentLambdaPolicy
Backend Policy: arn:aws:iam::847895361928:policy/KaviarBackendSentimentSQSPolicy
```

### Redrive Policy
```json
{
  "deadLetterTargetArn": "arn:aws:sqs:us-east-2:847895361928:kaviar-sentiment-dlq",
  "maxReceiveCount": 3
}
```

### Lambda Logs (Teste)
```
[Sentiment Lambda] Received event: {"recordCount":1}
[Sentiment Lambda] Processing feedback: {feedbackId: 'test-feedback-123'}
[Sentiment Lambda] Processed successfully: test-feedback-123
Duration: 8.65 ms | Memory Used: 69 MB
```

### Queue Status (Após Teste)
```json
{
  "MessagesAvailable": "0",
  "MessagesInFlight": "0"
}
```

---

## Próximo Passo

**PR3**: Lambda Processor + Comprehend + DB Integration
- [ ] Adicionar Prisma Client na Lambda
- [ ] Integrar AWS Comprehend
- [ ] UPSERT no banco (idempotência)
- [ ] Logs estruturados (sem PII)
- [ ] Testes end-to-end
