#!/bin/bash
# Criar VPC Endpoints para SSM (permite EC2 privada usar SSM)
set -euo pipefail

source /home/goes/kaviar/aws-resources.env

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Criando VPC Endpoints para SSM                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Security Group para VPC Endpoints
echo "1️⃣ Criando Security Group para VPC Endpoints..."

SG_VPCE=$(aws ec2 describe-security-groups \
  --region $AWS_REGION \
  --filters Name=vpc-id,Values=$VPC_ID Name=group-name,Values=kaviar-vpce-sg \
  --query 'SecurityGroups[0].GroupId' \
  --output text 2>/dev/null || echo "None")

if [ "$SG_VPCE" = "None" ] || [ -z "$SG_VPCE" ]; then
  SG_VPCE=$(aws ec2 create-security-group \
    --group-name kaviar-vpce-sg \
    --description "Security group for VPC Endpoints" \
    --vpc-id $VPC_ID \
    --region $AWS_REGION \
    --query 'GroupId' \
    --output text)
  
  aws ec2 authorize-security-group-ingress \
    --group-id $SG_VPCE \
    --protocol tcp \
    --port 443 \
    --cidr 10.0.0.0/16 \
    --region $AWS_REGION
  
  echo "✅ Security Group criado: $SG_VPCE"
else
  echo "✅ Security Group já existe: $SG_VPCE"
fi

# Criar VPC Endpoints
echo ""
echo "2️⃣ Criando VPC Endpoints..."

# SSM Endpoint
aws ec2 create-vpc-endpoint \
  --vpc-id $VPC_ID \
  --vpc-endpoint-type Interface \
  --service-name com.amazonaws.$AWS_REGION.ssm \
  --subnet-ids $SUBNET_PRIVATE_A $SUBNET_PRIVATE_B \
  --security-group-ids $SG_VPCE \
  --region $AWS_REGION 2>/dev/null && echo "✅ SSM endpoint criado" || echo "SSM endpoint já existe"

# SSM Messages Endpoint
aws ec2 create-vpc-endpoint \
  --vpc-id $VPC_ID \
  --vpc-endpoint-type Interface \
  --service-name com.amazonaws.$AWS_REGION.ssmmessages \
  --subnet-ids $SUBNET_PRIVATE_A $SUBNET_PRIVATE_B \
  --security-group-ids $SG_VPCE \
  --region $AWS_REGION 2>/dev/null && echo "✅ SSM Messages endpoint criado" || echo "SSM Messages endpoint já existe"

# EC2 Messages Endpoint
aws ec2 create-vpc-endpoint \
  --vpc-id $VPC_ID \
  --vpc-endpoint-type Interface \
  --service-name com.amazonaws.$AWS_REGION.ec2messages \
  --subnet-ids $SUBNET_PRIVATE_A $SUBNET_PRIVATE_B \
  --security-group-ids $SG_VPCE \
  --region $AWS_REGION 2>/dev/null && echo "✅ EC2 Messages endpoint criado" || echo "EC2 Messages endpoint já existe"

echo ""
echo "✅ VPC Endpoints criados!"
echo ""
echo "⏳ Aguarde 2-3 minutos para endpoints ficarem disponíveis..."
echo "   Então tente conectar novamente:"
echo ""
echo "   aws ssm start-session --target i-0742a74bf6ada1f38 --region us-east-2"
echo ""
