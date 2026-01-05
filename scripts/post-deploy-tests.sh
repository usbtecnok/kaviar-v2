#!/bin/bash
# post-deploy-tests.sh - Testes obrigatórios pós-deploy

set -e

API_URL="https://your-app.onrender.com/api"
echo "🧪 TESTES PÓS-DEPLOY - $(date)"

# 1. Health Check
echo -e "\n1. GET /api/health → 200"
HEALTH=$(curl -s -w "%{http_code}" "$API_URL/health" -o /tmp/health.json)
if [ "$HEALTH" = "200" ]; then
    echo "✅ Health: $(cat /tmp/health.json | jq -r '.success')"
else
    echo "❌ Health failed: $HEALTH"
    exit 1
fi

# 2. Login Admin
echo -e "\n2. Login admin → OK"
ADMIN_TOKEN=$(curl -s -X POST "$API_URL/admin/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@yourdomain.com","password":"YOUR_ADMIN_PASSWORD"}' | \
    jq -r '.data.token // empty')

if [ -n "$ADMIN_TOKEN" ] && [ "$ADMIN_TOKEN" != "null" ]; then
    echo "✅ Admin login: Token obtido"
    MASKED_TOKEN="${ADMIN_TOKEN:0:20}...***MASKED***"
else
    echo "❌ Admin login failed"
    exit 1
fi

# 3. Elderly Contracts
echo -e "\n3. GET /api/admin/elderly/contracts com token → 200"
ELDERLY=$(curl -s -w "%{http_code}" "$API_URL/admin/elderly/contracts" \
    -H "Authorization: Bearer $ADMIN_TOKEN" -o /tmp/elderly.json)

if [ "$ELDERLY" = "200" ]; then
    SUCCESS=$(cat /tmp/elderly.json | jq -r '.success')
    CONTRACTS=$(cat /tmp/elderly.json | jq -r '.data.contracts | length')
    echo "✅ Elderly contracts: $SUCCESS ($CONTRACTS contratos)"
else
    echo "❌ Elderly contracts failed: $ELDERLY"
    exit 1
fi

# 4. Tour Packages
echo -e "\n4. GET /api/admin/tour-packages com token → 200"
TOURS=$(curl -s -w "%{http_code}" "$API_URL/admin/tour-packages" \
    -H "Authorization: Bearer $ADMIN_TOKEN" -o /tmp/tours.json)

if [ "$TOURS" = "200" ]; then
    SUCCESS=$(cat /tmp/tours.json | jq -r '.success')
    PACKAGES=$(cat /tmp/tours.json | jq -r '.packages | length')
    echo "✅ Tour packages: $SUCCESS ($PACKAGES pacotes)"
else
    echo "❌ Tour packages failed: $TOURS"
    exit 1
fi

echo -e "\n🎉 TODOS OS TESTES PASSARAM!"
echo "✅ Sistema em produção funcionando corretamente"

# Cleanup
rm -f /tmp/health.json /tmp/elderly.json /tmp/tours.json
