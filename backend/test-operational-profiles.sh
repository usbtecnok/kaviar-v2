#!/bin/bash

echo "=== TESTE: Regras Operacionais Canônicas ==="
echo ""

echo "1. Criação de ride NORMAL (sem comunidade)"
curl -X POST http://localhost:3001/api/rides \
  -H "Content-Type: application/json" \
  -d '{
    "pickup": {"lat": -22.9711, "lng": -43.1822},
    "dropoff": {"lat": -22.9800, "lng": -43.1900},
    "passengerId": "passenger_normal"
  }' \
  -w "\nStatus: %{http_code}\n\n"

echo "2. Criação de ride RESTRICTED (comunidade com perfil restrito)"
curl -X POST http://localhost:3001/api/rides \
  -H "Content-Type: application/json" \
  -d '{
    "pickup": {"lat": -22.9711, "lng": -43.1822},
    "dropoff": {"lat": -22.9800, "lng": -43.1900},
    "passengerId": "passenger_restricted",
    "communityId": "restricted_community"
  }' \
  -w "\nStatus: %{http_code}\n\n"

echo "3. Criação de ride PRIORITY (comunidade com prioridade local)"
curl -X POST http://localhost:3001/api/rides \
  -H "Content-Type: application/json" \
  -d '{
    "pickup": {"lat": -22.9711, "lng": -43.1822},
    "dropoff": {"lat": -22.9800, "lng": -43.1900},
    "passengerId": "passenger_priority",
    "communityId": "priority_community"
  }' \
  -w "\nStatus: %{http_code}\n\n"

echo "4. Criação de ride PRIVATE (operação fechada)"
curl -X POST http://localhost:3001/api/rides \
  -H "Content-Type: application/json" \
  -d '{
    "pickup": {"lat": -22.9711, "lng": -43.1822},
    "dropoff": {"lat": -22.9800, "lng": -43.1900},
    "passengerId": "passenger_private",
    "communityId": "private_community"
  }' \
  -w "\nStatus: %{http_code}\n\n"

echo "5. Teste de contexto operacional"
curl -X GET http://localhost:3001/api/rides/test_ride_123/operational-context \
  -w "\nStatus: %{http_code}\n\n"

echo "6. Teste de dispatch com regras operacionais"
curl -X POST http://localhost:3001/api/rides/test_ride_123/dispatch \
  -w "\nStatus: %{http_code}\n\n"

echo ""
echo "=== TABELA RESUMO DAS REGRAS ==="
echo "NORMAL:     Dispatch padrão, sem filtros"
echo "RESTRICTED: Exige aprovação + flag operacional"
echo "PRIORITY:   Locais primeiro, fallback geral"
echo "PRIVATE:    Apenas vinculados, pode falhar"
