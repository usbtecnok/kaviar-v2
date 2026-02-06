#!/bin/bash
set -e

REGION="us-east-2"
INSTANCE_ID="i-0e2e0c435c0e1e5e5"
DB_HOST="kaviar-prod-db.cxuuaq46o1o5.us-east-2.rds.amazonaws.com"
DB_NAME="kaviar"
DB_USER="kaviar_admin"
API_URL="https://api.kaviar.com.br"

echo "=== TESTE: /api/neighborhoods/smart-list ==="
echo ""

# 1. Obter coordenadas reais de Zumbi via ST_PointOnSurface
echo "1. Obtendo coordenadas reais de Zumbi via ST_PointOnSurface..."
COMMAND_ID=$(aws ssm send-command \
  --region "$REGION" \
  --instance-ids "$INSTANCE_ID" \
  --document-name "AWS-RunShellScript" \
  --comment "Get Zumbi coordinates via ST_PointOnSurface" \
  --parameters 'commands=[
    "export PGPASSWORD=$(aws secretsmanager get-secret-value --region us-east-2 --secret-id kaviar-prod-db-password --query SecretString --output text)",
    "psql -h '"$DB_HOST"' -U '"$DB_USER"' -d '"$DB_NAME"' -t -c \"SELECT ST_Y(ST_PointOnSurface(ng.geom)) as lat, ST_X(ST_PointOnSurface(ng.geom)) as lng FROM neighborhood_geofences ng INNER JOIN neighborhoods n ON n.id = ng.neighborhood_id WHERE n.name = '\''Zumbi'\'' LIMIT 1;\""
  ]' \
  --output text --query "Command.CommandId")

sleep 5

COORDS=$(aws ssm get-command-invocation \
  --region "$REGION" \
  --command-id "$COMMAND_ID" \
  --instance-id "$INSTANCE_ID" \
  --query 'StandardOutputContent' \
  --output text | tr -d ' ' | tr '|' ',')

LAT=$(echo "$COORDS" | cut -d',' -f1)
LNG=$(echo "$COORDS" | cut -d',' -f2)

echo "✅ Coordenadas de Zumbi: lat=$LAT, lng=$LNG"
echo ""

# 2. Testar detecção automática
echo "2. Testando detecção automática (GPS dentro de Zumbi)..."
curl -s "${API_URL}/api/neighborhoods/smart-list?lat=${LAT}&lng=${LNG}" | \
  jq '{detected, nearby: (.nearby[0:5] // [])}'
echo ""

# 3. Testar sem GPS (lista completa)
echo "3. Testando sem GPS (primeiros 5 bairros)..."
curl -s "${API_URL}/api/neighborhoods/smart-list" | \
  jq '{detected, nearby, all: (.all[0:5])}'
echo ""

echo "✅ Teste concluído"
