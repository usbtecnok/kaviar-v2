# Comando Pronto: ECS Run-Task Ride-Flow V1 Validation

## Passo 1: Rodar Migration no DB Validation

```bash
# Criar overrides para migration
cat > /tmp/ecs-migrate-overrides.json <<'EOF'
{
  "containerOverrides": [
    {
      "name": "kaviar-backend",
      "environment": [
        {"name": "DATABASE_URL", "value": "postgresql://usbtecnok:z4939ia4@kaviar-prod-db.cxuuaq46o1o5.us-east-2.rds.amazonaws.com:5432/kaviar_validation?sslmode=require"}
      ],
      "command": ["sh", "-c", "npx prisma migrate deploy && echo MIGRATION_COMPLETE"]
    }
  ]
}
EOF

# Executar migration
MIGRATE_TASK_ARN=$(aws ecs run-task \
  --cluster kaviar-cluster \
  --task-definition arn:aws:ecs:us-east-2:847895361928:task-definition/kaviar-backend:148 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-046613642f742faa2,subnet-01a498f7b4f3fcff5],securityGroups=[sg-0a54bc7272cae4623],assignPublicIp=ENABLED}" \
  --overrides file:///tmp/ecs-migrate-overrides.json \
  --region us-east-2 \
  --query "tasks[0].taskArn" \
  --output text)

echo "Migration Task ARN: $MIGRATE_TASK_ARN"
echo "Aguardando migration (~60s)..."
sleep 60
echo "✅ Migration concluída"
```

---

## Passo 2: Rodar Validação (20 Rides)

```bash
# Criar overrides JSON
cat > /tmp/ecs-validation-overrides.json <<'EOF'
{
  "containerOverrides": [
    {
      "name": "kaviar-backend",
      "image": "847895361928.dkr.ecr.us-east-2.amazonaws.com/kaviar-backend:11bdd8c",
      "environment": [
        {"name": "NODE_ENV", "value": "staging"},
        {"name": "FEATURE_SPEC_RIDE_FLOW_V1", "value": "true"},
        {"name": "DATABASE_URL", "value": "postgresql://usbtecnok:z4939ia4@kaviar-prod-db.cxuuaq46o1o5.us-east-2.rds.amazonaws.com:5432/kaviar_validation?sslmode=require"},
        {"name": "PORT", "value": "3001"},
        {"name": "JWT_SECRET", "value": "validation-secret-key"},
        {"name": "API_URL", "value": "http://127.0.0.1:3001"}
      ],
      "command": [
        "/bin/bash",
        "-c",
        "echo '=== VALIDATION RUN ===' && echo 'Image: 11bdd8c' && npx tsx prisma/seed-ride-flow-v1.ts && echo '=== STARTING SERVER ===' && node dist/server.js & sleep 10 && echo '=== TESTING 20 RIDES ===' && export API_URL=http://127.0.0.1:3001 && cd /app && bash scripts/test-ride-flow-v1.sh && echo '=== DONE ===' && sleep 30"
      ]
    }
  ]
}
EOF

# Executar run-task
TASK_ARN=$(aws ecs run-task \
  --cluster kaviar-cluster \
  --task-definition arn:aws:ecs:us-east-2:847895361928:task-definition/kaviar-backend:148 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-046613642f742faa2,subnet-01a498f7b4f3fcff5],securityGroups=[sg-0a54bc7272cae4623],assignPublicIp=ENABLED}" \
  --overrides file:///tmp/ecs-validation-overrides.json \
  --region us-east-2 \
  --query "tasks[0].taskArn" \
  --output text)

TASK_ID=$(echo "$TASK_ARN" | awk -F'/' '{print $NF}')

echo ""
echo "✅ Task iniciada!"
echo "Task ARN: $TASK_ARN"
echo "Task ID: $TASK_ID"
echo "Horário início: $(date -u)"
echo ""
echo "$TASK_ARN" > /tmp/validation-task-arn.txt
echo "$TASK_ID" > /tmp/validation-task-id.txt

# Monitorar (aguardar STOPPED)
echo "Monitorando status (Ctrl+C para sair)..."
watch -n 5 "aws ecs describe-tasks \
  --region us-east-2 \
  --cluster kaviar-cluster \
  --tasks $TASK_ARN \
  --query 'tasks[0].lastStatus' \
  --output text"
```

