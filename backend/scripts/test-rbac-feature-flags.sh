#!/bin/bash

API_URL="${API_URL:-https://api.kaviar.com.br}"
KEY="passenger_favorites_matching"

echo "=== FEATURE FLAGS RBAC TEST ==="
echo

# Login SUPER_ADMIN
echo "Logging in as SUPER_ADMIN..."
SUPER_TOKEN=$(curl -s -X POST "${API_URL}/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"${SUPER_ADMIN_EMAIL}\", \"password\": \"${SUPER_ADMIN_PASSWORD}\"}" | jq -r '.token')

if [ "$SUPER_TOKEN" = "null" ] || [ -z "$SUPER_TOKEN" ]; then
  echo "❌ SUPER_ADMIN login failed"
  exit 1
fi
echo "✓ SUPER_ADMIN logged in"

# Login ANGEL_VIEWER
echo "Logging in as ANGEL_VIEWER..."
ANGEL_TOKEN=$(curl -s -X POST "${API_URL}/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"${ANGEL_EMAIL}\", \"password\": \"${ANGEL_PASSWORD}\"}" | jq -r '.token')

if [ "$ANGEL_TOKEN" = "null" ] || [ -z "$ANGEL_TOKEN" ]; then
  echo "❌ ANGEL_VIEWER login failed"
  exit 1
fi
echo "✓ ANGEL_VIEWER logged in"
echo

ALL_PASSED=true

# Test 1: ANGEL GET (should work)
echo "TEST 1: ANGEL_VIEWER GET /feature-flags/${KEY}"
STATUS=$(curl -s -w "%{http_code}" -o /tmp/resp1.json \
  "${API_URL}/api/admin/feature-flags/${KEY}" \
  -H "Authorization: Bearer ${ANGEL_TOKEN}")

if [ "$STATUS" = "200" ]; then
  echo "  ✓ Status 200"
else
  echo "  ✗ Status ${STATUS} (expected 200)"
  ALL_PASSED=false
fi

# Test 2: ANGEL PUT (should fail 403)
echo
echo "TEST 2: ANGEL_VIEWER PUT /feature-flags/${KEY}"
STATUS=$(curl -s -w "%{http_code}" -o /tmp/resp2.json -X PUT \
  "${API_URL}/api/admin/feature-flags/${KEY}" \
  -H "Authorization: Bearer ${ANGEL_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true, "rolloutPercentage": 10}')

if [ "$STATUS" = "403" ]; then
  echo "  ✓ Status 403 (blocked)"
else
  echo "  ✗ Status ${STATUS} (expected 403)"
  ALL_PASSED=false
fi

# Test 3: ANGEL POST allowlist (should fail 403)
echo
echo "TEST 3: ANGEL_VIEWER POST /feature-flags/${KEY}/allowlist"
STATUS=$(curl -s -w "%{http_code}" -o /tmp/resp3.json -X POST \
  "${API_URL}/api/admin/feature-flags/${KEY}/allowlist" \
  -H "Authorization: Bearer ${ANGEL_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"passengerId": "test-123"}')

if [ "$STATUS" = "403" ]; then
  echo "  ✓ Status 403 (blocked)"
else
  echo "  ✗ Status ${STATUS} (expected 403)"
  ALL_PASSED=false
fi

# Test 4: ANGEL DELETE allowlist (should fail 403)
echo
echo "TEST 4: ANGEL_VIEWER DELETE /feature-flags/${KEY}/allowlist/test-123"
STATUS=$(curl -s -w "%{http_code}" -o /tmp/resp4.json -X DELETE \
  "${API_URL}/api/admin/feature-flags/${KEY}/allowlist/test-123" \
  -H "Authorization: Bearer ${ANGEL_TOKEN}")

if [ "$STATUS" = "403" ]; then
  echo "  ✓ Status 403 (blocked)"
else
  echo "  ✗ Status ${STATUS} (expected 403)"
  ALL_PASSED=false
fi

# Test 5: SUPER PUT (should work)
echo
echo "TEST 5: SUPER_ADMIN PUT /feature-flags/${KEY}"
STATUS=$(curl -s -w "%{http_code}" -o /tmp/resp5.json -X PUT \
  "${API_URL}/api/admin/feature-flags/${KEY}" \
  -H "Authorization: Bearer ${SUPER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true, "rolloutPercentage": 5}')

if [ "$STATUS" = "200" ]; then
  echo "  ✓ Status 200"
else
  echo "  ✗ Status ${STATUS} (expected 200)"
  ALL_PASSED=false
fi

# Test 6: SUPER POST allowlist (should work)
echo
echo "TEST 6: SUPER_ADMIN POST /feature-flags/${KEY}/allowlist"
STATUS=$(curl -s -w "%{http_code}" -o /tmp/resp6.json -X POST \
  "${API_URL}/api/admin/feature-flags/${KEY}/allowlist" \
  -H "Authorization: Bearer ${SUPER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"passengerId": "test-rbac-123"}')

if [ "$STATUS" = "200" ]; then
  echo "  ✓ Status 200"
else
  echo "  ✗ Status ${STATUS} (expected 200)"
  ALL_PASSED=false
fi

# Test 7: SUPER DELETE allowlist (should work)
echo
echo "TEST 7: SUPER_ADMIN DELETE /feature-flags/${KEY}/allowlist/test-rbac-123"
STATUS=$(curl -s -w "%{http_code}" -o /tmp/resp7.json -X DELETE \
  "${API_URL}/api/admin/feature-flags/${KEY}/allowlist/test-rbac-123" \
  -H "Authorization: Bearer ${SUPER_TOKEN}")

if [ "$STATUS" = "200" ]; then
  echo "  ✓ Status 200"
else
  echo "  ✗ Status ${STATUS} (expected 200)"
  ALL_PASSED=false
fi

echo
echo "========================================"
if [ "$ALL_PASSED" = true ]; then
  echo "✅ ALL RBAC TESTS PASSED"
  echo "========================================"
  exit 0
else
  echo "❌ SOME RBAC TESTS FAILED"
  echo "========================================"
  exit 1
fi
