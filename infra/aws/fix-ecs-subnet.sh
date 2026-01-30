#!/bin/bash
# Fix: Recriar ECS Service em subnet pública
set -euo pipefail

source /home/goes/kaviar/aws-resources.env

echo "🔧 Recriando ECS Service em subnet pública..."

# 1. Deletar service atual
aws ecs delete-service \
  --cluster kaviar-cluster \
  --service kaviar-backend-svc \
  --force \
  --region $AWS_REGION

echo "⏳ Aguardando service ser deletado..."
sleep 30

# 2. Criar novo service em subnet PÚBLICA
aws ecs create-service \
  --cluster kaviar-cluster \
  --service-name kaviar-backend-service \
  --task-definition kaviar-backend \
  --desired-count 2 \
  --launch-type FARGATE \
  --platform-version LATEST \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_PUBLIC_A,$SUBNET_PUBLIC_B],securityGroups=[$SG_ECS],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=$TG_ARN,containerName=kaviar-backend,containerPort=3001" \
  --health-check-grace-period-seconds 60 \
  --region $AWS_REGION

echo "⏳ Aguardando service ficar estável..."
aws ecs wait services-stable \
  --cluster kaviar-cluster \
  --services kaviar-backend-service \
  --region $AWS_REGION

echo "✅ Service recriado em subnet pública!"
echo ""
echo "🎯 Testar:"
echo "   curl http://$ALB_DNS/api/health"
