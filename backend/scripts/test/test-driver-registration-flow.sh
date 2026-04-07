#!/bin/bash

# Test: Driver Registration Flow (Cadastro → Login → Approval)
# Objetivo: Validar separação entre cadastro, compliance e login

BASE_URL="http://localhost:3000"
EMAIL="test-driver-$(date +%s)@kaviar.com"

# Require password from environment
: "${PASSWORD:?Error: PASSWORD environment variable must be set}"

echo "🧪 TESTE: FLUXO DE CADASTRO DE MOTORISTA"
echo "=========================================="
echo ""

# 1️⃣ CADASTRO INICIAL (deve retornar 201)
echo "1️⃣ Cadastro inicial (POST /api/governance/driver)"
REGISTER_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/governance/driver" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Test Driver\",
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\",
    \"phone\": \"+5511999999999\",
    \"documentCpf\": \"12345678900\",
    \"documentRg\": \"123456789\",
    \"documentCnh\": \"12345678900\",
    \"vehiclePlate\": \"ABC1234\",
    \"vehicleModel\": \"Fiat Uno\"
  }")

HTTP_CODE=$(echo "$REGISTER_RESPONSE" | tail -n1)
BODY=$(echo "$REGISTER_RESPONSE" | head -n-1)

echo "Status: $HTTP_CODE"
echo "Response: $BODY"
echo ""

if [ "$HTTP_CODE" != "201" ]; then
  echo "❌ FALHOU: Esperado 201, recebido $HTTP_CODE"
  exit 1
fi

if echo "$BODY" | grep -q "motorista não encontrado"; then
  echo "❌ FALHOU: Retornou 'motorista não encontrado' durante cadastro"
  exit 1
fi

echo "✅ Cadastro retornou 201 CREATED"
echo ""

# 2️⃣ LOGIN IMEDIATO (deve retornar 403 - Em análise)
echo "2️⃣ Login imediato (POST /api/auth/driver/login)"
LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/driver/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\"
  }")

HTTP_CODE=$(echo "$LOGIN_RESPONSE" | tail -n1)
BODY=$(echo "$LOGIN_RESPONSE" | head -n-1)

echo "Status: $HTTP_CODE"
echo "Response: $BODY"
echo ""

if [ "$HTTP_CODE" != "403" ]; then
  echo "❌ FALHOU: Esperado 403 (Em análise), recebido $HTTP_CODE"
  exit 1
fi

if ! echo "$BODY" | grep -q "análise"; then
  echo "❌ FALHOU: Mensagem de 'em análise' não encontrada"
  exit 1
fi

echo "✅ Login retornou 403 - Cadastro em análise"
echo ""

# 3️⃣ APROVAR MOTORISTA (simulação - requer admin token)
echo "3️⃣ Aprovação do motorista (simulação manual)"
echo "   Execute: UPDATE drivers SET status='approved' WHERE email='$EMAIL';"
echo ""

# 4️⃣ TESTE DE EMAIL DUPLICADO (deve retornar 409)
echo "4️⃣ Teste de email duplicado (POST /api/governance/driver)"
DUPLICATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/governance/driver" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Test Driver 2\",
    \"email\": \"$EMAIL\",
    \"password\": \"outrasenha123\",
    \"phone\": \"+5511888888888\",
    \"documentCpf\": \"98765432100\",
    \"documentRg\": \"987654321\",
    \"documentCnh\": \"98765432100\",
    \"vehiclePlate\": \"XYZ9876\",
    \"vehicleModel\": \"Chevrolet Onix\"
  }")

HTTP_CODE=$(echo "$DUPLICATE_RESPONSE" | tail -n1)
BODY=$(echo "$DUPLICATE_RESPONSE" | head -n-1)

echo "Status: $HTTP_CODE"
echo "Response: $BODY"
echo ""

if [ "$HTTP_CODE" != "409" ]; then
  echo "❌ FALHOU: Esperado 409 (Email já cadastrado), recebido $HTTP_CODE"
  exit 1
fi

echo "✅ Email duplicado retornou 409"
echo ""

echo "=========================================="
echo "✅ TODOS OS TESTES PASSARAM"
echo "=========================================="
echo ""
echo "📋 CRITÉRIOS DE ACEITE VALIDADOS:"
echo "  ✅ Cadastro retorna 201 CREATED"
echo "  ✅ Login imediato retorna 403 - Em análise"
echo "  ✅ Email duplicado retorna 409"
echo "  ✅ Nenhum cenário retorna 'motorista não encontrado' durante cadastro"
echo ""
echo "🔄 PRÓXIMO PASSO:"
echo "  1. Aprovar motorista no admin"
echo "  2. Testar login novamente (deve retornar 200 + token)"
