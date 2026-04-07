#!/bin/bash

echo "=== Teste 1: Fluxo canônico - Criação de ride sem comunidade ==="
curl -X POST http://localhost:3001/api/rides \
  -H "Content-Type: application/json" \
  -d '{
    "pickup": {"lat": -22.9711, "lng": -43.1822},
    "dropoff": {"lat": -22.9800, "lng": -43.1900},
    "passengerId": "passenger_123"
  }' \
  -w "\nStatus: %{http_code}\n\n"

echo "=== Teste 2: Fluxo canônico - Criação de ride com comunidade ==="
curl -X POST http://localhost:3001/api/rides \
  -H "Content-Type: application/json" \
  -d '{
    "pickup": {"lat": -22.9711, "lng": -43.1822},
    "dropoff": {"lat": -22.9800, "lng": -43.1900},
    "passengerId": "passenger_456",
    "communityId": "rocinha"
  }' \
  -w "\nStatus: %{http_code}\n\n"

echo "=== Teste 3: Contexto operacional de uma ride ==="
curl -X GET http://localhost:3001/api/rides/test_ride_123/operational-context \
  -w "\nStatus: %{http_code}\n\n"

echo "=== Teste 4: Tentativa de update de âncora geográfica (deve falhar) ==="
curl -X PUT http://localhost:3001/api/rides/test_ride_123 \
  -H "Content-Type: application/json" \
  -d '{"neighborhoodId": "new_neighborhood"}' \
  -w "\nStatus: %{http_code}\n\n"

echo "=== Teste 5: Resolução de localização (geo-resolve) ==="
curl -X POST http://localhost:3001/api/rides/resolve-location \
  -H "Content-Type: application/json" \
  -d '{"lat": -22.9711, "lon": -43.1822}' \
  -w "\nStatus: %{http_code}\n\n"
