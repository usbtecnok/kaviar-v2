#!/bin/bash
set -euo pipefail

API="https://api.kaviar.com.br"
DB='postgresql://usbtecnok:z4939ia4@kaviar-prod-db.cxuuaq46o1o5.us-east-2.rds.amazonaws.com:5432/kaviar_validation?sslmode=require'
REGION="us-east-2"
LOG_GROUP="/ecs/kaviar-backend"

# 1) Buscar última oferta
echo "== 1) Buscando última oferta =="
read -r OFFER_ID RIDE_ID DRIVER_ID < <(psql "$DB" -tA -c "
  SELECT id, ride_id, driver_id
  FROM ride_offers
  ORDER BY created_at DESC
  LIMIT 1;
" | awk -F'|' '{print $1, $2, $3}')

echo "OFFER_ID=$OFFER_ID"
echo "RIDE_ID=$RIDE_ID"
echo "DRIVER_ID=$DRIVER_ID"

if [ -z "$OFFER_ID" ]; then
  echo "❌ Nenhuma oferta encontrada"
  exit 1
fi

# 2) Aceitar oferta (precisa do DRIVER_TOKEN)
echo ""
echo "== 2) Aceitando oferta =="
if [ -z "${DRIVER_TOKEN:-}" ]; then
  echo "⚠️  DRIVER_TOKEN não definido. Defina com:"
  echo "   export DRIVER_TOKEN='eyJ...'"
  echo ""
  echo "Endpoints disponíveis:"
  echo "  POST $API/api/v2/ride-offers/$OFFER_ID/accept"
  echo "  POST $API/api/v2/rides/$RIDE_ID/offers/$OFFER_ID/accept"
  exit 1
fi

# Tentar primeiro endpoint
RESPONSE=$(curl -sS -w "\n%{http_code}" -X POST "$API/api/v2/ride-offers/$OFFER_ID/accept" \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

echo "HTTP $HTTP_CODE"
echo "$BODY" | jq -C 2>/dev/null || echo "$BODY"

if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "201" ]; then
  echo ""
  echo "⚠️  Tentando endpoint alternativo..."
  curl -sS -X POST "$API/api/v2/rides/$RIDE_ID/offers/$OFFER_ID/accept" \
    -H "Authorization: Bearer $DRIVER_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{}' | jq -C
fi

# 3) Aguardar processamento
echo ""
echo "== 3) Aguardando 3s para logs propagarem =="
sleep 3

# 4) Buscar logs CloudWatch
echo ""
echo "== 4) Buscando logs CloudWatch (últimos 10min) =="
START=$(( $(date +%s) - 600 ))
END=$(date +%s)

QID=$(aws logs start-query --region "$REGION" \
  --log-group-name "$LOG_GROUP" \
  --start-time "$START" --end-time "$END" \
  --query-string 'fields @timestamp, @message
| filter @message like /STATUS_CHANGED/ or @message like /OFFER_ACCEPT/ or @message like /RIDE_STATUS_CHANGED/
| sort @timestamp desc
| limit 200' --query queryId --output text)

echo "Query ID: $QID"
sleep 2

for i in $(seq 1 15); do
  STATUS=$(aws logs get-query-results --region "$REGION" --query-id "$QID" --query status --output text)
  [ "$STATUS" = "Complete" ] && break
  echo "Aguardando query... ($i/15)"
  sleep 1
done

echo ""
echo "== Logs recentes (STATUS_CHANGED/OFFER_ACCEPT) =="
aws logs get-query-results --region "$REGION" --query-id "$QID" \
  | jq -r '.results[] | map(.value) | @tsv' | head -20

echo ""
echo "✅ Teste concluído"
