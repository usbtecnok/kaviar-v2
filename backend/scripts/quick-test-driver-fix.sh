#!/bin/bash

# Quick Test: Driver Registration Bug Fix
# Testes rápidos para validar a correção

BASE_URL="${1:-http://localhost:3003}"
EMAIL="quicktest-$(date +%s)@kaviar.com"

echo "🚀 TESTE RÁPIDO - Correção Bug Cadastro Motorista"
echo "=================================================="
echo "Base URL: $BASE_URL"
echo "Email de teste: $EMAIL"
echo ""

# Teste 1: Cadastro deve retornar 201
echo "1️⃣ Cadastro (deve retornar 201)..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/governance/driver" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Quick Test\",
    \"email\": \"$EMAIL\",
    \"password\": \"senha123\",
    \"phone\": \"+5511999999999\",
    \"documentCpf\": \"12345678900\"
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "201" ]; then
  echo "✅ PASSOU - Status 201"
else
  echo "❌ FALHOU - Status $HTTP_CODE"
  echo "Response: $BODY"
  exit 1
fi

if echo "$BODY" | grep -q "motorista não encontrado"; then
  echo "❌ FALHOU - Retornou 'motorista não encontrado'"
  exit 1
fi

echo ""

# Teste 2: Login imediato deve retornar 403
echo "2️⃣ Login imediato (deve retornar 403)..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/driver/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"senha123\"
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "403" ]; then
  echo "✅ PASSOU - Status 403"
else
  echo "❌ FALHOU - Status $HTTP_CODE (esperado 403)"
  echo "Response: $BODY"
  exit 1
fi

if echo "$BODY" | grep -q "análise"; then
  echo "✅ PASSOU - Mensagem 'em análise' presente"
else
  echo "⚠️  AVISO - Mensagem 'em análise' não encontrada"
fi

echo ""

# Teste 3: Email duplicado deve retornar 409
echo "3️⃣ Email duplicado (deve retornar 409)..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/governance/driver" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Quick Test 2\",
    \"email\": \"$EMAIL\",
    \"password\": \"outrasenha123\",
    \"phone\": \"+5511888888888\"
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "409" ]; then
  echo "✅ PASSOU - Status 409"
else
  echo "❌ FALHOU - Status $HTTP_CODE (esperado 409)"
  exit 1
fi

echo ""
echo "=================================================="
echo "✅ TODOS OS TESTES PASSARAM!"
echo "=================================================="
echo ""
echo "📋 Próximos passos:"
echo "  1. Aprovar motorista no admin"
echo "  2. Testar login novamente (deve retornar 200)"
echo ""
echo "SQL para aprovar:"
echo "  UPDATE drivers SET status='approved' WHERE email='$EMAIL';"
