#!/bin/bash
# KAVIAR - FASE 4A: Build e Push Docker para ECR
set -euo pipefail

source /home/goes/kaviar/aws-resources.env

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  KAVIAR - FASE 4A: Docker + ECR                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# 1. Criar repositório ECR
echo "1️⃣ Criando repositório ECR..."

aws ecr create-repository \
  --repository-name kaviar-backend \
  --region $AWS_REGION 2>/dev/null || echo "Repositório já existe"

ECR_URI=$(aws ecr describe-repositories \
  --repository-names kaviar-backend \
  --region $AWS_REGION \
  --query 'repositories[0].repositoryUri' \
  --output text)

echo "✅ ECR Repository: $ECR_URI"

# 2. Login no ECR
echo ""
echo "2️⃣ Fazendo login no ECR..."

aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin $ECR_URI

echo "✅ Login realizado"

# 3. Build da imagem
echo ""
echo "3️⃣ Building Docker image..."

cd /home/goes/kaviar/backend

docker build -t kaviar-backend:latest .

echo "✅ Build concluído"

# 4. Tag e Push
echo ""
echo "4️⃣ Pushing para ECR..."

docker tag kaviar-backend:latest $ECR_URI:latest
docker push $ECR_URI:latest

echo "✅ Push concluído"

# 5. Salvar ECR URI
cat >> /home/goes/kaviar/aws-resources.env <<EOF

# ECR
export ECR_URI="$ECR_URI"
EOF

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  ✅ FASE 4A CONCLUÍDA                                      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "📋 ECR URI: $ECR_URI:latest"
echo ""
echo "🎯 Próximo passo:"
echo "   ./aws-phase4b-ecs-alb.sh"
echo ""
