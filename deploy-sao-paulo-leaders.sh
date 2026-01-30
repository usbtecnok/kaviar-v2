#!/bin/bash
set -e

echo "🚀 Deploy Completo: São Paulo + Líderes Comunitários"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL não configurada"
  echo "Configure com: export DATABASE_URL='sua-connection-string'"
  exit 1
fi

echo -e "${BLUE}📋 Etapa 1: Executar Migration${NC}"
echo "Adicionando coluna city e tabela community_leaders..."
psql "$DATABASE_URL" -f backend/prisma/migrations/20260129_add_city_and_leaders.sql
echo -e "${GREEN}✅ Migration executada${NC}"
echo ""

echo -e "${BLUE}📋 Etapa 2: Atualizar Prisma Client${NC}"
cd backend
npx prisma generate
echo -e "${GREEN}✅ Prisma Client atualizado${NC}"
echo ""

echo -e "${BLUE}📋 Etapa 3: Seed de São Paulo${NC}"
node scripts/seed_sao_paulo.js
echo -e "${GREEN}✅ Bairros de São Paulo importados${NC}"
echo ""

echo -e "${BLUE}📋 Etapa 4: Verificar Dados${NC}"
echo "Contando bairros por cidade..."
psql "$DATABASE_URL" -c "
SELECT 
  city, 
  COUNT(*) as total_bairros,
  COUNT(*) FILTER (WHERE is_verified = true) as verificados
FROM neighborhoods 
GROUP BY city 
ORDER BY city;
"
echo ""

echo "Verificando tabela de líderes..."
psql "$DATABASE_URL" -c "
SELECT COUNT(*) as total_leaders FROM community_leaders;
"
echo ""

echo -e "${BLUE}📋 Etapa 5: Build do Backend${NC}"
npm run build
echo -e "${GREEN}✅ Backend compilado${NC}"
echo ""

cd ..

echo -e "${BLUE}📋 Etapa 6: Build do Frontend${NC}"
cd frontend-app
npm run build
echo -e "${GREEN}✅ Frontend compilado${NC}"
echo ""

cd ..

echo ""
echo -e "${GREEN}✅ DEPLOY COMPLETO!${NC}"
echo ""
echo "📊 Resumo:"
echo "  ✅ Migration executada (city + community_leaders)"
echo "  ✅ Prisma Client atualizado"
echo "  ✅ Bairros de São Paulo importados"
echo "  ✅ Backend compilado"
echo "  ✅ Frontend compilado"
echo ""
echo "🎯 Próximos Passos:"
echo "  1. Deploy do backend para ECS"
echo "  2. Deploy do frontend para S3/CloudFront"
echo "  3. Invalidar cache do CloudFront"
echo ""
echo "📝 Comandos de Deploy:"
echo "  Backend:  ./deploy-backend-ecs.sh"
echo "  Frontend: aws s3 sync frontend-app/dist s3://kaviar-frontend-847895361928/"
echo "  Cache:    aws cloudfront create-invalidation --distribution-id E30XJMSBHGZAGN --paths '/*'"
