#!/bin/bash
# Deploy de Correções Críticas - Métricas do Motorista
# Região: us-east-2
# Data: 2026-02-05

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 DEPLOY: Correções Críticas - Métricas do Motorista"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd /home/goes/kaviar/backend

# 1. Backup do schema atual
echo "1️⃣  Criando backup do schema..."
cp prisma/schema.prisma prisma/schema.prisma.backup.$(date +%Y%m%d_%H%M%S)
echo "✅ Backup criado"
echo ""

# 2. Gerar Prisma Client
echo "2️⃣  Gerando Prisma Client..."
npm run db:generate
echo "✅ Prisma Client gerado"
echo ""

# 3. Aplicar migration no banco
echo "3️⃣  Aplicando migration no banco de dados..."
echo "   ⚠️  Isso vai adicionar campos em rides e match_logs"
read -p "   Continuar? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  # Aplicar migration SQL
  if [ -f "migrations/add_metrics_fields.sql" ]; then
    echo "   Executando migration..."
    psql $DATABASE_URL -f migrations/add_metrics_fields.sql
    echo "✅ Migration aplicada"
  else
    echo "❌ Arquivo de migration não encontrado"
    exit 1
  fi
else
  echo "❌ Deploy cancelado"
  exit 1
fi
echo ""

# 4. Build do backend
echo "4️⃣  Compilando backend..."
npm run build
echo "✅ Backend compilado"
echo ""

# 5. Restart do servidor
echo "5️⃣  Reiniciando servidor..."
if command -v pm2 &> /dev/null; then
  pm2 restart kaviar-backend
  echo "✅ Servidor reiniciado (PM2)"
else
  echo "⚠️  PM2 não encontrado. Reinicie manualmente."
fi
echo ""

# 6. Validação
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6️⃣  VALIDAÇÃO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verificar se campos foram criados
echo "Verificando campos em rides..."
psql $DATABASE_URL -c "\d rides" | grep -E "platform_fee_percentage|match_type|pickup_neighborhood_id"

if [ $? -eq 0 ]; then
  echo "✅ Campos criados com sucesso"
else
  echo "❌ Campos não encontrados"
  exit 1
fi
echo ""

# Verificar índices
echo "Verificando índices..."
psql $DATABASE_URL -c "\di" | grep -E "idx_rides_driver_created|idx_match_logs_ride"

if [ $? -eq 0 ]; then
  echo "✅ Índices criados com sucesso"
else
  echo "⚠️  Alguns índices podem estar faltando"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DEPLOY CONCLUÍDO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo "   1. Testar dashboard: GET /api/drivers/:id/dashboard"
echo "   2. Testar earnings: GET /api/drivers/me/earnings"
echo "   3. Verificar logs do backend"
echo "   4. Monitorar erros no CloudWatch"
echo ""
echo "⚠️  IMPORTANTE:"
echo "   - Campos novos estão NULL para corridas antigas"
echo "   - Novas corridas devem preencher platform_fee_percentage e match_type"
echo "   - Atualizar código de criação de corridas para usar novos campos"
echo ""
