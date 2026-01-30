# 🚀 Migração Kaviar: Render → AWS (Parte 3 - Final)

## 📋 FASE 9: Frontend no S3 + CloudFront (1 hora)

### 9.1 Build do Frontend

```bash
cd /home/goes/kaviar/frontend-app

# Atualizar .env.production com ALB DNS
cat > .env.production <<EOF
VITE_API_BASE_URL=http://$ALB_DNS
NODE_ENV=production
EOF

# Build
npm run build

echo "✅ Frontend buildado em dist/"
```

### 9.2 Criar Bucket S3 para Frontend

```bash
FRONTEND_BUCKET="kaviar-frontend-$(date +%s)"

aws s3api create-bucket \
  --bucket $FRONTEND_BUCKET \
  --region us-east-2 \
  --create-bucket-configuration LocationConstraint=us-east-2

# Configurar como website estático
aws s3 website s3://$FRONTEND_BUCKET/ \
  --index-document index.html \
  --error-document index.html

# Policy para acesso público (via CloudFront)
cat > frontend-bucket-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::$FRONTEND_BUCKET/*"
    }
  ]
}
EOF

aws s3api put-bucket-policy \
  --bucket $FRONTEND_BUCKET \
  --policy file://frontend-bucket-policy.json

echo "FRONTEND_BUCKET=$FRONTEND_BUCKET" >> aws-resources.env
```

### 9.3 Upload do Frontend

```bash
cd /home/goes/kaviar/frontend-app

aws s3 sync dist/ s3://$FRONTEND_BUCKET/ \
  --delete \
  --cache-control "public, max-age=31536000" \
  --exclude "index.html"

# index.html sem cache (para atualizações)
aws s3 cp dist/index.html s3://$FRONTEND_BUCKET/index.html \
  --cache-control "no-cache, no-store, must-revalidate"

echo "✅ Frontend enviado para S3"
```

### 9.4 Criar CloudFront Distribution (Opcional - CDN)

```bash
# Criar Origin Access Identity
OAI_ID=$(aws cloudfront create-cloud-front-origin-access-identity \
  --cloud-front-origin-access-identity-config \
    CallerReference=$(date +%s),Comment="Kaviar Frontend OAI" \
  --query 'CloudFrontOriginAccessIdentity.Id' \
  --output text)

# Criar distribuição CloudFront
cat > cloudfront-config.json <<EOF
{
  "CallerReference": "$(date +%s)",
  "Comment": "Kaviar Frontend CDN",
  "Enabled": true,
  "DefaultRootObject": "index.html",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3-$FRONTEND_BUCKET",
        "DomainName": "$FRONTEND_BUCKET.s3.us-east-2.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": "origin-access-identity/cloudfront/$OAI_ID"
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-$FRONTEND_BUCKET",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"]
    },
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": {"Forward": "none"}
    },
    "MinTTL": 0,
    "DefaultTTL": 86400,
    "MaxTTL": 31536000
  }
}
EOF

CF_ID=$(aws cloudfront create-distribution \
  --distribution-config file://cloudfront-config.json \
  --query 'Distribution.Id' \
  --output text)

CF_DOMAIN=$(aws cloudfront get-distribution \
  --id $CF_ID \
  --query 'Distribution.DomainName' \
  --output text)

echo "CLOUDFRONT_ID=$CF_ID" >> aws-resources.env
echo "CLOUDFRONT_DOMAIN=$CF_DOMAIN" >> aws-resources.env
echo "✅ CloudFront criado: https://$CF_DOMAIN"
```

---

## 📋 FASE 10: SQS para Jobs Assíncronos (30 minutos)

### 10.1 Criar Fila SQS

```bash
# Fila principal
SQS_URL=$(aws sqs create-queue \
  --queue-name kaviar-jobs \
  --attributes VisibilityTimeout=300,MessageRetentionPeriod=1209600 \
  --region us-east-2 \
  --query 'QueueUrl' \
  --output text)

# Dead Letter Queue (DLQ)
DLQ_URL=$(aws sqs create-queue \
  --queue-name kaviar-jobs-dlq \
  --region us-east-2 \
  --query 'QueueUrl' \
  --output text)

DLQ_ARN=$(aws sqs get-queue-attributes \
  --queue-url $DLQ_URL \
  --attribute-names QueueArn \
  --region us-east-2 \
  --query 'Attributes.QueueArn' \
  --output text)

# Configurar DLQ na fila principal
aws sqs set-queue-attributes \
  --queue-url $SQS_URL \
  --attributes RedrivePolicy="{\"deadLetterTargetArn\":\"$DLQ_ARN\",\"maxReceiveCount\":\"3\"}" \
  --region us-east-2

echo "SQS_URL=$SQS_URL" >> aws-resources.env
echo "DLQ_URL=$DLQ_URL" >> aws-resources.env
echo "✅ SQS criado: $SQS_URL"
```

### 10.2 Adicionar Permissão SQS ao ECS Task Role

