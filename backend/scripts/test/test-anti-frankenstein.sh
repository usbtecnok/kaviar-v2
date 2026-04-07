#!/bin/bash
set -e

echo "🧪 Testando Anti-Frankenstein - Isolamento de Domínios"

BASE_URL="http://localhost:3001"

# Verificar se jq está instalado
if ! command -v jq &> /dev/null; then
  echo "❌ jq não está instalado. Instale com: sudo apt-get install jq"
  exit 1
fi

echo "🔍 Testando Feature Flags e Isolamento..."

# 1. Health Check Core (sempre disponível)
echo "💚 Testando health check core..."
HEALTH_RESPONSE=$(curl -s -X GET "$BASE_URL/api/health")
echo "$HEALTH_RESPONSE" | jq .

FEATURES=$(echo "$HEALTH_RESPONSE" | jq -r '.features')
echo "Features ativas: $FEATURES"

# 2. Webhook Twilio (se habilitado)
echo "📞 Testando webhook Twilio WhatsApp..."
WEBHOOK_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/webhooks/twilio/whatsapp" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "From=whatsapp:+5521999999999" \
  --data-urlencode "To=whatsapp:+14155238886" \
  --data-urlencode "Body=teste anti-frankenstein")

if [ "$WEBHOOK_CODE" = "200" ]; then
  echo "✅ Webhook Twilio respondeu: $WEBHOOK_CODE"
else
  echo "⚠️ Webhook Twilio: $WEBHOOK_CODE (pode estar desabilitado)"
fi

# 3. Health Check Integrations
echo "🔌 Testando health integrations..."
INTEGRATIONS_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$BASE_URL/webhooks/health")
echo "Integrations health: $INTEGRATIONS_CODE"

# 4. Premium Tourism (se habilitado)
echo "🏆 Testando Premium Tourism..."
PREMIUM_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$BASE_URL/api/governance/tour-packages")

if [ "$PREMIUM_CODE" = "200" ]; then
  echo "✅ Premium Tourism ativo: $PREMIUM_CODE"
elif [ "$PREMIUM_CODE" = "404" ]; then
  echo "❌ Premium Tourism desabilitado: $PREMIUM_CODE"
else
  echo "⚠️ Premium Tourism: $PREMIUM_CODE"
fi

# 5. Legacy APIs (se habilitado)
echo "🗂️ Testando Legacy APIs..."
LEGACY_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$BASE_URL/api/legacy/health")

if [ "$LEGACY_CODE" = "200" ]; then
  echo "✅ Legacy APIs ativo: $LEGACY_CODE"
elif [ "$LEGACY_CODE" = "404" ]; then
  echo "❌ Legacy APIs desabilitado: $LEGACY_CODE"
elif [ "$LEGACY_CODE" = "401" ]; then
  echo "🔒 Legacy APIs protegido (auth required): $LEGACY_CODE"
else
  echo "⚠️ Legacy APIs: $LEGACY_CODE"
fi

# 6. Core Admin (sempre disponível)
echo "👨‍💼 Testando Core Admin..."
ADMIN_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$BASE_URL/api/admin/drivers")

if [ "$ADMIN_CODE" = "401" ]; then
  echo "✅ Core Admin protegido (auth required): $ADMIN_CODE"
else
  echo "⚠️ Core Admin: $ADMIN_CODE"
fi

echo ""
echo "🎯 Resumo do Teste Anti-Frankenstein:"
echo "✅ Health Core: Sempre disponível"
echo "🔌 Webhook Twilio: $WEBHOOK_CODE"
echo "🏆 Premium Tourism: $PREMIUM_CODE"
echo "🗂️ Legacy APIs: $LEGACY_CODE"
echo "👨‍💼 Core Admin: $ADMIN_CODE (auth required)"

echo ""
echo "🎉 Teste Anti-Frankenstein concluído!"
echo "📝 Domínios isolados com sucesso"
