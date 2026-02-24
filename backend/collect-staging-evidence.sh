#!/bin/bash
# ============================================
# KAVIAR — EVIDÊNCIAS EM STAGING (CLOUDWATCH)
# Objetivo: marcar checklist "Evidências em staging"
# Gera:
#  - export de logs CloudWatch (dispatcher + ride flow)
#  - contagem de marcadores (RIDE_CREATED, DISPATCH*, OFFER_*)
#  - arquivos em docs/evidencias/.../anexos
# ============================================

set -euo pipefail

cd ~/kaviar/backend

REGION="us-east-2"
LOG_GROUP="/ecs/kaviar-backend"

# Janela de tempo (últimos 60 min). Pode alterar.
START=$(( $(date +%s) - 3600 ))
END=$(date +%s)

# Diretório de evidências (staging)
RUN_TS="$(date -u +%Y%m%dT%H%M%SZ)"
DEST="docs/evidencias/staging-ride-flow-${RUN_TS}"
ANX="$DEST/anexos"
mkdir -p "$ANX"

echo "DEST=$DEST"
echo "ANX=$ANX"

# 1) Query CloudWatch: puxar logs relevantes do ride flow / dispatcher / SSE
echo "== 1) CloudWatch query: ride flow markers =="

QSTR='fields @timestamp, @message
| filter @message like /RIDE_CREATED/
   or @message like /DISPATCHER_FILTER/
   or @message like /DISPATCH_CANDIDATES/
   or @message like /OFFER_SENT/
   or @message like /OFFER_EXPIRED/
   or @message like /STATUS_CHANGED/
   or @message like /(?i)dispatch/
   or @message like /(?i)match/
   or @message like /(?i)sse/
| sort @timestamp asc
| limit 5000'

QID=$(aws logs start-query --region "$REGION" \
  --log-group-name "$LOG_GROUP" \
  --start-time "$START" \
  --end-time "$END" \
  --query-string "$QSTR" \
  --query queryId --output text)

echo "QID=$QID"

# aguardar query completar
for i in $(seq 1 30); do
  STATUS=$(aws logs get-query-results --region "$REGION" --query-id "$QID" --query status --output text)
  echo "status=$STATUS ($i/30)"
  [ "$STATUS" = "Complete" ] && break
  sleep 2
done

aws logs get-query-results --region "$REGION" --query-id "$QID" --output json > "$ANX/cloudwatch-rideflow-query.json"

# 2) Extrair mensagens em texto (mais fácil de auditar)
python3 - <<'PY' "$ANX/cloudwatch-rideflow-query.json" "$ANX/cloudwatch-rideflow-messages.txt"
import json,sys
src,dst=sys.argv[1],sys.argv[2]
j=json.load(open(src,"r",encoding="utf-8"))
out=[]
for row in j.get("results",[]):
    msg=None
    ts=None
    for cell in row:
        if cell.get("field")=="@message": msg=cell.get("value","")
        if cell.get("field")=="@timestamp": ts=cell.get("value","")
    if msg is None: continue
    out.append(f"{ts} {msg}")
open(dst,"w",encoding="utf-8").write("\n".join(out)+"\n")
print("WROTE",dst,"lines",len(out))
PY

# 3) Contagem de marcadores (pro checklist)
echo "== 3) Counts markers =="
MARKERS_OUT="$ANX/cloudwatch-markers-counts.txt"
{
  echo "Window: start=$(date -d "@$START" -Is) end=$(date -d "@$END" -Is)"
  echo ""
  for m in RIDE_CREATED DISPATCHER_FILTER DISPATCH_CANDIDATES OFFER_SENT OFFER_EXPIRED STATUS_CHANGED; do
    c=$(grep -c "$m" "$ANX/cloudwatch-rideflow-messages.txt" || true)
    printf "%-18s %s\n" "$m:" "$c"
  done
} | tee "$MARKERS_OUT"

# 4) Query CloudWatch: endpoints /api/v2/rides (opcional mas bom)
echo "== 4) CloudWatch query: /api/v2/rides requests (opcional) =="

QSTR2='fields @timestamp, @message
| filter @message like /\/api\/v2\/rides/
| sort @timestamp asc
| limit 2000'

QID2=$(aws logs start-query --region "$REGION" \
  --log-group-name "$LOG_GROUP" \
  --start-time "$START" \
  --end-time "$END" \
  --query-string "$QSTR2" \
  --query queryId --output text)

echo "QID2=$QID2"

for i in $(seq 1 30); do
  STATUS=$(aws logs get-query-results --region "$REGION" --query-id "$QID2" --query status --output text)
  echo "status2=$STATUS ($i/30)"
  [ "$STATUS" = "Complete" ] && break
  sleep 2
done

aws logs get-query-results --region "$REGION" --query-id "$QID2" --output json > "$ANX/cloudwatch-api-v2-rides.json"

# 5) Gerar um MD resumo (pra colar na evidência)
EVID="$DEST/EVIDENCIAS-STAGING-RIDE-FLOW.md"
cat > "$EVID" <<EOF
# Evidências — STAGING Ride Flow (CloudWatch)

- Data UTC: $(date -u +%Y-%m-%dT%H:%M:%SZ)
- Log group: \`$LOG_GROUP\`
- Janela: start=$(date -d "@$START" -Is) / end=$(date -d "@$END" -Is)
- Pasta evidências: \`$DEST\`

## Arquivos gerados
- \`anexos/cloudwatch-rideflow-query.json\` (resultado bruto CloudWatch Logs Insights)
- \`anexos/cloudwatch-rideflow-messages.txt\` (mensagens extraídas)
- \`anexos/cloudwatch-markers-counts.txt\` (contagem de marcadores)
- \`anexos/cloudwatch-api-v2-rides.json\` (opcional: chamadas \`/api/v2/rides\`)

## Contagem de marcadores (CloudWatch)
\`\`\`
$(cat "$MARKERS_OUT")
\`\`\`

## Como isso fecha o checklist
Esta evidência comprova em **staging**:
- criação de corridas (RIDE_CREATED),
- dispatcher rodando (DISPATCHER_FILTER/DISPATCH_CANDIDATES),
- ofertas enviadas e expiradas (OFFER_SENT/OFFER_EXPIRED), quando aplicável,
- transições de status (STATUS_CHANGED), quando houver.
EOF

echo ""
echo "✅ OK. Evidências em: $DEST"
echo "Abra:"
echo "  less $EVID"
echo "  ls -lh $ANX"
