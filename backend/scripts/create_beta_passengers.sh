#!/bin/bash

API_URL="${API_URL:-http://localhost:3000}"

echo "🔵 Criando passageiros beta..."

# Passageiro 1
echo ""
echo "📝 Criando pass_beta_001_2026@test.com..."
RESP1=$(curl -s -X POST "$API_URL/api/auth/passenger/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Beta Passenger 001",
    "email": "pass_beta_001_2026@test.com",
    "password": "password",
    "phone": "11999990001"
  }')

echo "$RESP1" | jq '.'
TOKEN1=$(echo "$RESP1" | jq -r '.token // empty')

# Passageiro 2
echo ""
echo "📝 Criando pass_beta_005_2026@test.com..."
RESP2=$(curl -s -X POST "$API_URL/api/auth/passenger/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Beta Passenger 005",
    "email": "pass_beta_005_2026@test.com",
    "password": "password",
    "phone": "11999990005"
  }')

echo "$RESP2" | jq '.'
TOKEN2=$(echo "$RESP2" | jq -r '.token // empty')

echo ""
echo "✅ Passageiros criados!"
echo "TOKEN1=$TOKEN1"
echo "TOKEN2=$TOKEN2"

# Salvar tokens
echo "$TOKEN1" > /tmp/beta_token_001.txt
echo "$TOKEN2" > /tmp/beta_token_005.txt

echo ""
echo "🚀 Gerando tráfego nos endpoints de favorites..."

# 3 POST + 2 GET com passageiro 1
for i in {1..3}; do
  echo "POST #$i (pass_001)..."
  curl -s -X POST "$API_URL/api/passenger/favorites" \
    -H "Authorization: Bearer $TOKEN1" \
    -H "Content-Type: application/json" \
    -d "{
      \"name\": \"Favorito Beta $i\",
      \"address\": \"Rua Teste $i, São Paulo\",
      \"lat\": -23.55$i,
      \"lng\": -46.63$i
    }" | jq -c '.'
  sleep 0.5
done

for i in {1..2}; do
  echo "GET #$i (pass_001)..."
  curl -s -X GET "$API_URL/api/passenger/favorites" \
    -H "Authorization: Bearer $TOKEN1" | jq -c '.data | length'
  sleep 0.5
done

# 2 POST + 1 GET com passageiro 2
for i in {1..2}; do
  echo "POST #$i (pass_005)..."
  curl -s -X POST "$API_URL/api/passenger/favorites" \
    -H "Authorization: Bearer $TOKEN2" \
    -H "Content-Type: application/json" \
    -d "{
      \"name\": \"Favorito Beta 00$i\",
      \"address\": \"Av Teste $i, São Paulo\",
      \"lat\": -23.56$i,
      \"lng\": -46.64$i
    }" | jq -c '.'
  sleep 0.5
done

echo "GET #1 (pass_005)..."
curl -s -X GET "$API_URL/api/passenger/favorites" \
  -H "Authorization: Bearer $TOKEN2" | jq -c '.data | length'

echo ""
echo "✅ Tráfego gerado: 5 POST + 3 GET = 8 requests"
