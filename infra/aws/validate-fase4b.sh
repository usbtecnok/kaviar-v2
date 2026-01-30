#!/bin/bash
# Validação rápida da Fase 4B
set -euo pipefail

source /home/goes/kaviar/aws-resources.env

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  VALIDAÇÃO FASE 4B                                         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# 1. Service Status
echo "1️⃣ ECS Service Status:"
aws ecs describe-services \
  --cluster $CLUSTER_NAME \
  --services $SERVICE_NAME \
  --region $AWS_REGION \
  --query 'services[0].{Status:status,Running:runningCount,Desired:desiredCount,Pending:pendingCount}' \
  --output table

# 2. Target Health
echo ""
echo "2️⃣ Target Health:"
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

# 3. ALB Health Check
echo ""
echo "3️⃣ ALB Health Check:"
HTTP_CODE=$(curl -s -o /tmp/alb-response.json -w "%{http_code}" "http://$ALB_DNS/api/health")
echo "   HTTP Status: $HTTP_CODE"

if [ "$HTTP_CODE" = "200" ]; then
  echo "   Response:"
  cat /tmp/alb-response.json | jq '.'
else
  echo "   Response: $(cat /tmp/alb-response.json)"
fi

# 4. Security Groups
echo ""
echo "4️⃣ Security Groups:"
TASK_ARN=$(aws ecs list-tasks --cluster $CLUSTER_NAME --service-name $SERVICE_NAME --region $AWS_REGION --query 'taskArns[0]' --output text)
if [ -n "$TASK_ARN" ] && [ "$TASK_ARN" != "None" ]; then
  aws ecs describe-tasks --cluster $CLUSTER_NAME --tasks $TASK_ARN --region $AWS_REGION \
    --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' --output text | \
    xargs -I {} aws ec2 describe-network-interfaces --network-interface-ids {} --region $AWS_REGION \
    --query 'NetworkInterfaces[0].Groups[*].{GroupId:GroupId,Name:GroupName}' --output table
else
  echo "   ⚠️  Nenhuma task rodando"
fi

# Resultado
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  RESULTADO                                                 ║"
echo "╚════════════════════════════════════════════════════════════╝"

if [ "$HEALTHY_COUNT" -gt 0 ] && [ "$HTTP_CODE" = "200" ]; then
  echo "✅ FASE 4B OPERACIONAL"
  echo "   • $HEALTHY_COUNT target(s) healthy"
  echo "   • ALB respondendo HTTP 200"
  echo "   • URL: http://$ALB_DNS"
else
  echo "❌ FASE 4B COM PROBLEMAS"
  [ "$HEALTHY_COUNT" -eq 0 ] && echo "   • Nenhum target healthy"
  [ "$HTTP_CODE" != "200" ] && echo "   • ALB retornando HTTP $HTTP_CODE"
  echo ""
  echo "Execute: ./fix-ecs-sg.sh"
fi

echo ""
