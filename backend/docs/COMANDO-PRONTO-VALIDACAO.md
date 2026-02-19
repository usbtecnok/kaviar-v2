# Validação SPEC_RIDE_FLOW_V1 - Comando Pronto

**Ambiente:** ECS one-off (sem staging DNS)  
**DB:** kaviar_validation (RDS prod, isolado)  
**User:** usbtecnok (já existe com grants)

---

## Passo 1: Migration (OBRIGATÓRIO - rodar primeiro)

```bash
# Criar overrides
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

# Executar
MIGRATE_ARN=$(aws ecs run-task \
  --cluster kaviar-cluster \
  --task-definition arn:aws:ecs:us-east-2:847895361928:task-definition/kaviar-backend:148 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-046613642f742faa2,subnet-01a498f7b4f3fcff5],securityGroups=[sg-0a54bc7272cae4623],assignPublicIp=ENABLED}" \
  --overrides file:///tmp/ecs-migrate-overrides.json \
  --region us-east-2 \
  --query "tasks[0].taskArn" \
  --output text)

MIGRATE_ID=$(echo "$MIGRATE_ARN" | awk -F'/' '{print $NF}')
echo "Migration Task: $MIGRATE_ARN"
echo "$MIGRATE_ARN" > /tmp/validation-migrate-task-arn.txt

# Aguardar (~60s)
sleep 60

# Coletar logs
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
  echo "Aguardando stream... $i/12"
  sleep 5
done

if [ -z "$MIGRATE_STREAM" ] || [ "$MIGRATE_STREAM" = "None" ]; then
  echo "❌ Stream não encontrado"
  exit 1
fi

aws logs get-log-events \
  --region us-east-2 \
  --log-group-name /ecs/kaviar-backend \
  --log-stream-name "$MIGRATE_STREAM" \
  --limit 1000 \
  --output json | jq -r '.events[].message' > /tmp/validation-migrate-logs.txt

echo "✅ Migration logs: /tmp/validation-migrate-logs.txt"
grep "MIGRATE OK" /tmp/validation-migrate-logs.txt && echo "✅ Migration SUCCESS" || echo "❌ Migration FAILED"
```

---

## Passo 2: Validação 20 Rides

```bash
# Criar overrides
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

# Executar
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

---

## Passo 3: Coletar Logs Backend

```bash
set -euo pipefail

REGION="us-east-2"
LOG_GROUP="/ecs/kaviar-backend"
TASK_ID=$(cat /tmp/validation-task-id.txt)

echo "TASK_ID=$TASK_ID"

# Aguardar stream (até 2 min)
STREAM=""
for i in $(seq 1 24); do
  STREAM=$(aws logs describe-log-streams \
    --region "$REGION" \
    --log-group-name "$LOG_GROUP" \
    --order-by LastEventTime \
    --descending \
    --max-items 50 \
    --query "logStreams[?contains(logStreamName, \`$TASK_ID\`)].logStreamName | [0]" \
    --output text)
  
  if [ -n "$STREAM" ] && [ "$STREAM" != "None" ]; then
    echo "✅ STREAM=$STREAM"
    break
  fi
  echo "Aguardando stream... $i/24"
  sleep 5
done

if [ -z "$STREAM" ] || [ "$STREAM" = "None" ]; then
  echo "❌ Stream não encontrado"
  exit 1
fi

# Baixar TODOS os eventos com paginação
OUT="/tmp/validation-full-logs.txt"
: > "$OUT"

TOKEN="__START__"
ITER=0

while :; do
  ITER=$((ITER+1))
  
  if [ "$TOKEN" = "__START__" ]; then
    RESP=$(aws logs get-log-events \
      --region "$REGION" \
      --log-group-name "$LOG_GROUP" \
      --log-stream-name "$STREAM" \
      --start-from-head \
      --limit 10000 \
      --output json)
  else
    RESP=$(aws logs get-log-events \
      --region "$REGION" \
      --log-group-name "$LOG_GROUP" \
      --log-stream-name "$STREAM" \
      --start-from-head \
      --next-token "$TOKEN" \
      --limit 10000 \
      --output json)
  fi

  echo "$RESP" | jq -r '.events[].message' >> "$OUT"

  NEXT=$(echo "$RESP" | jq -r '.nextForwardToken')

  # Token não muda = acabou
  if [ "$NEXT" = "$TOKEN" ]; then
    break
  fi
  TOKEN="$NEXT"

  # Safety: max 50 páginas
  if [ "$ITER" -ge 50 ]; then
    echo "⚠️  Parando após 50 páginas (safety)"
    break
  fi
