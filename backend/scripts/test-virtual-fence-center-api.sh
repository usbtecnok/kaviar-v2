#!/bin/bash

# Script de teste para endpoints de Virtual Fence Center
# Requer: jq, curl

set -e

API_URL="${API_URL:-https://api.kaviar.com.br}"
SUPER_ADMIN_EMAIL="${SUPER_ADMIN_EMAIL:-suporte@kaviar.com.br}"
SUPER_ADMIN_PASSWORD="${SUPER_ADMIN_PASSWORD:-Kaviar2026!}"
ANGEL_EMAIL="${ANGEL_EMAIL:-angel01@kaviar.com.br}"
ANGEL_PASSWORD="${ANGEL_PASSWORD:-Angel2026!}"

echo "🧪 Teste de Virtual Fence Center Admin API"
echo "=========================================="
echo ""

# 1. Login como SUPER_ADMIN
echo "1️⃣  Login como SUPER_ADMIN..."
SUPER_ADMIN_TOKEN=$(curl -s -X POST "$API_URL/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$SUPER_ADMIN_EMAIL\",\"password\":\"$SUPER_ADMIN_PASSWORD\"}" \
  | jq -r '.token')

if [ "$SUPER_ADMIN_TOKEN" = "null" ] || [ -z "$SUPER_ADMIN_TOKEN" ]; then
  echo "❌ Falha no login SUPER_ADMIN"
  exit 1
fi
echo "✅ Token SUPER_ADMIN obtido"
echo ""

# 2. Login como ANGEL_VIEWER
echo "2️⃣  Login como ANGEL_VIEWER..."
ANGEL_TOKEN=$(curl -s -X POST "$API_URL/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ANGEL_EMAIL\",\"password\":\"$ANGEL_PASSWORD\"}" \
  | jq -r '.token')

if [ "$ANGEL_TOKEN" = "null" ] || [ -z "$ANGEL_TOKEN" ]; then
  echo "❌ Falha no login ANGEL_VIEWER"
  exit 1
fi
echo "✅ Token ANGEL_VIEWER obtido"
echo ""

# 3. Buscar um driver para teste
echo "3️⃣  Buscando driver para teste..."
DRIVER_ID=$(curl -s "$API_URL/api/admin/drivers?limit=1" \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" \
  | jq -r '.data[0].id // empty')

if [ -z "$DRIVER_ID" ]; then
  echo "❌ Nenhum driver encontrado"
  exit 1
fi
echo "✅ Driver ID: $DRIVER_ID"
echo ""

# 4. GET - Buscar centro virtual atual (deve ser null inicialmente)
echo "4️⃣  GET /api/admin/drivers/$DRIVER_ID/virtual-fence-center"
RESPONSE=$(curl -s "$API_URL/api/admin/drivers/$DRIVER_ID/virtual-fence-center" \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN")
echo "$RESPONSE" | jq '.'
echo ""

# 5. PUT - Definir centro virtual (SUPER_ADMIN)
echo "5️⃣  PUT /api/admin/drivers/$DRIVER_ID/virtual-fence-center (SUPER_ADMIN)"
RESPONSE=$(curl -s -X PUT "$API_URL/api/admin/drivers/$DRIVER_ID/virtual-fence-center" \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"lat": -23.5505, "lng": -46.6333}')
echo "$RESPONSE" | jq '.'

SUCCESS=$(echo "$RESPONSE" | jq -r '.success')
if [ "$SUCCESS" = "true" ]; then
  echo "✅ Centro virtual definido com sucesso"
else
  echo "❌ Falha ao definir centro virtual"
  exit 1
fi
echo ""

# 6. GET - Verificar centro virtual atualizado
echo "6️⃣  GET /api/admin/drivers/$DRIVER_ID/virtual-fence-center (verificar)"
RESPONSE=$(curl -s "$API_URL/api/admin/drivers/$DRIVER_ID/virtual-fence-center" \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN")
echo "$RESPONSE" | jq '.'

LAT=$(echo "$RESPONSE" | jq -r '.virtualFenceCenter.lat')
if [ "$LAT" = "-23.5505" ]; then
  echo "✅ Centro virtual confirmado"
else
  echo "❌ Centro virtual não foi salvo corretamente"
  exit 1
fi
echo ""

# 7. PUT - Tentar atualizar como ANGEL_VIEWER (deve falhar com 403)
echo "7️⃣  PUT /api/admin/drivers/$DRIVER_ID/virtual-fence-center (ANGEL_VIEWER - deve falhar)"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X PUT "$API_URL/api/admin/drivers/$DRIVER_ID/virtual-fence-center" \
  -H "Authorization: Bearer $ANGEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"lat": -22.9068, "lng": -43.1729}')

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE:/d')
echo "$BODY" | jq '.'

if [ "$HTTP_CODE" = "403" ]; then
  echo "✅ ANGEL_VIEWER bloqueado corretamente (403)"
else
  echo "❌ ANGEL_VIEWER deveria receber 403, recebeu $HTTP_CODE"
  exit 1
fi
echo ""

# 8. PUT - Coordenadas inválidas (deve falhar com 400)
echo "8️⃣  PUT com coordenadas inválidas (lat > 90)"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X PUT "$API_URL/api/admin/drivers/$DRIVER_ID/virtual-fence-center" \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"lat": 100, "lng": -46.6333}')

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE:/d')
echo "$BODY" | jq '.'

if [ "$HTTP_CODE" = "400" ]; then
  echo "✅ Validação de coordenadas funcionando (400)"
else
  echo "❌ Deveria retornar 400 para coordenadas inválidas, recebeu $HTTP_CODE"
  exit 1
fi
echo ""

# 9. DELETE - Remover centro virtual
echo "9️⃣  DELETE /api/admin/drivers/$DRIVER_ID/virtual-fence-center"
RESPONSE=$(curl -s -X DELETE "$API_URL/api/admin/drivers/$DRIVER_ID/virtual-fence-center" \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN")
echo "$RESPONSE" | jq '.'

SUCCESS=$(echo "$RESPONSE" | jq -r '.success')
if [ "$SUCCESS" = "true" ]; then
  echo "✅ Centro virtual removido com sucesso"
else
  echo "❌ Falha ao remover centro virtual"
  exit 1
fi
echo ""

# 10. GET - Verificar que foi removido
echo "🔟 GET /api/admin/drivers/$DRIVER_ID/virtual-fence-center (verificar remoção)"
RESPONSE=$(curl -s "$API_URL/api/admin/drivers/$DRIVER_ID/virtual-fence-center" \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN")
echo "$RESPONSE" | jq '.'

CENTER=$(echo "$RESPONSE" | jq -r '.virtualFenceCenter')
if [ "$CENTER" = "null" ]; then
  echo "✅ Centro virtual removido confirmado"
else
  echo "❌ Centro virtual ainda existe após DELETE"
  exit 1
fi
echo ""

# 11. GET - Driver inexistente (deve retornar 404)
echo "1️⃣1️⃣  GET com driver inexistente (deve retornar 404)"
FAKE_ID="00000000-0000-0000-0000-000000000000"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$API_URL/api/admin/drivers/$FAKE_ID/virtual-fence-center" \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN")

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE:/d')
echo "$BODY" | jq '.'

if [ "$HTTP_CODE" = "404" ]; then
  echo "✅ Driver inexistente retorna 404"
else
  echo "❌ Deveria retornar 404, recebeu $HTTP_CODE"
  exit 1
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ TODOS OS TESTES PASSARAM!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
