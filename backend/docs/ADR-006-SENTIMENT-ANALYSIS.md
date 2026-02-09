# ADR-006: Sentiment Analysis para Ride Feedbacks

**Status**: Proposto  
**Data**: 2026-02-09  
**Decisor**: Equipe KAVIAR  
**Contexto**: Fase 6 do sistema de feedback

---

## ⚠️ ADENDO (Ajustes Pré-Implementação)

**Data**: 2026-02-09 01:30  
**Motivo**: Simplificação e resiliência

### Mudanças Aprovadas:

1. **SQS Queue**: Trocar FIFO → STANDARD
   - FIFO não é necessário para análise de sentimento
   - Idempotência garantida no banco via UNIQUE(ride_feedback_id) + UPSERT
   - At-least-once delivery é aceitável (mensagens duplicadas toleradas)

2. **Payload Minimalista**: `{ rideFeedbackId }` apenas
   - Lambda busca `comment` e `tags` do DB (não passa pela fila)
   - Evita PII em logs do SQS/CloudWatch
   - Reduz tamanho da mensagem

3. **Delivery Resiliente**: Best-effort + Reconciler
   - **Primary**: Enqueue após commit do feedback (non-blocking, não pode derrubar POST)
   - **Fallback**: Reconciler scheduled (5min) que varre feedbacks sem análise e reenfileira
   - Garante que nenhum feedback fica sem análise mesmo se SQS falhar

---

## Contexto

Com a Fase 5 concluída (POST /api/passenger/ride-feedback), passageiros podem enviar feedbacks. A tabela `ride_feedback_sentiment_analysis` já existe no schema, mas não há processamento ativo. Precisamos implementar análise de sentimento **assíncrona** para enriquecer os feedbacks sem impactar a experiência do usuário.

---

## Decisão

### Arquitetura Escolhida: **SQS + Lambda**

**Fluxo**:
```
POST feedback → Salva DB → Envia SQS → Lambda processa → Salva sentimento
```

**Justificativa**:
- **Assíncrono**: Não bloqueia o POST do passageiro
- **Serverless**: Zero custo quando ocioso, escala automaticamente
- **Simples**: Menos infraestrutura que ECS worker dedicado
- **Idempotente**: Lambda pode ser retriada sem duplicação
- **DLQ nativa**: SQS oferece Dead Letter Queue out-of-the-box

**Alternativas rejeitadas**:
- ❌ **ECS Worker**: Custo fixo 24/7, over-engineering para volume inicial
- ❌ **Cron/Polling**: Lag alto, ineficiente, não escala bem

---

## Provedor de Análise

### Escolhido: **AWS Comprehend**

**Motivos**:
- ✅ Nativo AWS (sem API keys externas)
- ✅ Suporte a português (pt-BR)
- ✅ Pricing previsível ($0.0001/100 chars)
- ✅ Compliance AWS (dados não saem da região)
- ✅ API simples: `detectSentiment()`

**Output esperado**:
```json
{
  "Sentiment": "POSITIVE|NEUTRAL|NEGATIVE|MIXED",
  "SentimentScore": {
    "Positive": 0.95,
    "Neutral": 0.03,
    "Negative": 0.01,
    "Mixed": 0.01
  }
}
```

**Alternativa (futuro)**:
- OpenAI GPT-4 para análise mais sofisticada (categorização de problemas, sugestões)
- Implementar via feature flag `sentiment_provider=comprehend|openai`

---

## Estrutura de Dados

### Tabela Existente: `ride_feedback_sentiment_analysis`

