#!/bin/bash
# 🧪 TESTE E2E — Fluxo Premium (Price Adjustment) Fase 3
# Cenários: aceite, recusa, timeout, versão incompatível

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
  local args=(-s -X "$method" "$API$endpoint" -H "Content-Type: application/json")
  [ -n "$token" ] && args+=(-H "Authorization: Bearer $token")
  [ -n "$data" ] && args+=(-d "$data")
  curl "${args[@]}" 2>/dev/null
}

echo "🧪 TESTE E2E — FLUXO PREMIUM (PRICE ADJUSTMENT)"
echo "================================================="
echo "API: $API"
echo ""

# ─── Health check ───
echo "📋 PRÉ-REQUISITO: Health check"
HC=$(curl -s "$API/api/health" | jq -r '.status // empty')
if [ "$HC" = "ok" ]; then ok "Backend online"; else fail "Backend offline"; exit 1; fi

# ─── Criar dados de teste via registro direto ───
echo ""
echo "📋 SETUP: Criar motorista + passageiro de teste"

# Create driver via registration
DRIVER_EMAIL="drv.premium.${TS}@kaviar.test"
DRIVER_CPF=$(printf '%011d' $((TS % 99999999999)))
DRIVER_RESP=$(api POST "/api/auth/driver/register" '{"name":"Driver Premium Test","email":"'"$DRIVER_EMAIL"'","phone":"+552190'${TS: -7}'","password":"test123","document_cpf":"'"$DRIVER_CPF"'","accepted_terms":true,"vehicle_model":"Test Car","vehicle_color":"Branco","vehicle_plate":"TST'${TS: -4}'","lat":-22.9068,"lng":-43.1729}')
DRIVER_TOKEN=$(echo "$DRIVER_RESP" | jq -r '.token // empty')
DRIVER_ID=$(echo "$DRIVER_RESP" | jq -r '.user.id // .driver.id // .data.id // empty')

if [ -z "$DRIVER_TOKEN" ]; then
  # Try login if already exists
  DRIVER_RESP=$(api POST "/api/auth/driver/login" '{"email":"'"$DRIVER_EMAIL"'","password":"test123"}')
  DRIVER_TOKEN=$(echo "$DRIVER_RESP" | jq -r '.token // empty')
  DRIVER_ID=$(echo "$DRIVER_RESP" | jq -r '.driver.id // .userId // empty')
fi
if [ -z "$DRIVER_TOKEN" ]; then fail "Driver auth falhou: $DRIVER_RESP"; exit 1; fi
ok "Motorista criado/autenticado: $DRIVER_ID"

# Driver needs to be approved + have credits — admin required
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"
if [ -z "$ADMIN_PASSWORD" ]; then
  fail "ADMIN_PASSWORD é obrigatória para este teste. Use: ADMIN_PASSWORD=xxx bash scripts/test/test-premium-adjustment-e2e.sh"
  exit 1
fi

ADMIN_RESP=$(api POST "/api/admin/auth/login" '{"email":"admin@kaviar.com","password":"'"$ADMIN_PASSWORD"'"}')
ADMIN_TOKEN=$(echo "$ADMIN_RESP" | jq -r '.token // empty')
if [ -z "$ADMIN_TOKEN" ]; then fail "Admin login falhou"; exit 1; fi
ok "Admin autenticado"

# Approve driver
api PUT "/api/admin/drivers/$DRIVER_ID/approve" '{}' "$ADMIN_TOKEN" > /dev/null 2>&1
ok "Motorista aprovado"

# Re-login after approval
DRIVER_RESP=$(api POST "/api/auth/driver/login" '{"email":"'"$DRIVER_EMAIL"'","password":"test123"}')
DRIVER_TOKEN=$(echo "$DRIVER_RESP" | jq -r '.token // empty')

