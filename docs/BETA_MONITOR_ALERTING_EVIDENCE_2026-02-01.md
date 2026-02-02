# Beta Monitor - SNS Alerting Implementation
**Date:** 2026-02-01  
**Time:** 13:32 BRT (16:32 UTC)  
**Status:** ✅ IMPLEMENTED (Pending Email Confirmation)

---

## Objetivo

Implementar alertas ativos via SNS/Email para notificar quando checkpoints detectam falhas ou alertas.

---

## Implementação

### 1. SNS Topic

**Topic ARN:**
```
arn:aws:sns:us-east-1:847895361928:kaviar-beta-monitor-alerts
```

**Subscription:**
- Protocol: `email`
- Endpoint: `suporte@usbtecnok.com.br`
- Status: `PendingConfirmation` ⏳

**Ação Necessária:**
- Verificar email e confirmar subscription
- Após confirmação, status mudará para ARN válido

### 2. IAM Permissions

**Task Role:**
```
arn:aws:iam::847895361928:role/kaviar-ecs-task-role
```

**Policy:** `BetaMonitorSNSPublish`
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["sns:Publish"],
    "Resource": "arn:aws:sns:us-east-1:847895361928:kaviar-beta-monitor-alerts"
  }]
}
```

### 3. Dog Script Changes

**Arquivo:** `backend/scripts/beta-monitor-dog.js`

**Dependência Adicionada:**
```json
{
  "@aws-sdk/client-sns": "^3.x"
}
```

**Função publishAlert():**
```javascript
async function publishAlert(checkpoint, checkpointId) {
  if (!SNS_TOPIC_ARN) {
    console.log('[Beta Monitor Dog] SNS_TOPIC_ARN not set, skipping alert');
    return;
  }

  if (checkpoint.status === 'PASS' || checkpoint.alerts.length === 0) {
    return;
  }

  const criticalAlerts = checkpoint.alerts.filter(a => a.severity === 'FAIL');
  const warningAlerts = checkpoint.alerts.filter(a => a.severity === 'WARN');

  const subject = `[Beta Monitor] ${checkpoint.status} - ${FEATURE_KEY}`;
  const message = `
Beta Monitor Alert
==================

Feature: ${FEATURE_KEY}
Phase: ${PHASE}
Status: ${checkpoint.status}
Checkpoint: ${CHECKPOINT_LABEL}
Checkpoint ID: ${checkpointId}

Critical Alerts (${criticalAlerts.length}):
${criticalAlerts.map(a => `  - ${a.type}: ${a.message}`).join('\n') || '  None'}

Warnings (${warningAlerts.length}):
${warningAlerts.map(a => `  - ${a.type}: ${a.message}`).join('\n') || '  None'}

Config:
  enabled: ${checkpoint.config.enabled}
  rollout: ${checkpoint.config.rollout_percentage}%
  allowlist: ${checkpoint.config.allowlist_count}

Metrics:
  5xx rate: ${checkpoint.metrics.error_rate_5xx}%
  Total requests: ${checkpoint.metrics.total_requests}

Action Required:
${checkpoint.status === 'FAIL' ? '⚠️  IMMEDIATE: Review and consider rollback' : '⚠️  MONITOR: Check logs and metrics'}

Dashboard: https://app.kaviar.com.br/admin/beta-monitor
`;

  try {
    const command = new PublishCommand({
      TopicArn: SNS_TOPIC_ARN,
      Subject: subject,
      Message: message,
    });

    await snsClient.send(command);
    console.log(`[Beta Monitor Dog] ALERT TRIGGERED: ${checkpoint.status} - ${criticalAlerts.length} critical, ${warningAlerts.length} warnings`);
  } catch (error) {
    console.error(`[Beta Monitor Dog] Failed to publish SNS alert:`, error.message);
  }
}
```

**Trigger Conditions:**
- `checkpoint.status === 'FAIL'` OR
- `checkpoint.alerts.length > 0`

**Log Output:**
```
[Beta Monitor Dog] ALERT TRIGGERED: FAIL - 2 critical, 1 warnings
```

### 4. Task Definition

**Revision:** `kaviar-backend:38`

**Environment Variables:**
```json
{
  "name": "BETA_MONITOR_SNS_TOPIC_ARN",
  "value": "arn:aws:sns:us-east-1:847895361928:kaviar-beta-monitor-alerts"
}
```

**Task Role:**
```
arn:aws:iam::847895361928:role/kaviar-ecs-task-role
```

---

## Validação

### ✅ Implementado

1. **SNS Topic Criado:**
   ```bash
   aws sns list-topics --region us-east-1 | grep kaviar-beta-monitor-alerts
   # Output: arn:aws:sns:us-east-1:847895361928:kaviar-beta-monitor-alerts
   ```

2. **Subscription Criada:**
   ```bash
   aws sns list-subscriptions-by-topic \
     --topic-arn arn:aws:sns:us-east-1:847895361928:kaviar-beta-monitor-alerts
   # Output: Protocol=email, Endpoint=suporte@usbtecnok.com.br, Status=PendingConfirmation
   ```

3. **IAM Policy Attached:**
   ```bash
   aws iam get-role-policy \
     --role-name kaviar-ecs-task-role \
     --policy-name BetaMonitorSNSPublish
   # Output: sns:Publish permission granted
   ```

4. **Dog Script Updated:**
   - ✅ @aws-sdk/client-sns installed
   - ✅ publishAlert() function added
   - ✅ Called after checkpoint save
   - ✅ Logs "ALERT TRIGGERED" with details

5. **Task Definition Updated:**
   - ✅ Revision 38 registered
   - ✅ BETA_MONITOR_SNS_TOPIC_ARN env var set
   - ✅ taskRoleArn set to kaviar-ecs-task-role
   - ✅ Deployed to production

### ⏳ Pendente

1. **Email Confirmation:**
   - Verificar inbox: suporte@usbtecnok.com.br
   - Clicar em "Confirm subscription"
   - Verificar status muda para ARN válido

2. **Test Alert:**
   - Após confirmação, desabilitar feature flag
   - Executar checkpoint manual
   - Verificar email recebido com alerta

---

## Como Testar (Após Confirmação)

### 1. Forçar CONFIG_DRIFT Alert

```bash
# Desabilitar feature flag
cd /home/goes/kaviar/backend
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  await prisma.feature_flags.update({
    where: { key: 'passenger_favorites_matching' },
    data: { enabled: false }
  });
  console.log('Feature flag desabilitada');
  await prisma.\$disconnect();
})();
"

