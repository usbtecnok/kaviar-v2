#!/bin/bash
# ============================================
# KAVIAR — Login driver e obter token
# Baseado na rota REAL: /api/auth/driver/login
# ============================================

set -euo pipefail

API="${API:-https://api.kaviar.com.br}"
EMAIL="${1:-test-driver-1@kaviar.com}"
PASSWORD="${2:-test123}"

echo "=== Login Driver ==="
echo "Endpoint: POST $API/api/auth/driver/login"
echo "Email: $EMAIL"
echo ""

RESPONSE=$(curl -sS -w "\n%{http_code}" -X POST "$API/api/auth/driver/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

echo "HTTP $HTTP_CODE"

if [ "$HTTP_CODE" != "200" ]; then
  echo "❌ Erro no login:"
  echo "$BODY" | jq -C 2>/dev/null || echo "$BODY"
  exit 1
fi

TOKEN=$(echo "$BODY" | jq -r '.token')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "❌ Token não encontrado na resposta"
  echo "$BODY" | jq -C
  exit 1
fi

echo "✅ Login bem-sucedido"
echo ""
echo "User:"
echo "$BODY" | jq -C '.user'
echo ""
echo "Token:"
echo "$TOKEN"
echo ""
echo "Para usar:"
echo "  export DRIVER_TOKEN='$TOKEN'"
