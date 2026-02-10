#!/bin/bash
# Commit e push do fix TypeScript

set -euo pipefail

echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║         FIX: TypeScript errors em passenger-onboarding                      ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo ""

cd ~/kaviar/backend

echo "📋 Mudanças aplicadas:"
echo "  ✅ Tipos: ResolutionStatus + Resolution"
echo "  ✅ resolution: Resolution (tipagem explícita)"
echo "  ✅ error handling: instanceof Error check"
echo ""

echo "🔍 Validando build..."
npm run build

if [ $? -eq 0 ]; then
  echo "✅ Build OK"
else
  echo "❌ Build FAIL"
  exit 1
fi
echo ""

echo "📝 Git status:"
git status --short
echo ""

read -p "Commit e push? (y/N) " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
  git add src/routes/passenger-onboarding.ts
  git commit -m "fix(onboarding): type-safe resolution status + safe error logging"
  git push origin main
  
  echo "✅ Pushed to main"
  echo ""
  echo "📋 Próximos passos:"
  echo "  1. Aguardar GitHub Actions deploy"
  echo "  2. Verificar /api/health.version"
  echo "  3. Testar: POST /api/passenger/onboarding/location"
else
  echo "⚠️  Commit cancelado"
fi
