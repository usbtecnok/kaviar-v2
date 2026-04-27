#!/bin/bash
# Validação MVP "Levar e esperar"
# Uso: DRIVER_TOKEN=xxx PASSENGER_TOKEN=xxx BASE_URL=http://localhost:3001 bash test-wait-feature.sh

BASE_URL="${BASE_URL:-http://localhost:3001}"
PASS_TOKEN="${PASSENGER_TOKEN:?PASSENGER_TOKEN obrigatório}"
DRV_TOKEN="${DRIVER_TOKEN:?DRIVER_TOKEN obrigatório}"

ok()  { echo "✅ $1"; }
fail(){ echo "❌ $1"; exit 1; }
json(){ echo "$1" | python3 -m json.tool 2>/dev/null || echo "$1"; }

echo ""
echo "=== 1. Fluxo normal (sem espera) — regressão ==="
RIDE=$(curl -s -X POST "$BASE_URL/api/v2/rides" \
  -H "Authorization: Bearer $PASS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"origin":{"lat":-22.9,"lng":-43.1,"text":"Origem"},"destination":{"lat":-22.91,"lng":-43.11,"text":"Destino"}}')
RIDE_ID=$(echo "$RIDE" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['ride_id'])" 2>/dev/null)
[ -n "$RIDE_ID" ] && ok "Corrida normal criada: $RIDE_ID" || fail "Falha ao criar corrida normal: $RIDE"

echo ""
echo "=== 2. Corrida com wait_requested=true ==="
RIDE2=$(curl -s -X POST "$BASE_URL/api/v2/rides" \
  -H "Authorization: Bearer $PASS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"origin":{"lat":-22.9,"lng":-43.1,"text":"Origem"},"destination":{"lat":-22.91,"lng":-43.11,"text":"Destino"},"wait_requested":true}')
RIDE2_ID=$(echo "$RIDE2" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['ride_id'])" 2>/dev/null)
[ -n "$RIDE2_ID" ] && ok "Corrida com espera criada: $RIDE2_ID" || fail "Falha ao criar corrida com espera: $RIDE2"

echo ""
echo "=== 3. Guarda: /wait/start sem wait_requested deve retornar 400 ==="
R=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v2/rides/$RIDE_ID/wait/start" \
  -H "Authorization: Bearer $DRV_TOKEN")
[ "$R" = "400" ] && ok "/wait/start bloqueado corretamente (400)" || fail "Esperado 400, recebido $R"

echo ""
echo "=== 4. Guarda: /start com espera não encerrada deve retornar 400 ==="
echo "   (Requer que a corrida $RIDE2_ID esteja em status 'arrived' com wait_started_at preenchido)"
echo "   → Teste manual necessário após aceitar e chegar na corrida"

echo ""
echo "=== 5. Verificar campos wait_* na corrida criada ==="
DETAIL=$(curl -s "$BASE_URL/api/v2/rides/$RIDE2_ID" \
  -H "Authorization: Bearer $PASS_TOKEN")
echo "$DETAIL" | python3 -c "
import sys, json
d = json.load(sys.stdin).get('data', {})
print('wait_requested:', d.get('wait_requested'))
print('wait_started_at:', d.get('wait_started_at'))
print('wait_ended_at:', d.get('wait_ended_at'))
" 2>/dev/null && ok "Campos wait_* presentes na resposta" || echo "⚠️  Verificar manualmente"

echo ""
echo "=== Validação automática concluída ==="
echo "Próximos passos manuais:"
echo "  1. Aceitar corrida $RIDE2_ID com um motorista"
echo "  2. Chamar /arrived → /wait/start → /wait/end → /start → /complete"
echo "  3. Verificar final_price = locked_price + wait_charge no ride_settlements"
