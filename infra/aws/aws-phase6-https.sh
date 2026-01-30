#!/bin/bash
# KAVIAR - FASE 6: HTTPS (ACM + ALB 443)
set -euo pipefail

source /home/goes/kaviar/aws-resources.env

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  KAVIAR - FASE 6: HTTPS (ACM + ALB 443)                    ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

ALB_ARN=$(aws elbv2 describe-load-balancers \
  --names kaviar-alb \
  --region $AWS_REGION \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text)

# ============================================================
# 1. CERTIFICADO ACM (Self-Signed para testes)
# ============================================================
echo "1️⃣ Configurando certificado SSL..."
echo ""
echo "⚠️  ATENÇÃO: Para produção, você precisa de um domínio próprio."
echo "   Opções:"
echo "   A) Usar certificado ACM com domínio validado (Route53)"
echo "   B) Importar certificado próprio"
echo "   C) Continuar sem HTTPS (apenas HTTP:80)"
echo ""
read -p "Você tem um domínio configurado no Route53? (y/N): " HAS_DOMAIN

if [[ "$HAS_DOMAIN" =~ ^[Yy]$ ]]; then
  read -p "Digite o domínio (ex: api.kaviar.com): " DOMAIN_NAME
  
  # Solicitar certificado ACM
  echo ""
  echo "📜 Solicitando certificado ACM para $DOMAIN_NAME..."
  
  CERT_ARN=$(aws acm request-certificate \
    --domain-name $DOMAIN_NAME \
    --validation-method DNS \
    --region $AWS_REGION \
    --query 'CertificateArn' \
    --output text)
  
  echo "   ✓ Certificado solicitado: $CERT_ARN"
  echo ""
  echo "⚠️  AÇÃO NECESSÁRIA:"
  echo "   1. Obtenha os registros DNS de validação:"
  echo "      aws acm describe-certificate --certificate-arn $CERT_ARN --region $AWS_REGION"
  echo ""
  echo "   2. Adicione os registros CNAME no Route53 ou seu provedor DNS"
  echo ""
  echo "   3. Aguarde validação (pode levar até 30 minutos)"
  echo ""
  echo "   4. Execute novamente este script após validação"
  echo ""
  
  # Salvar ARN
  cat >> /home/goes/kaviar/aws-resources.env <<EOF

# SSL Certificate (Fase 6)
export CERT_ARN="$CERT_ARN"
export DOMAIN_NAME="$DOMAIN_NAME"
EOF
  
  echo "✅ Certificado solicitado. Execute o script novamente após validação DNS."
  exit 0
else
  echo ""
  echo "⚠️  Sem domínio, não é possível configurar HTTPS no ALB."
  echo "   Alternativas:"
  echo "   1. Registrar domínio no Route53 (Fase 7)"
  echo "   2. Usar CloudFront com certificado ACM (já configurado na Fase 5)"
  echo "   3. Continuar com HTTP apenas (desenvolvimento)"
  echo ""
  echo "💡 RECOMENDAÇÃO: Use o CloudFront da Fase 5 que já tem HTTPS."
  echo "   Frontend: https://$CLOUDFRONT_DOMAIN"
  echo "   Backend: http://$ALB_DNS (interno, via CloudFront)"
  echo ""
  
  read -p "Deseja configurar CloudWatch Logs para o ALB? (Y/n): " SETUP_LOGS
  
  if [[ ! "$SETUP_LOGS" =~ ^[Nn]$ ]]; then
    echo ""
    echo "2️⃣ Configurando CloudWatch Logs..."
    
    # Criar log group
    LOG_GROUP="/aws/elasticloadbalancing/kaviar-alb"
    
    if aws logs describe-log-groups --log-group-name-prefix $LOG_GROUP --region $AWS_REGION --query 'logGroups[0].logGroupName' --output text 2>/dev/null | grep -q "$LOG_GROUP"; then
      echo "   ✓ Log group já existe: $LOG_GROUP"
    else
      aws logs create-log-group \
        --log-group-name $LOG_GROUP \
        --region $AWS_REGION
      
      echo "   ✓ Log group criado: $LOG_GROUP"
    fi
    
    # Habilitar access logs no ALB (S3)
    ALB_LOGS_BUCKET="kaviar-alb-logs-${AWS_ACCOUNT_ID}"
    
    if aws s3api head-bucket --bucket $ALB_LOGS_BUCKET --region $AWS_REGION 2>/dev/null; then
      echo "   ✓ Bucket de logs já existe: $ALB_LOGS_BUCKET"
    else
      aws s3api create-bucket \
        --bucket $ALB_LOGS_BUCKET \
        --region $AWS_REGION \
        --create-bucket-configuration LocationConstraint=$AWS_REGION >/dev/null
      
      # Bucket policy para ALB logs
      cat > /tmp/alb-logs-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "AWS": "arn:aws:iam::033677994240:root"
    },
    "Action": "s3:PutObject",
    "Resource": "arn:aws:s3:::${ALB_LOGS_BUCKET}/*"
  }]
}
EOF
      
      aws s3api put-bucket-policy \
        --bucket $ALB_LOGS_BUCKET \
        --policy file:///tmp/alb-logs-policy.json \
        --region $AWS_REGION
      
      echo "   ✓ Bucket de logs criado: $ALB_LOGS_BUCKET"
    fi
    
    # Habilitar access logs
    aws elbv2 modify-load-balancer-attributes \
      --load-balancer-arn $ALB_ARN \
      --attributes \
        Key=access_logs.s3.enabled,Value=true \
        Key=access_logs.s3.bucket,Value=$ALB_LOGS_BUCKET \
      --region $AWS_REGION >/dev/null
    
    echo "   ✓ Access logs habilitados"
    
    cat >> /home/goes/kaviar/aws-resources.env <<EOF

