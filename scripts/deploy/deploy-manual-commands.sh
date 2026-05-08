#!/bin/bash

###############################################################################
# 🚀 KAVIAR - DEPLOY SIMPLIFICADO (SEM SCRIPT COMPLEXO)
# Execute comando por comando para garantir que funcione
###############################################################################

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  🚀 KAVIAR - DEPLOY MANUAL PASSO A PASSO                     ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Execute os comandos abaixo UM POR VEZ:${NC}"
echo ""

echo -e "${YELLOW}# 1. Ir para pasta do backend${NC}"
echo "cd /home/goes/kaviar/backend"
echo ""

echo -e "${YELLOW}# 2. Exportar DATABASE_URL${NC}"
echo 'export DATABASE_URL="$DATABASE_URL"'
echo ""

echo -e "${YELLOW}# 3. Verificar conexão${NC}"
echo 'echo "Testando conexão..."'
echo 'npx prisma db execute --stdin <<< "SELECT current_database() as db, version();"'
echo ""

echo -e "${YELLOW}# 4. Gerar Prisma Client${NC}"
echo "npx prisma generate"
echo ""

echo -e "${YELLOW}# 5. Aplicar schema no banco${NC}"
echo "npx prisma db push --accept-data-loss --skip-generate"
echo ""

echo -e "${YELLOW}# 6. Executar migrations SQL customizadas${NC}"
echo 'psql "$DATABASE_URL" -f prisma/migrations/20260129_community_reputation_system.sql'
echo 'psql "$DATABASE_URL" -f prisma/migrations/20260129_reputation_functions.sql'
echo ""

echo -e "${YELLOW}# 7. Seed - Admin padrão${NC}"
echo "npm run db:seed"
echo ""

echo -e "${YELLOW}# 8. Seed - Sistema de Reputação${NC}"
echo "node scripts/seed_reputation_data.js"
echo ""

echo -e "${YELLOW}# 9. Voltar para raiz e fazer commit${NC}"
echo "cd /home/goes/kaviar"
echo "git add ."
echo 'git commit -m "feat: Sistema de Reputação Comunitária Imutável"'
echo "git push origin main"
echo ""

echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Copie e cole os comandos acima no terminal, um por vez!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
