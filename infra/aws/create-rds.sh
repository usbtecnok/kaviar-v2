#!/bin/bash
# KAVIAR - FASE 2B: Criar RDS (forçado)

set -e

source /home/goes/kaviar/aws-resources.env

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  KAVIAR - Criando RDS PostgreSQL                           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Gerar senha forte
DB_PASSWORD="Kaviar2026SecureDB$(date +%s)"

echo "🚀 Criando RDS PostgreSQL 15.15..."
echo "⏳ Tempo estimado: 10-15 minutos"
echo ""

aws rds create-db-instance \
  --db-instance-identifier kaviar-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.15 \
  --master-username kaviaradmin \
  --master-user-password "$DB_PASSWORD" \
  --allocated-storage 20 \
  --storage-type gp3 \
  --db-subnet-group-name kaviar-db-subnet-group \
  --vpc-security-group-ids $SG_RDS \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-04:00" \
  --preferred-maintenance-window "mon:04:00-mon:05:00" \
  --no-publicly-accessible \
  --tags Key=Project,Value=kaviar \
  --region $AWS_REGION

echo ""
echo "✅ RDS criado! Aguardando ficar disponível..."
echo "⏳ Progresso:"
echo ""

# Aguardar disponibilidade
aws rds wait db-instance-available \
  --db-instance-identifier kaviar-db \
  --region $AWS_REGION

echo ""
echo "✅ RDS disponível!"

# Obter endpoint
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

echo ""
echo "📋 RDS Endpoint: $RDS_ENDPOINT:$RDS_PORT"

# Salvar credenciais
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
║  KAVIAR RDS CREDENTIALS                                    ║
╚════════════════════════════════════════════════════════════╝

Host:     $RDS_ENDPOINT
Port:     $RDS_PORT
Database: kaviar
Username: kaviaradmin
Password: $DB_PASSWORD

Connection String:
postgresql://kaviaradmin:$DB_PASSWORD@$RDS_ENDPOINT:$RDS_PORT/kaviar?sslmode=require
EOF

chmod 600 /home/goes/kaviar/rds-credentials.txt

# Criar script PostGIS
cat > /home/goes/kaviar/setup-postgis.sh <<'EOFSCRIPT'
#!/bin/bash
source /home/goes/kaviar/aws-resources.env
echo "🔧 Instalando PostGIS..."
PGPASSWORD=$RDS_PASSWORD psql -h $RDS_ENDPOINT -U $RDS_USERNAME -d postgres -c "CREATE DATABASE kaviar;" 2>/dev/null || true
PGPASSWORD=$RDS_PASSWORD psql -h $RDS_ENDPOINT -U $RDS_USERNAME -d kaviar <<EOF
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
SELECT PostGIS_version();
EOF
echo "✅ PostGIS instalado!"
EOFSCRIPT

chmod +x /home/goes/kaviar/setup-postgis.sh

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  ✅ RDS CRIADO COM SUCESSO                                 ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "📋 Endpoint: $RDS_ENDPOINT:$RDS_PORT"
echo "🔐 Credenciais: rds-credentials.txt"
echo ""
echo "🎯 Próximo passo:"
echo "   ./setup-postgis.sh"
echo ""
