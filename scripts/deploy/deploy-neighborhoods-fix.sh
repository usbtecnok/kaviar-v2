#!/bin/bash
set -e

REGION="us-east-2"
ACCOUNT_ID="847895361928"
CLUSTER="kaviar-cluster"
SERVICE="kaviar-backend-service"
REPO="kaviar-backend"

echo "🚀 Deploy Backend - Fix neighborhoods.city"
echo ""

# 1. Git status
echo "📋 1. Verificando git..."
if [[ -n $(git status -s) ]]; then
  echo "⚠️  Mudanças não commitadas:"
  git status -s
  echo ""
  read -p "Commitar agora? (y/n) " -n 1 -r
  echo ""
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    git add backend/src/routes/governance.ts
    git add backend/src/services/territory-service.ts
    git add backend/migrations/fix_neighborhoods_city.sql
    git add docs/FIX_NEIGHBORHOODS_CITY_2026-02-06.md
    git commit -m "fix: adicionar campo city nos endpoints de neighborhoods"
    echo "✅ Commit criado"
  else
    echo "❌ Cancelado"
    exit 1
  fi
fi

# 2. Build
echo ""
echo "🐳 2. Building Docker..."
cd backend
COMMIT_SHA=$(git rev-parse --short HEAD)
IMAGE_TAG="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${REPO}:${COMMIT_SHA}"

docker build -t ${REPO}:${COMMIT_SHA} .
docker tag ${REPO}:${COMMIT_SHA} ${IMAGE_TAG}
echo "✅ Built: ${IMAGE_TAG}"

# 3. ECR Login
echo ""
echo "🔐 3. ECR Login..."
aws ecr get-login-password --region ${REGION} | docker login --username AWS --password-stdin ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com

# 4. Push
echo ""
echo "📤 4. Pushing..."
docker push ${IMAGE_TAG}
echo "✅ Pushed"

# 5. Task definition
echo ""
echo "📋 5. Nova task definition..."
TASK_FAMILY="kaviar-backend"
CURRENT_TASK_DEF=$(aws ecs describe-task-definition --region ${REGION} --task-definition ${TASK_FAMILY} --query 'taskDefinition' --output json)

NEW_TASK_DEF=$(echo $CURRENT_TASK_DEF | jq --arg IMAGE "$IMAGE_TAG" '.containerDefinitions[0].image = $IMAGE | del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy)')

NEW_REVISION=$(aws ecs register-task-definition --region ${REGION} --cli-input-json "$NEW_TASK_DEF" --query 'taskDefinition.revision' --output text)
echo "✅ Task: ${TASK_FAMILY}:${NEW_REVISION}"

# 6. Update service
echo ""
echo "🔄 6. Atualizando serviço..."
aws ecs update-service --region ${REGION} --cluster ${CLUSTER} --service ${SERVICE} --task-definition ${TASK_FAMILY}:${NEW_REVISION} --force-new-deployment --output json > /dev/null
echo "✅ Serviço atualizado"

# 7. Aguardar
echo ""
echo "⏳ 7. Aguardando deployment..."
for i in {1..60}; do
  STATUS=$(aws ecs describe-services --region ${REGION} --cluster ${CLUSTER} --services ${SERVICE} --query 'services[0].deployments[0].rolloutState' --output text)
  RUNNING=$(aws ecs describe-services --region ${REGION} --cluster ${CLUSTER} --services ${SERVICE} --query 'services[0].runningCount' --output text)
  
  echo "   [$i/60] $STATUS | Running: $RUNNING/2"
  
  if [[ "$STATUS" == "COMPLETED" ]]; then
    echo ""
    echo "✅ Deploy concluído!"
    break
  fi
  
  if [[ "$STATUS" == "FAILED" ]]; then
    echo ""
    echo "❌ Deploy falhou!"
    exit 1
  fi
  
  sleep 5
done

# 8. Health check
echo ""
echo "🏥 8. Health check..."
ALB_DNS="kaviar-alb-1494046292.us-east-2.elb.amazonaws.com"
sleep 10

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://${ALB_DNS}/api/health)
if [[ "$HTTP_CODE" == "200" ]]; then
  echo "✅ Health OK"
  curl -s http://${ALB_DNS}/api/health | jq '.'
else
  echo "⚠️  HTTP $HTTP_CODE"
fi

# 9. Resumo
echo ""
echo "=========================================="
echo "✅ DEPLOY CONCLUÍDO"
echo "=========================================="
echo ""
echo "📦 Image: ${IMAGE_TAG}"
echo "📋 Task: ${TASK_FAMILY}:${NEW_REVISION}"
echo ""
echo "🧪 TESTAR:"
echo "   1. Frontend: https://app.kaviar.com.br/admin/neighborhoods"
echo "   2. Verificar campo 'city' no payload"
echo "   3. Se OK, executar SQL de verificação (NÃO UPDATE)"
echo ""
echo "📊 Logs:"
echo "   aws logs tail /ecs/kaviar-backend --region ${REGION} --follow"
echo ""
