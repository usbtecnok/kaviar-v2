# 🧪 Como Testar - 100% Executável (IDs Automáticos)

## Script Automatizado

Execute o script de teste completo:

```bash
cd backend
chmod +x test-premium-tourism-final.sh
./test-premium-tourism-final.sh
```

## Script Manual (passo a passo)

```bash
#!/bin/bash
set -e

echo "🧪 Testando Premium Tourism - Validações + Transições"

# Verificar se jq está instalado
if ! command -v jq &> /dev/null; then
  echo "❌ jq não está instalado. Instale com: sudo apt-get install jq"
  exit 1
fi

# Trap para cleanup automático
trap 'rm -f /tmp/invalid.json /tmp/transition_error.json' EXIT

BASE_URL="http://localhost:3001"

# 1. Obter token admin
echo "🔑 Obtendo token admin..."
ADMIN_TOKEN=$(curl -s -X POST "$BASE_URL/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@kaviar.com","password":"<ADMIN_PASSWORD>"}' | jq -r '.token')

if [ "$ADMIN_TOKEN" = "null" ] || [ -z "$ADMIN_TOKEN" ]; then
  echo "❌ Falha ao obter token admin"
  exit 1
fi

# 2. Criar TourPackage com type=TOUR ✅
echo "📦 Criando pacote TOUR..."
PACKAGE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/admin/tour-packages" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"title":"City Tour","description":"Tour pela cidade","type":"TOUR","partnerName":"Partner A","basePrice":150,"locations":["Centro"],"estimatedDurationMinutes":180}')

PACKAGE_ID=$(echo "$PACKAGE_RESPONSE" | jq -r '.package.id')

if [ "$PACKAGE_ID" = "null" ] || [ -z "$PACKAGE_ID" ]; then
  echo "❌ Falha ao criar pacote TOUR"
  echo "$PACKAGE_RESPONSE" | jq .
  exit 1
fi

echo "✅ Pacote criado: $PACKAGE_ID"

# 3. Criar TourPackage com type=AIRPORT_TRANSFER ✅
echo "✈️ Criando pacote AIRPORT_TRANSFER..."
TRANSFER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/admin/tour-packages" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"title":"Airport Transfer","description":"Transfer aeroporto","type":"AIRPORT_TRANSFER","partnerName":"Partner B","basePrice":80,"locations":["Aeroporto"],"estimatedDurationMinutes":60}')

TRANSFER_ID=$(echo "$TRANSFER_RESPONSE" | jq -r '.package.id')

if [ "$TRANSFER_ID" = "null" ] || [ -z "$TRANSFER_ID" ]; then
  echo "❌ Falha ao criar pacote AIRPORT_TRANSFER"
  echo "$TRANSFER_RESPONSE" | jq .
  exit 1
fi

echo "✅ Transfer criado: $TRANSFER_ID"

# 4. Tentar type inválido (deve retornar 400) ❌
echo "🚫 Testando type inválido..."
HTTP_CODE=$(curl -s -o /tmp/invalid.json -w "%{http_code}" -X POST "$BASE_URL/api/admin/tour-packages" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"title":"Bus Tour","description":"Tour de ônibus","type":"BUS","partnerName":"Partner C","basePrice":100,"locations":["Cidade"],"estimatedDurationMinutes":120}')

if [ "$HTTP_CODE" = "400" ]; then
  echo "✅ Type inválido rejeitado com 400"
  echo "Body do erro:"
  cat /tmp/invalid.json | jq .
else
  echo "❌ Esperado 400, recebido $HTTP_CODE"
  cat /tmp/invalid.json | jq .
fi

# 5. Obter passenger ID automaticamente
echo "👤 Obtendo passenger ID..."
PASSENGERS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/admin/passengers" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

PASSENGER_ID=$(echo "$PASSENGERS_RESPONSE" | jq -r '.data[0].id')

if [ "$PASSENGER_ID" = "null" ] || [ -z "$PASSENGER_ID" ]; then
  echo "❌ Nenhum passenger encontrado. Criar um passenger primeiro."
  echo "$PASSENGERS_RESPONSE" | jq .
  exit 1
fi

echo "✅ Passenger ID: $PASSENGER_ID"

# 6. Criar booking (status deve vir REQUESTED) ✅
echo "📅 Criando booking..."
BOOKING_RESPONSE=$(curl -s -X POST "$BASE_URL/api/governance/tour-bookings" \
  -H "Content-Type: application/json" \
  -d "{\"packageId\":\"$PACKAGE_ID\",\"passengerId\":\"$PASSENGER_ID\",\"scheduledAt\":\"2026-01-10T10:00:00Z\",\"pickupLocation\":\"Hotel ABC\"}")

BOOKING_ID=$(echo "$BOOKING_RESPONSE" | jq -r '.booking.id')

if [ "$BOOKING_ID" = "null" ] || [ -z "$BOOKING_ID" ]; then
  echo "❌ Falha ao criar booking"
  echo "$BOOKING_RESPONSE" | jq .
  exit 1
fi

echo "✅ Booking criado: $BOOKING_ID"

# 7. Atualizar REQUESTED → CONFIRMED ✅
echo "✅ Atualizando para CONFIRMED..."
CONFIRM_RESPONSE=$(curl -s -X PATCH "$BASE_URL/api/admin/tour-bookings/$BOOKING_ID/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"status":"CONFIRMED"}')

CONFIRM_MESSAGE=$(echo "$CONFIRM_RESPONSE" | jq -r '.message')

if [ "$CONFIRM_MESSAGE" = "null" ] || [ -z "$CONFIRM_MESSAGE" ]; then
  echo "❌ Resposta CONFIRMED sem message"
  echo "$CONFIRM_RESPONSE" | jq .
  exit 1
fi

echo "$CONFIRM_MESSAGE"

# 8. Atualizar CONFIRMED → COMPLETED ✅
echo "🏁 Atualizando para COMPLETED..."
COMPLETE_RESPONSE=$(curl -s -X PATCH "$BASE_URL/api/admin/tour-bookings/$BOOKING_ID/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"status":"COMPLETED"}')

COMPLETE_MESSAGE=$(echo "$COMPLETE_RESPONSE" | jq -r '.message')

if [ "$COMPLETE_MESSAGE" = "null" ] || [ -z "$COMPLETE_MESSAGE" ]; then
  echo "❌ Resposta COMPLETED sem message"
  echo "$COMPLETE_RESPONSE" | jq .
  exit 1
fi

echo "$COMPLETE_MESSAGE"

# 9. Tentar COMPLETED → CONFIRMED (deve retornar 409) ❌
echo "🚫 Testando transição inválida (COMPLETED → CONFIRMED)..."
HTTP_CODE=$(curl -s -o /tmp/transition_error.json -w "%{http_code}" -X PATCH "$BASE_URL/api/admin/tour-bookings/$BOOKING_ID/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"status":"CONFIRMED"}')

if [ "$HTTP_CODE" = "409" ]; then
  echo "✅ Transição inválida rejeitada com 409"
  echo "Body do erro:"
  cat /tmp/transition_error.json | jq .
else
  echo "❌ Esperado 409, recebido $HTTP_CODE"
  cat /tmp/transition_error.json | jq .
fi

echo ""
echo "🎉 Todos os testes concluídos!"
echo "📦 Pacotes criados: $PACKAGE_ID, $TRANSFER_ID"
echo "📅 Booking testado: $BOOKING_ID"
```