```sql
CREATE TABLE ride_feedback_sentiment_analysis (
  id                TEXT PRIMARY KEY,
  ride_feedback_id  TEXT UNIQUE NOT NULL REFERENCES ride_feedbacks(id) ON DELETE CASCADE,
  sentiment_score   DECIMAL(5,4),      -- Score dominante (0.0000 a 1.0000)
  sentiment_label   VARCHAR(50),       -- POSITIVE|NEUTRAL|NEGATIVE|MIXED
  confidence_score  DECIMAL(5,4),      -- Confiança do modelo
  model_version     VARCHAR(100),      -- "aws-comprehend-2023" ou "openai-gpt-4"
  analyzed_at       TIMESTAMP,         -- Quando foi processado
  analysis_metadata TEXT,              -- JSON com scores detalhados
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW()
);
```

**Campos**:
- `sentiment_score`: Score do sentimento dominante (ex: 0.95 para POSITIVE)
- `sentiment_label`: Label legível (POSITIVE/NEUTRAL/NEGATIVE/MIXED)
- `confidence_score`: Confiança geral do modelo
- `model_version`: Identificador do provider/modelo usado
- `analysis_metadata`: JSON com payload completo do provider

**Idempotência**: 
- `ride_feedback_id` é UNIQUE no banco
- Lambda usa UPSERT (cria se não existe, atualiza se existe)
- Mensagens duplicadas do SQS são toleradas (at-least-once delivery)
- Reconciler pode reenfileirar sem risco de duplicação

---

## Implementação

### 1. Feature Flag

```typescript
// backend/src/config/index.ts
export const config = {
  sentiment: {
    enabled: process.env.SENTIMENT_ANALYSIS_ENABLED === 'true',
    provider: process.env.SENTIMENT_PROVIDER || 'comprehend',
    sqsQueueUrl: process.env.SENTIMENT_QUEUE_URL,
  }
};
```

**Variáveis de ambiente**:
- `SENTIMENT_ANALYSIS_ENABLED=false` (iniciar desligado)
- `SENTIMENT_PROVIDER=comprehend`
- `SENTIMENT_QUEUE_URL=https://sqs.us-east-2.amazonaws.com/.../sentiment-queue`

### 2. Enfileiramento (Backend)

```typescript
// backend/src/services/sentiment-queue.service.ts
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

export async function enqueueSentimentAnalysis(feedbackId: string) {
  if (!config.sentiment.enabled) return;
  
  const sqs = new SQSClient({ region: 'us-east-2' });
  
  // Best-effort: não pode derrubar o POST se SQS falhar
  try {
    await sqs.send(new SendMessageCommand({
      QueueUrl: config.sentiment.sqsQueueUrl,
      MessageBody: JSON.stringify({ rideFeedbackId: feedbackId }), // Apenas ID
    }));
  } catch (error) {
    // Log error mas não propaga (fallback reconciler vai pegar)
    console.error('Failed to enqueue sentiment (non-blocking):', error);
  }
}
```

**Integração no controller**:
```typescript
// backend/src/controllers/passenger/rideFeedback.controller.ts
const feedback = await prisma.ride_feedbacks.create({ ... });

// Enfileirar análise (best-effort, non-blocking)
enqueueSentimentAnalysis(feedback.id); // Fire-and-forget

return res.status(201).json({ ... });
```

**Reconciler (Fallback)**:
```typescript
// backend/src/jobs/sentiment-reconciler.ts
import { CronJob } from 'cron';

// Roda a cada 5 minutos
export const sentimentReconciler = new CronJob('*/5 * * * *', async () => {
  if (!config.sentiment.enabled) return;
  
  // Buscar feedbacks sem análise (criados nas últimas 24h)
  const pending = await prisma.ride_feedbacks.findMany({
    where: {
      created_at: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      ride_feedback_sentiment_analysis: null
    },
    select: { id: true },
    take: 100 // Batch de 100 por vez
  });
  
  // Reenfileirar
  for (const feedback of pending) {
    await enqueueSentimentAnalysis(feedback.id);
  }
  
  console.log(`Reconciler: enqueued ${pending.length} pending feedbacks`);
});
```

### 3. Lambda Processor

