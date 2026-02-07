#!/bin/bash
# Smoke Tests - Sistema Anti-Frankenstein
# Valida API antes de concluir deploy

set -e

API_BASE="${API_BASE_URL:-https://api.kaviar.com.br}"
CI_TOKEN="${CI_ADMIN_TOKEN}"

echo "🧪 Smoke Tests - API Validation"
echo "API Base: $API_BASE"
echo ""

FAILED=0

# Test A: Health check
echo "Test A: GET /api/health (deve ser 200)"
RESPONSE=$(curl -s -w "\n%{http_code}" "$API_BASE/api/health")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
  VERSION=$(echo "$BODY" | jq -r '.version')
  DB_STATUS=$(echo "$BODY" | jq -r '.checks.database')
  echo "  ✅ PASS - Status: $HTTP_CODE, Version: $VERSION, DB: $DB_STATUS"
else
  echo "  ❌ FAIL - Status: $HTTP_CODE (esperado 200)"
  echo "  Body: $BODY"
  FAILED=$((FAILED + 1))
fi

echo ""

# Test B: Protected route without token (deve ser 401 Token ausente)
echo "Test B: GET /api/governance/neighborhoods sem token (deve ser 401)"
RESPONSE=$(curl -s -w "\n%{http_code}" "$API_BASE/api/governance/neighborhoods")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "401" ]; then
  ERROR=$(echo "$BODY" | jq -r '.error')
  if [[ "$ERROR" == *"Token ausente"* ]]; then
    echo "  ✅ PASS - Status: $HTTP_CODE, Error: $ERROR"
  else
    echo "  ⚠️  WARN - Status: $HTTP_CODE, mas erro inesperado: $ERROR"
  fi
else
  echo "  ❌ FAIL - Status: $HTTP_CODE (esperado 401)"
  echo "  Body: $BODY"
  FAILED=$((FAILED + 1))
fi

echo ""

# Test C: Protected route with valid token (deve ser 200)
if [ -z "$CI_TOKEN" ]; then
  echo "Test C: SKIP - CI_ADMIN_TOKEN não configurado"
  echo "  ⚠️  Configure CI_ADMIN_TOKEN no GitHub Secrets para validação completa"
else
  echo "Test C: GET /api/governance/neighborhoods com token (deve ser 200)"
  RESPONSE=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $CI_TOKEN" "$API_BASE/api/governance/neighborhoods")
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | head -n-1)

  if [ "$HTTP_CODE" = "200" ]; then
    COUNT=$(echo "$BODY" | jq -r '.data | length')
    echo "  ✅ PASS - Status: $HTTP_CODE, Neighborhoods: $COUNT"
  else
    echo "  ❌ FAIL - Status: $HTTP_CODE (esperado 200)"
    ERROR=$(echo "$BODY" | jq -r '.error')
    echo "  Error: $ERROR"
    FAILED=$((FAILED + 1))
  fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $FAILED -eq 0 ]; then
  echo "✅ Todos os testes passaram!"
  exit 0
else
  echo "❌ $FAILED teste(s) falharam"
  echo ""
  echo "⚠️  DEPLOY BLOQUEADO - Corrija os erros antes de prosseguir"
  exit 1
fi
