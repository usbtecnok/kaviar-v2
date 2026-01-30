#!/bin/bash
set -e

# FASE 6: HTTPS no ALB com ACM
# Domain: kaviar.com.br (Cloudflare DNS)

source aws-resources.env

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  FASE 6: HTTPS NO ALB                                      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

DOMAIN="kaviar.com.br"
API_SUBDOMAIN="api.kaviar.com.br"

# 1. Request ACM Certificate
echo "1️⃣ Solicitando certificado ACM..."
CERT_ARN=$(aws acm request-certificate \
  --domain-name $API_SUBDOMAIN \
  --validation-method DNS \
  --region $AWS_REGION \
  --query 'CertificateArn' \
  --output text)

echo "   Certificate ARN: $CERT_ARN"
echo ""

# 2. Get DNS validation records
echo "2️⃣ Obtendo registros DNS para validação..."
sleep 5

aws acm describe-certificate \
  --certificate-arn $CERT_ARN \
  --region $AWS_REGION \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord' \
  --output json > /tmp/acm-validation.json

DNS_NAME=$(jq -r '.Name' /tmp/acm-validation.json)
DNS_VALUE=$(jq -r '.Value' /tmp/acm-validation.json)

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  ⚠️  AÇÃO MANUAL NECESSÁRIA - CLOUDFLARE DNS              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Adicione este registro CNAME no Cloudflare:"
echo ""
echo "  Type:  CNAME"
echo "  Name:  ${DNS_NAME%.}"
echo "  Value: ${DNS_VALUE%.}"
echo "  TTL:   Auto"
echo "  Proxy: OFF (DNS only)"
echo ""
echo "Após adicionar, aguarde 5-10 minutos para validação."
echo ""
echo "Para verificar status:"
echo "  aws acm describe-certificate --certificate-arn $CERT_ARN --region $AWS_REGION --query 'Certificate.Status'"
echo ""

# Save for next steps
echo "export CERT_ARN=\"$CERT_ARN\"" >> aws-resources.env
echo "export API_DOMAIN=\"$API_SUBDOMAIN\"" >> aws-resources.env

echo "✅ Certificado solicitado. Aguardando validação DNS..."
