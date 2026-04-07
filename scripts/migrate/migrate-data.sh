#!/bin/bash
set -e

# Migração de dados Neon → RDS
# Modo Kaviar: seguro e idempotente

source aws-resources.env

NEON_URL="postgresql://neondb_owner:npg_2xbfMWRF6hrO@ep-wispy-thunder-ad850l5j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
RDS_URL="$DATABASE_URL"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  📦 MIGRAÇÃO DE DADOS: NEON → RDS                          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# 1. Dump data from Neon (data only, no schema)
echo "1️⃣ Exportando dados do Neon..."
PGPASSWORD="npg_2xbfMWRF6hrO" pg_dump \
  -h ep-wispy-thunder-ad850l5j-pooler.c-2.us-east-1.aws.neon.tech \
  -U neondb_owner \
  -d neondb \
  --data-only \
  --no-owner \
  --no-privileges \
  --disable-triggers \
  --exclude-table=admins \
  --exclude-table=roles \
  -f /tmp/neon-data.sql 2>&1 | tail -5

SIZE=$(du -h /tmp/neon-data.sql | cut -f1)
LINES=$(wc -l < /tmp/neon-data.sql)
echo "   ✅ Dump criado: $SIZE ($LINES linhas)"
echo ""

# 2. Upload to EC2 and import
echo "2️⃣ Importando para RDS via EC2..."
DATA_B64=$(cat /tmp/neon-data.sql | base64 -w 0)

aws ssm send-command \
  --instance-ids $EC2_UTIL_ID \
  --document-name "AWS-RunShellScript" \
  --parameters commands="[\"
echo '$DATA_B64' | base64 -d > /tmp/neon-data.sql
echo 'Importando dados ($LINES linhas)...'
PGPASSWORD='$RDS_PASSWORD' psql -h $RDS_ENDPOINT -U $RDS_USERNAME -d $RDS_DATABASE -f /tmp/neon-data.sql 2>&1 | tail -20
echo ''
echo 'Verificando registros importados:'
PGPASSWORD='$RDS_PASSWORD' psql -h $RDS_ENDPOINT -U $RDS_USERNAME -d $RDS_DATABASE <<SQL
SELECT 
  'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'drivers', COUNT(*) FROM drivers
UNION ALL
SELECT 'rides', COUNT(*) FROM rides
UNION ALL
SELECT 'communities', COUNT(*) FROM communities
ORDER BY table_name;
SQL
\"]" \
  --region $AWS_REGION \
  --query 'Command.CommandId' \
  --output text

echo ""
echo "✅ Comando enviado. Aguarde execução..."
