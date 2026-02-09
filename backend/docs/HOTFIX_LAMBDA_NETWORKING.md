# Hotfix: Lambda Networking + Retry Logic

## Problema Identificado

Lambda na VPC não conseguia acessar AWS Comprehend (timeout após ~47s):
- **DB fetch**: OK (9-26ms)
- **Comprehend call**: TIMEOUT (>45s)
- **Causa**: Lambda em VPC privada sem acesso à internet

## Soluções Tentadas

### 1. VPC Endpoint para Comprehend ❌
```bash
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-0227695745b8467cb \
  --vpc-endpoint-type Interface \
  --service-name com.amazonaws.us-east-2.comprehend \
  --subnet-ids subnet-0f896fb2d985064e8 subnet-016a596f90b26c7e6 \
  --security-group-ids sg-02f3aff5a9969f875
```
**Resultado**: Continuou com timeout (VPC Endpoint não funcionou corretamente)

### 2. NAT Gateway ✅
```bash
# Alocar Elastic IP
ALLOCATION_ID=$(aws ec2 allocate-address --domain vpc --region us-east-2 --query 'AllocationId' --output text)

# Criar NAT Gateway na subnet pública
NAT_GW_ID=$(aws ec2 create-nat-gateway \
  --subnet-id subnet-01a498f7b4f3fcff5 \
  --allocation-id $ALLOCATION_ID \
  --region us-east-2 \
  --query 'NatGateway.NatGatewayId' \
  --output text)

# Adicionar rota na main route table
MAIN_RT=$(aws ec2 describe-route-tables \
  --filters "Name=vpc-id,Values=vpc-0227695745b8467cb" "Name=association.main,Values=true" \
  --region us-east-2 \
  --query 'RouteTables[0].RouteTableId' \
  --output text)

aws ec2 create-route \
  --route-table-id $MAIN_RT \
  --destination-cidr-block 0.0.0.0/0 \
  --nat-gateway-id $NAT_GW_ID \
  --region us-east-2
```

**Recursos Criados**:
- Elastic IP: `eipalloc-0b25a4b0969da169d` (3.151.67.139)
- NAT Gateway: `nat-0f60d1a33cc0b12b0`
- Rota: `0.0.0.0/0 -> nat-0f60d1a33cc0b12b0` na route table `rtb-083f382440d6fcd71`

**Custo**: ~$32/mês + data transfer

## Correções no Código Lambda

### 1. Retry Logic Corrigido

**Antes** (ERRADO):
```javascript
if (nonRetryable.includes(error.code) || error.name === 'TimeoutError') {
  console.warn('[Sentiment] Non-retryable error, deleting message');
  continue;
}
```

**Depois** (CORRETO):
```javascript
// Non-retryable: apenas payload/data issues
const nonRetryable = ['P2025', 'ValidationError', 'InvalidRequestException'];

if (nonRetryable.includes(error.code)) {
  console.warn('[Sentiment] Non-retryable error, deleting message');
  continue;
}

// Todos os outros erros (timeout, network, throttling) são retryable
console.warn('[Sentiment] Retryable error, will retry via SQS');
results.push({ itemIdentifier: messageId });
```

**Rationale**:
- `ETIMEDOUT` é **retryable** (problema transitório de rede/Comprehend/DB)
- Só deletar mensagem em erros de payload inválido ou feedback não encontrado
- SQS + DLQ gerenciam retry automático (maxReceiveCount: 3)

### 2. Instrumentação por Etapa

```javascript
const timings = {};

// DB Fetch
const dbFetchStart = Date.now();
const feedback = await prisma.ride_feedbacks.findUnique(...);
timings.db_fetch_ms = Date.now() - dbFetchStart;
console.log('[Sentiment] Step: db_fetch', { duration_ms: timings.db_fetch_ms });

// Comprehend Call
const comprehendStart = Date.now();
const result = await comprehend.send(new DetectSentimentCommand(...));
timings.comprehend_ms = Date.now() - comprehendStart;
console.log('[Sentiment] Step: comprehend_call', { duration_ms: timings.comprehend_ms });

// DB Upsert
const dbUpsertStart = Date.now();
await prisma.ride_feedback_sentiment_analysis.upsert(...);
timings.db_upsert_ms = Date.now() - dbUpsertStart;
timings.total_ms = Date.now() - startTime;
console.log('[Sentiment] Step: db_upsert', { duration_ms: timings.db_upsert_ms });
```

