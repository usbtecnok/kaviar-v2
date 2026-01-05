#!/bin/bash
# test-render-production.sh - Testes na URL real do Render

set -e

# URL do Render (substitua pela URL real após deploy)
RENDER_URL="https://kaviar-backend.onrender.com/api"

echo "🌐 TESTES PRODUÇÃO RENDER - URL REAL"
echo "URL: $RENDER_URL"
echo ""

echo "=== TESTE 1: GET /api/health → 200 ==="
echo "curl -s -w \"\\nHTTP Status: %{http_code}\\n\" $RENDER_URL/health"

HEALTH_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$RENDER_URL/health" 2>/dev/null || echo "ERROR: Connection failed")

if [[ "$HEALTH_RESPONSE" == *"HTTP_STATUS:200"* ]]; then
    echo "✅ Health check: 200"
    echo "$HEALTH_RESPONSE" | sed 's/HTTP_STATUS:.*//'
else
    echo "❌ Health check failed"
    echo "Response: $HEALTH_RESPONSE"
    exit 1
fi

echo -e "\n=== TESTE 2: Login admin → token válido ==="
echo "curl -X POST $RENDER_URL/admin/auth/login \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"email\":\"admin@kaviar.com\",\"password\":\"ADMIN_PASSWORD\"}'"

ADMIN_TOKEN=$(curl -s -X POST "$RENDER_URL/admin/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@kaviar.com","password":"ADMIN_PASSWORD"}' | \
    jq -r '.data.token // empty' 2>/dev/null || echo "")

if [ -n "$ADMIN_TOKEN" ] && [ "$ADMIN_TOKEN" != "null" ]; then
    echo "✅ Admin login: Token válido"
    MASKED_TOKEN="${ADMIN_TOKEN:0:30}...***MASKED***"
    echo "Token: $MASKED_TOKEN"
else
    echo "❌ Admin login failed"
    exit 1
fi

echo -e "\n=== TESTE 3: GET /api/admin/elderly/contracts → 200 ==="
echo "curl -H \"Authorization: Bearer ***MASKED***\" $RENDER_URL/admin/elderly/contracts"

ELDERLY_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    "$RENDER_URL/admin/elderly/contracts" 2>/dev/null || echo "ERROR")

if [[ "$ELDERLY_RESPONSE" == *"HTTP_STATUS:200"* ]]; then
    echo "✅ Elderly contracts: 200"
    CONTRACTS_COUNT=$(echo "$ELDERLY_RESPONSE" | sed 's/HTTP_STATUS:.*//' | jq -r '.data.contracts | length' 2>/dev/null || echo "N/A")
    echo "Contratos: $CONTRACTS_COUNT"
else
    echo "❌ Elderly contracts failed"
    exit 1
fi

echo -e "\n=== TESTE 4: GET /api/admin/tour-packages → 200 ==="
echo "curl -H \"Authorization: Bearer ***MASKED***\" $RENDER_URL/admin/tour-packages"

TOURS_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    "$RENDER_URL/admin/tour-packages" 2>/dev/null || echo "ERROR")

if [[ "$TOURS_RESPONSE" == *"HTTP_STATUS:200"* ]]; then
    echo "✅ Tour packages: 200"
    PACKAGES_COUNT=$(echo "$TOURS_RESPONSE" | sed 's/HTTP_STATUS:.*//' | jq -r '.packages | length' 2>/dev/null || echo "N/A")
    echo "Pacotes: $PACKAGES_COUNT"
else
    echo "❌ Tour packages failed"
    exit 1
fi

echo -e "\n🎉 TODOS OS 4 TESTES PRODUÇÃO PASSARAM!"
echo "✅ Sistema Render funcionando corretamente"
