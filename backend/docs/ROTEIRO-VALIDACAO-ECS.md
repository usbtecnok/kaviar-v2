# Roteiro: Validação Ride-Flow V1 no ECS (kaviar_validation)

## Contexto

**Ambiente:** Validação via **ECS run-task one-off** (não há service/DNS staging)

**Database:** `kaviar_validation` no RDS prod (isolado)

**Objetivo:** Executar 20 rides e coletar evidências técnicas do fluxo completo

---

## Execução Rápida

Para comandos prontos copiar/colar, use:

```bash
cat backend/docs/COMANDO-PRONTO-VALIDACAO.md
```

Este roteiro detalha cada passo com explicações.

---

## Passo 1: Rodar Migration no DB Validation

**Por quê:** Garantir que tabelas `rides_v2`, `ride_offers`, `driver_locations`, `driver_status` existem.

```bash
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
sleep 60
echo "✅ Migration concluída"
```

**Status:** [ ] Migration aplicada

---

## Passo 2: Rodar Validação (20 Rides)

**O que faz:** Seed + Server + Test script (20 rides) dentro da task.

```bash
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

echo "✅ Task iniciada!"
echo "Task ARN: $TASK_ARN"
echo "Task ID: $TASK_ID"
echo "$TASK_ARN" > /tmp/validation-task-arn.txt
echo "$TASK_ID" > /tmp/validation-task-id.txt
```

**Status:** [ ] Task iniciada

---

## Passo 3: Monitorar Execução

```bash
TASK_ARN=$(cat /tmp/validation-task-arn.txt)

watch -n 5 "aws ecs describe-tasks \
  --region us-east-2 \
  --cluster kaviar-cluster \
  --tasks $TASK_ARN \
  --query 'tasks[0].lastStatus' \
  --output text"
```

**Aguardar:** PROVISIONING → PENDING → RUNNING → STOPPED (~5-10 min)

**Status:** [ ] Task completada (STOPPED)

---

## Passo 4: Coletar Logs CloudWatch (Backend)

**O que coleta:** Logs da task backend com marcadores específicos.

```bash
REGION="us-east-2"
LOG_GROUP="/ecs/kaviar-backend"
TASK_ID=$(cat /tmp/validation-task-id.txt)

# Aguardar stream aparecer
echo "Aguardando log stream..."
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
    echo "✅ Stream: $STREAM"
    break
  fi
  echo "Tentativa $i/12..."
  sleep 5
done

if [ -z "$STREAM" ] || [ "$STREAM" = "None" ]; then
  echo "❌ Stream não encontrado"
  exit 1
fi

# Baixar logs
aws logs get-log-events \
  --region "$REGION" \
  --log-group-name "$LOG_GROUP" \
  --log-stream-name "$STREAM" \
  --limit 10000 \
  --output json | jq -r '.events[].message' > /tmp/validation-full-logs.txt

echo "✅ Logs: /tmp/validation-full-logs.txt ($(wc -l < /tmp/validation-full-logs.txt) linhas)"

# Extrair marcadores
grep "RIDE_CREATED" /tmp/validation-full-logs.txt > /tmp/validation-ride-created.txt 2>/dev/null || touch /tmp/validation-ride-created.txt
grep "DISPATCHER_FILTER" /tmp/validation-full-logs.txt > /tmp/validation-dispatcher-filter.txt 2>/dev/null || touch /tmp/validation-dispatcher-filter.txt
grep "DISPATCH_CANDIDATES" /tmp/validation-full-logs.txt > /tmp/validation-dispatch-candidates.txt 2>/dev/null || touch /tmp/validation-dispatch-candidates.txt
grep "OFFER_SENT" /tmp/validation-full-logs.txt > /tmp/validation-offer-sent.txt 2>/dev/null || touch /tmp/validation-offer-sent.txt
grep "OFFER_EXPIRED" /tmp/validation-full-logs.txt > /tmp/validation-offer-expired.txt 2>/dev/null || touch /tmp/validation-offer-expired.txt
grep "RIDE_STATUS_CHANGED" /tmp/validation-full-logs.txt > /tmp/validation-status-changed.txt 2>/dev/null || touch /tmp/validation-status-changed.txt

echo ""
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

## Passo 5: Coletar SQL via ECS psql-runner

**O que faz:** Roda 3 queries + sanity check de tabelas.

```bash
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
echo "SQL Runner Task ID: $SQL_TASK_ID"

