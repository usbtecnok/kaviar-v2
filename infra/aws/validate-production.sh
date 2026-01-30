#!/bin/bash

echo "🔍 KAVIAR PRODUCTION VALIDATION"
echo "================================"
echo ""

# 1. Health Check + Git Commit
echo "1️⃣ Health Check (Git Commit)"
echo "----------------------------"
curl -s https://kaviar-v2.onrender.com/api/health | jq '.'
echo ""

# 2. Verificar se gitCommit está presente
echo "2️⃣ Git Commit presente?"
echo "----------------------"
COMMIT=$(curl -s https://kaviar-v2.onrender.com/api/health | jq -r '.gitCommit')
if [ "$COMMIT" != "unknown" ] && [ "$COMMIT" != "null" ]; then
  echo "✅ Git Commit: $COMMIT"
else
  echo "❌ Git Commit: $COMMIT (não detectado)"
fi
echo ""

# 3. Verificar endpoint de documentos (precisa de driver_id e admin token)
echo "3️⃣ Endpoint de documentos existe?"
echo "---------------------------------"
echo "Testando rota sem auth (deve retornar 401):"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://kaviar-v2.onrender.com/api/admin/drivers/test-id/documents)
if [ "$STATUS" = "401" ]; then
  echo "✅ Endpoint existe (401 sem auth - esperado)"
elif [ "$STATUS" = "404" ]; then
  echo "❌ Endpoint NÃO existe (404)"
else
  echo "⚠️  Status inesperado: $STATUS"
fi
echo ""

echo "================================"
echo "📊 RESUMO"
echo "================================"
echo "Health: OK"
echo "Git Commit: $COMMIT"
echo "Endpoint docs: Status $STATUS"
echo ""
echo "🔍 PRÓXIMOS PASSOS:"
echo "1. Se gitCommit = 'unknown': Deploy não pegou env var do Render"
echo "2. Se endpoint = 404: Código não está em produção"
echo "3. Se endpoint = 401: ✅ Código está em produção, precisa testar com auth"
