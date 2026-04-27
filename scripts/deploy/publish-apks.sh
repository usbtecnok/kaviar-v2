#!/usr/bin/env bash
set -euo pipefail

# ─── CONFIGURAÇÃO (via variáveis de ambiente) ────────────────────────────────
# Exporte antes de rodar:
#   export CLOUDFLARE_ACCOUNT_ID="..."
#   export R2_BUCKET="..."
#   export R2_ACCESS_KEY_ID="..."
#   export R2_SECRET_ACCESS_KEY="..."
#   export CLOUDFLARE_ZONE_ID="..."
#   export CLOUDFLARE_API_TOKEN="..."
# ─────────────────────────────────────────────────────────────────────────────

LOCAL_DIR="/home/goes/apks-kaviar-corretos"
MOTORISTA_FILE="kaviar-motorista-v1.8.6.apk"
PASSAGEIRO_FILE="kaviar-passageiro-v1.9.2.apk"
MOTORISTA_PKG="com.kaviar.driver"
PASSAGEIRO_PKG="com.kaviar.passenger"
MOTORISTA_URL="https://downloads.kaviar.com.br/kaviar-motorista-v1.8.6.apk"
PASSAGEIRO_URL="https://downloads.kaviar.com.br/kaviar-passageiro-v1.9.2.apk"
CONTENT_TYPE="application/vnd.android.package-archive"
WORKDIR=$(mktemp -d)
trap 'rm -rf "$WORKDIR"' EXIT

info()  { echo -e "\n\033[1;34m[INFO]\033[0m $*"; }
ok()    { echo -e "\033[1;32m[OK]\033[0m $*"; }
fail()  { echo -e "\033[1;31m[ERRO]\033[0m $*" >&2; exit 1; }
warn()  { echo -e "\033[1;33m[AVISO]\033[0m $*"; }

get_pkg() { aapt dump badging "$1" 2>/dev/null | grep "^package:" | sed "s/.*name='\([^']*\)'.*/\1/"; }

# ─── 1. VALIDAR VARIÁVEIS E DEPENDÊNCIAS ─────────────────────────────────────
for var in CLOUDFLARE_ACCOUNT_ID R2_BUCKET R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY CLOUDFLARE_ZONE_ID CLOUDFLARE_API_TOKEN; do
  [[ -z "${!var:-}" ]] && fail "Variável não preenchida: $var"
done
for cmd in curl aapt aws jq; do
  command -v "$cmd" &>/dev/null || fail "Dependência ausente: $cmd"
done

R2_ENDPOINT="https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com"
{ set +x; } 2>/dev/null
export AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY"
export AWS_DEFAULT_REGION="auto"

# ─── 2. VALIDAR ARQUIVOS LOCAIS ───────────────────────────────────────────────
info "Validando arquivos locais em $LOCAL_DIR..."
[[ -f "$LOCAL_DIR/$MOTORISTA_FILE" ]]  || fail "Arquivo não encontrado: $LOCAL_DIR/$MOTORISTA_FILE"
[[ -f "$LOCAL_DIR/$PASSAGEIRO_FILE" ]] || fail "Arquivo não encontrado: $LOCAL_DIR/$PASSAGEIRO_FILE"

PKG_MOT=$(get_pkg "$LOCAL_DIR/$MOTORISTA_FILE")
PKG_PAS=$(get_pkg "$LOCAL_DIR/$PASSAGEIRO_FILE")

echo "  Motorista  → $PKG_MOT  (esperado: $MOTORISTA_PKG)"
echo "  Passageiro → $PKG_PAS  (esperado: $PASSAGEIRO_PKG)"

[[ "$PKG_MOT" != "$MOTORISTA_PKG" ]]  && fail "Package incorreto no motorista: '$PKG_MOT'"
[[ "$PKG_PAS" != "$PASSAGEIRO_PKG" ]] && fail "Package incorreto no passageiro: '$PKG_PAS'"
ok "Package names corretos."

# ─── 3. ESTADO ATUAL DO R2 ───────────────────────────────────────────────────
info "Estado atual do R2 (antes do upload):"
aws s3api list-objects \
  --bucket "$R2_BUCKET" \
  --prefix "kaviar-" \
  --query "Contents[].{Key:Key,Size:Size,ETag:ETag}" \
  --endpoint-url "$R2_ENDPOINT" \
  --output table 2>/dev/null || warn "Nenhum objeto encontrado ou erro ao listar."

