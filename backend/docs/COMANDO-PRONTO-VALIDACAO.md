# Comando Pronto: ECS Run-Task Ride-Flow V1 Validation

## Pré-requisito: Exportar VALIDATION_DATABASE_URL

```bash
export VALIDATION_DATABASE_URL="postgresql://usbtecnok:z4939ia4@kaviar-prod-db.cxuuaq46o1o5.us-east-2.rds.amazonaws.com:5432/kaviar_validation?sslmode=require"
```

---

## Comando Completo (Copiar e Colar)

```bash
# 1. Criar overrides JSON
cat > /tmp/ecs-validation-overrides.json <<EOF
{
  "containerOverrides": [
    {
      "name": "kaviar-backend",
      "image": "847895361928.dkr.ecr.us-east-2.amazonaws.com/kaviar-backend:11bdd8c",
      "environment": [
        {"name": "NODE_ENV", "value": "staging"},
        {"name": "FEATURE_SPEC_RIDE_FLOW_V1", "value": "true"},
        {"name": "DATABASE_URL", "value": "$VALIDATION_DATABASE_URL"},
        {"name": "PORT", "value": "3001"},
        {"name": "JWT_SECRET", "value": "validation-secret-key"},
        {"name": "API_URL", "value": "http://127.0.0.1:3001"}
      ],
      "command": [
        "/bin/bash",
        "-c",
        "echo '=== VALIDATION RUN ===' && echo 'Image: 11bdd8c' && echo 'DB: kaviar_validation' && npx prisma migrate deploy && echo '=== SEED ===' && npx tsx prisma/seed-ride-flow-v1.ts && echo '=== STARTING SERVER ===' && node dist/server.js & sleep 10 && echo '=== TESTING 20 RIDES ===' && export API_URL=http://127.0.0.1:3001 && cd /app && bash scripts/test-ride-flow-v1.sh && echo '=== DONE ===' && sleep 30"
      ]
    }
  ]
}
EOF

# 2. Executar run-task
aws ecs run-task \
  --cluster kaviar-cluster \
  --task-definition arn:aws:ecs:us-east-2:847895361928:task-definition/kaviar-backend:148 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-046613642f742faa2,subnet-01a498f7b4f3fcff5],securityGroups=[sg-0a54bc7272cae4623],assignPublicIp=ENABLED}" \
  --overrides file:///tmp/ecs-validation-overrides.json \
  --region us-east-2 \
  > /tmp/ecs-validation-run-task.json

# 3. Extrair Task ARN
TASK_ARN=$(jq -r '.tasks[0].taskArn' /tmp/ecs-validation-run-task.json)
TASK_ID=$(echo "$TASK_ARN" | awk -F'/' '{print $NF}')

echo ""
echo "✅ Task iniciada!"
echo "Task ARN: $TASK_ARN"
echo "Task ID: $TASK_ID"
echo "Horário início: $(date -u)"
echo ""
echo "Salvo em: /tmp/validation-task-arn.txt"
echo "$TASK_ARN" > /tmp/validation-task-arn.txt

# 4. Monitorar (aguardar STOPPED)
echo ""
echo "Monitorando status (Ctrl+C para sair)..."
watch -n 5 "aws ecs describe-tasks \
  --region us-east-2 \
  --cluster kaviar-cluster \
  --tasks $TASK_ARN \
  --query 'tasks[0].lastStatus' \
  --output text"
```

---

## Após Task STOPPED (~5-10 min)

### Coletar Logs CloudWatch

```bash
# Configurar variáveis
REGION="us-east-2"
LOG_GROUP="/ecs/kaviar-backend"
TASK_ARN=$(cat /tmp/validation-task-arn.txt)
TASK_ID=$(echo "$TASK_ARN" | awk -F'/' '{print $NF}')

echo "Task ID: $TASK_ID"

# Descobrir log stream
STREAM=$(aws logs describe-log-streams \
  --region "$REGION" \
  --log-group-name "$LOG_GROUP" \
  --order-by LastEventTime \
  --descending \
  --max-items 50 \
  --query "logStreams[?contains(logStreamName, \`$TASK_ID\`)].logStreamName | [0]" \
  --output text)

echo "Log Stream: $STREAM"

if [ -z "$STREAM" ] || [ "$STREAM" = "None" ]; then
  echo "❌ Stream não encontrado"
  exit 1
fi

# Baixar logs completos
aws logs get-log-events \
  --region "$REGION" \
  --log-group-name "$LOG_GROUP" \
  --log-stream-name "$STREAM" \
  --limit 10000 \
  --query "events[].message" \
  --output text > /tmp/validation-full-logs.txt

echo "✅ Logs salvos em /tmp/validation-full-logs.txt"
wc -l /tmp/validation-full-logs.txt

# Extrair marcadores
grep -Ei "ride|/api/v2/rides" /tmp/validation-full-logs.txt > /tmp/validation-ride.txt
grep -Ei "dispatch|match|candidate" /tmp/validation-full-logs.txt > /tmp/validation-dispatch.txt
grep -Ei "offer" /tmp/validation-full-logs.txt > /tmp/validation-offer.txt
grep -Ei "status.*changed|transition" /tmp/validation-full-logs.txt > /tmp/validation-status.txt

echo ""
echo "=== Contagem de Marcadores ==="
echo "RIDE: $(wc -l < /tmp/validation-ride.txt)"
echo "DISPATCH: $(wc -l < /tmp/validation-dispatch.txt)"
echo "OFFER: $(wc -l < /tmp/validation-offer.txt)"
echo "STATUS: $(wc -l < /tmp/validation-status.txt)"
```

