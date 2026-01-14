#!/bin/bash

# Validação dos módulos admin reparados
# Data: 2026-01-14

API_BASE="http://localhost:3003"
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "🔍 VALIDAÇÃO ADMIN MODULES REPAIR"
echo "=================================="
echo ""

# Verificar se backend está rodando
response=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE/api/health" 2>/dev/null)
if [ "$response" != "200" ]; then
    echo -e "${RED}✗${NC} Backend não está rodando em $API_BASE"
    echo ""
    echo "Para iniciar o backend:"
    echo "  cd /home/goes/kaviar/backend"
    echo "  npm run dev"
    exit 1
fi

echo -e "${GREEN}✓${NC} Backend está rodando"
echo ""

echo "📡 Testando Endpoints Admin:"
echo "----------------------------"

# Geofences (sem auth - deve funcionar)
response=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE/api/governance/admin/communities/with-duplicates" 2>/dev/null)
if [ "$response" = "200" ]; then
    count=$(curl -s "$API_BASE/api/governance/admin/communities/with-duplicates" 2>/dev/null | jq -r '.data | length' 2>/dev/null)
    echo -e "${GREEN}✓${NC} Geofences: 200 OK (communities: $count)"
else
    echo -e "${RED}✗${NC} Geofences: $response (esperado 200)"
fi

# Rides (requer auth - deve retornar 401)
response=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE/api/admin/rides" 2>/dev/null)
if [ "$response" = "401" ]; then
    echo -e "${GREEN}✓${NC} Rides: 401 Unauthorized (correto - requer auth)"
else
    echo -e "${RED}✗${NC} Rides: $response (esperado 401 sem token)"
fi

# Guides (requer auth - deve retornar 401)
response=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE/api/admin/guides" 2>/dev/null)
if [ "$response" = "401" ]; then
    echo -e "${GREEN}✓${NC} Guides: 401 Unauthorized (correto - requer auth)"
else
    echo -e "${RED}✗${NC} Guides: $response (esperado 401 sem token)"
fi

# Neighborhoods (sem auth - deve funcionar)
response=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE/api/governance/neighborhoods" 2>/dev/null)
if [ "$response" = "200" ]; then
    count=$(curl -s "$API_BASE/api/governance/neighborhoods" 2>/dev/null | jq -r '.data | length' 2>/dev/null)
    echo -e "${GREEN}✓${NC} Neighborhoods: 200 OK (count: $count)"
else
    echo -e "${RED}✗${NC} Neighborhoods: $response (esperado 200)"
fi

# Neighborhood geofence (exemplo com ID fictício)
echo ""
echo "📝 Para testar geofence de bairro específico:"
echo "   curl http://localhost:3003/api/governance/neighborhoods/<ID>/geofence"
echo ""

echo "✅ VALIDAÇÃO AUTOMÁTICA CONCLUÍDA"
echo ""
echo "📝 Checklist Manual (frontend):"
echo "  [ ] Guias Turísticos → Listagem funcional"
echo "  [ ] Geofences → Sem erro 404"
echo "  [ ] Corridas → Listagem funcional"
echo "  [ ] Bairros → Mapa visível ao selecionar"
echo ""
