#!/bin/bash
set -euo pipefail

echo "🧪 Load Test: 30 rides / 10 drivers / Geofence simulation"
echo ""

API="http://localhost:3003"

# Check backend
echo "🔍 Checking backend..."
if ! curl -sS "$API/api/health" > /dev/null 2>&1; then
  echo "❌ Backend not running"
  exit 1
fi
echo "✅ Backend OK"

# Login
echo ""
echo "📝 Logging in..."
LOGIN_JSON=$(curl -sS -X POST "$API/api/auth/passenger/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"passenger@test.com","password":"test1234"}')

TOKEN=$(echo "$LOGIN_JSON" | jq -r '.token // .data.token // empty')

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed"
  echo "$LOGIN_JSON" | head -c 500
  exit 1
fi
echo "✅ Token OK (len=${#TOKEN})"

# Ride origins (20 INSIDE, 10 OUTSIDE)
declare -a ORIGINS_INSIDE=(
  '{"lat":-22.9668,"lng":-43.1729,"text":"Inside 1"}'
  '{"lat":-22.9700,"lng":-43.1800,"text":"Inside 2"}'
  '{"lat":-22.9680,"lng":-43.1750,"text":"Inside 3"}'
  '{"lat":-22.9710,"lng":-43.1820,"text":"Inside 4"}'
  '{"lat":-22.9690,"lng":-43.1770,"text":"Inside 5"}'
  '{"lat":-22.9672,"lng":-43.1735,"text":"Inside 6"}'
  '{"lat":-22.9705,"lng":-43.1810,"text":"Inside 7"}'
  '{"lat":-22.9685,"lng":-43.1760,"text":"Inside 8"}'
  '{"lat":-22.9715,"lng":-43.1830,"text":"Inside 9"}'
  '{"lat":-22.9695,"lng":-43.1780,"text":"Inside 10"}'
  '{"lat":-22.9670,"lng":-43.1740,"text":"Inside 11"}'
  '{"lat":-22.9702,"lng":-43.1805,"text":"Inside 12"}'
  '{"lat":-22.9682,"lng":-43.1755,"text":"Inside 13"}'
  '{"lat":-22.9712,"lng":-43.1825,"text":"Inside 14"}'
  '{"lat":-22.9692,"lng":-43.1775,"text":"Inside 15"}'
  '{"lat":-22.9675,"lng":-43.1745,"text":"Inside 16"}'
  '{"lat":-22.9708,"lng":-43.1815,"text":"Inside 17"}'
  '{"lat":-22.9688,"lng":-43.1765,"text":"Inside 18"}'
  '{"lat":-22.9718,"lng":-43.1835,"text":"Inside 19"}'
  '{"lat":-22.9698,"lng":-43.1785,"text":"Inside 20"}'
)

declare -a ORIGINS_OUTSIDE=(
  '{"lat":-22.9820,"lng":-43.1920,"text":"Outside 1"}'
  '{"lat":-22.9850,"lng":-43.1950,"text":"Outside 2"}'
  '{"lat":-22.9830,"lng":-43.1930,"text":"Outside 3"}'
  '{"lat":-22.9860,"lng":-43.1960,"text":"Outside 4"}'
  '{"lat":-22.9840,"lng":-43.1940,"text":"Outside 5"}'
  '{"lat":-22.9825,"lng":-43.1925,"text":"Outside 6"}'
  '{"lat":-22.9855,"lng":-43.1955,"text":"Outside 7"}'
  '{"lat":-22.9835,"lng":-43.1935,"text":"Outside 8"}'
  '{"lat":-22.9865,"lng":-43.1965,"text":"Outside 9"}'
  '{"lat":-22.9845,"lng":-43.1945,"text":"Outside 10"}'
)

DEST='{"lat":-22.9500,"lng":-43.1600,"text":"Common Dest"}'

# Simulate window
SIM_WINDOW=${DEV_SIM_WINDOW_REAL_SECONDS:-60}
SLEEP_PER_RIDE=$(echo "scale=2; $SIM_WINDOW / 30" | bc)

echo ""
echo "🚗 Creating 30 rides (20 INSIDE, 10 OUTSIDE) over ${SIM_WINDOW}s..."
echo "   Sleep per ride: ${SLEEP_PER_RIDE}s"
echo "   Geofence INSIDE: lat -22.975 to -22.965, lng -43.185 to -43.170"
echo ""

RIDE_COUNT=0
INSIDE_COUNT=0
OUTSIDE_COUNT=0

# 20 INSIDE
for i in {0..19}; do
  RIDE_COUNT=$((RIDE_COUNT + 1))
  INSIDE_COUNT=$((INSIDE_COUNT + 1))
  ORIGIN="${ORIGINS_INSIDE[$i]}"
  
  RESPONSE=$(curl -sS -X POST "$API/api/v2/rides" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"origin\":$ORIGIN,\"destination\":$DEST}")
  
  RIDE_ID=$(echo "$RESPONSE" | jq -r '.data.ride_id // .data.id // empty' 2>/dev/null || echo "")
  
  if [ -n "$RIDE_ID" ]; then
    echo "  ✓ Ride $RIDE_COUNT (INSIDE): $RIDE_ID"
  else
    echo "  ✗ Ride $RIDE_COUNT (INSIDE) failed"
  fi
  
  sleep "$SLEEP_PER_RIDE"
done

# 10 OUTSIDE
for i in {0..9}; do
  RIDE_COUNT=$((RIDE_COUNT + 1))
  OUTSIDE_COUNT=$((OUTSIDE_COUNT + 1))
  ORIGIN="${ORIGINS_OUTSIDE[$i]}"
  
  RESPONSE=$(curl -sS -X POST "$API/api/v2/rides" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"origin\":$ORIGIN,\"destination\":$DEST}")
  
  RIDE_ID=$(echo "$RESPONSE" | jq -r '.data.ride_id // .data.id // empty' 2>/dev/null || echo "")
  
  if [ -n "$RIDE_ID" ]; then
    echo "  ✓ Ride $RIDE_COUNT (OUTSIDE): $RIDE_ID"
  else
    echo "  ✗ Ride $RIDE_COUNT (OUTSIDE) failed"
  fi
  
  sleep "$SLEEP_PER_RIDE"
done

echo ""
echo "📊 Created: $INSIDE_COUNT INSIDE, $OUTSIDE_COUNT OUTSIDE (total: $RIDE_COUNT)"

echo ""
echo "⏳ Waiting 15s for processing (accept + release)..."
sleep 15

echo ""
echo "📊 === METRICS ==="
echo ""

echo "=== Rides by status ==="
PGPASSWORD=dev psql -h localhost -p 5433 -U postgres -d kaviar_dev -c \
"SELECT status, COUNT(*) FROM rides_v2 WHERE created_at > NOW() - INTERVAL '30 minutes' GROUP BY status ORDER BY COUNT(*) DESC;"

echo ""
echo "=== Offers by status ==="
PGPASSWORD=dev psql -h localhost -p 5433 -U postgres -d kaviar_dev -c \
"SELECT status, COUNT(*) FROM ride_offers WHERE created_at > NOW() - INTERVAL '30 minutes' GROUP BY status ORDER BY COUNT(*) DESC;"

echo ""
echo "=== Accepted by driver ==="
PGPASSWORD=dev psql -h localhost -p 5433 -U postgres -d kaviar_dev -c \
"SELECT driver_id, COUNT(*) FROM rides_v2 WHERE created_at > NOW() - INTERVAL '30 minutes' AND status='accepted' GROUP BY driver_id ORDER BY COUNT(*) DESC;"

echo ""
echo "=== Accepted INSIDE vs OUTSIDE ==="
PGPASSWORD=dev psql -h localhost -p 5433 -U postgres -d kaviar_dev -c \
"SELECT 
  CASE 
    WHEN origin_lat >= -22.975 AND origin_lat <= -22.965 AND origin_lng >= -43.185 AND origin_lng <= -43.170 THEN 'INSIDE'
    ELSE 'OUTSIDE'
  END as geofence,
  COUNT(*) as accepted_count
FROM rides_v2 
WHERE created_at > NOW() - INTERVAL '30 minutes' AND status='accepted'
GROUP BY geofence;"

echo ""
echo "✅ Load test complete!"
