#!/bin/bash
set -euo pipefail

# Deploy Asaas produção — atualiza envs na task definition do ECS
# Uso:
#   export ASAAS_PROD_API_KEY="<chave produção>"
#   export ASAAS_PROD_WEBHOOK_TOKEN="<novo token>"
#   bash scripts/deploy/deploy-asaas-production.sh

REGION="us-east-2"
CLUSTER="kaviar-cluster"
SERVICE="kaviar-backend-service"
TASK_FAMILY="kaviar-backend"
ASAAS_BASE_URL="${ASAAS_BASE_URL_OVERRIDE:-https://api.asaas.com/v3}"

# Validações
if [ -z "${ASAAS_PROD_API_KEY:-}" ]; then
  echo "❌ ASAAS_PROD_API_KEY não definida"
  exit 1
fi
if [ -z "${ASAAS_PROD_WEBHOOK_TOKEN:-}" ]; then
  echo "❌ ASAAS_PROD_WEBHOOK_TOKEN não definida"
  exit 1
fi
if echo "$ASAAS_PROD_API_KEY" | grep -q "hmlg"; then
  echo "❌ ASAAS_PROD_API_KEY contém 'hmlg' — parece ser chave de sandbox!"
  exit 1
fi

echo "🔄 Asaas → Produção"
echo "   BASE_URL: $ASAAS_BASE_URL"
echo "   API_KEY:  ${ASAAS_PROD_API_KEY:0:20}..."
echo "   WEBHOOK:  ${ASAAS_PROD_WEBHOOK_TOKEN:0:10}..."
echo ""

# Buscar task definition atual
echo "📋 Buscando task definition atual..."
TASK_DEF=$(aws ecs describe-task-definition --task-definition "$TASK_FAMILY" --region "$REGION")

CURRENT_REV=$(echo "$TASK_DEF" | jq -r '.taskDefinition.revision')
echo "   Revisão atual: $CURRENT_REV"

# Atualizar envs do Asaas
echo "🔧 Atualizando variáveis Asaas..."
NEW_TASK_DEF=$(echo "$TASK_DEF" | jq \
  --arg BASE_URL "$ASAAS_BASE_URL" \
  --arg API_KEY "$ASAAS_PROD_API_KEY" \
  --arg WEBHOOK_TOKEN "$ASAAS_PROD_WEBHOOK_TOKEN" '
  .taskDefinition |
  .containerDefinitions[0].environment = [
    .containerDefinitions[0].environment[] |
    if .name == "ASAAS_BASE_URL" then .value = $BASE_URL
    elif .name == "ASAAS_API_KEY" then .value = $API_KEY
    elif .name == "ASAAS_WEBHOOK_TOKEN" then .value = $WEBHOOK_TOKEN
    else . end
  ] |
  del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy)
')

# Verificar valores
echo ""
echo "   Valores que serão aplicados:"
echo "$NEW_TASK_DEF" | jq -r '.containerDefinitions[0].environment[] | select(.name | startswith("ASAAS_")) | "   \(.name) = \(.value[0:30])..."'
echo ""

read -p "Confirmar deploy? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Cancelado"
  exit 1
fi

# Registrar nova task definition
echo "📝 Registrando nova task definition..."
echo "$NEW_TASK_DEF" > /tmp/asaas-task-def.json
NEW_REV=$(aws ecs register-task-definition \
  --cli-input-json file:///tmp/asaas-task-def.json \
  --region "$REGION" | jq -r '.taskDefinition.revision')
rm -f /tmp/asaas-task-def.json

echo "   Nova revisão: $NEW_REV"

# Deploy
echo "🚀 Deployando..."
aws ecs update-service \
  --cluster "$CLUSTER" \
  --service "$SERVICE" \
  --task-definition "${TASK_FAMILY}:${NEW_REV}" \
  --force-new-deployment \
  --region "$REGION" > /dev/null

echo "⏳ Aguardando estabilização..."
aws ecs wait services-stable \
  --cluster "$CLUSTER" \
  --services "$SERVICE" \
  --region "$REGION"

echo ""
echo "✅ Deploy concluído!"
echo "   Task definition: ${TASK_FAMILY}:${NEW_REV} (anterior: ${CURRENT_REV})"
echo "   ASAAS_BASE_URL: $ASAAS_BASE_URL"
echo ""
echo "📋 Próximos passos:"
echo "   1. Configurar webhook no painel Asaas produção"
echo "      URL: https://api.kaviar.com.br/api/webhooks/asaas"
echo "      Token: (mesmo ASAAS_PROD_WEBHOOK_TOKEN)"
echo "   2. Testar com 1 motorista controlado"
echo "   3. Validar ponta a ponta (ver runbook)"
echo ""
echo "🔙 Rollback: aws ecs update-service --cluster $CLUSTER --service $SERVICE --task-definition ${TASK_FAMILY}:${CURRENT_REV} --force-new-deployment --region $REGION"
