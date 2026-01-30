#!/bin/bash

# Aplica seed RBAC via ECS Task (executa SQL dentro do container)

source aws-resources.env

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  SEED RBAC VIA ECS TASK                                    ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# 1. Pegar task ID rodando
echo "1️⃣ Buscando task ECS rodando..."
TASK_ARN=$(aws ecs list-tasks \
  --cluster $CLUSTER_NAME \
  --service-name $SERVICE_NAME \
  --region $AWS_REGION \
  --query 'taskArns[0]' \
  --output text)

if [ "$TASK_ARN" = "None" ] || [ -z "$TASK_ARN" ]; then
  echo "   ❌ Nenhuma task rodando"
  exit 1
fi

TASK_ID=$(echo $TASK_ARN | awk -F'/' '{print $NF}')
echo "   ✅ Task encontrada: $TASK_ID"
echo ""

# 2. Executar SQL via ECS exec
echo "2️⃣ Executando seed SQL..."

# Criar SQL inline
SQL_COMMANDS=$(cat seed-rbac.sql)

# Executar via node dentro do container
aws ecs execute-command \
  --cluster $CLUSTER_NAME \
  --task $TASK_ARN \
  --container kaviar-backend \
  --region $AWS_REGION \
  --interactive \
  --command "node -e \"
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  try {
    // SUPER_ADMIN 1
    await prisma.\\\$executeRaw\\\`
      INSERT INTO admins (id, email, password, name, role, must_change_password, created_at, updated_at)
      VALUES (
        gen_random_uuid(),
        'suporte@usbtecnok.com.br',
        '\\\$2b\\\$10\\\$YourHashHere',
        'Suporte USB',
        'SUPER_ADMIN',
        true,
        NOW(),
        NOW()
      )
      ON CONFLICT (email) DO UPDATE SET
        password = EXCLUDED.password,
        must_change_password = true,
        updated_at = NOW()
    \\\`;
    
    console.log('✅ Seed aplicado com sucesso');
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.\\\$disconnect();
  }
}

seed();
\""

echo ""
echo "✅ Seed executado via ECS"
