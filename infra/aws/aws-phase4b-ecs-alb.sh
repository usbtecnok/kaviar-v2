#!/bin/bash
# KAVIAR - FASE 4B: ECS + ALB (FIXED - Security Groups corretos)
set -euo pipefail

source /home/goes/kaviar/aws-resources.env

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  KAVIAR - FASE 4B: ECS + ALB (FIXED)                       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Variáveis
CLUSTER_NAME="kaviar-cluster"
SERVICE_NAME="kaviar-backend-service"
TASK_FAMILY="kaviar-backend"
CONTAINER_NAME="kaviar-backend"
CONTAINER_PORT=3001
ALB_NAME="kaviar-alb"
TG_NAME="kaviar-backend-tg"
ECS_SG_NAME="kaviar-ecs-sg"

# ============================================================
# 1. IAM ROLES
# ============================================================
echo "1️⃣ Criando IAM Roles..."

# Task Execution Role
cat > /tmp/ecs-task-execution-trust.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Service": "ecs-tasks.amazonaws.com"},
    "Action": "sts:AssumeRole"
  }]
}
EOF

if aws iam get-role --role-name KaviarEcsTaskExecutionRole 2>/dev/null; then
  echo "   ✓ KaviarEcsTaskExecutionRole já existe"
else
  aws iam create-role \
    --role-name KaviarEcsTaskExecutionRole \
    --assume-role-policy-document file:///tmp/ecs-task-execution-trust.json \
    --region $AWS_REGION >/dev/null
  
  aws iam attach-role-policy \
    --role-name KaviarEcsTaskExecutionRole \
    --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy \
    --region $AWS_REGION
  
  echo "   ✓ KaviarEcsTaskExecutionRole criada"
fi

# Task Role
cat > /tmp/ecs-task-trust.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Service": "ecs-tasks.amazonaws.com"},
    "Action": "sts:AssumeRole"
  }]
}
EOF

cat > /tmp/ecs-task-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::${S3_BUCKET}",
        "arn:aws:s3:::${S3_BUCKET}/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "sqs:SendMessage",
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes"
      ],
      "Resource": [
        "arn:aws:sqs:${AWS_REGION}:${AWS_ACCOUNT_ID}:kaviar-jobs",
        "arn:aws:sqs:${AWS_REGION}:${AWS_ACCOUNT_ID}:kaviar-jobs-dlq"
      ]
    }
  ]
}
EOF

if aws iam get-role --role-name KaviarEcsTaskRole 2>/dev/null; then
  echo "   ✓ KaviarEcsTaskRole já existe"
else
  aws iam create-role \
    --role-name KaviarEcsTaskRole \
    --assume-role-policy-document file:///tmp/ecs-task-trust.json \
    --region $AWS_REGION >/dev/null
  
  aws iam put-role-policy \
    --role-name KaviarEcsTaskRole \
    --policy-name KaviarTaskPolicy \
    --policy-document file:///tmp/ecs-task-policy.json \
    --region $AWS_REGION
  
  echo "   ✓ KaviarEcsTaskRole criada"
fi

TASK_EXECUTION_ROLE_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:role/KaviarEcsTaskExecutionRole"
TASK_ROLE_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:role/KaviarEcsTaskRole"

# ============================================================
# 2. SECURITY GROUPS
# ============================================================
echo ""
echo "2️⃣ Configurando Security Groups..."

# Criar/obter ALB Security Group
ALB_SG=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=kaviar-alb-sg" "Name=vpc-id,Values=$VPC_ID" \
  --query 'SecurityGroups[0].GroupId' \
  --output text \
  --region $AWS_REGION 2>/dev/null || echo "None")

if [ "$ALB_SG" = "None" ]; then
  ALB_SG=$(aws ec2 create-security-group \
    --group-name kaviar-alb-sg \
    --description "Security group for Kaviar ALB" \
    --vpc-id $VPC_ID \
    --region $AWS_REGION \
    --query 'GroupId' \
    --output text)
  
  aws ec2 authorize-security-group-ingress \
    --group-id $ALB_SG \
    --protocol tcp \
    --port 80 \
    --cidr 0.0.0.0/0 \
    --region $AWS_REGION >/dev/null
  
  echo "   ✓ ALB Security Group criado: $ALB_SG"
else
  echo "   ✓ ALB Security Group já existe: $ALB_SG"
fi

