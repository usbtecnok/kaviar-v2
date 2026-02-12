# KAVIAR Status Report + Next Sprint

**Data:** 2026-02-11 22:21 BRT  
**Commit:** e585cb9 (docs: ALB alarms runbook)

---

## 1. PROD Health Check ✅

### ECS Service
- **Image:** `847895361928.dkr.ecr.us-east-2.amazonaws.com/kaviar-backend:e585cb9379b752c36b09731161b04a3b80c98a67`
- **Task Definition:** kaviar-backend:95
- **Status:** ACTIVE (deployment IN_PROGRESS → steady state em ~2min)
- **Desired/Running:** 2/2

### Health Endpoints
```bash
# LIVENESS (ALB)
curl http://kaviar-alb-1494046292.us-east-2.elb.amazonaws.com/api/health
→ {"status":"ok","version":"e585cb9...","uptime":133s}
✅ HTTP 200

# READINESS (dependencies)
curl http://kaviar-alb-1494046292.us-east-2.elb.amazonaws.com/api/health/ready
→ {"success":true,"status":"healthy","checks":{"database":true,"s3":true}}
✅ HTTP 200 (DB + S3 OK)
```

### ALB Target Group
- **Healthy Targets:** 2/2 (10.0.1.206, 10.0.2.252)
- **Draining:** 2 (rolling update em andamento)
- **Health Check:** /api/health (30s interval, 2 healthy threshold)

### CloudWatch Metrics
- **HTTPCode_Target_5XX_Count:** 0 eventos (últimas 2h)
- **Alarmes:** 3 ativos (target-5xx, healthy-hosts, high-latency)
- **Estado:** OK / INSUFFICIENT_DATA (aguardando dados)

---

## 2. Recomendação: NEXT SPRINT (Base Operacional)

**Contexto:** Não há motoristas reais ainda. Foco em infraestrutura para simulação e testes.

**Objetivo:** Criar base operacional para onboarding de motoristas e observabilidade.

**Duração:** 1 sprint curto (3-5 dias)

**Impacto esperado:**
- Reduzir MTTR (Mean Time To Resolution) de incidentes em 50%
- Habilitar simulação de matching com drivers seed
- Preparar sistema para onboarding real de motoristas

---

## 3. Tarefas Priorizadas

### Tarefa 1: Request ID + Structured Logging (Observability)
**Prioridade:** ALTA  
**Impacto:** Debugging 10x mais rápido, correlação de erros end-to-end

**Entregas:**
1. Adicionar middleware `requestId` (uuid v4) em todas as requests
2. Injetar `requestId` em logs estruturados (JSON format)
3. Propagar `requestId` para CloudWatch Logs (campo indexável)
4. Adicionar `X-Request-ID` header nas respostas

**Critérios de Aceite:**
- [ ] Todo log contém `requestId`, `timestamp`, `level`, `message`, `context`
- [ ] CloudWatch Logs Insights consegue filtrar por `requestId`
- [ ] Erro 5XX retorna `X-Request-ID` no header para suporte
- [ ] Latência p99 < 1ms (overhead do middleware)

**Validação:**
```bash
# 1. Testar request com erro
curl -i http://localhost:3003/api/invalid-route
# Verificar header: X-Request-ID: <uuid>

# 2. CloudWatch Logs Insights
aws logs start-query \
  --region us-east-2 \
  --log-group-name /ecs/kaviar-backend \
  --start-time $(date -u -d '5 minutes ago' +%s) \
  --end-time $(date -u +%s) \
  --query-string 'fields @timestamp, requestId, message | filter requestId = "<uuid>" | sort @timestamp desc'

# 3. Verificar formato JSON
aws logs tail /ecs/kaviar-backend --follow --format json | jq '.message | fromjson | {requestId, level, message}'
```

**Arquivos a modificar:**
- `src/middleware/request-id.ts` (criar)
- `src/utils/logger.ts` (criar/atualizar)
- `src/app.ts` (adicionar middleware antes de rotas)

---

### Tarefa 2: MVP Onboarding de Motorista + Seed (Matching)
**Prioridade:** ALTA  
**Impacto:** Habilitar simulação de matching, preparar onboarding real

**Entregas:**
1. Admin endpoint `POST /api/admin/drivers/create` (criar motorista manualmente)
2. Admin endpoint `PATCH /api/admin/drivers/:id/approve` (aprovar motorista)
3. Driver endpoint `PATCH /api/drivers/location` (atualizar lat/lng)
4. Script seed `prisma/seed-drivers.ts` (gerar 20-50 drivers fake em bairros RJ)
5. Endpoint `POST /api/match/simulate` usando drivers seed

