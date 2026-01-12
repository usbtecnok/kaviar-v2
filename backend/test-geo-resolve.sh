#!/bin/bash

echo "=== Teste 1: Coordenadas válidas (centro de São Paulo) ==="
curl -X POST http://localhost:3001/api/geo/resolve \
  -H "Content-Type: application/json" \
  -d '{"lat": -23.5505, "lon": -46.6333}' \
  -w "\nStatus: %{http_code}\n\n"

echo "=== Teste 2: Coordenadas inválidas (fora do range) ==="
curl -X POST http://localhost:3001/api/geo/resolve \
  -H "Content-Type: application/json" \
  -d '{"lat": 91, "lon": 181}' \
  -w "\nStatus: %{http_code}\n\n"

echo "=== Teste 3: Coordenadas válidas mas sem match ==="
curl -X POST http://localhost:3001/api/geo/resolve \
  -H "Content-Type: application/json" \
  -d '{"lat": 0, "lon": 0}' \
  -w "\nStatus: %{http_code}\n\n"