# Criar/obter ECS Security Group
ECS_SG=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=$ECS_SG_NAME" "Name=vpc-id,Values=$VPC_ID" \
  --query 'SecurityGroups[0].GroupId' \
  --output text \
  --region $AWS_REGION 2>/dev/null || echo "None")

if [ "$ECS_SG" = "None" ]; then
  ECS_SG=$(aws ec2 create-security-group \
    --group-name $ECS_SG_NAME \
    --description "Security group for Kaviar ECS tasks" \
    --vpc-id $VPC_ID \
    --region $AWS_REGION \
    --query 'GroupId' \
    --output text)
  
  echo "   ✓ ECS Security Group criado: $ECS_SG"
else
  echo "   ✓ ECS Security Group já existe: $ECS_SG"
fi

# Garantir regra de ingress do ALB para ECS
RULE_EXISTS=$(aws ec2 describe-security-groups \
  --group-ids $ECS_SG \
  --region $AWS_REGION \
  --query "SecurityGroups[0].IpPermissions[?FromPort==\`$CONTAINER_PORT\` && ToPort==\`$CONTAINER_PORT\` && UserIdGroupPairs[?GroupId==\`$ALB_SG\`]].FromPort" \
  --output text)

if [ -z "$RULE_EXISTS" ]; then
  aws ec2 authorize-security-group-ingress \
    --group-id $ECS_SG \
    --protocol tcp \
    --port $CONTAINER_PORT \
    --source-group $ALB_SG \
    --region $AWS_REGION >/dev/null
  
  echo "   ✓ Regra de ingress adicionada: ALB -> ECS:$CONTAINER_PORT"
else
  echo "   ✓ Regra de ingress já existe: ALB -> ECS:$CONTAINER_PORT"
fi

# ============================================================
# 3. APPLICATION LOAD BALANCER
# ============================================================
echo ""
echo "3️⃣ Criando Application Load Balancer..."

ALB_ARN=$(aws elbv2 describe-load-balancers \
  --names $ALB_NAME \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text \
  --region $AWS_REGION 2>/dev/null || echo "None")

if [ "$ALB_ARN" = "None" ]; then
  ALB_ARN=$(aws elbv2 create-load-balancer \
    --name $ALB_NAME \
    --subnets $SUBNET_PUBLIC_A $SUBNET_PUBLIC_B \
    --security-groups $ALB_SG \
    --scheme internet-facing \
    --type application \
    --ip-address-type ipv4 \
    --region $AWS_REGION \
    --query 'LoadBalancers[0].LoadBalancerArn' \
    --output text)
  
  echo "   ✓ ALB criado: $ALB_ARN"
else
  echo "   ✓ ALB já existe: $ALB_ARN"
fi

ALB_DNS=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns $ALB_ARN \
  --query 'LoadBalancers[0].DNSName' \
  --output text \
  --region $AWS_REGION)

echo "   ✓ ALB DNS: $ALB_DNS"

# Target Group
TG_ARN=$(aws elbv2 describe-target-groups \
  --names $TG_NAME \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text \
  --region $AWS_REGION 2>/dev/null || echo "None")

if [ "$TG_ARN" = "None" ]; then
  TG_ARN=$(aws elbv2 create-target-group \
    --name $TG_NAME \
    --protocol HTTP \
    --port $CONTAINER_PORT \
    --vpc-id $VPC_ID \
    --target-type ip \
    --health-check-enabled \
    --health-check-protocol HTTP \
    --health-check-path /api/health \
    --health-check-interval-seconds 30 \
    --health-check-timeout-seconds 5 \
    --healthy-threshold-count 2 \
    --unhealthy-threshold-count 3 \
    --region $AWS_REGION \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text)
  
  echo "   ✓ Target Group criado: $TG_ARN"
else
  echo "   ✓ Target Group já existe: $TG_ARN"
fi

# Listener
LISTENER_ARN=$(aws elbv2 describe-listeners \
  --load-balancer-arn $ALB_ARN \
  --query 'Listeners[0].ListenerArn' \
  --output text \
  --region $AWS_REGION 2>/dev/null || echo "None")

if [ "$LISTENER_ARN" = "None" ]; then
  LISTENER_ARN=$(aws elbv2 create-listener \
    --load-balancer-arn $ALB_ARN \
    --protocol HTTP \
    --port 80 \
    --default-actions Type=forward,TargetGroupArn=$TG_ARN \
    --region $AWS_REGION \
    --query 'Listeners[0].ListenerArn' \
    --output text)
  
  echo "   ✓ Listener criado: $LISTENER_ARN"
