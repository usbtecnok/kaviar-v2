#!/usr/bin/env bash
set -euo pipefail

# ─── CONFIGURAÇÃO (via variáveis de ambiente) ────────────────────────────────
# export CLOUDFLARE_ACCOUNT_ID="..."
# export R2_BUCKET="..."
# export R2_ACCESS_KEY_ID="..."
# export R2_SECRET_ACCESS_KEY="..."
# export CLOUDFLARE_ZONE_ID="..."
# export CLOUDFLARE_API_TOKEN="..."
# export APK_PATH="/caminho/para/kaviar-passageiro-v1.12.1-particular.apk"
# ─────────────────────────────────────────────────────────────────────────────

TARGET_FILE="kaviar-passageiro-v1.12.1-particular.apk"
PUBLIC_URL="https://downloads.kaviar.com.br/kaviar-passageiro-v1.12.1-particular.apk"
EXPECTED_PKG="com.kaviar.passenger"
EXPECTED_VARIANT="passenger"
EXPECTED_NAME="Kaviar Passageiro"
CONTENT_TYPE="application/vnd.android.package-archive"
WORKDIR=$(mktemp -d)
trap 'rm -rf "$WORKDIR"' EXIT

info()  { echo -e "\n\033[1;34m[INFO]\033[0m $*"; }
ok()    { echo -e "\033[1;32m[OK]\033[0m $*"; }
fail()  { echo -e "\033[1;31m[ERRO]\033[0m $*" >&2; exit 1; }

# ─── 1. VALIDAR VARIÁVEIS ────────────────────────────────────────────────────
for var in CLOUDFLARE_ACCOUNT_ID R2_BUCKET R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY CLOUDFLARE_ZONE_ID CLOUDFLARE_API_TOKEN APK_PATH; do
  [[ -z "${!var:-}" ]] && fail "Variável não preenchida: $var"
done
for cmd in curl aapt aws jq python3; do
  command -v "$cmd" &>/dev/null || fail "Dependência ausente: $cmd"
done
[[ -f "$APK_PATH" ]] || fail "APK não encontrado: $APK_PATH"

R2_ENDPOINT="https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com"
{ set +x; } 2>/dev/null
export AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY"
export AWS_DEFAULT_REGION="auto"

# ─── 2. VALIDAR APK LOCAL ────────────────────────────────────────────────────
info "Validando APK local: $APK_PATH"

PKG=$(aapt dump badging "$APK_PATH" 2>/dev/null | grep "^package:" | sed "s/.*name='\([^']*\)'.*/\1/")
LABEL=$(aapt dump badging "$APK_PATH" 2>/dev/null | grep "^application-label:" | sed "s/application-label:'\([^']*\)'.*/\1/")

APP_CONFIG=$(unzip -p "$APK_PATH" assets/app.config 2>/dev/null)
VARIANT=$(echo "$APP_CONFIG" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('extra',{}).get('APP_VARIANT','NOT_FOUND'))")
CONFIG_NAME=$(echo "$APP_CONFIG" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('name','NOT_FOUND'))")
CONFIG_PKG=$(echo "$APP_CONFIG" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('android',{}).get('package','NOT_FOUND'))")

echo "  package (AndroidManifest) : $PKG"
echo "  application-label         : $LABEL"
echo "  APP_VARIANT (app.config)  : $VARIANT"
echo "  name (app.config)         : $CONFIG_NAME"
echo "  package (app.config)      : $CONFIG_PKG"

[[ "$PKG"         != "$EXPECTED_PKG"     ]] && fail "package incorreto: '$PKG' (esperado: $EXPECTED_PKG)"
[[ "$VARIANT"     != "$EXPECTED_VARIANT" ]] && fail "APP_VARIANT incorreto: '$VARIANT' (esperado: $EXPECTED_VARIANT)"
[[ "$CONFIG_NAME" != "$EXPECTED_NAME"    ]] && fail "name incorreto: '$CONFIG_NAME' (esperado: $EXPECTED_NAME)"
[[ "$CONFIG_PKG"  != "$EXPECTED_PKG"     ]] && fail "package no app.config incorreto: '$CONFIG_PKG'"

