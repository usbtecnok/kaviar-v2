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

## Passo 4: SQL via ECS psql-runner

```bash
# Criar overrides com sanity check
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