```typescript
// lambda/sentiment-processor/index.ts
import { SQSEvent } from 'aws-lambda';
import { ComprehendClient, DetectSentimentCommand } from '@aws-sdk/client-comprehend';
import { PrismaClient } from '@prisma/client';

const comprehend = new ComprehendClient({ region: 'us-east-2' });
const prisma = new PrismaClient();

export async function handler(event: SQSEvent) {
  for (const record of event.Records) {
    const { rideFeedbackId } = JSON.parse(record.body);
    
    // 1. Buscar feedback (busca comment no DB, não na fila)
    const feedback = await prisma.ride_feedbacks.findUnique({
      where: { id: rideFeedbackId },
      select: { id: true, comment: true }
    });
    
    if (!feedback?.comment) {
      console.log(`Feedback ${rideFeedbackId} has no comment, skipping`);
      continue;
    }
    
    // 2. Verificar se já foi processado (idempotência)
    const existing = await prisma.ride_feedback_sentiment_analysis.findUnique({
      where: { ride_feedback_id: rideFeedbackId }
    });
    
    if (existing) {
      console.log(`Feedback ${rideFeedbackId} already analyzed, skipping`);
      continue;
    }
    
    // 3. Analisar sentimento
    const result = await comprehend.send(new DetectSentimentCommand({
      Text: feedback.comment,
      LanguageCode: 'pt'
    }));
    
    // 4. Salvar resultado (UPSERT para idempotência)
    const dominantScore = result.SentimentScore[result.Sentiment];
    
    await prisma.ride_feedback_sentiment_analysis.upsert({
      where: { ride_feedback_id: rideFeedbackId },
      create: {
        id: `sentiment-${rideFeedbackId}`,
        ride_feedback_id: rideFeedbackId,
        sentiment_label: result.Sentiment,
        sentiment_score: dominantScore,
        confidence_score: dominantScore,
        model_version: 'aws-comprehend-2023',
        analyzed_at: new Date(),
        analysis_metadata: JSON.stringify(result.SentimentScore)
      },
      update: {
        sentiment_label: result.Sentiment,
        sentiment_score: dominantScore,
        confidence_score: dominantScore,
        analyzed_at: new Date(),
        analysis_metadata: JSON.stringify(result.SentimentScore)
      }
    });
    
    console.log(`Sentiment analyzed: ${rideFeedbackId} -> ${result.Sentiment}`);
  }
}
```

### 4. Infraestrutura (Terraform/CDK)

```hcl
# SQS Queue (STANDARD para at-least-once delivery)
resource "aws_sqs_queue" "sentiment_queue" {
  name                       = "kaviar-sentiment-analysis"
  visibility_timeout_seconds = 300
  message_retention_seconds  = 86400  # 24h
  receive_wait_time_seconds  = 20     # Long polling
  
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.sentiment_dlq.arn
    maxReceiveCount     = 3
  })
}

# Dead Letter Queue
resource "aws_sqs_queue" "sentiment_dlq" {
  name = "kaviar-sentiment-dlq"
  message_retention_seconds = 1209600  # 14 dias
}

# Lambda
resource "aws_lambda_function" "sentiment_processor" {
  function_name = "kaviar-sentiment-processor"
  runtime       = "nodejs20.x"
  handler       = "index.handler"
  timeout       = 60
  memory_size   = 512
  
  environment {
    variables = {
      DATABASE_URL = var.database_url
    }
  }
}

# Event Source Mapping
resource "aws_lambda_event_source_mapping" "sentiment_trigger" {
  event_source_arn = aws_sqs_queue.sentiment_queue.arn
  function_name    = aws_lambda_function.sentiment_processor.arn
  batch_size       = 10
  
  # Partial batch failure (reprocessa apenas mensagens que falharam)
  function_response_types = ["ReportBatchItemFailures"]
}
```

---

## Segurança e Conformidade

### 1. Sanitização
- ✅ Já implementada na Fase 5 (1000 chars max, trim)
- ✅ Reutilizar sem modificações

