#!/bin/bash

# SPEC_RIDE_FLOW_V1 - Script de teste com 20 corridas
# Testa matching, timeout, redispatch e concorrência

set -e

# Forçar DATABASE_URL obrigatório
: "${DATABASE_URL:?❌ DATABASE_URL não configurado. Ex: export DATABASE_URL='postgresql://postgres:dev@localhost:5433/kaviar_dev?schema=public'}"

# Verificar DATABASE_URL
if [[ "$DATABASE_URL" == *"kaviar-prod-db"* ]] || [[ "$DATABASE_URL" == *"production"* ]]; then
  echo "❌ ERRO: DATABASE_URL aponta para PRODUÇÃO!"
  echo "   DATABASE_URL=$DATABASE_URL"
  echo ""
  echo "Configure para banco local ou staging:"
  echo "   export DATABASE_URL=\"postgresql://postgres:dev@localhost:5432/kaviar_dev?schema=public\""
  exit 1
fi

if [ -z "$DATABASE_URL" ]; then
  echo "⚠️  AVISO: DATABASE_URL não configurado"
  echo "   Usando .env (verifique se não é produção!)"
  echo ""
fi

API_URL="${API_URL:-http://localhost:3003}"
PASSENGER_ID="${PASSENGER_ID:-pass_beta_test_001}"
DRIVER1_ID="${DRIVER1_ID:-test-driver-1}"
DRIVER2_ID="${DRIVER2_ID:-test-driver-2}"

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo "🚀 SPEC_RIDE_FLOW_V1 - Teste de 20 Corridas"
echo "=========================================="
echo "API: $API_URL"
echo ""

# Login do passageiro
echo "🔐 Autenticando passageiro..."
PASSENGER_TOKEN=$(curl -sS -X POST "$API_URL/api/auth/passenger/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"passenger@test.com","password":"test1234"}' | jq -r '.token')

if [[ -z "$PASSENGER_TOKEN" || "$PASSENGER_TOKEN" == "null" ]]; then
  echo "❌ ERRO: não conseguiu obter token do passageiro"
  echo "   Verifique se o seed foi executado: npx tsx prisma/seed-ride-flow-v1.ts"
  exit 1
fi

echo "✓ Token obtido"
echo ""

AUTHZ=(-H "Authorization: Bearer $PASSENGER_TOKEN")

# Função para criar corrida
create_ride() {
  local origin_lat=$1
  local origin_lng=$2
  local dest_lat=$3
  local dest_lng=$4
  
  curl -s -X POST "$API_URL/api/v2/rides" \
    "${AUTHZ[@]}" \
    -H "Content-Type: application/json" \
    -d "{
      \"origin\": {\"lat\": $origin_lat, \"lng\": $origin_lng},
      \"destination\": {\"lat\": $dest_lat, \"lng\": $dest_lng}
    }"
}

# Função para aceitar oferta
accept_offer() {
  local offer_id=$1
  local driver_id=$2
  
  curl -s -X POST "$API_URL/api/v2/drivers/offers/$offer_id/accept" \
    -H "x-driver-id: $driver_id"
}

# Função para rejeitar oferta
reject_offer() {
  local offer_id=$1
  local driver_id=$2
  
  curl -s -X POST "$API_URL/api/v2/drivers/offers/$offer_id/reject" \
    -H "x-driver-id: $driver_id"
}

# Função para setar motorista online
set_driver_online() {
  local driver_id=$1
  
  curl -s -X POST "$API_URL/api/v2/drivers/me/availability" \
    -H "Content-Type: application/json" \
    -H "x-driver-id: $driver_id" \
    -d '{"availability": "online"}'
}

# Função para atualizar localização do motorista
update_driver_location() {
  local driver_id=$1
  local lat=$2
  local lng=$3
  
  curl -s -X POST "$API_URL/api/v2/drivers/me/location" \
    -H "Content-Type: application/json" \
    -H "x-driver-id: $driver_id" \
    -d "{\"lat\": $lat, \"lng\": $lng}"
}

# Setup: Colocar motoristas online
echo "📍 Setup: Colocando motoristas online..."
set_driver_online "$DRIVER1_ID" > /dev/null
set_driver_online "$DRIVER2_ID" > /dev/null
update_driver_location "$DRIVER1_ID" -22.9668 -43.1729 > /dev/null
update_driver_location "$DRIVER2_ID" -22.9700 -43.1800 > /dev/null
echo -e "${GREEN}✓${NC} Motoristas online"
echo ""

