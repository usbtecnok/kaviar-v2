#!/bin/bash
# Deploy frontend atômico (Anti-Frankenstein)

set -euo pipefail

BUCKET="kaviar-frontend-847895361928"
CLOUDFRONT_ID="E30XJMSBHGZAGN"
REGION="us-east-2"

echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║         DEPLOY FRONTEND ATÔMICO (Anti-Frankenstein)                         ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo ""

cd ~/kaviar/frontend-app

# 1. Build
echo "🔨 1. Build..."
VITE_API_BASE_URL=https://api.kaviar.com.br npm run build

if [ ! -f "dist/index.html" ]; then
  echo "❌ Build FAIL: dist/index.html não encontrado"
  exit 1
fi

MAIN_JS=$(grep -oP '/assets/index-[^"]+\.js' dist/index.html | head -1 | sed 's|/||')
echo "✅ Build OK"
echo "   Main JS: $MAIN_JS"
echo ""

# 2. Upload assets PRIMEIRO (ordem crítica)
echo "📤 2. Upload assets (JS)..."
aws s3 sync dist/assets/ s3://$BUCKET/assets/ \
  --exclude "*.css" \
  --cache-control "public, max-age=31536000, immutable" \
  --content-type "application/javascript" \
  --region $REGION

echo "📤 3. Upload assets (CSS)..."
aws s3 sync dist/assets/ s3://$BUCKET/assets/ \
  --exclude "*.js" \
  --cache-control "public, max-age=31536000, immutable" \
  --content-type "text/css" \
  --region $REGION

echo "✅ Assets uploaded"
echo ""

# 3. Validar que o asset principal existe
echo "🔍 4. Validando asset principal..."
if aws s3api head-object --bucket $BUCKET --key $MAIN_JS --region $REGION > /dev/null 2>&1; then
  echo "✅ Asset existe: $MAIN_JS"
else
  echo "❌ FAIL: Asset não encontrado no S3: $MAIN_JS"
  exit 1
fi
echo ""

# 4. Upload index.html POR ÚLTIMO (ordem crítica)
echo "📤 5. Upload index.html..."
aws s3 cp dist/index.html s3://$BUCKET/index.html \
  --cache-control "no-cache" \
  --content-type "text/html" \
  --region $REGION

echo "✅ index.html uploaded"
echo ""

# 5. Invalidation
echo "🔄 6. CloudFront invalidation..."
INVALIDATION_ID=$(aws cloudfront create-invalidation \
  --distribution-id $CLOUDFRONT_ID \
  --paths "/*" \
  --region $REGION \
  --query 'Invalidation.Id' \
  --output text)

echo "✅ Invalidation criada: $INVALIDATION_ID"
echo ""

# 6. Validação
echo "🔍 7. Validação (aguarde 30s para propagação)..."
sleep 30

CONTENT_TYPE=$(curl -sS -I https://kaviar.com.br/$MAIN_JS 2>&1 | grep -i "content-type:" | cut -d: -f2- | xargs)

echo "   Content-Type: $CONTENT_TYPE"

if [[ "$CONTENT_TYPE" == *"javascript"* ]]; then
  echo "✅ Content-Type correto"
else
  echo "⚠️  Content-Type inesperado (pode ser cache, aguarde mais tempo)"
fi
echo ""

echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║                    ✅ DEPLOY CONCLUÍDO                                       ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo ""
echo "📋 Evidências:"
echo "  - Bucket: $BUCKET"
echo "  - CloudFront: $CLOUDFRONT_ID"
echo "  - Main JS: $MAIN_JS"
echo "  - Invalidation: $INVALIDATION_ID"
echo ""
echo "🧪 Teste:"
echo "  curl -I https://kaviar.com.br/$MAIN_JS | grep content-type"
echo "  # Deve retornar: content-type: text/javascript"
