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

echo "=== Teste 3: Resolução com comunidade inválida (deve ignorar) ==="
curl -X POST http://localhost:3001/api/rides/resolve-location \
  -H "Content-Type: application/json" \
  -d '{"lat": -22.9711, "lon": -43.1822, "communityId": "invalid"}' \
  -w "\nStatus: %{http_code}\n\n"

echo "=== Teste 4: Listar comunidades de um bairro ==="
curl -X GET "http://localhost:3001/api/neighborhoods/copacabana/communities" \
  -w "\nStatus: %{http_code}\n\n"
