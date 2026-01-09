# Geofence Integration - Validation Tests

## Backend Tests

### Test Outside Service Area (Should Return 403)

```bash
# Test with coordinates outside Rio neighborhoods
curl -X POST https://kaviar-v2.onrender.com/api/governance/ride/request \
  -H "Content-Type: application/json" \
  -d '{
    "passengerId": "test-passenger",
    "passengerLat": -22.0000,
    "passengerLng": -43.0000,
    "pickup": {
      "lat": -22.0000,
      "lng": -43.0000,
      "address": "Outside area"
    },
    "dropoff": {
      "lat": -22.0001,
      "lng": -43.0001,
      "address": "Also outside"
    }
  }'

# Expected response: HTTP 403
# {"success": false, "error": "Fora da área atendida"}
```

### Test Inside Service Area - Copacabana (Should Allow)

```bash
# Test with Copacabana coordinates
curl -X POST https://kaviar-v2.onrender.com/api/governance/ride/request \
  -H "Content-Type: application/json" \
  -d '{
    "passengerId": "test-passenger", 
    "passengerLat": -22.9868,
    "passengerLng": -43.2050,
    "pickup": {
      "lat": -22.9868,
      "lng": -43.2050,
      "address": "Copacabana"
    },
    "dropoff": {
      "lat": -22.9870,
      "lng": -43.2055,
      "address": "Copacabana Beach"
    }
  }'

# Expected response: HTTP 200/201 (ride created)
```

### Test Inside Service Area - Ipanema (Should Allow)

```bash
# Test with Ipanema coordinates  
curl -X POST https://kaviar-v2.onrender.com/api/governance/ride/request \
  -H "Content-Type: application/json" \
  -d '{
    "passengerId": "test-passenger",
    "passengerLat": -22.9838,
    "passengerLng": -43.2096,
    "pickup": {
      "lat": -22.9838,
      "lng": -43.2096,
      "address": "Ipanema"
    },
    "dropoff": {
      "lat": -22.9840,
      "lng": -43.2100,
      "address": "Ipanema Beach"
    }
  }'

# Expected response: HTTP 200/201 (ride created)
```

## Frontend Tests

### Manual Testing Steps

1. **Access RequestRide page**: Navigate to `/passenger/request-ride`

2. **Allow GPS permission** when prompted by browser

3. **Test inside area** (if in Rio):
   - Should show: "✅ Área atendida: [Neighborhood Name]"
   - Request button should be enabled

4. **Test outside area** (if outside Rio):
   - Should show: "🚫 Você está fora da área atendida pela KAVIAR"  
   - Request button should be disabled with text "Fora da área atendida"

5. **Test GPS denied**:
   - Should show warning with "Tentar novamente" button
   - Request button should be disabled

6. **Test backend 403 handling**:
   - If frontend validation fails, backend should still block
   - Should show error: "Você está fora da área atendida"

## Validation Checklist

- [ ] Backend blocks ride creation outside geofence (HTTP 403)
- [ ] Backend allows ride creation inside geofence (HTTP 200/201)  
- [ ] Frontend detects GPS location automatically
- [ ] Frontend shows area name when inside service area
- [ ] Frontend disables button when outside service area
- [ ] Frontend handles backend 403 errors gracefully
- [ ] No duplicate geofence logic (single source of truth)
- [ ] No schema changes or drift in this PR
