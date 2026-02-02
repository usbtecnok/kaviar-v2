#!/bin/bash

API_URL="https://api.kaviar.com.br"

# Login como super admin
echo "🔐 Fazendo login como super admin..."
ADMIN_TOKEN=$(curl -s -X POST "$API_URL/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"suporte@usbtecnok.com.br","password":"Kaviar2026!Admin"}' | jq -r '.token')

if [ -z "$ADMIN_TOKEN" ] || [ "$ADMIN_TOKEN" = "null" ]; then
  echo "❌ Falha no login do admin"
  exit 1
fi

echo "✅ Admin autenticado"

# Adicionar passageiros à allowlist
PASS1_ID="pass_1769968889345_6o21yd4z8"
PASS2_ID="pass_1769968890164_d5kpel78r"

echo ""
echo "📝 Adicionando $PASS1_ID à allowlist..."
curl -s -X POST "$API_URL/api/admin/feature-flags/passenger_favorites_matching/allowlist" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"passengerId\":\"$PASS1_ID\"}" | jq '.'

echo ""
echo "📝 Adicionando $PASS2_ID à allowlist..."
curl -s -X POST "$API_URL/api/admin/feature-flags/passenger_favorites_matching/allowlist" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"passengerId\":\"$PASS2_ID\"}" | jq '.'

echo ""
echo "✅ Passageiros adicionados à allowlist!"