else
  echo "   ✓ Listener já existe: $LISTENER_ARN"
fi

# ============================================================
# 4. ECS CLUSTER
# ============================================================
echo ""
echo "4️⃣ Criando ECS Cluster..."

if aws ecs describe-clusters --clusters $CLUSTER_NAME --region $AWS_REGION --query 'clusters[0].status' --output text 2>/dev/null | grep -q "ACTIVE"; then
  echo "   ✓ Cluster já existe: $CLUSTER_NAME"
else
  aws ecs create-cluster \
    --cluster-name $CLUSTER_NAME \
    --region $AWS_REGION >/dev/null
  
  echo "   ✓ Cluster criado: $CLUSTER_NAME"
fi

# ============================================================
# 5. TASK DEFINITION
# ============================================================
echo ""
echo "5️⃣ Registrando Task Definition..."

cat > /tmp/task-definition.json <<EOF
{
  "family": "$TASK_FAMILY",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "$TASK_EXECUTION_ROLE_ARN",
  "taskRoleArn": "$TASK_ROLE_ARN",
  "containerDefinitions": [
    {
      "name": "$CONTAINER_NAME",
      "image": "$ECR_URI:latest",
      "essential": true,
      "portMappings": [
        {
          "containerPort": $CONTAINER_PORT,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "NODE_ENV", "value": "production"},
        {"name": "PORT", "value": "$CONTAINER_PORT"},
        {"name": "DATABASE_URL", "value": "$DATABASE_URL"},
        {"name": "REDIS_URL", "value": "$REDIS_URL"},
        {"name": "S3_BUCKET", "value": "$S3_BUCKET"},
        {"name": "SQS_URL", "value": "$SQS_URL"},
        {"name": "AWS_REGION", "value": "$AWS_REGION"}
        ,{"name": "TWILIO_WHATSAPP_TEMPLATE_DRIVER_SID", "value": "$TWILIO_WHATSAPP_TEMPLATE_DRIVER_SID"}
        ,{"name": "TWILIO_WHATSAPP_TEMPLATE_PASSENGER_SID", "value": "$TWILIO_WHATSAPP_TEMPLATE_PASSENGER_SID"}
        ,{"name": "TWILIO_WHATSAPP_TEMPLATE_MANAGER_SID", "value": "$TWILIO_WHATSAPP_TEMPLATE_MANAGER_SID"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/$TASK_FAMILY",
          "awslogs-region": "$AWS_REGION",
          "awslogs-stream-prefix": "ecs",
          "awslogs-create-group": "true"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:$CONTAINER_PORT/api/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
EOF

aws ecs register-task-definition \
  --cli-input-json file:///tmp/task-definition.json \
  --region $AWS_REGION >/dev/null

echo "   ✓ Task Definition registrada: $TASK_FAMILY"

# ============================================================
# 6. ECS SERVICE
# ============================================================
echo ""
echo "6️⃣ Criando ECS Service..."

# Verificar se service existe
SERVICE_STATUS=$(aws ecs describe-services \
  --cluster $CLUSTER_NAME \
  --services $SERVICE_NAME \
  --region $AWS_REGION \
  --query 'services[0].status' \
  --output text 2>/dev/null || echo "None")

if [ "$SERVICE_STATUS" = "ACTIVE" ]; then
  echo "   ⚠️  Service já existe, atualizando..."
  
  aws ecs update-service \
    --cluster $CLUSTER_NAME \
    --service $SERVICE_NAME \
    --task-definition $TASK_FAMILY \
    --desired-count 2 \
    --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_PUBLIC_A,$SUBNET_PUBLIC_B],securityGroups=[$ECS_SG],assignPublicIp=ENABLED}" \
    --force-new-deployment \
    --region $AWS_REGION >/dev/null
  
  echo "   ✓ Service atualizado com Security Group correto"
else
  aws ecs create-service \
    --cluster $CLUSTER_NAME \
    --service-name $SERVICE_NAME \
    --task-definition $TASK_FAMILY \
    --desired-count 2 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_PUBLIC_A,$SUBNET_PUBLIC_B],securityGroups=[$ECS_SG],assignPublicIp=ENABLED}" \
    --load-balancers "targetGroupArn=$TG_ARN,containerName=$CONTAINER_NAME,containerPort=$CONTAINER_PORT" \
    --health-check-grace-period-seconds 120 \
    --region $AWS_REGION >/dev/null
  
  echo "   ✓ Service criado: $SERVICE_NAME"
fi

# ============================================================
# 7. SALVAR VARIÁVEIS
# ============================================================
echo ""
echo "7️⃣ Salvando variáveis..."

cat >> /home/goes/kaviar/aws-resources.env <<EOF

# ECS + ALB (Fase 4B)
export CLUSTER_NAME="$CLUSTER_NAME"
export SERVICE_NAME="$SERVICE_NAME"
export ALB_DNS="$ALB_DNS"
export ALB_SG="$ALB_SG"
export ECS_SG="$ECS_SG"
export TG_ARN="$TG_ARN"
EOF

echo "   ✓ Variáveis salvas em aws-resources.env"

# ============================================================
# 8. VALIDAÇÃO
# ============================================================
echo ""
echo "8️⃣ Validando deployment..."
echo ""

echo "⏳ Aguardando 2 minutos para tasks iniciarem..."
for i in {1..12}; do sleep 10; echo -n "."; done
echo ""

# Verificar service
SERVICE_INFO=$(aws ecs describe-services \
  --cluster $CLUSTER_NAME \
  --services $SERVICE_NAME \
  --region $AWS_REGION \
  --query 'services[0].{Status:status,Running:runningCount,Desired:desiredCount,Pending:pendingCount}' \
  --output json)

echo "📊 Service Status:"
echo "$SERVICE_INFO" | jq '.'

RUNNING=$(echo "$SERVICE_INFO" | jq -r '.Running')
DESIRED=$(echo "$SERVICE_INFO" | jq -r '.Desired')

if [ "$RUNNING" -lt "$DESIRED" ]; then
  echo "⚠️  Tasks ainda iniciando ($RUNNING/$DESIRED)"
  
  # Mostrar eventos
  echo ""
  echo "📋 Últimos eventos:"
  aws ecs describe-services \
    --cluster $CLUSTER_NAME \
    --services $SERVICE_NAME \
    --region $AWS_REGION \
    --query 'services[0].events[:3].[createdAt,message]' \
    --output text
fi

echo ""
echo "⏳ Aguardando 90 segundos para health checks..."
for i in {1..9}; do sleep 10; echo -n "."; done
echo ""

# Verificar target health
echo "🎯 Target Health:"
aws elbv2 describe-target-health \
  --target-group-arn $TG_ARN \
  --region $AWS_REGION \
  --query 'TargetHealthDescriptions[?TargetHealth.State!=`draining`].{IP:Target.Id,State:TargetHealth.State,Reason:TargetHealth.Reason}' \
  --output table

HEALTHY_COUNT=$(aws elbv2 describe-target-health \
  --target-group-arn $TG_ARN \
  --region $AWS_REGION \
  --query 'length(TargetHealthDescriptions[?TargetHealth.State==`healthy`])' \
  --output text)

echo ""
if [ "$HEALTHY_COUNT" -gt 0 ]; then
  echo "✅ $HEALTHY_COUNT target(s) healthy!"
  
  # Testar ALB
  echo ""
  echo "🧪 Testando ALB..."
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://$ALB_DNS/api/health")
  
  if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ ALB respondendo: HTTP $HTTP_CODE"
    curl -s "http://$ALB_DNS/api/health" | jq '.'
  else
    echo "❌ ALB retornou: HTTP $HTTP_CODE"
  fi
else
  echo "⚠️  Nenhum target healthy ainda"
  echo ""
  echo "📋 Diagnóstico:"
  
  # Mostrar logs recentes
  echo ""
  echo "Logs recentes:"
  aws logs tail /ecs/$TASK_FAMILY --since 2m --region $AWS_REGION 2>&1 | tail -10 || echo "Sem logs disponíveis"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  FASE 4B CONCLUÍDA                                         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 Recursos criados:"
echo "   • Cluster: $CLUSTER_NAME"
echo "   • Service: $SERVICE_NAME"
echo "   • ALB: http://$ALB_DNS"
echo "   • Security Groups: ALB=$ALB_SG, ECS=$ECS_SG"
echo ""
echo "🧪 Validação:"
echo "   curl http://$ALB_DNS/api/health"
echo ""
