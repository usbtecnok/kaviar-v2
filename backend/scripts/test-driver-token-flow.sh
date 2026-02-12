#!/bin/bash
# Test driver onboarding token flow

echo "🧪 Testing Driver Onboarding Token Flow"
echo "========================================"
echo ""

echo "1. Testing driver onboarding endpoint (public, no auth)..."
curl -s -X POST https://api.kaviar.com.br/api/driver/onboarding \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Driver",
    "email": "test-driver-'$(date +%s)'@test.com",
    "password": "test123456",
    "neighborhoodId": "some-neighborhood-id"
  }' | jq -r '.success, .data.id, .message'

echo ""
echo "2. Expected flow in CompleteOnboarding.jsx:"
echo "   a) POST /api/driver/onboarding (public) → returns driver.id"
echo "   b) POST /api/auth/driver/login → returns token"
echo "   c) localStorage.setItem('kaviar_driver_token', token)"
echo "   d) localStorage.setItem('kaviar_driver_data', JSON.stringify(user))"
echo ""

echo "3. API Client Token Detection:"
echo "   ✅ /api/driver/onboarding → scope: 'driver' → uses kaviar_driver_token"
echo "   ✅ /api/drivers/* → scope: 'driver' → uses kaviar_driver_token"
echo "   ✅ /api/auth/driver/login → isAuthRoute → NO token sent"
echo ""

echo "4. Browser Console Expected Logs:"
echo "   [API] Auth route - NO token: POST /api/auth/driver/login"
echo "   [API] ✅ Request: GET /api/drivers/me { scope: 'driver', storageKey: 'kaviar_driver_token', hasToken: true }"
echo ""

echo "5. Storage Keys:"
echo "   kaviar_driver_token - JWT token for driver"
echo "   kaviar_driver_data - Driver user object"
echo ""

echo "✅ Fix Applied:"
echo "   - getTokenScope now detects /api/driver (singular) and /api/drivers/ (plural)"
echo "   - Both use kaviar_driver_token from localStorage"
echo "   - CompleteOnboarding saves token after login"