**Campos mínimos (drivers table):**
- `name`, `phone`, `email`, `status` (PENDING/APPROVED/ACTIVE)
- `last_lat`, `last_lng`, `updatedAt` (localização atual)
- `community_id` (bairro/território)

**Critérios de Aceite:**
- [ ] Admin consegue criar driver via API (status=PENDING)
- [ ] Admin consegue aprovar driver (status=APPROVED)
- [ ] Driver consegue atualizar localização (PATCH /api/drivers/location)
- [ ] Seed gera 50 drivers distribuídos em 10 bairros (Copacabana, Ipanema, Botafogo, etc)
- [ ] `/api/match/simulate` retorna top 5 drivers mais próximos da origem

**Validação:**
```bash
# 1. Criar driver (admin)
curl -X POST http://localhost:3003/api/admin/drivers/create \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João Silva",
    "phone": "+5521999999999",
    "email": "joao@example.com",
    "community_id": "copacabana"
  }'
# Verificar: status=PENDING

# 2. Aprovar driver
curl -X PATCH http://localhost:3003/api/admin/drivers/<driver_id>/approve \
  -H "Authorization: Bearer <admin_token>"
# Verificar: status=APPROVED

# 3. Atualizar localização (driver)
curl -X PATCH http://localhost:3003/api/drivers/location \
  -H "Authorization: Bearer <driver_token>" \
  -H "Content-Type: application/json" \
  -d '{"lat":-22.9668,"lng":-43.1729}'
# Verificar: last_lat, last_lng, updatedAt atualizados

# 4. Executar seed
npm run seed:drivers
# Verificar: 50 drivers criados com status=ACTIVE

# 5. Simular match
curl -X POST http://localhost:3003/api/match/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "origin": {"lat":-22.9668,"lng":-43.1729},
    "destination": {"lat":-22.9500,"lng":-43.1800}
  }'
# Verificar: retorna array com 5 drivers, ordenados por score (distância + território)
```

**Arquivos a modificar:**
- `prisma/schema.prisma` (verificar campos last_lat, last_lng, updatedAt)
- `src/routes/admin-drivers.ts` (adicionar POST /create, PATCH /:id/approve)
- `src/routes/drivers.ts` (adicionar PATCH /location)
- `prisma/seed-drivers.ts` (criar script seed)
- `src/routes/match.ts` (criar POST /simulate)
- `package.json` (adicionar script "seed:drivers")

---

### Tarefa 3: CloudWatch Dashboard (Observability)
**Prioridade:** MÉDIA  
**Impacto:** Visibilidade real-time de saúde do sistema, detecção proativa de anomalias

**Entregas:**
1. Criar dashboard CloudWatch "KAVIAR Production"
2. Widgets: ALB 5XX, Latência p99, HealthyHostCount, ECS CPU/Memory
3. Widget: Custom metric `match_score_avg` (média de score por hora)
4. Alarme visual: vermelho se qualquer métrica crítica

**Critérios de Aceite:**
- [ ] Dashboard acessível via console AWS (região us-east-2)
- [ ] Refresh automático a cada 1 minuto
- [ ] Widgets mostram últimas 3 horas de dados
- [ ] Alarmes integrados (vermelho/verde) visíveis no dashboard

**Validação:**
```bash
# 1. Criar dashboard via CLI
aws cloudwatch put-dashboard \
  --region us-east-2 \
  --dashboard-name KAVIAR-Production \
  --dashboard-body file://docs/ops/dashboard-config.json

# 2. Acessar via console
open "https://console.aws.amazon.com/cloudwatch/home?region=us-east-2#dashboards:name=KAVIAR-Production"

# 3. Verificar métricas aparecem
aws cloudwatch get-dashboard \
  --region us-east-2 \
  --dashboard-name KAVIAR-Production | jq '.DashboardBody | fromjson'
```

**Arquivos a criar:**
- `docs/ops/dashboard-config.json` (configuração do dashboard)
- `docs/ops/dashboard-setup.md` (instruções de deploy)

---

## 4. Comandos de Validação (Sprint Completo)

### Pré-deploy (Local)
```bash
# Build + testes
npm run build
npm test

# Verificar logs estruturados
npm run dev:3003 2>&1 | grep requestId | jq

# Executar seed de drivers
npm run seed:drivers
# Verificar: 50 drivers criados

# Testar match com drivers seed
curl -X POST http://localhost:3003/api/match/simulate \
  -H "Content-Type: application/json" \
  -d '{"origin":{"lat":-22.9668,"lng":-43.1729},"destination":{"lat":-22.9500,"lng":-43.1800}}'
```

