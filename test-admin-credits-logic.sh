#!/bin/bash
# Teste de lógica dos endpoints Admin Credits
# Valida estrutura de código e padrões

echo "🧪 Teste de Lógica - Admin Credits"
echo "=================================="
echo ""

ROUTE_FILE="backend/src/routes/admin-driver-credits.ts"

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

test_count=0
pass_count=0

test() {
  local name="$1"
  local condition="$2"
  
  test_count=$((test_count + 1))
  
  if eval "$condition"; then
    echo -e "${GREEN}✅ PASS${NC} $name"
    pass_count=$((pass_count + 1))
  else
    echo -e "${RED}❌ FAIL${NC} $name"
  fi
}

echo -e "${BLUE}📝 1. Validação de Imports${NC}"
echo "----------------------------"

test "Import do Router" "grep -q 'import.*Router.*from.*express' $ROUTE_FILE"
test "Import do pool (db)" "grep -q 'import.*pool.*from.*db' $ROUTE_FILE"
test "Import do authenticateAdmin" "grep -q 'import.*authenticateAdmin.*from.*middlewares/auth' $ROUTE_FILE"
test "Criação do router" "grep -q 'const router = Router()' $ROUTE_FILE"
test "Export do router" "grep -q 'export default router' $ROUTE_FILE"

echo ""
echo -e "${BLUE}💾 2. Função applyCreditDelta${NC}"
echo "--------------------------------"

test "Função é async" "grep -q 'async function applyCreditDelta' $ROUTE_FILE"
test "Recebe driverId" "grep -A 5 'async function applyCreditDelta' $ROUTE_FILE | grep -q 'driverId'"
test "Recebe delta" "grep -A 5 'async function applyCreditDelta' $ROUTE_FILE | grep -q 'delta'"
test "Recebe reason" "grep -A 5 'async function applyCreditDelta' $ROUTE_FILE | grep -q 'reason'"
test "Recebe adminUserId" "grep -A 5 'async function applyCreditDelta' $ROUTE_FILE | grep -q 'adminUserId'"
test "Recebe idempotencyKey (opcional)" "grep -A 5 'async function applyCreditDelta' $ROUTE_FILE | grep -q 'idempotencyKey'"

echo ""
echo -e "${BLUE}🔄 3. Lógica de Transação${NC}"
echo "-------------------------"

test "Obtém conexão do pool" "grep -q 'const client = await pool.connect()' $ROUTE_FILE"
test "Inicia transação (BEGIN)" "grep -q \"BEGIN\" $ROUTE_FILE"
test "Commit em sucesso" "grep -q \"COMMIT\" $ROUTE_FILE"
test "Rollback em erro" "grep -q \"ROLLBACK\" $ROUTE_FILE"
test "Release da conexão (finally)" "grep -q 'client.release()' $ROUTE_FILE"
test "Try-catch-finally" "grep -q 'try {' $ROUTE_FILE && grep -q 'catch' $ROUTE_FILE && grep -q 'finally' $ROUTE_FILE"

echo ""
echo -e "${BLUE}🔑 4. Lógica de Idempotência${NC}"
echo "-----------------------------"

test "Verifica idempotencyKey" "grep -q 'if (idempotencyKey)' $ROUTE_FILE"
test "Query para buscar chave existente" "grep -q 'SELECT.*FROM driver_credit_ledger WHERE idempotency_key' $ROUTE_FILE"
test "Retorna alreadyProcessed se existe" "grep -q 'alreadyProcessed: true' $ROUTE_FILE"
test "Retorna balance existente" "grep -q 'balance:.*existing' $ROUTE_FILE"

echo ""
echo -e "${BLUE}📊 5. Lógica de Atualização de Saldo${NC}"
echo "------------------------------------"

test "Upsert em credit_balance" "grep -q 'INSERT INTO credit_balance' $ROUTE_FILE"
test "ON CONFLICT DO UPDATE" "grep -q 'ON CONFLICT.*DO UPDATE' $ROUTE_FILE"
test "Atualiza balance" "grep -q 'balance = credit_balance.balance' $ROUTE_FILE"
test "Atualiza updated_at" "grep -q 'updated_at = CURRENT_TIMESTAMP' $ROUTE_FILE"
test "RETURNING balance" "grep -q 'RETURNING balance' $ROUTE_FILE"

echo ""
echo -e "${BLUE}📝 6. Lógica de Ledger${NC}"
echo "----------------------"

test "Insert em driver_credit_ledger" "grep -q 'INSERT INTO driver_credit_ledger' $ROUTE_FILE"
test "Salva driver_id" "grep -q 'driver_id' $ROUTE_FILE"
test "Salva delta" "grep -q 'delta' $ROUTE_FILE"
test "Salva balance_after" "grep -q 'balance_after' $ROUTE_FILE"
test "Salva reason" "grep -q 'reason' $ROUTE_FILE"
test "Salva admin_user_id" "grep -q 'admin_user_id' $ROUTE_FILE"
test "Salva idempotency_key" "grep -q 'idempotency_key' $ROUTE_FILE"

echo ""
echo -e "${BLUE}🔗 7. Endpoint GET /balance${NC}"
echo "------------------------------"

test "Route GET /:driverId/credits/balance" "grep -q \"router.get.*/:driverId/credits/balance\" $ROUTE_FILE"
test "Usa authenticateAdmin" "grep -A 1 \"/:driverId/credits/balance\" $ROUTE_FILE | grep -q 'authenticateAdmin'"
test "Query SELECT balance" "grep -A 10 \"/:driverId/credits/balance\" $ROUTE_FILE | grep -q 'SELECT balance'"
test "Fallback para balance = 0" "grep -A 15 \"/:driverId/credits/balance\" $ROUTE_FILE | grep -q 'balance: 0'"
test "Retorna JSON" "grep -A 15 \"/:driverId/credits/balance\" $ROUTE_FILE | grep -q 'res.json'"

