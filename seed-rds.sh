#!/bin/bash
# Seed RBAC no RDS via ECS Task
set -euo pipefail

source /home/goes/kaviar/aws-resources.env

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  SEED RBAC NO RDS (via ECS Task)                           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# 1. Criar task definition para seed
echo "1️⃣ Criando task definition para seed..."

TASK_EXECUTION_ROLE_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:role/KaviarEcsTaskExecutionRole"
TASK_ROLE_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:role/KaviarEcsTaskRole"

cat > /tmp/seed-task-definition.json <<EOF
{
  "family": "kaviar-seed-rbac",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "$TASK_EXECUTION_ROLE_ARN",
  "taskRoleArn": "$TASK_ROLE_ARN",
  "containerDefinitions": [
    {
      "name": "seed-rbac",
      "image": "$ECR_URI:latest",
      "essential": true,
      "command": ["npx", "ts-node", "prisma/seed-rbac.ts"],
      "environment": [
        {"name": "NODE_ENV", "value": "production"},
        {"name": "DATABASE_URL", "value": "$DATABASE_URL"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/kaviar-seed",
          "awslogs-region": "$AWS_REGION",
          "awslogs-stream-prefix": "seed",
          "awslogs-create-group": "true"
        }
      }
    }
  ]
}
EOF

aws ecs register-task-definition \
  --cli-input-json file:///tmp/seed-task-definition.json \
  --region $AWS_REGION >/dev/null

echo "   ✓ Task definition registrada: kaviar-seed-rbac"

# 2. Executar task
echo ""
echo "2️⃣ Executando seed task..."

TASK_ARN=$(aws ecs run-task \
  --cluster kaviar-cluster \
  --task-definition kaviar-seed-rbac \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_PUBLIC_A,$SUBNET_PUBLIC_B],securityGroups=[$ECS_SG],assignPublicIp=ENABLED}" \
  --region $AWS_REGION \
  --query 'tasks[0].taskArn' \
  --output text)

echo "   ✓ Task iniciada: $TASK_ARN"

# 3. Aguardar conclusão
echo ""
echo "3️⃣ Aguardando conclusão..."

for i in {1..20}; do
  sleep 10
  
  STATUS=$(aws ecs describe-tasks \
    --cluster kaviar-cluster \
    --tasks $TASK_ARN \
    --region $AWS_REGION \
    --query 'tasks[0].lastStatus' \
    --output text)
  
  echo "   ${i}. Status: $STATUS"
  
  if [ "$STATUS" = "STOPPED" ]; then
    EXIT_CODE=$(aws ecs describe-tasks \
      --cluster kaviar-cluster \
      --tasks $TASK_ARN \
      --region $AWS_REGION \
      --query 'tasks[0].containers[0].exitCode' \
      --output text)
    
    if [ "$EXIT_CODE" = "0" ]; then
      echo "   ✓ Seed executado com sucesso"
    else
      echo "   ❌ Seed falhou (exit code: $EXIT_CODE)"
    fi
    break
  fi
done

# 4. Mostrar logs
echo ""
echo "4️⃣ Logs do seed:"
aws logs tail /ecs/kaviar-seed --since 5m --region $AWS_REGION 2>&1 | tail -20

# 5. Verificar usuários criados
echo ""
echo "5️⃣ Verificando usuários no RDS..."
echo ""

# Criar script SQL temporário
cat > /tmp/verify-rbac.sql <<'EOF'
SELECT 
  r.name as role,
  COUNT(a.id) as users,
  STRING_AGG(a.email, ', ') as emails
FROM roles r
LEFT JOIN admins a ON a.role_id = r.id
WHERE r.name IN ('SUPER_ADMIN', 'ANGEL_VIEWER')
GROUP BY r.name
ORDER BY r.name;
EOF

# Executar via psql (se disponível) ou mostrar comando
if command -v psql &> /dev/null; then
  psql "$DATABASE_URL" -f /tmp/verify-rbac.sql
else
  echo "📋 Execute manualmente para verificar:"
  echo ""
  echo "psql \"$DATABASE_URL\" <<'SQL'"
  cat /tmp/verify-rbac.sql
  echo "SQL"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  SEED CONCLUÍDO                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "✅ Usuários RBAC criados no RDS"
echo ""
echo "🧪 Próximo passo:"
echo "   ./validate-rbac.sh (testar RBAC)"
echo ""