### Deploy PROD
```bash
# 1. Build + push image
./scripts/deploy.sh

# 2. Aguardar ECS steady state
aws ecs wait services-stable \
  --region us-east-2 \
  --cluster kaviar-cluster \
  --services kaviar-backend-service

# 3. Validar health
curl -i http://kaviar-alb-1494046292.us-east-2.elb.amazonaws.com/api/health
curl -i http://kaviar-alb-1494046292.us-east-2.elb.amazonaws.com/api/health/ready

# 4. Verificar logs estruturados
aws logs tail /ecs/kaviar-backend --follow --format json | jq '.message | fromjson'

# 5. Testar criação de driver (admin)
curl -X POST https://api.kaviar.com.br/api/admin/drivers/create \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Driver","phone":"+5521999999999","email":"test@example.com"}'

# 6. Testar match com drivers seed
curl -X POST https://api.kaviar.com.br/api/match/simulate \
  -H "Content-Type: application/json" \
  -d '{"origin":{"lat":-22.9668,"lng":-43.1729},"destination":{"lat":-22.9500,"lng":-43.1800}}'

# 7. Verificar dashboard CloudWatch
open "https://console.aws.amazon.com/cloudwatch/home?region=us-east-2#dashboards:name=KAVIAR-Production"
```

### Pós-deploy (Smoke Tests)
```bash
# Verificar 0 erros 5XX
aws cloudwatch get-metric-statistics \
  --region us-east-2 \
  --namespace AWS/ApplicationELB \
  --metric-name HTTPCode_Target_5XX_Count \
  --dimensions Name=LoadBalancer,Value=app/kaviar-alb/a3ea4728f211b6c7 \
  --start-time $(date -u -d '10 minutes ago' --iso-8601=seconds) \
  --end-time $(date -u --iso-8601=seconds) \
  --period 300 \
  --statistics Sum

# Verificar latência p99 < 500ms
aws cloudwatch get-metric-statistics \
  --region us-east-2 \
  --namespace AWS/ApplicationELB \
  --metric-name TargetResponseTime \
  --dimensions Name=LoadBalancer,Value=app/kaviar-alb/a3ea4728f211b6c7 \
  --start-time $(date -u -d '10 minutes ago' --iso-8601=seconds) \
  --end-time $(date -u --iso-8601=seconds) \
  --period 300 \
  --extended-statistics p99
```

---

## 5. Alternativas Consideradas (Não Priorizadas)

### Opção B: Pontos Extra Trabalho/Escola (Matching Avançado)
- **Impacto:** Alto (gamificação, +15% match territorial)
- **Complexidade:** Média
- **Motivo não priorizado:** Requer motoristas reais ativos. Fica para sprint futura após onboarding.

### Opção C: Governança/Investors (WhatsApp Invites)
- **Impacto:** Médio (facilita onboarding de investidores)
- **Complexidade:** Baixa
- **Motivo não priorizado:** Observability e base operacional são mais críticos

### Opção D: Geofence Avançado (Polígonos Verificados)
- **Impacto:** Alto (pricing mais preciso)
- **Complexidade:** Alta (importação de dados oficiais)
- **Motivo não priorizado:** Matching básico + Observability têm ROI mais rápido

---

## 6. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Logs estruturados aumentam latência | Baixa | Médio | Usar logger assíncrono (winston/pino) |
| Seed de drivers polui DB de prod | Média | Alto | Usar flag `NODE_ENV=development`, nunca rodar seed em prod |
| Match simulate retorna drivers inativos | Média | Médio | Filtrar apenas drivers com `status=ACTIVE` e `updatedAt < 5min` |
| Dashboard CloudWatch custa caro | Baixa | Baixo | Usar apenas métricas padrão (sem custom metrics) |

---

## 7. Métricas de Sucesso (Sprint)

- **Observability:**
  - 100% dos logs contêm `requestId`
  - MTTR de incidentes < 10 minutos (vs. 30min atual)
  - Dashboard CloudWatch acessado 5x/dia pela equipe

- **Base Operacional:**
  - 50 drivers seed criados e distribuídos em 10 bairros
  - Admin consegue criar/aprovar drivers via API
  - `/api/match/simulate` retorna top 5 drivers em < 200ms
  - 0 erros 5XX durante testes de carga (100 req/s por 5min)

---

## 8. Próximos Passos (Pós-Sprint)

1. **Onboarding Real:** App de motorista (signup, upload de documentos, aprovação)
2. **Matching Avançado:** Pontos extra trabalho/escola, histórico de aceitação, ML preditivo
3. **Observability Avançado:** Distributed tracing (AWS X-Ray), custom metrics (match_score, ride_duration)
4. **Governança:** Investor invites via WhatsApp, dashboard de métricas para investidores
5. **Geofence:** Importação de polígonos oficiais (IBGE), pricing dinâmico por bairro

---

**Aprovação:** Aguardando go/no-go do time.