done

echo "✅ Logs: $OUT ($(wc -l < "$OUT") linhas)"

# Extrair marcadores
grep "RIDE_CREATED" "$OUT" > /tmp/validation-ride-created.txt 2>/dev/null || : > /tmp/validation-ride-created.txt
grep "DISPATCHER_FILTER" "$OUT" > /tmp/validation-dispatcher-filter.txt 2>/dev/null || : > /tmp/validation-dispatcher-filter.txt
grep "DISPATCH_CANDIDATES" "$OUT" > /tmp/validation-dispatch-candidates.txt 2>/dev/null || : > /tmp/validation-dispatch-candidates.txt
grep "OFFER_SENT" "$OUT" > /tmp/validation-offer-sent.txt 2>/dev/null || : > /tmp/validation-offer-sent.txt
grep "OFFER_EXPIRED" "$OUT" > /tmp/validation-offer-expired.txt 2>/dev/null || : > /tmp/validation-offer-expired.txt
grep "RIDE_STATUS_CHANGED" "$OUT" > /tmp/validation-status-changed.txt 2>/dev/null || : > /tmp/validation-status-changed.txt

echo ""
echo "=== Marcadores ==="
echo "RIDE_CREATED: $(wc -l < /tmp/validation-ride-created.txt)"
echo "DISPATCHER_FILTER: $(wc -l < /tmp/validation-dispatcher-filter.txt)"
echo "DISPATCH_CANDIDATES: $(wc -l < /tmp/validation-dispatch-candidates.txt)"
echo "OFFER_SENT: $(wc -l < /tmp/validation-offer-sent.txt)"
echo "OFFER_EXPIRED: $(wc -l < /tmp/validation-offer-expired.txt)"
echo "RIDE_STATUS_CHANGED: $(wc -l < /tmp/validation-status-changed.txt)"
```

---

## Passo 3.5: Gerar Evidências Automaticamente (Opcional)

```bash
set -euo pipefail

OUT_MD="/tmp/EVIDENCIAS-RIDE-FLOW.md"
ANX_DIR="/tmp/EVIDENCIAS-ANEXOS"
FULL="/tmp/validation-full-logs.txt"

mkdir -p "$ANX_DIR"

# Copiar anexos
cp -f /tmp/validation-ride-created.txt "$ANX_DIR/01_ride_created.log" || :
cp -f /tmp/validation-dispatcher-filter.txt "$ANX_DIR/02_dispatcher_filter.log" || :
cp -f /tmp/validation-dispatch-candidates.txt "$ANX_DIR/03_dispatch_candidates.log" || :
cp -f /tmp/validation-offer-sent.txt "$ANX_DIR/04_offer_sent.log" || :
cp -f /tmp/validation-offer-expired.txt "$ANX_DIR/05_offer_expired.log" || :
cp -f /tmp/validation-status-changed.txt "$ANX_DIR/06_status_changed.log" || :

# Amostras (primeiras 30 linhas)
head -n 30 /tmp/validation-ride-created.txt > "$ANX_DIR/SAMPLE_01_ride_created.log" || :
head -n 30 /tmp/validation-dispatcher-filter.txt > "$ANX_DIR/SAMPLE_02_dispatcher_filter.log" || :
head -n 30 /tmp/validation-dispatch-candidates.txt > "$ANX_DIR/SAMPLE_03_dispatch_candidates.log" || :
head -n 30 /tmp/validation-offer-sent.txt > "$ANX_DIR/SAMPLE_04_offer_sent.log" || :
head -n 30 /tmp/validation-offer-expired.txt > "$ANX_DIR/SAMPLE_05_offer_expired.log" || :
head -n 30 /tmp/validation-status-changed.txt > "$ANX_DIR/SAMPLE_06_status_changed.log" || :

