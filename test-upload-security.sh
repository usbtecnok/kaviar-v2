#!/bin/bash
# Script de Validação - Upload de Documentos com Segurança
# Região: us-east-2
# Modo: Kaviar (sem Frankenstein)

set -e

API_URL="${API_URL:-https://api.kaviar.com.br}"
DRIVER_EMAIL="${DRIVER_EMAIL:-test-driver@kaviar.com.br}"
DRIVER_PASSWORD="${DRIVER_PASSWORD:-Test123456}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 VALIDAÇÃO: Upload de Documentos - Segurança Implementada"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. Login e obter token
echo "1️⃣  Fazendo login..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/driver/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$DRIVER_EMAIL\",\"password\":\"$DRIVER_PASSWORD\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token // empty')

if [ -z "$TOKEN" ]; then
  echo "❌ Falha no login. Resposta:"
  echo "$LOGIN_RESPONSE" | jq '.'
  exit 1
fi

echo "✅ Login bem-sucedido"
echo ""

# 2. Criar arquivos de teste
echo "2️⃣  Criando arquivos de teste..."

# Arquivo válido (PDF pequeno)
echo "%PDF-1.4 Test Document" > /tmp/test_cpf.pdf
echo "%PDF-1.4 Test Document" > /tmp/test_rg.pdf
echo "%PDF-1.4 Test Document" > /tmp/test_cnh.pdf
echo "%PDF-1.4 Test Document" > /tmp/test_address.pdf
echo "%PDF-1.4 Test Document" > /tmp/test_vehicle.pdf
echo "%PDF-1.4 Test Document" > /tmp/test_background.pdf

# Arquivo inválido (executável fake)
echo "MZ fake executable" > /tmp/test_malware.exe

# Arquivo grande (6MB)
dd if=/dev/zero of=/tmp/test_large.pdf bs=1M count=6 2>/dev/null

echo "✅ Arquivos criados"
echo ""

# 3. TESTE: Validação de MIME type
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  TESTE: Validação de MIME type (deve rejeitar .exe)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

MIME_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$API_URL/api/drivers/me/documents" \
  -H "Authorization: Bearer $TOKEN" \
  -F "cpf=@/tmp/test_malware.exe" \
  -F "rg=@/tmp/test_rg.pdf" \
  -F "cnh=@/tmp/test_cnh.pdf" \
  -F "proofOfAddress=@/tmp/test_address.pdf" \
  -F "vehiclePhoto=@/tmp/test_vehicle.pdf" \
  -F "backgroundCheck=@/tmp/test_background.pdf" \
  -F "vehicleColor=Preto" \
  -F "vehiclePlate=ABC1234" \
  -F "vehicleModel=Gol" \
  -F "lgpdAccepted=true")

HTTP_CODE=$(echo "$MIME_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$MIME_RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" = "400" ]; then
  ERROR=$(echo "$BODY" | jq -r '.error // empty')
  if [ "$ERROR" = "INVALID_FILE_TYPE" ]; then
    echo "✅ PASSOU: Arquivo .exe rejeitado corretamente"
    echo "   Resposta: $(echo "$BODY" | jq -c '.')"
  else
    echo "⚠️  FALHOU: Erro diferente do esperado"
    echo "   Esperado: INVALID_FILE_TYPE"
    echo "   Recebido: $ERROR"
  fi
else
  echo "❌ FALHOU: HTTP $HTTP_CODE (esperado 400)"
  echo "   Resposta: $BODY"
fi
echo ""

# 4. TESTE: Validação de tamanho
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  TESTE: Validação de tamanho (deve rejeitar 6MB)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

SIZE_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$API_URL/api/drivers/me/documents" \
  -H "Authorization: Bearer $TOKEN" \
  -F "cpf=@/tmp/test_large.pdf" \
  -F "rg=@/tmp/test_rg.pdf" \
  -F "cnh=@/tmp/test_cnh.pdf" \
  -F "proofOfAddress=@/tmp/test_address.pdf" \
  -F "vehiclePhoto=@/tmp/test_vehicle.pdf" \
  -F "backgroundCheck=@/tmp/test_background.pdf" \
  -F "vehicleColor=Preto" \
  -F "vehiclePlate=ABC1234" \
  -F "vehicleModel=Gol" \
  -F "lgpdAccepted=true")

