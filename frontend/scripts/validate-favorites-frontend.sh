#!/bin/bash

# Validação: Frontend Admin - Favorites Matching
# Verifica que todos os componentes foram criados

echo "🔍 VALIDAÇÃO: FRONTEND ADMIN"
echo "================================================"
echo ""

ERRORS=0
FRONTEND_DIR="/home/goes/kaviar/frontend"

cd "$FRONTEND_DIR" || exit 1

# 1. Verificar componentes
echo "📁 Verificando componentes..."

if [ -f "src/components/admin/SecondaryBaseCard.tsx" ]; then
  echo "  ✅ SecondaryBaseCard.tsx criado"
else
  echo "  ❌ SecondaryBaseCard.tsx NÃO ENCONTRADO"
  ERRORS=$((ERRORS + 1))
fi

if [ -f "src/components/admin/PassengerFavoritesCard.tsx" ]; then
  echo "  ✅ PassengerFavoritesCard.tsx criado"
else
  echo "  ❌ PassengerFavoritesCard.tsx NÃO ENCONTRADO"
  ERRORS=$((ERRORS + 1))
fi

# 2. Verificar páginas
echo ""
echo "📄 Verificando páginas..."

if [ -f "src/pages/PassengerDetailsPage.tsx" ]; then
  echo "  ✅ PassengerDetailsPage.tsx criada"
else
  echo "  ❌ PassengerDetailsPage.tsx NÃO ENCONTRADA"
  ERRORS=$((ERRORS + 1))
fi

if grep -q "SecondaryBaseCard" "src/pages/DriverDetailsPage.tsx"; then
  echo "  ✅ DriverDetailsPage.tsx atualizada"
else
  echo "  ❌ DriverDetailsPage.tsx NÃO atualizada"
  ERRORS=$((ERRORS + 1))
fi

# 3. Verificar rotas
echo ""
echo "🛣️  Verificando rotas..."

if grep -q "PassengerDetailsPage" "src/App.tsx"; then
  echo "  ✅ Rota de passageiro adicionada"
else
  echo "  ❌ Rota de passageiro NÃO adicionada"
  ERRORS=$((ERRORS + 1))
fi

# 4. Verificar sintaxe TypeScript
echo ""
echo "🔨 Verificando sintaxe TypeScript..."

if command -v npx &> /dev/null; then
  if npx tsc --noEmit 2>&1 | grep -q "error TS"; then
    echo "  ❌ Erros de TypeScript encontrados"
    ERRORS=$((ERRORS + 1))
  else
    echo "  ✅ Sem erros de TypeScript"
  fi
else
  echo "  ⚠️  TypeScript não disponível (pulando verificação)"
fi

echo ""
echo "================================================"
echo ""

if [ $ERRORS -eq 0 ]; then
  echo "✅ VALIDAÇÃO COMPLETA: Frontend OK!"
  echo ""
  echo "📊 Resumo:"
  echo "  - Componentes: ✅ 2 criados"
  echo "  - Páginas: ✅ 1 criada, 1 atualizada"
  echo "  - Rotas: ✅ Configuradas"
  echo ""
  echo "🚀 Status: PRONTO PARA BUILD"
  echo ""
  echo "📝 Próximos passos:"
  echo "  1. npm run build"
  echo "  2. Deploy para produção"
  exit 0
else
  echo "❌ VALIDAÇÃO FALHOU: $ERRORS erro(s) encontrado(s)"
  exit 1
fi