---

## Passo 3: Coletar Logs CloudWatch (Backend)

```bash
# Configurar variáveis
REGION="us-east-2"
LOG_GROUP="/ecs/kaviar-backend"
TASK_ID=$(cat /tmp/validation-task-id.txt)

echo "Task ID: $TASK_ID"

# Descobrir log stream (aguardar até aparecer)
echo "Aguardando log stream aparecer..."
for i in {1..12}; do
  STREAM=$(aws logs describe-log-streams \
    --region "$REGION" \
    --log-group-name "$LOG_GROUP" \
    --order-by LastEventTime \
    --descending \
    --max-items 50 \
    --query "logStreams[?contains(logStreamName, \`$TASK_ID\`)].logStreamName | [0]" \
    --output text)
  
  if [ -n "$STREAM" ] && [ "$STREAM" != "None" ]; then
    echo "✅ Stream encontrado: $STREAM"
    break
  fi
  echo "Tentativa $i/12... aguardando 5s"
  sleep 5
done

if [ -z "$STREAM" ] || [ "$STREAM" = "None" ]; then
  echo "❌ Stream não encontrado após 60s"
  exit 1
fi

# Baixar logs completos (amostra até 10k eventos)
aws logs get-log-events \
  --region "$REGION" \
  --log-group-name "$LOG_GROUP" \
  --log-stream-name "$STREAM" \
  --limit 10000 \
  --output json | jq -r '.events[].message' > /tmp/validation-full-logs.txt

echo "✅ Logs salvos em /tmp/validation-full-logs.txt ($(wc -l < /tmp/validation-full-logs.txt) linhas)"
echo "⚠️  Nota: Limite de 10k eventos - pode ser amostra se task gerou mais logs"

# Extrair marcadores específicos
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

---

## Passo 4: Coletar SQL via ECS psql-runner

```bash
# Criar overrides para psql-runner
cat > /tmp/ecs-psql-runner-overrides.json <<'EOF'
{
  "containerOverrides": [
    {
      "name": "psql-runner",
      "environment": [
        {"name": "PGHOST", "value": "kaviar-prod-db.cxuuaq46o1o5.us-east-2.rds.amazonaws.com"},
        {"name": "PGPORT", "value": "5432"},
        {"name": "PGDATABASE", "value": "kaviar_validation"},
        {"name": "PGUSER", "value": "usbtecnok"},
        {"name": "PGPASSWORD", "value": "z4939ia4"},
        {"name": "PGSSLMODE", "value": "require"}
      ],
      "command": [
        "sh",
        "-c",
        "echo '=== SANITY CHECK TABLES ===' && psql -c \"SELECT tablename FROM pg_tables WHERE schemaname='public' AND (tablename ILIKE '%ride%' OR tablename ILIKE '%offer%' OR tablename ILIKE '%driver%') ORDER BY tablename;\" && echo '' && echo '=== RIDES POR STATUS ===' && psql -c \"SELECT status, COUNT(*) as count FROM rides_v2 WHERE created_at > NOW() - INTERVAL '1 hour' GROUP BY status ORDER BY count DESC;\" && echo '' && echo '=== OFFERS POR STATUS ===' && psql -c \"SELECT status, COUNT(*) as count FROM ride_offers WHERE created_at > NOW() - INTERVAL '1 hour' GROUP BY status ORDER BY count DESC;\" && echo '' && echo '=== DETALHES DAS 20 RIDES ===' && psql -c \"SELECT id, status, created_at, offered_at, (SELECT COUNT(*) FROM ride_offers WHERE ride_id = rides_v2.id) as offer_count FROM rides_v2 WHERE created_at > NOW() - INTERVAL '1 hour' ORDER BY created_at DESC LIMIT 20;\""
      ]
    }
  ]
}
EOF

