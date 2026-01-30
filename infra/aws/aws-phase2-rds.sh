#!/bin/bash
# KAVIAR - FASE 2: RDS PostgreSQL com PostGIS
# Tempo estimado: 10-15 minutos

set -e

# Carregar IDs da Fase 1
source /home/goes/kaviar/aws-resources.env

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  KAVIAR - FASE 2: RDS PostgreSQL + PostGIS                 ║"
echo "║  Tempo estimado: 10-15 minutos                             ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# 1. Criar Security Group para RDS
echo "1️⃣  Criando/Reusando Security Group para RDS..."

SG_RDS=$(aws ec2 describe-security-groups \
  --region $AWS_REGION \
  --filters Name=vpc-id,Values=$VPC_ID Name=group-name,Values=kaviar-rds-sg \
  --query 'SecurityGroups[0].GroupId' \
  --output text 2>/dev/null || echo "None")

if [ "$SG_RDS" = "None" ] || [ -z "$SG_RDS" ]; then
  SG_RDS=$(aws ec2 create-security-group \
    --group-name kaviar-rds-sg \
    --description "Security group for Kaviar RDS PostgreSQL" \
    --vpc-id $VPC_ID \
    --region $AWS_REGION \
    --query 'GroupId' \
    --output text)
  echo "✅ Security Group RDS criado: $SG_RDS"
  
  aws ec2 authorize-security-group-ingress \
    --group-id $SG_RDS \
    --protocol tcp \
    --port 5432 \
    --cidr 10.0.0.0/16 \
    --region $AWS_REGION
  echo "✅ Regra de entrada configurada (porta 5432)"
else
  echo "✅ Security Group RDS já existe: $SG_RDS"
fi

# 2. Criar DB Subnet Group
echo ""
echo "2️⃣  Criando DB Subnet Group..."

aws rds create-db-subnet-group \
  --db-subnet-group-name kaviar-db-subnet-group \
  --db-subnet-group-description "Subnet group for Kaviar RDS" \
  --subnet-ids $SUBNET_PRIVATE_A $SUBNET_PRIVATE_B \
  --tags Key=Project,Value=kaviar \
  --region $AWS_REGION 2>/dev/null || echo "✅ DB Subnet Group já existe"

echo "✅ DB Subnet Group configurado"

# 3. Criar RDS PostgreSQL
echo ""
echo "3️⃣  Criando RDS PostgreSQL 15.4..."
echo "⏳ Isso vai levar 10-15 minutos. Aguarde..."
echo ""

DB_PASSWORD="Kaviar2026SecureDB$(date +%s)"

aws rds create-db-instance \
  --db-instance-identifier kaviar-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.4 \
  --master-username kaviaradmin \
  --master-user-password "$DB_PASSWORD" \
  --allocated-storage 20 \
  --storage-type gp3 \
  --db-subnet-group-name kaviar-db-subnet-group \
  --vpc-security-group-ids $SG_RDS \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-04:00" \
  --preferred-maintenance-window "mon:04:00-mon:05:00" \
  --publicly-accessible false \
  --tags Key=Project,Value=kaviar \
  --region $AWS_REGION 2>/dev/null || echo "⚠️  RDS já existe, pulando criação"

echo "✅ RDS criado! Aguardando ficar disponível..."
echo ""
echo "⏳ Progresso (pode levar 10-15 minutos):"

aws rds wait db-instance-available \
  --db-instance-identifier kaviar-db \
  --region $AWS_REGION

echo ""
echo "✅ RDS disponível!"

# 4. Obter endpoint
echo ""
echo "4️⃣  Obtendo endpoint do RDS..."

RDS_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier kaviar-db \
  --region $AWS_REGION \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text)

RDS_PORT=$(aws rds describe-db-instances \
  --db-instance-identifier kaviar-db \
  --region $AWS_REGION \
  --query 'DBInstances[0].Endpoint.Port' \
  --output text)

echo "✅ RDS Endpoint: $RDS_ENDPOINT:$RDS_PORT"

# 5. Salvar credenciais
echo ""
echo "5️⃣  Salvando credenciais..."

cat >> /home/goes/kaviar/aws-resources.env <<EOF

# RDS PostgreSQL
export SG_RDS="$SG_RDS"
export RDS_ENDPOINT="$RDS_ENDPOINT"
export RDS_PORT="$RDS_PORT"
export RDS_DATABASE="kaviar"
export RDS_USERNAME="kaviaradmin"
export RDS_PASSWORD="$DB_PASSWORD"
export DATABASE_URL="postgresql://kaviaradmin:$DB_PASSWORD@$RDS_ENDPOINT:$RDS_PORT/kaviar?sslmode=require"
EOF

cat > /home/goes/kaviar/rds-credentials.txt <<EOF
╔════════════════════════════════════════════════════════════╗
║  KAVIAR RDS CREDENTIALS - GUARDE COM SEGURANÇA!            ║
╚════════════════════════════════════════════════════════════╝

Host:     $RDS_ENDPOINT
Port:     $RDS_PORT
Database: kaviar
Username: kaviaradmin
Password: $DB_PASSWORD

Connection String:
postgresql://kaviaradmin:$DB_PASSWORD@$RDS_ENDPOINT:$RDS_PORT/kaviar?sslmode=require

⚠️  IMPORTANTE: Guarde este arquivo em local seguro!
EOF

chmod 600 /home/goes/kaviar/rds-credentials.txt

echo "✅ Credenciais salvas em:"
echo "   - aws-resources.env"
echo "   - rds-credentials.txt (chmod 600)"

# 6. Criar script de setup PostGIS
echo ""
echo "6️⃣  Criando script de setup PostGIS..."

cat > /home/goes/kaviar/setup-postgis.sh <<'EOFSCRIPT'
#!/bin/bash
source /home/goes/kaviar/aws-resources.env

echo "🔧 Instalando PostGIS no RDS..."

PGPASSWORD=$RDS_PASSWORD psql -h $RDS_ENDPOINT -U $RDS_USERNAME -d postgres -c "CREATE DATABASE kaviar;" 2>/dev/null || echo "Database kaviar já existe"

PGPASSWORD=$RDS_PASSWORD psql -h $RDS_ENDPOINT -U $RDS_USERNAME -d kaviar <<EOF
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
SELECT PostGIS_version();
EOF

echo "✅ PostGIS instalado!"
EOFSCRIPT

chmod +x /home/goes/kaviar/setup-postgis.sh

echo "✅ Script criado: setup-postgis.sh"

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  ✅ FASE 2 CONCLUÍDA COM SUCESSO                           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "📋 Recursos Criados:"
echo "   Security Group: $SG_RDS"
echo "   RDS Endpoint:   $RDS_ENDPOINT:$RDS_PORT"
echo "   Database:       kaviar"
echo "   Username:       kaviaradmin"
echo ""
echo "🔐 Credenciais: rds-credentials.txt"
echo ""
echo "🎯 Próximos passos:"
echo "   1. ./setup-postgis.sh"
echo "   2. ./aws-phase3-s3-redis.sh"
echo ""
