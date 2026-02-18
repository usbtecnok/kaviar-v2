# Guia Rápido: Coletar Evidências Staging

## Pré-requisitos

1. **Deploy em staging** do branch `feat/dev-load-test-ride-flow-v1`
2. **Migration aplicada** no RDS staging
3. **ECS configurado** com `FEATURE_SPEC_RIDE_FLOW_V1=true`
4. **Acesso AWS CLI** configurado
5. **Acesso ao RDS staging** (via bastion ou tunnel)

---

## Passo 1: Verificar Staging

```bash
# Health check
curl https://staging-api.kaviar.com/api/health

# Endpoints v2 montados
curl -i https://staging-api.kaviar.com/api/v2/rides
# Esperado: 401 (não 404)
```

---

## Passo 2: Aplicar Seed

```bash
# Conectar no RDS staging (ajustar conforme seu setup)
export STAGING_DATABASE_URL="postgresql://user:pass@staging-rds.amazonaws.com:5432/kaviar_staging"

# Rodar seed
cd /home/goes/kaviar/backend
npx tsx prisma/seed-ride-flow-v1.ts
```

---

## Passo 3: Executar Teste de 20 Rides

```bash
# Configurar endpoint staging
export API_URL="https://staging-api.kaviar.com"

# Rodar teste
bash scripts/test-ride-flow-v1.sh

# Anotar:
# - Horário de início
# - Horário de fim
# - IDs das rides criadas
```

---

## Passo 4: Coletar Evidências

```bash
# Configurar variáveis
export STAGING_DATABASE_URL="postgresql://user:pass@staging-rds.amazonaws.com:5432/kaviar_staging"
export LOG_GROUP="/ecs/kaviar-backend-staging"  # Ajustar se necessário
export REGION="us-east-2"

# Rodar script de coleta
bash scripts/collect-staging-evidence.sh

# O script vai pedir:
# - Data/hora início do teste
# - Data/hora fim do teste

# Arquivos gerados:
# - staging-logs-ride-created.txt
# - staging-logs-dispatcher.txt
# - staging-logs-offers.txt
# - staging-sql-rides-status.txt
# - staging-sql-offers-status.txt
# - staging-sql-rides-details.txt
```

---

## Passo 5: Preencher Documento de Evidências

```bash
# Abrir documento
nano backend/docs/EVIDENCIAS-STAGING-RIDE-FLOW.md

# Preencher seções marcadas com [PREENCHER]:
# 1. Data/hora do teste
# 2. Output do script de teste
# 3. Trechos dos logs (copiar de staging-logs-*.txt)
# 4. Resultados SQL (copiar de staging-sql-*.txt)
# 5. Resumo executivo
# 6. Conclusão (✅ APROVADO ou ❌ REPROVADO)
```

---

## Passo 6: Commit e Push

```bash
cd /home/goes/kaviar

# Adicionar evidências
git add backend/docs/EVIDENCIAS-STAGING-RIDE-FLOW.md
git add backend/scripts/collect-staging-evidence.sh

# Commit
git commit -m "docs: Add staging validation evidence for SPEC_RIDE_FLOW_V1

- 20 rides tested in staging environment
- CloudWatch logs collected and analyzed
- SQL queries confirm correct status transitions
- All requirements validated: dispatcher, SSE, timeout, status changes

Evidence file: backend/docs/EVIDENCIAS-STAGING-RIDE-FLOW.md"

# Push
git push origin feat/dev-load-test-ride-flow-v1
```

---

## Passo 7: Marcar Checkbox no Checklist

Após preencher o documento com evidências reais, você pode marcar:

```markdown
- [x] Evidências em staging (CloudWatch + 20 corridas + logs do dispatcher)
```

---

## Troubleshooting

### Problema: Staging não tem deployment
**Solução**: Deploy manual ou via GitHub Actions para ambiente staging

### Problema: Migration não aplicada
**Solução**: 
```bash
psql $STAGING_DATABASE_URL < backend/prisma/migrations/20260218_ride_flow_v1/migration.sql
```

### Problema: Endpoints retornam 404
**Solução**: Verificar `FEATURE_SPEC_RIDE_FLOW_V1=true` no ECS Task Definition

### Problema: Sem acesso ao RDS staging
**Solução**: Configurar bastion host ou VPN para acessar RDS privado

### Problema: CloudWatch logs vazios
**Solução**: Verificar log group name correto e período do teste

---

## Checklist de Validação

Antes de marcar como concluído, verificar:

- [ ] Documento `EVIDENCIAS-STAGING-RIDE-FLOW.md` preenchido
- [ ] Logs CloudWatch coletados (RIDE_CREATED, DISPATCHER, OFFER)
- [ ] SQL queries executadas (rides por status, offers por status)
- [ ] 20 rides processadas com sucesso
- [ ] Resumo executivo preenchido
- [ ] Conclusão: ✅ APROVADO ou ❌ REPROVADO com justificativa
- [ ] Commit e push realizados

---

## Tempo Estimado

- Deploy staging: 15-20 min (se necessário)
- Seed + teste: 5-10 min
- Coleta evidências: 10-15 min
- Preencher documento: 15-20 min
- **Total: 45-65 min**

---

## Contato para Dúvidas

Se encontrar problemas durante a execução:
1. Verificar logs do ECS staging
2. Verificar configuração do Task Definition
3. Verificar conectividade com RDS staging
4. Consultar documentação em `backend/docs/SPEC_RIDE_FLOW_V1_SUMMARY.md`
