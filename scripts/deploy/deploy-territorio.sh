#!/bin/bash

# ============================================
# DEPLOY: Sistema de Território Inteligente
# Data: 2026-02-05
# ============================================

set -e  # Exit on error

echo "🚀 DEPLOY: Sistema de Território Inteligente"
echo "============================================"
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================
# 1. PRÉ-REQUISITOS
# ============================================

echo "📋 1. Verificando pré-requisitos..."

if [ ! -f ".env" ]; then
  echo -e "${RED}❌ Arquivo .env não encontrado${NC}"
  exit 1
fi

if [ ! -f "migrations/add_territory_system.sql" ]; then
  echo -e "${RED}❌ Migration não encontrada${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Pré-requisitos OK${NC}"
echo ""

# ============================================
# 2. BACKUP DO BANCO
# ============================================

echo "💾 2. Criando backup do banco..."
echo -e "${YELLOW}⚠️  ATENÇÃO: Execute backup manual via Neon Console antes de continuar${NC}"
echo ""
echo "Passos:"
echo "1. Acesse: https://console.neon.tech"
echo "2. Selecione o projeto Kaviar"
echo "3. Vá em 'Backups' → 'Create Backup'"
echo "4. Aguarde conclusão"
echo ""
read -p "Backup criado? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${RED}❌ Deploy cancelado${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Backup confirmado${NC}"
echo ""

# ============================================
# 3. MIGRATION DO BANCO
# ============================================

echo "🗄️  3. Aplicando migration..."
echo -e "${YELLOW}⚠️  ATENÇÃO: Migration deve ser executada manualmente via Neon Console${NC}"
echo ""
echo "Passos:"
echo "1. Acesse: https://console.neon.tech"
echo "2. Selecione o projeto Kaviar"
echo "3. Vá em 'SQL Editor'"
echo "4. Cole o conteúdo de: migrations/add_territory_system.sql"
echo "5. Execute"
echo "6. Verifique mensagens de sucesso"
echo ""
echo "Arquivo: $(pwd)/migrations/add_territory_system.sql"
echo ""
read -p "Migration executada com sucesso? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${RED}❌ Deploy cancelado${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Migration aplicada${NC}"
echo ""

# ============================================
# 4. GERAR PRISMA CLIENT
# ============================================

echo "🔧 4. Gerando Prisma Client..."

cd backend

if ! npx prisma generate; then
  echo -e "${RED}❌ Erro ao gerar Prisma Client${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Prisma Client gerado${NC}"
echo ""

# ============================================
# 5. BUILD DO BACKEND
# ============================================

echo "🏗️  5. Compilando backend..."

if ! npm run build; then
  echo -e "${RED}❌ Erro no build do backend${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Backend compilado${NC}"
echo ""

# ============================================
# 6. VERIFICAÇÃO
# ============================================

echo "✅ 6. Verificando deployment..."

# Verificar se arquivos foram criados
if [ ! -d "dist" ]; then
  echo -e "${RED}❌ Diretório dist não encontrado${NC}"
  exit 1
fi

if [ ! -f "dist/services/territory-service.js" ]; then
  echo -e "${RED}❌ territory-service.js não encontrado${NC}"
  exit 1
fi

if [ ! -f "dist/services/badge-service.js" ]; then
  echo -e "${RED}❌ badge-service.js não encontrado${NC}"
  exit 1
fi

if [ ! -f "dist/routes/neighborhoods-smart.js" ]; then
  echo -e "${RED}❌ neighborhoods-smart.js não encontrado${NC}"
  exit 1
fi

if [ ! -f "dist/routes/driver-territory.js" ]; then
  echo -e "${RED}❌ driver-territory.js não encontrado${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Todos os arquivos compilados${NC}"
echo ""

# ============================================
# 7. RESTART DO SERVIDOR
# ============================================

echo "🔄 7. Reiniciando servidor..."
echo -e "${YELLOW}⚠️  ATENÇÃO: Reinicie o servidor manualmente${NC}"
echo ""
echo "Comandos:"
echo "  PM2: pm2 restart kaviar-backend"
echo "  Docker: docker-compose restart backend"
echo "  Systemd: sudo systemctl restart kaviar-backend"
echo ""
read -p "Servidor reiniciado? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${YELLOW}⚠️  Lembre-se de reiniciar o servidor${NC}"
fi

echo ""

# ============================================
# 8. TESTES DE SANIDADE
# ============================================

echo "🧪 8. Testes de sanidade..."
echo ""
echo "Execute manualmente:"
echo ""
echo "1. Health check:"
echo "   curl http://localhost:3000/api/health"
echo ""
echo "2. Lista de bairros:"
echo "   curl http://localhost:3000/api/neighborhoods/smart-list"
echo ""
echo "3. Dashboard de motorista:"
echo "   curl http://localhost:3000/api/drivers/{driverId}/dashboard"
echo ""
echo "4. Verificar logs:"
echo "   tail -f logs/backend.log"
echo ""

# ============================================
# 9. RESUMO
# ============================================

echo ""
echo "============================================"
echo "✅ DEPLOY CONCLUÍDO"
echo "============================================"
echo ""
echo "📊 Resumo:"
echo "  ✅ Backup criado"
echo "  ✅ Migration aplicada"
echo "  ✅ Prisma Client gerado"
echo "  ✅ Backend compilado"
echo "  ✅ Arquivos verificados"
echo ""
echo "📝 Próximos passos:"
echo "  1. Testar endpoints novos"
echo "  2. Verificar dashboard com territoryInfo"
echo "  3. Testar cadastro de motorista com GPS"
echo "  4. Monitorar logs por 24h"
echo "  5. Implementar frontend"
echo ""
echo "📚 Documentação:"
echo "  - IMPLEMENTACAO_TERRITORIO_INTELIGENTE.md"
echo "  - backend/TERRITORY_API.md"
echo "  - STATUS_TERRITORY_MIGRATION.md"
echo ""
echo "🎯 Novos endpoints:"
echo "  - GET  /api/neighborhoods/smart-list"
echo "  - POST /api/drivers/me/verify-territory"
echo "  - GET  /api/drivers/me/territory-stats"
echo "  - GET  /api/drivers/me/badges"
echo ""
echo "⚠️  Lembre-se:"
echo "  - Migration foi aplicada manualmente"
echo "  - Servidor precisa ser reiniciado"
echo "  - Frontend ainda não implementado"
echo ""
echo -e "${GREEN}🚀 Sistema de Território Inteligente está PRONTO!${NC}"
echo ""