# ALB Logs (Fase 6)
export ALB_LOGS_BUCKET="$ALB_LOGS_BUCKET"
export ALB_LOG_GROUP="$LOG_GROUP"
EOF
  fi
  
  echo ""
  echo "╔════════════════════════════════════════════════════════════╗"
  echo "║  FASE 6 - CONFIGURAÇÃO PARCIAL                             ║"
  echo "╚════════════════════════════════════════════════════════════╝"
  echo ""
  echo "✅ CloudWatch Logs configurado"
  echo "⚠️  HTTPS requer domínio próprio (Fase 7)"
  echo ""
  echo "💡 Use CloudFront (Fase 5) para HTTPS no frontend"
  echo ""
  
  exit 0
fi

# ============================================================
# 2. VERIFICAR CERTIFICADO VALIDADO
# ============================================================
echo ""
echo "2️⃣ Verificando certificado..."

if [ -z "${CERT_ARN:-}" ]; then
  echo "❌ CERT_ARN não encontrado em aws-resources.env"
  echo "   Execute a primeira parte do script para solicitar certificado"
  exit 1
fi

CERT_STATUS=$(aws acm describe-certificate \
  --certificate-arn $CERT_ARN \
  --region $AWS_REGION \
  --query 'Certificate.Status' \
  --output text)

if [ "$CERT_STATUS" != "ISSUED" ]; then
  echo "❌ Certificado ainda não validado: $CERT_STATUS"
  echo ""
  echo "Registros DNS necessários:"
  aws acm describe-certificate \
    --certificate-arn $CERT_ARN \
    --region $AWS_REGION \
    --query 'Certificate.DomainValidationOptions[0].ResourceRecord' \
    --output table
  echo ""
  echo "Aguarde a validação e execute novamente"
  exit 1
fi

echo "   ✓ Certificado validado: $CERT_ARN"

# ============================================================
# 3. ADICIONAR LISTENER HTTPS (443)
# ============================================================
echo ""
echo "3️⃣ Configurando listener HTTPS..."

# Verificar se listener 443 já existe
HTTPS_LISTENER=$(aws elbv2 describe-listeners \
  --load-balancer-arn $ALB_ARN \
  --region $AWS_REGION \
  --query 'Listeners[?Port==`443`].ListenerArn' \
  --output text)

if [ -n "$HTTPS_LISTENER" ]; then
  echo "   ✓ Listener HTTPS já existe: $HTTPS_LISTENER"
else
  TG_ARN=$(aws elbv2 describe-target-groups \
    --names kaviar-backend-tg \
    --region $AWS_REGION \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text)
  
  HTTPS_LISTENER=$(aws elbv2 create-listener \
    --load-balancer-arn $ALB_ARN \
    --protocol HTTPS \
    --port 443 \
    --certificates CertificateArn=$CERT_ARN \
    --default-actions Type=forward,TargetGroupArn=$TG_ARN \
    --region $AWS_REGION \
    --query 'Listeners[0].ListenerArn' \
    --output text)
  
  echo "   ✓ Listener HTTPS criado: $HTTPS_LISTENER"
fi

# ============================================================
# 4. REDIRECT HTTP → HTTPS
# ============================================================
echo ""
echo "4️⃣ Configurando redirect HTTP → HTTPS..."

