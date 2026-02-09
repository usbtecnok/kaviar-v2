#!/bin/bash
# CI Gates - Anti-regressão para paths legados e fetch direto
# Bloqueia deploy se detectar problemas

set -e

FAILED=0

echo "🔒 CI GATES - Anti-Frankenstein"
echo ""

# Gate A: Bloquear fetch/axios fora do apiClient (apenas admin crítico)
echo "Gate A: Verificando fetch/axios fora do apiClient (admin crítico)..."
FETCH_OUTSIDE=$(rg -n "fetch\(|axios\." frontend-app/src/pages/admin --glob "*.{ts,tsx,js,jsx}" | grep -E "(NeighborhoodsManagement|NeighborhoodsByCity|AdminApp|SystemStatus)" | grep -v "src/lib/apiClient" || true)

if [ -n "$FETCH_OUTSIDE" ]; then
  echo "  ❌ FAIL - fetch/axios encontrado fora do apiClient:"
  echo "$FETCH_OUTSIDE"
  FAILED=$((FAILED + 1))
else
  echo "  ✅ PASS - Nenhum fetch/axios fora do apiClient"
fi

echo ""

# Gate B: Bloquear endpoints legados
echo "Gate B: Verificando endpoints legados (/health, /neighborhoods)..."
LEGACY_PATHS=$(rg -n '["'"'"']/health["'"'"']|["'"'"']/neighborhoods["'"'"']' frontend-app/src --glob "*.{ts,tsx,js,jsx}" | grep -v "path=\"/neighborhoods\"" || true)

if [ -n "$LEGACY_PATHS" ]; then
  echo "  ❌ FAIL - Paths legados encontrados:"
  echo "$LEGACY_PATHS"
  FAILED=$((FAILED + 1))
else
  echo "  ✅ PASS - Nenhum path legado encontrado"
fi

echo ""

# Gate C: Smoke tests
echo "Gate C: Smoke tests..."

# C1: /api/health
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://api.kaviar.com.br/api/health)
if [ "$HEALTH_STATUS" = "200" ]; then
  echo "  ✅ PASS - /api/health → 200"
else
  echo "  ❌ FAIL - /api/health → $HEALTH_STATUS (esperado 200)"
  FAILED=$((FAILED + 1))
fi

# C2: /api/governance/neighborhoods sem token
NEIGHBORHOODS_NO_TOKEN=$(curl -s -o /dev/null -w "%{http_code}" https://api.kaviar.com.br/api/governance/neighborhoods)
if [ "$NEIGHBORHOODS_NO_TOKEN" = "401" ]; then
  echo "  ✅ PASS - /api/governance/neighborhoods sem token → 401"
else
  echo "  ❌ FAIL - /api/governance/neighborhoods sem token → $NEIGHBORHOODS_NO_TOKEN (esperado 401)"
  FAILED=$((FAILED + 1))
fi

# C3: /api/governance/neighborhoods com token (se CI_ADMIN_TOKEN existir)
if [ -z "$CI_ADMIN_TOKEN" ]; then
  echo "  ⚠️  SKIP - CI_ADMIN_TOKEN não configurado"
  echo "     Configure no GitHub Secrets para validação completa"
else
  NEIGHBORHOODS_WITH_TOKEN=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $CI_ADMIN_TOKEN" https://api.kaviar.com.br/api/governance/neighborhoods)
  if [ "$NEIGHBORHOODS_WITH_TOKEN" = "200" ]; then
    echo "  ✅ PASS - /api/governance/neighborhoods com token → 200"
  else
    echo "  ❌ FAIL - /api/governance/neighborhoods com token → $NEIGHBORHOODS_WITH_TOKEN (esperado 200)"
    FAILED=$((FAILED + 1))
  fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $FAILED -eq 0 ]; then
  echo "✅ Todos os gates passaram!"
  exit 0
else
  echo "❌ $FAILED gate(s) falharam"
  echo ""
  echo "⚠️  DEPLOY BLOQUEADO"
  echo "Corrija os problemas acima antes de fazer merge/deploy"
  exit 1
fi
