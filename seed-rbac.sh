#!/bin/bash
# Seed RBAC no RDS - Idempotente
set -euo pipefail

source /home/goes/kaviar/aws-resources.env

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  SEED RBAC NO RDS                                          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Verificar se psql está disponível
if ! command -v psql &> /dev/null; then
  echo "❌ psql não encontrado"
  echo "   Instale: sudo apt-get install postgresql-client"
  exit 1
fi

# Aplicar seed
echo "1️⃣ Aplicando seed SQL..."
psql "$DATABASE_URL" -f /home/goes/kaviar/seed-rbac.sql

echo ""
echo "✅ Seed aplicado com sucesso"
echo ""
echo "📋 Credenciais temporárias:"
echo "   SUPER_ADMIN: z4939ia4"
echo "   ANGEL_VIEWER: 12332100"
echo ""
echo "⚠️  Usuários DEVEM trocar senha no primeiro login"
echo ""
