#!/bin/bash
set -euo pipefail

echo "🧪 Testing DEV_AUTO_ACCEPT with 10 rides..."

API="http://localhost:3003"

# Check if backend is running
echo "🔍 Checking backend health..."
if ! HEALTH_CHECK=$(curl -sS "$API/api/health" 2>&1); then
  echo "❌ Backend not responding on port 3003"
  echo "$HEALTH_CHECK"
  exit 1
fi
echo "✅ Backend is running"

# Login passenger
echo ""
echo "📝 Logging in as passenger..."
if ! LOGIN_JSON=$(curl -sS -X POST "$API/api/auth/passenger/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"passenger@test.com","password":"test1234"}' 2>&1); then
  echo "❌ Login request failed"
  echo "$LOGIN_JSON"
  exit 1
fi

TOKEN=$(echo "$LOGIN_JSON" | jq -r '.token // .data.token // empty' 2>/dev/null || echo "")

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "❌ Failed to extract token"
  echo ""
  echo "Login response (first 1200 chars):"
  echo "$LOGIN_JSON" | head -c 1200
  echo ""
  exit 1
fi

echo "✅ Token obtained (len=${#TOKEN})"

# Create 10 rides
echo ""
echo "🚗 Creating 10 rides..."
for i in {1..10}; do
  RESPONSE=$(curl -sS -X POST "$API/api/v2/rides" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
      "origin": {
        "lat": -22.9668,
        "lng": -43.1729,
        "text": "Test Origin"
      },
      "destination": {
        "lat": -22.9700,
        "lng": -43.1800,
        "text": "Test Dest"
      }
    }')
  
  RIDE_ID=$(echo "$RESPONSE" | jq -r '.data.ride_id // .data.id // .id // empty' 2>/dev/null || echo "")
  
  if [ -n "$RIDE_ID" ] && [ "$RIDE_ID" != "null" ]; then
    echo "  ✓ Ride $i created: $RIDE_ID"
  else
    echo "  ✗ Ride $i failed: $(echo "$RESPONSE" | head -c 200)"
  fi
  
  sleep 0.3
done

echo ""
echo "⏳ Waiting 3 seconds for auto-accept to complete..."
sleep 3

echo ""
echo "📊 Results from database:"
echo ""
echo "=== Rides by status (last 10 min) ==="
PGPASSWORD=dev psql -h localhost -p 5433 -U postgres -d kaviar_dev -c \
"SELECT status, COUNT(*) FROM rides_v2 WHERE created_at > NOW() - INTERVAL '10 minutes' GROUP BY status ORDER BY COUNT(*) DESC;"

echo ""
echo "=== Offers by status (last 10 min) ==="
PGPASSWORD=dev psql -h localhost -p 5433 -U postgres -d kaviar_dev -c \
"SELECT status, COUNT(*) FROM ride_offers WHERE created_at > NOW() - INTERVAL '10 minutes' GROUP BY status ORDER BY COUNT(*) DESC;"

echo ""
echo "=== Sample rides with offers ==="
PGPASSWORD=dev psql -h localhost -p 5433 -U postgres -d kaviar_dev -c \
"SELECT r.id, r.status as ride_status, r.driver_id, 
  (SELECT COUNT(*) FROM ride_offers WHERE ride_id = r.id AND status = 'accepted') as accepted_offers,
  (SELECT COUNT(*) FROM ride_offers WHERE ride_id = r.id AND status = 'expired') as expired_offers,
  (SELECT COUNT(*) FROM ride_offers WHERE ride_id = r.id AND status = 'canceled') as canceled_offers
FROM rides_v2 r 
WHERE r.created_at > NOW() - INTERVAL '10 minutes' 
ORDER BY r.created_at DESC 
LIMIT 10;"

echo ""
echo "✅ Test complete!"
