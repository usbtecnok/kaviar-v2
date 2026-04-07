#!/bin/bash

# Script de Deploy Kaviar - Sistema de Taxa Territorial
# Versão: 1.0.0

set -e

echo "🚀 DEPLOY KAVIAR - SISTEMA DE TAXA TERRITORIAL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. Build do backend
echo "📦 1/5 - Building backend..."
cd backend
npm run build
echo "✅ Backend built"
echo ""

# 2. Criar bundle
echo "📦 2/5 - Creating deployment bundle..."
zip -r backend-bundle.zip dist prisma package.json package-lock.json .npmrc .ebextensions Procfile -q
echo "✅ Bundle created"
echo ""

# 3. Upload para S3
echo "☁️  3/5 - Uploading to S3..."
aws s3 cp backend-bundle.zip s3://elasticbeanstalk-us-east-1-847895361928/kaviar-backend/ \
  --region us-east-1
echo "✅ Uploaded to S3"
echo ""

# 4. Criar versão no Elastic Beanstalk
VERSION="v-neighborhood-stats-$(date +%Y%m%d-%H%M%S)"
echo "📝 4/5 - Creating EB version: $VERSION..."

aws elasticbeanstalk create-application-version \
  --application-name Kaviar \
  --version-label "$VERSION" \
  --source-bundle S3Bucket="elasticbeanstalk-us-east-1-847895361928",S3Key="kaviar-backend/backend-bundle.zip" \
  --region us-east-1 \
  --description "Ranking de Bairro + Gamificação"

echo "✅ Version created: $VERSION"
echo ""

# 5. Deploy para ambiente
echo "🚀 5/5 - Deploying to production..."
aws elasticbeanstalk update-environment \
  --environment-name Kaviar-prod-v3 \
  --version-label "$VERSION" \
  --region us-east-1

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DEPLOY INICIADO COM SUCESSO!"
echo ""
echo "Versão: $VERSION"
echo "Ambiente: Kaviar-prod-v3"
echo ""
echo "Acompanhe o deploy:"
echo "aws elasticbeanstalk describe-environments --environment-names Kaviar-prod-v3 --region us-east-1"
echo ""
echo "Ou acesse:"
echo "https://us-east-1.console.aws.amazon.com/elasticbeanstalk"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
