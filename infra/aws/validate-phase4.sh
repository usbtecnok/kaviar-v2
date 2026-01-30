#!/bin/bash
# KAVIAR - Validação Completa da Fase 4
set -euo pipefail

source /home/goes/kaviar/aws-resources.env

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  KAVIAR - Validação Fase 4                                 ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# 1. Health Check ALB
echo "1️⃣ Testando Health Check ALB..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://$ALB_DNS/api/health" || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ ALB Health Check: HTTP 200"
  curl -s "http://$ALB_DNS/api/health" | jq
else
  echo "❌ ALB Health Check: HTTP $HTTP_CODE"
  exit 1
fi

# 2. Verificar logs CloudWatch
echo ""
echo "2️⃣ Verificando CloudWatch Logs..."
aws logs tail /ecs/kaviar-backend --since 5m --region $AWS_REGION | head -20

# 3. Verificar tasks ECS
echo ""
echo "3️⃣ Verificando ECS Tasks..."
aws ecs describe-services \
  --cluster kaviar-cluster \
  --services kaviar-backend-service \
  --region $AWS_REGION \
  --query 'services[0].{Running:runningCount,Desired:desiredCount,Status:status}' \
  --output table

# 4. Verificar Target Health
echo ""
echo "4️⃣ Verificando Target Group Health..."
aws elbv2 describe-target-health \
  --target-group-arn $TG_ARN \
  --region $AWS_REGION \
  --query 'TargetHealthDescriptions[*].{Target:Target.Id,Health:TargetHealth.State}' \
  --output table

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  ✅ VALIDAÇÃO CONCLUÍDA                                    ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "🌐 Backend URL: http://$ALB_DNS"
echo ""
