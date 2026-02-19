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

# Baixar logs completos (amostra de 10000 eventos - pode estar paginado)
aws logs get-log-events \
  --region "$REGION" \
  --log-group-name "$LOG_GROUP" \
  --log-stream-name "$STREAM" \
  --limit 10000 \
  --query "events[].message" \
  --output text > /tmp/validation-full-logs.txt

echo "✅ Logs salvos em /tmp/validation-full-logs.txt (amostra até 10k eventos)"
wc -l /tmp/validation-full-logs.txt

# Extrair marcadores específicos (evidências confiáveis)
grep "RIDE_CREATED" /tmp/validation-full-logs.txt > /tmp/validation-ride-created.txt 2>/dev/null || touch /tmp/validation-ride-created.txt
grep "DISPATCHER_FILTER" /tmp/validation-full-logs.txt > /tmp/validation-dispatcher-filter.txt 2>/dev/null || touch /tmp/validation-dispatcher-filter.txt
grep "DISPATCH_CANDIDATES" /tmp/validation-full-logs.txt > /tmp/validation-dispatch-candidates.txt 2>/dev/null || touch /tmp/validation-dispatch-candidates.txt
grep "OFFER_SENT" /tmp/validation-full-logs.txt > /tmp/validation-offer-sent.txt 2>/dev/null || touch /tmp/validation-offer-sent.txt
grep "OFFER_EXPIRED" /tmp/validation-full-logs.txt > /tmp/validation-offer-expired.txt 2>/dev/null || touch /tmp/validation-offer-expired.txt
grep "RIDE_STATUS_CHANGED" /tmp/validation-full-logs.txt > /tmp/validation-status-changed.txt 2>/dev/null || touch /tmp/validation-status-changed.txt

echo ""
echo "=== Marcadores de Evidência ==="
echo "RIDE_CREATED: $(wc -l < /tmp/validation-ride-created.txt)"
echo "DISPATCHER_FILTER: $(wc -l < /tmp/validation-dispatcher-filter.txt)"
echo "DISPATCH_CANDIDATES: $(wc -l < /tmp/validation-dispatch-candidates.txt)"
echo "OFFER_SENT: $(wc -l < /tmp/validation-offer-sent.txt)"
echo "OFFER_EXPIRED: $(wc -l < /tmp/validation-offer-expired.txt)"
echo "RIDE_STATUS_CHANGED: $(wc -l < /tmp/validation-status-changed.txt)"
```

### Coletar Dados SQL (via ECS psql-runner)

```bash
# Criar script SQL
cat > /tmp/validation-queries.sql <<'SQL'
\echo '=== RIDES POR STATUS ==='
SELECT status, COUNT(*) as count
FROM rides_v2
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY status
ORDER BY count DESC;

\echo ''
\echo '=== OFFERS POR STATUS ==='
SELECT status, COUNT(*) as count
FROM ride_offers
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY status
ORDER BY count DESC;

\echo ''
\echo '=== DETALHES DAS 20 RIDES ==='
SELECT id, status, created_at, offered_at,
  (SELECT COUNT(*) FROM ride_offers WHERE ride_id = rides_v2.id) as offer_count
FROM rides_v2
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 20;
SQL

# Executar via ECS run-task (kaviar-psql-runner)
aws ecs run-task \
  --cluster kaviar-cluster \
  --task-definition kaviar-psql-runner \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-046613642f742faa2,subnet-01a498f7b4f3fcff5],securityGroups=[sg-0a54bc7272cae4623],assignPublicIp=ENABLED}" \
  --overrides "{
    \"containerOverrides\": [{
      \"name\": \"psql-runner\",
      \"environment\": [
        {\"name\": \"PGHOST\", \"value\": \"kaviar-prod-db.cxuuaq46o1o5.us-east-2.rds.amazonaws.com\"},
        {\"name\": \"PGPORT\", \"value\": \"5432\"},
        {\"name\": \"PGDATABASE\", \"value\": \"kaviar_validation\"},
        {\"name\": \"PGUSER\", \"value\": \"usbtecnok\"},
        {\"name\": \"PGPASSWORD\", \"value\": \"z4939ia4\"}
      ],
      \"command\": [\"sh\", \"-c\", \"psql -f /tmp/validation-queries.sql\"]
    }]
  }" \
  --region us-east-2 \
  > /tmp/psql-runner-task.json

# Extrair Task ARN
SQL_TASK_ARN=$(jq -r '.tasks[0].taskArn' /tmp/psql-runner-task.json)
SQL_TASK_ID=$(echo "$SQL_TASK_ARN" | awk -F'/' '{print $NF}')

echo "SQL Runner Task ID: $SQL_TASK_ID"
echo "Aguardando execução (~30s)..."
sleep 30

# Descobrir log stream do psql-runner
SQL_STREAM=$(aws logs describe-log-streams \
  --region us-east-2 \
  --log-group-name /ecs/kaviar-psql-runner \
  --order-by LastEventTime \
  --descending \
  --max-items 20 \
  --query "logStreams[?contains(logStreamName, \`$SQL_TASK_ID\`)].logStreamName | [0]" \
  --output text)

echo "SQL Log Stream: $SQL_STREAM"

# Baixar logs SQL
aws logs get-log-events \
  --region us-east-2 \
  --log-group-name /ecs/kaviar-psql-runner \
  --log-stream-name "$SQL_STREAM" \
  --limit 1000 \
  --query "events[].message" \
  --output text > /tmp/validation-sql-all.txt

echo "✅ Dados SQL coletados em /tmp/validation-sql-all.txt"
cat /tmp/validation-sql-all.txt
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

# Commit evidências (mensagem curta, detalhes no arquivo)
git add backend/docs/EVIDENCIAS-STAGING-RIDE-FLOW.md
git commit -m "docs: validation evidence SPEC_RIDE_FLOW_V1 complete"

git push origin feat/dev-load-test-ride-flow-v1

# Marcar checkbox no PRODUCAO-CHECKLIST.md
nano PRODUCAO-CHECKLIST.md
# Linha 31: - [x] Evidências em staging (CloudWatch + 20 corridas + logs do dispatcher)

git add PRODUCAO-CHECKLIST.md
git commit -m "chore: mark staging evidence checkbox complete"
git push origin feat/dev-load-test-ride-flow-v1
```

**Nota:** Detalhes da validação (Task ARN, horários, contagens) estão documentados em `EVIDENCIAS-STAGING-RIDE-FLOW.md`.

---

## Arquivos Gerados

- `/tmp/ecs-validation-overrides.json` - Configuração da task
- `/tmp/ecs-validation-run-task.json` - Resultado do run-task
- `/tmp/validation-task-arn.txt` - Task ARN
- `/tmp/validation-full-logs.txt` - Logs completos (amostra até 10k eventos)
- `/tmp/validation-ride-created.txt` - Marcador RIDE_CREATED
- `/tmp/validation-dispatcher-filter.txt` - Marcador DISPATCHER_FILTER
- `/tmp/validation-dispatch-candidates.txt` - Marcador DISPATCH_CANDIDATES
- `/tmp/validation-offer-sent.txt` - Marcador OFFER_SENT
- `/tmp/validation-offer-expired.txt` - Marcador OFFER_EXPIRED
- `/tmp/validation-status-changed.txt` - Marcador RIDE_STATUS_CHANGED
- `/tmp/validation-sql-all.txt` - Resultados SQL (via ECS psql-runner)

---

**Pronto para executar! Copie o bloco "Comando Completo" e execute.** 🚀
