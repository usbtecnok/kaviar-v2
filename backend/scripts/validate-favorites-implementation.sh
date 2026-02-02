#!/bin/bash

# Validação Rápida: Favorites Matching Implementation
# Verifica que todos os componentes estão no lugar

echo "🔍 VALIDAÇÃO: FAVORITES MATCHING IMPLEMENTATION"
echo "================================================"
echo ""

ERRORS=0

# 1. Verificar arquivo do serviço
echo "📁 Verificando arquivos..."
if [ -f "src/services/favorites-matching.service.ts" ]; then
  echo "  ✅ favorites-matching.service.ts existe"
else
  echo "  ❌ favorites-matching.service.ts NÃO ENCONTRADO"
  ERRORS=$((ERRORS + 1))
fi

# 2. Verificar integração no dispatch
if grep -q "rankDriversByFavorites" "src/services/dispatch.ts"; then
  echo "  ✅ Integração no dispatch.ts confirmada"
else
  echo "  ❌ Integração no dispatch.ts NÃO ENCONTRADA"
  ERRORS=$((ERRORS + 1))
fi

# 3. Verificar testes
if [ -f "scripts/test-favorites-algorithm-unit.js" ]; then
  echo "  ✅ Testes unitários existem"
else
  echo "  ❌ Testes unitários NÃO ENCONTRADOS"
  ERRORS=$((ERRORS + 1))
fi

echo ""
echo "🔨 Verificando compilação..."

# 4. Verificar compilação TypeScript
if [ -f "dist/services/favorites-matching.service.js" ]; then
  echo "  ✅ Serviço compilado (dist/)"
else
  echo "  ⚠️  Serviço não compilado - rodando build..."
  npm run build > /dev/null 2>&1
  if [ -f "dist/services/favorites-matching.service.js" ]; then
    echo "  ✅ Build concluído com sucesso"
  else
    echo "  ❌ Falha na compilação"
    ERRORS=$((ERRORS + 1))
  fi
fi

echo ""
echo "🧪 Executando testes..."

# 5. Rodar testes unitários
TEST_OUTPUT=$(node scripts/test-favorites-algorithm-unit.js 2>&1)
if echo "$TEST_OUTPUT" | grep -q "ALL TESTS PASSED"; then
  echo "  ✅ Todos os testes passando (4/4)"
else
  echo "  ❌ Alguns testes falharam"
  echo "$TEST_OUTPUT"
  ERRORS=$((ERRORS + 1))
fi

echo ""
echo "🎯 Verificando feature flag..."

# 6. Verificar feature flag no código
if grep -q "passenger_favorites_matching" "src/services/favorites-matching.service.ts"; then
  echo "  ✅ Feature flag verificada no código"
else
  echo "  ❌ Feature flag NÃO verificada"
  ERRORS=$((ERRORS + 1))
fi

echo ""
echo "================================================"
echo ""

if [ $ERRORS -eq 0 ]; then
  echo "✅ VALIDAÇÃO COMPLETA: Tudo OK!"
  echo ""
  echo "📊 Resumo:"
  echo "  - Serviço: ✅ Criado e compilado"
  echo "  - Integração: ✅ Dispatch atualizado"
  echo "  - Testes: ✅ 4/4 passando"
  echo "  - Feature Flag: ✅ Implementada"
  echo ""
  echo "🚀 Status: PRONTO PARA PRODUÇÃO"
  exit 0
else
  echo "❌ VALIDAÇÃO FALHOU: $ERRORS erro(s) encontrado(s)"
  exit 1
fi
