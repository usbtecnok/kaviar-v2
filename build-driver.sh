#!/bin/bash
set -e

echo "🔧 Build Driver APK"
echo "==================="

cd /home/goes/kaviar

# Limpar cache
echo "🧹 Limpando cache..."
rm -rf .expo node_modules/.cache

# Build
echo "📦 Iniciando build do APK driver..."
eas build --platform android --profile driver-apk --local --clear-cache

echo ""
echo "✅ Build concluído!"
echo ""
echo "📱 Para testar:"
echo "   adb install -r <caminho-do-apk>"
echo "   adb shell am start -n com.kaviar.driver/.MainActivity"
echo "   adb logcat | grep -E 'ReactNativeJS|Expo'"
