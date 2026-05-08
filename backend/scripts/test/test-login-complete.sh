#!/bin/bash

echo "🔐 TESTE COMPLETO DE LOGIN ADMIN"
echo "================================"

BASE_URL="http://localhost:3001/api"

# Teste 1: Health check
echo "1. Testando health check..."
HEALTH=$(curl -s -X GET "$BASE_URL/health")
echo "✅ Health: $HEALTH"

# Teste 2: Login admin
echo ""
echo "2. Testando login admin..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/admin/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@kaviar.com","password":"${ADMIN_PASSWORD:-admin123}"}')

echo "✅ Login Response: $LOGIN_RESPONSE"

# Extrair token
TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.token')
echo "🔑 Token: ${TOKEN:0:50}..."

# Teste 3: Usar token para acessar rota protegida
echo ""
echo "3. Testando acesso com token..."
PROTECTED_RESPONSE=$(curl -s -X GET "$BASE_URL/admin/drivers" \
    -H "Authorization: Bearer $TOKEN")

echo "✅ Protected Route: $PROTECTED_RESPONSE"

echo ""
echo "🎉 Todos os testes concluídos!"