```bash
cat > ecs-task-sqs-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sqs:SendMessage",
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes"
      ],
      "Resource": [
        "$(aws sqs get-queue-attributes --queue-url $SQS_URL --attribute-names QueueArn --query 'Attributes.QueueArn' --output text --region us-east-2)",
        "$DLQ_ARN"
      ]
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name kaviarEcsTaskRole \
  --policy-name KaviarSQSAccess \
  --policy-document file://ecs-task-sqs-policy.json
```

### 10.3 Criar Worker ECS Service (Processar Jobs)

```bash
# Atualizar Task Definition com SQS_URL
# (Adicionar variável de ambiente SQS_URL na task definition)

# Criar service worker (sem ALB)
aws ecs create-service \
  --cluster kaviar-cluster \
  --service-name kaviar-worker-service \
  --task-definition kaviar-backend \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_PRIVATE_A,$SUBNET_PRIVATE_B],securityGroups=[$SG_ECS]}" \
  --region us-east-2

echo "✅ Worker service criado"
```

---

## 📋 FASE 11: Secrets Manager (Segurança) (30 minutos)

### 11.1 Migrar Secrets para AWS Secrets Manager

```bash
# Criar secret para database
aws secretsmanager create-secret \
  --name kaviar/database \
  --description "Kaviar Database Credentials" \
  --secret-string '{"username":"kaviaradmin","password":"SuaSenhaSegura123!","host":"'$RDS_ENDPOINT'","port":"5432","database":"kaviar"}' \
  --region us-east-2

# Criar secret para JWT
aws secretsmanager create-secret \
  --name kaviar/jwt \
  --description "Kaviar JWT Secret" \
  --secret-string '{"secret":"67197934459161cd74ab8be94c70b88df17b38d7b99c564a3662752f15249db8"}' \
  --region us-east-2

# Criar secret para Twilio
aws secretsmanager create-secret \
  --name kaviar/twilio \
  --description "Kaviar Twilio Credentials" \
  --secret-string '{"account_sid":"YOUR_TWILIO_SID","auth_token":"YOUR_TWILIO_TOKEN","whatsapp_number":"whatsapp:+14134759634"}' \
  --region us-east-2

echo "✅ Secrets criados no Secrets Manager"
```

### 11.2 Atualizar Task Definition para Usar Secrets

```bash
# Adicionar permissão ao Task Execution Role
cat > ecs-secrets-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": [
        "arn:aws:secretsmanager:us-east-2:*:secret:kaviar/*"
      ]
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name kaviarEcsTaskExecutionRole \
  --policy-name KaviarSecretsAccess \
  --policy-document file://ecs-secrets-policy.json
```

---

## 📋 FASE 12: Monitoramento e Alarmes (1 hora)

### 12.1 Criar CloudWatch Alarms

```bash
# Alarm para CPU alta
aws cloudwatch put-metric-alarm \
  --alarm-name kaviar-ecs-high-cpu \
  --alarm-description "Alert when ECS CPU > 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --dimensions Name=ServiceName,Value=kaviar-backend-service Name=ClusterName,Value=kaviar-cluster \
  --region us-east-2

# Alarm para Memory alta
aws cloudwatch put-metric-alarm \
  --alarm-name kaviar-ecs-high-memory \
  --alarm-description "Alert when ECS Memory > 80%" \
  --metric-name MemoryUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --dimensions Name=ServiceName,Value=kaviar-backend-service Name=ClusterName,Value=kaviar-cluster \
  --region us-east-2

# Alarm para ALB 5xx errors
aws cloudwatch put-metric-alarm \
  --alarm-name kaviar-alb-5xx-errors \
  --alarm-description "Alert when ALB 5xx errors > 10" \
  --metric-name HTTPCode_Target_5XX_Count \
  --namespace AWS/ApplicationELB \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --dimensions Name=LoadBalancer,Value=$(echo $ALB_ARN | cut -d: -f6) \
  --region us-east-2

echo "✅ CloudWatch Alarms criados"
```

### 12.2 Criar Dashboard

```bash
cat > cloudwatch-dashboard.json <<EOF
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/ECS", "CPUUtilization", {"stat": "Average"}],
          [".", "MemoryUtilization", {"stat": "Average"}]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-2",
        "title": "ECS Resources"
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/ApplicationELB", "RequestCount", {"stat": "Sum"}],
          [".", "TargetResponseTime", {"stat": "Average"}]
        ],
        "period": 300,
        "region": "us-east-2",
        "title": "ALB Metrics"
      }
    }
  ]
}
EOF

aws cloudwatch put-dashboard \
  --dashboard-name Kaviar-Production \
  --dashboard-body file://cloudwatch-dashboard.json \
  --region us-east-2

echo "✅ Dashboard criado: https://console.aws.amazon.com/cloudwatch/home?region=us-east-2#dashboards:name=Kaviar-Production"
```

---

## 📋 FASE 13: Cutover (Migração Final) (1 hora)

### 13.1 Checklist Pré-Cutover

