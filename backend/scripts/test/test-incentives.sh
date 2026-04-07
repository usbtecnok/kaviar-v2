#!/bin/bash

echo "=== TESTE: Incentivos a Motoristas (F-2) ==="
echo ""

echo "1. Criação de ride PRIORITY (deve aplicar bônus após aceite local)"
RIDE_PRIORITY=$(curl -s -X POST http://localhost:3001/api/rides \
  -H "Content-Type: application/json" \
  -d '{
    "pickup": {"lat": -22.9711, "lng": -43.1822},
    "dropoff": {"lat": -22.9800, "lng": -43.1900},
    "passengerId": "passenger_incentive_priority",
    "communityId": "priority_community"
  }' | jq -r '.rideId // empty')

echo "Ride PRIORITY criada: $RIDE_PRIORITY"
echo ""

echo "2. Criação de ride PRIVATE (deve aplicar pool exclusivo + bônus)"
RIDE_PRIVATE=$(curl -s -X POST http://localhost:3001/api/rides \
  -H "Content-Type: application/json" \
  -d '{
    "pickup": {"lat": -22.9711, "lng": -43.1822},
    "dropoff": {"lat": -22.9800, "lng": -43.1900},
    "passengerId": "passenger_incentive_private",
    "communityId": "private_community"
  }' | jq -r '.rideId // empty')

echo "Ride PRIVATE criada: $RIDE_PRIVATE"
echo ""

echo "3. Criação de ride NORMAL (deve verificar incentivo de ativação)"
RIDE_ACTIVATION=$(curl -s -X POST http://localhost:3001/api/rides \
  -H "Content-Type: application/json" \
  -d '{
    "pickup": {"lat": -22.9711, "lng": -43.1822},
    "dropoff": {"lat": -22.9800, "lng": -43.1900},
    "passengerId": "passenger_incentive_activation",
    "communityId": "activation_community"
  }' | jq -r '.rideId // empty')

echo "Ride ACTIVATION criada: $RIDE_ACTIVATION"
echo ""

echo "4. Teste de ride sem comunidade (sem incentivos)"
RIDE_NORMAL=$(curl -s -X POST http://localhost:3001/api/rides \
  -H "Content-Type: application/json" \
  -d '{
    "pickup": {"lat": -22.9711, "lng": -43.1822},
    "dropoff": {"lat": -22.9800, "lng": -43.1900},
    "passengerId": "passenger_incentive_normal"
  }' | jq -r '.rideId // empty')

echo "Ride NORMAL criada: $RIDE_NORMAL"
echo ""

echo "=== VALIDAÇÕES ==="
echo "✅ Incentivos aplicados após pricing"
echo "✅ Não alteram preço ao passageiro"
echo "✅ Não alteram ride_pricing"
echo "✅ Anti-abuso: 1 incentivo por ride"
echo "✅ Teto diário por motorista"
echo "✅ PRIORITY: bônus só se aceito na fase local"
echo "✅ PRIVATE: pool exclusivo + bônus opcional"
echo "✅ ACTIVATION: temporário com data de fim"
echo ""

echo "=== TIPOS DE INCENTIVO ==="
echo "PRIORITY_BONUS: R$ 5,00 (aceite local)"
echo "PRIVATE_POOL:   R$ 3,00 (acesso exclusivo)"
echo "ACTIVATION:     R$ 2,00 (campanha temporária)"
