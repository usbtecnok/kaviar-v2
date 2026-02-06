#!/bin/bash
set -e

REGION="us-east-2"
INSTANCE_ID="i-0e2e0c435c0e1e5e5"
DB_HOST="kaviar-prod-db.cxuuaq46o1o5.us-east-2.rds.amazonaws.com"
DB_NAME="kaviar"
DB_USER="kaviar_admin"
API_URL="https://api.kaviar.com.br"

echo "=== VALIDAÇÃO: Sistema de Território com Coordenadas Reais ==="
echo ""

# 1. Obter coordenadas reais via ST_PointOnSurface
echo "1. Obtendo coordenadas reais via ST_PointOnSurface..."
COMMAND_ID=$(aws ssm send-command \
  --region "$REGION" \
  --instance-ids "$INSTANCE_ID" \
  --document-name "AWS-RunShellScript" \
  --comment "Get real coordinates via ST_PointOnSurface" \
  --parameters 'commands=[
    "export PGPASSWORD=$(aws secretsmanager get-secret-value --region us-east-2 --secret-id kaviar-prod-db-password --query SecretString --output text)",
    "psql -h '"$DB_HOST"' -U '"$DB_USER"' -d '"$DB_NAME"' -t -A -F \"|\" -c \"SELECT n.name, ST_Y(ST_PointOnSurface(ng.geom)) as lat, ST_X(ST_PointOnSurface(ng.geom)) as lng FROM neighborhood_geofences ng INNER JOIN neighborhoods n ON n.id = ng.neighborhood_id WHERE n.name IN ('\''Zumbi'\'', '\''Del Castilho'\'', '\''Acari'\'') ORDER BY n.name;\""
  ]' \
  --output text --query "Command.CommandId")

sleep 5

COORDS_OUTPUT=$(aws ssm get-command-invocation \
  --region "$REGION" \
  --command-id "$COMMAND_ID" \
  --instance-id "$INSTANCE_ID" \
  --query 'StandardOutputContent' \
  --output text)

echo "$COORDS_OUTPUT"
echo ""

# Parse coordenadas
ZUMBI_LAT=$(echo "$COORDS_OUTPUT" | grep "Zumbi" | cut -d'|' -f2)
ZUMBI_LNG=$(echo "$COORDS_OUTPUT" | grep "Zumbi" | cut -d'|' -f3)
DEL_CASTILHO_LAT=$(echo "$COORDS_OUTPUT" | grep "Del Castilho" | cut -d'|' -f2)
DEL_CASTILHO_LNG=$(echo "$COORDS_OUTPUT" | grep "Del Castilho" | cut -d'|' -f3)
ACARI_LAT=$(echo "$COORDS_OUTPUT" | grep "Acari" | cut -d'|' -f2)
ACARI_LNG=$(echo "$COORDS_OUTPUT" | grep "Acari" | cut -d'|' -f3)

echo "✅ Coordenadas obtidas:"
echo "   Zumbi: $ZUMBI_LAT, $ZUMBI_LNG"
echo "   Del Castilho: $DEL_CASTILHO_LAT, $DEL_CASTILHO_LNG"
echo "   Acari: $ACARI_LAT, $ACARI_LNG"
echo ""

# 2. Obter driverId de teste
echo "2. Obtendo driverId de teste..."
DRIVER_ID=$(aws ssm send-command \
  --region "$REGION" \
  --instance-ids "$INSTANCE_ID" \
  --document-name "AWS-RunShellScript" \
  --comment "Get test driver ID" \
  --parameters 'commands=[
    "export PGPASSWORD=$(aws secretsmanager get-secret-value --region us-east-2 --secret-id kaviar-prod-db-password --query SecretString --output text)",
    "psql -h '"$DB_HOST"' -U '"$DB_USER"' -d '"$DB_NAME"' -t -c \"SELECT id FROM drivers WHERE status = '\''ACTIVE'\'' LIMIT 1;\""
  ]' \
  --output text --query "Command.CommandId")

sleep 5

DRIVER_ID=$(aws ssm get-command-invocation \
  --region "$REGION" \
  --command-id "$DRIVER_ID" \
  --instance-id "$INSTANCE_ID" \
  --query 'StandardOutputContent' \
  --output text | tr -d ' ')

echo "✅ Driver ID: $DRIVER_ID"
echo ""

# 3. Cenário A: SAME_NEIGHBORHOOD (7%)
echo "=== CENÁRIO A: SAME_NEIGHBORHOOD (Zumbi → Zumbi) ==="
echo "Pickup: Zumbi ($ZUMBI_LAT, $ZUMBI_LNG)"
echo "Dropoff: Zumbi ($ZUMBI_LAT, $ZUMBI_LNG)"
echo ""

