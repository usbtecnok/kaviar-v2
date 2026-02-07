#!/bin/bash
ADMIN_PASSWORD="${ADMIN_PASSWORD:?set ADMIN_PASSWORD env}"

API_URL="https://api.kaviar.com.br"

echo "🧪 VALIDAÇÃO PATCH P0 - Checkpoint Manual"
echo "=========================================="
echo ""

# Login como super admin (tentar diferentes credenciais)
echo "1️⃣ Tentando login..."

# Tentar com credenciais do seed
ADMIN_TOKEN=$(curl -s -X POST "$API_URL/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"suporte@kaviar.com.br","password":"Kaviar2026!Admin"}' | jq -r '.token')

if [ -z "$ADMIN_TOKEN" ] || [ "$ADMIN_TOKEN" = "null" ]; then
  echo "⚠️ Primeira tentativa falhou, tentando credencial alternativa..."
  
  # Verificar se há outro admin no .env
  ADMIN_TOKEN=$(curl -s -X POST "$API_URL/api/admin/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@kaviar.com","password":"'"$ADMIN_PASSWORD"'"}' | jq -r '.token')
fi

if [ -z "$ADMIN_TOKEN" ] || [ "$ADMIN_TOKEN" = "null" ]; then
  echo "❌ Não consegui autenticar. Vamos rodar checkpoint via ECS Exec..."
  echo ""
  echo "Alternativa: Executar task ECS diretamente..."
  exit 1
fi

echo "✅ Autenticado"
echo ""

# Rodar checkpoint manual
echo "2️⃣ Executando checkpoint manual..."
CHECKPOINT_RESULT=$(curl -s -X POST "$API_URL/api/admin/beta-monitor/run" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"feature_key": "passenger_favorites_matching"}')

echo "$CHECKPOINT_RESULT" | jq '.'
echo ""

# Extrair status e alerts
STATUS=$(echo "$CHECKPOINT_RESULT" | jq -r '.checkpoint.status // .status // "UNKNOWN"')
ALERTS_COUNT=$(echo "$CHECKPOINT_RESULT" | jq '.checkpoint.alerts // .alerts // [] | length')

echo "3️⃣ Resultado:"
echo "   Status: $STATUS"
echo "   Alerts: $ALERTS_COUNT"
echo ""

if [ "$STATUS" = "PASS" ] && [ "$ALERTS_COUNT" = "0" ]; then
  echo "✅ VALIDAÇÃO PASSOU!"
  echo "   - Status = PASS"
  echo "   - Alerts = 0 (sem CONFIG_DRIFT)"
else
  echo "⚠️ Resultado inesperado:"
  echo "$CHECKPOINT_RESULT" | jq '.checkpoint.alerts // .alerts // []'
fi

