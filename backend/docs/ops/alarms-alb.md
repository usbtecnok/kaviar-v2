# CloudWatch Alarms - ALB/Target Group

## Contexto

Alarmes configurados para detectar incidentes reais no ALB e targets, evitando falsos positivos.

**Health Check Strategy:**
- ALB usa `/api/health` (LIVENESS) - sempre retorna 200
- `/api/health/ready` (READINESS) - retorna 200/503 baseado em DB/S3 (apenas observabilidade)

**Infraestrutura:**
- ALB: `app/kaviar-alb/a3ea4728f211b6c7`
- Target Group: `targetgroup/kaviar-backend-tg/323fe3a4ccfef4cd`
- ECS Service: `kaviar-backend-service` (desiredCount=2)
- SNS Topic: `arn:aws:sns:us-east-2:847895361928:kaviar-alerts`

---

## Alarmes Configurados

### 1. kaviar-alb-target-5xx
**Objetivo:** Detectar erros reais no app (5XX retornados pelos targets)

- **Metric:** `HTTPCode_Target_5XX_Count`
- **Namespace:** `AWS/ApplicationELB`
- **Dimensions:** LoadBalancer = `app/kaviar-alb/a3ea4728f211b6c7`
- **Statistic:** Sum
- **Period:** 300s (5 min)
- **Threshold:** > 0
- **Evaluation:** 1 de 1 períodos
- **TreatMissingData:** notBreaching
- **Action:** SNS kaviar-alerts

**Quando dispara:** Qualquer 5XX retornado pelo app em 5 minutos indica problema real (crash, timeout, erro não tratado).

---

### 2. kaviar-alb-healthy-hosts
**Objetivo:** Detectar quando targets ficam unhealthy (incidente crítico)

- **Metric:** `HealthyHostCount`
- **Namespace:** `AWS/ApplicationELB`
- **Dimensions:** 
  - LoadBalancer = `app/kaviar-alb/a3ea4728f211b6c7`
  - TargetGroup = `targetgroup/kaviar-backend-tg/323fe3a4ccfef4cd`
- **Statistic:** Minimum
- **Period:** 60s (1 min)
- **Threshold:** < 1
- **Evaluation:** 2 de 2 períodos (2 minutos consecutivos)
- **TreatMissingData:** breaching (se métrica sumir, alertar)
- **Action:** SNS kaviar-alerts

**Quando dispara:** Menos de 1 target healthy por 2 minutos = serviço fora do ar.

**Nota:** Com desiredCount=2, se quiser alertar quando cair para 1 target (redundância perdida), ajustar threshold para < 2.

---

### 3. kaviar-alb-high-latency
**Objetivo:** Detectar degradação antes de virar 5XX (early warning)

- **Metric:** `TargetResponseTime`
- **Namespace:** `AWS/ApplicationELB`
- **Dimensions:**
  - LoadBalancer = `app/kaviar-alb/a3ea4728f211b6c7`
  - TargetGroup = `targetgroup/kaviar-backend-tg/323fe3a4ccfef4cd`
- **Statistic:** p99
- **Period:** 300s (5 min)
- **Threshold:** > 2s
- **Evaluation:** 2 de 2 períodos (10 minutos)
- **TreatMissingData:** notBreaching
- **Action:** SNS kaviar-alerts

**Quando dispara:** Latência p99 > 2s por 10 minutos = app degradado (DB lento, CPU alto, etc).

**Ajuste de baseline:** Se latência normal for < 500ms, considerar threshold de 1s para detecção mais rápida.

---

## Manutenção

### Ajustar thresholds
```bash
aws cloudwatch put-metric-alarm \
  --region us-east-2 \
  --alarm-name kaviar-alb-high-latency \
  --threshold 1.0  # Exemplo: reduzir para 1s
```

### Verificar estado dos alarmes
```bash
aws cloudwatch describe-alarms \
  --region us-east-2 \
  --alarm-name-prefix kaviar-alb
```

### Testar SNS (enviar notificação manual)
```bash
aws sns publish \
  --region us-east-2 \
  --topic-arn arn:aws:sns:us-east-2:847895361928:kaviar-alerts \
  --message "Teste de alarme" \
  --subject "KAVIAR Test Alert"
```

---

## Troubleshooting

### Alarme disparando sem motivo aparente

1. **Target 5XX:** Verificar logs do app (CloudWatch Logs) para stack traces
2. **HealthyHostCount:** Verificar health check do ALB (deve usar `/api/health`)
3. **High Latency:** Verificar métricas de DB (Neon) e CPU/Memory do ECS

### Falso positivo em HealthyHostCount

- Se disparar durante deploy: normal (rolling update derruba 1 target por vez)
- Se persistir após deploy: verificar se `/api/health` está retornando 200

### Alarme não dispara quando deveria

- Verificar se SNS topic está subscrito (email/Slack)
- Verificar se `ActionsEnabled=true`
- Testar com `aws sns publish` (comando acima)

---

## Histórico

- **2026-02-11:** Criação inicial dos 3 alarmes (target-5xx, healthy-hosts, high-latency)
- **2026-02-11:** Health check split: `/api/health` (liveness) + `/api/health/ready` (readiness)