### 2. Logs e PII
- ❌ **NÃO logar comentários completos** (nem em SQS, nem em Lambda)
- ✅ Mensagem SQS contém apenas `{ rideFeedbackId }`
- ✅ Lambda busca comment do DB (não passa pela fila)
- ✅ Logar apenas: `feedbackId`, `sentiment_label`, `confidence_score`
- ✅ Usar correlation ID para rastreamento

### 3. Rate Limiting
- AWS Comprehend: 20 TPS (Transactions Per Second)
- Lambda concurrency: Limitar a 10 execuções simultâneas
- SQS batch: 10 mensagens por invocação

### 4. Retry e DLQ
- SQS: 3 tentativas antes de DLQ
- Lambda: Timeout 60s (suficiente para Comprehend)
- DLQ: Alarme CloudWatch para falhas persistentes
- Reconciler: Reenfileira feedbacks sem análise (fallback)

---

## Observabilidade

### Métricas (CloudWatch)

```typescript
// Lambda metrics
putMetric('SentimentAnalysis/Processed', 1);
putMetric('SentimentAnalysis/Failed', 1);
putMetric('SentimentAnalysis/Duration', duration);
putMetric('SentimentAnalysis/QueueLag', ageOfOldestMessage);
```

### Logs Estruturados

```json
{
  "timestamp": "2026-02-09T04:30:00Z",
  "level": "info",
  "feedbackId": "abc-123",
  "sentiment": "POSITIVE",
  "confidence": 0.95,
  "duration_ms": 234,
  "provider": "comprehend"
}
```

### Alarmes

- **DLQ não vazia**: Alerta se > 0 mensagens
- **Lambda errors**: Taxa de erro > 5%
- **Queue lag**: Idade da mensagem mais antiga > 5 min

---

## Admin API e Frontend

### Admin API (Fase 6.1)

```typescript
// backend/src/controllers/admin/rideFeedback.controller.ts
export async function listRideFeedbacks(req, res) {
  const feedbacks = await prisma.ride_feedbacks.findMany({
    include: {
      ride_feedback_sentiment_analysis: {
        select: {
          sentiment_label: true,
          sentiment_score: true,
          confidence_score: true,
          analyzed_at: true
        }
      }
    }
  });
  
  return res.json({
    success: true,
    data: feedbacks.map(f => ({
      ...f,
      sentiment: f.ride_feedback_sentiment_analysis ? {
        label: f.ride_feedback_sentiment_analysis.sentiment_label,
        score: f.ride_feedback_sentiment_analysis.sentiment_score,
        confidence: f.ride_feedback_sentiment_analysis.confidence_score,
        analyzedAt: f.ride_feedback_sentiment_analysis.analyzed_at
      } : null
    }))
  });
}
```

### Frontend (Fase 6.2 - Opcional)

```tsx
// frontend-app/src/components/admin/RideFeedbacks.tsx
{feedback.sentiment ? (
  <Chip 
    label={feedback.sentiment.label}
    color={
      feedback.sentiment.label === 'POSITIVE' ? 'success' :
      feedback.sentiment.label === 'NEGATIVE' ? 'error' : 'default'
    }
    size="small"
  />
) : (
  <Chip label="Processando..." variant="outlined" size="small" />
)}
```

---

## Custos Estimados

### AWS Comprehend
- **Preço**: $0.0001 por 100 caracteres
- **Exemplo**: Comentário de 200 chars = $0.0002
- **Volume**: 1000 feedbacks/mês = $0.20/mês

### Lambda
- **Preço**: $0.20 por 1M requests + $0.0000166667 por GB-segundo
- **Exemplo**: 1000 invocações/mês (512MB, 2s) = $0.001/mês

### SQS
- **Preço**: $0.40 por 1M requests
- **Exemplo**: 1000 mensagens/mês = $0.0004/mês

**Total estimado**: ~$0.21/mês para 1000 feedbacks

---

## Rollout e Rollback

### Rollout Controlado

