#!/bin/bash

echo "🚀 KAVIAR Backend - Setup Supabase"
echo "=================================="

# Check if .env exists and has real values
if grep -q "SUBSTITUA" .env 2>/dev/null; then
    echo "❌ Configure o .env com suas credenciais reais do Supabase"
    echo "📖 Consulte: SUPABASE_SETUP.md"
    exit 1
fi

if [ ! -f .env ]; then
    echo "❌ Arquivo .env não encontrado"
    echo "📋 Execute: cp .env.example .env"
    echo "📖 Consulte: SUPABASE_SETUP.md"
    exit 1
fi

echo "1️⃣ Validando conexão com Supabase..."
npm run db:validate

echo ""
echo "2️⃣ Gerando cliente Prisma..."
npm run db:generate

echo ""
echo "3️⃣ Executando migrações..."
npx prisma migrate dev --name init

echo ""
echo "4️⃣ Populando banco com dados iniciais..."
npm run db:seed

echo ""
echo "✅ Setup concluído!"
echo "🔍 Verifique as tabelas em: npx prisma studio"
echo "🚀 Inicie o servidor: npm run dev"
