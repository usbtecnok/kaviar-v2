# Checklist de Execução - Evidências Staging

## Pré-execução

- [ ] Descobrir LOG_GROUP real:
  ```bash
  aws logs describe-log-groups --region us-east-2 | grep kaviar
  # Anotar: _______________________
  ```

- [ ] Configurar variáveis:
  ```bash
  export STAGING_DATABASE_URL="postgresql://..."
  export LOG_GROUP="/ecs/kaviar-backend-staging"  # Usar valor real
  export REGION="us-east-2"
  export API_URL="https://staging-api.kaviar.com"
  ```

- [ ] Verificar staging respondendo:
  ```bash
  curl $API_URL/api/health
  curl -i $API_URL/api/v2/rides  # Esperado: 401, não 404
  ```

---

## Execução

### 1. Seed
```bash
cd /home/goes/kaviar/backend
npx tsx prisma/seed-ride-flow-v1.ts
```
- [ ] Seed executado com sucesso
- [ ] Drivers criados: test-driver-1, test-driver-2

### 2. Registrar início
```bash
date -u
# Anotar: _______________________
```
- [ ] Horário início anotado (UTC)

### 3. Executar teste
```bash
bash scripts/test-ride-flow-v1.sh > test-output.txt 2>&1
```
- [ ] Script executou sem erros
- [ ] 20 rides criadas (verificar output)

### 4. Registrar fim
```bash
date -u
# Anotar: _______________________
```
- [ ] Horário fim anotado (UTC)
- [ ] Aguardar 30s para logs propagarem no CloudWatch

---

## Validação Rápida (antes de coletar)

### Verificar logs existem no período
```bash
# Testar se há logs no período
aws logs filter-log-events \
  --log-group-name "$LOG_GROUP" \
  --start-time $(date -d "INICIO" +%s)000 \
  --end-time $(date -d "FIM" +%s)000 \
  --filter-pattern "RIDE_CREATED" \
  --region "$REGION" \
  --max-items 5

# Deve retornar pelo menos 1 evento
```
- [ ] Logs encontrados no CloudWatch
- [ ] Período correto (início/fim)

### Verificar marcadores principais
```bash
# RIDE_CREATED
aws logs filter-log-events --log-group-name "$LOG_GROUP" \
  --start-time $(date -d "INICIO" +%s)000 --end-time $(date -d "FIM" +%s)000 \
  --filter-pattern "RIDE_CREATED" --region "$REGION" --max-items 1

# DISPATCHER
aws logs filter-log-events --log-group-name "$LOG_GROUP" \
  --start-time $(date -d "INICIO" +%s)000 --end-time $(date -d "FIM" +%s)000 \
  --filter-pattern "DISPATCHER" --region "$REGION" --max-items 1

# OFFER
aws logs filter-log-events --log-group-name "$LOG_GROUP" \
  --start-time $(date -d "INICIO" +%s)000 --end-time $(date -d "FIM" +%s)000 \
  --filter-pattern "OFFER" --region "$REGION" --max-items 1

# STATUS_CHANGED
aws logs filter-log-events --log-group-name "$LOG_GROUP" \
  --start-time $(date -d "INICIO" +%s)000 --end-time $(date -d "FIM" +%s)000 \
  --filter-pattern "STATUS_CHANGED" --region "$REGION" --max-items 1
```

**Checklist de marcadores:**
- [ ] RIDE_CREATED encontrado
- [ ] DISPATCHER encontrado
- [ ] OFFER encontrado
- [ ] STATUS_CHANGED encontrado

**Se algum marcador faltar:**
- Verificar se período está correto (UTC)
- Verificar se LOG_GROUP está correto
- Verificar se backend staging está rodando código novo
- Ajustar janela de tempo (adicionar +5 min no fim)

---

## Coleta de Evidências

```bash
bash scripts/collect-staging-evidence.sh
# Informar período exato (início e fim anotados acima)
```

- [ ] Script executou sem erros
- [ ] Arquivos gerados:
  - [ ] staging-logs-ride-created.txt (não vazio)
  - [ ] staging-logs-dispatcher.txt (não vazio)
  - [ ] staging-logs-offers.txt (não vazio)
  - [ ] staging-sql-rides-status.txt (não vazio)
  - [ ] staging-sql-offers-status.txt (não vazio)
  - [ ] staging-sql-rides-details.txt (não vazio)

---

## Preencher Documento

```bash
nano backend/docs/EVIDENCIAS-STAGING-RIDE-FLOW.md
```

**Seções obrigatórias:**
- [ ] Data/hora início e fim preenchidas
- [ ] Output do teste colado
- [ ] Logs CloudWatch colados (trechos relevantes)
- [ ] Queries SQL coladas (resultados)
- [ ] Resumo executivo preenchido
- [ ] Conclusão: ✅ APROVADO ou ❌ REPROVADO
- [ ] Justificativa da conclusão

---

## Commit e Push

```bash
git add backend/docs/EVIDENCIAS-STAGING-RIDE-FLOW.md
git add test-output.txt staging-*.txt  # Opcional: anexar arquivos brutos
git commit -m "docs: Add staging validation evidence - 20 rides tested successfully

- 20 rides created and processed by dispatcher
- CloudWatch logs collected (RIDE_CREATED, DISPATCHER, OFFER, STATUS_CHANGED)
- SQL queries confirm correct status transitions
- Complete flow validated: created → dispatcher → offer → final status
- Status: APPROVED - Technical flow works end-to-end"

git push origin feat/dev-load-test-ride-flow-v1
```

- [ ] Commit realizado
- [ ] Push realizado

---

## Marcar Checkbox

No arquivo `PRODUCAO-CHECKLIST.md`:

```markdown
- [x] Evidências em staging (CloudWatch + 20 corridas + logs do dispatcher)
```

- [ ] Checkbox marcado
- [ ] Commit do checklist atualizado

---

## Troubleshooting Rápido

### Problema: Logs vazios no CloudWatch
**Causa:** Período errado ou LOG_GROUP errado
**Solução:** 
```bash
# Verificar logs recentes
aws logs tail "$LOG_GROUP" --follow --region "$REGION"
# Confirmar que há atividade
```

### Problema: Marcador não encontrado (ex: DISPATCHER)
**Causa:** Backend não tem código novo ou feature flag off
**Solução:**
```bash
# Verificar task definition
aws ecs describe-task-definition --task-definition kaviar-backend-staging \
  --query 'taskDefinition.containerDefinitions[0].environment[?name==`FEATURE_SPEC_RIDE_FLOW_V1`]'
# Deve retornar: [{"name": "FEATURE_SPEC_RIDE_FLOW_V1", "value": "true"}]
```

### Problema: Rides não criadas
**Causa:** Endpoint errado ou auth falhou
**Solução:**
```bash
# Verificar output do teste
cat test-output.txt | grep "created"
# Deve mostrar: ✓ Ride 1 created: ...
```

---

## Tempo Estimado

- Pré-execução: 5 min
- Execução: 5 min
- Validação: 5 min
- Coleta: 10 min
- Preencher doc: 15 min
- Commit: 2 min
- **Total: ~42 min**

---

**Boa execução! 🚀**
