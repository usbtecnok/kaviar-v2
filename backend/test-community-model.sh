#!/bin/bash

echo "=== Teste 1: Resolução sem comunidade (bairro puro) ==="
curl -X POST http://localhost:3001/api/rides/resolve-location \
  -H "Content-Type: application/json" \
  -d '{"lat": -22.9711, "lon": -43.1822}' \
  -w "\nStatus: %{http_code}\n\n"

echo "=== Teste 2: Resolução com comunidade válida ==="
curl -X POST http://localhost:3001/api/rides/resolve-location \
  -H "Content-Type: application/json" \
  -d '{"lat": -22.9711, "lon": -43.1822, "communityId": "rocinha"}' \
  -w "\nStatus: %{http_code}\n\n"

echo "=== Teste 3: Criação de ride sem comunidade ==="
curl -X POST http://localhost:3001/api/rides \
  -H "Content-Type: application/json" \
  -d '{
    "passengerId": "passenger_123",
    "origin": "Copacabana Beach",
    "destination": "Christ the Redeemer",
    "originLat": -22.9711,
    "originLng": -43.1822
  }' \
  -w "\nStatus: %{http_code}\n\n"

echo "=== Teste 4: Criação de ride com comunidade ==="
curl -X POST http://localhost:3001/api/rides \
  -H "Content-Type: application/json" \
  -d '{
    "passengerId": "passenger_456",
    "origin": "Rocinha",
    "destination": "Ipanema",
    "originLat": -22.9711,
    "originLng": -43.1822,
    "communityId": "rocinha"
  }' \
  -w "\nStatus: %{http_code}\n\n"

echo "=== Teste 5: Tentativa de update de âncora geográfica (deve falhar) ==="
curl -X PUT http://localhost:3001/api/rides/test_ride_123 \
  -H "Content-Type: application/json" \
  -d '{"neighborhoodId": "new_neighborhood"}' \
  -w "\nStatus: %{http_code}\n\n"
