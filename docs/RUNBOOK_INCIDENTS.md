# RUNBOOK - Incidentes Kaviar

**Última atualização:** 2026-02-02  
**Versão:** 1.0

---

## 🚨 EMERGÊNCIAS

### Rollback Imediato

**Sintoma:** Sistema instável, erros 5xx, feature com bug crítico

**Ação:**
```bash
# 1. Rollback feature flag
cd /home/goes/kaviar/backend
node dist/scripts/update-rollout.js passenger_favorites_matching 0

# 2. Rollback deploy ECS (versão anterior)
aws ecs update-service \
  --cluster kaviar-prod \
  --service kaviar-backend-service \
  --task-definition kaviar-backend:PREVIOUS_VERSION \
  --region us-east-1

# 3. Verificar
curl https://api.kaviar.com.br/api/health
```

**Tempo:** < 2min  
**Impacto:** Volta ao estado anterior estável

---

## 🔥 PROBLEMAS COMUNS

### 1. API Retornando 500

**Diagnóstico:**
```bash
# Logs do container
aws logs tail /ecs/kaviar-backend --since 5m --region us-east-1

# Status do serviço
aws ecs describe-services \
  --cluster kaviar-prod \
  --services kaviar-backend-service \
  --region us-east-1
```

**Causas comuns:**
- Database connection timeout
- Memory leak
- Unhandled exception

**Solução:**
```bash
# Restart service
aws ecs update-service \
  --cluster kaviar-prod \
  --service kaviar-backend-service \
  --force-new-deployment \
  --region us-east-1
```

---

### 2. Database Lento

**Diagnóstico:**
```bash
# Verificar conexões ativas
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Queries lentas
psql $DATABASE_URL -c "SELECT query, state, wait_event_type 
FROM pg_stat_activity 
WHERE state != 'idle' 
ORDER BY query_start;"
```

**Solução:**
```bash
# Matar queries travadas
psql $DATABASE_URL -c "SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'active' 
AND query_start < NOW() - INTERVAL '5 minutes';"
```

---

### 3. Feature Flag Não Funciona

**Diagnóstico:**
```bash
cd /home/goes/kaviar/backend
node scripts/rollout-status.js
```

**Verificar:**
- enabled = true?
- rollout_percentage correto?
- allowlist tem passengers?

**Solução:**
```bash
# Resetar flag
node -e "
const { PrismaClient } = require('./node_modules/@prisma/client');
const p = new PrismaClient();
p.feature_flags.update({
  where: { key: 'passenger_favorites_matching' },
  data: { enabled: true, rollout_percentage: 0 }
}).then(() => console.log('✅ Reset'));
"
```

---

### 4. Container Não Sobe

**Diagnóstico:**
```bash
# Verificar tasks
aws ecs list-tasks \
  --cluster kaviar-prod \
  --service-name kaviar-backend-service \
  --region us-east-1

# Logs de erro
aws logs tail /ecs/kaviar-backend --since 10m --region us-east-1
```

**Causas comuns:**
- Port já em uso
- Env vars faltando
- Health check falhando

**Solução:**
```bash
# Verificar task definition
aws ecs describe-task-definition \
  --task-definition kaviar-backend \
  --region us-east-1

# Verificar env vars
aws ecs describe-task-definition \
  --task-definition kaviar-backend \
  --query 'taskDefinition.containerDefinitions[0].environment' \
  --region us-east-1
```

---

### 5. Monitor de Rollout Parou

**Diagnóstico:**
```bash
ps aux | grep monitor-loop
tail -f /home/goes/kaviar/backend/logs/monitor-rollout.log
```

**Solução:**
```bash
# Reiniciar monitor
cd /home/goes/kaviar/backend
pkill -f monitor-loop
nohup ./scripts/monitor-loop.sh > logs/monitor-rollout.log 2>&1 &
```

---

## 📊 MONITORAMENTO

### Métricas Críticas

**CloudWatch:**
- CPU > 80%
- Memory > 80%
- 5xx rate > 1%
- Latency P95 > 500ms

**Database:**
- Connections > 80
- Slow queries > 5s
- Disk usage > 80%

### Alertas

**PagerDuty:** Incidentes críticos  
**Slack:** Warnings e info  
**Email:** Relatórios diários

---

## 🔧 COMANDOS ÚTEIS

### Status Geral
```bash
# Health check
curl https://api.kaviar.com.br/api/health | jq

# Rollout status
cd /home/goes/kaviar/backend && node scripts/rollout-status.js

# Monitor status
./check-monitor.sh
```

### Deploy
```bash
# Deploy normal
cd /home/goes/kaviar/backend
npm run build
aws ecs update-service --cluster kaviar-prod --service kaviar-backend-service --force-new-deployment --region us-east-1

# Deploy com nova task definition
aws ecs update-service --cluster kaviar-prod --service kaviar-backend-service --task-definition kaviar-backend:NEW_VERSION --region us-east-1
```

### Database
```bash
# Backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d-%H%M%S).sql

# Restore
psql $DATABASE_URL < backup-YYYYMMDD-HHMMSS.sql

# Migration
psql $DATABASE_URL -f migrations/MIGRATION_FILE.sql
```

---

## 📞 CONTATOS

**Oncall:** PagerDuty #kaviar-backend  
**Slack:** #kaviar-incidents  
**Email:** ops@kaviar.com.br

---

## 📝 CHECKLIST PÓS-INCIDENTE

- [ ] Incidente resolvido
- [ ] Causa raiz identificada
- [ ] Documentação atualizada
- [ ] Postmortem agendado
- [ ] Ações preventivas definidas
- [ ] Stakeholders notificados

---

**Última revisão:** 2026-02-02 08:38 BRT
