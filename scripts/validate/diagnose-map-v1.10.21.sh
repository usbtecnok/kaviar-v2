#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════
# DIAGNÓSTICO DO MAPA — Kaviar Passageiro v1.10.21
# Executar ANTES de qualquer novo build
# ══════════════════════════════════════════════════════════════════
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

echo -e "${CYAN}══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  DIAGNÓSTICO DO MAPA — Kaviar Passageiro v1.10.21${NC}"
echo -e "${CYAN}══════════════════════════════════════════════════════════════${NC}"
echo ""

# ── ETAPA 1: Verificar AndroidManifest local ──
echo -e "${YELLOW}[1/6] Verificando AndroidManifest.xml local...${NC}"
MANIFEST="android/app/src/main/AndroidManifest.xml"
if [ -f "$MANIFEST" ]; then
  KEY=$(grep -oP 'android:name="com.google.android.geo.API_KEY" android:value="\K[^"]+' "$MANIFEST" || echo "")
  PKG=$(grep -oP 'package="\K[^"]+' "$MANIFEST" || echo "")
  if [ -n "$KEY" ] && [ "$KEY" != "" ]; then
    echo -e "  ${GREEN}✅ API_KEY encontrada: ${KEY}${NC}"
  else
    echo -e "  ${RED}❌ API_KEY VAZIA ou AUSENTE no manifest!${NC}"
  fi
  echo -e "  Package no manifest: ${PKG:-'(não encontrado — normal para Expo)'}"
else
  echo -e "  ${RED}❌ AndroidManifest.xml não encontrado em $MANIFEST${NC}"
fi
echo ""

# ── ETAPA 2: SHA-1 do debug.keystore ──
echo -e "${YELLOW}[2/6] SHA-1 do certificado de signing...${NC}"
KEYSTORE="android/app/debug.keystore"
if [ -f "$KEYSTORE" ]; then
  SHA1=$(keytool -list -v -keystore "$KEYSTORE" -alias androiddebugkey -storepass android 2>/dev/null | grep "SHA1:" | awk '{print $2}')
  echo -e "  ${GREEN}SHA-1: ${SHA1}${NC}"
  echo -e "  ${YELLOW}⚠️  Confirme que este SHA-1 está autorizado no Google Cloud Console${NC}"
  echo -e "  ${YELLOW}   para o package com.kaviar.passenger na API key acima.${NC}"
else
  echo -e "  ${RED}❌ debug.keystore não encontrado${NC}"
fi
echo ""

# ── ETAPA 3: Verificar APK com aapt2 (se disponível) ──
echo -e "${YELLOW}[3/6] Verificando APK com aapt2...${NC}"
APK=$(find . -maxdepth 3 -name "*passageiro*.apk" -o -name "*passenger*.apk" 2>/dev/null | head -1)
if [ -n "$APK" ] && command -v aapt2 &>/dev/null; then
  echo -e "  APK encontrado: $APK"
  echo -e "  ${CYAN}Extraindo API_KEY do APK:${NC}"
  aapt2 dump xmltree "$APK" --file AndroidManifest.xml 2>/dev/null | grep -i -A3 "geo.API_KEY\|api_key" || echo "  (nenhum resultado)"
  echo ""
  echo -e "  ${CYAN}Package do APK:${NC}"
  aapt2 dump badging "$APK" 2>/dev/null | grep "package:" | head -1 || echo "  (não encontrado)"
elif [ -n "$APK" ]; then
  echo -e "  APK encontrado: $APK"
  echo -e "  ${RED}aapt2 não disponível. Instale com: sudo apt install aapt${NC}"
else
  echo -e "  ${YELLOW}Nenhum APK encontrado localmente.${NC}"
  echo -e "  Baixe o APK v1.10.21 e coloque na raiz do projeto, depois rode novamente."
  echo -e "  Ou rode no device: adb shell pm path com.kaviar.passenger"
fi
echo ""

