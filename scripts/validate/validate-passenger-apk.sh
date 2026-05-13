#!/usr/bin/env bash
set -euo pipefail

# ─── Validate Passenger APK before publish ───────────────────────────────────
# Usage: ./scripts/validate/validate-passenger-apk.sh [path-to-apk]
# If no path given, uses default build output.
# ─────────────────────────────────────────────────────────────────────────────

APK="${1:-android/app/build/outputs/apk/release/app-release.apk}"
BT="/usr/lib/android-sdk/build-tools/36.0.0"

EXPECTED_PKG="com.kaviar.passenger"
EXPECTED_SHA1="d858d3a5d1791ee3e7dde9745291ad0fc8a25983"
EXPECTED_KEY_SUFFIX="FRwOag"
EXPECTED_VARIANT="passenger"

ERRORS=0

info()  { echo -e "\033[1;34m[CHECK]\033[0m $*"; }
ok()    { echo -e "\033[1;32m  ✅\033[0m $*"; }
fail()  { echo -e "\033[1;31m  ❌\033[0m $*"; ERRORS=$((ERRORS + 1)); }

echo "═══════════════════════════════════════════════════════"
echo "  VALIDAÇÃO APK PASSAGEIRO"
echo "  APK: $APK"
echo "═══════════════════════════════════════════════════════"
echo ""

[[ ! -f "$APK" ]] && { fail "APK não encontrado: $APK"; exit 1; }

# 1. Package name
info "Package name"
PKG=$(aapt dump badging "$APK" 2>/dev/null | awk -F"'" '/^package:/{print $2; exit}')
[[ "$PKG" == "$EXPECTED_PKG" ]] && ok "$PKG" || fail "Esperado $EXPECTED_PKG, obteve $PKG"

# 2. Assinatura SHA-1
info "SHA-1 do certificado"
SHA1=$("$BT/apksigner" verify --print-certs "$APK" 2>/dev/null | grep "SHA-1 digest" | awk '{print $NF}')
[[ "$SHA1" == "$EXPECTED_SHA1" ]] && ok "$SHA1" || fail "Esperado $EXPECTED_SHA1, obteve $SHA1"

# 3. apksigner verify
info "apksigner verify (v2 scheme)"
if "$BT/apksigner" verify "$APK" >/dev/null 2>&1; then
  ok "Verifies"
else
  fail "APK não passa na verificação de assinatura"
fi

# 4. Maps key no AndroidManifest
info "Google Maps API Key no AndroidManifest"
MAPS_KEY=$(aapt dump xmltree "$APK" AndroidManifest.xml 2>/dev/null | grep -A1 "com.google.android.geo.API_KEY" | grep "android:value" | sed 's/.*Raw: "\(.*\)".*/\1/')
if [[ -n "$MAPS_KEY" && "$MAPS_KEY" == *"$EXPECTED_KEY_SUFFIX" ]]; then
  ok "Key presente, termina em $EXPECTED_KEY_SUFFIX"
else
  fail "Key ausente ou incorreta: '$MAPS_KEY'"
fi

# 5. EXPO_PUBLIC_PLACES_KEY no bundle
info "EXPO_PUBLIC_PLACES_KEY no bundle JS"
PLACES_KEY=$(unzip -p "$APK" assets/app.config 2>/dev/null | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('extra',{}).get('EXPO_PUBLIC_PLACES_KEY',''))" 2>/dev/null)
if [[ -n "$PLACES_KEY" && "$PLACES_KEY" == *"$EXPECTED_KEY_SUFFIX" ]]; then
  ok "Preenchida, termina em $EXPECTED_KEY_SUFFIX"
else
  fail "VAZIA ou incorreta: '$PLACES_KEY' — MAPA NÃO VAI FUNCIONAR"
fi

# 6. APP_VARIANT
info "APP_VARIANT"
VARIANT=$(unzip -p "$APK" assets/app.config 2>/dev/null | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('extra',{}).get('APP_VARIANT',''))" 2>/dev/null)
[[ "$VARIANT" == "$EXPECTED_VARIANT" ]] && ok "$VARIANT" || fail "Esperado $EXPECTED_VARIANT, obteve $VARIANT"

# 7. Firebase google_app_id
info "Firebase google_app_id (FCM)"
GAID=$(aapt dump resources "$APK" 2>/dev/null | grep "google_app_id" | head -1)
if [[ -n "$GAID" ]]; then
  ok "Presente"
else
  fail "Ausente — push FCM não vai funcionar"
fi

# ─── Resultado ────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════"
if [[ $ERRORS -eq 0 ]]; then
  echo -e "  \033[1;32mTODOS OS CHECKS PASSARAM ✅\033[0m"
  echo "  APK pronto para publicação."
else
  echo -e "  \033[1;31m$ERRORS ERRO(S) ENCONTRADO(S) ❌\033[0m"
  echo "  NÃO publicar este APK."
fi
echo "═══════════════════════════════════════════════════════"
exit $ERRORS