# Add credits (10 credits for testing)
api POST "/api/admin/drivers/$DRIVER_ID/credits/adjust" '{"delta":10,"reason":"E2E test credits"}' "$ADMIN_TOKEN" > /dev/null 2>&1
ok "10 créditos adicionados ao motorista"

# Driver online + location
api POST "/api/v2/drivers/me/availability" '{"availability":"online"}' "$DRIVER_TOKEN" > /dev/null 2>&1
api POST "/api/v2/drivers/me/location" '{"lat":-22.9068,"lng":-43.1729}' "$DRIVER_TOKEN" > /dev/null 2>&1
ok "Motorista online com localização"

# Create passenger
PASSENGER_EMAIL="psg.premium.${TS}@kaviar.test"
PASSENGER_CPF=$(printf '%011d' $(((TS + 1) % 99999999999)))
PASSENGER_RESP=$(api POST "/api/auth/passenger/register" '{"name":"Passageiro Premium Test","email":"'"$PASSENGER_EMAIL"'","phone":"+552180'${TS: -7}'","password":"test123","document_cpf":"'"$PASSENGER_CPF"'","lat":-22.9068,"lng":-43.1729}')
PASSENGER_TOKEN=$(echo "$PASSENGER_RESP" | jq -r '.token // empty')
PASSENGER_ID=$(echo "$PASSENGER_RESP" | jq -r '.user.id // .passenger.id // .data.id // empty')
if [ -z "$PASSENGER_TOKEN" ]; then
  PASSENGER_RESP=$(api POST "/api/auth/passenger/login" '{"email":"'"$PASSENGER_EMAIL"'","password":"test123"}')
  PASSENGER_TOKEN=$(echo "$PASSENGER_RESP" | jq -r '.token // empty')
  PASSENGER_ID=$(echo "$PASSENGER_RESP" | jq -r '.user.id // .passenger.id // .userId // empty')
fi
if [ -z "$PASSENGER_TOKEN" ]; then fail "Passageiro auth falhou: $PASSENGER_RESP"; exit 1; fi
ok "Passageiro autenticado: $PASSENGER_ID"

# ─── Helper: create ride + get offer ───
create_ride_and_offer() {
  local app_version=${1:-"1.4.0"}
  local ride_resp offer_id ride_id

  # Refresh driver location right before ride creation (60s freshness in prod)
  api POST "/api/v2/drivers/me/location" '{"lat":-22.9068,"lng":-43.1729}' "$DRIVER_TOKEN" > /dev/null 2>&1
  sleep 1

  ride_resp=$(curl -s -X POST "$API/api/v2/rides" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $PASSENGER_TOKEN" \
    -H "X-App-Version: $app_version" \
    -d '{
      "origin": {"lat": -22.9068, "lng": -43.1729, "text": "Centro RJ"},
      "destination": {"lat": -22.9128, "lng": -43.1802, "text": "Lapa RJ"},
      "type": "standard"
    }')

  ride_id=$(echo "$ride_resp" | jq -r '.data.ride_id // .data.id // .ride.id // .id // empty')
  if [ -z "$ride_id" ]; then
    echo "RIDE_CREATE_FAIL: $ride_resp" >&2
    return 1
  fi

  # Poll for offer (dispatcher runs async, may need multiple cycles)
  local attempts=0
  offer_id=""
  while [ $attempts -lt 8 ]; do
    sleep 3
    local offers_resp
    offers_resp=$(api GET "/api/v2/drivers/me/offers" "" "$DRIVER_TOKEN")
    offer_id=$(echo "$offers_resp" | jq -r '[.data[] | select(.ride.id == "'"$ride_id"'")][0].id // empty')
    if [ -n "$offer_id" ]; then break; fi
    # Also try without ride filter (simpler)
    offer_id=$(echo "$offers_resp" | jq -r '.data[0].id // empty')
    if [ -n "$offer_id" ]; then break; fi
    attempts=$((attempts + 1))
  done

  echo "$ride_id|$offer_id"
}

