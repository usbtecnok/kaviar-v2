# Premium Tourism Scheduler - AWS Integration

**Date:** 2026-02-12  
**Service:** Kaviar Premium Tourism Auto-Promotion

---

## 🎯 Objetivo

Promover automaticamente drivers para "Premium Tourism" após 6 meses de aprovação.

---

## 📋 Arquitetura

### Componentes

1. **Serviço:** `src/services/premium-tourism-promoter.ts`
   - Lógica idempotente de promoção
   - Usa Prisma singleton existente
   - Logs estruturados JSON

2. **CLI Runner:** `scripts/promote-premium-tourism.js`
   - Invocável via `node dist/scripts/promote-premium-tourism.js`
   - Flags: `--dry-run`, `--limit N`

3. **Scheduler:** CloudWatch Events → ECS Scheduled Task

---

## 🚀 Setup AWS (ECS Scheduled Task)

### 1. Criar IAM Role (se não existir)

```bash
aws iam create-role \
  --role-name ecsEventsRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "events.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

aws iam attach-role-policy \
  --role-name ecsEventsRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceEventsRole
```

### 2. Criar CloudWatch Event Rule

```bash
aws events put-rule \
  --region us-east-2 \
  --name kaviar-premium-tourism-daily \
  --description "Promote drivers to Premium Tourism after 6 months" \
  --schedule-expression "cron(0 3 * * ? *)"
```

**Schedule:** Diariamente às 3 AM UTC (00:00 BRT)

### 3. Adicionar Target (ECS Task)

```bash
aws events put-targets \
  --region us-east-2 \
  --rule kaviar-premium-tourism-daily \
  --targets '[
    {
      "Id": "1",
      "Arn": "arn:aws:ecs:us-east-2:847895361928:cluster/kaviar-cluster",
      "RoleArn": "arn:aws:iam::847895361928:role/ecsEventsRole",
      "EcsParameters": {
        "TaskDefinitionArn": "arn:aws:ecs:us-east-2:847895361928:task-definition/kaviar-backend:latest",
        "TaskCount": 1,
        "LaunchType": "FARGATE",
        "NetworkConfiguration": {
          "awsvpcConfiguration": {
            "Subnets": ["subnet-01a498f7b4f3fcff5", "subnet-046613642f742faa2"],
            "SecurityGroups": ["sg-0a54bc7272cae4623"],
            "AssignPublicIp": "ENABLED"
          }
        },
        "PlatformVersion": "LATEST"
      },
      "Input": "{\"containerOverrides\":[{\"name\":\"kaviar-backend\",\"command\":[\"node\",\"dist/scripts/promote-premium-tourism.js\"]}]}"
    }
  ]'
```

---

## 🧪 Testes

### Teste Local (Dry-Run)

```bash
cd /home/goes/kaviar/backend
npm run build
node dist/scripts/promote-premium-tourism.js --dry-run
```

**Output esperado:**
```json
{
  "ts": "2026-02-12T13:00:00Z",
  "level": "info",
  "service": "premium-tourism-promoter",
  "action": "dry-run",
  "eligibleFound": 5,
  "message": "Dry-run mode - no changes made"
}
```

### Teste Real (Com Limite)

```bash
node dist/scripts/promote-premium-tourism.js --limit 1
```

### Teste Manual via ECS

```bash
aws ecs run-task \
  --region us-east-2 \
  --cluster kaviar-cluster \
  --task-definition kaviar-backend:latest \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-01a498f7b4f3fcff5],securityGroups=[sg-0a54bc7272cae4623],assignPublicIp=ENABLED}" \
  --overrides '{"containerOverrides":[{"name":"kaviar-backend","command":["node","dist/scripts/promote-premium-tourism.js","--dry-run"]}]}'
```

---

## 📊 Monitoramento

### CloudWatch Logs

**Log Group:** `/ecs/kaviar-backend`

**Query:**
```
fields @timestamp, @message
| filter @message like /premium-tourism-promoter/
| sort @timestamp desc
| limit 20
```

### Métricas

- `eligibleFound` - Drivers elegíveis encontrados
- `promotedCount` - Drivers promovidos
- `skippedCount` - Drivers pulados (dry-run)

---

## 🔒 Safe Guards

1. **Idempotência:** Pode rodar múltiplas vezes sem duplicar promoções
2. **Filtros seguros:** WHERE com múltiplas condições
3. **Dry-run:** Teste sem alterar DB
4. **Limit:** Previne promoção em massa acidental
5. **Logs auditáveis:** JSON estruturado no CloudWatch

---

## 🔄 Rollback

Se precisar reverter promoções:

```sql
-- Reverter promoções de hoje
UPDATE drivers 
SET premium_tourism_status = 'inactive',
    premium_tourism_promoted_at = NULL,
    updated_at = NOW()
WHERE premium_tourism_promoted_at >= CURRENT_DATE;
```

---

## 📝 Checklist de Deploy

- [ ] Build backend: `npm run build`
- [ ] Teste dry-run local
- [ ] Teste com --limit 1
- [ ] Criar IAM role (se necessário)
- [ ] Criar CloudWatch Event Rule
- [ ] Adicionar ECS target
- [ ] Validar logs no CloudWatch
- [ ] Monitorar primeira execução

---

## 🚨 Troubleshooting

**Problema:** Task não inicia  
**Solução:** Verificar IAM role e network configuration

**Problema:** Logs não aparecem  
**Solução:** Verificar log group `/ecs/kaviar-backend` existe

**Problema:** Nenhum driver promovido  
**Solução:** Verificar query com dry-run, confirmar approved_at >= 6 meses

---

**Status:** Pronto para deploy após aprovação
