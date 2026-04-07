#!/bin/bash

echo "=== Teste 1: RJ (Copacabana) ==="
curl -X GET "http://localhost:3001/api/geo/resolve?lat=-22.9711&lon=-43.1822" \
  -w "\nStatus: %{http_code}\n\n"

echo "=== Teste 2: Comunidade sem polígono próprio (Rio das Pedras) ==="
curl -X GET "http://localhost:3001/api/geo/resolve?lat=-22.9833&lon=-43.3667" \
  -w "\nStatus: %{http_code}\n\n"

echo "=== Teste 3: Fora do RJ ==="
curl -X GET "http://localhost:3001/api/geo/resolve?lat=-23.5505&lon=-46.6333" \
  -w "\nStatus: %{http_code}\n\n"
