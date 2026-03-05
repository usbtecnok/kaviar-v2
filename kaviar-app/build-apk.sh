#!/bin/bash
# Helper para gerar APKs do Kaviar

set -e

cd /home/goes/kaviar/kaviar-app

echo "🚀 Kaviar APK Builder"
echo ""

# Verificar se está logado no EAS
if ! npx --yes eas-cli@latest whoami &>/dev/null; then
  echo "❌ Você não está logado no EAS"
  echo "Execute: npx --yes eas-cli@latest login"
  exit 1
fi

echo "✅ Logado no EAS como: $(npx --yes eas-cli@latest whoami)"
echo ""

# Menu
echo "Escolha uma opção:"
echo ""
echo "1) Setup inicial (configurar projects)"
echo "2) Build APK Motorista"
echo "3) Build APK Passageiro"
echo "4) Build ambos APKs"
echo "5) Listar builds"
echo "6) Baixar último build"
echo "7) Ver config do Driver"
echo "8) Ver config do Passenger"
echo "9) Rodar Expo (tunnel)"
echo ""
read -p "Opção: " opcao

case $opcao in
  1)
    echo ""
    echo "📦 Configurando projeto DRIVER..."
    APP_VARIANT=driver npx --yes eas-cli@latest build:configure
    echo ""
    echo "📦 Configurando projeto PASSENGER..."
    APP_VARIANT=passenger npx --yes eas-cli@latest build:configure
    echo ""
    echo "✅ Projects configurados!"
    echo ""
    echo "⚠️  IMPORTANTE: Anote os project IDs e adicione no .env:"
    echo "   EAS_PROJECT_ID_DRIVER=..."
    echo "   EAS_PROJECT_ID_PASSENGER=..."
    ;;
  2)
    echo ""
    echo "🚗 Buildando APK Motorista..."
    APP_VARIANT=driver npx --yes eas-cli@latest build -p android --profile driver-apk
    ;;
  3)
    echo ""
    echo "👤 Buildando APK Passageiro..."
    APP_VARIANT=passenger npx --yes eas-cli@latest build -p android --profile passenger-apk
    ;;
  4)
    echo ""
    echo "🚗 Buildando APK Motorista..."
    APP_VARIANT=driver npx --yes eas-cli@latest build -p android --profile driver-apk
    echo ""
    echo "👤 Buildando APK Passageiro..."
    APP_VARIANT=passenger npx --yes eas-cli@latest build -p android --profile passenger-apk
    ;;
  5)
    echo ""
    npx --yes eas-cli@latest build:list
    ;;
  6)
    echo ""
    npx --yes eas-cli@latest build:list --limit 1
    echo ""
    read -p "Build ID para baixar: " build_id
    npx --yes eas-cli@latest build:download --id "$build_id"
    ;;
  7)
    echo ""
    APP_VARIANT=driver npx expo config --type public | grep -A 20 '"name"'
    ;;
  8)
    echo ""
    APP_VARIANT=passenger npx expo config --type public | grep -A 20 '"name"'
    ;;
  9)
    echo ""
    echo "🌐 Rodando Expo com tunnel..."
    npx expo start -c --tunnel
    ;;
  *)
    echo "❌ Opção inválida"
    exit 1
    ;;
esac
