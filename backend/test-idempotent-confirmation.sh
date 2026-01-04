#!/bin/bash

# Test script for idempotent confirmation system
# Tests the out-of-fence fallback with confirmation tokens

BASE_URL="http://localhost:3000/api/governance"
PASSENGER_ID="passenger_test_123"

echo "🧪 Testing Idempotent Confirmation System"
echo "=========================================="

# Test 1: Request community ride (should trigger fallback)
echo ""
echo "📍 Test 1: Request community ride (expecting fallback)"
echo "------------------------------------------------------"

RESPONSE1=$(curl -s -X POST "$BASE_URL/ride/request" \
  -H "Content-Type: application/json" \
  -d '{
    "passengerId": "'$PASSENGER_ID'",
    "type": "comunidade",
    "origin": "Rua A, 123",
    "destination": "Rua B, 456",
    "price": 15.50,
    "passengerLat": -23.5505,
    "passengerLng": -46.6333
  }')

echo "Response: $RESPONSE1"

# Extract confirmation token
CONFIRMATION_TOKEN=$(echo $RESPONSE1 | jq -r '.confirmationToken // empty')

if [ -z "$CONFIRMATION_TOKEN" ]; then
  echo "❌ No confirmation token received. Test failed."
  exit 1
fi

echo "✅ Confirmation token received: $CONFIRMATION_TOKEN"

# Test 2: Confirm fallback (should create ride)
echo ""
echo "✅ Test 2: Confirm fallback (should create ride)"
echo "-----------------------------------------------"

RESPONSE2=$(curl -s -X POST "$BASE_URL/ride/request" \
  -H "Content-Type: application/json" \
  -d '{
    "passengerId": "'$PASSENGER_ID'",
    "confirmationToken": "'$CONFIRMATION_TOKEN'"
  }')

echo "Response: $RESPONSE2"

# Extract ride ID
RIDE_ID=$(echo $RESPONSE2 | jq -r '.ride.id // empty')

if [ -z "$RIDE_ID" ]; then
  echo "❌ No ride created. Test failed."
  exit 1
fi

echo "✅ Ride created with ID: $RIDE_ID"

# Test 3: Try to confirm again (should return existing ride - idempotent)
echo ""
echo "🔄 Test 3: Confirm again (should be idempotent)"
echo "----------------------------------------------"

RESPONSE3=$(curl -s -X POST "$BASE_URL/ride/request" \
  -H "Content-Type: application/json" \
  -d '{
    "passengerId": "'$PASSENGER_ID'",
    "confirmationToken": "'$CONFIRMATION_TOKEN'"
  }')

echo "Response: $RESPONSE3"

# Check if it returns existing ride
EXISTING_RIDE_ID=$(echo $RESPONSE3 | jq -r '.rideId // empty')
IS_EXISTING=$(echo $RESPONSE3 | jq -r '.message | contains("já criada") // false')

if [ "$EXISTING_RIDE_ID" = "$RIDE_ID" ] && [ "$IS_EXISTING" = "true" ]; then
  echo "✅ Idempotent behavior confirmed - returned existing ride"
else
  echo "❌ Idempotent behavior failed"
  exit 1
fi

# Test 4: Try with invalid token
echo ""
echo "🚫 Test 4: Try with invalid token (should fail)"
echo "----------------------------------------------"

RESPONSE4=$(curl -s -X POST "$BASE_URL/ride/request" \
  -H "Content-Type: application/json" \
  -d '{
    "passengerId": "'$PASSENGER_ID'",
    "confirmationToken": "invalid_token_123"
  }')

echo "Response: $RESPONSE4"

ERROR_MESSAGE=$(echo $RESPONSE4 | jq -r '.error // empty')

if [[ "$ERROR_MESSAGE" == *"inválido"* ]]; then
  echo "✅ Invalid token correctly rejected"
else
  echo "❌ Invalid token should have been rejected"
  exit 1
fi

# Test 5: Try with wrong passenger ID
echo ""
echo "🚫 Test 5: Try with wrong passenger ID (should fail)"
echo "---------------------------------------------------"

RESPONSE5=$(curl -s -X POST "$BASE_URL/ride/request" \
  -H "Content-Type: application/json" \
  -d '{
    "passengerId": "wrong_passenger_456",
    "confirmationToken": "'$CONFIRMATION_TOKEN'"
  }')

echo "Response: $RESPONSE5"

ERROR_MESSAGE5=$(echo $RESPONSE5 | jq -r '.error // empty')

if [[ "$ERROR_MESSAGE5" == *"pertence"* ]] || [[ "$ERROR_MESSAGE5" == *"inválido"* ]]; then
  echo "✅ Wrong passenger ID correctly rejected"
else
  echo "❌ Wrong passenger ID should have been rejected"
  exit 1
fi

# Test 6: Wait for token expiration (if TTL is short enough)
echo ""
echo "⏰ Test 6: Token expiration test (waiting 6 minutes)"
echo "---------------------------------------------------"
echo "Note: This test requires waiting for token expiration (5 min TTL)"
echo "Skipping automatic expiration test - run manually if needed"

# Uncomment below to test expiration (requires 6+ minute wait)
# echo "Waiting 6 minutes for token expiration..."
# sleep 360
# 
# RESPONSE6=$(curl -s -X POST "$BASE_URL/ride/request" \
#   -H "Content-Type: application/json" \
#   -d '{
#     "passengerId": "'$PASSENGER_ID'",
#     "confirmationToken": "'$CONFIRMATION_TOKEN'"
#   }')
# 
# echo "Response after expiration: $RESPONSE6"
# 
# ERROR_MESSAGE6=$(echo $RESPONSE6 | jq -r '.error // empty')
# 
# if [[ "$ERROR_MESSAGE6" == *"expirado"* ]]; then
#   echo "✅ Token expiration correctly handled"
# else
#   echo "❌ Token expiration should have been handled"
#   exit 1
# fi

echo ""
echo "🎉 All tests passed!"
echo "==================="
echo "✅ Confirmation token generation"
echo "✅ Ride creation from token"
echo "✅ Idempotent behavior"
echo "✅ Invalid token rejection"
echo "✅ Wrong passenger rejection"
echo "⏰ Token expiration (manual test)"
echo ""
echo "System is working correctly! 🚀"
