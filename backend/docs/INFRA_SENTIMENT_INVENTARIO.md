# INFRA — Sentiment Analysis (FASE 6) — Inventário e Rollback

Data: 2026-02-09  
Branch: fix/security-jwt-no-fallback  

## 1) Visão Geral
Pipeline:
Feedback (DB) → SQS Standard → Lambda (VPC) → Comprehend → UPSERT DB  
Observabilidade:
CloudWatch Alarm (DLQ NotEmpty) → SNS Topic → Email

## 2) Recursos AWS (IDs/ARNs)

### Região / Conta
- Region: us-east-2
- Account ID: 847895361928

### SQS
- Queue (Standard): `kaviar-sentiment-analysis`
  - URL: https://sqs.us-east-2.amazonaws.com/847895361928/kaviar-sentiment-analysis
  - ARN: arn:aws:sqs:us-east-2:847895361928:kaviar-sentiment-analysis
- DLQ: `kaviar-sentiment-dlq`
  - URL: https://sqs.us-east-2.amazonaws.com/847895361928/kaviar-sentiment-dlq
  - ARN: arn:aws:sqs:us-east-2:847895361928:kaviar-sentiment-dlq
- Redrive policy: maxReceiveCount=3 → DLQ

### Lambda
- Function: `kaviar-sentiment-processor`
  - ARN: arn:aws:lambda:us-east-2:847895361928:function:kaviar-sentiment-processor
  - Runtime: nodejs20.x
  - Timeout: 90s
  - Memory: 512MB
- Event Source Mapping:
  - Source: SQS `kaviar-sentiment-analysis`
  - Batch size: 10
  - Partial batch failure: enabled

### IAM
- Lambda Role: `KaviarSentimentLambdaRole`
  - Permissões: SQS receive/delete, Comprehend DetectSentiment, CloudWatch Logs
- Backend Policy: `KaviarBackendSentimentSQSPolicy`
  - Permissões: SQS SendMessage/GetQueueUrl (somente)

### SNS / Alarmes
- SNS Topic: `kaviar-alerts`
  - ARN: arn:aws:sns:us-east-2:847895361928:kaviar-alerts
- Subscription:
  - Endpoint: aparecido.goes@gmail.com
  - Status: Confirmed
- CloudWatch Alarm:
  - Name: `KAVIAR-Sentiment-DLQ-NotEmpty`
  - Metric: AWS/SQS ApproximateNumberOfMessagesVisible (QueueName=kaviar-sentiment-dlq)
  - Threshold: >= 1 for 1 min
  - Action: SNS topic `kaviar-alerts`

## 3) Networking (VPC)

### VPC
- VPC: vpc-0227695745b8467cb

### Subnets
- Private (Lambda):
  - subnet-0f896fb2d985064e8 (us-east-2a)
  - subnet-016a596f90b26c7e6 (us-east-2b)
- Public:
  - subnet-046613642f742faa2 (us-east-2b)
  - subnet-01a498f7b4f3fcff5 (us-east-2a)

### NAT Gateway (para acesso ao Comprehend)
- Elastic IP: eipalloc-0b25a4b0969da169d (3.151.67.139)
- NAT GW: nat-0f60d1a33cc0b12b0

### Route Tables
- Public RT (IGW default):
  - rtb-01b30c068fca2cc0f
  - 0.0.0.0/0 → igw-00394785ada873176
  - Associações: subnet-046613642f742faa2, subnet-01a498f7b4f3fcff5
- Main RT (NAT default):
  - rtb-083f382440d6fcd71 (Main=true)
  - 0.0.0.0/0 → nat-0f60d1a33cc0b12b0
  - Associações: (main)

### Security Groups
- Lambda SG: sg-02f3aff5a9969f875
  - Egress: 0.0.0.0/0:443 (via NAT)
  - DB: allow to RDS SG on 5432
- RDS SG: sg-0bb23baec5c65234a
  - Ingress: from Lambda SG on 5432

## 4) Config no Backend (feature flags)
- SENTIMENT_ANALYSIS_ENABLED: false (default)
- SENTIMENT_QUEUE_URL: (setar em env quando ligar)
- SENTIMENT_RECONCILER_INTERVAL: 5
- SENTIMENT_RECONCILER_BATCH_SIZE: 100

## 5) Procedimentos Operacionais

### Health checks
- API health: `GET /api/health`

### Validar fila
- Enviar mensagem (teste):
  - `aws sqs send-message ... kaviar-sentiment-analysis`
- Ver atributos DLQ:
  - `ApproximateNumberOfMessages` / `NotVisible`

## 6) Rollback (seguro e reversível)

### Rollback lógico (recomendado)
1) Manter infra, desligar feature flag:
   - SENTIMENT_ANALYSIS_ENABLED=false
   - (opcional) remover SENTIMENT_QUEUE_URL
2) Deploy backend
3) Confirmar que reconciler não inicia e não há enqueue

### Rollback infra (se necessário cortar custo do NAT)
⚠️ Atenção: se remover NAT, Lambda na VPC volta a dar timeout no Comprehend.

1) Desabilitar event source mapping (SQS → Lambda) ou desabilitar Lambda
2) Desligar enqueue (flag OFF)
3) Deletar NAT Gateway + liberar Elastic IP
4) Remover rota 0.0.0.0/0 → NAT da main route table (se aplicável)
5) (opcional) remover alarmes/SNS/subscriptions

## 7) Evidências
- Documento hotfix: `docs/HOTFIX_LAMBDA_NETWORKING.md`
- Commits relevantes:
  - PR2 infra (repo): f8db384
  - Hotfix doc: 13dcd4f
