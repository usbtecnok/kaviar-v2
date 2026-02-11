# VALIDAÇÃO: TWILIO ENV VARS NO ECS

**Data**: 2026-02-10  
**Commit**: 2aedc13  
**Status**: Deploy em andamento

---

## PROBLEMA IDENTIFICADO

### Sintoma
```bash
curl -X POST "https://api.kaviar.com.br/api/admin/investors/invite" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"channel":"whatsapp","phone":"+5521...","role":"ANGEL_VIEWER"}'

# Resposta:
{"success":false,"error":"WhatsApp não configurado. Entre em contato com o administrador."}
```

### Causa Raiz
```bash
# ECS task definition não continha TWILIO_* env vars
aws ecs describe-task-definition \
  --task-definition kaviar-backend:91 \
  --region us-east-2 \
  --query "taskDefinition.containerDefinitions[0].environment[?starts_with(name,'TWILIO_')]"

# Resultado: []  (vazio)
```

**Motivo**: Workflow não injetava secrets TWILIO_* no task-def.json

---

## SOLUÇÃO APLICADA

### Workflow Atualizado
**Arquivo**: `.github/workflows/deploy-backend.yml`

**Mudanças**:
1. Adicionar 7 secrets TWILIO_* como args do jq
2. Remover TWILIO_* existentes (evitar duplicatas)
3. Adicionar TWILIO_* apenas se não vazios
4. Logar nomes das variáveis injetadas (sem valores)

**Código**:
```yaml
NEW_TASK_DEF=$(echo $TASK_DEF | jq \
  --arg TWILIO_ACCOUNT_SID "${{ secrets.TWILIO_ACCOUNT_SID }}" \
  --arg TWILIO_AUTH_TOKEN "${{ secrets.TWILIO_AUTH_TOKEN }}" \
  --arg TWILIO_WHATSAPP_FROM "${{ secrets.TWILIO_WHATSAPP_FROM }}" \
  --arg TWILIO_TEMPLATE_INVITE_INVESTOR "${{ secrets.TWILIO_TEMPLATE_INVITE_INVESTOR }}" \
  --arg TWILIO_TEMPLATE_RIDE_DRIVER_ASSIGNED "${{ secrets.TWILIO_TEMPLATE_RIDE_DRIVER_ASSIGNED }}" \
  --arg TWILIO_TEMPLATE_RIDE_PASSENGER_ARRIVING "${{ secrets.TWILIO_TEMPLATE_RIDE_PASSENGER_ARRIVING }}" \
  --arg TWILIO_TEMPLATE_AUTH_PASSWORD_RESET "${{ secrets.TWILIO_TEMPLATE_AUTH_PASSWORD_RESET }}" '
  .taskDefinition |
  # Remove existing TWILIO_* to avoid duplicates
  .containerDefinitions[0].environment = [
    .containerDefinitions[0].environment[]? | 
    select(.name | startswith("TWILIO_") | not)
  ] |
  # Add TWILIO_* only if not empty
  .containerDefinitions[0].environment += (
    if $TWILIO_ACCOUNT_SID != "" then [{"name": "TWILIO_ACCOUNT_SID", "value": $TWILIO_ACCOUNT_SID}] else [] end +
    if $TWILIO_AUTH_TOKEN != "" then [{"name": "TWILIO_AUTH_TOKEN", "value": $TWILIO_AUTH_TOKEN}] else [] end +
    ...
  )
')

# Log injected vars (names only)
echo "TWILIO_* env vars injected:"
echo $NEW_TASK_DEF | jq -r '.containerDefinitions[0].environment[]? | select(.name | startswith("TWILIO_")) | .name'
```

---

## VALIDAÇÃO PÓS-DEPLOY

### 1. Verificar GitHub Actions Logs

**Acessar**: https://github.com/usbtecnok/kaviar-v2/actions

**Procurar por**:
```
TWILIO_* env vars injected:
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_WHATSAPP_FROM
TWILIO_TEMPLATE_INVITE_INVESTOR
TWILIO_TEMPLATE_RIDE_DRIVER_ASSIGNED
TWILIO_TEMPLATE_RIDE_PASSENGER_ARRIVING
TWILIO_TEMPLATE_AUTH_PASSWORD_RESET
```

