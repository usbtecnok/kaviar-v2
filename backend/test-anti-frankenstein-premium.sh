#!/bin/bash

echo "🧪 Teste Anti-Frankenstein: Premium Tourism"
echo "=========================================="

# Script à prova de pasta - funciona de qualquer diretório
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "📋 1. Verificando configuração atual..."
grep "ENABLE_PREMIUM_TOURISM" .env

echo ""
echo "📋 2. Compilando código..."
npm run build > /dev/null 2>&1

echo ""
echo "📋 3. Iniciando servidor com flag OFF..."
ENABLE_PREMIUM_TOURISM=false PORT=3010 node dist/server.js &
SERVER_PID=$!

sleep 5

echo ""
echo "📋 4. Testando endpoints com flag OFF..."
echo "Health check:"
curl -s http://localhost:3010/api/health | jq .features.premium_tourism || echo "Erro"

echo ""
echo "Tour packages (deve falhar):"
curl -s http://localhost:3010/api/governance/tour-packages || echo "Endpoint não acessível (correto!)"

echo ""
echo "📋 5. Parando servidor..."
kill $SERVER_PID 2>/dev/null

echo ""
echo "📋 6. Iniciando servidor com flag ON..."
ENABLE_PREMIUM_TOURISM=true PORT=3010 node dist/server.js &
SERVER_PID=$!

sleep 5

echo ""
echo "📋 7. Testando endpoints com flag ON..."
echo "Health check:"
curl -s http://localhost:3010/api/health | jq .features.premium_tourism || echo "Erro"

echo ""
echo "Tour packages (deve funcionar):"
curl -s http://localhost:3010/api/governance/tour-packages | jq .success || echo "Erro"

echo ""
echo "📋 8. Limpeza..."
kill $SERVER_PID 2>/dev/null

echo ""
echo "✅ Teste concluído!"
