# Roteiro: Validação Ride-Flow V1 no ECS (kaviar_validation)

## Contexto

**Ambiente:** Validação via **ECS run-task one-off** (não há service/DNS staging)

**Database:** `kaviar_validation` no RDS prod (isolado)

**Objetivo:** Executar 20 rides e coletar evidências técnicas do fluxo completo

**Nota:** Este é um ambiente de validação temporário. A task executa, coleta evidências e para.

---

## Passo 1: Validar Conexão DB

```bash
# Testar conexão (vai pedir senha)
psql "postgresql://usbtecnok@kaviar-prod-db.cxuuaq46o1o5.us-east-2.rds.amazonaws.com:5432/kaviar_validation?sslmode=require" \
  -c "SELECT current_database() AS db, current_user AS usr;"

# Esperado:
#       db        |    usr    
# ----------------+-----------
#  kaviar_validation | usbtecnok
```

**Status:** [ ] Conexão OK

---

## Passo 2: Aplicar Permissões (se necessário)

```bash
# Tentar com usbtecnok primeiro
psql "postgresql://usbtecnok@kaviar-prod-db.cxuuaq46o1o5.us-east-2.rds.amazonaws.com:5432/kaviar_validation?sslmode=require" <<'SQL'
GRANT USAGE, CREATE ON SCHEMA public TO usbtecnok;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT,INSERT,UPDATE,DELETE ON TABLES TO usbtecnok;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE,SELECT,UPDATE ON SEQUENCES TO usbtecnok;
SQL
```

**Se der "permission denied":**
```bash
# Usar usuário admin do RDS (kaviaradmin)
psql "postgresql://kaviaradmin@kaviar-prod-db.cxuuaq46o1o5.us-east-2.rds.amazonaws.com:5432/kaviar_validation?sslmode=require" <<'SQL'
GRANT USAGE, CREATE ON SCHEMA public TO usbtecnok;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT,INSERT,UPDATE,DELETE ON TABLES TO usbtecnok;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE,SELECT,UPDATE ON SEQUENCES TO usbtecnok;
SQL
```

**Status:** [ ] Permissões aplicadas

---

## Passo 3: Definir VALIDATION_DATABASE_URL

```bash
# Exportar (substituir SENHA_AQUI pela senha real)
export VALIDATION_DATABASE_URL="postgresql://usbtecnok:SENHA_AQUI@kaviar-prod-db.cxuuaq46o1o5.us-east-2.rds.amazonaws.com:5432/kaviar_validation?sslmode=require"

# Verificar (sem mostrar senha)
echo ${VALIDATION_DATABASE_URL%%:*}  # Deve mostrar: postgresql://usbtecnok
```

**Status:** [ ] Variável exportada

---

## Passo 4: Rodar ECS Run-Task

### 4.1 Criar arquivo de overrides

```bash
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
        "echo '=== VALIDATION RUN ===' && echo 'Image: 11bdd8c' && npx prisma migrate deploy && echo '=== SEED ===' && npx tsx prisma/seed-ride-flow-v1.ts && echo '=== STARTING SERVER ===' && node dist/server.js & sleep 10 && echo '=== TESTING 20 RIDES ===' && export API_URL=http://127.0.0.1:3001 && cd /app && bash scripts/test-ride-flow-v1.sh && echo '=== DONE ===' && sleep 30"
      ]
    }
  ]
}
EOF

# Verificar arquivo criado (sem mostrar senha)
cat /tmp/ecs-validation-overrides.json | jq '.containerOverrides[0] | {name, image, command}'
```

**Nota:** A senha do DATABASE_URL vem da variável `$VALIDATION_DATABASE_URL` exportada no Passo 3.

**Status:** [ ] Arquivo de overrides criado

### 4.2 Executar run-task

