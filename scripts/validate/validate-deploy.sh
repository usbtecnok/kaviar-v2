#!/bin/bash
# Quick validation after deployment

echo "🔍 Validação Rápida Pós-Deploy"
echo "=============================="
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "⚠️  DATABASE_URL não configurada (usando produção)"
  echo "Configure com: export DATABASE_URL='sua-connection-string'"
  echo ""
fi

echo "1️⃣ Verificando Estrutura do Banco..."
psql "$DATABASE_URL" -t -c "
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'neighborhoods' AND column_name = 'city')
    THEN '✅ Coluna city existe'
    ELSE '❌ Coluna city NÃO existe'
  END;
"

psql "$DATABASE_URL" -t -c "
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'community_leaders')
    THEN '✅ Tabela community_leaders existe'
    ELSE '❌ Tabela community_leaders NÃO existe'
  END;
"

echo ""
echo "2️⃣ Contando Bairros por Cidade..."
psql "$DATABASE_URL" -c "
SELECT 
  city,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE is_verified = true) as verificados
FROM neighborhoods 
GROUP BY city 
ORDER BY city;
"

echo ""
echo "3️⃣ Verificando Líderes Cadastrados..."
psql "$DATABASE_URL" -c "
SELECT 
  verification_status,
  COUNT(*) as total
FROM community_leaders 
GROUP BY verification_status
ORDER BY verification_status;
"

echo ""
echo "4️⃣ Testando API (se backend estiver rodando)..."
if command -v curl &> /dev/null; then
  BACKEND_URL="${BACKEND_URL:-http://localhost:3003}"
  echo "Testando: $BACKEND_URL/health"
  curl -s "$BACKEND_URL/health" | head -n 5 || echo "⚠️  Backend não está respondendo"
else
  echo "⚠️  curl não instalado, pulando teste de API"
fi

echo ""
echo "✅ Validação concluída!"
echo ""
echo "📊 Esperado:"
echo "  - Rio de Janeiro: 163 bairros"
echo "  - São Paulo: 30 bairros"
echo "  - Total: 193 bairros"
echo ""
echo "🌐 Acesse o painel:"
echo "  https://d29p7cirgjqbxl.cloudfront.net"