# ─── 4. UPLOAD ────────────────────────────────────────────────────────────────
info "Enviando arquivos para o R2..."
aws s3 cp "$LOCAL_DIR/$MOTORISTA_FILE"  "s3://$R2_BUCKET/$MOTORISTA_FILE"  --content-type "$CONTENT_TYPE" --endpoint-url "$R2_ENDPOINT"
aws s3 cp "$LOCAL_DIR/$PASSAGEIRO_FILE" "s3://$R2_BUCKET/$PASSAGEIRO_FILE" --content-type "$CONTENT_TYPE" --endpoint-url "$R2_ENDPOINT"
ok "Upload concluído."

# ─── 5. PURGE DO CACHE CLOUDFLARE ────────────────────────────────────────────
info "Purgando cache Cloudflare..."
PURGE_RESP=$(curl -fsSL -X POST \
  "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/purge_cache" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data "{\"files\":[\"$MOTORISTA_URL\",\"$PASSAGEIRO_URL\"]}")
echo "$PURGE_RESP" | jq -r 'if .success then "  Purge OK" else "  Purge FALHOU: \(.errors)" end'

# ─── 6. BAIXAR E VERIFICAR ARQUIVOS SERVIDOS ─────────────────────────────────
info "Baixando arquivos públicos para verificação final..."
curl -fsSL "$MOTORISTA_URL"  -o "$WORKDIR/final_motorista.apk"
curl -fsSL "$PASSAGEIRO_URL" -o "$WORKDIR/final_passageiro.apk"

FINAL_PKG_MOT=$(get_pkg "$WORKDIR/final_motorista.apk")
FINAL_PKG_PAS=$(get_pkg "$WORKDIR/final_passageiro.apk")

# ─── 7. RELATÓRIO FINAL ──────────────────────────────────────────────────────
report_line() {
  local label="$1" url="$2" local_file="$3" served_file="$4" pkg="$5" expected_pkg="$6"
  local headers http_status content_length content_type cf_cache
  headers=$(curl -fsSI "$url")
  http_status=$(echo "$headers"    | grep -i "^HTTP"            | awk '{print $2}')
  content_length=$(echo "$headers" | grep -i "^content-length"  | awk '{print $2}' | tr -d '\r')
  content_type=$(echo "$headers"   | grep -i "^content-type"    | cut -d' ' -f2-   | tr -d '\r')
  cf_cache=$(echo "$headers"       | grep -i "^cf-cache-status" | awk '{print $2}' | tr -d '\r')
  local local_size; local_size=$(wc -c < "$local_file" | tr -d ' ')
  local pkg_ok="OK"; [[ "$pkg" != "$expected_pkg" ]] && pkg_ok="ERRO (esperado: $expected_pkg)"
  local result="OK"; { [[ "$http_status" != "200" ]] || [[ "$pkg_ok" != "OK" ]]; } && result="ERRO"

  echo ""
  echo "  $label"
  echo "  URL            : $url"
  echo "  Status HTTP    : $http_status"
  echo "  Content-Type   : $content_type"
  echo "  Tamanho local  : $local_size bytes"
  echo "  Tamanho remoto : $content_length bytes"
  echo "  Package name   : $pkg  [$pkg_ok]"
  echo "  CF-Cache-Status: $cf_cache"
  echo "  Resultado      : $result"
}

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  RELATÓRIO FINAL"
echo "════════════════════════════════════════════════════════════════"
report_line "MOTORISTA"  "$MOTORISTA_URL"  "$LOCAL_DIR/$MOTORISTA_FILE"  "$WORKDIR/final_motorista.apk"  "$FINAL_PKG_MOT" "$MOTORISTA_PKG"
report_line "PASSAGEIRO" "$PASSAGEIRO_URL" "$LOCAL_DIR/$PASSAGEIRO_FILE" "$WORKDIR/final_passageiro.apk" "$FINAL_PKG_PAS" "$PASSAGEIRO_PKG"
echo ""
echo "════════════════════════════════════════════════════════════════"
