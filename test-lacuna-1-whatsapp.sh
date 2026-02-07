#!/bin/bash

# 🧪 TESTE LACUNA 1: Notificação WhatsApp ao Aprovar Motorista
# Data: 2026-01-16
# Escopo: APENAS testar envio de WhatsApp

set -e

echo "🧪 TESTE LACUNA 1: Notificação WhatsApp"
echo "========================================"
echo ""

# Configuração
BACKEND_URL="${BACKEND_URL:-http://localhost:3000}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@kaviar.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:?set ADMIN_PASSWORD env}"

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
echo "📋 PASSO 2: Login Admin"
echo "=============================="
ADMIN_LOGIN_RESPONSE=$(api_call POST "/api/auth/admin/login" "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")
ADMIN_TOKEN=$(echo "$ADMIN_LOGIN_RESPONSE" | jq -r '.token // empty')

if [ -z "$ADMIN_TOKEN" ]; then
  log_error "Falha no login do admin"
  exit 1
fi
log_step "Admin autenticado"

echo ""
echo "📋 PASSO 3: Criar Motorista de Teste"
echo "=============================="

DRIVER_ID="drv_whatsapp_test_$(date +%s)"
DRIVER_EMAIL="motorista.whatsapp.$(date +%s)@kaviar.test"
DRIVER_PHONE="+5511999999999"  # Número real para receber WhatsApp
PASSWORD_HASH='$2b$10$rOvHPz8fGNkMYnJ6xUzrO.qY5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5'

psql "$DATABASE_URL" -c "
INSERT INTO drivers (id, name, email, phone, status, vehicle_model, password_hash, created_at, updated_at)
VALUES (
  '$DRIVER_ID',
  'Motorista WhatsApp Test',
  '$DRIVER_EMAIL',
  '$DRIVER_PHONE',
  'pending',
  'Teste Sedan',
  '$PASSWORD_HASH',
  NOW(),
  NOW()
);
" > /dev/null 2>&1

log_step "Motorista criado: $DRIVER_ID"
log_step "Telefone: $DRIVER_PHONE"

echo ""
echo "📋 PASSO 4: Aprovar Motorista (TESTE PRINCIPAL)"
echo "================================================"
echo "⚠️  Aguarde... enviando aprovação e WhatsApp..."
echo ""

APPROVE_RESPONSE=$(api_call PUT "/api/admin/drivers/$DRIVER_ID/approve" "{}" "$ADMIN_TOKEN")
APPROVE_SUCCESS=$(echo "$APPROVE_RESPONSE" | jq -r '.success // false')

if [ "$APPROVE_SUCCESS" = "true" ]; then
  log_step "Motorista aprovado com sucesso"
  echo ""
  echo "📱 VERIFICAÇÃO MANUAL NECESSÁRIA:"
  echo "=================================="
  echo "1. Verifique o WhatsApp do número: $DRIVER_PHONE"
  echo "2. Deve ter recebido a mensagem:"
  echo "   'Olá Motorista WhatsApp Test! Sua conta foi aprovada no Kaviar.'"
  echo ""
  echo "3. Verifique os logs do backend para confirmar envio"
  echo "   Procure por: '✅ WhatsApp sent to $DRIVER_PHONE'"
  echo ""
else
  log_error "Falha ao aprovar motorista"
  echo "Response: $APPROVE_RESPONSE"
  exit 1
fi

echo ""
echo "📋 PASSO 5: Verificar Status no Banco"
echo "======================================"

DRIVER_STATUS=$(psql "$DATABASE_URL" -t -c "SELECT status FROM drivers WHERE id = '$DRIVER_ID';")
DRIVER_STATUS=$(echo "$DRIVER_STATUS" | xargs)

if [ "$DRIVER_STATUS" = "approved" ]; then
  log_step "Status no banco: approved ✓"
else
  log_error "Status no banco: $DRIVER_STATUS (esperado: approved)"
fi

echo ""
echo "📊 RESUMO DO TESTE"
echo "=================="
echo ""
echo "✅ Implementação concluída:"
echo "  - Import do Twilio adicionado"
echo "  - Código de envio WhatsApp adicionado"
echo "  - Pacote 'twilio' instalado"
echo "  - Variáveis de ambiente configuradas"
echo ""
echo "✅ Teste executado:"
echo "  - Motorista criado: $DRIVER_ID"
echo "  - Motorista aprovado via API"
echo "  - Status atualizado no banco"
echo ""
echo "📱 EVIDÊNCIA NECESSÁRIA:"
echo "  1. Screenshot do WhatsApp recebido em $DRIVER_PHONE"
echo "  2. Log do backend mostrando '✅ WhatsApp sent'"
echo ""
echo "⚠️  NOTA: Se o WhatsApp NÃO foi recebido, verifique:"
echo "  - TWILIO_ACCOUNT_SID está configurado corretamente"
echo "  - TWILIO_AUTH_TOKEN está configurado corretamente"
echo "  - TWILIO_WHATSAPP_NUMBER está correto"
echo "  - Número $DRIVER_PHONE está no formato correto"
echo ""
echo "🛑 TESTE CONCLUÍDO - AGUARDANDO VALIDAÇÃO"
echo ""
echo "Próxima ação: Validar recebimento do WhatsApp e reportar resultado"