```bash
# Executar task e salvar resultado como evidência
aws ecs run-task \
  --cluster kaviar-cluster \
  --task-definition arn:aws:ecs:us-east-2:847895361928:task-definition/kaviar-backend:148 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-046613642f742faa2,subnet-01a498f7b4f3fcff5],securityGroups=[sg-0a54bc7272cae4623],assignPublicIp=ENABLED}" \
  --overrides file:///tmp/ecs-validation-overrides.json \
  --region us-east-2 \
  > /tmp/ecs-validation-run-task.json

# Verificar se task foi criada
if [ ! -s /tmp/ecs-validation-run-task.json ]; then
  echo "❌ Erro ao criar task"
  exit 1
fi

# Extrair task ARN
TASK_ARN=$(cat /tmp/ecs-validation-run-task.json | jq -r '.tasks[0].taskArn')
TASK_ID=$(echo "$TASK_ARN" | awk -F'/' '{print $NF}')

echo "Task ARN: $TASK_ARN"
echo "Task ID: $TASK_ID"

# Salvar para referência
echo "$TASK_ARN" > /tmp/validation-task-arn.txt
```

echo "Task ARN: $TASK_ARN"
echo "Task ID: $TASK_ID"
```

**Status:** [ ] Task iniciada

**Anotar:**
- Task ARN: _______________________
- Task ID: _______________________
- Horário início: `date -u` = _______________________

---

## Passo 5: Monitorar Execução

```bash
# Configurar variáveis
REGION="us-east-2"
CLUSTER="kaviar-cluster"
TASK_ARN="COLE_O_TASK_ARN_AQUI"  # Do Passo 4.2 (ou use: cat /tmp/validation-task-arn.txt)

# Verificar status atual (comando completo)
aws ecs describe-tasks \
  --region "$REGION" \
  --cluster "$CLUSTER" \
  --tasks "$TASK_ARN" \
  --query "tasks[0].{lastStatus:lastStatus,desiredStatus:desiredStatus,stopCode:stopCode,stoppedReason:stoppedReason}" \
  --output json

# Ou acompanhar em loop (Ctrl+C para sair)
watch -n 5 "aws ecs describe-tasks \
  --region $REGION \
  --cluster $CLUSTER \
  --tasks $TASK_ARN \
  --query 'tasks[0].lastStatus' \
  --output text"

# Status esperados:
# PROVISIONING → PENDING → RUNNING → STOPPED
```

**Aguardar até status = STOPPED** (~5-10 min)

**Status:** [ ] Task completada (STOPPED)

---

## Passo 6: Coletar Logs do CloudWatch

### 6.1 Descobrir log stream (descoberta automática)

```bash
# Configurar variáveis
REGION="us-east-2"
LOG_GROUP="/ecs/kaviar-backend"
TASK_ARN="COLE_O_TASK_ARN_AQUI"  # Do Passo 4.2

# Extrair Task ID
TASK_ID=$(echo "$TASK_ARN" | awk -F/ '{print $NF}')
echo "Task ID: $TASK_ID"

# Descobrir log stream automaticamente (busca nos últimos 50 streams)
STREAM=$(aws logs describe-log-streams \
  --region "$REGION" \
  --log-group-name "$LOG_GROUP" \
  --order-by LastEventTime \
  --descending \
  --max-items 50 \
  --query "logStreams[?contains(logStreamName, \`$TASK_ID\`)].logStreamName | [0]" \
  --output text)

echo "Log Stream: $STREAM"

# Verificar se encontrou (validação robusta)
if [ -z "$STREAM" ] || [ "$STREAM" = "None" ]; then
  echo "❌ Stream não encontrado para TASK_ID=$TASK_ID"
  echo "Streams recentes:"
  aws logs describe-log-streams \
    --region "$REGION" \
    --log-group-name "$LOG_GROUP" \
    --order-by LastEventTime \
    --descending \
    --max-items 20 \
    --query "logStreams[].logStreamName" \
    --output text | tr '\t' '\n'
  exit 1
fi
```

**Anotar:**
- Log Stream: _______________________

### 6.2 Baixar logs completos

```bash
# Baixar todos os logs da task (até 10000 eventos)
aws logs get-log-events \
  --region "$REGION" \
  --log-group-name "$LOG_GROUP" \
  --log-stream-name "$STREAM" \
  --limit 10000 \
  --query "events[].message" \
  --output text > /tmp/validation-full-logs.txt

