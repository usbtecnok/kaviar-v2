# 🚀 Migração Kaviar: Render → AWS (Guia Completo)

**Data:** 2026-01-28  
**Status Atual:** Render.com + Neon PostgreSQL  
**Objetivo:** AWS 100% (ECS + RDS + S3 + ElastiCache + ALB)

---

## 📋 FASE 1: Preparação (1-2 dias)

### 1.1 Pré-requisitos AWS

```bash
# Instalar AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configurar credenciais
aws configure
# AWS Access Key ID: <sua-key>
# AWS Secret Access Key: <sua-secret>
# Default region: us-east-2
# Default output format: json

# Verificar
aws sts get-caller-identity
```

### 1.2 Criar VPC e Subnets

```bash
# Criar VPC
VPC_ID=$(aws ec2 create-vpc \
  --cidr-block 10.0.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=kaviar-vpc}]' \
  --region us-east-2 \
  --query 'Vpc.VpcId' --output text)

echo "VPC_ID=$VPC_ID"

# Criar Internet Gateway
IGW_ID=$(aws ec2 create-internet-gateway \
  --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=kaviar-igw}]' \
  --region us-east-2 \
  --query 'InternetGateway.InternetGatewayId' --output text)

aws ec2 attach-internet-gateway \
  --vpc-id $VPC_ID \
  --internet-gateway-id $IGW_ID \
  --region us-east-2

# Criar Subnets Públicas (2 AZs para ALB)
SUBNET_PUBLIC_A=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.1.0/24 \
  --availability-zone us-east-2a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=kaviar-public-a}]' \
  --region us-east-2 \
  --query 'Subnet.SubnetId' --output text)

SUBNET_PUBLIC_B=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.2.0/24 \
  --availability-zone us-east-2b \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=kaviar-public-b}]' \
  --region us-east-2 \
  --query 'Subnet.SubnetId' --output text)

# Criar Subnets Privadas (para RDS/ElastiCache)
SUBNET_PRIVATE_A=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.11.0/24 \
  --availability-zone us-east-2a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=kaviar-private-a}]' \
  --region us-east-2 \
  --query 'Subnet.SubnetId' --output text)

SUBNET_PRIVATE_B=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.12.0/24 \
  --availability-zone us-east-2b \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=kaviar-private-b}]' \
  --region us-east-2 \
  --query 'Subnet.SubnetId' --output text)

# Configurar Route Table
RTB_ID=$(aws ec2 create-route-table \
  --vpc-id $VPC_ID \
  --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=kaviar-public-rtb}]' \
  --region us-east-2 \
  --query 'RouteTable.RouteTableId' --output text)

aws ec2 create-route \
  --route-table-id $RTB_ID \
  --destination-cidr-block 0.0.0.0/0 \
  --gateway-id $IGW_ID \
  --region us-east-2

aws ec2 associate-route-table --subnet-id $SUBNET_PUBLIC_A --route-table-id $RTB_ID --region us-east-2
aws ec2 associate-route-table --subnet-id $SUBNET_PUBLIC_B --route-table-id $RTB_ID --region us-east-2

# Salvar IDs
cat > aws-resources.env <<EOF
VPC_ID=$VPC_ID
IGW_ID=$IGW_ID
SUBNET_PUBLIC_A=$SUBNET_PUBLIC_A
SUBNET_PUBLIC_B=$SUBNET_PUBLIC_B
SUBNET_PRIVATE_A=$SUBNET_PRIVATE_A
SUBNET_PRIVATE_B=$SUBNET_PRIVATE_B
RTB_ID=$RTB_ID
EOF

echo "✅ VPC e Subnets criadas. IDs salvos em aws-resources.env"
```

---

## 📋 FASE 2: Banco de Dados RDS PostgreSQL (2-3 horas)

### 2.1 Criar Security Group para RDS

```bash
source aws-resources.env

SG_RDS=$(aws ec2 create-security-group \
  --group-name kaviar-rds-sg \
  --description "Security group for Kaviar RDS PostgreSQL" \
  --vpc-id $VPC_ID \
  --region us-east-2 \
  --query 'GroupId' --output text)

# Permitir acesso PostgreSQL (porta 5432) da VPC
aws ec2 authorize-security-group-ingress \
  --group-id $SG_RDS \
  --protocol tcp \
  --port 5432 \
  --cidr 10.0.0.0/16 \
  --region us-east-2

echo "SG_RDS=$SG_RDS" >> aws-resources.env
```

### 2.2 Criar DB Subnet Group

```bash
aws rds create-db-subnet-group \
  --db-subnet-group-name kaviar-db-subnet-group \
  --db-subnet-group-description "Subnet group for Kaviar RDS" \
  --subnet-ids $SUBNET_PRIVATE_A $SUBNET_PRIVATE_B \
  --region us-east-2
```

### 2.3 Criar RDS PostgreSQL com PostGIS

