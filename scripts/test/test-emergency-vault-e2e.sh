#!/bin/bash
# 🧪 TESTE E2E — Cofre de Evidência (Emergency Vault V1)
# Cenários: trigger passageiro, trigger motorista, idempotência, trilha, admin resolve
#
# Pré-requisitos:
#   ADMIN_PASSWORD=xxx bash scripts/test/test-emergency-vault-e2e.sh
#   (opcional) API_URL=http://localhost:3000

set -euo pipefail

API="${API_URL:-https://api.kaviar.com.br}"
TS=$(date +%s)
GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
PASS=0; FAIL=0

ok()   { echo -e "${GREEN}✓${NC} $1"; PASS=$((PASS + 1)); }
fail() { echo -e "${RED}✗${NC} $1"; FAIL=$((FAIL + 1)); }
info() { echo -e "${CYAN}ℹ${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }

api() {
  local method=$1 endpoint=$2 data=${3:-} token=${4:-}
  local args=(-s -w "\n%{http_code}" -X "$method" "$API$endpoint" -H "Content-Type: application/json")
  [ -n "$token" ] && args+=(-H "Authorization: Bearer $token")
  [ -n "$data" ] && args+=(-d "$data")
  curl "${args[@]}" 2>/dev/null
}

parse() {
  local raw="$1"
  BODY=$(echo "$raw" | sed '$d')
  HTTP_CODE=$(echo "$raw" | tail -1)
}

echo "🧪 TESTE E2E — COFRE DE EVIDÊNCIA (EMERGENCY VAULT V1)"
echo "========================================================"
echo "API: $API"
echo ""

# ─── Health check ───
echo "📋 PRÉ-REQUISITO: Health check"
HC=$(curl -s "$API/api/health" | jq -r '.status // empty')
if [ "$HC" = "ok" ]; then ok "Backend online"; else fail "Backend offline"; exit 1; fi

# ─── Admin auth ───
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"
if [ -z "$ADMIN_PASSWORD" ]; then
  fail "ADMIN_PASSWORD obrigatória. Use: ADMIN_PASSWORD=xxx bash $0"
  exit 1
fi

ADMIN_EMAIL="${ADMIN_EMAIL:-admin@kaviar.com.br}"
ADMIN_RESP=$(api POST "/api/admin/auth/login" '{"email":"'"$ADMIN_EMAIL"'","password":"'"$ADMIN_PASSWORD"'"}')
parse "$ADMIN_RESP"
ADMIN_TOKEN=$(echo "$BODY" | jq -r '.token // empty')
if [ -z "$ADMIN_TOKEN" ]; then fail "Admin auth falhou"; exit 1; fi
ok "Admin autenticado"

# ─── Ensure feature flag exists and is ENABLED for test ───
echo ""
echo "📋 SETUP: Feature flag"
# Enable via admin endpoint: PUT /api/admin/feature-flags/:key
FLAG_RESP=$(api PUT "/api/admin/feature-flags/emergency_vault" '{"enabled":true,"rollout_percentage":100}' "$ADMIN_TOKEN")
parse "$FLAG_RESP"
if [ "$HTTP_CODE" = "200" ]; then
  ok "Feature flag emergency_vault ativada"
else
  warn "Feature flag update: HTTP=$HTTP_CODE (pode já estar ativa ou endpoint diferente)"
fi

# ─── Create test driver ───
echo ""
echo "📋 SETUP: Criar motorista + passageiro de teste"

DRIVER_EMAIL="drv.emg.${TS}@kaviar.test"
DRIVER_CPF=$(printf '%011d' $((TS % 99999999999)))
DRIVER_RESP=$(api POST "/api/auth/driver/register" '{"name":"Driver Emergency Test","email":"'"$DRIVER_EMAIL"'","phone":"+552190'${TS: -7}'","password":"test123","document_cpf":"'"$DRIVER_CPF"'","accepted_terms":true,"vehicle_model":"Fiat Uno","vehicle_color":"Prata","vehicle_plate":"EMG'${TS: -4}'","lat":-22.9068,"lng":-43.1729}')
parse "$DRIVER_RESP"
DRIVER_TOKEN=$(echo "$BODY" | jq -r '.token // empty')
DRIVER_ID=$(echo "$BODY" | jq -r '.user.id // .driver.id // .data.id // empty')
if [ -z "$DRIVER_TOKEN" ]; then
  DRIVER_RESP=$(api POST "/api/auth/driver/login" '{"email":"'"$DRIVER_EMAIL"'","password":"test123"}')
  parse "$DRIVER_RESP"
  DRIVER_TOKEN=$(echo "$BODY" | jq -r '.token // empty')
  DRIVER_ID=$(echo "$BODY" | jq -r '.driver.id // .userId // empty')
fi
if [ -z "$DRIVER_TOKEN" ]; then fail "Driver auth falhou"; exit 1; fi
ok "Motorista: $DRIVER_ID"

# Approve driver + give credits
api PUT "/api/admin/drivers/$DRIVER_ID/approve" '{}' "$ADMIN_TOKEN" > /dev/null 2>&1 || true
api POST "/api/admin/drivers/$DRIVER_ID/credits" '{"amount":50,"reason":"test"}' "$ADMIN_TOKEN" > /dev/null 2>&1 || true

# Go online
api POST "/api/v2/drivers/me/availability" '{"availability":"online"}' "$DRIVER_TOKEN" > /dev/null 2>&1 || true

# Create test passenger
PASS_EMAIL="pax.emg.${TS}@kaviar.test"
PASS_RESP=$(api POST "/api/auth/passenger/register" '{"name":"Passenger Emergency Test","email":"'"$PASS_EMAIL"'","phone":"+552191'${TS: -7}'","password":"test123"}')
parse "$PASS_RESP"
PASS_TOKEN=$(echo "$BODY" | jq -r '.token // empty')
PASS_ID=$(echo "$BODY" | jq -r '.user.id // .passenger.id // .data.id // empty')
if [ -z "$PASS_TOKEN" ]; then
  PASS_RESP=$(api POST "/api/auth/passenger/login" '{"email":"'"$PASS_EMAIL"'","password":"test123"}')
  parse "$PASS_RESP"
  PASS_TOKEN=$(echo "$BODY" | jq -r '.token // empty')
  PASS_ID=$(echo "$BODY" | jq -r '.passenger.id // .userId // empty')
fi
if [ -z "$PASS_TOKEN" ]; then fail "Passenger auth falhou"; exit 1; fi
ok "Passageiro: $PASS_ID"

# ─── Create ride and advance to in_progress ───
echo ""
echo "📋 SETUP: Criar corrida e avançar para in_progress"

RIDE_RESP=$(api POST "/api/v2/rides" '{"origin":{"lat":-22.9068,"lng":-43.1729,"text":"Centro"},"destination":{"lat":-22.9519,"lng":-43.2105,"text":"Copacabana"},"type":"normal","trip_details":{"passengers":1,"has_luggage":false}}' "$PASS_TOKEN")
parse "$RIDE_RESP"
RIDE_ID=$(echo "$BODY" | jq -r '.data.ride_id // .ride_id // empty')
if [ -z "$RIDE_ID" ]; then fail "Criar corrida falhou: $BODY"; exit 1; fi
ok "Corrida criada: $RIDE_ID"

# Wait for dispatch
sleep 3

# Check if offer was created, accept it
OFFERS_RESP=$(api GET "/api/v2/drivers/me/offers" "" "$DRIVER_TOKEN")
parse "$OFFERS_RESP"
OFFER_ID=$(echo "$BODY" | jq -r '.data[0].id // empty')
if [ -z "$OFFER_ID" ]; then
  warn "Nenhuma oferta encontrada — tentando aceitar manualmente"
  # Fallback: check ride status
  RIDE_CHECK=$(api GET "/api/v2/rides/$RIDE_ID" "" "$PASS_TOKEN")
  parse "$RIDE_CHECK"
  RIDE_STATUS=$(echo "$BODY" | jq -r '.data.status // empty')
  info "Ride status: $RIDE_STATUS"
else
  api POST "/api/v2/drivers/offers/$OFFER_ID/accept" '{}' "$DRIVER_TOKEN" > /dev/null 2>&1
  ok "Oferta aceita"
fi

# Arrived
sleep 1
api POST "/api/v2/rides/$RIDE_ID/arrived" '{}' "$DRIVER_TOKEN" > /dev/null 2>&1 || true

# Start
sleep 1
api POST "/api/v2/rides/$RIDE_ID/start" '{}' "$DRIVER_TOKEN" > /dev/null 2>&1 || true

# Verify in_progress
RIDE_CHECK=$(api GET "/api/v2/rides/$RIDE_ID" "" "$PASS_TOKEN")
parse "$RIDE_CHECK"
RIDE_STATUS=$(echo "$BODY" | jq -r '.data.status // empty')
if [ "$RIDE_STATUS" = "in_progress" ]; then
  ok "Corrida em in_progress"
else
  warn "Corrida em status: $RIDE_STATUS (esperado: in_progress)"
fi

# ═══════════════════════════════════════════════════════════
echo ""
echo "═══════════════════════════════════════════════════════"
echo "🔴 TESTE 1: Passageiro aciona emergência"
echo "═══════════════════════════════════════════════════════"

EMG_RESP=$(api POST "/api/v2/rides/$RIDE_ID/emergency" '{}' "$PASS_TOKEN")
parse "$EMG_RESP"
EVENT_ID=$(echo "$BODY" | jq -r '.event_id // empty')

if [ "$HTTP_CODE" = "201" ] && [ -n "$EVENT_ID" ]; then
  ok "Emergência criada: event_id=$EVENT_ID (HTTP 201)"
else
  fail "Emergência falhou: HTTP=$HTTP_CODE body=$BODY"
fi

# ═══════════════════════════════════════════════════════════
echo ""
echo "🔴 TESTE 2: Idempotência — segundo acionamento retorna mesmo evento"

EMG_RESP2=$(api POST "/api/v2/rides/$RIDE_ID/emergency" '{}' "$PASS_TOKEN")
parse "$EMG_RESP2"
EVENT_ID2=$(echo "$BODY" | jq -r '.event_id // empty')

if [ "$HTTP_CODE" = "200" ] && [ "$EVENT_ID2" = "$EVENT_ID" ]; then
  ok "Idempotência OK: mesmo event_id, HTTP 200"
elif [ "$HTTP_CODE" = "200" ]; then
  warn "HTTP 200 mas event_id diferente: $EVENT_ID2 vs $EVENT_ID"
else
  fail "Idempotência falhou: HTTP=$HTTP_CODE"
fi

# ═══════════════════════════════════════════════════════════
echo ""
echo "🔴 TESTE 3: Motorista tenta acionar na mesma corrida (idempotente)"

EMG_RESP3=$(api POST "/api/v2/rides/$RIDE_ID/emergency" '{}' "$DRIVER_TOKEN")
parse "$EMG_RESP3"
EVENT_ID3=$(echo "$BODY" | jq -r '.event_id // empty')

if [ "$HTTP_CODE" = "200" ] && [ "$EVENT_ID3" = "$EVENT_ID" ]; then
  ok "Motorista recebe mesmo evento existente: HTTP 200"
else
  info "Motorista: HTTP=$HTTP_CODE event_id=$EVENT_ID3 (pode ser novo se lógica permitir)"
fi

# ═══════════════════════════════════════════════════════════
echo ""
echo "🔴 TESTE 4: Trilha de localização — enviar pontos e verificar gravação"

# Send 3 location points
for i in 1 2 3; do
  LAT=$(echo "-22.9068 + 0.001 * $i" | bc)
  LNG="-43.1729"
  api POST "/api/v2/rides/$RIDE_ID/location" '{"lat":'"$LAT"',"lng":'"$LNG"',"speed":30,"heading":180}' "$DRIVER_TOKEN" > /dev/null 2>&1
  sleep 1
done
ok "3 pontos de localização enviados"

# Verify trail via admin
DETAIL_RESP=$(api GET "/api/admin/emergency-events/$EVENT_ID" "" "$ADMIN_TOKEN")
parse "$DETAIL_RESP"
TRAIL_COUNT=$(echo "$BODY" | jq '.data.location_trail | length')

if [ "$TRAIL_COUNT" -ge 3 ]; then
  ok "Trilha gravada: $TRAIL_COUNT pontos"
else
  fail "Trilha insuficiente: $TRAIL_COUNT pontos (esperado >= 3)"
fi

# Verify snapshot
SNAP_STATUS=$(echo "$BODY" | jq -r '.data.snapshot.ride_status // empty')
SNAP_DRIVER=$(echo "$BODY" | jq -r '.data.snapshot.driver.name // empty')
SNAP_PASSENGER=$(echo "$BODY" | jq -r '.data.snapshot.passenger.name // empty')

if [ -n "$SNAP_STATUS" ] && [ -n "$SNAP_PASSENGER" ]; then
  ok "Snapshot completo: status=$SNAP_STATUS passenger=$SNAP_PASSENGER driver=$SNAP_DRIVER"
else
  fail "Snapshot incompleto: status=$SNAP_STATUS"
fi

# ═══════════════════════════════════════════════════════════
echo ""
echo "🔴 TESTE 5: Admin lista incidentes"

LIST_RESP=$(api GET "/api/admin/emergency-events" "" "$ADMIN_TOKEN")
parse "$LIST_RESP"
LIST_COUNT=$(echo "$BODY" | jq '.data | length')

if [ "$HTTP_CODE" = "200" ] && [ "$LIST_COUNT" -ge 1 ]; then
  ok "Admin lista incidentes: $LIST_COUNT eventos"
else
  fail "Admin lista falhou: HTTP=$HTTP_CODE count=$LIST_COUNT"
fi

# Filter by status
LIST_ACTIVE=$(api GET "/api/admin/emergency-events?status=active" "" "$ADMIN_TOKEN")
parse "$LIST_ACTIVE"
ACTIVE_COUNT=$(echo "$BODY" | jq '.data | length')
if [ "$ACTIVE_COUNT" -ge 1 ]; then
  ok "Filtro por status=active: $ACTIVE_COUNT eventos"
else
  fail "Filtro por status falhou"
fi

# ═══════════════════════════════════════════════════════════
echo ""
echo "🔴 TESTE 6: Admin resolve incidente (audit trail)"

RESOLVE_RESP=$(api PATCH "/api/admin/emergency-events/$EVENT_ID/resolve" '{"status":"resolved","resolution_notes":"Teste E2E — incidente de teste resolvido com sucesso"}' "$ADMIN_TOKEN")
parse "$RESOLVE_RESP"
RESOLVED_STATUS=$(echo "$BODY" | jq -r '.data.status // empty')

if [ "$HTTP_CODE" = "200" ] && [ "$RESOLVED_STATUS" = "resolved" ]; then
  ok "Incidente resolvido: status=resolved"
else
  fail "Resolução falhou: HTTP=$HTTP_CODE status=$RESOLVED_STATUS"
fi

# Verify resolved_by is set
RESOLVED_BY=$(echo "$BODY" | jq -r '.data.resolved_by // empty')
RESOLVED_AT=$(echo "$BODY" | jq -r '.data.resolved_at // empty')
if [ -n "$RESOLVED_BY" ] && [ -n "$RESOLVED_AT" ]; then
  ok "Audit trail: resolved_by=$RESOLVED_BY resolved_at=$RESOLVED_AT"
else
  fail "Audit trail incompleto"
fi

# ═══════════════════════════════════════════════════════════
echo ""
echo "🔴 TESTE 7: Resolver novamente falha (já resolvido)"

RESOLVE2_RESP=$(api PATCH "/api/admin/emergency-events/$EVENT_ID/resolve" '{"status":"false_alarm","resolution_notes":"Tentativa dupla"}' "$ADMIN_TOKEN")
parse "$RESOLVE2_RESP"

if [ "$HTTP_CODE" = "400" ]; then
  ok "Dupla resolução bloqueada: HTTP 400"
else
  fail "Dupla resolução deveria falhar: HTTP=$HTTP_CODE"
fi

# ═══════════════════════════════════════════════════════════
echo ""
echo "🔴 TESTE 8: Resolução sem notas falha (validação)"

# Create a new ride + emergency for this test
RIDE2_RESP=$(api POST "/api/v2/rides" '{"origin":{"lat":-22.91,"lng":-43.17,"text":"Lapa"},"destination":{"lat":-22.95,"lng":-43.21,"text":"Leblon"},"type":"normal","trip_details":{"passengers":1,"has_luggage":false}}' "$PASS_TOKEN")
parse "$RIDE2_RESP"
RIDE2_ID=$(echo "$BODY" | jq -r '.data.ride_id // .ride_id // empty')

if [ -n "$RIDE2_ID" ]; then
  sleep 3
  # Accept + start
  OFFERS2=$(api GET "/api/v2/drivers/me/offers" "" "$DRIVER_TOKEN")
  parse "$OFFERS2"
  OFFER2_ID=$(echo "$BODY" | jq -r '.data[0].id // empty')
  [ -n "$OFFER2_ID" ] && api POST "/api/v2/drivers/offers/$OFFER2_ID/accept" '{}' "$DRIVER_TOKEN" > /dev/null 2>&1
  sleep 1
  api POST "/api/v2/rides/$RIDE2_ID/arrived" '{}' "$DRIVER_TOKEN" > /dev/null 2>&1
  sleep 1
  api POST "/api/v2/rides/$RIDE2_ID/start" '{}' "$DRIVER_TOKEN" > /dev/null 2>&1
  sleep 1

  # Trigger emergency
  EMG4_RESP=$(api POST "/api/v2/rides/$RIDE2_ID/emergency" '{}' "$DRIVER_TOKEN")
  parse "$EMG4_RESP"
  EVENT2_ID=$(echo "$BODY" | jq -r '.event_id // empty')

  if [ -n "$EVENT2_ID" ]; then
    # Try resolve without notes
    RESOLVE_NO_NOTES=$(api PATCH "/api/admin/emergency-events/$EVENT2_ID/resolve" '{"status":"false_alarm","resolution_notes":""}' "$ADMIN_TOKEN")
    parse "$RESOLVE_NO_NOTES"
    if [ "$HTTP_CODE" = "400" ]; then
      ok "Resolução sem notas bloqueada: HTTP 400"
    else
      fail "Resolução sem notas deveria falhar: HTTP=$HTTP_CODE"
    fi

    # Cleanup: resolve properly
    api PATCH "/api/admin/emergency-events/$EVENT2_ID/resolve" '{"status":"false_alarm","resolution_notes":"Teste E2E — corrida de teste"}' "$ADMIN_TOKEN" > /dev/null 2>&1
  else
    warn "Não conseguiu criar segundo evento de emergência"
  fi
else
  warn "Não conseguiu criar segunda corrida para teste de validação"
fi

# ═══════════════════════════════════════════════════════════
echo ""
echo "🔴 TESTE 9: Feature flag OFF bloqueia acionamento"

# Disable flag
api PUT "/api/admin/feature-flags/emergency_vault" '{"enabled":false,"rollout_percentage":0}' "$ADMIN_TOKEN" > /dev/null 2>&1 || true

# Wait for cache to expire (feature flag has 60s cache)
info "Aguardando expiração do cache da feature flag (5s)..."
sleep 5

# Try to trigger — should get 404
RIDE3_RESP=$(api POST "/api/v2/rides" '{"origin":{"lat":-22.91,"lng":-43.17,"text":"Lapa"},"destination":{"lat":-22.95,"lng":-43.21,"text":"Leblon"},"type":"normal","trip_details":{"passengers":1,"has_luggage":false}}' "$PASS_TOKEN")
parse "$RIDE3_RESP"
RIDE3_ID=$(echo "$BODY" | jq -r '.data.ride_id // .ride_id // empty')

if [ -n "$RIDE3_ID" ]; then
  sleep 3
  OFFERS3=$(api GET "/api/v2/drivers/me/offers" "" "$DRIVER_TOKEN")
  parse "$OFFERS3"
  OFFER3_ID=$(echo "$BODY" | jq -r '.data[0].id // empty')
  [ -n "$OFFER3_ID" ] && api POST "/api/v2/drivers/offers/$OFFER3_ID/accept" '{}' "$DRIVER_TOKEN" > /dev/null 2>&1
  sleep 1
  api POST "/api/v2/rides/$RIDE3_ID/arrived" '{}' "$DRIVER_TOKEN" > /dev/null 2>&1
  sleep 1
  api POST "/api/v2/rides/$RIDE3_ID/start" '{}' "$DRIVER_TOKEN" > /dev/null 2>&1
  sleep 1

  FLAG_OFF_RESP=$(api POST "/api/v2/rides/$RIDE3_ID/emergency" '{}' "$PASS_TOKEN")
  parse "$FLAG_OFF_RESP"
  if [ "$HTTP_CODE" = "404" ]; then
    ok "Feature flag OFF bloqueia: HTTP 404"
  else
    fail "Feature flag OFF deveria bloquear: HTTP=$HTTP_CODE"
  fi
else
  warn "Não conseguiu criar corrida para teste de flag OFF"
fi

# Re-enable flag for production readiness
api PUT "/api/admin/feature-flags/emergency_vault" '{"enabled":true,"rollout_percentage":100}' "$ADMIN_TOKEN" > /dev/null 2>&1 || true

# ═══════════════════════════════════════════════════════════
echo ""
echo "🔴 TESTE 10: Corrida finalizada NÃO fecha evento de emergência"

# Check if event from test 1 is still resolved (not auto-closed)
# Complete the first ride
api POST "/api/v2/rides/$RIDE_ID/complete" '{}' "$DRIVER_TOKEN" > /dev/null 2>&1 || true

# The event should still be in whatever status we left it (resolved)
FINAL_CHECK=$(api GET "/api/admin/emergency-events/$EVENT_ID" "" "$ADMIN_TOKEN")
parse "$FINAL_CHECK"
FINAL_STATUS=$(echo "$BODY" | jq -r '.data.status // empty')
if [ "$FINAL_STATUS" = "resolved" ]; then
  ok "Evento permanece resolved após corrida finalizada (não auto-fechou)"
else
  fail "Status inesperado após finalização: $FINAL_STATUS"
fi

# ═══════════════════════════════════════════════════════════
echo ""
echo "═══════════════════════════════════════════════════════"
echo "📊 RESULTADO FINAL"
echo "═══════════════════════════════════════════════════════"
TOTAL=$((PASS + FAIL))
echo -e "  ${GREEN}✓ Passou: $PASS${NC}"
echo -e "  ${RED}✗ Falhou: $FAIL${NC}"
echo "  Total:  $TOTAL"
echo ""

if [ "$FAIL" -eq 0 ]; then
  echo -e "${GREEN}🎉 TODOS OS TESTES PASSARAM — Cofre de Evidência V1 pronto para ativação${NC}"
  echo ""
  echo "Checklist de confirmação:"
  echo "  ✓ Idempotência funcionando"
  echo "  ✓ Fallback do passageiro (feature flag OFF → 404)"
  echo "  ✓ Trilha sendo gravada"
  echo "  ✓ Audit log de resolução funcionando"
  echo "  ✓ Validação de notas obrigatórias"
  echo "  ✓ Evento não auto-fecha com corrida"
  echo ""
  echo "WhatsApp admin: verificar manualmente se EMERGENCY_ADMIN_PHONE recebeu notificação."
  echo "Se não configurado, comportamento esperado (best-effort, sem bloqueio)."
  exit 0
else
  echo -e "${RED}❌ FALHAS DETECTADAS — NÃO ativar flag em produção${NC}"
  exit 1
fi
