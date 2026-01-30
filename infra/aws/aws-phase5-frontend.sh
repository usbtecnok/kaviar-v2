#!/bin/bash
# KAVIAR - FASE 5: Frontend (S3 + CloudFront) - FIXED
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/aws-resources.env"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  KAVIAR - FASE 5: FRONTEND (S3 + CloudFront)               ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Variáveis determinísticas
export FRONTEND_BUCKET="kaviar-frontend-${AWS_ACCOUNT_ID}"
export FRONTEND_DIR="/home/goes/kaviar/frontend-app"

echo "📦 Configuração:"
echo "   Bucket: $FRONTEND_BUCKET"
echo "   Region: $AWS_REGION"
echo "   Backend: http://$ALB_DNS"
echo ""

# ============================================================
# 1. CRIAR S3 BUCKET
# ============================================================
echo "1️⃣ Criando S3 bucket para frontend..."

if aws s3api head-bucket --bucket $FRONTEND_BUCKET --region $AWS_REGION 2>/dev/null; then
  echo "   ✓ Bucket já existe: $FRONTEND_BUCKET"
else
  aws s3api create-bucket \
    --bucket $FRONTEND_BUCKET \
    --region $AWS_REGION \
    --create-bucket-configuration LocationConstraint=$AWS_REGION >/dev/null
  
  echo "   ✓ Bucket criado: $FRONTEND_BUCKET"
fi

# Desabilitar Block Public Access
aws s3api put-public-access-block \
  --bucket $FRONTEND_BUCKET \
  --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false" \
  --region $AWS_REGION 2>/dev/null

# Bucket policy para acesso público
cat > /tmp/bucket-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicReadGetObject",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::${FRONTEND_BUCKET}/*"
  }]
}
EOF

aws s3api put-bucket-policy \
  --bucket $FRONTEND_BUCKET \
  --policy file:///tmp/bucket-policy.json \
  --region $AWS_REGION 2>/dev/null

# Configurar website hosting
aws s3api put-bucket-website \
  --bucket $FRONTEND_BUCKET \
  --website-configuration '{
    "IndexDocument": {"Suffix": "index.html"},
    "ErrorDocument": {"Key": "index.html"}
  }' \
  --region $AWS_REGION 2>/dev/null

echo "   ✓ Bucket configurado para website hosting"

export S3_WEBSITE_URL="http://${FRONTEND_BUCKET}.s3-website.${AWS_REGION}.amazonaws.com"

# ============================================================
# 2. BUILD FRONTEND
# ============================================================
echo ""
echo "2️⃣ Building frontend..."

if [ ! -d "$FRONTEND_DIR" ]; then
  echo "   ❌ Diretório não encontrado: $FRONTEND_DIR"
  exit 1
fi

cd $FRONTEND_DIR

# Criar .env.production
cat > .env.production <<EOF
VITE_API_BASE_URL=http://${ALB_DNS}
VITE_API_URL=http://${ALB_DNS}/api
VITE_GOOGLE_MAPS_API_KEY=${GOOGLE_MAPS_API_KEY:-your_google_maps_api_key_here}
EOF

echo "   ✓ .env.production criado"

# Build
npm run build >/dev/null 2>&1

if [ ! -d "dist" ]; then
  echo "   ❌ Build falhou: dist/ não encontrado"
  exit 1
fi

echo "   ✓ Build concluído: $FRONTEND_DIR/dist"

# ============================================================
# 3. UPLOAD PARA S3
# ============================================================
echo ""
echo "3️⃣ Uploading para S3..."

# Assets com cache longo
aws s3 sync dist/ s3://$FRONTEND_BUCKET/ \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html" \
  --exclude "*.html" \
  --region $AWS_REGION >/dev/null

# HTML sem cache
aws s3 cp dist/index.html s3://$FRONTEND_BUCKET/index.html \
  --cache-control "no-cache, no-store, must-revalidate" \
  --content-type "text/html" \
  --region $AWS_REGION >/dev/null

echo "   ✓ Upload concluído"

# ============================================================
# 4. CLOUDFRONT DISTRIBUTION
# ============================================================
echo ""
echo "4️⃣ Criando CloudFront distribution..."

# Buscar distribuição existente pelo origin
EXISTING_DIST=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Origins.Items[?DomainName=='${FRONTEND_BUCKET}.s3-website.${AWS_REGION}.amazonaws.com']].Id" \
  --output text 2>/dev/null)

if [ -n "$EXISTING_DIST" ] && [ "$EXISTING_DIST" != "None" ]; then
  export CLOUDFRONT_ID="$EXISTING_DIST"
  echo "   ✓ Distribution já existe: $CLOUDFRONT_ID"
  
  # Invalidar cache
  aws cloudfront create-invalidation \
    --distribution-id $CLOUDFRONT_ID \
    --paths "/*" >/dev/null 2>&1
  
  echo "   ✓ Cache invalidado"