# ── ETAPA 4: Verificar EAS secrets ──
echo -e "${YELLOW}[4/6] Verificando EAS secrets...${NC}"
if command -v eas &>/dev/null; then
  echo -e "  ${CYAN}Listando secrets (requer login):${NC}"
  eas secret:list 2>/dev/null || echo -e "  ${YELLOW}Não foi possível listar secrets (faça eas login primeiro)${NC}"
else
  echo -e "  ${YELLOW}EAS CLI não instalado. Rode: npm install -g eas-cli${NC}"
fi
echo ""

# ── ETAPA 5: Comandos de logcat ──
echo -e "${YELLOW}[5/6] Comandos de logcat para executar com device conectado:${NC}"
echo ""
echo -e "  ${CYAN}# 1. Limpar logcat${NC}"
echo -e "  adb logcat -c"
echo ""
echo -e "  ${CYAN}# 2. Capturar logs relevantes (rodar em terminal separado)${NC}"
echo -e '  adb logcat | grep -i -E "Google.Maps|Maps|MapView|API_KEY|Authorization|ReactNative|AndroidRuntime|FATAL|Exception|kaviar|com.google.android.gms"'
echo ""
echo -e "  ${CYAN}# 3. Abrir o app e fazer login${NC}"
echo -e "  adb shell am start -n com.kaviar.passenger/.MainActivity"
echo ""
echo -e "  ${CYAN}# 4. Verificar se o Google Play Services está atualizado${NC}"
echo -e '  adb shell pm dump com.google.android.gms | grep "versionName"'
echo ""

# ── ETAPA 6: Checklist de validação no Google Cloud Console ──
echo -e "${YELLOW}[6/6] Checklist do Google Cloud Console:${NC}"
echo ""
echo -e "  Acesse: https://console.cloud.google.com/apis/credentials"
echo ""
echo -e "  Para a API key ${GREEN}AIzaSyCEuu5sAF1i2e0x5PkyfOiP-bFWjFRwOag${NC}, verifique:"
echo -e "  ${CYAN}□${NC} Maps SDK for Android está HABILITADO no projeto"
echo -e "  ${CYAN}□${NC} A key NÃO tem restrição de API, OU inclui 'Maps SDK for Android'"
echo -e "  ${CYAN}□${NC} A key NÃO tem restrição de app Android, OU inclui:"
echo -e "      Package: ${GREEN}com.kaviar.passenger${NC}"
echo -e "      SHA-1:   ${GREEN}${SHA1:-'(rode o script para ver)'}${NC}"
echo -e "  ${CYAN}□${NC} Billing está ativo no projeto GCP"
echo -e "  ${CYAN}□${NC} Não há quota excedida (verifique em APIs & Services > Dashboard)"
echo ""

echo -e "${CYAN}══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  INTERPRETAÇÃO DOS RESULTADOS${NC}"
echo -e "${CYAN}══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${GREEN}Se o mapa aparece com logo Google mas sem tiles:${NC}"
echo -e "    → API key com restrição incorreta ou billing desativado"
echo ""
echo -e "  ${GREEN}Se NEM o logo Google aparece:${NC}"
echo -e "    → MapView não está renderizando (layout/código)"
echo -e "    → Ou API key vazia/ausente no APK"
echo ""
echo -e "  ${GREEN}Se o fundo vermelho aparece mas sem mapa:${NC}"
echo -e "    → MapView existe mas Google Maps SDK não carrega (API key)"
echo ""
echo -e "  ${GREEN}Se nem fundo vermelho aparece:${NC}"
echo -e "    → O container do mapa está coberto por outro componente"
echo ""
echo -e "  ${GREEN}Se o label verde 'GPS OK' aparece:${NC}"
echo -e "    → GPS funcionou, region está definida"
echo ""
echo -e "  ${GREEN}Se o label vermelho 'FALLBACK' aparece:${NC}"
echo -e "    → GPS falhou, usando região default (Rio de Janeiro)"
echo ""
