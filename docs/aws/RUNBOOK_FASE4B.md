# RUNBOOK: FASE 4B - ECS + ALB

## 🎯 Objetivo
Deploy do backend Kaviar em ECS Fargate com ALB, garantindo conectividade correta via Security Groups.

## 📋 Pré-requisitos
- Fase 1 (VPC) completa
- Fase 3 (RDS, Redis, S3, SQS) completa
- Fase 4A (Docker + ECR) completa
- Variáveis em `aws-resources.env`

## 🚀 Deploy

### Execução Normal
```bash
chmod +x aws-phase4b-ecs-alb.sh
./aws-phase4b-ecs-alb.sh
```

### Apenas Fix de Security Group
Se o service já existe mas está com SG errado:
```bash
chmod +x fix-ecs-sg.sh
./fix-ecs-sg.sh
```

## ✅ Validação

### 1. Service Status
```bash
aws ecs describe-services \
  --cluster kaviar-cluster \
  --services kaviar-backend-service \
  --region us-east-2 \
  --query 'services[0].{Status:status,Running:runningCount,Desired:desiredCount}' \
  --output table
```

**Esperado**: `Status=ACTIVE`, `Running=Desired`

### 2. Target Health
```bash
aws elbv2 describe-target-health \
  --target-group-arn $(aws elbv2 describe-target-groups --names kaviar-backend-tg --region us-east-2 --query 'TargetGroups[0].TargetGroupArn' --output text) \
  --region us-east-2 \
  --query 'TargetHealthDescriptions[*].{IP:Target.Id,State:TargetHealth.State,Reason:TargetHealth.Reason}' \
  --output table
```

**Esperado**: Pelo menos 1 target com `State=healthy`

### 3. ALB Health Check
```bash
ALB_DNS=$(aws elbv2 describe-load-balancers --names kaviar-alb --region us-east-2 --query 'LoadBalancers[0].DNSName' --output text)
curl -s "http://$ALB_DNS/api/health" | jq '.'
```

**Esperado**: HTTP 200 com JSON `{"success": true, ...}`

### 4. Security Groups
```bash
# Verificar ECS tasks têm SG correto
TASK_ARN=$(aws ecs list-tasks --cluster kaviar-cluster --service-name kaviar-backend-service --region us-east-2 --query 'taskArns[0]' --output text)
aws ecs describe-tasks --cluster kaviar-cluster --tasks $TASK_ARN --region us-east-2 \
  --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' --output text | \
  xargs -I {} aws ec2 describe-network-interfaces --network-interface-ids {} --region us-east-2 \
  --query 'NetworkInterfaces[0].Groups[*].{GroupId:GroupId,Name:GroupName}' --output table
```

**Esperado**: `GroupName=kaviar-ecs-sg`

## 🔍 Troubleshooting

### Problema: Targets unhealthy com "Target.Timeout"

**Causa**: Security Group do ECS não permite tráfego do ALB na porta 3001

**Solução**:
```bash
./fix-ecs-sg.sh
```

### Problema: Service INACTIVE ou DRAINING

**Causa**: Deployment anterior falhou ou está preso

**Solução**:
```bash
# Forçar novo deployment
aws ecs update-service \
  --cluster kaviar-cluster \
  --service kaviar-backend-service \
  --force-new-deployment \
  --region us-east-2
```

### Problema: Tasks não iniciam (PENDING)

**Diagnóstico**:
```bash
# Ver eventos do service
aws ecs describe-services \
  --cluster kaviar-cluster \
  --services kaviar-backend-service \
  --region us-east-2 \
  --query 'services[0].events[:5].[createdAt,message]' \
  --output text

# Ver logs da task
aws logs tail /ecs/kaviar-backend --since 5m --region us-east-2
```

**Causas comuns**:
- Imagem ECR não encontrada → Verificar `ECR_URI` em `aws-resources.env`
- Falta de permissões IAM → Verificar roles `KaviarEcsTaskExecutionRole` e `KaviarEcsTaskRole`
- Subnet sem acesso à internet → Tasks em subnet pública precisam `assignPublicIp=ENABLED`