# Ver tamanho
wc -l /tmp/validation-full-logs.txt
echo "Primeiras 20 linhas:"
head -20 /tmp/validation-full-logs.txt
```

### 6.3 Extrair marcadores (filtros robustos)

```bash
# Filtros genéricos (case-insensitive) para capturar variações
grep -Ei "ride|/api/v2/rides" /tmp/validation-full-logs.txt > /tmp/validation-ride.txt
grep -Ei "dispatch|match|candidate" /tmp/validation-full-logs.txt > /tmp/validation-dispatch.txt
grep -Ei "offer" /tmp/validation-full-logs.txt > /tmp/validation-offer.txt
grep -Ei "timeout|expired" /tmp/validation-full-logs.txt > /tmp/validation-timeout.txt
grep -Ei "status.*changed|transition" /tmp/validation-full-logs.txt > /tmp/validation-status.txt

# Marcadores específicos (se existirem)
grep "RIDE_CREATED" /tmp/validation-full-logs.txt > /tmp/validation-ride-created.txt 2>/dev/null || touch /tmp/validation-ride-created.txt
grep "DISPATCHER" /tmp/validation-full-logs.txt > /tmp/validation-dispatcher.txt 2>/dev/null || touch /tmp/validation-dispatcher.txt
grep "OFFER_SENT" /tmp/validation-full-logs.txt > /tmp/validation-offer-sent.txt 2>/dev/null || touch /tmp/validation-offer-sent.txt
grep "STATUS_CHANGED" /tmp/validation-full-logs.txt > /tmp/validation-status-changed.txt 2>/dev/null || touch /tmp/validation-status-changed.txt

# Contar ocorrências
echo "=== Filtros Genéricos ==="
echo "RIDE (genérico): $(wc -l < /tmp/validation-ride.txt)"
echo "DISPATCH (genérico): $(wc -l < /tmp/validation-dispatch.txt)"
echo "OFFER (genérico): $(wc -l < /tmp/validation-offer.txt)"
echo "TIMEOUT (genérico): $(wc -l < /tmp/validation-timeout.txt)"
echo "STATUS (genérico): $(wc -l < /tmp/validation-status.txt)"
echo ""
echo "=== Marcadores Específicos ==="
echo "RIDE_CREATED: $(wc -l < /tmp/validation-ride-created.txt)"
echo "DISPATCHER: $(wc -l < /tmp/validation-dispatcher.txt)"
echo "OFFER_SENT: $(wc -l < /tmp/validation-offer-sent.txt)"
echo "STATUS_CHANGED: $(wc -l < /tmp/validation-status-changed.txt)"
```

**Checklist de marcadores:**
- [ ] RIDE_CREATED: >= 20
- [ ] DISPATCHER: >= 20
- [ ] OFFER: >= 1
- [ ] STATUS_CHANGED: >= 1

---

## Passo 7: Coletar Dados SQL

```bash
# Conectar no DB validation
psql "$VALIDATION_DATABASE_URL" <<'SQL' > /tmp/validation-sql-rides-status.txt
SELECT status, COUNT(*) as count
FROM rides_v2
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY status
ORDER BY count DESC;
SQL

psql "$VALIDATION_DATABASE_URL" <<'SQL' > /tmp/validation-sql-offers-status.txt
SELECT status, COUNT(*) as count
FROM ride_offers
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY status
ORDER BY count DESC;
SQL

psql "$VALIDATION_DATABASE_URL" <<'SQL' > /tmp/validation-sql-rides-details.txt
SELECT id, status, created_at, offered_at,
  (SELECT COUNT(*) FROM ride_offers WHERE ride_id = rides_v2.id) as offer_count
FROM rides_v2
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 20;
SQL

# Ver resultados
cat /tmp/validation-sql-rides-status.txt
cat /tmp/validation-sql-offers-status.txt
```

**Status:** [ ] Dados SQL coletados

---

## Passo 8: Preencher Documento de Evidências

```bash
cd /home/goes/kaviar/backend

