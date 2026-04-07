#!/bin/bash

# Executar query via ECS Exec
TASK_ARN=$(aws ecs list-tasks --cluster kaviar-prod --region us-east-1 --output json | jq -r '.taskArns[0]')

echo "Task: $TASK_ARN"

# Criar script SQL temporário
cat > /tmp/check_pass.sql << 'SQL'
SELECT id, email FROM passengers WHERE email LIKE '%beta%2026%';
SELECT * FROM feature_flag_allowlist WHERE key = 'passenger_favorites_matching';
SQL

# Executar via ECS Exec (se habilitado) ou criar um script que roda dentro do container
echo "Verificando passageiros e allowlist no RDS..."