```bash
# Criar instância RDS
aws rds create-db-instance \
  --db-instance-identifier kaviar-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.4 \
  --master-username kaviaradmin \
  --master-user-password 'SuaSenhaSegura123!' \
  --allocated-storage 20 \
  --storage-type gp3 \
  --db-subnet-group-name kaviar-db-subnet-group \
  --vpc-security-group-ids $SG_RDS \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-04:00" \
  --preferred-maintenance-window "mon:04:00-mon:05:00" \
  --publicly-accessible false \
  --region us-east-2

echo "⏳ Aguardando RDS ficar disponível (5-10 minutos)..."
aws rds wait db-instance-available \
  --db-instance-identifier kaviar-db \
  --region us-east-2

# Obter endpoint
RDS_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier kaviar-db \
  --region us-east-2 \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text)

echo "RDS_ENDPOINT=$RDS_ENDPOINT" >> aws-resources.env
echo "✅ RDS criado: $RDS_ENDPOINT"
```

### 2.4 Instalar PostGIS e Migrar Dados

```bash
# Conectar ao RDS (via bastion ou VPN)
psql "postgresql://kaviaradmin:SuaSenhaSegura123!@$RDS_ENDPOINT:5432/postgres"

-- Criar database
CREATE DATABASE kaviar;
\c kaviar

-- Instalar PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Verificar
SELECT PostGIS_version();
\q
```

**Migrar dados do Neon para RDS:**

```bash
# 1. Backup do Neon
pg_dump "postgresql://neondb_owner:npg_2xbfMWRF6hrO@ep-wispy-thunder-ad850l5j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require" \
  --no-owner --no-acl \
  > kaviar-neon-backup.sql

# 2. Restaurar no RDS
psql "postgresql://kaviaradmin:SuaSenhaSegura123!@$RDS_ENDPOINT:5432/kaviar" \
  < kaviar-neon-backup.sql

# 3. Executar migrations Prisma
cd /home/goes/kaviar/backend
DATABASE_URL="postgresql://kaviaradmin:SuaSenhaSegura123!@$RDS_ENDPOINT:5432/kaviar?sslmode=require" \
  npx prisma migrate deploy
```

---

## 📋 FASE 3: S3 para Uploads (30 minutos)

```bash
# Criar bucket S3
BUCKET_NAME="kaviar-uploads-$(date +%s)"
aws s3api create-bucket \
  --bucket $BUCKET_NAME \
  --region us-east-2 \
  --create-bucket-configuration LocationConstraint=us-east-2

# Configurar CORS
cat > s3-cors.json <<EOF
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
  --cors-configuration file://s3-cors.json \
  --region us-east-2

# Bloquear acesso público (exceto via IAM)
aws s3api put-public-access-block \
  --bucket $BUCKET_NAME \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" \
  --region us-east-2

echo "S3_BUCKET=$BUCKET_NAME" >> aws-resources.env
echo "✅ Bucket S3 criado: $BUCKET_NAME"
```

---

## 📋 FASE 4: ElastiCache Redis (1 hora)

```bash
source aws-resources.env

# Security Group para Redis
SG_REDIS=$(aws ec2 create-security-group \
  --group-name kaviar-redis-sg \
  --description "Security group for Kaviar Redis" \
  --vpc-id $VPC_ID \
  --region us-east-2 \
  --query 'GroupId' --output text)

aws ec2 authorize-security-group-ingress \
  --group-id $SG_REDIS \
  --protocol tcp \
  --port 6379 \
  --cidr 10.0.0.0/16 \
  --region us-east-2

# Criar Subnet Group
aws elasticache create-cache-subnet-group \
  --cache-subnet-group-name kaviar-redis-subnet-group \
  --cache-subnet-group-description "Subnet group for Kaviar Redis" \
  --subnet-ids $SUBNET_PRIVATE_A $SUBNET_PRIVATE_B \
  --region us-east-2

# Criar cluster Redis
aws elasticache create-cache-cluster \
  --cache-cluster-id kaviar-redis \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --engine-version 7.0 \
  --num-cache-nodes 1 \
  --cache-subnet-group-name kaviar-redis-subnet-group \
  --security-group-ids $SG_REDIS \
  --region us-east-2

echo "⏳ Aguardando Redis ficar disponível (5-10 minutos)..."
aws elasticache wait cache-cluster-available \
  --cache-cluster-id kaviar-redis \
  --region us-east-2

# Obter endpoint
REDIS_ENDPOINT=$(aws elasticache describe-cache-clusters \
  --cache-cluster-id kaviar-redis \
  --show-cache-node-info \
  --region us-east-2 \
  --query 'CacheClusters[0].CacheNodes[0].Endpoint.Address' \
  --output text)

echo "REDIS_ENDPOINT=$REDIS_ENDPOINT" >> aws-resources.env
echo "✅ Redis criado: $REDIS_ENDPOINT:6379"
```

---

**Continua na Parte 2...**
