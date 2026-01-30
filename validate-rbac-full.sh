#!/bin/bash

# Validação RBAC Frontend + Backend
# Testa login, troca de senha, badge e permissões

source aws-resources.env 2>/dev/null || true
ALB_DNS="${ALB_DNS:-kaviar-alb-1494046292.us-east-2.elb.amazonaws.com}"
API_URL="http://$ALB_DNS"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  🧪 VALIDAÇÃO RBAC COMPLETA - FRONTEND + BACKEND          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "API: $API_URL"
echo "Frontend: https://d29p7cirgjqbxl.cloudfront.net"
echo ""

# 1. Login SUPER_ADMIN
echo "1️⃣ Login SUPER_ADMIN (suporte@usbtecnok.com.br)..."
SUPER_RESPONSE=$(curl -s -X POST "$API_URL/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"suporte@usbtecnok.com.br","password":"z4939ia4"}')

SUPER_TOKEN=$(echo $SUPER_RESPONSE | jq -r '.data.token // empty')
SUPER_MUST_CHANGE=$(echo $SUPER_RESPONSE | jq -r '.data.mustChangePassword // false')

if [ -n "$SUPER_TOKEN" ]; then
  echo "   ✅ Login OK - Token: ${SUPER_TOKEN:0:20}..."
  echo "   📋 mustChangePassword: $SUPER_MUST_CHANGE"
else
  echo "   ❌ Falha no login"
  echo "   Response: $SUPER_RESPONSE"
fi
echo ""

# 2. Login ANGEL_VIEWER
echo "2️⃣ Login ANGEL_VIEWER (angel1@kaviar.com)..."
ANGEL_RESPONSE=$(curl -s -X POST "$API_URL/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"angel1@kaviar.com","password":"12332100"}')

ANGEL_TOKEN=$(echo $ANGEL_RESPONSE | jq -r '.data.token // empty')
ANGEL_MUST_CHANGE=$(echo $ANGEL_RESPONSE | jq -r '.data.mustChangePassword // false')
ANGEL_ROLE=$(echo $ANGEL_RESPONSE | jq -r '.data.user.role // empty')

if [ -n "$ANGEL_TOKEN" ]; then
  echo "   ✅ Login OK - Token: ${ANGEL_TOKEN:0:20}..."
  echo "   📋 Role: $ANGEL_ROLE"
  echo "   📋 mustChangePassword: $ANGEL_MUST_CHANGE"
else
  echo "   ❌ Falha no login"
  echo "   Response: $ANGEL_RESPONSE"
fi
echo ""

# 3. Testar GET (deve funcionar para ambos)
echo "3️⃣ Testando GET /api/admin/drivers (leitura)..."
echo "   SUPER_ADMIN:"
SUPER_GET=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$API_URL/api/admin/drivers" \
  -H "Authorization: Bearer $SUPER_TOKEN")
echo "   Status: $SUPER_GET $([ "$SUPER_GET" = "200" ] && echo "✅" || echo "❌")"

echo "   ANGEL_VIEWER:"
ANGEL_GET=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$API_URL/api/admin/drivers" \
  -H "Authorization: Bearer $ANGEL_TOKEN")
echo "   Status: $ANGEL_GET $([ "$ANGEL_GET" = "200" ] && echo "✅" || echo "❌")"
echo ""

# 4. Testar POST (deve falhar para ANGEL_VIEWER)
echo "4️⃣ Testando POST /api/admin/drivers/approve/999 (ação)..."
echo "   SUPER_ADMIN:"
SUPER_POST=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/api/admin/drivers/approve/999" \
  -H "Authorization: Bearer $SUPER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}')
echo "   Status: $SUPER_POST (esperado 404 ou 400, não 403)"

echo "   ANGEL_VIEWER:"
ANGEL_POST=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/api/admin/drivers/approve/999" \
  -H "Authorization: Bearer $ANGEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}')
echo "   Status: $ANGEL_POST $([ "$ANGEL_POST" = "403" ] && echo "✅ Bloqueado" || echo "❌ Deveria ser 403")"
echo ""

# 5. Resumo
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  📊 RESUMO DA VALIDAÇÃO                                    ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Backend:"
echo "  ✅ Login SUPER_ADMIN: $([ -n "$SUPER_TOKEN" ] && echo "OK" || echo "FALHOU")"
echo "  ✅ Login ANGEL_VIEWER: $([ -n "$ANGEL_TOKEN" ] && echo "OK" || echo "FALHOU")"
echo "  ✅ ANGEL_VIEWER GET: $([ "$ANGEL_GET" = "200" ] && echo "OK" || echo "FALHOU")"
echo "  ✅ ANGEL_VIEWER POST: $([ "$ANGEL_POST" = "403" ] && echo "BLOQUEADO (OK)" || echo "FALHOU")"
echo ""
echo "Frontend (testar manualmente):"
echo "  1. Acesse: https://d29p7cirgjqbxl.cloudfront.net/admin/login"
echo "  2. Login SUPER_ADMIN → Deve redirecionar para /change-password"
echo "  3. Trocar senha → Deve liberar dashboard"
echo "  4. Login ANGEL_VIEWER → Ver badge '👁️ Modo Leitura'"
echo "  5. ANGEL_VIEWER → Botões de ação devem estar ESCONDIDOS"
echo ""
echo "Credenciais:"
echo "  SUPER_ADMIN: suporte@usbtecnok.com.br / z4939ia4"
echo "  ANGEL_VIEWER: angel1@kaviar.com / 12332100"
echo ""
