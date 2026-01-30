#!/bin/bash
set -e

# FASE 8: Monitoramento CloudWatch
# Logs + Alarmes essenciais

source aws-resources.env

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  📊 FASE 8: MONITORAMENTO CLOUDWATCH                       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# 1. Create Log Group
echo "1️⃣ Criando Log Group..."
aws logs create-log-group \
  --log-group-name /ecs/kaviar-backend \
  --region $AWS_REGION 2>/dev/null || echo "   Log group já existe"

aws logs put-retention-policy \
  --log-group-name /ecs/kaviar-backend \
  --retention-in-days 7 \
  --region $AWS_REGION

echo "   ✅ Log Group: /ecs/kaviar-backend (7 dias retenção)"
echo ""

# 2. Update Task Definition with logging
echo "2️⃣ Atualizando Task Definition com logs..."
CURRENT_TASK=$(aws ecs describe-task-definition \
  --task-definition kaviar-backend \
  --region $AWS_REGION \
  --query 'taskDefinition' | \
  jq 'del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy) |
      .containerDefinitions[0].logConfiguration = {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/kaviar-backend",
          "awslogs-region": "'$AWS_REGION'",
          "awslogs-stream-prefix": "ecs"
        }
      }')

echo "$CURRENT_TASK" > /tmp/task-with-logs.json

NEW_REVISION=$(aws ecs register-task-definition \
  --cli-input-json file:///tmp/task-with-logs.json \
  --region $AWS_REGION \
  --query 'taskDefinition.revision' \
  --output text)

echo "   ✅ Nova revisão: $NEW_REVISION"
echo ""

# 3. Update ECS Service
echo "3️⃣ Atualizando ECS Service..."
aws ecs update-service \
  --cluster $CLUSTER_NAME \
  --service $SERVICE_NAME \
  --task-definition kaviar-backend:$NEW_REVISION \
  --region $AWS_REGION \
  --query 'service.taskDefinition' \
  --output text > /dev/null

echo "   ✅ Service atualizado"
echo ""

# 4. Create SNS Topic for alarms
echo "4️⃣ Criando SNS Topic para alarmes..."
SNS_TOPIC=$(aws sns create-topic \
  --name kaviar-alerts \
  --region $AWS_REGION \
  --query 'TopicArn' \
  --output text)

echo "   ✅ SNS Topic: $SNS_TOPIC"
echo ""

# 5. Create CloudWatch Alarms
echo "5️⃣ Criando alarmes..."

# Alarm 1: High CPU
aws cloudwatch put-metric-alarm \
  --alarm-name kaviar-high-cpu \
  --alarm-description "CPU > 80% por 5 minutos" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=ServiceName,Value=$SERVICE_NAME Name=ClusterName,Value=$CLUSTER_NAME \
  --alarm-actions $SNS_TOPIC \
  --region $AWS_REGION

echo "   ✅ Alarme: CPU > 80%"

# Alarm 2: High Memory
aws cloudwatch put-metric-alarm \
  --alarm-name kaviar-high-memory \
  --alarm-description "Memory > 80% por 5 minutos" \
  --metric-name MemoryUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=ServiceName,Value=$SERVICE_NAME Name=ClusterName,Value=$CLUSTER_NAME \
  --alarm-actions $SNS_TOPIC \
  --region $AWS_REGION

echo "   ✅ Alarme: Memory > 80%"

# Alarm 3: ALB 5xx errors
aws cloudwatch put-metric-alarm \
  --alarm-name kaviar-alb-5xx \
  --alarm-description "ALB 5xx > 10 em 5 minutos" \
  --metric-name HTTPCode_Target_5XX_Count \
  --namespace AWS/ApplicationELB \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=LoadBalancer,Value=$(echo $ALB_ARN | cut -d: -f6) \
  --alarm-actions $SNS_TOPIC \
  --region $AWS_REGION

echo "   ✅ Alarme: ALB 5xx > 10"

# Alarm 4: Unhealthy targets
aws cloudwatch put-metric-alarm \
  --alarm-name kaviar-unhealthy-targets \
  --alarm-description "Targets unhealthy > 0" \
  --metric-name UnHealthyHostCount \
  --namespace AWS/ApplicationELB \
  --statistic Average \
  --period 60 \
  --evaluation-periods 2 \
  --threshold 0 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=TargetGroup,Value=$(echo $TG_ARN | cut -d: -f6) Name=LoadBalancer,Value=$(echo $ALB_ARN | cut -d: -f6) \
  --alarm-actions $SNS_TOPIC \
  --region $AWS_REGION

echo "   ✅ Alarme: Unhealthy targets"
echo ""

# Save
echo "export SNS_TOPIC=\"$SNS_TOPIC\"" >> aws-resources.env
echo "export LOG_GROUP=\"/ecs/kaviar-backend\"" >> aws-resources.env

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  ✅ MONITORAMENTO CONFIGURADO                              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 CloudWatch Logs: /ecs/kaviar-backend"
echo "🔔 SNS Topic: $SNS_TOPIC"
echo "⚠️  Alarmes: 4 criados"
echo ""
echo "Para receber alertas por email:"
echo "  aws sns subscribe --topic-arn $SNS_TOPIC --protocol email --notification-endpoint SEU_EMAIL@example.com --region $AWS_REGION"
echo ""
