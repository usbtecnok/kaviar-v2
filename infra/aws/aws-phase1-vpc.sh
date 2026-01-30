#!/bin/bash
# KAVIAR - FASE 1: VPC e Networking
# Região: us-east-2 (Ohio)

set -e

REGION="us-east-2"
PROJECT="kaviar"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  KAVIAR - FASE 1: VPC e Networking                         ║"
echo "║  Região: us-east-2                                         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# 1. Criar VPC
echo "1️⃣  Criando VPC..."
VPC_ID=$(aws ec2 create-vpc \
  --cidr-block 10.0.0.0/16 \
  --tag-specifications "ResourceType=vpc,Tags=[{Key=Name,Value=${PROJECT}-vpc},{Key=Project,Value=${PROJECT}}]" \
  --region $REGION \
  --query 'Vpc.VpcId' \
  --output text)

echo "✅ VPC criada: $VPC_ID"

# Habilitar DNS
aws ec2 modify-vpc-attribute --vpc-id $VPC_ID --enable-dns-hostnames --region $REGION
aws ec2 modify-vpc-attribute --vpc-id $VPC_ID --enable-dns-support --region $REGION

# 2. Criar Internet Gateway
echo ""
echo "2️⃣  Criando Internet Gateway..."
IGW_ID=$(aws ec2 create-internet-gateway \
  --tag-specifications "ResourceType=internet-gateway,Tags=[{Key=Name,Value=${PROJECT}-igw},{Key=Project,Value=${PROJECT}}]" \
  --region $REGION \
  --query 'InternetGateway.InternetGatewayId' \
  --output text)

echo "✅ Internet Gateway criado: $IGW_ID"

# Anexar IGW à VPC
aws ec2 attach-internet-gateway \
  --vpc-id $VPC_ID \
  --internet-gateway-id $IGW_ID \
  --region $REGION

echo "✅ Internet Gateway anexado à VPC"

# 3. Criar Subnets Públicas (para ALB e ECS)
echo ""
echo "3️⃣  Criando Subnets Públicas..."

SUBNET_PUBLIC_A=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.1.0/24 \
  --availability-zone ${REGION}a \
  --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=${PROJECT}-public-a},{Key=Project,Value=${PROJECT}}]" \
  --region $REGION \
  --query 'Subnet.SubnetId' \
  --output text)

SUBNET_PUBLIC_B=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.2.0/24 \
  --availability-zone ${REGION}b \
  --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=${PROJECT}-public-b},{Key=Project,Value=${PROJECT}}]" \
  --region $REGION \
  --query 'Subnet.SubnetId' \
  --output text)

echo "✅ Subnet Pública A: $SUBNET_PUBLIC_A (us-east-2a)"
echo "✅ Subnet Pública B: $SUBNET_PUBLIC_B (us-east-2b)"

# Habilitar IP público automático
aws ec2 modify-subnet-attribute --subnet-id $SUBNET_PUBLIC_A --map-public-ip-on-launch --region $REGION
aws ec2 modify-subnet-attribute --subnet-id $SUBNET_PUBLIC_B --map-public-ip-on-launch --region $REGION

# 4. Criar Subnets Privadas (para RDS e Redis)
echo ""
echo "4️⃣  Criando Subnets Privadas..."

SUBNET_PRIVATE_A=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.11.0/24 \
  --availability-zone ${REGION}a \
  --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=${PROJECT}-private-a},{Key=Project,Value=${PROJECT}}]" \
  --region $REGION \
  --query 'Subnet.SubnetId' \
  --output text)

SUBNET_PRIVATE_B=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.12.0/24 \
  --availability-zone ${REGION}b \
  --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=${PROJECT}-private-b},{Key=Project,Value=${PROJECT}}]" \
  --region $REGION \
  --query 'Subnet.SubnetId' \
  --output text)

echo "✅ Subnet Privada A: $SUBNET_PRIVATE_A (us-east-2a)"
echo "✅ Subnet Privada B: $SUBNET_PRIVATE_B (us-east-2b)"

# 5. Criar Route Table Pública
echo ""
echo "5️⃣  Criando Route Table..."

RTB_PUBLIC=$(aws ec2 create-route-table \
  --vpc-id $VPC_ID \
  --tag-specifications "ResourceType=route-table,Tags=[{Key=Name,Value=${PROJECT}-public-rtb},{Key=Project,Value=${PROJECT}}]" \
  --region $REGION \
  --query 'RouteTable.RouteTableId' \
  --output text)

echo "✅ Route Table criada: $RTB_PUBLIC"

# Adicionar rota para Internet
aws ec2 create-route \
  --route-table-id $RTB_PUBLIC \
  --destination-cidr-block 0.0.0.0/0 \
  --gateway-id $IGW_ID \
  --region $REGION

echo "✅ Rota para Internet adicionada"

# Associar subnets públicas à route table
aws ec2 associate-route-table --subnet-id $SUBNET_PUBLIC_A --route-table-id $RTB_PUBLIC --region $REGION
aws ec2 associate-route-table --subnet-id $SUBNET_PUBLIC_B --route-table-id $RTB_PUBLIC --region $REGION

echo "✅ Subnets públicas associadas à Route Table"

# 6. Salvar IDs em arquivo
echo ""
echo "6️⃣  Salvando IDs dos recursos..."

cat > /home/goes/kaviar/aws-resources.env <<EOF
# KAVIAR AWS Resources - Fase 1
# Gerado em: $(date)
# Região: $REGION

export AWS_REGION="$REGION"
export AWS_ACCOUNT_ID="847895361928"

# VPC e Networking
export VPC_ID="$VPC_ID"
export IGW_ID="$IGW_ID"
export SUBNET_PUBLIC_A="$SUBNET_PUBLIC_A"
export SUBNET_PUBLIC_B="$SUBNET_PUBLIC_B"
export SUBNET_PRIVATE_A="$SUBNET_PRIVATE_A"
export SUBNET_PRIVATE_B="$SUBNET_PRIVATE_B"
export RTB_PUBLIC="$RTB_PUBLIC"
EOF

echo "✅ IDs salvos em: /home/goes/kaviar/aws-resources.env"

# 7. Resumo
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  ✅ FASE 1 CONCLUÍDA COM SUCESSO                           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "📋 Recursos Criados:"
echo "   VPC:              $VPC_ID"
echo "   Internet Gateway: $IGW_ID"
echo "   Subnet Pública A: $SUBNET_PUBLIC_A"
echo "   Subnet Pública B: $SUBNET_PUBLIC_B"
echo "   Subnet Privada A: $SUBNET_PRIVATE_A"
echo "   Subnet Privada B: $SUBNET_PRIVATE_B"
echo "   Route Table:      $RTB_PUBLIC"
echo ""
echo "📁 IDs salvos em: aws-resources.env"
echo ""
echo "🎯 Próximo passo:"
echo "   source aws-resources.env"
echo "   ./aws-phase2-rds.sh"
echo ""
