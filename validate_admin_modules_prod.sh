#!/usr/bin/env bash
set -euo pipefail

# Validação dos módulos admin (produção ou local)
# Uso:
#   ./validate_admin_modules_prod.sh                      # usa PROD default
#   ./validate_admin_modules_prod.sh http://localhost:3003 # usa URL informada
# Data: 2026-01-14

PROD_URL="${1:-https://kaviar-v2.onrender.com}"

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

if ! command -v curl >/dev/null 2>&1; then
  echo "ERRO: 'curl' não encontrado."
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "ERRO: 'jq' não encontrado. Instale com: sudo apt-get install -y jq"
  exit 1
fi

echo "🔍 VALIDAÇÃO ADMIN MODULES"
echo "======================================"
echo ""
echo "Base URL: $PROD_URL"
echo ""

echo "📡 Testando Endpoints:"
echo "---------------------"

# Neighborhoods
code="$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL/api/governance/neighborhoods" || true)"
if [ "$code" = "200" ]; then
  count="$(curl -s "$PROD_URL/api/governance/neighborhoods" | jq -r '.data | length' || echo "0")"
  echo -e "${GREEN}✓${NC} Neighborhoods: 200 OK (count: $count)"
else
  echo -e "${RED}✗${NC} Neighborhoods: $code"
fi

# Neighborhood geofence (primeiro ID)
NEIGHBORHOOD_ID="$(curl -s "$PROD_URL/api/governance/neighborhoods" | jq -r '.data[0].id // empty' || true)"
if [ -n "$NEIGHBORHOOD_ID" ]; then
  code="$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL/api/governance/neighborhoods/$NEIGHBORHOOD_ID/geofence" || true)"
  if [ "$code" = "200" ]; then
    has_coords="$(curl -s "$PROD_URL/api/governance/neighborhoods/$NEIGHBORHOOD_ID/geofence" | jq -r '.data.coordinates != null' || echo "false")"
    echo -e "${GREEN}✓${NC} Neighborhood Geofence: 200 OK (has_coordinates: $has_coords)"
  else
    echo -e "${RED}✗${NC} Neighborhood Geofence: $code"
  fi
else
  echo -e "${RED}✗${NC} Neighborhood Geofence: sem ID (lista vazia?)"
fi

# Geofences (communities) - endpoint governance admin
code="$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL/api/governance/admin/communities/with-duplicates" || true)"
if [ "$code" = "200" ]; then
  count="$(curl -s "$PROD_URL/api/governance/admin/communities/with-duplicates" | jq -r '.data | length' || echo "0")"
  echo -e "${GREEN}✓${NC} Geofences (communities): 200 OK (count: $count)"
else
  echo -e "${RED}✗${NC} Geofences: $code"
fi

# Rides (requer auth - deve retornar 401)
code="$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL/api/admin/rides" || true)"
if [ "$code" = "401" ]; then
  echo -e "${GREEN}✓${NC} Rides: 401 Unauthorized (correto - requer auth)"
elif [ "$code" = "200" ]; then
  echo -e "${GREEN}✓${NC} Rides: 200 OK"
else
  echo -e "${RED}✗${NC} Rides: $code (esperado 200 ou 401)"
fi

# Guides (requer auth - deve retornar 401)
code="$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL/api/admin/guides" || true)"
if [ "$code" = "401" ]; then
  echo -e "${GREEN}✓${NC} Guides: 401 Unauthorized (correto - requer auth)"
elif [ "$code" = "200" ]; then
  echo -e "${GREEN}✓${NC} Guides: 200 OK"
else
  echo -e "${RED}✗${NC} Guides: $code (esperado 200 ou 401)"
fi

echo ""
echo "✅ VALIDAÇÃO COMPLETA"
echo ""
echo "📝 Checklist Manual (frontend):"
echo "  [ ] Bairros → Mapa renderiza ao selecionar"
echo "  [ ] Geofences → Não mostra 'endpoint não disponível'"
echo "  [ ] Corridas → Listagem funcional (ou pede login)"
echo "  [ ] Guias → Listagem funcional (ou pede login)"
echo ""