else
  echo "   → Criando nova distribution..."
  
  # Criar distribution
  cat > /tmp/cloudfront-config.json <<EOF
{
  "CallerReference": "kaviar-frontend-$(date +%s)",
  "Comment": "Kaviar Frontend Distribution",
  "Enabled": true,
  "Origins": {
    "Quantity": 1,
    "Items": [{
      "Id": "S3-${FRONTEND_BUCKET}",
      "DomainName": "${FRONTEND_BUCKET}.s3-website.${AWS_REGION}.amazonaws.com",
      "CustomOriginConfig": {
        "HTTPPort": 80,
        "HTTPSPort": 443,
        "OriginProtocolPolicy": "http-only"
      }
    }]
  },
  "DefaultRootObject": "index.html",
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-${FRONTEND_BUCKET}",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"],
      "CachedMethods": {
        "Quantity": 2,
        "Items": ["GET", "HEAD"]
      }
    },
    "Compress": true,
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": {"Forward": "none"}
    },
    "MinTTL": 0,
    "DefaultTTL": 86400,
    "MaxTTL": 31536000,
    "TrustedSigners": {
      "Enabled": false,
      "Quantity": 0
    }
  },
  "CustomErrorResponses": {
    "Quantity": 2,
    "Items": [
      {
        "ErrorCode": 403,
        "ResponsePagePath": "/index.html",
        "ResponseCode": "200",
        "ErrorCachingMinTTL": 300
      },
      {
        "ErrorCode": 404,
        "ResponsePagePath": "/index.html",
        "ResponseCode": "200",
        "ErrorCachingMinTTL": 300
      }
    ]
  },
  "PriceClass": "PriceClass_100"
}
EOF

  CLOUDFRONT_ID=$(aws cloudfront create-distribution \
    --distribution-config file:///tmp/cloudfront-config.json \
    --query 'Distribution.Id' \
    --output text)
  
  export CLOUDFRONT_ID
  echo "   ✓ Distribution criada: $CLOUDFRONT_ID"
  echo "   ⏳ Aguardando deployment (pode levar 5-10 minutos)..."
fi

# Obter domain name
export CLOUDFRONT_DOMAIN=$(aws cloudfront get-distribution \
  --id $CLOUDFRONT_ID \
  --query 'Distribution.DomainName' \
  --output text)

echo "   ✓ CloudFront Domain: $CLOUDFRONT_DOMAIN"

# ============================================================
# 5. SALVAR VARIÁVEIS
# ============================================================
echo ""
echo "5️⃣ Salvando variáveis..."

# Remover variáveis antigas da Fase 5 se existirem
sed -i '/# Frontend (Fase 5)/,/^$/d' /home/goes/kaviar/aws-resources.env 2>/dev/null || true

cat >> /home/goes/kaviar/aws-resources.env <<EOF

# Frontend (Fase 5)
export FRONTEND_BUCKET="$FRONTEND_BUCKET"
export S3_WEBSITE_URL="$S3_WEBSITE_URL"
export CLOUDFRONT_ID="$CLOUDFRONT_ID"
export CLOUDFRONT_DOMAIN="$CLOUDFRONT_DOMAIN"
export FRONTEND_URL="https://$CLOUDFRONT_DOMAIN"
EOF

echo "   ✓ Variáveis salvas em aws-resources.env"

# ============================================================
# 6. VALIDAÇÃO
# ============================================================
echo ""
echo "6️⃣ Validando deployment..."
echo ""

# Testar S3 website
echo "🧪 Testando S3 website..."
S3_HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$S3_WEBSITE_URL" 2>/dev/null || echo "000")
echo "   S3 Website: HTTP $S3_HTTP_CODE"

if [ "$S3_HTTP_CODE" = "200" ]; then
  echo "   ✓ S3 website acessível"
else
  echo "   ⚠️  S3 website retornou HTTP $S3_HTTP_CODE"
fi

# Testar CloudFront
echo ""
echo "🧪 Testando CloudFront..."
CF_STATUS=$(aws cloudfront get-distribution --id $CLOUDFRONT_ID --query 'Distribution.Status' --output text)
echo "   CloudFront Status: $CF_STATUS"

if [ "$CF_STATUS" = "Deployed" ]; then
  echo "   ⏳ Aguardando 10 segundos para propagação..."
  sleep 10
  
  CF_HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://$CLOUDFRONT_DOMAIN" 2>/dev/null || echo "000")
  echo "   CloudFront: HTTP $CF_HTTP_CODE"
  
  if [ "$CF_HTTP_CODE" = "200" ] || [ "$CF_HTTP_CODE" = "304" ]; then
    echo "   ✓ CloudFront acessível"
  else
    echo "   ⚠️  CloudFront retornou HTTP $CF_HTTP_CODE (pode estar propagando)"
  fi
else
  echo "   ⚠️  CloudFront ainda em deployment, aguarde 5-10 minutos"
  echo "   → Monitore: watch -n 30 'aws cloudfront get-distribution --id $CLOUDFRONT_ID --query Distribution.Status --output text'"
fi

# Testar backend
echo ""
echo "🧪 Testando Backend..."
API_HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://$ALB_DNS/api/health" 2>/dev/null || echo "000")
echo "   Backend: HTTP $API_HTTP_CODE"

if [ "$API_HTTP_CODE" = "200" ]; then
  echo "   ✓ Backend acessível"
else
  echo "   ⚠️  Backend não acessível"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  FASE 5 CONCLUÍDA                                          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 Recursos criados:"
echo "   • S3 Bucket: $FRONTEND_BUCKET"
echo "   • S3 Website: $S3_WEBSITE_URL"
echo "   • CloudFront ID: $CLOUDFRONT_ID"
echo "   • CloudFront Domain: $CLOUDFRONT_DOMAIN"
echo ""
echo "🧪 Validação:"
echo "   source aws-resources.env"
echo "   ./validate-phase5.sh"
echo ""
echo "🌐 Acesse no browser:"
echo "   https://$CLOUDFRONT_DOMAIN"
echo ""
echo "📋 Verificação manual:"
echo "   curl -I https://$CLOUDFRONT_DOMAIN"
echo "   aws cloudfront get-distribution --id $CLOUDFRONT_ID --query 'Distribution.Status' --output text"
echo ""