# Contagens
C_RIDE_CREATED=$(wc -l < /tmp/validation-ride-created.txt || echo 0)
C_FILTER=$(wc -l < /tmp/validation-dispatcher-filter.txt || echo 0)
C_CAND=$(wc -l < /tmp/validation-dispatch-candidates.txt || echo 0)
C_SENT=$(wc -l < /tmp/validation-offer-sent.txt || echo 0)
C_EXPIRED=$(wc -l < /tmp/validation-offer-expired.txt || echo 0)
C_STATUS=$(wc -l < /tmp/validation-status-changed.txt || echo 0)

LINES_TOTAL=$(wc -l < "$FULL" || echo 0)
BYTES_TOTAL=$(wc -c < "$FULL" || echo 0)

# Gerar markdown
cat > "$OUT_MD" <<'MD'
# EVIDÊNCIAS — RIDE FLOW (Validation)

## Resumo
- Total linhas (full): LINES_TOTAL
- Tamanho (bytes): BYTES_TOTAL

## Marcadores (contagem)
- RIDE_CREATED: C_RIDE_CREATED
- DISPATCHER_FILTER: C_FILTER
- DISPATCH_CANDIDATES: C_CAND
- OFFER_SENT: C_SENT
- OFFER_EXPIRED: C_EXPIRED
- RIDE_STATUS_CHANGED: C_STATUS

## Amostras (primeiras 30 linhas)
Ver arquivos em: /tmp/EVIDENCIAS-ANEXOS/SAMPLE_*.log
MD

# Substituir placeholders
sed -i "s/LINES_TOTAL/$LINES_TOTAL/g" "$OUT_MD"
sed -i "s/BYTES_TOTAL/$BYTES_TOTAL/g" "$OUT_MD"
sed -i "s/C_RIDE_CREATED/$C_RIDE_CREATED/g" "$OUT_MD"
sed -i "s/C_FILTER/$C_FILTER/g" "$OUT_MD"
sed -i "s/C_CAND/$C_CAND/g" "$OUT_MD"
sed -i "s/C_SENT/$C_SENT/g" "$OUT_MD"
sed -i "s/C_EXPIRED/$C_EXPIRED/g" "$OUT_MD"
sed -i "s/C_STATUS/$C_STATUS/g" "$OUT_MD"

echo "✅ Evidências geradas:"
echo " - $OUT_MD"
echo " - $ANX_DIR/"
ls -lh "$OUT_MD" "$ANX_DIR/"
```

---

## Passo 4: Sanity Check DB (via ECS psql-runner)

```bash
set -euo pipefail

cat > /tmp/ecs-psql-sanity-rideflow.json <<'EOF'
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
    "command": ["sh", "-c", "echo '=== TABLES EXIST? ===' && psql -c \"SELECT to_regclass('public.rides_v2') AS rides_v2, to_regclass('public.ride_offers') AS ride_offers;\" && echo '' && echo '=== COUNTS ===' && psql -c \"SELECT (SELECT count(*) FROM rides_v2) AS rides_v2_count, (SELECT count(*) FROM ride_offers) AS ride_offers_count;\" && echo '' && echo '=== LAST 20 rides_v2 ===' && psql -c \"SELECT id, status, created_at FROM rides_v2 ORDER BY created_at DESC LIMIT 20;\" && echo '' && echo '=== LAST 20 ride_offers ===' && psql -c \"SELECT id, ride_id, driver_id, status, created_at FROM ride_offers ORDER BY created_at DESC LIMIT 20;\" && echo '[OK]'"]
  }]
}
EOF

TASK_ARN=$(aws ecs run-task \
  --cluster kaviar-cluster \
  --task-definition kaviar-psql-runner \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-046613642f742faa2,subnet-01a498f7b4f3fcff5],securityGroups=[sg-0a54bc7272cae4623],assignPublicIp=ENABLED}" \
  --overrides file:///tmp/ecs-psql-sanity-rideflow.json \
  --region us-east-2 \
  --query "tasks[0].taskArn" \
  --output text)

TASK_ID=$(echo "$TASK_ARN" | awk -F'/' '{print $NF}')
echo "Sanity Check Task: $TASK_ARN"

