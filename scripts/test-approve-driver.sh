#!/bin/bash

# Script para testar aprovação de motorista e capturar response completo
# Uso: ./test-approve-driver.sh <driver_id> <admin_token>

DRIVER_ID="${1:-}"
ADMIN_TOKEN="${2:-}"
API_URL="${3:-http://localhost:3001}"

if [ -z "$DRIVER_ID" ]; then
  echo "❌ Uso: $0 <driver_id> [admin_token] [api_url]"
  echo ""
  echo "Exemplo:"
  echo "  $0 abc123 eyJhbGc..."
  echo ""
  echo "Para listar motoristas pendentes:"
  echo "  curl -H 'Authorization: Bearer <token>' $API_URL/api/admin/drivers | jq '.data[] | select(.status==\"pending\") | {id, name, status}'"
  exit 1
fi

echo "🔍 Testando aprovação de motorista..."
echo "Driver ID: $DRIVER_ID"
echo "API URL: $API_URL"
echo ""

# Fazer requisição e capturar response completo
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X PUT \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$API_URL/api/admin/drivers/$DRIVER_ID/approve")

# Separar body e status code
HTTP_BODY=$(echo "$RESPONSE" | head -n -1)
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)

echo "📊 Status Code: $HTTP_CODE"
echo ""
echo "📦 Response Body:"
echo "$HTTP_BODY" | jq '.' 2>/dev/null || echo "$HTTP_BODY"
echo ""

# Extrair missingRequirements se existir
MISSING=$(echo "$HTTP_BODY" | jq -r '.missingRequirements[]?' 2>/dev/null)
if [ -n "$MISSING" ]; then
  echo "⚠️  Missing Requirements:"
  echo "$MISSING" | sed 's/^/  - /'
  echo ""
fi

# Verificar logs do backend (se estiver rodando localmente)
echo "💡 Dica: Verifique os logs do backend para ver o debug log:"
echo "   grep 'driver-approval' backend_logs.txt"