**Esperado**: 7 variáveis listadas (ou menos se alguns secrets estiverem vazios)

---

### 2. Verificar Task Definition no ECS

```bash
# Obter ARN da task definition atual
REGION=us-east-2
CLUSTER=kaviar-cluster
SERVICE=kaviar-backend-service

TASKDEF_ARN=$(aws ecs describe-services \
  --region "$REGION" \
  --cluster "$CLUSTER" \
  --services "$SERVICE" \
  --query "services[0].taskDefinition" \
  --output text)

echo "Task Definition ARN: $TASKDEF_ARN"

# Listar TWILIO_* env vars
aws ecs describe-task-definition \
  --region "$REGION" \
  --task-definition "$TASKDEF_ARN" \
  --query "taskDefinition.containerDefinitions[0].environment[?starts_with(name,'TWILIO_')]" \
  --output table
```

**Esperado**:
```
---------------------------------------------------------
|              DescribeTaskDefinition                   |
+-------------------------------+------------------------+
|             name              |         value          |
+-------------------------------+------------------------+
|  TWILIO_ACCOUNT_SID           |  ACxxxxxxxxxxxxxxxx... |
|  TWILIO_AUTH_TOKEN            |  xxxxxxxxxxxxxxxx...   |
|  TWILIO_WHATSAPP_FROM         |  whatsapp:+14155...    |
|  TWILIO_TEMPLATE_INVITE_...   |  HXxxxxxxxxxxxxxxxx... |
|  TWILIO_TEMPLATE_RIDE_DRI...  |  HXxxxxxxxxxxxxxxxx... |
|  TWILIO_TEMPLATE_RIDE_PAS...  |  HXxxxxxxxxxxxxxxxx... |
|  TWILIO_TEMPLATE_AUTH_PAS...  |  HXxxxxxxxxxxxxxxxx... |
+-------------------------------+------------------------+
```

**Se vazio**: Secrets não configurados no GitHub ou deploy não completou.

---

### 3. Verificar Health Endpoint

```bash
curl -sS https://api.kaviar.com.br/api/health | jq '.checks.twilio_whatsapp'
```

**Esperado**:
```json
{
  "checks": {
    "twilio_whatsapp": true
  }
}
```

**Se false**: Env vars não chegaram ao container ou Twilio credentials inválidas.

---

### 4. Testar Endpoint de Convite

```bash
# Obter token de admin
ADMIN_TOKEN="eyJhbGciOiJIUzI1NiIs..."

# Testar convite via WhatsApp
curl -sS -X POST "https://api.kaviar.com.br/api/admin/investors/invite" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "whatsapp",
    "phone": "+5521980669989",
    "role": "ANGEL_VIEWER"
  }' | jq
```

**Esperado (se templates configurados)**:
```json
{
  "success": true,
  "message": "Convite enviado via WhatsApp."
}
```

**Esperado (se templates NÃO configurados - fallback)**:
```json
{
  "success": true,
  "message": "Convite enviado via email (WhatsApp indisponível)."
}
```

**NÃO deve mais retornar**:
```json
{
  "success": false,
  "error": "WhatsApp não configurado. Entre em contato com o administrador."
}
```

---

### 5. Verificar Logs do Container

```bash
# Obter task ID
TASK_ID=$(aws ecs list-tasks \
  --region "$REGION" \
  --cluster "$CLUSTER" \
  --service-name "$SERVICE" \
  --query "taskArns[0]" \
  --output text | cut -d'/' -f3)

echo "Task ID: $TASK_ID"

# Ver logs (últimas 50 linhas)
aws logs tail /ecs/kaviar-backend \
  --region "$REGION" \
  --since 10m \
  --filter-pattern "[WhatsApp]" \
  --format short
```

**Procurar por**:
```
[WhatsApp] Service initialized
[WhatsApp] Sending template: kaviar_invites_investor_v1
[WhatsApp] Template sent: {sid, status}
```

**Se aparecer**:
```
[WhatsApp] Missing Twilio env vars - WhatsApp disabled
```
→ Env vars não chegaram ao container.

---

## TROUBLESHOOTING

### Problema 1: TWILIO_* não aparecem no task definition

**Causa**: Secrets não configurados no GitHub

