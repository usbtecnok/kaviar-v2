# CloudWatch Alarms - Kaviar Production

**Data:** 2026-02-05  
**Região:** us-east-2  
**SNS Topic:** arn:aws:sns:us-east-2:847895361928:kaviar-alerts

---

## 📊 Recursos Monitorados

### ECS
- **Cluster:** kaviar-cluster
- **Service:** kaviar-backend-service
- **Desired Count:** 2 tasks

### ALB
- **Name:** kaviar-alb
- **ARN:** arn:aws:elasticloadbalancing:us-east-2:847895361928:loadbalancer/app/kaviar-alb/a3ea4728f211b6c7
- **Target Group:** kaviar-backend-tg

### RDS
- **Instance:** kaviar-prod-db
- **Engine:** PostgreSQL 15.15
- **Multi-AZ:** Yes
- **ARN:** arn:aws:rds:us-east-2:847895361928:db:kaviar-prod-db

### Logs
- **Log Group:** /ecs/kaviar-backend

---

## 🚨 Alarms Criados

### 1. KAVIAR-PROD-ECS-RunningTasks-Low
**Métrica:** ECS/ContainerInsights - RunningTaskCount  
**Threshold:** < 2 tasks  
**Período:** 2 minutos (2 x 60s)  
**Ação:** Notificar via SNS  
**TreatMissingData:** notBreaching ✅ (corrigido)

**Comando de criação:**
```bash
aws cloudwatch put-metric-alarm \
  --region us-east-2 \
  --alarm-name KAVIAR-PROD-ECS-RunningTasks-Low \
  --alarm-description "ECS running tasks below desired count" \
  --metric-name RunningTaskCount \
  --namespace ECS/ContainerInsights \
  --statistic Average \
  --period 60 \
  --evaluation-periods 2 \
  --threshold 2 \
  --comparison-operator LessThanThreshold \
  --dimensions Name=ServiceName,Value=kaviar-backend-service Name=ClusterName,Value=kaviar-cluster \
  --alarm-actions arn:aws:sns:us-east-2:847895361928:kaviar-alerts \
  --treat-missing-data notBreaching
```

**Nota:** Corrigido de `breaching` para `notBreaching` para evitar falsos positivos quando ContainerInsights não envia datapoints.

---

### 2. KAVIAR-PROD-RDS-CPU-High
**Métrica:** AWS/RDS - CPUUtilization  
**Threshold:** > 70%  
**Período:** 10 minutos (1 x 600s)  
**Ação:** Notificar via SNS  

**Comando de criação:**
```bash
aws cloudwatch put-metric-alarm \
  --region us-east-2 \
  --alarm-name KAVIAR-PROD-RDS-CPU-High \
  --alarm-description "RDS CPU utilization above 70%" \
  --metric-name CPUUtilization \
  --namespace AWS/RDS \
  --statistic Average \
  --period 600 \
  --evaluation-periods 1 \
  --threshold 70 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=DBInstanceIdentifier,Value=kaviar-prod-db \
  --alarm-actions arn:aws:sns:us-east-2:847895361928:kaviar-alerts
```

---

### 3. KAVIAR-PROD-RDS-Connections-High
**Métrica:** AWS/RDS - DatabaseConnections  
**Threshold:** > 50 connections  
**Período:** 10 minutos (2 x 300s)  
**Ação:** Notificar via SNS  

**Comando de criação:**
```bash
aws cloudwatch put-metric-alarm \
  --region us-east-2 \
  --alarm-name KAVIAR-PROD-RDS-Connections-High \
  --alarm-description "RDS database connections above 50" \
  --metric-name DatabaseConnections \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 50 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=DBInstanceIdentifier,Value=kaviar-prod-db \
  --alarm-actions arn:aws:sns:us-east-2:847895361928:kaviar-alerts
```

**Nota:** Threshold conservador (50) para db.t3.micro (max ~85 connections).

---

### 4. KAVIAR-PROD-ALB-Target5XX-High
**Métrica:** AWS/ApplicationELB - HTTPCode_Target_5XX_Count  
**Threshold:** > 1 error  
**Período:** 5 minutos (1 x 300s)  
**Ação:** Notificar via SNS  

**Comando de criação:**
```bash
aws cloudwatch put-metric-alarm \
  --region us-east-2 \
  --alarm-name KAVIAR-PROD-ALB-Target5XX-High \
  --alarm-description "ALB target 5XX errors above threshold" \
  --metric-name HTTPCode_Target_5XX_Count \
  --namespace AWS/ApplicationELB \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 1 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=LoadBalancer,Value=app/kaviar-alb/a3ea4728f211b6c7 \
  --alarm-actions arn:aws:sns:us-east-2:847895361928:kaviar-alerts \
  --treat-missing-data notBreaching
```

---

### 5. KAVIAR-PROD-Logs-Errors-High
**Métrica:** Kaviar/Logs - ErrorCount (custom)  
**Threshold:** > 5 errors  
**Período:** 5 minutos (1 x 300s)  
**Ação:** Notificar via SNS  

**Metric Filter:**
```bash
aws logs put-metric-filter \
  --region us-east-2 \
  --log-group-name /ecs/kaviar-backend \
  --filter-name KAVIAR-PROD-ErrorCount \
  --filter-pattern '?ERROR ?Unhandled ?Exception ?Prisma' \
  --metric-transformations \
    metricName=ErrorCount,metricNamespace=Kaviar/Logs,metricValue=1,defaultValue=0
```

**Alarm:**
```bash
aws cloudwatch put-metric-alarm \
  --region us-east-2 \
  --alarm-name KAVIAR-PROD-Logs-Errors-High \
  --alarm-description "Application errors in logs above threshold" \
  --metric-name ErrorCount \
  --namespace Kaviar/Logs \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:us-east-2:847895361928:kaviar-alerts \
  --treat-missing-data notBreaching
```

---

## ✅ Verificação

### Listar todos os alarms:
```bash
aws cloudwatch describe-alarms \
  --region us-east-2 \
  --alarm-name-prefix KAVIAR-PROD- \
  --query 'MetricAlarms[*].[AlarmName,StateValue,MetricName]' \
  --output table
```

### Verificar SNS subscriptions:
```bash
aws sns list-subscriptions-by-topic \
  --region us-east-2 \
  --topic-arn arn:aws:sns:us-east-2:847895361928:kaviar-alerts
```

### Testar notificação:
```bash
aws sns publish \
  --region us-east-2 \
  --topic-arn arn:aws:sns:us-east-2:847895361928:kaviar-alerts \
  --subject "Test Alert" \
  --message "CloudWatch alarms configured successfully"
```

---

## 📋 Resumo

| Alarm | Métrica | Threshold | Período | Status |
|-------|---------|-----------|---------|--------|
| ECS-RunningTasks-Low | RunningTaskCount | < 2 | 2 min | ✅ Criado |
| RDS-CPU-High | CPUUtilization | > 70% | 10 min | ✅ Criado |
| RDS-Connections-High | DatabaseConnections | > 50 | 10 min | ✅ Criado |
| ALB-Target5XX-High | HTTPCode_Target_5XX_Count | > 1 | 5 min | ✅ Criado |
| Logs-Errors-High | ErrorCount (custom) | > 5 | 5 min | ✅ Criado |

**Total:** 5 alarms + 1 metric filter  
**SNS Topic:** kaviar-alerts (já existente)  
**Região:** us-east-2
