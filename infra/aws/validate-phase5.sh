#!/bin/bash
# Validação Fase 5 - Frontend (FIXED)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source variáveis
if [ ! -f "$SCRIPT_DIR/aws-resources.env" ]; then
  echo "❌ Arquivo aws-resources.env não encontrado"
  exit 1
fi

source "$SCRIPT_DIR/aws-resources.env"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  VALIDAÇÃO FASE 5 - FRONTEND                               ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Verificar variáveis obrigatórias
MISSING_VARS=()
[ -z "${FRONTEND_BUCKET:-}" ] && MISSING_VARS+=("FRONTEND_BUCKET")
[ -z "${CLOUDFRONT_ID:-}" ] && MISSING_VARS+=("CLOUDFRONT_ID")
[ -z "${CLOUDFRONT_DOMAIN:-}" ] && MISSING_VARS+=("CLOUDFRONT_DOMAIN")
[ -z "${ALB_DNS:-}" ] && MISSING_VARS+=("ALB_DNS")

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
  echo "❌ Variáveis não encontradas em aws-resources.env:"
  for var in "${MISSING_VARS[@]}"; do
    echo "   • $var"
  done
  echo ""
  echo "Execute primeiro: ./aws-phase5-frontend.sh"
  exit 1
fi

echo "📦 Configuração:"
echo "   Bucket: $FRONTEND_BUCKET"
echo "   CloudFront ID: $CLOUDFRONT_ID"
echo "   CloudFront Domain: $CLOUDFRONT_DOMAIN"
echo ""

# 1. S3 Bucket
echo "1️⃣ S3 Bucket:"
if aws s3api head-bucket --bucket $FRONTEND_BUCKET --region $AWS_REGION 2>/dev/null; then
  echo "   ✓ Bucket existe: $FRONTEND_BUCKET"
  
  FILE_COUNT=$(aws s3 ls s3://$FRONTEND_BUCKET/ --recursive --region $AWS_REGION 2>/dev/null | wc -l)
  echo "   ✓ Arquivos: $FILE_COUNT"
  
  # Verificar index.html
  if aws s3api head-object --bucket $FRONTEND_BUCKET --key index.html --region $AWS_REGION >/dev/null 2>&1; then
    echo "   ✓ index.html presente"
  else
    echo "   ❌ index.html não encontrado"
  fi
else
  echo "   ❌ Bucket não encontrado"
fi

# 2. S3 Website
echo ""
echo "2️⃣ S3 Website:"
S3_WEBSITE_URL="http://${FRONTEND_BUCKET}.s3-website.${AWS_REGION}.amazonaws.com"
S3_HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$S3_WEBSITE_URL" 2>/dev/null || echo "000")
echo "   URL: $S3_WEBSITE_URL"
echo "   HTTP Status: $S3_HTTP_CODE"

if [ "$S3_HTTP_CODE" = "200" ]; then
  echo "   ✓ Website acessível"
else
  echo "   ❌ Website não acessível"
fi

# 3. CloudFront
echo ""
echo "3️⃣ CloudFront:"
CF_STATUS=$(aws cloudfront get-distribution \
  --id $CLOUDFRONT_ID \
  --query 'Distribution.Status' \
  --output text 2>/dev/null || echo "NotFound")

echo "   ID: $CLOUDFRONT_ID"
echo "   Domain: $CLOUDFRONT_DOMAIN"
echo "   Status: $CF_STATUS"

if [ "$CF_STATUS" = "Deployed" ]; then
  echo "   ✓ Distribution deployed"
  
  CF_HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://$CLOUDFRONT_DOMAIN" 2>/dev/null || echo "000")
  echo "   HTTPS Status: $CF_HTTP_CODE"
  
  if [ "$CF_HTTP_CODE" = "200" ] || [ "$CF_HTTP_CODE" = "304" ]; then
    echo "   ✓ CloudFront acessível"
    
    # Testar SPA routing (404 → index.html)
    CF_404_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://$CLOUDFRONT_DOMAIN/nonexistent" 2>/dev/null || echo "000")
    if [ "$CF_404_CODE" = "200" ]; then
      echo "   ✓ SPA routing funcionando (404 → 200)"
    else
      echo "   ⚠️  SPA routing retornou HTTP $CF_404_CODE"
    fi
  else
    echo "   ⚠️  CloudFront retornou HTTP $CF_HTTP_CODE"
  fi
elif [ "$CF_STATUS" = "InProgress" ]; then
  echo "   ⚠️  Distribution ainda em deployment"
  echo "   → Aguarde 5-10 minutos e execute novamente"
else
  echo "   ❌ Distribution não encontrada ou com erro"
fi

# 4. API Connection
echo ""
echo "4️⃣ API Connection:"
echo "   Backend URL: http://$ALB_DNS"

API_HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://$ALB_DNS/api/health" 2>/dev/null || echo "000")
echo "   Backend Status: HTTP $API_HTTP_CODE"

if [ "$API_HTTP_CODE" = "200" ]; then
  echo "   ✓ Backend acessível"
else
  echo "   ❌ Backend não acessível"
fi

# 5. Comandos de Verificação
echo ""
echo "5️⃣ Comandos de Verificação:"
echo ""
echo "# Listar distribuição"
echo "aws cloudfront get-distribution --id $CLOUDFRONT_ID --query 'Distribution.{Domain:DomainName,Status:Status}' --output table"
echo ""
echo "# Testar CloudFront"
echo "curl -I https://$CLOUDFRONT_DOMAIN"
echo ""
echo "# Verificar index.html"
echo "curl -s https://$CLOUDFRONT_DOMAIN | grep -o '<title>.*</title>'"
echo ""
echo "# Verificar assets"
echo "curl -I https://$CLOUDFRONT_DOMAIN/assets/ 2>&1 | grep -E '(HTTP|cache-control)'"
echo ""

# Resultado
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  RESULTADO                                                 ║"
echo "╚════════════════════════════════════════════════════════════╝"

if [ "$S3_HTTP_CODE" = "200" ] && [ "$API_HTTP_CODE" = "200" ] && [ "$CF_STATUS" = "Deployed" ]; then
  if [ "$CF_HTTP_CODE" = "200" ] || [ "$CF_HTTP_CODE" = "304" ]; then
    echo "✅ FASE 5 OPERACIONAL"
    echo ""
    echo "🌐 URLs:"
    echo "   • S3 Website: $S3_WEBSITE_URL"
    echo "   • CloudFront: https://$CLOUDFRONT_DOMAIN"
    echo "   • Backend: http://$ALB_DNS"
    echo ""
    echo "💡 Acesse no browser: https://$CLOUDFRONT_DOMAIN"
  else
    echo "⚠️  FASE 5 PARCIALMENTE OPERACIONAL"
    echo "   • CloudFront deployed mas não acessível (HTTP $CF_HTTP_CODE)"
    echo "   • Aguarde alguns minutos para propagação"
  fi
else
  echo "❌ FASE 5 COM PROBLEMAS"
  [ "$S3_HTTP_CODE" != "200" ] && echo "   • S3 Website não acessível"
  [ "$API_HTTP_CODE" != "200" ] && echo "   • Backend não acessível"
  [ "$CF_STATUS" != "Deployed" ] && echo "   • CloudFront não deployed ($CF_STATUS)"
fi

echo ""