# Aguardar stream
echo "Aguardando SQL stream..."
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
    echo "✅ SQL Stream: $SQL_STREAM"
    break
  fi
  echo "Tentativa $i/12..."
  sleep 5
done

if [ -z "$SQL_STREAM" ] || [ "$SQL_STREAM" = "None" ]; then
  echo "❌ SQL Stream não encontrado"
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
echo "✅ SQL: /tmp/validation-sql-all.txt ($(wc -l < /tmp/validation-sql-all.txt) linhas)"
```

**Status:** [ ] SQL coletado

---

## Passo 6: Preencher Evidências

```bash
cd /home/goes/kaviar/backend
nano docs/EVIDENCIAS-STAGING-RIDE-FLOW.md
```

**Preencher:**
1. Task ARN/ID (de `/tmp/validation-task-arn.txt`)
2. Data/Hora (anotado no Passo 2)
3. Logs CloudWatch (copiar marcadores de `/tmp/validation-*.txt`)
4. SQL (copiar de `/tmp/validation-sql-all.txt`)
5. Resumo Executivo (contar rides/offers)
6. Conclusão: ✅ APROVADO ou ❌ REPROVADO

**Status:** [ ] Documento preenchido

---

## Passo 7: Commit

```bash
cd /home/goes/kaviar

git add backend/docs/EVIDENCIAS-STAGING-RIDE-FLOW.md
git commit -m "docs: validation evidence SPEC_RIDE_FLOW_V1 complete"
git push origin feat/dev-load-test-ride-flow-v1

nano PRODUCAO-CHECKLIST.md
# Marcar: - [x] Evidências em staging (CloudWatch + 20 corridas + logs do dispatcher)

git add PRODUCAO-CHECKLIST.md
git commit -m "chore: mark staging evidence checkbox complete"
git push origin feat/dev-load-test-ride-flow-v1
```

**Status:** [ ] Commits realizados

---

## Troubleshooting

### Task falha imediatamente
```bash
# Ver logs de erro
aws logs tail /ecs/kaviar-backend --follow --region us-east-2 | grep ERROR
```

### Stream não aparece
```bash
# Listar streams recentes
aws logs describe-log-streams \
  --log-group-name /ecs/kaviar-backend \
  --order-by LastEventTime \
  --descending \
  --max-items 10 \
  --region us-east-2
```

### Tabelas não existem (SQL falha)
```bash
# Rodar migration novamente (Passo 1)
```

---

## Arquivos Gerados

- `/tmp/ecs-migrate-overrides.json`
- `/tmp/ecs-validation-overrides.json`
- `/tmp/ecs-psql-runner-overrides.json`
- `/tmp/validation-task-arn.txt`
- `/tmp/validation-task-id.txt`
- `/tmp/validation-full-logs.txt`
- `/tmp/validation-ride-created.txt`
- `/tmp/validation-dispatcher-filter.txt`
- `/tmp/validation-dispatch-candidates.txt`
- `/tmp/validation-offer-sent.txt`
- `/tmp/validation-offer-expired.txt`
- `/tmp/validation-status-changed.txt`
- `/tmp/validation-sql-all.txt`

---

## Tempo Estimado

- Passo 1 (Migration): 2 min
- Passo 2 (Task): 2 min
- Passo 3 (Aguardar): 5-10 min
- Passo 4 (Logs): 2 min
- Passo 5 (SQL): 2 min
- Passo 6 (Evidências): 15 min
- Passo 7 (Commit): 2 min
- **Total: ~30-35 min**

---

**Boa execução! 🚀**
