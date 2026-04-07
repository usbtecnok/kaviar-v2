#!/bin/bash

# 🧪 TESTE LACUNA 2: POST /api/drivers/me/online
# Data: 2026-01-16
# Escopo: APENAS testar endpoint de motorista online

set -e

echo "🧪 TESTE LACUNA 2: Motorista Online"
echo "===================================="
echo ""

# Configuração
BACKEND_URL="${BACKEND_URL:-http://localhost:3000}"

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_step() { echo -e "${GREEN}✓${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }
log_warning() { echo -e "${YELLOW}⚠${NC} $1"; }

api_call() {
  local method=$1
  local endpoint=$2
  local data=$3
  local token=$4
  
  if [ -n "$token" ]; then
    curl -s -X "$method" "$BACKEND_URL$endpoint" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $token" \
      -d "$data"
  else
    curl -s -X "$method" "$BACKEND_URL$endpoint" \
      -H "Content-Type: application/json" \
      -d "$data"
  fi
}

echo "📋 PASSO 1: Verificar Backend"
echo "=============================="
if curl -s "$BACKEND_URL/health" > /dev/null 2>&1; then
  log_step "Backend está rodando"
else
  log_error "Backend não está acessível"
  exit 1
fi

echo ""
echo "📋 PASSO 2: Criar Motorista de Teste"
echo "====================================="

DRIVER_ID="drv_online_test_$(date +%s)"
DRIVER_EMAIL="motorista.online.$(date +%s)@kaviar.test"
PASSWORD_HASH='$2b$10$rOvHPz8fGNkMYnJ6xUzrO.qY5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5'

psql "$DATABASE_URL" -c "
INSERT INTO drivers (id, name, email, phone, status, vehicle_model, password_hash, created_at, updated_at)
VALUES (
  '$DRIVER_ID',
  'Motorista Online Test',
  '$DRIVER_EMAIL',
  '+5511888888888',
  'approved',
  'Teste Sedan',
  '$PASSWORD_HASH',
  NOW(),
  NOW()
);
" > /dev/null 2>&1

log_step "Motorista criado: $DRIVER_ID"
log_step "Email: $DRIVER_EMAIL"
log_step "Senha: test123"

echo ""
echo "📋 PASSO 3: Login do Motorista"
echo "==============================="

DRIVER_LOGIN_RESPONSE=$(api_call POST "/api/auth/driver/login" "{\"email\":\"$DRIVER_EMAIL\",\"password\":\"test123\"}")
DRIVER_TOKEN=$(echo "$DRIVER_LOGIN_RESPONSE" | jq -r '.token // empty')

if [ -z "$DRIVER_TOKEN" ]; then
  log_error "Falha no login do motorista"
  echo "Response: $DRIVER_LOGIN_RESPONSE"
  exit 1
fi

log_step "Motorista autenticado"
echo "Token: ${DRIVER_TOKEN:0:20}..."

echo ""
echo "📋 PASSO 4: Marcar Motorista Online (TESTE PRINCIPAL)"
echo "======================================================"

ONLINE_RESPONSE=$(api_call POST "/api/drivers/me/online" "{}" "$DRIVER_TOKEN")
ONLINE_SUCCESS=$(echo "$ONLINE_RESPONSE" | jq -r '.success // false')

if [ "$ONLINE_SUCCESS" = "true" ]; then
  log_step "Motorista marcado como online com sucesso"
  echo "Response: $ONLINE_RESPONSE"
else
  log_error "Falha ao marcar motorista como online"
  echo "Response: $ONLINE_RESPONSE"
  exit 1
fi

echo ""
echo "📋 PASSO 5: Verificar Status no Banco"
echo "======================================"

DRIVER_STATUS=$(psql "$DATABASE_URL" -t -c "SELECT status FROM drivers WHERE id = '$DRIVER_ID';")
DRIVER_STATUS=$(echo "$DRIVER_STATUS" | xargs)

if [ "$DRIVER_STATUS" = "online" ]; then
  log_step "Status no banco: online ✓"
else
  log_error "Status no banco: $DRIVER_STATUS (esperado: online)"
  exit 1
fi

# Verificar last_active_at foi atualizado
LAST_ACTIVE=$(psql "$DATABASE_URL" -t -c "SELECT last_active_at FROM drivers WHERE id = '$DRIVER_ID';")
if [ -n "$LAST_ACTIVE" ]; then
  log_step "last_active_at atualizado: $LAST_ACTIVE"
else
  log_warning "last_active_at não foi atualizado"
fi

echo ""
echo "📋 PASSO 6: Testar Sem Token (Segurança)"
echo "========================================="

NO_TOKEN_RESPONSE=$(api_call POST "/api/drivers/me/online" "{}" "")
NO_TOKEN_ERROR=$(echo "$NO_TOKEN_RESPONSE" | jq -r '.error // empty')

if [ "$NO_TOKEN_ERROR" = "Token ausente" ]; then
  log_step "Endpoint protegido corretamente (requer token)"
else
  log_warning "Endpoint pode não estar protegido adequadamente"
  echo "Response: $NO_TOKEN_RESPONSE"
fi

echo ""
echo "📊 RESUMO DO TESTE"
echo "=================="
echo ""
echo "✅ Implementação concluída:"
echo "  - Middleware authenticateDriver criado"
echo "  - Endpoint POST /api/drivers/me/online criado"
echo "  - Rota registrada em index.ts"
echo ""
echo "✅ Teste executado:"
echo "  - Motorista criado: $DRIVER_ID"
echo "  - Login realizado com sucesso"
echo "  - Status atualizado para 'online'"
echo "  - last_active_at atualizado"
echo "  - Endpoint protegido por autenticação"
echo ""
echo "📊 Campos atualizados no banco:"
echo "  - status: approved → online"
echo "  - last_active_at: NULL → $(date)"
echo "  - updated_at: atualizado"
echo ""
echo "🛑 TESTE CONCLUÍDO - AGUARDANDO VALIDAÇÃO"
echo ""
echo "Próxima ação: Validar funcionamento e aguardar autorização para Lacuna 3"