### Problema: ALB retorna 503 Service Unavailable

**Causa**: Nenhum target healthy no Target Group

**Diagnóstico**:
```bash
# Ver health check do target group
aws elbv2 describe-target-groups \
  --names kaviar-backend-tg \
  --region us-east-2 \
  --query 'TargetGroups[0].{Path:HealthCheckPath,Interval:HealthCheckIntervalSeconds,Timeout:HealthCheckTimeoutSeconds}' \
  --output table

# Testar endpoint diretamente no container
TASK_IP=$(aws ecs list-tasks --cluster kaviar-cluster --service-name kaviar-backend-service --region us-east-2 --output text | awk '{print $2}' | head -1 | xargs -I {} aws ecs describe-tasks --cluster kaviar-cluster --tasks {} --region us-east-2 --query 'tasks[0].attachments[0].details[?name==`privateIPv4Address`].value' --output text)
curl -v "http://$TASK_IP:3001/api/health"
```

## 🔄 Rollback

### Rollback para versão anterior da task definition
```bash
# Listar versões
aws ecs list-task-definitions \
  --family-prefix kaviar-backend \
  --region us-east-2 \
  --query 'taskDefinitionArns' \
  --output text

# Atualizar service para versão específica
aws ecs update-service \
  --cluster kaviar-cluster \
  --service kaviar-backend-service \
  --task-definition kaviar-backend:1 \
  --region us-east-2
```

### Rollback completo (deletar service)
```bash
# Deletar service
aws ecs update-service \
  --cluster kaviar-cluster \
  --service kaviar-backend-service \
  --desired-count 0 \
  --region us-east-2

aws ecs delete-service \
  --cluster kaviar-cluster \
  --service kaviar-backend-service \
  --region us-east-2

# Deletar ALB
ALB_ARN=$(aws elbv2 describe-load-balancers --names kaviar-alb --region us-east-2 --query 'LoadBalancers[0].LoadBalancerArn' --output text)
aws elbv2 delete-load-balancer --load-balancer-arn $ALB_ARN --region us-east-2

# Deletar Target Group (aguardar ALB deletar primeiro)
sleep 60
TG_ARN=$(aws elbv2 describe-target-groups --names kaviar-backend-tg --region us-east-2 --query 'TargetGroups[0].TargetGroupArn' --output text)
aws elbv2 delete-target-group --target-group-arn $TG_ARN --region us-east-2
```

## 📊 Monitoramento

### Logs em tempo real
```bash
aws logs tail /ecs/kaviar-backend --follow --region us-east-2
```

### Métricas do ALB
```bash
# Request count (últimos 5 minutos)
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApplicationELB \
  --metric-name RequestCount \
  --dimensions Name=LoadBalancer,Value=app/kaviar-alb/$(aws elbv2 describe-load-balancers --names kaviar-alb --region us-east-2 --query 'LoadBalancers[0].LoadBalancerArn' --output text | cut -d: -f6) \
  --start-time $(date -u -d '5 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum \
  --region us-east-2
```

### Métricas do ECS
```bash
# CPU e Memory utilization
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=kaviar-backend-service Name=ClusterName,Value=kaviar-cluster \
  --start-time $(date -u -d '10 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average \
  --region us-east-2
```

## 🎯 Critérios de Aceite

✅ **Service ACTIVE** com `runningCount = desiredCount`  
✅ **Pelo menos 1 target healthy** no Target Group  
✅ **ALB `/api/health` retorna HTTP 200**  
✅ **Tasks com Security Group `kaviar-ecs-sg`**  
✅ **Logs mostrando "Backend running on port 3001"**  

## 📝 Notas

- **Subnets públicas**: Tasks precisam `assignPublicIp=ENABLED` para acessar ECR/CloudWatch
- **Subnets privadas**: Requerem NAT Gateway ou VPC Endpoints (SSM, ECR, CloudWatch Logs, S3)
- **Health check grace period**: 120 segundos para permitir inicialização do container
- **Security Groups**: ALB → ECS na porta 3001 é CRÍTICO para funcionamento
- **Idempotência**: Script pode ser executado múltiplas vezes sem efeitos colaterais