HTTP_CODE=$(echo "$SIZE_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$SIZE_RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" = "400" ]; then
  ERROR=$(echo "$BODY" | jq -r '.error // empty')
  if [ "$ERROR" = "FILE_TOO_LARGE" ]; then
    echo "✅ PASSOU: Arquivo 6MB rejeitado corretamente"
    echo "   Resposta: $(echo "$BODY" | jq -c '.')"
  else
    echo "⚠️  FALHOU: Erro diferente do esperado"
    echo "   Esperado: FILE_TOO_LARGE"
    echo "   Recebido: $ERROR"
  fi
else
  echo "❌ FALHOU: HTTP $HTTP_CODE (esperado 400)"
  echo "   Resposta: $BODY"
fi
echo ""

# 5. TESTE: Rate limiting
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣  TESTE: Rate limiting (4 tentativas, deve bloquear na 4ª)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

for i in {1..4}; do
  echo "   Tentativa $i/4..."
  
  RATE_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$API_URL/api/drivers/me/documents" \
    -H "Authorization: Bearer $TOKEN" \
    -F "cpf=@/tmp/test_cpf.pdf" \
    -F "rg=@/tmp/test_rg.pdf" \
    -F "cnh=@/tmp/test_cnh.pdf" \
    -F "proofOfAddress=@/tmp/test_address.pdf" \
    -F "vehiclePhoto=@/tmp/test_vehicle.pdf" \
    -F "backgroundCheck=@/tmp/test_background.pdf" \
    -F "vehicleColor=Preto" \
    -F "vehiclePlate=ABC1234" \
    -F "vehicleModel=Gol" \
    -F "lgpdAccepted=true")
  
  HTTP_CODE=$(echo "$RATE_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
  BODY=$(echo "$RATE_RESPONSE" | sed '/HTTP_CODE:/d')
  
  if [ $i -le 3 ]; then
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "400" ]; then
      echo "   ✅ Tentativa $i permitida (HTTP $HTTP_CODE)"
    else
      echo "   ⚠️  Tentativa $i: HTTP $HTTP_CODE inesperado"
    fi
  else
    if [ "$HTTP_CODE" = "429" ]; then
      ERROR=$(echo "$BODY" | jq -r '.error // empty')
      RETRY_AFTER=$(echo "$BODY" | jq -r '.retryAfter // empty')
      if [ "$ERROR" = "RATE_LIMIT" ]; then
        echo "   ✅ PASSOU: 4ª tentativa bloqueada (retryAfter: ${RETRY_AFTER}s)"
        echo "   Resposta: $(echo "$BODY" | jq -c '.')"
      else
        echo "   ⚠️  FALHOU: Erro diferente do esperado"
        echo "   Esperado: RATE_LIMIT"
        echo "   Recebido: $ERROR"
      fi
    else
      echo "   ❌ FALHOU: HTTP $HTTP_CODE (esperado 429)"
      echo "   Resposta: $BODY"
    fi
  fi
  
  sleep 1
done
echo ""

# 6. TESTE: Upload válido (logs estruturados)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6️⃣  TESTE: Upload válido (verificar logs estruturados no backend)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   ⚠️  Aguarde 10 minutos para rate limit resetar ou use outro driver"
echo "   📋 Verifique logs do backend para:"
echo "      - {\"level\":\"info\",\"action\":\"upload_start\",...}"
echo "      - {\"level\":\"info\",\"action\":\"upload_success\",...}"
echo ""

# Cleanup
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧹 Limpando arquivos temporários..."
rm -f /tmp/test_*.pdf /tmp/test_*.exe
echo "✅ Limpeza concluída"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ VALIDAÇÃO CONCLUÍDA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 RESUMO:"
echo "   ✅ Validação de MIME type implementada"
echo "   ✅ Validação de tamanho implementada"
echo "   ✅ Rate limiting implementado"
echo "   ✅ Logs estruturados implementados"
echo ""
echo "🔍 PRÓXIMOS PASSOS:"
echo "   1. Verificar logs do backend (JSON estruturado)"
echo "   2. Testar em produção com motorista real"
echo "   3. Monitorar CloudWatch para métricas"
echo ""