**Solução**:
```bash
# Verificar secrets
gh secret list | grep TWILIO

# Se faltando, adicionar:
gh secret set TWILIO_ACCOUNT_SID --body "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
gh secret set TWILIO_AUTH_TOKEN --body "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
gh secret set TWILIO_WHATSAPP_FROM --body "whatsapp:+14155238886"
gh secret set TWILIO_TEMPLATE_INVITE_INVESTOR --body "HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
# ... etc

# Re-deploy
gh workflow run deploy-backend.yml
```

---

### Problema 2: Env vars aparecem no task definition mas não no container

**Causa**: Deploy não completou ou service não atualizou

**Solução**:
```bash
# Forçar novo deployment
aws ecs update-service \
  --region us-east-2 \
  --cluster kaviar-cluster \
  --service kaviar-backend-service \
  --force-new-deployment

# Aguardar estabilização
aws ecs wait services-stable \
  --region us-east-2 \
  --cluster kaviar-cluster \
  --services kaviar-backend-service
```

---

### Problema 3: WhatsApp ainda retorna "não configurado"

**Causa**: Twilio credentials inválidas ou WhatsApp FROM incorreto

**Verificar**:
```bash
# Testar credentials localmente
curl -X POST "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/Messages.json" \
  --data-urlencode "Body=Test" \
  --data-urlencode "From=whatsapp:+14155238886" \
  --data-urlencode "To=whatsapp:+5521980669989" \
  -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN"

# Se erro 401: credentials inválidas
# Se erro 21606: FROM number não habilitado para WhatsApp
```

---

### Problema 4: Fallback para email sempre ativa

**Causa**: Templates não configurados (Content SIDs vazios)

**Esperado**: Isso é normal até templates serem aprovados pelo WhatsApp

**Solução**:
1. Submeter templates no Twilio Console
2. Aguardar aprovação (24-48h)
3. Copiar Content SIDs
4. Adicionar secrets:
   ```bash
   gh secret set TWILIO_TEMPLATE_INVITE_INVESTOR --body "HXxxx..."
   gh secret set TWILIO_TEMPLATE_RIDE_DRIVER_ASSIGNED --body "HXxxx..."
   gh secret set TWILIO_TEMPLATE_RIDE_PASSENGER_ARRIVING --body "HXxxx..."
   gh secret set TWILIO_TEMPLATE_AUTH_PASSWORD_RESET --body "HXxxx..."
   ```
5. Re-deploy

---

## CHECKLIST FINAL

### Deploy Completo ✅
- [ ] GitHub Actions workflow completou sem erros
- [ ] Logs mostram "TWILIO_* env vars injected: ..." (7 vars)
- [ ] ECS task definition contém TWILIO_* env vars
- [ ] Service atualizou para nova task definition
- [ ] Container iniciou sem erros

### WhatsApp Funcionando ✅
- [ ] Health endpoint mostra `twilio_whatsapp: true`
- [ ] Endpoint de convite NÃO retorna "WhatsApp não configurado"
- [ ] Logs mostram "[WhatsApp] Service initialized"

### Fallback Funcionando ✅
- [ ] Se templates não configurados → envia email
- [ ] Se WhatsApp falhar → envia email
- [ ] Email sempre funciona (backward compatible)

---

## COMANDOS RÁPIDOS

```bash
# 1. Verificar task definition atual
TASKDEF_ARN=$(aws ecs describe-services --region us-east-2 --cluster kaviar-cluster --services kaviar-backend-service --query "services[0].taskDefinition" --output text)
aws ecs describe-task-definition --region us-east-2 --task-definition "$TASKDEF_ARN" --query "taskDefinition.containerDefinitions[0].environment[?starts_with(name,'TWILIO_')]" --output table

# 2. Verificar health
curl -sS https://api.kaviar.com.br/api/health | jq '.checks.twilio_whatsapp'

# 3. Testar convite
curl -sS -X POST "https://api.kaviar.com.br/api/admin/investors/invite" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"channel":"whatsapp","phone":"+5521980669989","role":"ANGEL_VIEWER"}' | jq

# 4. Ver logs
aws logs tail /ecs/kaviar-backend --region us-east-2 --since 10m --filter-pattern "[WhatsApp]" --format short
```

---

**Status**: ✅ FIX DEPLOYADO - Aguardando validação em PROD
