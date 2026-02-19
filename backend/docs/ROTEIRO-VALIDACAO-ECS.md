# Roteiro: Validação Ride-Flow V1 no ECS (kaviar_validation)

**Ambiente:** ECS one-off (sem staging DNS)  
**DB:** kaviar_validation (já existe)  
**User:** usbtecnok (já existe com grants)

**Para comandos prontos:** `cat backend/docs/COMANDO-PRONTO-VALIDACAO.md`

---

## Passo 1: Migration (OBRIGATÓRIO)

**Por quê:** Criar tabelas `rides_v2`, `ride_offers`, `driver_locations`, `driver_status`.

```bash
cat > /tmp/ecs-migrate-overrides.json <<'EOF'
{
  "containerOverrides": [{
    "name": "kaviar-backend",
    "environment": [
      {"name": "DATABASE_URL", "value": "postgresql://usbtecnok:z4939ia4@kaviar-prod-db.cxuuaq46o1o5.us-east-2.rds.amazonaws.com:5432/kaviar_validation?sslmode=require"}
    ],
    "command": ["sh", "-c", "npx prisma migrate deploy && echo '=== MIGRATE OK ==='"]
  }]
}
EOF

MIGRATE_ARN=$(aws ecs run-task \
  --cluster kaviar-cluster \
  --task-definition arn:aws:ecs:us-east-2:847895361928:task-definition/kaviar-backend:148 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-046613642f742faa2,subnet-01a498f7b4f3fcff5],securityGroups=[sg-0a54bc7272cae4623],assignPublicIp=ENABLED}" \
  --overrides file:///tmp/ecs-migrate-overrides.json \
  --region us-east-2 \
  --query "tasks[0].taskArn" \
  --output text)

echo "Migration Task: $MIGRATE_ARN"
echo "$MIGRATE_ARN" > /tmp/validation-migrate-task-arn.txt
sleep 60

# Coletar logs
MIGRATE_ID=$(echo "$MIGRATE_ARN" | awk -F'/' '{print $NF}')
for i in {1..12}; do
  MIGRATE_STREAM=$(aws logs describe-log-streams \
    --region us-east-2 \
    --log-group-name /ecs/kaviar-backend \
    --order-by LastEventTime \
    --descending \
    --max-items 50 \
    --query "logStreams[?contains(logStreamName, \`$MIGRATE_ID\`)].logStreamName | [0]" \
    --output text)
  
  if [ -n "$MIGRATE_STREAM" ] && [ "$MIGRATE_STREAM" != "None" ]; then
    break
  fi
  sleep 5
done

aws logs get-log-events \
  --region us-east-2 \
  --log-group-name /ecs/kaviar-backend \
  --log-stream-name "$MIGRATE_STREAM" \
  --limit 1000 \
  --output json | jq -r '.events[].message' > /tmp/validation-migrate-logs.txt

grep "MIGRATE OK" /tmp/validation-migrate-logs.txt && echo "✅ Migration SUCCESS"
```

**Status:** [ ] Migration aplicada

---

## Passo 2: Validação 20 Rides

```bash
cat > /tmp/ecs-validation-overrides.json <<'EOF'
{
  "containerOverrides": [{
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
    "command": ["/bin/bash", "-c", "echo '=== VALIDATION START ===' && npx tsx prisma/seed-ride-flow-v1.ts && node dist/server.js & sleep 10 && export API_URL=http://127.0.0.1:3001 && bash scripts/test-ride-flow-v1.sh && echo '=== VALIDATION END ===' && sleep 30"]
  }]
}
EOF

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
echo "Validation Task: $TASK_ARN"
echo "Task ID: $TASK_ID"
echo "Início: $(date -u)"
echo "$TASK_ARN" > /tmp/validation-task-arn.txt
echo "$TASK_ID" > /tmp/validation-task-id.txt

# Monitorar
watch -n 5 "aws ecs describe-tasks --region us-east-2 --cluster kaviar-cluster --tasks $TASK_ARN --query 'tasks[0].lastStatus' --output text"
```

**Aguardar:** PROVISIONING → PENDING → RUNNING → STOPPED (~5-10 min)

**Status:** [ ] Task completada

---

## Passo 3: Coletar Logs Backend

