#!/bin/bash
# Script para aplicar migration de Favorite Places em PROD de forma segura

set -e

CLUSTER="kaviar-cluster"
TASK_DEF="kaviar-backend:latest"
REGION="us-east-2"
NETWORK_CONFIG="awsvpcConfiguration={subnets=[subnet-046613642f742faa2,subnet-01a498f7b4f3fcff5],securityGroups=[sg-0a54bc7272cae4623],assignPublicIp=ENABLED}"

echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║         APLICAR MIGRATION: Favorite Places em PROD                          ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo ""

# Passo 1: Snapshot RDS
echo "📸 Passo 1: Criar snapshot do RDS..."
SNAPSHOT_ID="kaviar-prod-before-favorite-places-$(date +%Y%m%d-%H%M%S)"
aws rds create-db-snapshot \
  --db-instance-identifier kaviar-prod-db \
  --db-snapshot-identifier "$SNAPSHOT_ID" \
  --region "$REGION" \
  --no-cli-pager

echo "✅ Snapshot criado: $SNAPSHOT_ID"
echo ""

# Passo 2: Aplicar SQL manual + Registrar migration
echo "🔧 Passo 2: Aplicar SQL manual e registrar migration..."
TASK_ARN=$(aws ecs run-task \
  --cluster "$CLUSTER" \
  --task-definition "$TASK_DEF" \
  --launch-type FARGATE \
  --network-configuration "$NETWORK_CONFIG" \
  --overrides '{
    "containerOverrides": [{
      "name": "kaviar-backend",
      "command": ["sh", "-c", "cd /app && npx prisma db execute --file prisma/migrations/20260209114403_add_favorite_places_fields/migration.sql --schema prisma/schema.prisma && npx prisma migrate resolve --applied 20260209114403_add_favorite_places_fields && npx prisma migrate status"]
    }]
  }' \
  --region "$REGION" \
  --query 'tasks[0].taskArn' \
  --output text)

echo "✅ Task iniciada: $TASK_ARN"
echo ""

# Passo 3: Aguardar conclusão
echo "⏳ Passo 3: Aguardando conclusão da task..."
aws ecs wait tasks-stopped \
  --cluster "$CLUSTER" \
  --tasks "$TASK_ARN" \
  --region "$REGION"

# Passo 4: Verificar resultado
echo "📋 Passo 4: Verificando resultado..."
EXIT_CODE=$(aws ecs describe-tasks \
  --cluster "$CLUSTER" \
  --tasks "$TASK_ARN" \
  --region "$REGION" \
  --query 'tasks[0].containers[0].exitCode' \
  --output text)

if [ "$EXIT_CODE" = "0" ]; then
  echo "✅ Migration aplicada com sucesso!"
  echo ""
  echo "📊 Próximos passos:"
  echo "  1. Verificar logs da task no CloudWatch"
  echo "  2. Testar endpoints de favoritos"
  echo "  3. Monitorar logs do backend"
else
  echo "❌ Erro ao aplicar migration (exit code: $EXIT_CODE)"
  echo ""
  echo "🔍 Verificar logs:"
  echo "  aws logs tail /ecs/kaviar-backend --follow --region $REGION"
  exit 1
fi
