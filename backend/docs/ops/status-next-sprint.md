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

## 2. Recomendação: NEXT SPRINT (Observability + Matching)

**Objetivo:** Aumentar visibilidade operacional e melhorar matching territorial com incentivos.

**Duração:** 1 sprint curto (3-5 dias)

**Impacto esperado:**
- Reduzir MTTR (Mean Time To Resolution) de incidentes em 50%
- Aumentar taxa de match territorial em 15-20%
- Melhorar retenção de motoristas com gamificação

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

### Tarefa 2: Pontos Extra Trabalho/Escola + Incentivo (Matching)
**Prioridade:** ALTA  
**Impacto:** Aumentar match territorial, reduzir tempo de espera, fidelizar motoristas

**Entregas:**
1. Adicionar campos `work_location` e `school_location` (lat/lng) em `drivers` table
2. Criar endpoint `POST /api/drivers/locations` (motorista cadastra trabalho/escola)
3. Atualizar `territorial-match.ts`: +10 pontos se origem/destino está a < 2km de work/school
4. Dashboard motorista: mostrar "Você ganhou +10 pontos por corrida próxima ao trabalho!"

**Critérios de Aceite:**
- [ ] Motorista consegue cadastrar até 2 localizações extras (trabalho + escola)
- [ ] Match score aumenta +10 pontos se corrida está no raio de 2km
- [ ] Dashboard exibe badge "Corrida no Caminho" quando aplicável
- [ ] Migração Prisma executada sem downtime

**Validação:**
```bash
# 1. Cadastrar localização
curl -X POST http://localhost:3003/api/drivers/locations \
  -H "Authorization: Bearer <driver_token>" \
  -H "Content-Type: application/json" \
  -d '{"type":"work","lat":-22.9068,"lng":-43.1729,"name":"Escritório Centro"}'

# 2. Simular match com corrida próxima
curl -X POST http://localhost:3003/api/match/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "driverId": "<driver_id>",
    "rideOrigin": {"lat":-22.9050,"lng":-43.1750},
    "rideDestination": {"lat":-22.9100,"lng":-43.1800}
  }'
# Verificar: matchScore contém +10 (workProximityBonus)

# 3. Verificar dashboard
curl http://localhost:3003/api/drivers/dashboard \
  -H "Authorization: Bearer <driver_token>" | jq '.badges'
```

**Arquivos a modificar:**
- `prisma/schema.prisma` (adicionar campos work_location, school_location)
- `src/routes/driver-locations.ts` (criar)
- `src/services/territorial-match.ts` (adicionar lógica de proximidade)
- `src/routes/driver-dashboard.ts` (exibir badge)

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

# Testar match com localização extra
npm run test:matching
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

# 5. Testar match com pontos extras
curl -X POST https://api.kaviar.com.br/api/match/simulate \
  -H "Content-Type: application/json" \
  -d '{"driverId":"<id>","rideOrigin":{"lat":-22.9050,"lng":-43.1750}}'

# 6. Verificar dashboard CloudWatch
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

### Opção B: Governança/Investors (WhatsApp Invites)
- **Impacto:** Médio (facilita onboarding de investidores)
- **Complexidade:** Baixa
- **Motivo não priorizado:** Observability é mais crítico para estabilidade

### Opção C: Geofence Avançado (Polígonos Verificados)
- **Impacto:** Alto (pricing mais preciso)
- **Complexidade:** Alta (importação de dados oficiais)
- **Motivo não priorizado:** Matching + Observability têm ROI mais rápido

---

## 6. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Logs estruturados aumentam latência | Baixa | Médio | Usar logger assíncrono (winston/pino) |
| Migração de schema quebra prod | Baixa | Alto | Testar em staging, usar `prisma migrate deploy` |
| Dashboard CloudWatch custa caro | Baixa | Baixo | Usar apenas métricas padrão (sem custom metrics) |
| Match score muda comportamento | Média | Médio | A/B test com 10% dos motoristas primeiro |

---

## 7. Métricas de Sucesso (Sprint)

- **Observability:**
  - 100% dos logs contêm `requestId`
  - MTTR de incidentes < 10 minutos (vs. 30min atual)
  - Dashboard CloudWatch acessado 5x/dia pela equipe

- **Matching:**
  - 20% dos motoristas cadastram localização extra
  - Taxa de match territorial aumenta 15%
  - NPS de motoristas aumenta 5 pontos

---

## 8. Próximos Passos (Pós-Sprint)

1. **Observability Avançado:** Distributed tracing (AWS X-Ray), custom metrics (match_score, ride_duration)
2. **Matching ML:** Modelo preditivo de aceitação de corrida (XGBoost)
3. **Governança:** Investor invites via WhatsApp, dashboard de métricas para investidores
4. **Geofence:** Importação de polígonos oficiais (IBGE), pricing dinâmico por bairro

---

**Aprovação:** Aguardando go/no-go do time.
