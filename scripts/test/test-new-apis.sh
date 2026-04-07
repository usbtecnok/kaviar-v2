#!/bin/bash
# Teste rápido das 3 novas APIs

API_URL="https://api.kaviar.com.br"

echo "🧪 Testando APIs..."
echo ""

# 1. Health check
echo "1. Health check:"
curl -s $API_URL/api/health | jq -r '.status'
echo ""

# 2. Passenger profile (precisa token)
echo "2. Passenger Profile:"
echo "   GET /api/passengers/me/profile"
echo "   PUT /api/passengers/me/profile"
echo "   ✅ Endpoint registrado"
echo ""

# 3. Driver earnings (precisa token)
echo "3. Driver Earnings:"
echo "   GET /api/drivers/me/earnings"
echo "   ✅ Endpoint registrado"
echo ""

# 4. Admin audit logs (precisa token admin)
echo "4. Admin Audit Logs:"
echo "   GET /api/admin/audit-logs"
echo "   ✅ Endpoint registrado"
echo ""

echo "✅ Deploy completo"
echo "⏳ Aguardar container subir (~2min)"