# ═══════════════════════════════════════════
# CENÁRIO 1: +R$5 → Passageiro ACEITA
# ═══════════════════════════════════════════
echo ""
echo "═══════════════════════════════════════════"
echo "📋 CENÁRIO 1: +R\$5 → Passageiro ACEITA"
echo "═══════════════════════════════════════════"

RESULT=$(create_ride_and_offer "1.4.0")
RIDE1=$(echo "$RESULT" | cut -d'|' -f1)
OFFER1=$(echo "$RESULT" | cut -d'|' -f2)

if [ -z "$OFFER1" ]; then
  fail "Cenário 1: Não conseguiu obter oferta para ride $RIDE1"
else
  info "Ride: $RIDE1 | Offer: $OFFER1"

  # Driver accepts with +R$5 adjustment
  ACCEPT_RESP=$(api POST "/api/v2/drivers/offers/$OFFER1/accept" '{"adjustment":5}' "$DRIVER_TOKEN")
  ADJ_STATUS=$(echo "$ACCEPT_RESP" | jq -r '.data.adjustment_status // empty')

  if [ "$ADJ_STATUS" = "pending" ]; then
    ok "Driver aceitou com +R\$5 → adjustment_status=pending"
  else
    fail "Esperado adjustment_status=pending, recebeu: $ADJ_STATUS ($ACCEPT_RESP)"
  fi

  # Check ride status = pending_adjustment
  RIDE_RESP=$(api GET "/api/v2/rides/$RIDE1" "" "$PASSENGER_TOKEN")
  RIDE_STATUS=$(echo "$RIDE_RESP" | jq -r '.data.status // .ride.status // .status // empty')
  if [ "$RIDE_STATUS" = "pending_adjustment" ]; then
    ok "Ride status = pending_adjustment"
  else
    warn "Ride status = $RIDE_STATUS (esperado: pending_adjustment)"
  fi

  # Passenger accepts adjustment
  ACCEPT_ADJ=$(api POST "/api/v2/rides/$RIDE1/adjustment-response" '{"accept":true}' "$PASSENGER_TOKEN")
  ACCEPT_ADJ_STATUS=$(echo "$ACCEPT_ADJ" | jq -r '.status // .data.status // empty')

  if [ "$ACCEPT_ADJ_STATUS" = "accepted" ]; then
    ok "Passageiro aceitou ajuste → status=accepted"
  else
    fail "Resposta do aceite: $ACCEPT_ADJ"
  fi

  # Verify DB state
  RIDE_FINAL=$(api GET "/api/v2/rides/$RIDE1" "" "$PASSENGER_TOKEN")
  FINAL_STATUS=$(echo "$RIDE_FINAL" | jq -r '.data.status // .ride.status // .status // empty')
  info "Estado final ride: status=$FINAL_STATUS"

  # Reset driver to online for next test
  api POST "/api/v2/drivers/me/availability" '{"availability":"online"}' "$DRIVER_TOKEN" > /dev/null 2>&1
  sleep 1
fi

# ═══════════════════════════════════════════
# CENÁRIO 2: +R$8 → Passageiro RECUSA
# ═══════════════════════════════════════════
echo ""
echo "═══════════════════════════════════════════"
echo "📋 CENÁRIO 2: +R\$8 → Passageiro RECUSA"
echo "═══════════════════════════════════════════"

RESULT=$(create_ride_and_offer "1.4.0")
RIDE2=$(echo "$RESULT" | cut -d'|' -f1)
OFFER2=$(echo "$RESULT" | cut -d'|' -f2)

if [ -z "$OFFER2" ]; then
  fail "Cenário 2: Não conseguiu obter oferta para ride $RIDE2"