# Aguardar stream
for i in $(seq 1 12); do
  STREAM=$(aws logs describe-log-streams \
    --region us-east-2 \
    --log-group-name /ecs/kaviar-psql-runner \
    --order-by LastEventTime \
    --descending \
    --max-items 50 \
    --query "logStreams[?contains(logStreamName, \`$TASK_ID\`)].logStreamName | [0]" \
    --output text)
  
  if [ -n "$STREAM" ] && [ "$STREAM" != "None" ]; then
    break
  fi
  sleep 5
done

# Baixar logs
aws logs get-log-events \
  --region us-east-2 \
  --log-group-name /ecs/kaviar-psql-runner \
  --log-stream-name "$STREAM" \
  --limit 2000 \
  --output json | jq -r '.events[].message' | tee /tmp/validation-db-sanity.txt

echo ""
echo "✅ Sanity check: /tmp/validation-db-sanity.txt"

# Verificar se tabelas existem
if grep -q "rides_v2" /tmp/validation-db-sanity.txt && grep -q "ride_offers" /tmp/validation-db-sanity.txt; then
  echo "✅ Tabelas existem"
else
  echo "❌ TABELAS NÃO EXISTEM - Rodar Passo 1 (Migration)"
  exit 1
fi
```

---

## Passo 5: SQL Completo via ECS psql-runner

```bash
set -euo pipefail

cat > /tmp/ecs-psql-sql-full.json <<'EOF'
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
    "command": ["sh", "-c", "echo '=== SQL FULL: PRECHECK ===' && psql -v ON_ERROR_STOP=1 -c \"DO \\$\\$ DECLARE r1 regclass; r2 regclass; BEGIN r1 := to_regclass('public.rides_v2'); r2 := to_regclass('public.ride_offers'); IF r1 IS NULL OR r2 IS NULL THEN RAISE EXCEPTION 'TABELAS NÃO EXISTEM (rodar Passo 1)'; END IF; END \\$\\$;\" && echo '' && echo '=== RIDES_V2: COUNT BY STATUS ===' && psql -c \"SELECT status, count(*)::int AS qty FROM rides_v2 GROUP BY status ORDER BY qty DESC, status;\" && echo '' && echo '=== RIDE_OFFERS: COUNT BY STATUS ===' && psql -c \"SELECT status, count(*)::int AS qty FROM ride_offers GROUP BY status ORDER BY qty DESC, status;\" && echo '' && echo '=== LAST 20 RIDES_V2 ===' && psql -c \"SELECT id, passenger_id, driver_id, status, origin, destination, pickup_neighborhood_id, dropoff_neighborhood_id, created_at FROM rides_v2 ORDER BY created_at DESC LIMIT 20;\" && echo '' && echo '=== OFFERS FOR LAST 20 RIDES ===' && psql -c \"WITH last_rides AS (SELECT id FROM rides_v2 ORDER BY created_at DESC LIMIT 20) SELECT o.id, o.ride_id, o.driver_id, o.status, o.created_at FROM ride_offers o JOIN last_rides r ON r.id = o.ride_id ORDER BY o.created_at DESC;\" && echo '' && echo '=== OFFERS: AGG METRICS ===' && psql -c \"SELECT count(*)::int AS offers_total, sum(CASE WHEN status ILIKE '%sent%' THEN 1 ELSE 0 END)::int AS offers_sent_like, sum(CASE WHEN status ILIKE '%expired%' THEN 1 ELSE 0 END)::int AS offers_expired_like, sum(CASE WHEN status ILIKE '%accept%' THEN 1 ELSE 0 END)::int AS offers_accepted_like FROM ride_offers;\" && echo '[OK] SQL FULL COMPLETE'"]
  }]
}
EOF

TASK_ARN=$(aws ecs run-task \
  --cluster kaviar-cluster \
  --task-definition kaviar-psql-runner \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-046613642f742faa2,subnet-01a498f7b4f3fcff5],securityGroups=[sg-0a54bc7272cae4623],assignPublicIp=ENABLED}" \
  --overrides file:///tmp/ecs-psql-sql-full.json \
  --region us-east-2 \
  --query "tasks[0].taskArn" \
  --output text)

