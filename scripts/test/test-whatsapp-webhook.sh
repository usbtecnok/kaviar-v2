#!/bin/bash

echo "🧪 Teste WhatsApp Webhook - Crash Fix"
echo "===================================="

BASE_URL="${BASE_URL:-http://localhost:3000}"
WEBHOOK_URL="${BASE_URL}/webhooks/twilio/whatsapp"

echo "📋 1. Teste com payload válido..."
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=whatsapp:+5511999999999" \
  -d "To=whatsapp:+5511888888888" \
  -d "Body=Teste mensagem" \
  -d "MessageSid=SM123456789" \
  -d "NumMedia=0" \
  -w "\nStatus: %{http_code}\n"

echo ""
echo "📋 2. Teste com payload inválido (sem From)..."
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "To=whatsapp:+5511888888888" \
  -d "Body=Teste sem From" \
  -d "MessageSid=SM987654321" \
  -w "\nStatus: %{http_code}\n"

echo ""
echo "📋 3. Teste com payload vazio..."
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -w "\nStatus: %{http_code}\n"

echo ""
echo "✅ Testes concluídos!"