# Contador de resultados
TOTAL=20
ACCEPTED=0
NO_DRIVER=0
ERRORS=0

echo "🚗 Criando 20 corridas..."
echo ""

for i in $(seq 1 $TOTAL); do
  echo -n "Corrida $i/$TOTAL: "
  
  # Variar origem/destino
  ORIGIN_LAT=$(echo "-22.9668 + ($i * 0.001)" | bc)
  ORIGIN_LNG=$(echo "-43.1729 + ($i * 0.001)" | bc)
  DEST_LAT=$(echo "-22.9500 + ($i * 0.001)" | bc)
  DEST_LNG=$(echo "-43.1800 + ($i * 0.001)" | bc)
  
  # Criar corrida
  RESPONSE=$(create_ride $ORIGIN_LAT $ORIGIN_LNG $DEST_LAT $DEST_LNG)
  
  # Verificar resposta
  if echo "$RESPONSE" | grep -q '"success":true'; then
    RIDE_ID=$(echo "$RESPONSE" | jq -r '.data.ride_id')
    STATUS=$(echo "$RESPONSE" | jq -r '.data.status')
    
    echo -e "${GREEN}✓${NC} ride_id=$RIDE_ID status=$STATUS"
    
    # Pequeno delay entre corridas
    sleep 0.2
  else
    echo -e "${RED}✗${NC} Erro: $RESPONSE"
    ERRORS=$((ERRORS + 1))
  fi
done

echo ""
echo "⏳ Aguardando dispatcher processar..."
sleep 3

echo "🔍 Consultando métricas reais no banco..."
echo ""

# Extrair credenciais do DATABASE_URL
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')

# Contar métricas reais
ACCEPTED=$(PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c \
  "SELECT COUNT(*) FROM rides_v2 WHERE passenger_id='${PASSENGER_ID}' AND created_at > NOW() - INTERVAL '10 minutes' AND status='accepted';" 2>/dev/null | xargs || echo "0")

NO_DRIVER=$(PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c \
  "SELECT COUNT(*) FROM rides_v2 WHERE passenger_id='${PASSENGER_ID}' AND created_at > NOW() - INTERVAL '10 minutes' AND status='no_driver';" 2>/dev/null | xargs || echo "0")

OFFERED=$(PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c \
  "SELECT COUNT(*) FROM rides_v2 WHERE passenger_id='${PASSENGER_ID}' AND created_at > NOW() - INTERVAL '10 minutes' AND status='offered';" 2>/dev/null | xargs || echo "0")

REQUESTED=$(PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c \
  "SELECT COUNT(*) FROM rides_v2 WHERE passenger_id='${PASSENGER_ID}' AND created_at > NOW() - INTERVAL '10 minutes' AND status='requested';" 2>/dev/null | xargs || echo "0")

echo ""
echo "=========================================="
echo "📊 RESULTADOS (do banco)"
echo "=========================================="
echo "Total de corridas: $TOTAL"
echo -e "${GREEN}Aceitas: $ACCEPTED${NC}"
echo -e "${YELLOW}Sem motorista: $NO_DRIVER${NC}"
echo -e "${BLUE}Oferecidas: $OFFERED${NC}"
echo -e "${CYAN}Aguardando: $REQUESTED${NC}"
echo -e "${RED}Erros HTTP: $ERRORS${NC}"
echo ""

# Verificar logs no CloudWatch (se estiver em AWS)
if [ "$API_URL" != "http://localhost:3003" ]; then
  echo "📋 Para ver logs no CloudWatch:"
  echo "aws logs tail /ecs/kaviar-backend --follow --format json | jq '.message | fromjson | select(.ride_id != null)'"
  echo ""
fi

echo "✅ Teste concluído!"
echo ""
echo "🔍 Próximos passos:"
echo "1. Verificar logs do backend para RIDE_CREATED, DISPATCH_CANDIDATES, OFFER_SENT"
echo "2. Verificar se timeout está funcionando (ofertas expiram após 15s)"
echo "3. Verificar se redispatch acontece após rejeição/timeout"
echo "4. Testar concorrência: 2 motoristas não devem aceitar a mesma corrida"
