#!/bin/bash
# CORS Validation Script
# Testa se o preflight OPTIONS retorna os headers CORS corretos

API="https://api.kaviar.com.br"
ORIGIN="https://d29p7cirgjqbxl.cloudfront.net"

echo "========================================="
echo "CORS Preflight Validation"
echo "========================================="
echo ""
echo "Testing: OPTIONS $API/api/admin/auth/login"
echo "Origin: $ORIGIN"
echo ""

RESPONSE=$(curl -sS -i -X OPTIONS "$API/api/admin/auth/login" \
  -H "Origin: $ORIGIN" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Authorization,Content-Type")

echo "$RESPONSE" | head -20
echo ""
echo "========================================="
echo "Validation Results:"
echo "========================================="

# Check for required headers
if echo "$RESPONSE" | grep -qi "access-control-allow-origin: $ORIGIN"; then
  echo "✅ access-control-allow-origin: PRESENT"
else
  echo "❌ access-control-allow-origin: MISSING"
fi

if echo "$RESPONSE" | grep -qi "vary: Origin"; then
  echo "✅ vary: Origin: PRESENT"
else
  echo "❌ vary: Origin: MISSING"
fi

if echo "$RESPONSE" | grep -qi "access-control-allow-credentials: true"; then
  echo "✅ access-control-allow-credentials: PRESENT"
else
  echo "❌ access-control-allow-credentials: MISSING"
fi

if echo "$RESPONSE" | grep -qi "access-control-allow-methods:.*POST"; then
  echo "✅ access-control-allow-methods: PRESENT"
else
  echo "❌ access-control-allow-methods: MISSING"
fi

echo ""
echo "========================================="
echo "Expected after deployment :27:"
echo "  - access-control-allow-origin: $ORIGIN"
echo "  - vary: Origin"
echo "  - access-control-allow-credentials: true"
echo "  - access-control-allow-methods: GET,POST,PUT,PATCH,DELETE,OPTIONS"
echo "========================================="
