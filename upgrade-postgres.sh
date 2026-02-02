#!/bin/bash
set -e

echo "🚨 UPGRADE POSTGRESQL 15.8 → 15.10"
echo "===================================="
echo ""

# 1. Criar snapshot antes
echo "1. Criando snapshot de segurança..."
SNAPSHOT_ID="kaviar-prod-db-pre-upgrade-$(date +%Y%m%d-%H%M%S)"
aws rds create-db-snapshot \
  --db-instance-identifier kaviar-prod-db \
  --db-snapshot-identifier $SNAPSHOT_ID \
  --region us-east-1

echo "   Snapshot: $SNAPSHOT_ID"
echo "   ⏳ Aguardando snapshot completar..."

aws rds wait db-snapshot-completed \
  --db-snapshot-identifier $SNAPSHOT_ID \
  --region us-east-1

echo "   ✅ Snapshot completo"
echo ""

# 2. Upgrade
echo "2. Iniciando upgrade 15.8 → 15.10..."
aws rds modify-db-instance \
  --db-instance-identifier kaviar-prod-db \
  --engine-version 15.10 \
  --apply-immediately \
  --region us-east-1

echo "   ✅ Upgrade iniciado"
echo ""
echo "⏳ AGUARDE 5-10 MINUTOS"
echo ""
echo "Monitorar:"
echo "  aws rds describe-db-instances --db-instance-identifier kaviar-prod-db --region us-east-1 --query 'DBInstances[0].[DBInstanceStatus,EngineVersion]'"
echo ""
echo "Rollback (se necessário):"
echo "  aws rds restore-db-instance-from-db-snapshot --db-instance-identifier kaviar-prod-db --db-snapshot-identifier $SNAPSHOT_ID --region us-east-1"