# Abrir documento
nano docs/EVIDENCIAS-STAGING-RIDE-FLOW.md
```

**Preencher seções:**

1. **Data/Hora do Teste**
   - Início: [horário anotado no Passo 4.2]
   - Fim: [horário quando task parou]

2. **Execução do Teste**
   - Copiar output de `/tmp/validation-full-logs.txt` (seção do teste)

3. **Logs CloudWatch**
   - RIDE_CREATED: copiar de `/tmp/validation-ride-created.txt`
   - DISPATCHER: copiar de `/tmp/validation-dispatcher.txt`
   - OFFER: copiar de `/tmp/validation-offers.txt`
   - STATUS_CHANGED: copiar de `/tmp/validation-status.txt`

4. **Evidências SQL**
   - Rides por status: copiar de `/tmp/validation-sql-rides-status.txt`
   - Offers por status: copiar de `/tmp/validation-sql-offers-status.txt`
   - Detalhes: copiar de `/tmp/validation-sql-rides-details.txt`

5. **Resumo Executivo**
   - Total de rides criadas: [contar]
   - Rides processadas pelo dispatcher: [contar]
   - Offers enviadas: [contar]
   - Status finais: [resumir]

6. **Conclusão**
   - Status: ✅ APROVADO ou ❌ REPROVADO
   - Justificativa: [baseado nos critérios]

**Status:** [ ] Documento preenchido

---

## Passo 9: Commit e Push

```bash
cd /home/goes/kaviar

# Adicionar evidências
git add backend/docs/EVIDENCIAS-STAGING-RIDE-FLOW.md

# Commit
git commit -m "docs: Add validation evidence for SPEC_RIDE_FLOW_V1

- 20 rides tested in kaviar_validation database
- ECS run-task executed with task definition 148
- CloudWatch logs collected and analyzed
- SQL queries confirm correct status transitions
- Complete flow validated: created → dispatcher → offer → final status

Task ARN: $TASK_ARN
Database: kaviar_validation
Status: APPROVED - Technical flow works end-to-end"

# Push
git push origin feat/dev-load-test-ride-flow-v1
```

**Status:** [ ] Commit e push realizados

---

## Passo 10: Marcar Checkbox

No arquivo `PRODUCAO-CHECKLIST.md`:

```markdown
- [x] Evidências em staging (CloudWatch + 20 corridas + logs do dispatcher)
```

```bash
cd /home/goes/kaviar

# Editar checklist
nano PRODUCAO-CHECKLIST.md
# Marcar checkbox na linha 31

# Commit
git add PRODUCAO-CHECKLIST.md
git commit -m "chore: Mark staging evidence checkbox as complete"
git push origin feat/dev-load-test-ride-flow-v1
```

**Status:** [ ] Checkbox marcado

---

## Troubleshooting

### Problema: Task falha imediatamente
**Causa:** Erro de sintaxe no comando ou permissões
**Solução:**
```bash
# Ver logs de erro
aws logs tail /ecs/kaviar-backend --follow --region us-east-2 | grep ERROR
```

### Problema: Migration falha
**Causa:** Permissões insuficientes no schema public
**Solução:** Repetir Passo 2 com usuário admin (kaviaradmin)

### Problema: Teste não executa
**Causa:** Server não subiu ou porta errada
**Solução:** Verificar logs se há "🚀 KAVIAR Backend running on port 3001"

### Problema: Logs vazios
**Causa:** Log stream não encontrado
**Solução:**
```bash
# Listar todos os streams recentes
aws logs describe-log-streams \
  --log-group-name /ecs/kaviar-backend \
  --order-by LastEventTime \
  --descending \
  --max-items 10 \
  --region us-east-2
```

---

## Arquivos Gerados

Após execução completa, você terá:

- `/tmp/ecs-validation-overrides.json` - Configuração da task
- `/tmp/ecs-task-result.json` - Resultado do run-task
- `/tmp/validation-full-logs.txt` - Logs completos
- `/tmp/validation-ride-created.txt` - Logs RIDE_CREATED
- `/tmp/validation-dispatcher.txt` - Logs DISPATCHER
- `/tmp/validation-offers.txt` - Logs OFFER
- `/tmp/validation-status.txt` - Logs STATUS_CHANGED
- `/tmp/validation-sql-*.txt` - Resultados SQL

---

## Tempo Estimado

- Passo 1-3: 5 min (DB setup)
- Passo 4: 2 min (iniciar task)
- Passo 5: 5-10 min (aguardar task)
- Passo 6-7: 5 min (coletar logs/SQL)
- Passo 8: 15 min (preencher doc)
- Passo 9-10: 2 min (commit)
- **Total: ~35-40 min**

---

**Boa execução! 🚀**