**Benefícios**:
- Identificar gargalos (DB vs Comprehend vs network)
- Debugging de timeouts
- Métricas de performance (sem PII)

### 3. Timeouts Configurados

```javascript
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL + '?connect_timeout=10' } }
});

const comprehend = new ComprehendClient({
  region: 'us-east-2',
  requestHandler: {
    requestTimeout: 30000,
    httpsAgent: { timeout: 30000 }
  }
});
```

**Lambda timeout**: 60s → 90s

## Resultado Final

✅ **Processamento bem-sucedido**:
```
[Sentiment] Step: db_fetch { duration_ms: 26 }
[Sentiment] Step: comprehend_call { duration_ms: 271 }
[Sentiment] Step: db_upsert { duration_ms: 9 }
[Sentiment] SUCCESS: {
  messageId: '99cc9aa5-e24f-4446-9878-f82c9d9d0032',
  sentiment: 'POSITIVE',
  timings: {
    db_fetch_ms: 26,
    comprehend_ms: 271,
    db_upsert_ms: 9,
    total_ms: 306
  }
}
```

**Feedback analisado**: `test-feedback-pr3-1770635515955`
**Sentiment**: `POSITIVE`
**Total time**: 306ms

## Arquitetura Final

```
┌─────────────────┐
│  SQS Standard   │
│  (kaviar-       │
│   sentiment-    │
│   analysis)     │
└────────┬────────┘
         │
         │ Event Source Mapping
         │ (batch size: 10)
         ▼
┌─────────────────────────────────────────┐
│  Lambda (kaviar-sentiment-processor)    │
│  - VPC: subnets privadas                │
│  - SG: sg-02f3aff5a9969f875             │
│  - Timeout: 90s                         │
│  - Memory: 512MB                        │
└───┬─────────────────────────────────┬───┘
    │                                 │
    │ (via NAT Gateway)              │ (via SG rule)
    │                                 │
    ▼                                 ▼
┌──────────────┐              ┌──────────────┐
│ AWS          │              │ RDS          │
│ Comprehend   │              │ PostgreSQL   │
│ (us-east-2)  │              │ (VPC)        │
└──────────────┘              └──────────────┘
```

## Security Groups

### Lambda SG (sg-02f3aff5a9969f875)
**Egress**:
- `0.0.0.0/0:443` (HTTPS para Comprehend via NAT)
- `sg-0bb23baec5c65234a:5432` (PostgreSQL)

### RDS SG (sg-0bb23baec5c65234a)
**Ingress**:
- `sg-02f3aff5a9969f875:5432` (Lambda)

## Lições Aprendidas

1. **VPC Endpoint nem sempre funciona**: NAT Gateway é mais confiável para serviços AWS
2. **Timeouts são retryable**: Não deletar mensagens em timeout (deixar SQS retry)
3. **Instrumentação é essencial**: Logs por etapa identificam gargalos rapidamente
4. **Lambda timeout**: Deve ser > (DB timeout + Comprehend timeout + buffer)
5. **Custo vs Simplicidade**: NAT Gateway é mais caro mas mais simples que VPC Endpoint

## Próximos Passos

- [ ] Monitorar custos do NAT Gateway (CloudWatch + Cost Explorer)
- [ ] Considerar VPC Endpoint para Comprehend se custo for crítico (debug adicional)
- [ ] Adicionar métricas customizadas (CloudWatch Metrics) para timings
- [ ] Configurar alarmes para DLQ (mensagens que falharam 3x)
