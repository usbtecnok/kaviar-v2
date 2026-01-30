#!/bin/bash
# Validação RBAC Completa
set -euo pipefail

source /home/goes/kaviar/aws-resources.env

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  VALIDAÇÃO RBAC COMPLETA                                   ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# 1. Verificar contagem no banco
echo "1️⃣ Verificando contagem de usuários no RDS..."

if command -v psql &> /dev/null; then
  psql "$DATABASE_URL" -t -c "
    SELECT 
      r.name as role,
      COUNT(a.id) as total
    FROM roles r
    LEFT JOIN admins a ON a.role_id = r.id
    WHERE r.name IN ('SUPER_ADMIN', 'ANGEL_VIEWER')
    GROUP BY r.name
    ORDER BY r.name;
  "
  
  SUPER_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM admins a JOIN roles r ON a.role_id = r.id WHERE r.name = 'SUPER_ADMIN';" | tr -d ' ')
  ANGEL_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM admins a JOIN roles r ON a.role_id = r.id WHERE r.name = 'ANGEL_VIEWER';" | tr -d ' ')
  
  if [ "$SUPER_COUNT" = "2" ] && [ "$ANGEL_COUNT" = "10" ]; then
    echo "   ✅ Contagem correta: 2 SUPER_ADMIN + 10 ANGEL_VIEWER"
  else
    echo "   ❌ Contagem incorreta: $SUPER_COUNT SUPER_ADMIN + $ANGEL_COUNT ANGEL_VIEWER"
    exit 1
  fi
else
  echo "   ⚠️  psql não disponível, pulando verificação de banco"
fi

# 2. Login SUPER_ADMIN
echo ""
echo "2️⃣ Testando login SUPER_ADMIN..."
SUPER_RESPONSE=$(curl -s -X POST "http://$ALB_DNS/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "suporte@usbtecnok.com.br",
    "password": "z4939ia4"
  }')

SUPER_TOKEN=$(echo "$SUPER_RESPONSE" | jq -r '.token // .data.token // empty')
MUST_CHANGE=$(echo "$SUPER_RESPONSE" | jq -r '.data.mustChangePassword // .mustChangePassword // false')

if [ -z "$SUPER_TOKEN" ] || [ "$SUPER_TOKEN" = "null" ]; then
  echo "   ❌ Login SUPER_ADMIN falhou"
  echo "$SUPER_RESPONSE" | jq '.'
  exit 1
fi

echo "   ✅ Login SUPER_ADMIN OK"
echo "   Role: $(echo "$SUPER_RESPONSE" | jq -r '.data.user.role // .user.role')"
echo "   Must Change Password: $MUST_CHANGE"

# 3. Login ANGEL_VIEWER
echo ""
echo "3️⃣ Testando login ANGEL_VIEWER..."
ANGEL_RESPONSE=$(curl -s -X POST "http://$ALB_DNS/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "angel1@kaviar.com",
    "password": "12332100"
  }')

ANGEL_TOKEN=$(echo "$ANGEL_RESPONSE" | jq -r '.token // .data.token // empty')

if [ -z "$ANGEL_TOKEN" ] || [ "$ANGEL_TOKEN" = "null" ]; then
  echo "   ❌ Login ANGEL_VIEWER falhou"
  echo "$ANGEL_RESPONSE" | jq '.'
  exit 1
fi

echo "   ✅ Login ANGEL_VIEWER OK"
echo "   Role: $(echo "$ANGEL_RESPONSE" | jq -r '.data.user.role // .user.role')"

# 4. ANGEL_VIEWER - GET (deve funcionar)
echo ""
echo "4️⃣ Testando ANGEL_VIEWER - GET (leitura)..."
ANGEL_GET=$(curl -s -w "\n%{http_code}" -X GET "http://$ALB_DNS/api/admin/drivers" \
  -H "Authorization: Bearer $ANGEL_TOKEN")

ANGEL_GET_CODE=$(echo "$ANGEL_GET" | tail -1)

