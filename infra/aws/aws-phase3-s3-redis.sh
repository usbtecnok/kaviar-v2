#!/bin/bash
# KAVIAR - FASE 3: S3 + Redis + SQS
set -euo pipefail

source /home/goes/kaviar/aws-resources.env

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  KAVIAR - FASE 3: S3 + Redis + SQS                         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# ============================================================
# 1. S3 BUCKET PARA UPLOADS
# ============================================================
echo "1️⃣ Criando S3 Bucket para uploads..."

BUCKET_NAME="kaviar-uploads-$(date +%s)"

aws s3api create-bucket \
  --bucket $BUCKET_NAME \
  --region $AWS_REGION \
  --create-bucket-configuration LocationConstraint=$AWS_REGION

echo "✅ Bucket criado: $BUCKET_NAME"

# Bloquear acesso público
aws s3api put-public-access-block \
  --bucket $BUCKET_NAME \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

echo "✅ Acesso público bloqueado"

# Configurar CORS
cat > /tmp/s3-cors.json <<EOF
{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3000
    }
  ]
}
EOF

aws s3api put-bucket-cors \
  --bucket $BUCKET_NAME \
  --cors-configuration file:///tmp/s3-cors.json

echo "✅ CORS configurado"

# ============================================================
# 2. ELASTICACHE REDIS
# ============================================================
echo ""
echo "2️⃣ Criando ElastiCache Redis..."

# Security Group para Redis
SG_REDIS=$(aws ec2 describe-security-groups \
  --region $AWS_REGION \
  --filters Name=vpc-id,Values=$VPC_ID Name=group-name,Values=kaviar-redis-sg \
  --query 'SecurityGroups[0].GroupId' \
  --output text 2>/dev/null || echo "None")

if [ "$SG_REDIS" = "None" ] || [ -z "$SG_REDIS" ]; then
  SG_REDIS=$(aws ec2 create-security-group \
    --group-name kaviar-redis-sg \
    --description "Security group for Kaviar Redis" \
    --vpc-id $VPC_ID \
    --region $AWS_REGION \
    --query 'GroupId' \
    --output text)
  
  aws ec2 authorize-security-group-ingress \
    --group-id $SG_REDIS \
    --protocol tcp \
    --port 6379 \
    --cidr 10.0.0.0/16 \
    --region $AWS_REGION
  
  echo "✅ Security Group Redis criado: $SG_REDIS"
else
  echo "✅ Security Group Redis já existe: $SG_REDIS"
fi

# Subnet Group para Redis
aws elasticache create-cache-subnet-group \
  --cache-subnet-group-name kaviar-redis-subnet-group \
  --cache-subnet-group-description "Subnet group for Kaviar Redis" \
  --subnet-ids $SUBNET_PRIVATE_A $SUBNET_PRIVATE_B \
  --region $AWS_REGION 2>/dev/null || echo "Subnet group já existe"

echo "✅ Subnet Group configurado"

# Criar cluster Redis
aws elasticache create-cache-cluster \
  --cache-cluster-id kaviar-redis \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --num-cache-nodes 1 \
  --cache-subnet-group-name kaviar-redis-subnet-group \
  --security-group-ids $SG_REDIS \
  --region $AWS_REGION 2>/dev/null || echo "Redis já existe"

echo "⏳ Aguardando Redis ficar disponível (3-5 minutos)..."

aws elasticache wait cache-cluster-available \
  --cache-cluster-id kaviar-redis \
  --region $AWS_REGION

# Obter endpoint
REDIS_ENDPOINT=$(aws elasticache describe-cache-clusters \
  --cache-cluster-id kaviar-redis \
  --show-cache-node-info \
  --region $AWS_REGION \
  --query 'CacheClusters[0].CacheNodes[0].Endpoint.Address' \
  --output text)

REDIS_PORT=$(aws elasticache describe-cache-clusters \
  --cache-cluster-id kaviar-redis \
  --show-cache-node-info \
  --region $AWS_REGION \
  --query 'CacheClusters[0].CacheNodes[0].Endpoint.Port' \
  --output text)

echo "✅ Redis disponível: $REDIS_ENDPOINT:$REDIS_PORT"

# ============================================================
# 3. SQS QUEUE
# ============================================================
echo ""
echo "3️⃣ Criando SQS Queue..."

# Dead Letter Queue
DLQ_URL=$(aws sqs create-queue \
  --queue-name kaviar-jobs-dlq \
  --region $AWS_REGION \
  --query 'QueueUrl' \
  --output text 2>/dev/null || aws sqs get-queue-url --queue-name kaviar-jobs-dlq --region $AWS_REGION --query 'QueueUrl' --output text)

DLQ_ARN=$(aws sqs get-queue-attributes \
  --queue-url $DLQ_URL \
  --attribute-names QueueArn \
  --region $AWS_REGION \
  --query 'Attributes.QueueArn' \
  --output text)

echo "✅ DLQ criada: $DLQ_URL"

# Main Queue
SQS_URL=$(aws sqs create-queue \
  --queue-name kaviar-jobs \
  --attributes VisibilityTimeout=300,MessageRetentionPeriod=1209600,RedrivePolicy="{\"deadLetterTargetArn\":\"$DLQ_ARN\",\"maxReceiveCount\":\"3\"}" \
  --region $AWS_REGION \
  --query 'QueueUrl' \
  --output text 2>/dev/null || aws sqs get-queue-url --queue-name kaviar-jobs --region $AWS_REGION --query 'QueueUrl' --output text)

echo "✅ SQS Queue criada: $SQS_URL"

# ============================================================
# 4. SALVAR RECURSOS
# ============================================================
echo ""
echo "4️⃣ Salvando recursos..."

cat >> /home/goes/kaviar/aws-resources.env <<EOF

# S3
export S3_BUCKET="$BUCKET_NAME"

# Redis
export SG_REDIS="$SG_REDIS"
export REDIS_ENDPOINT="$REDIS_ENDPOINT"
export REDIS_PORT="$REDIS_PORT"
export REDIS_URL="redis://$REDIS_ENDPOINT:$REDIS_PORT"

# SQS
export SQS_URL="$SQS_URL"
export DLQ_URL="$DLQ_URL"
export DLQ_ARN="$DLQ_ARN"
EOF

echo "✅ Recursos salvos em aws-resources.env"

# ============================================================
# 5. RESUMO
# ============================================================
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  ✅ FASE 3 CONCLUÍDA COM SUCESSO                           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "📋 Recursos Criados:"
echo "   S3 Bucket:    $BUCKET_NAME"
echo "   Redis:        $REDIS_ENDPOINT:$REDIS_PORT"
echo "   SQS Queue:    $SQS_URL"
echo "   DLQ:          $DLQ_URL"
echo ""
echo "🎯 Próxima fase:"
echo "   ./aws-phase4-docker-ecr.sh"
echo ""
