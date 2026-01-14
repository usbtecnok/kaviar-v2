#!/bin/bash

# Validação das correções do dashboard administrativo
# Data: 2026-01-14

API_BASE="http://localhost:3003"
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "🔍 VALIDAÇÃO ADMIN DASHBOARD FIX"
echo "================================="
echo ""

# Verificar Node version
echo "📌 Node Version:"
node --version
if [ -f "/home/goes/kaviar/backend/.nvmrc" ]; then
    echo "   Expected: $(cat /home/goes/kaviar/backend/.nvmrc)"
fi
echo ""

# Verificar se backend está rodando
echo "📡 Backend Endpoints:"
echo "--------------------"

# Health check
response=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE/api/health" 2>/dev/null)
if [ "$response" = "200" ]; then
    echo -e "${GREEN}✓${NC} Health Check: 200 OK"
else
    echo -e "${RED}✗${NC} Health Check: $response (backend não está rodando?)"
    echo ""
    echo "Para iniciar o backend:"
    echo "  cd /home/goes/kaviar/backend"
    echo "  nvm use  # (se tiver nvm)"
    echo "  npm run dev"
    exit 1
fi

# Neighborhoods
response=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE/api/governance/neighborhoods" 2>/dev/null)
count=$(curl -s "$API_BASE/api/governance/neighborhoods" 2>/dev/null | jq -r '.data | length' 2>/dev/null)
if [ "$response" = "200" ]; then
    echo -e "${GREEN}✓${NC} Neighborhoods: 200 OK (count: $count)"
else
    echo -e "${RED}✗${NC} Neighborhoods: $response"
fi

# Passengers (sem auth - deve retornar 401)
response=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE/api/admin/passengers" 2>/dev/null)
if [ "$response" = "401" ]; then
    echo -e "${GREEN}✓${NC} Passengers (no auth): 401 Unauthorized (correto)"
else
    echo -e "${RED}✗${NC} Passengers (no auth): $response (esperado 401)"
fi

echo ""
echo "✅ VALIDAÇÃO AUTOMÁTICA CONCLUÍDA"
echo ""
echo "📝 Checklist Manual (frontend):"
echo "  [ ] Card 'Bairros' mostra contagem correta"
echo "  [ ] Clicar em 'Bairros' → Listagem real"
echo "  [ ] Clicar em 'Passageiros' → Listagem real"
echo "  [ ] Premium Tourism → Navegação direta"
echo "  [ ] Login passageiro → Sem loop"
echo ""