TASK_ID=$(echo "$TASK_ARN" | awk -F'/' '{print $NF}')
echo "SQL Full Task: $TASK_ARN"

# Aguardar stream (até 2 min)
STREAM=""
for i in $(seq 1 24); do
  STREAM=$(aws logs describe-log-streams \
    --region us-east-2 \
    --log-group-name /ecs/kaviar-psql-runner \
    --order-by LastEventTime \
    --descending \
    --max-items 50 \
    --query "logStreams[?contains(logStreamName, \`$TASK_ID\`)].logStreamName | [0]" \
    --output text)
  
  if [ -n "$STREAM" ] && [ "$STREAM" != "None" ]; then
    break
  fi
  sleep 5
done

if [ -z "$STREAM" ] || [ "$STREAM" = "None" ]; then
  echo "❌ Stream não encontrado"
  exit 1
fi

# Baixar logs SQL
aws logs get-log-events \
  --region us-east-2 \
  --log-group-name /ecs/kaviar-psql-runner \
  --log-stream-name "$STREAM" \
  --limit 2000 \
  --output json | jq -r '.events[].message' | tee /tmp/validation-sql-full.txt

echo ""
echo "✅ SQL completo: /tmp/validation-sql-full.txt"

# Verificar se completou
if grep -q "SQL FULL COMPLETE" /tmp/validation-sql-full.txt; then
  echo "✅ SQL completo executado com sucesso"
else
  echo "❌ SQL FALHOU - Ver /tmp/validation-sql-full.txt"
  exit 1
fi
```

---

## Passo 6: Preencher Evidências
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

# Executar
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
  echo "Aguardando SQL stream... $i/12"
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
  --output json | jq -r '.events[].message' > /tmp/validation-sql-all.txt

echo "✅ SQL: /tmp/validation-sql-all.txt ($(wc -l < /tmp/validation-sql-all.txt) linhas)"
cat /tmp/validation-sql-all.txt

# Verificar sanity
if grep -q "(0 rows)" /tmp/validation-sql-all.txt | head -5; then
  echo "❌ TABELAS NÃO EXISTEM - Rodar Passo 1 (Migration) novamente"
  exit 1
fi
```

---

## Passo 5: Preencher Evidências

**Opção A: Manual**

```bash
nano backend/docs/EVIDENCIAS-VALIDACAO-ECS.md
```

**Opção B: Automático (usar arquivo gerado no Passo 3.5)**

```bash
cat /tmp/EVIDENCIAS-RIDE-FLOW.md
# Copiar conteúdo relevante para backend/docs/EVIDENCIAS-VALIDACAO-ECS.md
```

Preencher:
- Migration Task ARN (de `/tmp/validation-migrate-task-arn.txt`)
- Validation Task ARN (de `/tmp/validation-task-arn.txt`)
- Horários (anotados no Passo 2)
- Logs (copiar marcadores de `/tmp/validation-*.txt`)
- SQL (copiar de `/tmp/validation-sql-all.txt`)
- Resumo (contar rides/offers)
- Conclusão: ✅ APROVADO ou ❌ REPROVADO

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

---

## Troubleshooting

**Stream não aparece (STREAM=None)**
- Aguardar loop 60s (12x5s) já está no script
- Se ainda falhar: verificar Task ARN correto

**Arquivo vazio**
- Usar `jq -r` (não `--output text`)
- Mensagens podem ter TAB → script já usa `jq -r`

**Tabelas não existem**
- Rodar Passo 1 (Migration) primeiro
- Sanity check detecta automaticamente

---

## Arquivos Gerados

- `/tmp/ecs-migrate-overrides.json`
- `/tmp/ecs-validation-overrides.json`
- `/tmp/ecs-psql-runner-overrides.json`
- `/tmp/validation-migrate-task-arn.txt`
- `/tmp/validation-migrate-logs.txt`
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

**Tempo:** ~30-35 min  
**Pronto para copiar/colar!** 🚀


---

## Passo 6: Preencher Evidências (AUTO - Idempotente)

