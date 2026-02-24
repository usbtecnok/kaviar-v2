#!/bin/bash

echo "🔍 Validação MVP+ - Driver PWA"
echo ""

cd ~/kaviar/apps/kaviar-driver-pwa

echo "=== 1. Verificar arquivos criados ==="
echo "✓ Components:"
ls -1 src/components/
echo ""
echo "✓ Lib:"
ls -1 src/lib/
echo ""

echo "=== 2. Verificar feature flags no .env ==="
grep "VITE_FEATURE" .env || echo "⚠️  Feature flags não configuradas"
echo ""

echo "=== 3. Testar build ==="
npm run build 2>&1 | grep -E "(built|error)" || echo "❌ Build falhou"
echo ""

echo "=== 4. Verificar endpoints no backend ==="
cd ~/kaviar/backend

echo "✓ Password reset:"
rg -n "router.post.*'/forgot-password'" src/routes/password-reset.ts | head -1

echo "✓ Driver onboarding:"
rg -n "router.post.*'/onboarding'" src/routes/driver-onboarding.ts | head -1

echo "✓ Montagem password reset:"
rg -n "app.use.*passwordResetRoutes" src/app.ts | head -1

echo "✓ Montagem driver onboarding:"
rg -n "app.use.*driverOnboardingRoutes" src/app.ts | head -1
echo ""

echo "=== 5. Contar arquivos de documentação ==="
cd ~/kaviar/apps/kaviar-driver-pwa
echo "Total de .md: $(ls -1 *.md | wc -l)"
ls -1 *.md
echo ""

echo "=== 6. Verificar logs estruturados ==="
echo "Tags esperadas:"
grep -h "PWA_DRIVER" src/lib/apiClient.js | grep "log(" | head -5
echo ""

echo "✅ Validação completa!"
echo ""
echo "Para rodar o app:"
echo "  cd ~/kaviar/apps/kaviar-driver-pwa"
echo "  npm run dev"
echo ""
echo "Para validação manual:"
echo "  cat VALIDATION-MVP-PLUS.md"
