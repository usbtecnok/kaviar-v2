#!/bin/bash
# Script de rotação de credenciais RDS
# Data: 2026-02-07

set -e

DB_INSTANCE="kaviar-prod-db"
REGION="us-east-2"
NEW_PASSWORD="uvjMpy2K70QQOmopjt74A3Om"

echo "🔐 Iniciando rotação de senha RDS..."
echo "Instance: $DB_INSTANCE"
echo "Region: $REGION"
echo ""

# 1. Modificar senha
echo "1️⃣ Modificando senha..."
aws rds modify-db-instance \
  --db-instance-identifier "$DB_INSTANCE" \
  --master-user-password "$NEW_PASSWORD" \
  --apply-immediately \
  --region "$REGION" \
  --output json | jq -r '.DBInstance.DBInstanceStatus'

# 2. Aguardar disponibilidade
echo ""
echo "2️⃣ Aguardando RDS ficar disponível..."
aws rds wait db-instance-available \
  --db-instance-identifier "$DB_INSTANCE" \
  --region "$REGION"

echo ""
echo "✅ Senha RDS rotacionada com sucesso!"
echo ""
echo "⚠️  PRÓXIMO PASSO:"
echo "   Atualizar DATABASE_URL no ECS task definition"
echo "   Nova URL: postgresql://kaviaradmin:$NEW_PASSWORD@kaviar-prod-db.cxuuaq46o1o5.us-east-2.rds.amazonaws.com:5432/kaviar?sslmode=require"