```bash
set -euo pipefail

EVID="/tmp/EVIDENCIAS-RIDE-FLOW.md"
DB="/tmp/validation-db-sanity.txt"
SQL="/tmp/validation-sql-full.txt"
RUN_UTC=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# Prechecks
[ -f "$DB" ] || { echo "❌ Falta $DB (rode Passo 4)"; exit 1; }
[ -f "$SQL" ] || { echo "❌ Falta $SQL (rode Passo 5)"; exit 1; }

# Criar base se não existir
if [ ! -f "$EVID" ]; then
  cat > "$EVID" <<'MD'
# EVIDÊNCIAS — RIDE FLOW (Validation)

Gerado automaticamente.

MD
fi

# Remover seção auto anterior (idempotente)
TMP_BASE="/tmp/EVID_BASE.md"
awk 'BEGIN{drop=0} /^## Evidências DB e SQL \(auto\)/{drop=1} {if (!drop) print}' "$EVID" > "$TMP_BASE"

# Extrair blocos
RIDES_BY_STATUS=$(awk 'BEGIN{p=0} /RIDES_V2: COUNT BY STATUS/{p=1;next} /RIDE_OFFERS: COUNT BY STATUS/{p=0} p{print}' "$SQL" | sed -n '1,120p' || true)
OFFERS_BY_STATUS=$(awk 'BEGIN{p=0} /RIDE_OFFERS: COUNT BY STATUS/{p=1;next} /LAST 20 RIDES_V2/{p=0} p{print}' "$SQL" | sed -n '1,120p' || true)
OFFERS_AGG=$(awk 'BEGIN{p=0} /OFFERS: AGG METRICS/{p=1;next} /\[OK\] SQL FULL COMPLETE/{p=0} p{print}' "$SQL" | sed -n '1,80p' || true)

# Reescrever arquivo (base + seção nova)
cat > "$EVID" <<MD
$(cat "$TMP_BASE")

---
## Evidências DB e SQL (auto) — ${RUN_UTC}

### Checklist
- [x] DB sanity: \`$DB\`
- [x] SQL full: \`$SQL\`

### Rides por status
\`\`\`
${RIDES_BY_STATUS:-[sem dados]}
\`\`\`

### Offers por status
\`\`\`
${OFFERS_BY_STATUS:-[sem dados]}
\`\`\`

### Offers agregados
\`\`\`
${OFFERS_AGG:-[sem dados]}
\`\`\`

### DB sanity (raw — últimos 260 linhas)
\`\`\`
$(tail -n 260 "$DB" || true)
\`\`\`

### SQL full (raw — últimos 320 linhas)
\`\`\`
$(tail -n 320 "$SQL" || true)
\`\`\`
MD

echo "✅ Evidências atualizadas (idempotente): $EVID"
tail -n 60 "$EVID"
```

**Nota:** Este passo é idempotente - pode rodar múltiplas vezes sem duplicar conteúdo.

---

## Passo 7: Copiar Evidências + Commit

```bash
set -euo pipefail

cd /home/goes/kaviar/backend

DEST_DIR="docs/evidencias"
RUN_ID=$(date -u +%Y%m%dT%H%M%SZ)
DEST_RUN="${DEST_DIR}/ride-flow-validation-${RUN_ID}"

mkdir -p "$DEST_RUN/anexos"

# Evidências auto (se rodou Passo 3.5)
[ -f /tmp/EVIDENCIAS-RIDE-FLOW.md ] && cp -f /tmp/EVIDENCIAS-RIDE-FLOW.md "$DEST_RUN/EVIDENCIAS-RIDE-FLOW.md" || :

# Anexos
[ -d /tmp/EVIDENCIAS-ANEXOS ] && cp -R /tmp/EVIDENCIAS-ANEXOS/. "$DEST_RUN/anexos/" || :

# Sanity + SQL full
[ -f /tmp/validation-db-sanity.txt ] && cp -f /tmp/validation-db-sanity.txt "$DEST_RUN/validation-db-sanity.txt" || :
[ -f /tmp/validation-sql-full.txt ] && cp -f /tmp/validation-sql-full.txt "$DEST_RUN/validation-sql-full.txt" || :

# Logs marcadores (Passo 3)
for f in \
  /tmp/validation-full-logs.txt \
  /tmp/validation-ride-created.txt \
  /tmp/validation-dispatcher-filter.txt \
  /tmp/validation-dispatch-candidates.txt \
  /tmp/validation-offer-sent.txt \
  /tmp/validation-offer-expired.txt \
  /tmp/validation-status-changed.txt
do
  [ -f "$f" ] && cp -f "$f" "$DEST_RUN/anexos/$(basename "$f")" || :
done

echo "✅ Evidências copiadas para: $DEST_RUN"
ls -lh "$DEST_RUN"

# Commit
cd /home/goes/kaviar
git add "$DEST_RUN"
git commit -m "docs(evidences): ride flow validation run" \
  -m "Adds backend log markers, DB sanity check, and SQL full output for this validation run."
git push origin feat/dev-load-test-ride-flow-v1

# Marcar checkbox
nano PRODUCAO-CHECKLIST.md
# Marcar: [x] Evidências em staging

git add PRODUCAO-CHECKLIST.md
git commit -m "chore: mark evidence checkbox"
git push origin feat/dev-load-test-ride-flow-v1
```

