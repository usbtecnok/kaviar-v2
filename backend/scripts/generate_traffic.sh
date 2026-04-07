#!/bin/bash

API_URL="https://api.kaviar.com.br"

TOKEN1="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJwYXNzXzE3Njk5Njg4ODkzNDVfNm8yMXlkNHo4IiwidXNlclR5cGUiOiJQQVNTRU5HRVIiLCJlbWFpbCI6InBhc3NfYmV0YV8wMDFfMjAyNkB0ZXN0LmNvbSIsImlhdCI6MTc2OTk2ODg4OSwiZXhwIjoxNzcwNTczNjg5fQ.QMgghk-kQ-KnM2h8F1KOnP3riLJwtOx_o-zO-fmQfDI"
TOKEN2="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJwYXNzXzE3Njk5Njg4OTAxNjRfZDVrcGVsNzhyIiwidXNlclR5cGUiOiJQQVNTRU5HRVIiLCJlbWFpbCI6InBhc3NfYmV0YV8wMDVfMjAyNkB0ZXN0LmNvbSIsImlhdCI6MTc2OTk2ODg5MCwiZXhwIjoxNzcwNTczNjkwfQ.L928Gl8JAYKLnwNElAFSHSimUV-Zi0snnDq1ytJ3w9I"

echo "🚀 Gerando tráfego nos endpoints de favorites..."
echo ""

# 3 POST + 2 GET com passageiro 1
for i in {1..3}; do
  echo "POST #$i (pass_001)..."
  curl -s -X POST "$API_URL/api/passenger/favorites" \
    -H "Authorization: Bearer $TOKEN1" \
    -H "Content-Type: application/json" \
    -d "{
      \"label\": \"Favorito Beta $i\",
      \"lat\": -23.55$i,
      \"lng\": -46.63$i,
      \"type\": \"HOME\"
    }" | jq -c '{success, favorite: {id: .favorite.id, label: .favorite.label}}'
  sleep 0.3
done

for i in {1..2}; do
  echo "GET #$i (pass_001)..."
  curl -s -X GET "$API_URL/api/passenger/favorites" \
    -H "Authorization: Bearer $TOKEN1" | jq -c '{success, count: (.favorites | length)}'
  sleep 0.3
done

# 2 POST + 1 GET com passageiro 2
for i in {1..2}; do
  echo "POST #$i (pass_005)..."
  curl -s -X POST "$API_URL/api/passenger/favorites" \
    -H "Authorization: Bearer $TOKEN2" \
    -H "Content-Type: application/json" \
    -d "{
      \"label\": \"Favorito Beta 00$i\",
      \"lat\": -23.56$i,
      \"lng\": -46.64$i,
      \"type\": \"WORK\"
    }" | jq -c '{success, favorite: {id: .favorite.id, label: .favorite.label}}'
  sleep 0.3
done

echo "GET #1 (pass_005)..."
curl -s -X GET "$API_URL/api/passenger/favorites" \
  -H "Authorization: Bearer $TOKEN2" | jq -c '{success, count: (.favorites | length)}'

echo ""
echo "✅ Tráfego gerado: 5 POST + 3 GET = 8 requests"
