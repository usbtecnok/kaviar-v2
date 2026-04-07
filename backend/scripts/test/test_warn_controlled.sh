#!/bin/bash

API_URL="https://api.kaviar.com.br"

echo "🧪 TESTE CONTROLADO DE WARN/FAIL"
echo "=================================="
echo ""

# Login como super admin
echo "1️⃣ Login como super admin..."
ADMIN_TOKEN=$(curl -s -X POST "$API_URL/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"suporte@usbtecnok.com.br","password":"Kaviar2026!Admin"}' | jq -r '.token')

if [ -z "$ADMIN_TOKEN" ] || [ "$ADMIN_TOKEN" = "null" ]; then
  echo "❌ Falha no login"
  exit 1
fi

echo "✅ Autenticado"
echo ""

# Salvar estado atual
echo "2️⃣ Salvando estado atual..."
CURRENT_STATE=$(curl -s -X GET "$API_URL/api/admin/feature-flags/passenger_favorites_matching" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

echo "$CURRENT_STATE" | jq '{enabled, rollout_percentage}'
echo ""

# Alterar para 50% (vai gerar WARN de drift)
echo "3️⃣ Alterando rollout para 50% (forçar WARN)..."
curl -s -X PUT "$API_URL/api/admin/feature-flags/passenger_favorites_matching" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rollout_percentage": 50}' | jq '.'

echo ""
echo "4️⃣ Aguardando 10s..."
sleep 10

# Rodar checkpoint manual
echo "5️⃣ Rodando checkpoint manual..."
CHECKPOINT_RESULT=$(curl -s -X POST "$API_URL/api/admin/beta-monitor/run" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"feature_key": "passenger_favorites_matching"}')

echo "$CHECKPOINT_RESULT" | jq '.'
echo ""

# Verificar logs
echo "6️⃣ Aguardando logs (5s)..."
sleep 5

echo "7️⃣ Verificando logs de alerta..."
aws logs tail /ecs/kaviar-backend --region us-east-1 --since 1m --format short 2>&1 | grep -E "ALERT|WARN|drift" | tail -10

echo ""
echo "8️⃣ Restaurando estado original (rollout=0)..."
curl -s -X PUT "$API_URL/api/admin/feature-flags/passenger_favorites_matching" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rollout_percentage": 0}' | jq '{success, rollout_percentage: .feature_flag.rollout_percentage}'

echo ""
echo "✅ Teste concluído!"