RESPONSE_A=$(curl -s "${API_URL}/api/trips/estimate-fee" \
  -H "Content-Type: application/json" \
  -d "{
    \"driverId\": \"$DRIVER_ID\",
    \"pickupLat\": $ZUMBI_LAT,
    \"pickupLng\": $ZUMBI_LNG,
    \"dropoffLat\": $ZUMBI_LAT,
    \"dropoffLng\": $ZUMBI_LNG,
    \"fareAmount\": 100,
    \"city\": \"Rio de Janeiro\"
  }")

echo "$RESPONSE_A" | jq '.'
FEE_PCT_A=$(echo "$RESPONSE_A" | jq -r '.data.feePercentage')
echo ""
if [ "$FEE_PCT_A" = "7" ]; then
  echo "✅ PASSOU: Taxa = 7%"
else
  echo "❌ FALHOU: Esperado 7%, obtido $FEE_PCT_A%"
fi
echo ""

# 4. Cenário B: ADJACENT_NEIGHBORHOOD (12%)
echo "=== CENÁRIO B: ADJACENT_NEIGHBORHOOD (Zumbi → Del Castilho) ==="
echo "Pickup: Zumbi ($ZUMBI_LAT, $ZUMBI_LNG)"
echo "Dropoff: Del Castilho ($DEL_CASTILHO_LAT, $DEL_CASTILHO_LNG)"
echo ""

RESPONSE_B=$(curl -s "${API_URL}/api/trips/estimate-fee" \
  -H "Content-Type: application/json" \
  -d "{
    \"driverId\": \"$DRIVER_ID\",
    \"pickupLat\": $ZUMBI_LAT,
    \"pickupLng\": $ZUMBI_LNG,
    \"dropoffLat\": $DEL_CASTILHO_LAT,
    \"dropoffLng\": $DEL_CASTILHO_LNG,
    \"fareAmount\": 100,
    \"city\": \"Rio de Janeiro\"
  }")

echo "$RESPONSE_B" | jq '.'
FEE_PCT_B=$(echo "$RESPONSE_B" | jq -r '.data.feePercentage')
echo ""
if [ "$FEE_PCT_B" = "12" ]; then
  echo "✅ PASSOU: Taxa = 12%"
else
  echo "❌ FALHOU: Esperado 12%, obtido $FEE_PCT_B%"
fi
echo ""

# 5. Cenário C: OUTSIDE_FENCE (20%)
echo "=== CENÁRIO C: OUTSIDE_FENCE (Zumbi → Acari) ==="
echo "Pickup: Zumbi ($ZUMBI_LAT, $ZUMBI_LNG)"
echo "Dropoff: Acari ($ACARI_LAT, $ACARI_LNG)"
echo ""

RESPONSE_C=$(curl -s "${API_URL}/api/trips/estimate-fee" \
  -H "Content-Type: application/json" \
  -d "{
    \"driverId\": \"$DRIVER_ID\",
    \"pickupLat\": $ZUMBI_LAT,
    \"pickupLng\": $ZUMBI_LNG,
    \"dropoffLat\": $ACARI_LAT,
    \"dropoffLng\": $ACARI_LNG,
    \"fareAmount\": 100,
    \"city\": \"Rio de Janeiro\"
  }")

echo "$RESPONSE_C" | jq '.'
FEE_PCT_C=$(echo "$RESPONSE_C" | jq -r '.data.feePercentage')
echo ""
if [ "$FEE_PCT_C" = "20" ]; then
  echo "✅ PASSOU: Taxa = 20%"
else
  echo "❌ FALHOU: Esperado 20%, obtido $FEE_PCT_C%"
fi
echo ""

# Resumo
echo "=== RESUMO ==="
echo "Cenário A (SAME): $FEE_PCT_A% (esperado 7%)"
echo "Cenário B (ADJACENT): $FEE_PCT_B% (esperado 12%)"
echo "Cenário C (OUTSIDE): $FEE_PCT_C% (esperado 20%)"
echo ""

if [ "$FEE_PCT_A" = "7" ] && [ "$FEE_PCT_B" = "12" ] && [ "$FEE_PCT_C" = "20" ]; then
  echo "✅ TODOS OS CENÁRIOS PASSARAM"
  exit 0
else
  echo "❌ ALGUNS CENÁRIOS FALHARAM"
  exit 1
fi
