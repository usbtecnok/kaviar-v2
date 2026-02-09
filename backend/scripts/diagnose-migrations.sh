#!/bin/bash
# Script para diagnosticar migrations no banco PROD via ECS

set -e

echo "=== DIAGNÓSTICO: Prisma Migrations em PROD ==="
echo ""

# SQL de diagnóstico
cat > /tmp/diagnose.sql << 'EOSQL'
-- 1) Prisma migrations existe?
SELECT to_regclass('public._prisma_migrations') as prisma_migrations_table;

-- 2) Se existir, listar as migrations registradas
SELECT migration_name, finished_at, applied_steps_count, rolled_back_at
FROM public._prisma_migrations
ORDER BY finished_at NULLS LAST;

-- 3) Verificar tabela de favoritos e colunas atuais
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name='passenger_favorite_locations'
ORDER BY ordinal_position;

-- 4) Verificar constraints existentes
SELECT conname, contype, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'passenger_favorite_locations'::regclass;

-- 5) Verificar índices
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'passenger_favorite_locations';
EOSQL

# Executar via Prisma CLI (que tem acesso ao RDS)
cd /app
npx prisma db execute --file /tmp/diagnose.sql --schema prisma/schema.prisma