```bash
TASK_ID=$(cat /tmp/validation-task-id.txt)

# Aguardar stream
for i in {1..12}; do
  STREAM=$(aws logs describe-log-streams \
    --region us-east-2 \
    --log-group-name /ecs/kaviar-backend \
    --order-by LastEventTime \
    --descending \
    --max-items 50 \
    --query "logStreams[?contains(logStreamName, \`$TASK_ID\`)].logStreamName | [0]" \
    --output text)
  
  if [ -n "$STREAM" ] && [ "$STREAM" != "None" ]; then
    echo "✅ Stream: $STREAM"
    break
  fi
  sleep 5
done

# Baixar logs
aws logs get-log-events \
  --region us-east-2 \
  --log-group-name /ecs/kaviar-backend \
  --log-stream-name "$STREAM" \
  --limit 10000 \
  --output json | jq -r '.events[].message' > /tmp/validation-full-logs.txt

echo "✅ Logs: /tmp/validation-full-logs.txt ($(wc -l < /tmp/validation-full-logs.txt) linhas)"
echo "⚠️  Limite 10k - pode ser amostra"

# Extrair marcadores
grep "RIDE_CREATED" /tmp/validation-full-logs.txt > /tmp/validation-ride-created.txt 2>/dev/null || touch /tmp/validation-ride-created.txt
grep "DISPATCHER_FILTER" /tmp/validation-full-logs.txt > /tmp/validation-dispatcher-filter.txt 2>/dev/null || touch /tmp/validation-dispatcher-filter.txt
grep "DISPATCH_CANDIDATES" /tmp/validation-full-logs.txt > /tmp/validation-dispatch-candidates.txt 2>/dev/null || touch /tmp/validation-dispatch-candidates.txt
grep "OFFER_SENT" /tmp/validation-full-logs.txt > /tmp/validation-offer-sent.txt 2>/dev/null || touch /tmp/validation-offer-sent.txt
grep "OFFER_EXPIRED" /tmp/validation-full-logs.txt > /tmp/validation-offer-expired.txt 2>/dev/null || touch /tmp/validation-offer-expired.txt
grep "RIDE_STATUS_CHANGED" /tmp/validation-full-logs.txt > /tmp/validation-status-changed.txt 2>/dev/null || touch /tmp/validation-status-changed.txt

echo "=== Marcadores ==="
echo "RIDE_CREATED: $(wc -l < /tmp/validation-ride-created.txt)"
echo "DISPATCHER_FILTER: $(wc -l < /tmp/validation-dispatcher-filter.txt)"
echo "DISPATCH_CANDIDATES: $(wc -l < /tmp/validation-dispatch-candidates.txt)"
echo "OFFER_SENT: $(wc -l < /tmp/validation-offer-sent.txt)"
echo "OFFER_EXPIRED: $(wc -l < /tmp/validation-offer-expired.txt)"
echo "RIDE_STATUS_CHANGED: $(wc -l < /tmp/validation-status-changed.txt)"
```

**Checklist:**
- [ ] RIDE_CREATED: >= 20
- [ ] DISPATCHER_FILTER: >= 20
- [ ] OFFER_SENT: >= 1
- [ ] RIDE_STATUS_CHANGED: >= 1

**Status:** [ ] Logs coletados

---

## Passo 4: SQL via ECS psql-runner