---

## Passo 7.1: Gerar Manifest de Integridade (Opcional)

```bash
set -euo pipefail

cd /home/goes/kaviar/backend

# Usar DEST_RUN do Passo 7
DEST_RUN="${DEST_DIR}/ride-flow-validation-${RUN_ID}"

# Gerar SHA256 de todos os arquivos
MANIFEST="${DEST_RUN}/MANIFEST.json"
MANIFEST_HASH="${DEST_RUN}/MANIFEST.sha256"

echo '{"files":[' > "$MANIFEST"

FIRST=1
find "$DEST_RUN" -type f ! -name "MANIFEST.*" | while read -r f; do
  REL_PATH="${f#$DEST_RUN/}"
  HASH=$(sha256sum "$f" | awk '{print $1}')
  SIZE=$(stat -c%s "$f")
  
  [ "$FIRST" -eq 0 ] && echo "," >> "$MANIFEST"
  FIRST=0
  
  cat >> "$MANIFEST" <<JSON
{"path":"$REL_PATH","sha256":"$HASH","size":$SIZE}
JSON
done

echo ']}' >> "$MANIFEST"

# Hash do manifest
sha256sum "$MANIFEST" > "$MANIFEST_HASH"

echo "✅ Manifest gerado: $MANIFEST"
cat "$MANIFEST_HASH"
```

---

## Passo 7.2: Verificar Integridade (Opcional)

```bash
set -euo pipefail

cd /home/goes/kaviar/backend

# Usar DEST_RUN do Passo 7
DEST_RUN="${DEST_DIR}/ride-flow-validation-${RUN_ID}"

MANIFEST="${DEST_RUN}/MANIFEST.json"
MANIFEST_HASH="${DEST_RUN}/MANIFEST.sha256"

[ -f "$MANIFEST" ] || { echo "❌ Falta $MANIFEST"; exit 1; }
[ -f "$MANIFEST_HASH" ] || { echo "❌ Falta $MANIFEST_HASH"; exit 1; }

echo "=== Verificando hash do MANIFEST.json ==="
sha256sum -c "$MANIFEST_HASH"

echo ""
echo "=== Verificando arquivos do MANIFEST ==="
jq -r '.files[] | "\(.sha256)  '"$DEST_RUN"'/" + .path' "$MANIFEST" > /tmp/manifest-files.sha256

if sha256sum -c /tmp/manifest-files.sha256; then
  echo "✅ Integridade OK (todos os sha256 batem)"
else
  echo "❌ Integridade FALHOU"
  exit 1
fi
```

---

## Passo 7.3: Commit Manifest (Opcional)

```bash
set -euo pipefail

cd /home/goes/kaviar

git add "$DEST_RUN/MANIFEST.json" "$DEST_RUN/MANIFEST.sha256"
git commit -m "docs(evidences): add integrity manifest" \
  -m "Adds MANIFEST.json + MANIFEST.sha256 for audit-grade integrity checks."
git push origin feat/dev-load-test-ride-flow-v1
```

---

## Passo 7.4: Carimbar com Git Commit (Opcional)

