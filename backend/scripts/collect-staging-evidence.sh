#!/bin/bash
# Script para coletar evidências do staging após teste de 20 rides

set -e

echo "🔍 Coletando evidências do staging..."
echo ""

# Configuração (com fallbacks)
LOG_GROUP="${LOG_GROUP:-/ecs/kaviar-backend-staging}"
REGION="${REGION:-us-east-2}"
DB_URL="${STAGING_DATABASE_URL:-$DATABASE_URL}"

# Verificar variáveis
if [ -z "$DB_URL" ]; then
  echo "❌ STAGING_DATABASE_URL (ou DATABASE_URL) não configurada"
  echo "   Export: export STAGING_DATABASE_URL='postgresql://...'"
  exit 1
fi

echo "📋 Configuração:"
echo "   LOG_GROUP: $LOG_GROUP"
echo "   REGION: $REGION"
echo "   DATABASE: ${DB_URL%%@*}@***" # Oculta senha
echo ""

# Pedir timestamps do teste
echo "📅 Informe o período do teste:"
echo "   Exemplo: 2026-02-18 19:30:00"
read -p "Data/hora início (YYYY-MM-DD HH:MM:SS UTC): " START_TIME
read -p "Data/hora fim (YYYY-MM-DD HH:MM:SS UTC): " END_TIME

START_MS=$(date -d "$START_TIME" +%s)000
END_MS=$(date -d "$END_TIME" +%s)000

echo ""
echo "⏰ Período: $START_TIME até $END_TIME"
echo ""

echo ""
echo "📊 Coletando logs do CloudWatch..."

# 1. Logs de RIDE_CREATED
echo "  → RIDE_CREATED..."
aws logs filter-log-events \
  --log-group-name "$LOG_GROUP" \
  --start-time "$START_MS" \
  --end-time "$END_MS" \
  --filter-pattern "RIDE_CREATED" \
  --region "$REGION" \
  --max-items 25 \
  --query 'events[*].[timestamp,message]' \
  --output text > staging-logs-ride-created.txt

# 2. Logs de DISPATCHER
echo "  → DISPATCHER..."
aws logs filter-log-events \
  --log-group-name "$LOG_GROUP" \
  --start-time "$START_MS" \
  --end-time "$END_MS" \
  --filter-pattern "DISPATCHER" \
  --region "$REGION" \
  --max-items 50 \
  --query 'events[*].[timestamp,message]' \
  --output text > staging-logs-dispatcher.txt

# 3. Logs de OFFER
echo "  → OFFER..."
aws logs filter-log-events \
  --log-group-name "$LOG_GROUP" \
  --start-time "$START_MS" \
  --end-time "$END_MS" \
  --filter-pattern "OFFER" \
  --region "$REGION" \
  --max-items 50 \
  --query 'events[*].[timestamp,message]' \
  --output text > staging-logs-offers.txt

echo ""
echo "📊 Coletando dados do banco staging..."

# 4. Rides por status
echo "  → Rides por status..."
psql "$DB_URL" -c "SELECT status, COUNT(*) as count FROM rides_v2 WHERE created_at > NOW() - INTERVAL '1 hour' GROUP BY status ORDER BY count DESC;" > staging-sql-rides-status.txt

# 5. Offers por status
echo "  → Offers por status..."
psql "$DB_URL" -c "SELECT status, COUNT(*) as count FROM ride_offers WHERE created_at > NOW() - INTERVAL '1 hour' GROUP BY status ORDER BY count DESC;" > staging-sql-offers-status.txt

# 6. Detalhes das rides
echo "  → Detalhes das 20 rides..."
psql "$DB_URL" -c "SELECT id, status, created_at, offered_at, (SELECT COUNT(*) FROM ride_offers WHERE ride_id = rides_v2.id) as offer_count FROM rides_v2 WHERE created_at > NOW() - INTERVAL '1 hour' ORDER BY created_at DESC LIMIT 20;" > staging-sql-rides-details.txt

echo ""
echo "✅ Evidências coletadas!"
echo ""
echo "Arquivos gerados:"
echo "  - staging-logs-ride-created.txt"
echo "  - staging-logs-dispatcher.txt"
echo "  - staging-logs-offers.txt"
echo "  - staging-sql-rides-status.txt"
echo "  - staging-sql-offers-status.txt"
echo "  - staging-sql-rides-details.txt"
echo ""
echo "📝 Próximo passo: Copiar conteúdo desses arquivos para backend/docs/EVIDENCIAS-STAGING-RIDE-FLOW.md"