if [ "$ANGEL_GET_CODE" = "200" ]; then
  echo "   ✅ ANGEL_VIEWER consegue ler: HTTP $ANGEL_GET_CODE"
else
  echo "   ❌ ANGEL_VIEWER não consegue ler: HTTP $ANGEL_GET_CODE"
fi

# 5. ANGEL_VIEWER - POST (deve bloquear)
echo ""
echo "5️⃣ Testando ANGEL_VIEWER - POST (ação)..."
ANGEL_POST=$(curl -s -w "\n%{http_code}" -X POST "http://$ALB_DNS/api/admin/drivers/test-id/approve" \
  -H "Authorization: Bearer $ANGEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}')

ANGEL_POST_CODE=$(echo "$ANGEL_POST" | tail -1)
ANGEL_POST_BODY=$(echo "$ANGEL_POST" | head -n -1)

if [ "$ANGEL_POST_CODE" = "403" ]; then
  echo "   ✅ ANGEL_VIEWER bloqueado em ação: HTTP $ANGEL_POST_CODE"
else
  echo "   ❌ ANGEL_VIEWER não foi bloqueado: HTTP $ANGEL_POST_CODE"
  echo "$ANGEL_POST_BODY" | jq '.'
fi

# 6. SUPER_ADMIN - GET (deve funcionar)
echo ""
echo "6️⃣ Testando SUPER_ADMIN - GET (leitura)..."
SUPER_GET=$(curl -s -w "\n%{http_code}" -X GET "http://$ALB_DNS/api/admin/drivers" \
  -H "Authorization: Bearer $SUPER_TOKEN")

SUPER_GET_CODE=$(echo "$SUPER_GET" | tail -1)

if [ "$SUPER_GET_CODE" = "200" ]; then
  echo "   ✅ SUPER_ADMIN consegue ler: HTTP $SUPER_GET_CODE"
else
  echo "   ❌ SUPER_ADMIN não consegue ler: HTTP $SUPER_GET_CODE"
fi

# 7. SUPER_ADMIN - POST (deve funcionar)
echo ""
echo "7️⃣ Testando SUPER_ADMIN - POST (ação)..."
SUPER_POST=$(curl -s -w "\n%{http_code}" -X POST "http://$ALB_DNS/api/admin/drivers/test-id/approve" \
  -H "Authorization: Bearer $SUPER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}')

SUPER_POST_CODE=$(echo "$SUPER_POST" | tail -1)

if [ "$SUPER_POST_CODE" != "403" ]; then
  echo "   ✅ SUPER_ADMIN pode executar ação: HTTP $SUPER_POST_CODE"
else
  echo "   ❌ SUPER_ADMIN foi bloqueado: HTTP $SUPER_POST_CODE"
fi

# Resultado
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  RESULTADO                                                 ║"
echo "╚════════════════════════════════════════════════════════════╝"

if [ "$ANGEL_GET_CODE" = "200" ] && [ "$ANGEL_POST_CODE" = "403" ] && [ "$SUPER_GET_CODE" = "200" ] && [ "$SUPER_POST_CODE" != "403" ]; then
  echo "✅ RBAC FUNCIONANDO CORRETAMENTE"
  echo ""
  echo "   • SUPER_ADMIN: Leitura ✓ | Ação ✓"
  echo "   • ANGEL_VIEWER: Leitura ✓ | Ação ✗ (bloqueado)"
  echo ""
  echo "⚠️  Usuários devem trocar senha no primeiro login"
else
  echo "❌ RBAC COM PROBLEMAS"
  echo ""
  echo "   • ANGEL_VIEWER GET: $ANGEL_GET_CODE (esperado: 200)"
  echo "   • ANGEL_VIEWER POST: $ANGEL_POST_CODE (esperado: 403)"
  echo "   • SUPER_ADMIN GET: $SUPER_GET_CODE (esperado: 200)"
  echo "   • SUPER_ADMIN POST: $SUPER_POST_CODE (esperado: não 403)"
fi

echo ""