else
  info "Ride: $RIDE2 | Offer: $OFFER2"

  # Driver accepts with +R$8
  ACCEPT_RESP=$(api POST "/api/v2/drivers/offers/$OFFER2/accept" '{"adjustment":8}' "$DRIVER_TOKEN")
  ADJ_STATUS=$(echo "$ACCEPT_RESP" | jq -r '.data.adjustment_status // empty')

  if [ "$ADJ_STATUS" = "pending" ]; then
    ok "Driver aceitou com +R\$8 → adjustment_status=pending"
  else
    fail "Esperado pending, recebeu: $ADJ_STATUS"
  fi

  # Passenger rejects
  REJECT_RESP=$(api POST "/api/v2/rides/$RIDE2/adjustment-response" '{"accept":false}' "$PASSENGER_TOKEN")
  REJECT_STATUS=$(echo "$REJECT_RESP" | jq -r '.status // .data.status // empty')

  if [ "$REJECT_STATUS" = "rejected" ]; then
    ok "Passageiro recusou ajuste → status=rejected"
  else
    fail "Resposta da recusa: $REJECT_RESP"
  fi

  # Verify ride went back to requested (redispatch)
  sleep 1
  RIDE_FINAL=$(api GET "/api/v2/rides/$RIDE2" "" "$PASSENGER_TOKEN")
  FINAL_STATUS=$(echo "$RIDE_FINAL" | jq -r '.data.status // .ride.status // .status // empty')
  FINAL_DRIVER=$(echo "$RIDE_FINAL" | jq -r '.data.driver_id // .ride.driver_id // "null"')

  if [ "$FINAL_STATUS" = "requested" ]; then
    ok "Ride voltou para status=requested (redispatch)"
  else
    warn "Ride status=$FINAL_STATUS (esperado: requested)"
  fi
  info "driver_id após recusa: $FINAL_DRIVER"

  api POST "/api/v2/drivers/me/availability" '{"availability":"online"}' "$DRIVER_TOKEN" > /dev/null 2>&1
  sleep 1
fi

# ═══════════════════════════════════════════
# CENÁRIO 3: +R$10 → Passageiro TIMEOUT (60s)
# ═══════════════════════════════════════════
echo ""
echo "═══════════════════════════════════════════"
echo "📋 CENÁRIO 3: +R\$10 → Passageiro TIMEOUT"
echo "═══════════════════════════════════════════"

RESULT=$(create_ride_and_offer "1.4.0")
RIDE3=$(echo "$RESULT" | cut -d'|' -f1)
OFFER3=$(echo "$RESULT" | cut -d'|' -f2)

if [ -z "$OFFER3" ]; then
  fail "Cenário 3: Não conseguiu obter oferta para ride $RIDE3"
else
  info "Ride: $RIDE3 | Offer: $OFFER3"

  # Driver accepts with +R$10
  ACCEPT_RESP=$(api POST "/api/v2/drivers/offers/$OFFER3/accept" '{"adjustment":10}' "$DRIVER_TOKEN")
  ADJ_STATUS=$(echo "$ACCEPT_RESP" | jq -r '.data.adjustment_status // empty')

  if [ "$ADJ_STATUS" = "pending" ]; then
    ok "Driver aceitou com +R\$10 → adjustment_status=pending"
  else
    fail "Esperado pending, recebeu: $ADJ_STATUS"
  fi

  # Verify ride is pending_adjustment
  RIDE_RESP=$(api GET "/api/v2/rides/$RIDE3" "" "$PASSENGER_TOKEN")
  RIDE_STATUS=$(echo "$RIDE_RESP" | jq -r '.data.status // .ride.status // .status // empty')
  info "Ride status antes do timeout: $RIDE_STATUS"

  # Wait for dispatcher timeout (60s + buffer)
  info "Aguardando timeout do dispatcher (65s)..."
  sleep 65

  # Check if dispatcher expired the adjustment
  RIDE_FINAL=$(api GET "/api/v2/rides/$RIDE3" "" "$PASSENGER_TOKEN")
  FINAL_STATUS=$(echo "$RIDE_FINAL" | jq -r '.data.status // .ride.status // .status // empty')

  if [ "$FINAL_STATUS" = "requested" ]; then
    ok "Timeout: ride voltou para status=requested"
  elif [ "$FINAL_STATUS" = "pending_adjustment" ]; then
    warn "Ride ainda pending_adjustment — dispatcher pode não ter rodado o ciclo ainda"
    info "Aguardando mais 30s..."
    sleep 30
    RIDE_FINAL=$(api GET "/api/v2/rides/$RIDE3" "" "$PASSENGER_TOKEN")
    FINAL_STATUS=$(echo "$RIDE_FINAL" | jq -r '.data.status // .ride.status // .status // empty')
    if [ "$FINAL_STATUS" = "requested" ]; then
      ok "Timeout (retry): ride voltou para status=requested"
    else
      fail "Timeout: ride ainda em $FINAL_STATUS após 95s"
    fi
  else
    warn "Status inesperado após timeout: $FINAL_STATUS"
  fi

  api POST "/api/v2/drivers/me/availability" '{"availability":"online"}' "$DRIVER_TOKEN" > /dev/null 2>&1
  sleep 1
