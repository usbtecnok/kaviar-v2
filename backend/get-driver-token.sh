#!/bin/bash
# ============================================
# KAVIAR — Obter DRIVER_TOKEN para testes
# ============================================

set -euo pipefail

API="${API:-https://api.kaviar.com.br}"

echo "=== OPÇÕES PARA OBTER DRIVER_TOKEN ==="
echo ""
echo "1) Login com email/password (endpoint real)"
echo "2) Definir senha para driver de teste"
echo "3) Buscar driver de teste no DB"
echo ""

# ============================================
# OPÇÃO 1: Login com credenciais
# ============================================
login_driver() {
  local EMAIL="$1"
  local PASSWORD="$2"
  
  echo "Fazendo login: $EMAIL"
  
  RESPONSE=$(curl -sS -X POST "$API/api/auth/driver/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
  
  TOKEN=$(echo "$RESPONSE" | jq -r '.token // empty')
  
  if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo "❌ Erro no login:"
    echo "$RESPONSE" | jq -C
    return 1
  fi
  
  echo "✅ Token obtido:"
  echo "$TOKEN"
  echo ""
  echo "export DRIVER_TOKEN='$TOKEN'"
  echo ""
  echo "User info:"
  echo "$RESPONSE" | jq -C '.user'
}

# ============================================
# OPÇÃO 2: Definir senha para driver
# ============================================
set_driver_password() {
  local EMAIL="$1"
  local PASSWORD="$2"
  
  echo "Definindo senha para: $EMAIL"
  
  curl -sS -X POST "$API/api/auth/driver/set-password" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" | jq -C
  
  echo ""
  echo "Agora faça login com:"
  echo "  ./get-driver-token.sh login $EMAIL $PASSWORD"
}

# ============================================
# OPÇÃO 3: Buscar drivers de teste no DB
# ============================================
list_test_drivers() {
  local DB="${DB:-postgresql://usbtecnok:z4939ia4@kaviar-prod-db.cxuuaq46o1o5.us-east-2.rds.amazonaws.com:5432/kaviar_validation?sslmode=require}"
  
  echo "Buscando drivers de teste no DB..."
  
  psql "$DB" -c "
    SELECT id, name, email, phone, status, 
           CASE WHEN password_hash IS NOT NULL THEN 'SIM' ELSE 'NÃO' END as tem_senha
    FROM drivers 
    WHERE email LIKE '%test%' OR name LIKE '%test%'
    ORDER BY created_at DESC 
    LIMIT 10;
  "
}

# ============================================
# MAIN
# ============================================

case "${1:-help}" in
  login)
    if [ $# -lt 3 ]; then
      echo "Uso: $0 login EMAIL PASSWORD"
      exit 1
    fi
    login_driver "$2" "$3"
    ;;
  
  set-password)
    if [ $# -lt 3 ]; then
      echo "Uso: $0 set-password EMAIL PASSWORD"
      exit 1
    fi
    set_driver_password "$2" "$3"
    ;;
  
  list)
    list_test_drivers
    ;;
  
  *)
    echo "Uso:"
    echo "  $0 login EMAIL PASSWORD          # Fazer login e obter token"
    echo "  $0 set-password EMAIL PASSWORD   # Definir senha para driver"
    echo "  $0 list                          # Listar drivers de teste no DB"
    echo ""
    echo "Exemplos:"
    echo "  # 1. Listar drivers disponíveis"
    echo "  $0 list"
    echo ""
    echo "  # 2. Definir senha (se necessário)"
    echo "  $0 set-password test-driver-1@kaviar.com senha123"
    echo ""
    echo "  # 3. Fazer login"
    echo "  $0 login test-driver-1@kaviar.com senha123"
    echo ""
    echo "  # 4. Exportar token"
    echo "  export DRIVER_TOKEN='eyJ...'"
    echo ""
    echo "  # 5. Testar aceite de oferta"
    echo "  ./test-offer-accept.sh"
    ;;
esac