```bash
echo "🔍 CHECKLIST PRÉ-CUTOVER"
echo "========================"
echo ""

# 1. Validar RDS
echo "1️⃣ RDS PostgreSQL:"
psql "postgresql://kaviaradmin:SuaSenhaSegura123!@$RDS_ENDPOINT:5432/kaviar" -c "SELECT COUNT(*) FROM drivers;"

# 2. Validar ECS
echo "2️⃣ ECS Service:"
aws ecs describe-services \
  --cluster kaviar-cluster \
  --services kaviar-backend-service \
  --region us-east-2 \
  --query 'services[0].runningCount'

# 3. Validar ALB
echo "3️⃣ ALB Health:"
curl -s "http://$ALB_DNS/api/health" | jq

# 4. Validar Frontend
echo "4️⃣ Frontend S3:"
curl -I "http://$FRONTEND_BUCKET.s3-website.us-east-2.amazonaws.com"

echo ""
echo "✅ Todos os componentes validados"
```

### 13.2 Atualizar DNS (Route 53 ou Provedor Externo)

```bash
# Se usar Route 53:
HOSTED_ZONE_ID="Z1234567890ABC"  # Seu Hosted Zone ID

# Criar registro A para backend (apontando para ALB)
cat > route53-backend.json <<EOF
{
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.kaviar.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "$(aws elbv2 describe-load-balancers --load-balancer-arns $ALB_ARN --query 'LoadBalancers[0].CanonicalHostedZoneId' --output text --region us-east-2)",
          "DNSName": "$ALB_DNS",
          "EvaluateTargetHealth": true
        }
      }
    }
  ]
}
EOF

aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch file://route53-backend.json

# Criar registro A para frontend (apontando para CloudFront)
cat > route53-frontend.json <<EOF
{
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "app.kaviar.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z2FDTNDATAQYW2",
          "DNSName": "$CLOUDFRONT_DOMAIN",
          "EvaluateTargetHealth": false
        }
      }
    }
  ]
}
EOF

aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch file://route53-frontend.json

echo "✅ DNS atualizado"
echo "   Backend: api.kaviar.com → $ALB_DNS"
echo "   Frontend: app.kaviar.com → $CLOUDFRONT_DOMAIN"
```

### 13.3 Desativar Render.com

```bash
echo "⚠️  ATENÇÃO: Após validar que AWS está 100% operacional:"
echo ""
echo "1. Acessar Render Dashboard"
echo "2. Suspender serviços:"
echo "   - kaviar-v2 (backend)"
echo "   - kaviar-frontend"
echo ""
echo "3. Manter por 7 dias antes de deletar (rollback safety)"
```

---

## 📊 RESUMO FINAL

### Recursos Criados

```bash
source aws-resources.env

cat <<EOF

╔════════════════════════════════════════════════════════════╗
║          KAVIAR - MIGRAÇÃO AWS CONCLUÍDA ✅                ║
╚════════════════════════════════════════════════════════════╝

🌐 ENDPOINTS:
   Backend:  http://$ALB_DNS
   Frontend: http://$FRONTEND_BUCKET.s3-website.us-east-2.amazonaws.com
   CloudFront: https://$CLOUDFRONT_DOMAIN

💾 DATABASE:
   RDS PostgreSQL: $RDS_ENDPOINT:5432/kaviar

🗄️  STORAGE:
   S3 Uploads: s3://$S3_BUCKET
   S3 Frontend: s3://$FRONTEND_BUCKET

⚡ CACHE:
   Redis: $REDIS_ENDPOINT:6379

📬 QUEUE:
   SQS: $SQS_URL

🐳 CONTAINERS:
   ECS Cluster: kaviar-cluster
   Service API: kaviar-backend-service (2 tasks)
   Service Worker: kaviar-worker-service (1 task)
   ECR: $ECR_URI

🔒 SECURITY:
   Secrets Manager: kaviar/database, kaviar/jwt, kaviar/twilio
   IAM Roles: kaviarEcsTaskExecutionRole, kaviarEcsTaskRole

📊 MONITORING:
   CloudWatch Logs: /ecs/kaviar-backend
   Dashboard: Kaviar-Production
   Alarms: CPU, Memory, 5xx errors

💰 CUSTO ESTIMADO MENSAL:
   - ECS Fargate (3 tasks): ~$30
   - RDS t3.micro: ~$15
   - ElastiCache t3.micro: ~$12
   - ALB: ~$20
   - S3 + CloudFront: ~$5
   - Data Transfer: ~$10
   ────────────────────────────
   TOTAL: ~$92/mês

EOF
```

### Próximos Passos

1. **Configurar HTTPS** (ACM + ALB Listener 443)
2. **Auto Scaling** (ECS Service Auto Scaling)
3. **Backup Automatizado** (RDS Snapshots + S3 Lifecycle)
4. **CI/CD** (GitHub Actions → ECR → ECS)
5. **WAF** (AWS WAF para proteção DDoS)

---

**🎉 MIGRAÇÃO CONCLUÍDA COM SUCESSO!**
