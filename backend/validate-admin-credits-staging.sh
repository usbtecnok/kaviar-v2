#!/bin/bash
# Script de validação do Admin Driver Credits em Staging
# Branch: feat/admin-driver-credits
# Hash: 81c006c09e9f0a3167415283468d1c1e5bc8b0fb

set -e

STAGING_API="https://staging-api.kaviar.com"
DRIVER_ID="${1:-123}"
ADMIN_TOKEN="${ADMIN_TOKEN:-}"

if [ -z "$ADMIN_TOKEN" ]; then
  echo "❌ Erro: ADMIN_TOKEN não definido"
  echo "Use: export ADMIN_TOKEN='seu_token_aqui'"
  exit 1
fi

echo "🧪 Validação Admin Driver Credits - Staging"
echo "============================================"
echo "Driver ID: $DRIVER_ID"
echo ""

# 1. GET Balance
echo "1️⃣  GET Balance inicial"
curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$STAGING_API/api/admin/drivers/$DRIVER_ID/credits/balance" | jq .
echo ""

# 2. POST Adjust (Adicionar)
echo "2️⃣  POST Adjust +50.00 (Bônus)"
IDEMPOTENCY_KEY="staging-test-$(date +%s)-$RANDOM"
curl -s -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"delta\": 50.00,
    \"reason\": \"Bônus de boas-vindas - teste staging\",
    \"idempotencyKey\": \"$IDEMPOTENCY_KEY\"
  }" \
  "$STAGING_API/api/admin/drivers/$DRIVER_ID/credits/adjust" | jq .
echo ""

# 3. Teste de Idempotência
echo "3️⃣  POST Adjust (mesma chave - deve retornar alreadyProcessed=true)"
curl -s -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"delta\": 50.00,
    \"reason\": \"Bônus de boas-vindas - teste staging\",
    \"idempotencyKey\": \"$IDEMPOTENCY_KEY\"
  }" \
  "$STAGING_API/api/admin/drivers/$DRIVER_ID/credits/adjust" | jq .
echo ""

# 4. GET Ledger
echo "4️⃣  GET Ledger (histórico)"
curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$STAGING_API/api/admin/drivers/$DRIVER_ID/credits/ledger?page=1&limit=10" | jq .
echo ""

# 5. POST Adjust (Remover)
echo "5️⃣  POST Adjust -10.00 (Ajuste)"
IDEMPOTENCY_KEY_2="staging-test-$(date +%s)-$RANDOM"
curl -s -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"delta\": -10.00,
    \"reason\": \"Ajuste de correção - teste staging\",
    \"idempotencyKey\": \"$IDEMPOTENCY_KEY_2\"
  }" \
  "$STAGING_API/api/admin/drivers/$DRIVER_ID/credits/adjust" | jq .
echo ""

# 6. GET Balance Final
echo "6️⃣  GET Balance final"
curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$STAGING_API/api/admin/drivers/$DRIVER_ID/credits/balance" | jq .
echo ""

# 7. Teste de Concorrência
echo "7️⃣  Teste de Concorrência (5 requisições paralelas)"
for i in {1..5}; do
  (
    IDEMPOTENCY_KEY_CONCURRENT="staging-concurrent-$(date +%s)-$RANDOM-$i"
    curl -s -X POST \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{
        \"delta\": 5.00,
        \"reason\": \"Teste concorrência $i\",
        \"idempotencyKey\": \"$IDEMPOTENCY_KEY_CONCURRENT\"
      }" \
      "$STAGING_API/api/admin/drivers/$DRIVER_ID/credits/adjust" | jq -c .
  ) &
done
wait
echo ""

# 8. GET Balance Após Concorrência
echo "8️⃣  GET Balance após concorrência"
curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$STAGING_API/api/admin/drivers/$DRIVER_ID/credits/balance" | jq .
echo ""

# 9. GET Ledger Final
echo "9️⃣  GET Ledger final (deve ter 7 entradas: 1 inicial + 1 remoção + 5 concorrentes)"
curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$STAGING_API/api/admin/drivers/$DRIVER_ID/credits/ledger?page=1&limit=20" | jq .
echo ""

echo "✅ Validação completa!"
echo ""
echo "📊 Resumo esperado:"
echo "  - Balance inicial: 0.00"
echo "  - Após +50.00: 50.00"
echo "  - Após -10.00: 40.00"
echo "  - Após 5x +5.00: 65.00"
echo "  - Total de entradas no ledger: 7"