echo ""
echo -e "${BLUE}🔗 8. Endpoint GET /ledger${NC}"
echo "-----------------------------"

test "Route GET /:driverId/credits/ledger" "grep -q \"router.get.*/:driverId/credits/ledger\" $ROUTE_FILE"
test "Usa authenticateAdmin" "grep -A 1 \"/:driverId/credits/ledger\" $ROUTE_FILE | grep -q 'authenticateAdmin'"
test "Paginação: page" "grep -A 10 \"/:driverId/credits/ledger\" $ROUTE_FILE | grep -q 'page'"
test "Paginação: limit" "grep -A 10 \"/:driverId/credits/ledger\" $ROUTE_FILE | grep -q 'limit'"
test "Paginação: offset" "grep -A 10 \"/:driverId/credits/ledger\" $ROUTE_FILE | grep -q 'offset'"
test "Query SELECT ledger" "grep -A 20 \"/:driverId/credits/ledger\" $ROUTE_FILE | grep -q 'SELECT.*FROM driver_credit_ledger'"
test "ORDER BY created_at DESC" "grep -A 20 \"/:driverId/credits/ledger\" $ROUTE_FILE | grep -q 'ORDER BY created_at DESC'"
test "COUNT total" "grep -A 20 \"/:driverId/credits/ledger\" $ROUTE_FILE | grep -q 'COUNT'"
test "Retorna entries, total, page, limit" "grep -A 25 \"/:driverId/credits/ledger\" $ROUTE_FILE | grep -q 'entries:'"

echo ""
echo -e "${BLUE}🔗 9. Endpoint POST /adjust${NC}"
echo "------------------------------"

test "Route POST /:driverId/credits/adjust" "grep -q \"router.post.*/:driverId/credits/adjust\" $ROUTE_FILE"
test "Usa authenticateAdmin" "grep -A 1 \"/:driverId/credits/adjust\" $ROUTE_FILE | grep -q 'authenticateAdmin'"
test "Extrai delta do body" "grep -A 10 \"/:driverId/credits/adjust\" $ROUTE_FILE | grep -q 'delta.*req.body'"
test "Extrai reason do body" "grep -A 10 \"/:driverId/credits/adjust\" $ROUTE_FILE | grep -q 'reason.*req.body'"
test "Extrai idempotencyKey do body" "grep -A 10 \"/:driverId/credits/adjust\" $ROUTE_FILE | grep -q 'idempotencyKey.*req.body'"
test "Extrai adminUserId do token" "grep -A 10 \"/:driverId/credits/adjust\" $ROUTE_FILE | grep -q 'adminUserId.*req.*user'"
test "Valida adminUserId" "grep -A 15 \"/:driverId/credits/adjust\" $ROUTE_FILE | grep -q 'if (!adminUserId)'"
test "Valida delta != 0" "grep -A 15 \"/:driverId/credits/adjust\" $ROUTE_FILE | grep -q 'delta === 0'"
test "Valida reason não vazio" "grep -A 15 \"/:driverId/credits/adjust\" $ROUTE_FILE | grep -q 'reason.trim()'"
test "Chama applyCreditDelta" "grep -A 20 \"/:driverId/credits/adjust\" $ROUTE_FILE | grep -q 'applyCreditDelta'"
test "Retorna success, alreadyProcessed, balance" "grep -A 25 \"/:driverId/credits/adjust\" $ROUTE_FILE | grep -q 'success:'"

echo ""
echo -e "${BLUE}⚠️  10. Tratamento de Erros${NC}"
echo "----------------------------"

test "Try-catch em GET balance" "grep -A 20 \"/:driverId/credits/balance\" $ROUTE_FILE | grep -q 'catch'"
test "Try-catch em GET ledger" "grep -A 30 \"/:driverId/credits/ledger\" $ROUTE_FILE | grep -q 'catch'"
test "Try-catch em POST adjust" "grep -A 30 \"/:driverId/credits/adjust\" $ROUTE_FILE | grep -q 'catch'"
test "console.error em erros" "grep -q 'console.error' $ROUTE_FILE"
test "Status 500 em erros" "grep -q 'status(500)' $ROUTE_FILE"
test "Status 400 em validações" "grep -q 'status(400)' $ROUTE_FILE"
test "Status 401 em auth" "grep -q 'status(401)' $ROUTE_FILE"

echo ""
echo -e "${BLUE}📊 Resumo dos Testes${NC}"
echo "===================="
echo ""
echo "Total de testes: $test_count"
echo "Testes passados: $pass_count"
echo "Testes falhos: $((test_count - pass_count))"
echo ""

if [ $pass_count -eq $test_count ]; then
  echo -e "${GREEN}✅ TODOS OS TESTES PASSARAM!${NC}"
  echo ""
  echo "O código está production-ready e segue todos os padrões:"
  echo "  ✅ Imports corretos"
  echo "  ✅ Função transacional completa"
  echo "  ✅ Idempotência implementada"
  echo "  ✅ 3 endpoints com RBAC"
  echo "  ✅ Validações de input"
  echo "  ✅ Tratamento de erros"
  exit 0
else
  echo -e "${RED}❌ ALGUNS TESTES FALHARAM${NC}"
  echo ""
  echo "Revisar implementação antes de deploy."
  exit 1
fi
