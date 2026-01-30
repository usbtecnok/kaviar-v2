#!/bin/bash
# Deploy RBAC Admin
set -euo pipefail

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  DEPLOY RBAC ADMIN                                         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

cd /home/goes/kaviar/backend

# 1. Executar seed
echo "1️⃣ Executando seed RBAC..."
npx ts-node prisma/seed-rbac.ts

echo ""
echo "2️⃣ Testando login SUPER_ADMIN..."
source /home/goes/kaviar/aws-resources.env

SUPER_ADMIN_RESPONSE=$(curl -s -X POST "http://$ALB_DNS/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "suporte@usbtecnok.com.br",
    "password": "Kaviar2026!Admin"
  }')

echo "$SUPER_ADMIN_RESPONSE" | jq '.'

SUPER_ADMIN_TOKEN=$(echo "$SUPER_ADMIN_RESPONSE" | jq -r '.token')

if [ "$SUPER_ADMIN_TOKEN" != "null" ] && [ -n "$SUPER_ADMIN_TOKEN" ]; then
  echo "✅ Login SUPER_ADMIN OK"
else
  echo "❌ Login SUPER_ADMIN falhou"
  exit 1
fi

echo ""
echo "3️⃣ Testando login ANGEL_VIEWER..."

ANGEL_RESPONSE=$(curl -s -X POST "http://$ALB_DNS/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "angel1@kaviar.com",
    "password": "Kaviar2026!Admin"
  }')

echo "$ANGEL_RESPONSE" | jq '.'

ANGEL_TOKEN=$(echo "$ANGEL_RESPONSE" | jq -r '.token')

if [ "$ANGEL_TOKEN" != "null" ] && [ -n "$ANGEL_TOKEN" ]; then
  echo "✅ Login ANGEL_VIEWER OK"
else
  echo "❌ Login ANGEL_VIEWER falhou"
  exit 1
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  RBAC ADMIN DEPLOYED                                       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "📋 Credenciais:"
echo "   SUPER_ADMIN: suporte@usbtecnok.com.br / Kaviar2026!Admin"
echo "   ANGEL_VIEWER: angel1@kaviar.com / Kaviar2026!Admin"
echo ""
echo "🧪 Próximos passos:"
echo "   1. Testar no frontend: https://$CLOUDFRONT_DOMAIN"
echo "   2. Aplicar RBAC nas rotas (ver RBAC_ADMIN.md)"
echo "   3. Trocar senhas em produção"
echo ""
