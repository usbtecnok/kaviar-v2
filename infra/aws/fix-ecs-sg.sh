#!/bin/bash
# Fix ECS Service Security Group sem destruir recursos
set -euo pipefail

source /home/goes/kaviar/aws-resources.env

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  FIX ECS SECURITY GROUP                                    ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

CLUSTER_NAME="kaviar-cluster"
SERVICE_NAME="kaviar-backend-service"
ECS_SG_NAME="kaviar-ecs-sg"
CONTAINER_PORT=3001

# Descobrir ALB Security Group
echo "1️⃣ Descobrindo ALB Security Group..."
ALB_SG=$(aws elbv2 describe-load-balancers \
  --names kaviar-alb \
  --region $AWS_REGION \
  --query 'LoadBalancers[0].SecurityGroups[0]' \
  --output text)

echo "   ✓ ALB SG: $ALB_SG"

# Criar/obter ECS Security Group
echo ""
echo "2️⃣ Configurando ECS Security Group..."
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
  
  echo "   ✓ ECS SG criado: $ECS_SG"
else
  echo "   ✓ ECS SG já existe: $ECS_SG"
fi

# Garantir regra de ingress
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
  echo "   ✓ Regra de ingress já existe"
fi

# Atualizar ECS Service
echo ""
echo "3️⃣ Atualizando ECS Service..."
aws ecs update-service \
  --cluster $CLUSTER_NAME \
  --service $SERVICE_NAME \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_PUBLIC_A,$SUBNET_PUBLIC_B],securityGroups=[$ECS_SG],assignPublicIp=ENABLED}" \
  --force-new-deployment \
  --region $AWS_REGION >/dev/null

echo "   ✓ Service atualizado, forçando novo deployment"

# Aguardar tasks
echo ""
echo "⏳ Aguardando 2 minutos para tasks iniciarem..."
for i in {1..12}; do sleep 10; echo -n "."; done
echo ""

# Verificar status
SERVICE_INFO=$(aws ecs describe-services \
  --cluster $CLUSTER_NAME \
  --services $SERVICE_NAME \
  --region $AWS_REGION \
  --query 'services[0].{Running:runningCount,Desired:desiredCount}' \
  --output json)

echo "📊 Service: $(echo $SERVICE_INFO | jq -r '.Running')/$(echo $SERVICE_INFO | jq -r '.Desired') tasks running"

# Aguardar health checks
echo ""
echo "⏳ Aguardando 90 segundos para health checks..."
for i in {1..9}; do sleep 10; echo -n "."; done
echo ""

# Verificar target health
TG_ARN=$(aws elbv2 describe-target-groups \
  --names kaviar-backend-tg \
  --region $AWS_REGION \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

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
  
  ALB_DNS=$(aws elbv2 describe-load-balancers \
    --names kaviar-alb \
    --region $AWS_REGION \
    --query 'LoadBalancers[0].DNSName' \
    --output text)
  
  echo ""
  echo "🧪 Testando ALB..."
  curl -s "http://$ALB_DNS/api/health" | jq '.'
else
  echo "⚠️  Targets ainda não healthy, aguarde mais alguns minutos"
fi

echo ""
echo "✅ Fix aplicado!"