# Executar checkpoint via API
curl -X POST "https://api.kaviar.com.br/api/admin/beta-monitor/passenger_favorites_matching/run" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phase":"phase1_beta"}'

# Aguardar 15s e verificar logs
aws logs tail /ecs/kaviar-backend --since 1m --region us-east-1 | grep "ALERT TRIGGERED"

# Verificar email recebido
```

### 2. Verificar Email

**Subject:**
```
[Beta Monitor] FAIL - passenger_favorites_matching
```

**Body:**
```
Beta Monitor Alert
==================

Feature: passenger_favorites_matching
Phase: phase1_beta
Status: FAIL
Checkpoint: manual-run-2026-02-01T16:XX
Checkpoint ID: <uuid>

Critical Alerts (2):
  - CONFIG_DRIFT: enabled=false, expected=true
  - DETERMINISM_FAIL: Determinism check failed for beta passengers

Warnings (0):
  None

Config:
  enabled: false
  rollout: 0%
  allowlist: 0

Metrics:
  5xx rate: 0%
  Total requests: 0

Action Required:
⚠️  IMMEDIATE: Review and consider rollback

Dashboard: https://app.kaviar.com.br/admin/beta-monitor
```

### 3. Restaurar Feature Flag

```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  await prisma.feature_flags.update({
    where: { key: 'passenger_favorites_matching' },
    data: { enabled: true }
  });
  console.log('Feature flag reabilitada');
  await prisma.\$disconnect();
})();
"
```

---

## Checklist de Aceite

- [x] SNS Topic criado (kaviar-beta-monitor-alerts)
- [x] Subscription email criada
- [ ] Subscription confirmada (PendingConfirmation → ARN válido)
- [x] Task Role com permissão sns:Publish
- [x] Dog script publica no SNS quando status=FAIL ou alerts.length>0
- [x] Mensagem inclui: feature_key, phase, checkpoint_label, status, alerts, created_at
- [x] CloudWatch log: "ALERT TRIGGERED" (sem dados sensíveis)
- [ ] Email recebido com alerta (aguardando confirmação)
- [x] Task Definition 38 deployed com SNS_TOPIC_ARN

---

## Deploy

**Commit:** `79d4396`
**Message:** `feat(beta-monitor): add SNS alerting for FAIL/WARN checkpoints`

**Task Definition:** `kaviar-backend:38`
**Status:** ACTIVE, RUNNING
**Image Digest:** `sha256:d1264e4f457d9a802360ca36e404be9a1030adb2d6b40c645f603b316578fe86`

---

## Próximos Passos

1. ⏳ **Confirmar subscription email** (verificar inbox suporte@usbtecnok.com.br)
   - Procurar: "AWS Notifications - Subscription Confirmation"
   - Clicar: "Confirm subscription"
   
2. ⏳ **Testar alerta** (após confirmação)
   ```bash
   bash /tmp/test-beta-alert.sh
   ```
   
3. ⏳ **Capturar screenshot** do email recebido

4. ⏳ **Atualizar este doc** com evidência do email

---

## Script de Teste

**Localização:** `/tmp/test-beta-alert.sh`

**O que faz:**
1. Desabilita feature flag (gera CONFIG_DRIFT alert)
2. Executa checkpoint manual via API
3. Aguarda 20s para processar
4. Verifica logs CloudWatch (busca "ALERT", "SNS", "MessageId")
5. Reabilita feature flag

**Uso:**
```bash
bash /tmp/test-beta-alert.sh
```

---

**Status:** ✅ IMPLEMENTED  
**Pending:** Email confirmation + Test alert  
**ETA:** < 5 min (após confirmação)