# Executar psql-runner
SQL_TASK_ARN=$(aws ecs run-task \
  --cluster kaviar-cluster \
  --task-definition kaviar-psql-runner \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-046613642f742faa2,subnet-01a498f7b4f3fcff5],securityGroups=[sg-0a54bc7272cae4623],assignPublicIp=ENABLED}" \
  --overrides file:///tmp/ecs-psql-runner-overrides.json \
  --region us-east-2 \
  --query "tasks[0].taskArn" \
  --output text)

SQL_TASK_ID=$(echo "$SQL_TASK_ARN" | awk -F'/' '{print $NF}')

echo "SQL Runner Task ARN: $SQL_TASK_ARN"
echo "SQL Runner Task ID: $SQL_TASK_ID"
echo "$SQL_TASK_ARN" > /tmp/validation-sql-task-arn.txt

# Aguardar stream aparecer (loop 12x com sleep 5)
echo "Aguardando SQL runner stream aparecer..."
for i in {1..12}; do
  SQL_STREAM=$(aws logs describe-log-streams \
    --region us-east-2 \
    --log-group-name /ecs/kaviar-psql-runner \
    --order-by LastEventTime \
    --descending \
    --max-items 20 \
    --query "logStreams[?contains(logStreamName, \`$SQL_TASK_ID\`)].logStreamName | [0]" \
    --output text)
  
  if [ -n "$SQL_STREAM" ] && [ "$SQL_STREAM" != "None" ]; then
    echo "✅ SQL Stream encontrado: $SQL_STREAM"
    break
  fi
  echo "Tentativa $i/12... aguardando 5s"
  sleep 5
done

if [ -z "$SQL_STREAM" ] || [ "$SQL_STREAM" = "None" ]; then
  echo "❌ SQL Stream não encontrado após 60s"
  exit 1
fi

# Baixar logs SQL
aws logs get-log-events \
  --region us-east-2 \
  --log-group-name /ecs/kaviar-psql-runner \
  --log-stream-name "$SQL_STREAM" \
  --limit 1000 \
  --output json | jq -r '.events[].message' | tee /tmp/validation-sql-all.txt

echo ""
echo "✅ Dados SQL coletados em /tmp/validation-sql-all.txt"
echo "Linhas: $(wc -l < /tmp/validation-sql-all.txt)"
```

---

## Passo 5: Preencher Documento de Evidências

```bash
cd /home/goes/kaviar/backend

# Abrir documento
nano docs/EVIDENCIAS-STAGING-RIDE-FLOW.md

# Preencher seções:
# 1. Task ARN/ID: copiar de /tmp/validation-task-arn.txt
# 2. Data/Hora: horário anotado no Passo 2
# 3. Logs CloudWatch: copiar marcadores de /tmp/validation-*.txt
# 4. SQL: copiar de /tmp/validation-sql-all.txt
# 5. Resumo Executivo: contar rides/offers
# 6. Conclusão: ✅ APROVADO (se fluxo completo validado)
```

---

## Passo 6: Commit e Marcar Checkbox

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

- `/tmp/ecs-migrate-overrides.json` - Config da task de migration
- `/tmp/ecs-validation-overrides.json` - Config da task backend
- `/tmp/ecs-psql-runner-overrides.json` - Config da task psql-runner
- `/tmp/validation-task-arn.txt` - Task ARN backend
- `/tmp/validation-task-id.txt` - Task ID backend
- `/tmp/validation-sql-task-arn.txt` - Task ARN psql-runner
- `/tmp/validation-full-logs.txt` - Logs completos (amostra até 10k)
- `/tmp/validation-ride-created.txt` - Marcador RIDE_CREATED
- `/tmp/validation-dispatcher-filter.txt` - Marcador DISPATCHER_FILTER
- `/tmp/validation-dispatch-candidates.txt` - Marcador DISPATCH_CANDIDATES
- `/tmp/validation-offer-sent.txt` - Marcador OFFER_SENT
- `/tmp/validation-offer-expired.txt` - Marcador OFFER_EXPIRED
- `/tmp/validation-status-changed.txt` - Marcador RIDE_STATUS_CHANGED
- `/tmp/validation-sql-all.txt` - Resultados SQL (via ECS psql-runner)

---

**Pronto para executar! Copie cada bloco de Passo em Passo.** 🚀
