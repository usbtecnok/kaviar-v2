#!/bin/bash
# Script para atualizar ECS task definition com novas credenciais
# Data: 2026-02-07

set -e

CLUSTER="kaviar-prod"
SERVICE="kaviar-backend-service"
REGION="us-east-1"

# Novas credenciais
NEW_JWT_SECRET="968bb2e49c1fbb0c54e708c9b1bb9fca83e0ec962152863ed5a9e29218af9d4a"
NEW_DB_PASSWORD="uvjMpy2K70QQOmopjt74A3Om"
NEW_ADMIN_PASSWORD="UKqMLJNPx9ELEZFv5ky5"
NEW_DATABASE_URL="postgresql://kaviaradmin:${NEW_DB_PASSWORD}@kaviar-prod-db.cxuuaq46o1o5.us-east-2.rds.amazonaws.com:5432/kaviar?sslmode=require"

echo "🚀 Atualizando ECS task definition com novas credenciais..."
echo ""

# 1. Obter task definition atual
echo "1️⃣ Obtendo task definition atual..."
CURRENT_TASK_DEF=$(aws ecs describe-services \
  --cluster "$CLUSTER" \
  --services "$SERVICE" \
  --region "$REGION" \
  --query 'services[0].taskDefinition' \
  --output text)

echo "   Task definition atual: $CURRENT_TASK_DEF"

# 2. Baixar task definition
echo ""
echo "2️⃣ Baixando task definition..."
aws ecs describe-task-definition \
  --task-definition "$CURRENT_TASK_DEF" \
  --region "$REGION" \
  --query 'taskDefinition' > /tmp/task-def.json

# 3. Atualizar environment variables
echo ""
echo "3️⃣ Atualizando variáveis de ambiente..."
jq --arg jwt "$NEW_JWT_SECRET" \
   --arg db "$NEW_DATABASE_URL" \
   --arg admin "$NEW_ADMIN_PASSWORD" \
   '.containerDefinitions[0].environment |= map(
     if .name == "JWT_SECRET" then .value = $jwt
     elif .name == "DATABASE_URL" then .value = $db
     elif .name == "ADMIN_DEFAULT_PASSWORD" then .value = $admin
     else . end
   ) | del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy)' \
   /tmp/task-def.json > /tmp/task-def-updated.json

# 4. Registrar nova task definition
echo ""
echo "4️⃣ Registrando nova task definition..."
NEW_TASK_DEF_ARN=$(aws ecs register-task-definition \
  --cli-input-json file:///tmp/task-def-updated.json \
  --region "$REGION" \
  --query 'taskDefinition.taskDefinitionArn' \
  --output text)

echo "   Nova task definition: $NEW_TASK_DEF_ARN"

# 5. Atualizar serviço
echo ""
echo "5️⃣ Atualizando serviço ECS..."
aws ecs update-service \
  --cluster "$CLUSTER" \
  --service "$SERVICE" \
  --task-definition "$NEW_TASK_DEF_ARN" \
  --force-new-deployment \
  --region "$REGION" \
  --output json | jq -r '.service.taskDefinition'

echo ""
echo "✅ Task definition atualizada com sucesso!"
echo ""
echo "⏳ Aguardando deploy..."
echo "   Monitore com: aws ecs describe-services --cluster $CLUSTER --services $SERVICE --region $REGION"
echo ""
echo "🧪 Após deploy, validar:"
echo "   curl -s https://api.kaviar.com.br/api/health | jq"

# Cleanup
rm -f /tmp/task-def.json /tmp/task-def-updated.json