```bash
set -euo pipefail

cd /home/goes/kaviar/backend

# Usar DEST_RUN do Passo 7
DEST_RUN="${DEST_DIR}/ride-flow-validation-${RUN_ID}"

EVID="${DEST_RUN}/EVIDENCIAS-RIDE-FLOW.md"
[ -f "$EVID" ] || { echo "❌ Falta $EVID"; exit 1; }

RUN_UTC=$(date -u +%Y-%m-%dT%H:%M:%SZ)
BRANCH=$(git rev-parse --abbrev-ref HEAD)
COMMIT=$(git rev-parse HEAD)

TMP="/tmp/evid-stamped.md"

# Remover bloco anterior (idempotente)
awk 'BEGIN{drop=0} /^## Build\/Commit \(auto\)/{drop=1} drop && /^---$/{drop=0; next} !drop{print}' "$EVID" > "$TMP"

# Reescrever com carimbo
cat > "$EVID" <<MD
## Build/Commit (auto)
- UTC: ${RUN_UTC}
- Branch: ${BRANCH}
- Commit: ${COMMIT}

---

$(cat "$TMP")
MD

echo "✅ Carimbo inserido: $EVID"
head -n 25 "$EVID"
```

---

## Passo 7.5: Anexar Resumo do Manifest (Opcional)

```bash
set -euo pipefail

cd /home/goes/kaviar/backend

# Usar DEST_RUN do Passo 7
DEST_RUN="${DEST_DIR}/ride-flow-validation-${RUN_ID}"

EVID="${DEST_RUN}/EVIDENCIAS-RIDE-FLOW.md"
MANIFEST="${DEST_RUN}/MANIFEST.json"

[ -f "$EVID" ] || { echo "❌ Falta $EVID"; exit 1; }
[ -f "$MANIFEST" ] || { echo "❌ Falta $MANIFEST (rode 7.1)"; exit 1; }

RUN_UTC=$(date -u +%Y-%m-%dT%H:%M:%SZ)

TOTAL_FILES=$(jq -r '.files | length' "$MANIFEST")
TOTAL_BYTES=$(jq -r '[.files[].size] | add' "$MANIFEST")

TOP10=$(jq -r '.files[:10][] | "\(.path) | \(.size) bytes | \(.sha256)"' "$MANIFEST")

{
  echo ""
  echo "---"
  echo "## Manifest (auto) — ${RUN_UTC}"
  echo ""
  echo "- Arquivos: ${TOTAL_FILES}"
  echo "- Total bytes: ${TOTAL_BYTES}"
  echo ""
  echo "### Top 10 (path | bytes | sha256)"
  echo '```'
  echo "$TOP10"
  echo '```'
} >> "$EVID"

echo "✅ Seção Manifest anexada: $EVID"
tail -n 40 "$EVID"
```

---

## Passo 7.6: Commit Complementos (Opcional)

```bash
set -euo pipefail

cd /home/goes/kaviar

git add "$DEST_RUN/EVIDENCIAS-RIDE-FLOW.md"
git commit -m "docs(evidences): stamp with commit + manifest summary" \
  -m "Adds build/commit traceability and manifest summary for audit readability."
git push origin feat/dev-load-test-ride-flow-v1
```

---

## Arquivos Gerados (Resumo Final)

**Temporários (/tmp):**
- `validation-migrate-logs.txt`
- `validation-task-arn.txt` / `validation-task-id.txt`
- `validation-full-logs.txt` (paginado)
- `validation-ride-created.txt`
- `validation-dispatcher-filter.txt`
- `validation-dispatch-candidates.txt`
- `validation-offer-sent.txt`
- `validation-offer-expired.txt`
- `validation-status-changed.txt`
- `validation-db-sanity.txt`
- `validation-sql-full.txt`
- `EVIDENCIAS-RIDE-FLOW.md` (se rodou 3.5)
- `EVIDENCIAS-ANEXOS/` (se rodou 3.5)

**Arquivados (repo):**
- `backend/docs/evidencias/ride-flow-validation-YYYYMMDDTHHMMSSZ/`

---

## Tempo Total: ~25-35 min

**Validação completa! 🚀**
