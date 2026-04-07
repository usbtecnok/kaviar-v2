#!/bin/bash
set -e

API_URL="https://api.kaviar.com.br"
DRIVER_ID="de958397-882a-4f06-badf-0c0fe7d26f7a"

echo "🧪 Teste Virtual Fence Center API"
echo "=================================="
echo ""

# Solicitar credenciais
read -p "Email do admin: " ADMIN_EMAIL
read -sp "Senha: " ADMIN_PASSWORD
echo ""
echo ""

# 1. Login
echo "1️⃣ Fazendo login..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token // empty')

if [ -z "$TOKEN" ]; then
  echo "❌ Falha no login:"
  echo "$LOGIN_RESPONSE" | jq '.'
  exit 1
fi

echo "✅ Login bem-sucedido!"
echo ""

# 2. GET - Buscar centro virtual atual
echo "2️⃣ Buscando centro virtual atual..."
GET_RESPONSE=$(curl -s -X GET "$API_URL/api/admin/drivers/$DRIVER_ID/virtual-fence-center" \
  -H "Authorization: Bearer $TOKEN")

echo "$GET_RESPONSE" | jq '.'
echo ""

# 3. PUT - Definir centro virtual (Praça da Sé, SP)
echo "3️⃣ Definindo centro virtual (Praça da Sé: -23.5505, -46.6333)..."
PUT_RESPONSE=$(curl -s -X PUT "$API_URL/api/admin/drivers/$DRIVER_ID/virtual-fence-center" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"lat": -23.5505, "lng": -46.6333}')

echo "$PUT_RESPONSE" | jq '.'
echo ""

# 4. GET - Verificar se foi salvo
echo "4️⃣ Verificando se foi salvo..."
GET_RESPONSE2=$(curl -s -X GET "$API_URL/api/admin/drivers/$DRIVER_ID/virtual-fence-center" \
  -H "Authorization: Bearer $TOKEN")

echo "$GET_RESPONSE2" | jq '.'
echo ""

# 5. Testar validação de coordenadas inválidas
echo "5️⃣ Testando validação (coordenadas inválidas)..."
INVALID_RESPONSE=$(curl -s -X PUT "$API_URL/api/admin/drivers/$DRIVER_ID/virtual-fence-center" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"lat": 999, "lng": -46.6333}')

echo "$INVALID_RESPONSE" | jq '.'
echo ""

# 6. DELETE - Remover centro virtual
echo "6️⃣ Removendo centro virtual..."
DELETE_RESPONSE=$(curl -s -X DELETE "$API_URL/api/admin/drivers/$DRIVER_ID/virtual-fence-center" \
  -H "Authorization: Bearer $TOKEN")

echo "$DELETE_RESPONSE" | jq '.'
echo ""

# 7. GET - Verificar se foi removido
echo "7️⃣ Verificando se foi removido..."
GET_RESPONSE3=$(curl -s -X GET "$API_URL/api/admin/drivers/$DRIVER_ID/virtual-fence-center" \
  -H "Authorization: Bearer $TOKEN")

echo "$GET_RESPONSE3" | jq '.'
echo ""

echo "✅ Teste completo!"
