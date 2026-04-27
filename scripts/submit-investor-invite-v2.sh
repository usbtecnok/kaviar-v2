#!/usr/bin/env bash
# Submete template kaviar_invites_investor_v2 via Twilio Content API
# Uso: TWILIO_ACCOUNT_SID=AC... TWILIO_AUTH_TOKEN=... bash scripts/submit-investor-invite-v2.sh
set -euo pipefail

: "${TWILIO_ACCOUNT_SID:?Defina TWILIO_ACCOUNT_SID}"
: "${TWILIO_AUTH_TOKEN:?Defina TWILIO_AUTH_TOKEN}"

TEMPLATE_NAME="kaviar_invites_investor_v2"

BODY=$(cat <<'PAYLOAD'
Olá, {{1}}.

Você recebeu um acesso para conhecer o KAVIAR, plataforma brasileira de mobilidade desenvolvida a partir da USB Tecnok Manutenção e Instalação de Computadores Ltda.

O projeto foi concebido no contexto do Rio de Janeiro e estruturado para crescimento e expansão territorial.

Para criar sua senha e acessar, utilize o link abaixo:

{{2}}

O link é pessoal e válido por 2 horas.

Se necessário, a equipe KAVIAR pode emitir um novo acesso.
PAYLOAD
)

# Escapar para JSON
BODY_JSON=$(printf '%s' "$BODY" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read()))')

PAYLOAD=$(cat <<EOF
{
  "friendly_name": "${TEMPLATE_NAME}",
  "language": "pt_BR",
  "variables": {
    "1": "nome do destinatário",
    "2": "link de acesso com senha"
  },
  "types": {
    "twilio/text": {
      "body": ${BODY_JSON}
    }
  }
}
EOF
)

echo "=== Submetendo template: ${TEMPLATE_NAME} ==="
echo ""
echo "Corpo da mensagem:"
echo "$BODY"
echo ""
echo "---"

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "https://content.twilio.com/v1/Content" \
  -u "${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY_RESP=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: ${HTTP_CODE}"
echo "Response:"
echo "$BODY_RESP" | python3 -m json.tool 2>/dev/null || echo "$BODY_RESP"

if [ "$HTTP_CODE" = "201" ]; then
  CONTENT_SID=$(echo "$BODY_RESP" | python3 -c "import sys,json; print(json.loads(sys.stdin.read())['sid'])" 2>/dev/null || echo "")
  echo ""
  echo "=== Template criado com sucesso ==="
  echo "Content SID: ${CONTENT_SID}"
  echo ""
  echo "Próximo passo — submeter para aprovação WhatsApp:"
  echo ""
  echo "curl -X POST \"https://content.twilio.com/v1/Content/${CONTENT_SID}/ApprovalRequests\" \\"
  echo "  -u \"\${TWILIO_ACCOUNT_SID}:\${TWILIO_AUTH_TOKEN}\" \\"
  echo "  -H 'Content-Type: application/json' \\"
  echo "  -d '{\"name\":\"${TEMPLATE_NAME}\",\"category\":\"UTILITY\"}'"
  echo ""
  echo "Após aprovação, adicionar env var:"
  echo "  WA_TPL_INVITE_INVESTOR=${CONTENT_SID}"
else
  echo ""
  echo "=== ERRO na criação ==="
  exit 1
fi
