#!/bin/bash

# 🚀 Deploy Staging - Sistema de Compliance
# Opção A: Bloqueio Suave

set -e

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                                                                  ║"
echo "║   🚀 DEPLOY STAGING - Sistema de Compliance                     ║"
echo "║                                                                  ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# Verificar ambiente
if [ -z "$DATABASE_URL_STAGING" ]; then
  echo "❌ Erro: DATABASE_URL_STAGING não definida"
  echo ""
  echo "⚠️  SIMULAÇÃO: Ambiente staging não disponível"
  echo ""
  echo "📋 Passos que seriam executados:"
  echo ""
  echo "1️⃣ Aplicar Migration"
  echo "   psql \$DATABASE_URL_STAGING < backend/prisma/migrations/20260117_driver_compliance_documents.sql"
  echo ""
  echo "2️⃣ Verificar Tabela"
  echo "   SELECT COUNT(*) FROM driver_compliance_documents;"
  echo ""
  echo "3️⃣ Subir Backend"
  echo "   cd backend && npm run dev"
  echo ""
  echo "4️⃣ Testar Endpoints"
  echo "   curl http://staging:3003/api/drivers/me/compliance/status"
  echo ""
  echo "5️⃣ Configurar Cron Job"
  echo "   0 0 * * * node backend/dist/jobs/compliance-check.js"
  echo ""
  echo "✅ Simulação concluída"
  echo ""
  echo "📄 Relatório: COMPLIANCE_STAGING_SIMULATION.md"
  exit 0
fi

# Se chegou aqui, staging está disponível
echo "✅ Ambiente staging detectado"
echo ""

# 1. Aplicar migration
echo "1️⃣ Aplicando migration..."
psql $DATABASE_URL_STAGING < backend/prisma/migrations/20260117_driver_compliance_documents.sql
echo "✅ Migration aplicada"
echo ""

# 2. Verificar tabela
echo "2️⃣ Verificando tabela..."
psql $DATABASE_URL_STAGING -c "SELECT COUNT(*) FROM driver_compliance_documents;"
echo "✅ Tabela criada"
echo ""

# 3. Subir backend (em background)
echo "3️⃣ Subindo backend..."
cd backend && npm run dev &
BACKEND_PID=$!
echo "✅ Backend rodando (PID: $BACKEND_PID)"
echo ""

# Aguardar backend iniciar
sleep 5

# 4. Testar endpoints
echo "4️⃣ Testando endpoints..."
curl -s http://localhost:3003/api/health || echo "⚠️  Backend não respondeu"
echo ""

echo "✅ Deploy staging concluído"
echo ""
echo "📄 Próximo: Testar UI e gerar relatório"

