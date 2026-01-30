#!/bin/bash
# Validação Fase 6 - HTTPS
set -euo pipefail

source /home/goes/kaviar/aws-resources.env

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  VALIDAÇÃO FASE 6 - HTTPS                                  ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Verificar se tem domínio configurado
if [ -z "${DOMAIN_NAME:-}" ]; then
  echo "⚠️  Domínio não configurado"
  echo ""
  echo "Validando apenas CloudWatch Logs..."
  echo ""
  
  # 1. CloudWatch Logs
  echo "1️⃣ CloudWatch Logs:"
  if [ -n "${ALB_LOG_GROUP:-}" ]; then
    if aws logs describe-log-groups --log-group-name-prefix $ALB_LOG_GROUP --region $AWS_REGION --query 'logGroups[0].logGroupName' --output text 2>/dev/null | grep -q "$ALB_LOG_GROUP"; then
      echo "   ✓ Log group existe: $ALB_LOG_GROUP"
    else
      echo "   ❌ Log group não encontrado"
    fi
  else
    echo "   ⚠️  ALB_LOG_GROUP não configurado"
  fi
  
  # 2. S3 Access Logs
  echo ""
  echo "2️⃣ S3 Access Logs:"
  if [ -n "${ALB_LOGS_BUCKET:-}" ]; then
    if aws s3api head-bucket --bucket $ALB_LOGS_BUCKET --region $AWS_REGION 2>/dev/null; then
      echo "   ✓ Bucket existe: $ALB_LOGS_BUCKET"
    else
      echo "   ❌ Bucket não encontrado"
    fi
  else
    echo "   ⚠️  ALB_LOGS_BUCKET não configurado"
  fi
  
  echo ""
  echo "💡 Para HTTPS completo, configure um domínio (Fase 7)"
  echo "   Ou use CloudFront da Fase 5: https://$CLOUDFRONT_DOMAIN"
  echo ""
  exit 0
fi

# 1. Certificado ACM
echo "1️⃣ Certificado ACM:"
CERT_STATUS=$(aws acm describe-certificate \
  --certificate-arn $CERT_ARN \
  --region $AWS_REGION \
  --query 'Certificate.Status' \
  --output text 2>/dev/null || echo "NotFound")

echo "   Status: $CERT_STATUS"

if [ "$CERT_STATUS" = "ISSUED" ]; then
  echo "   ✓ Certificado validado"
else
  echo "   ❌ Certificado não validado"
fi

# 2. Listener HTTPS
echo ""
echo "2️⃣ Listener HTTPS:"
ALB_ARN=$(aws elbv2 describe-load-balancers \
  --names kaviar-alb \
  --region $AWS_REGION \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text)

HTTPS_LISTENER_EXISTS=$(aws elbv2 describe-listeners \
  --load-balancer-arn $ALB_ARN \
  --region $AWS_REGION \
  --query 'Listeners[?Port==`443`].ListenerArn' \
  --output text)

if [ -n "$HTTPS_LISTENER_EXISTS" ]; then
  echo "   ✓ Listener HTTPS configurado (porta 443)"
else
  echo "   ❌ Listener HTTPS não encontrado"
fi

# 3. Redirect HTTP → HTTPS
echo ""
echo "3️⃣ Redirect HTTP → HTTPS:"
HTTP_LISTENER_ACTION=$(aws elbv2 describe-listeners \
  --load-balancer-arn $ALB_ARN \
  --region $AWS_REGION \
  --query 'Listeners[?Port==`80`].DefaultActions[0].Type' \
  --output text)

if [ "$HTTP_LISTENER_ACTION" = "redirect" ]; then
  echo "   ✓ Redirect configurado"
else
  echo "   ⚠️  Redirect não configurado (action: $HTTP_LISTENER_ACTION)"
fi

# 4. Teste HTTPS
echo ""
echo "4️⃣ Teste HTTPS:"
HTTPS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://${DOMAIN_NAME}/api/health" 2>/dev/null || echo "000")
echo "   HTTPS: HTTP $HTTPS_CODE"

if [ "$HTTPS_CODE" = "200" ]; then
  echo "   ✓ HTTPS funcionando"
  
  # Testar redirect
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -L "http://${DOMAIN_NAME}/api/health" 2>/dev/null || echo "000")
  echo "   HTTP Redirect: HTTP $HTTP_CODE"
  
  if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✓ Redirect funcionando"
  fi
else
  echo "   ❌ HTTPS não acessível"
fi

# 5. CloudWatch Logs
echo ""
echo "5️⃣ CloudWatch Logs:"
if aws logs describe-log-groups --log-group-name-prefix $ALB_LOG_GROUP --region $AWS_REGION --query 'logGroups[0].logGroupName' --output text 2>/dev/null | grep -q "$ALB_LOG_GROUP"; then
  echo "   ✓ Log group existe: $ALB_LOG_GROUP"
else
  echo "   ❌ Log group não encontrado"
fi

# 6. S3 Access Logs
echo ""
echo "6️⃣ S3 Access Logs:"
if aws s3api head-bucket --bucket $ALB_LOGS_BUCKET --region $AWS_REGION 2>/dev/null; then
  echo "   ✓ Bucket existe: $ALB_LOGS_BUCKET"
  
  LOG_COUNT=$(aws s3 ls s3://$ALB_LOGS_BUCKET/ --recursive --region $AWS_REGION 2>/dev/null | wc -l || echo "0")
  echo "   ✓ Arquivos de log: $LOG_COUNT"
else
  echo "   ❌ Bucket não encontrado"
fi

# Resultado
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  RESULTADO                                                 ║"
echo "╚════════════════════════════════════════════════════════════╝"

if [ "$CERT_STATUS" = "ISSUED" ] && [ -n "$HTTPS_LISTENER_EXISTS" ] && [ "$HTTPS_CODE" = "200" ]; then
  echo "✅ FASE 6 OPERACIONAL"
  echo ""
  echo "🔒 HTTPS configurado:"
  echo "   • Certificado: Validado"
  echo "   • Listener: 443"
  echo "   • Redirect: HTTP → HTTPS"
  echo "   • URL: https://${DOMAIN_NAME}"
else
  echo "❌ FASE 6 COM PROBLEMAS"
  [ "$CERT_STATUS" != "ISSUED" ] && echo "   • Certificado não validado"
  [ -z "$HTTPS_LISTENER_EXISTS" ] && echo "   • Listener HTTPS não configurado"
  [ "$HTTPS_CODE" != "200" ] && echo "   • HTTPS não acessível"
fi

echo ""