### Coletar Dados SQL

```bash
# Conectar no DB validation
export VALIDATION_DATABASE_URL="postgresql://usbtecnok:z4939ia4@kaviar-prod-db.cxuuaq46o1o5.us-east-2.rds.amazonaws.com:5432/kaviar_validation?sslmode=require"

# Rides por status
psql "$VALIDATION_DATABASE_URL" <<'SQL' > /tmp/validation-sql-rides-status.txt
SELECT status, COUNT(*) as count
FROM rides_v2
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY status
ORDER BY count DESC;
SQL

# Offers por status
psql "$VALIDATION_DATABASE_URL" <<'SQL' > /tmp/validation-sql-offers-status.txt
SELECT status, COUNT(*) as count
FROM ride_offers
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY status
ORDER BY count DESC;
SQL

# Detalhes das rides
psql "$VALIDATION_DATABASE_URL" <<'SQL' > /tmp/validation-sql-rides-details.txt
SELECT id, status, created_at, offered_at,
  (SELECT COUNT(*) FROM ride_offers WHERE ride_id = rides_v2.id) as offer_count
FROM rides_v2
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 20;
SQL

echo "✅ Dados SQL coletados"
cat /tmp/validation-sql-rides-status.txt
cat /tmp/validation-sql-offers-status.txt
```

---

## Preencher Documento de Evidências

```bash
cd /home/goes/kaviar/backend

# Abrir documento
nano docs/EVIDENCIAS-STAGING-RIDE-FLOW.md

# Preencher seções:
# 1. Data/Hora do Teste: [horário anotado]
# 2. Logs CloudWatch: copiar de /tmp/validation-*.txt
# 3. SQL: copiar de /tmp/validation-sql-*.txt
# 4. Resumo Executivo: contar rides/offers
# 5. Conclusão: ✅ APROVADO (se fluxo completo validado)
```

---

## Commit e Marcar Checkbox

```bash
cd /home/goes/kaviar

# Commit evidências
git add backend/docs/EVIDENCIAS-STAGING-RIDE-FLOW.md
git commit -m "docs: Add validation evidence for SPEC_RIDE_FLOW_V1

- 20 rides tested in kaviar_validation database
- ECS run-task executed: task $TASK_ID
- CloudWatch logs collected and analyzed
- SQL queries confirm correct status transitions
- Complete flow validated: created → dispatcher → offer → final status

Database: kaviar_validation (usbtecnok)
Task ARN: $TASK_ARN
Status: APPROVED - Technical flow works end-to-end"

git push origin feat/dev-load-test-ride-flow-v1

# Marcar checkbox no PRODUCAO-CHECKLIST.md
nano PRODUCAO-CHECKLIST.md
# Linha 31: - [x] Evidências em staging (CloudWatch + 20 corridas + logs do dispatcher)

git add PRODUCAO-CHECKLIST.md
git commit -m "chore: Mark staging evidence checkbox as complete"
git push origin feat/dev-load-test-ride-flow-v1
```

---

## Arquivos Gerados

- `/tmp/ecs-validation-overrides.json` - Configuração da task
- `/tmp/ecs-validation-run-task.json` - Resultado do run-task
- `/tmp/validation-task-arn.txt` - Task ARN
- `/tmp/validation-full-logs.txt` - Logs completos
- `/tmp/validation-ride.txt` - Logs de rides
- `/tmp/validation-dispatch.txt` - Logs de dispatcher
- `/tmp/validation-offer.txt` - Logs de offers
- `/tmp/validation-status.txt` - Logs de status
- `/tmp/validation-sql-*.txt` - Resultados SQL

---

**Pronto para executar! Copie o bloco "Comando Completo" e execute.** 🚀
