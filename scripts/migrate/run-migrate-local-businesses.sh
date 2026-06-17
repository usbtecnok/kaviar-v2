#!/bin/bash
# Wrapper para rodar a migração local_businesses → commerce_accounts
# O script TypeScript está em backend/src/scripts/ para resolver @prisma/client corretamente.
#
# Uso:
#   ./scripts/migrate/run-migrate-local-businesses.sh          # dry-run
#   ./scripts/migrate/run-migrate-local-businesses.sh --execute # aplicar

set -e
cd "$(dirname "$0")/../../backend"

set -a
source .env 2>/dev/null || true
set +a

npx ts-node --compiler-options '{"module":"commonjs","moduleResolution":"node","esModuleInterop":true,"skipLibCheck":true}' \
  src/scripts/migrate-local-businesses-to-commerce.ts "$@"
