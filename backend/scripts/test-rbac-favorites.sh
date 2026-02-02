#!/bin/bash
set -e

API_URL="${API_URL:-https://api.kaviar.com.br}"
PASSENGER_ID="${TEST_PASSENGER_ID:-test-passenger-rbac}"
DRIVER_ID="${TEST_DRIVER_ID:-de958397-882a-4f06-badf-0c0fe7d26f7a}"

echo "🧪 Teste RBAC - Passenger Favorites & Secondary Base"
echo "====================================================="
echo ""

# Login SUPER_ADMIN
echo "1️⃣ Login SUPER_ADMIN..."
SUPER_TOKEN=$(curl -s -X POST "$API_URL/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${SUPER_ADMIN_EMAIL}\",\"password\":\"${SUPER_ADMIN_PASS}\"}" | jq -r '.token')

if [ "$SUPER_TOKEN" = "null" ] || [ -z "$SUPER_TOKEN" ]; then
  echo "❌ SUPER_ADMIN login falhou"
  exit 1
fi
echo "✅ SUPER_ADMIN token obtido"
echo ""

# Login ANGEL_VIEWER
echo "2️⃣ Login ANGEL_VIEWER..."
ANGEL_TOKEN=$(curl -s -X POST "$API_URL/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${ANGEL_EMAIL}\",\"password\":\"${ANGEL_PASS}\"}" | jq -r '.token')

if [ "$ANGEL_TOKEN" = "null" ] || [ -z "$ANGEL_TOKEN" ]; then
  echo "❌ ANGEL_VIEWER login falhou"
  exit 1
fi
echo "✅ ANGEL_VIEWER token obtido"
echo ""

# Test Passenger Favorites
echo "3️⃣ Passenger Favorites - RBAC"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ANGEL_VIEWER GET (should be 200)
echo "   ANGEL_VIEWER GET..."
STATUS=$(curl -s -w "%{http_code}" -o /dev/null -X GET "$API_URL/api/admin/passengers/$PASSENGER_ID/favorites" \
  -H "Authorization: Bearer $ANGEL_TOKEN")

if [ "$STATUS" = "200" ]; then
  echo "   ✅ GET: 200 (permitido)"
else
  echo "   ❌ GET: $STATUS (esperado 200)"
  exit 1
fi

# ANGEL_VIEWER PUT (should be 403)
echo "   ANGEL_VIEWER PUT..."
STATUS=$(curl -s -w "%{http_code}" -o /dev/null -X PUT "$API_URL/api/admin/passengers/$PASSENGER_ID/favorites" \
  -H "Authorization: Bearer $ANGEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"label":"Casa","type":"HOME","lat":-23.5505,"lng":-46.6333}')

if [ "$STATUS" = "403" ]; then
  echo "   ✅ PUT: 403 (bloqueado)"
else
  echo "   ❌ PUT: $STATUS (esperado 403)"
  exit 1
fi

# SUPER_ADMIN PUT (should be 200)
echo "   SUPER_ADMIN PUT..."
STATUS=$(curl -s -w "%{http_code}" -o /dev/null -X PUT "$API_URL/api/admin/passengers/$PASSENGER_ID/favorites" \
  -H "Authorization: Bearer $SUPER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"label":"Casa","type":"HOME","lat":-23.5505,"lng":-46.6333}')

if [ "$STATUS" = "200" ]; then
  echo "   ✅ PUT: 200 (permitido)"
else
  echo "   ❌ PUT: $STATUS (esperado 200)"
  exit 1
fi
echo ""

# Test Driver Secondary Base
echo "4️⃣ Driver Secondary Base - RBAC"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ANGEL_VIEWER GET (should be 200)
echo "   ANGEL_VIEWER GET..."
STATUS=$(curl -s -w "%{http_code}" -o /dev/null -X GET "$API_URL/api/admin/drivers/$DRIVER_ID/secondary-base" \
  -H "Authorization: Bearer $ANGEL_TOKEN")

if [ "$STATUS" = "200" ]; then
  echo "   ✅ GET: 200 (permitido)"
else
  echo "   ❌ GET: $STATUS (esperado 200)"
  exit 1
fi

# ANGEL_VIEWER PUT (should be 403)
echo "   ANGEL_VIEWER PUT..."
STATUS=$(curl -s -w "%{http_code}" -o /dev/null -X PUT "$API_URL/api/admin/drivers/$DRIVER_ID/secondary-base" \
  -H "Authorization: Bearer $ANGEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"lat":-23.5505,"lng":-46.6333,"label":"Base 2","enabled":true}')

if [ "$STATUS" = "403" ]; then
  echo "   ✅ PUT: 403 (bloqueado)"
else
  echo "   ❌ PUT: $STATUS (esperado 403)"
  exit 1
fi

# SUPER_ADMIN PUT (should be 200)
echo "   SUPER_ADMIN PUT..."
STATUS=$(curl -s -w "%{http_code}" -o /dev/null -X PUT "$API_URL/api/admin/drivers/$DRIVER_ID/secondary-base" \
  -H "Authorization: Bearer $SUPER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"lat":-23.5505,"lng":-46.6333,"label":"Base 2","enabled":true}')

if [ "$STATUS" = "200" ]; then
  echo "   ✅ PUT: 200 (permitido)"
else
  echo "   ❌ PUT: $STATUS (esperado 200)"
  exit 1
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ TODOS OS TESTES RBAC PASSARAM"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
