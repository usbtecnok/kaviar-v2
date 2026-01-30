#!/bin/bash
# COMANDOS EXATOS PARA DEPLOY FINAL
# Execute linha por linha ou rode o script completo

set -e

echo "🚀 DEPLOY FINAL - São Paulo + Líderes Comunitários"
echo "=================================================="
echo ""
echo "⚠️  IMPORTANTE: Este script vai modificar o banco de produção!"
echo "Pressione ENTER para continuar ou Ctrl+C para cancelar..."
read

# Configurar DATABASE_URL (sem parâmetros pgbouncer para psql)
export DATABASE_URL="postgresql://neondb_owner:npg_2xbfMWRF6hrO@ep-wispy-thunder-ad850l5j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"

echo ""
echo "📋 ETAPA 1/7: Executando Migration..."
psql "$DATABASE_URL" -f backend/prisma/migrations/20260129_add_city_and_leaders.sql
echo "✅ Migration concluída"
echo ""

echo "📋 ETAPA 2/7: Atualizando Prisma Client..."
cd backend
npx prisma generate
echo "✅ Prisma Client atualizado"
echo ""

echo "📋 ETAPA 3/7: Importando Bairros de São Paulo..."
node scripts/seed_sao_paulo.js
echo "✅ São Paulo importado"
echo ""

echo "📋 ETAPA 4/7: Compilando Backend..."
npm run build
echo "✅ Backend compilado"
echo ""

echo "📋 ETAPA 5/7: Compilando Frontend..."
cd ../frontend-app
npm run build
echo "✅ Frontend compilado"
echo ""

echo "📋 ETAPA 6/7: Deploy do Frontend para S3..."
aws s3 sync dist s3://kaviar-frontend-847895361928/ \
  --region us-east-2 \
  --delete \
  --cache-control "max-age=31536000,public" \
  --exclude "index.html" \
  --exclude "*.map"

# index.html sem cache
aws s3 cp dist/index.html s3://kaviar-frontend-847895361928/index.html \
  --region us-east-2 \
  --cache-control "no-cache,no-store,must-revalidate"

echo "✅ Frontend no S3"
echo ""

echo "📋 ETAPA 7/7: Invalidando Cache do CloudFront..."
aws cloudfront create-invalidation \
  --distribution-id E30XJMSBHGZAGN \
  --paths "/*" \
  --region us-east-1
echo "✅ Cache invalidado"
echo ""

cd ..

echo ""
echo "🎉 DEPLOY CONCLUÍDO COM SUCESSO!"
echo ""
echo "📊 Validando resultado..."
./validate-deploy.sh

echo ""
echo "🌐 Acesse agora:"
echo "   https://d29p7cirgjqbxl.cloudfront.net"
echo ""
echo "🔐 Login Admin:"
echo "   Email: admin@kaviar.com"
echo "   Senha: admin123"
echo ""
echo "📍 Verifique:"
echo "   1. Menu 'Lideranças Comunitárias' aparece"
echo "   2. Filtro de cidade mostra 'Rio de Janeiro' e 'São Paulo'"
echo "   3. Cadastro de líder funciona"
echo ""
echo "⚠️  NOTA: O backend precisa ser deployado separadamente via:"
echo "   git push origin main (GitHub Actions)"
echo "   ou"
echo "   ./deploy-backend-ecs.sh (manual)"