HTTP_LISTENER=$(aws elbv2 describe-listeners \
  --load-balancer-arn $ALB_ARN \
  --region $AWS_REGION \
  --query 'Listeners[?Port==`80`].ListenerArn' \
  --output text)

# Modificar listener HTTP para redirect
aws elbv2 modify-listener \
  --listener-arn $HTTP_LISTENER \
  --default-actions Type=redirect,RedirectConfig="{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}" \
  --region $AWS_REGION >/dev/null

echo "   ✓ Redirect HTTP → HTTPS configurado"

# ============================================================
# 5. CLOUDWATCH LOGS
# ============================================================
echo ""
echo "5️⃣ Configurando CloudWatch Logs..."

LOG_GROUP="/aws/elasticloadbalancing/kaviar-alb"

if aws logs describe-log-groups --log-group-name-prefix $LOG_GROUP --region $AWS_REGION --query 'logGroups[0].logGroupName' --output text 2>/dev/null | grep -q "$LOG_GROUP"; then
  echo "   ✓ Log group já existe: $LOG_GROUP"
else
  aws logs create-log-group \
    --log-group-name $LOG_GROUP \
    --region $AWS_REGION
  
  echo "   ✓ Log group criado: $LOG_GROUP"
fi

# Habilitar access logs (S3)
ALB_LOGS_BUCKET="kaviar-alb-logs-${AWS_ACCOUNT_ID}"

if aws s3api head-bucket --bucket $ALB_LOGS_BUCKET --region $AWS_REGION 2>/dev/null; then
  echo "   ✓ Bucket de logs já existe: $ALB_LOGS_BUCKET"
else
  aws s3api create-bucket \
    --bucket $ALB_LOGS_BUCKET \
    --region $AWS_REGION \
    --create-bucket-configuration LocationConstraint=$AWS_REGION >/dev/null
  
  # Bucket policy para ALB logs (ELB account para us-east-2)
  cat > /tmp/alb-logs-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "AWS": "arn:aws:iam::033677994240:root"
    },
    "Action": "s3:PutObject",
    "Resource": "arn:aws:s3:::${ALB_LOGS_BUCKET}/*"
  }]
}
EOF
  
  aws s3api put-bucket-policy \
    --bucket $ALB_LOGS_BUCKET \
    --policy file:///tmp/alb-logs-policy.json \
    --region $AWS_REGION
  
  echo "   ✓ Bucket de logs criado: $ALB_LOGS_BUCKET"
fi

aws elbv2 modify-load-balancer-attributes \
  --load-balancer-arn $ALB_ARN \
  --attributes \
    Key=access_logs.s3.enabled,Value=true \
    Key=access_logs.s3.bucket,Value=$ALB_LOGS_BUCKET \
  --region $AWS_REGION >/dev/null

echo "   ✓ Access logs habilitados"

# ============================================================
# 6. SALVAR VARIÁVEIS
# ============================================================
echo ""
echo "6️⃣ Salvando variáveis..."

cat >> /home/goes/kaviar/aws-resources.env <<EOF

# HTTPS + Logs (Fase 6)
export HTTPS_LISTENER="$HTTPS_LISTENER"
export ALB_LOGS_BUCKET="$ALB_LOGS_BUCKET"
export ALB_LOG_GROUP="$LOG_GROUP"
export ALB_HTTPS_URL="https://${DOMAIN_NAME}"
EOF

echo "   ✓ Variáveis salvas"

# ============================================================
# 7. VALIDAÇÃO
# ============================================================
echo ""
echo "7️⃣ Validando HTTPS..."
echo ""

echo "⏳ Aguardando 10 segundos..."
sleep 10

HTTPS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://${DOMAIN_NAME}/api/health" || echo "000")
echo "   HTTPS: HTTP $HTTPS_CODE"

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -L "http://${DOMAIN_NAME}/api/health" || echo "000")
echo "   HTTP Redirect: HTTP $HTTP_CODE"

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  FASE 6 CONCLUÍDA                                          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 Recursos configurados:"
echo "   • Certificado ACM: $CERT_ARN"
echo "   • Listener HTTPS: 443"
echo "   • Redirect HTTP → HTTPS"
echo "   • CloudWatch Logs: $LOG_GROUP"
echo "   • Access Logs: s3://$ALB_LOGS_BUCKET"
echo ""
echo "🧪 Validação:"
echo "   ./validate-phase6.sh"
echo ""
echo "🌐 URL HTTPS:"
echo "   https://${DOMAIN_NAME}"
echo ""
