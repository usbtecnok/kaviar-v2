#!/bin/bash
# Validação Pós-Deploy - Status 204/404 Fix
# Execute após deploy do frontend

echo "🔍 VALIDAÇÃO PÓS-DEPLOY - Status 204/404 Fix"
echo "=============================================="

echo ""
echo "📊 TESTE 1: Communities COM geofence (deve retornar 200 + JSON)"
echo "----------------------------------------------------------------"

echo "✅ Botafogo (piloto):"
curl -i https://kaviar-v2.onrender.com/api/governance/communities/cmk6ux24i0017qqr3nkeat93n/geofence 2>/dev/null | head -1

echo "✅ Tijuca (piloto):"
curl -i https://kaviar-v2.onrender.com/api/governance/communities/cmk6ux2ey001aqqr3ixqhqhqh/geofence 2>/dev/null | head -1

echo "✅ Glória:"
curl -i https://kaviar-v2.onrender.com/api/governance/communities/cmk6ux2ey001aqqr3ixqhqhqh/geofence 2>/dev/null | head -1

echo ""
echo "📊 TESTE 2: Communities SEM geofence (deve retornar 204/404)"
echo "------------------------------------------------------------"

echo "❌ Morro da Providência:"
curl -i https://kaviar-v2.onrender.com/api/governance/communities/cmk6uwnvh0001qqr377ziza29/geofence 2>/dev/null | head -1

echo "❌ Chapéu Mangueira:"
curl -i https://kaviar-v2.onrender.com/api/governance/communities/cmk6ux6v6001mqqr33ulgsn00/geofence 2>/dev/null | head -1

echo ""
echo "🎯 RESULTADO ESPERADO:"
echo "- Teste 1: HTTP/2 200 (communities com Polygon)"
echo "- Teste 2: HTTP/2 204 ou HTTP/2 404 (communities sem geofence)"
echo "- Frontend: Modal abre em AMBOS os casos sem crash"
echo ""
echo "🔧 VALIDAÇÃO FRONTEND:"
echo "1. Abrir modal para Botafogo → Ver polígono azul"
echo "2. Abrir modal para Morro da Providência → Ver 'SEM DADOS'"
echo "3. Console: logs de diagnóstico sem erros"