```bash
cat > /tmp/ecs-psql-runner-overrides.json <<'EOF'
{
  "containerOverrides": [{
    "name": "psql-runner",
    "environment": [
      {"name": "PGHOST", "value": "kaviar-prod-db.cxuuaq46o1o5.us-east-2.rds.amazonaws.com"},
      {"name": "PGPORT", "value": "5432"},
      {"name": "PGDATABASE", "value": "kaviar_validation"},
      {"name": "PGUSER", "value": "usbtecnok"},
      {"name": "PGPASSWORD", "value": "z4939ia4"},
      {"name": "PGSSLMODE", "value": "require"}
    ],
    "command": ["sh", "-c", "echo '=== SANITY CHECK ===' && psql -c \"SELECT tablename FROM pg_tables WHERE schemaname='public' AND (tablename ILIKE '%ride%' OR tablename ILIKE '%offer%' OR tablename ILIKE '%driver%') ORDER BY tablename;\" && echo '' && echo '=== RIDES STATUS ===' && psql -c \"SELECT status, COUNT(*) FROM rides_v2 WHERE created_at > NOW() - INTERVAL '1 hour' GROUP BY status ORDER BY count DESC;\" && echo '' && echo '=== OFFERS STATUS ===' && psql -c \"SELECT status, COUNT(*) FROM ride_offers WHERE created_at > NOW() - INTERVAL '1 hour' GROUP BY status ORDER BY count DESC;\" && echo '' && echo '=== RIDES DETAILS ===' && psql -c \"SELECT id, status, created_at, offered_at, (SELECT COUNT(*) FROM ride_offers WHERE ride_id = rides_v2.id) as offer_count FROM rides_v2 WHERE created_at > NOW() - INTERVAL '1 hour' ORDER BY created_at DESC LIMIT 20;\""]
  }]
}
EOF

SQL_ARN=$(aws ecs run-task \
  --cluster kaviar-cluster \
  --task-definition kaviar-psql-runner \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-046613642f742faa2,subnet-01a498f7b4f3fcff5],securityGroups=[sg-0a54bc7272cae4623],assignPublicIp=ENABLED}" \
  --overrides file:///tmp/ecs-psql-runner-overrides.json \
  --region us-east-2 \
  --query "tasks[0].taskArn" \
  --output text)

SQL_ID=$(echo "$SQL_ARN" | awk -F'/' '{print $NF}')
echo "SQL Task: $SQL_ARN"

# Aguardar stream
for i in {1..12}; do
  SQL_STREAM=$(aws logs describe-log-streams \
    --region us-east-2 \
    --log-group-name /ecs/kaviar-psql-runner \
    --order-by LastEventTime \
    --descending \
    --max-items 20 \
    --query "logStreams[?contains(logStreamName, \`$SQL_ID\`)].logStreamName | [0]" \
    --output text)
  
  if [ -n "$SQL_STREAM" ] && [ "$SQL_STREAM" != "None" ]; then
    echo "✅ SQL Stream: $SQL_STREAM"
    break
  fi
  sleep 5
done

# Baixar logs SQL
aws logs get-log-events \
  --region us-east-2 \
  --log-group-name /ecs/kaviar-psql-runner \
  --log-stream-name "$SQL_STREAM" \
  --limit 1000 \
  --output json | jq -r '.events[].message' > /tmp/validation-sql-all.txt

echo "✅ SQL: /tmp/validation-sql-all.txt ($(wc -l < /tmp/validation-sql-all.txt) linhas)"
cat /tmp/validation-sql-all.txt

# Verificar sanity
if grep -q "(0 rows)" /tmp/validation-sql-all.txt | head -5; then
  echo "❌ TABELAS NÃO EXISTEM - Rodar Passo 1 (Migration)"
  exit 1
fi
```

**Status:** [ ] SQL coletado

---

## Passo 5: Preencher Evidências

```bash
nano backend/docs/EVIDENCIAS-VALIDACAO-ECS.md
```

**Preencher:**
1. Migration Task ARN
2. Validation Task ARN
3. Horários
4. Logs (marcadores)
5. SQL
6. Resumo
7. Conclusão: ✅ APROVADO ou ❌ REPROVADO

**Status:** [ ] Documento preenchido

---

## Passo 6: Commit

```bash
cd /home/goes/kaviar

git add backend/docs/EVIDENCIAS-VALIDACAO-ECS.md
git commit -m "docs: validation evidence complete"
git push origin feat/dev-load-test-ride-flow-v1

nano PRODUCAO-CHECKLIST.md
# Marcar: [x] Evidências em staging

git add PRODUCAO-CHECKLIST.md
git commit -m "chore: mark evidence checkbox"
git push origin feat/dev-load-test-ride-flow-v1
```

**Status:** [ ] Commits realizados

---

## Troubleshooting

**Stream não aparece**
- Loop 60s (12x5s) já está no script
- Verificar Task ARN correto

**Arquivo vazio**
- Script usa `jq -r` (correto)
- Mensagens com TAB são tratadas

**Tabelas não existem**
- Rodar Passo 1 (Migration)
- Sanity check detecta automaticamente

---

## Tempo Estimado

- Passo 1 (Migration): 2 min
- Passo 2 (Validação): 2 min
- Aguardar task: 5-10 min
- Passo 3 (Logs): 2 min
- Passo 4 (SQL): 2 min
- Passo 5 (Evidências): 15 min
- Passo 6 (Commit): 2 min
- **Total: ~30-35 min**

---

**Pronto para executar! 🚀**
