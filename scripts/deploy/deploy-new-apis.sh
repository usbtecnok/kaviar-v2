#!/bin/bash
set -e

echo "🚀 Deploying new APIs to ECS..."

# Build
cd /home/goes/kaviar/backend
npm run build

# Push to ECR (se necessário)
# docker build -t kaviar-backend .
# docker tag kaviar-backend:latest 847895361928.dkr.ecr.us-east-1.amazonaws.com/kaviar-backend:latest
# docker push 847895361928.dkr.ecr.us-east-1.amazonaws.com/kaviar-backend:latest

# Force new deployment
aws ecs update-service \
  --cluster kaviar-prod \
  --service kaviar-backend-service \
  --force-new-deployment \
  --region us-east-1

echo "✅ Deploy iniciado"
echo "⏳ Aguarde 2-3min para novo container subir"
echo ""
echo "Verificar:"
echo "  aws ecs describe-services --cluster kaviar-prod --services kaviar-backend-service --region us-east-1"
