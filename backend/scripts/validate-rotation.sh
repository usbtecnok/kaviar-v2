#!/bin/bash
# Script de validação pós-rotação
# Data: 2026-02-07

set -e

API_BASE="https://api.kaviar.com.br"

echo "🧪 Validando rotação de credenciais..."
echo ""

# 1. Health check
echo "1️⃣ Testando /api/health..."
HEALTH=$(curl -s "$API_BASE/api/health")
VERSION=$(echo "$HEALTH" | jq -r '.version')
DB_STATUS=$(echo "$HEALTH" | jq -r '.checks.database')
S3_STATUS=$(echo "$HEALTH" | jq -r '.checks.s3')

echo "   Version: $VERSION"
echo "   Database: $DB_STATUS"
echo "   S3: $S3_STATUS"

if [ "$DB_STATUS" != "true" ]; then
  echo "   ❌ Database check falhou!"
  exit 1
fi

echo "   ✅ Health check OK"

# 2. Test admin login (sem token - deve retornar 401)
echo ""
echo "2️⃣ Testando autenticação governance..."
RESPONSE=$(curl -s -w "\n%{http_code}" "$API_BASE/api/governance/neighborhoods")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "401" ]; then
  echo "   ✅ Auth middleware funcionando (401 esperado)"
else
  echo "   ⚠️  HTTP $HTTP_CODE (esperado 401)"
  echo "   Body: $BODY"
fi

# 3. Test JWT (se tiver token válido)
echo ""
echo "3️⃣ Para testar com token válido:"
echo "   1. Fazer login: curl -X POST $API_BASE/api/auth/admin/login -H 'Content-Type: application/json' -d '{\"email\":\"suporte@kaviar.com.br\",\"password\":\"<senha>\"}'"
echo "   2. Usar token: curl -H 'Authorization: Bearer <token>' $API_BASE/api/governance/neighborhoods"

echo ""
echo "✅ Validação básica concluída!"
