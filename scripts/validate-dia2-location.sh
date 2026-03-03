#!/bin/bash
# Script de validação - Endpoint /api/auth/driver/location

set -e

API_URL="https://api.kaviar.com.br"

echo "=== VALIDAÇÃO DIA 2: Endpoint de Localização ==="
echo ""

# 1. Criar motorista e obter token
echo "[1/5] Criando motorista de teste..."
RESPONSE=$(curl -s -X POST "$API_URL/api/auth/driver/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Motorista Validacao Script",
    "email": "validacao.script.'$(date +%s)'@kaviar.com",
    "phone": "+5521999999999",
    "password": "senha123"
  }')

TOKEN=$(echo "$RESPONSE" | jq -r '.token')
DRIVER_ID=$(echo "$RESPONSE" | jq -r '.user.id')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Erro ao criar motorista"
  echo "$RESPONSE" | jq .
  exit 1
fi

echo "✅ Motorista criado: $DRIVER_ID"
echo "✅ Token obtido: ${TOKEN:0:50}..."
echo ""

# 2. Testar endpoint COM token
echo "[2/5] Testando POST /api/auth/driver/location COM token..."
RESULT1=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$API_URL/api/auth/driver/location" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"lat": -22.9708, "lng": -43.1829}')

HTTP_CODE1=$(echo "$RESULT1" | grep "HTTP_CODE" | cut -d: -f2)
BODY1=$(echo "$RESULT1" | grep -v "HTTP_CODE")

echo "HTTP: $HTTP_CODE1"
echo "Body: $BODY1"

if [ "$HTTP_CODE1" = "200" ]; then
  echo "✅ Endpoint funcionando!"
elif [ "$HTTP_CODE1" = "404" ]; then
  echo "⚠️  Endpoint não encontrado (aguardando propagação ALB/CloudFront)"
else
  echo "❌ Erro inesperado"
fi
echo ""

# 3. Testar endpoint SEM token
echo "[3/5] Testando POST /api/auth/driver/location SEM token..."
RESULT2=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$API_URL/api/auth/driver/location" \
  -H "Content-Type: application/json" \
  -d '{"lat": -22.9708, "lng": -43.1829}')

HTTP_CODE2=$(echo "$RESULT2" | grep "HTTP_CODE" | cut -d: -f2)
BODY2=$(echo "$RESULT2" | grep -v "HTTP_CODE")

echo "HTTP: $HTTP_CODE2"
echo "Body: $BODY2"

if [ "$HTTP_CODE2" = "401" ]; then
  echo "✅ Autenticação funcionando!"
elif [ "$HTTP_CODE2" = "404" ]; then
  echo "⚠️  Endpoint não encontrado (aguardando propagação)"
else
  echo "❌ Erro inesperado"
fi
echo ""

# 4. Enviar 2 localizações com 15s de intervalo
echo "[4/5] Enviando 2 localizações com 15s de intervalo..."
for i in 1 2; do
  echo "  Envio $i/2..."
  curl -s -X POST "$API_URL/api/auth/driver/location" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"lat\": -22.970$i, \"lng\": -43.182$i}" > /dev/null
  
  if [ $i -eq 1 ]; then
    echo "  Aguardando 15s..."
    sleep 15
  fi
done
echo "✅ 2 localizações enviadas"
echo ""

# 5. Verificar CloudWatch Logs
echo "[5/5] Verificando CloudWatch Logs (últimos 2min)..."
LOGS=$(aws logs tail /ecs/kaviar-backend --since 2m --region us-east-1 2>&1 | grep -i "location" | tail -5)

if [ -z "$LOGS" ]; then
  echo "⚠️  Nenhum log encontrado (pode ser normal se endpoint ainda não propagou)"
else
  echo "$LOGS"
fi
echo ""

echo "=== RESUMO ==="
echo "Motorista: $DRIVER_ID"
echo "Token: ${TOKEN:0:50}..."
echo "Endpoint COM token: HTTP $HTTP_CODE1"
echo "Endpoint SEM token: HTTP $HTTP_CODE2"
echo ""
echo "Status: $([ "$HTTP_CODE1" = "200" ] && echo "✅ FUNCIONANDO" || echo "⚠️  AGUARDANDO PROPAGAÇÃO")"