1. **Fase 6.0**: Deploy Lambda + SQS (flag OFF)
2. **Fase 6.1**: Ativar flag em staging (10% feedbacks)
3. **Fase 6.2**: Monitorar 24h (DLQ, latência, custos)
4. **Fase 6.3**: Ativar 100% em produção
5. **Fase 6.4**: Ajustar Admin UI para exibir sentimento

### Rollback

**Cenário 1: Lambda com bugs**
```bash
# Desligar flag
aws ecs update-service --cluster kaviar-cluster \
  --service kaviar-backend-service \
  --environment SENTIMENT_ANALYSIS_ENABLED=false \
  --force-new-deployment
```

**Cenário 2: Custos inesperados**
```bash
# Pausar event source mapping
aws lambda update-event-source-mapping \
  --uuid <mapping-id> \
  --enabled false
```

**Cenário 3: Rollback completo**
- Desligar flag
- Pausar Lambda
- Purgar SQS queue
- Admin API continua funcionando (retorna `sentiment: null`)

---

## Critérios de Aceitação

### MVP Fase 6 Completo Quando:

1. ✅ Feedback novo → Sentimento aparece em < 5 min na Admin API
2. ✅ Reprocessamento idempotente (rodar 2x não duplica)
3. ✅ Falha do Comprehend → Mensagem vai para DLQ (não quebra backend)
4. ✅ Flag OFF → Backend funciona normalmente (sentiment = null)
5. ✅ Logs estruturados com feedbackId + sentiment
6. ✅ Alarme DLQ configurado e testado
7. ✅ Custo < $1/mês para 1000 feedbacks

---

## Próximos Passos (Implementação)

### PR 1: Backend Integration (Flag + Enqueue + Reconciler)
- [ ] Adicionar feature flag `SENTIMENT_ANALYSIS_ENABLED`
- [ ] Criar `sentiment-queue.service.ts` (best-effort enqueue)
- [ ] Integrar no `rideFeedback.controller.ts` (POST, non-blocking)
- [ ] Criar `sentiment-reconciler.ts` (cron 5min, stub sem provider)
- [ ] Testes unitários (mock SQS)

### PR 2: Infraestrutura AWS
- [ ] Criar SQS queue (STANDARD) + DLQ
- [ ] Criar Lambda function (scaffold vazio)
- [ ] Configurar IAM roles (Lambda → RDS, Comprehend, SQS)
- [ ] Adicionar variáveis de ambiente no ECS
- [ ] Testar conectividade Lambda → RDS

### PR 3: Lambda Processor + Comprehend
- [ ] Implementar handler completo
- [ ] Integração com Comprehend
- [ ] Persistência no banco (UPSERT)
- [ ] Idempotência (check existing)
- [ ] Logs estruturados (sem PII)
- [ ] Testes de integração

### PR 4: Observabilidade
- [ ] CloudWatch metrics
- [ ] Alarmes (DLQ, errors, lag)
- [ ] Dashboard CloudWatch

### PR 5: Rollout Controlado
- [ ] Flag OFF em produção
- [ ] Flag ON em staging (10% feedbacks)
- [ ] Monitorar 24h (DLQ, latência, custos)
- [ ] Flag ON 100% em produção
- [ ] Evidências e documentação

### PR 6: Frontend (Opcional)
- [ ] Exibir sentiment label + chip colorido
- [ ] Indicador "Processando..." quando null
- [ ] Tooltip com confidence score

---

## Referências

- [AWS Comprehend Pricing](https://aws.amazon.com/comprehend/pricing/)
- [AWS Lambda + SQS Integration](https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html)
- [Prisma Idempotent Upserts](https://www.prisma.io/docs/concepts/components/prisma-client/crud#upsert)
- ADR-002: Ride Feedback System (Fase 2)

---

**Decisão Final**: Implementar análise de sentimento assíncrona usando **SQS + Lambda + AWS Comprehend**, com feature flag para rollout controlado e rollback seguro.
