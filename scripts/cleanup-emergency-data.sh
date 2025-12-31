#!/bin/bash

# =====================================================
# SCRIPT DE LIMPEZA AUTOMÁTICA - RETENÇÃO LGPD
# =====================================================
# Execute este script diariamente via cron para manter conformidade LGPD
# Exemplo cron: 0 2 * * * /path/to/cleanup-emergency-data.sh

# Configurações
SUPABASE_URL="https://xcxxcexdsbaxgmmnxkgc.supabase.co"
SUPABASE_SERVICE_KEY="your-service-role-key-here"

echo "🧹 Iniciando limpeza automática de dados de emergência..."
echo "Data: $(date)"

# Executar função de limpeza via API Supabase
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/cleanup_expired_emergencies" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{}' \
  --silent --output /tmp/cleanup_result.json

# Verificar resultado
if [ $? -eq 0 ]; then
  DELETED_COUNT=$(cat /tmp/cleanup_result.json)
  echo "✅ Limpeza concluída. Registros removidos: ${DELETED_COUNT}"
else
  echo "❌ Erro na limpeza automática"
  exit 1
fi

# Limpeza de logs antigos de auditoria (opcional - manter por mais tempo)
echo "🧹 Limpando logs de auditoria antigos (>90 dias)..."

curl -X DELETE "${SUPABASE_URL}/rest/v1/admin_audit_log?created_at=lt.$(date -d '90 days ago' -Iseconds)" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  --silent

echo "✅ Limpeza de auditoria concluída"
echo "🏁 Script finalizado: $(date)"

# Limpar arquivos temporários
rm -f /tmp/cleanup_result.json