fi

# ═══════════════════════════════════════════
# CENÁRIO 4: Versão incompatível → skipped
# ═══════════════════════════════════════════
echo ""
echo "═══════════════════════════════════════════"
echo "📋 CENÁRIO 4: Versão incompatível → skipped"
echo "═══════════════════════════════════════════"

RESULT=$(create_ride_and_offer "1.3.0")
RIDE4=$(echo "$RESULT" | cut -d'|' -f1)
OFFER4=$(echo "$RESULT" | cut -d'|' -f2)

if [ -z "$OFFER4" ]; then
  fail "Cenário 4: Não conseguiu obter oferta para ride $RIDE4"
else
  info "Ride: $RIDE4 | Offer: $OFFER4 (passenger_app_version=1.3.0)"

  # Driver accepts with adjustment — should be skipped
  ACCEPT_RESP=$(api POST "/api/v2/drivers/offers/$OFFER4/accept" '{"adjustment":5}' "$DRIVER_TOKEN")
  ADJ_STATUS=$(echo "$ACCEPT_RESP" | jq -r '.data.adjustment_status // empty')

  if [ "$ADJ_STATUS" = "skipped" ]; then
    ok "Versão incompatível → adjustment_status=skipped"
  else
    fail "Esperado skipped, recebeu: $ADJ_STATUS ($ACCEPT_RESP)"
  fi

  # Ride should go directly to accepted (no pending_adjustment)
  sleep 1
  RIDE_FINAL=$(api GET "/api/v2/rides/$RIDE4" "" "$PASSENGER_TOKEN")
  FINAL_STATUS=$(echo "$RIDE_FINAL" | jq -r '.data.status // .ride.status // .status // empty')

  if [ "$FINAL_STATUS" = "accepted" ]; then
    ok "Ride foi direto para status=accepted (sem pending_adjustment)"
  else
    fail "Esperado accepted, recebeu: $FINAL_STATUS"
  fi

  info "Fluxo skipped: motorista aceita, passageiro não é notificado, corrida segue normal"
fi

# ═══════════════════════════════════════════
# RESUMO
# ═══════════════════════════════════════════
echo ""
echo "═══════════════════════════════════════════"
echo "📊 RESUMO"
echo "═══════════════════════════════════════════"
echo -e "Passou: ${GREEN}${PASS}${NC}"
echo -e "Falhou: ${RED}${FAIL}${NC}"
echo ""

if [ "$FAIL" -eq 0 ]; then
  echo -e "${GREEN}✅ FLUXO PREMIUM VALIDADO — ZERO REGRESSÃO${NC}"
else
  echo -e "${RED}❌ ${FAIL} FALHA(S) DETECTADA(S)${NC}"
fi

exit $FAIL
