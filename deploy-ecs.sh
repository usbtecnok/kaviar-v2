#!/bin/bash
set -e

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 🚀 KAVIAR ECS DEPLOYMENT SCRIPT
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ECR_URI="847895361928.dkr.ecr.us-east-1.amazonaws.com/kaviar-backend"
REGION="us-east-1"
CLUSTER="kaviar-prod"
SERVICE="kaviar-backend-service"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🐳 BUILD & PUSH"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

VERSION="v1.0.$(date +%Y%m%d-%H%M%S)"
echo "Versão: $VERSION"

# Login ECR
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ECR_URI

# Build
cd backend
docker build -t kaviar-backend:$VERSION -t kaviar-backend:latest .

# Tag & Push
docker tag kaviar-backend:$VERSION $ECR_URI:$VERSION
docker tag kaviar-backend:latest $ECR_URI:latest
docker push $ECR_URI:$VERSION
docker push $ECR_URI:latest

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 UPDATE TASK DEFINITION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Get current task definition
TASK_DEF=$(aws ecs describe-task-definition \
  --task-definition kaviar-backend \
  --region $REGION \
  --query 'taskDefinition' \
  --output json)

# Update image and GIT_COMMIT env var
echo "$TASK_DEF" | jq --arg IMAGE "$ECR_URI:$VERSION" --arg COMMIT "$GIT_COMMIT" '
  .containerDefinitions[0].image = $IMAGE |
  .containerDefinitions[0].environment |= map(
    if .name == "GIT_COMMIT" then .value = $COMMIT else . end
  ) |
  del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy)
' > /tmp/new-task-def.json

# Register new revision
NEW_REVISION=$(aws ecs register-task-definition \
  --cli-input-json file:///tmp/new-task-def.json \
  --region $REGION \
  --query 'taskDefinition.revision' \
  --output text)

echo "Nova revisão: $NEW_REVISION"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 UPDATE SERVICE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

aws ecs update-service \
  --cluster $CLUSTER \
  --service $SERVICE \
  --task-definition kaviar-backend:$NEW_REVISION \
  --force-new-deployment \
  --region $REGION \
  --query 'service.{Name:serviceName,TaskDef:taskDefinition}' \
  --output table

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⏳ MONITORING DEPLOYMENT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

for i in {1..30}; do
  RUNNING=$(aws ecs describe-services \
    --cluster $CLUSTER \
    --services $SERVICE \
    --region $REGION \
    --query 'services[0].runningCount' \
    --output text)
  
  DESIRED=$(aws ecs describe-services \
    --cluster $CLUSTER \
    --services $SERVICE \
    --region $REGION \
    --query 'services[0].desiredCount' \
    --output text)
  
  echo "[$i/30] Running: $RUNNING/$DESIRED"
  
  if [ "$RUNNING" = "$DESIRED" ] && [ "$RUNNING" != "0" ]; then
    echo ""
    echo "✅ Deployment complete!"
    break
  fi
  
  sleep 10
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 TESTING API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

sleep 5
curl -k -s https://api.kaviar.com.br/api/health | jq .

echo ""
echo "✅ Deploy concluído: $VERSION"