## Resultados Esperados

```
🧪 Testando Premium Tourism - Validações + Transições
🔑 Obtendo token admin...
📦 Criando pacote TOUR...
✅ Pacote criado: clxxx123
✈️ Criando pacote AIRPORT_TRANSFER...
✅ Transfer criado: clxxx456
🚫 Testando type inválido...
✅ Type inválido rejeitado com 400
Body do erro:
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Invalid TourPackage.type. Must be TOUR or AIRPORT_TRANSFER"
}
👤 Obtendo passenger ID...
✅ Passenger ID: clxxx789
📅 Criando booking...
✅ Booking criado: clxxx012
✅ Atualizando para CONFIRMED...
Tour booking status updated to CONFIRMED
🏁 Atualizando para COMPLETED...
Tour booking status updated to COMPLETED
🚫 Testando transição inválida (COMPLETED → CONFIRMED)...
✅ Transição inválida rejeitada com 409
Body do erro:
{
  "success": false,
  "error": "INVALID_STATUS_TRANSITION",
  "message": "Invalid status transition from COMPLETED to CONFIRMED"
}

🎉 Todos os testes concluídos!
📦 Pacotes criados: clxxx123, clxxx456
📅 Booking testado: clxxx012
```

## Melhorias do Script Final

**✅ Verificação de dependências:**
- Checa se `jq` está instalado antes de executar

**✅ Cleanup automático:**
- `trap` remove arquivos temporários mesmo se script falhar

**✅ Validação de responses:**
- Valida que `.message` não vem vazia nos PATCH
- Exibe response completo e aborta se message estiver vazia

**✅ Validação robusta de IDs:**
- Checa null E string vazia para todos os IDs
- Exibe response completo em caso de falha
