#!/bin/bash
# Test admin credits adjust endpoint
# Usage: ./test-credits-adjust.sh

set -e

API_URL="${API_URL:-http://localhost:3003}"
ADMIN_TOKEN="${ADMIN_TOKEN}"
DRIVER_ID="${DRIVER_ID:-test-driver-123}"

if [ -z "$ADMIN_TOKEN" ]; then
  echo "❌ ADMIN_TOKEN não definido"
  echo "Execute: export ADMIN_TOKEN='seu_token'"
  exit 1
fi

echo "🧪 Testando POST /api/admin/drivers/:id/credits/adjust"
echo "API: $API_URL"
echo "Driver: $DRIVER_ID"
echo ""

# Test 1: POST adjust
echo "📝 Test 1: Ajustar créditos (+10)"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "$API_URL/api/admin/drivers/$DRIVER_ID/credits/adjust" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"delta\":10,\"reason\":\"Teste automatizado $(date +%s)\"}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

echo "Status: $HTTP_CODE"
echo "Response: $BODY"
echo ""

if [ "$HTTP_CODE" -eq "200" ] || [ "$HTTP_CODE" -eq "201" ]; then
  echo "✅ Test 1: PASSOU"
else
  echo "❌ Test 1: FALHOU (esperado 200/201, recebeu $HTTP_CODE)"
  if [ "$HTTP_CODE" -eq "401" ]; then
    echo "   Erro de autenticação - verificar token e middleware"
  fi
  exit 1
fi

# Test 2: GET balance
echo "📝 Test 2: Consultar saldo"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
  "$API_URL/api/admin/drivers/$DRIVER_ID/credits/balance" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

echo "Status: $HTTP_CODE"
echo "Response: $BODY"
echo ""

if [ "$HTTP_CODE" -eq "200" ]; then
  echo "✅ Test 2: PASSOU"
else
  echo "❌ Test 2: FALHOU"
  exit 1
fi

# Test 3: GET ledger
echo "📝 Test 3: Consultar histórico"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
  "$API_URL/api/admin/drivers/$DRIVER_ID/credits/ledger" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

echo "Status: $HTTP_CODE"
echo "Response: $BODY"
echo ""

if [ "$HTTP_CODE" -eq "200" ]; then
  echo "✅ Test 3: PASSOU"
else
  echo "❌ Test 3: FALHOU"
  exit 1
fi

echo ""
echo "✅ TODOS OS TESTES PASSARAM"