ok "APK local validado — tudo correto."

# ─── 3. UPLOAD ────────────────────────────────────────────────────────────────
info "Enviando $TARGET_FILE para o R2..."
aws s3 cp "$APK_PATH" "s3://$R2_BUCKET/$TARGET_FILE" \
  --content-type "$CONTENT_TYPE" \
  --endpoint-url "$R2_ENDPOINT"
ok "Upload concluído."

# ─── 4. PURGE DO CACHE CLOUDFLARE ────────────────────────────────────────────
info "Purgando cache Cloudflare..."
PURGE=$(curl -fsSL -X POST \
  "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/purge_cache" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data "{\"files\":[\"$PUBLIC_URL\"]}")
echo "$PURGE" | jq -r 'if .success then "  Purge OK" else "  Purge FALHOU: \(.errors)" end'

# ─── 5. BAIXAR E VALIDAR ARQUIVO SERVIDO ─────────────────────────────────────
info "Baixando APK público para validação final..."
curl -fsSL "$PUBLIC_URL" -o "$WORKDIR/served.apk"

SERVED_PKG=$(aapt dump badging "$WORKDIR/served.apk" 2>/dev/null | grep "^package:" | sed "s/.*name='\([^']*\)'.*/\1/")
SERVED_CONFIG=$(unzip -p "$WORKDIR/served.apk" assets/app.config 2>/dev/null)
SERVED_VARIANT=$(echo "$SERVED_CONFIG" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('extra',{}).get('APP_VARIANT','NOT_FOUND'))")
SERVED_NAME=$(echo "$SERVED_CONFIG" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('name','NOT_FOUND'))")

HEADERS=$(curl -fsSI "$PUBLIC_URL")
HTTP_STATUS=$(echo "$HEADERS"    | grep -i "^HTTP"            | awk '{print $2}')
CONTENT_LEN=$(echo "$HEADERS"    | grep -i "^content-length"  | awk '{print $2}' | tr -d '\r')
CF_CACHE=$(echo "$HEADERS"       | grep -i "^cf-cache-status" | awk '{print $2}' | tr -d '\r')
LOCAL_SIZE=$(wc -c < "$APK_PATH" | tr -d ' ')

PKG_OK="OK";     [[ "$SERVED_PKG"     != "$EXPECTED_PKG"     ]] && PKG_OK="ERRO"
VARIANT_OK="OK"; [[ "$SERVED_VARIANT" != "$EXPECTED_VARIANT" ]] && VARIANT_OK="ERRO"
NAME_OK="OK";    [[ "$SERVED_NAME"    != "$EXPECTED_NAME"    ]] && NAME_OK="ERRO"
HTTP_OK="OK";    [[ "$HTTP_STATUS"    != "200"               ]] && HTTP_OK="ERRO"
RESULT="OK";     [[ "$PKG_OK$VARIANT_OK$NAME_OK$HTTP_OK" != "OKOKOKOK" ]] && RESULT="ERRO"

# ─── 6. RELATÓRIO FINAL ──────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  RELATÓRIO FINAL — PASSAGEIRO v1.12.1-particular"
echo "════════════════════════════════════════════════════════════════"
echo "  URL              : $PUBLIC_URL"
echo "  Status HTTP      : $HTTP_STATUS  [$HTTP_OK]"
echo "  Tamanho local    : $LOCAL_SIZE bytes"
echo "  Tamanho remoto   : $CONTENT_LEN bytes"
echo "  CF-Cache-Status  : $CF_CACHE"
echo "  package          : $SERVED_PKG  [$PKG_OK]"
echo "  APP_VARIANT      : $SERVED_VARIANT  [$VARIANT_OK]"
echo "  name             : $SERVED_NAME  [$NAME_OK]"
echo "  ──────────────────────────────────────────────────────────────"
echo "  Resultado final  : $RESULT"
echo "════════════════════════════════════════════════════════════════"

[[ "$RESULT" != "OK" ]] && exit 1
