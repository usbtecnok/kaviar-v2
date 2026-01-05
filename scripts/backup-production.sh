#!/bin/bash
# backup-production.sh - EXECUTAR ANTES DE QUALQUER MIGRATION

set -e

echo "🔒 BACKUP PRODUÇÃO - $(date)"

# 1. Verificar conexão
echo "Verificando conexão com banco..."
psql $DATABASE_URL -c "SELECT version();" > /dev/null
echo "✅ Conexão OK"

# 2. Criar backup
BACKUP_FILE="kaviar_backup_$(date +%Y%m%d_%H%M%S).sql"
echo "Criando backup: $BACKUP_FILE"

pg_dump $DATABASE_URL > $BACKUP_FILE

# 3. Verificar backup
if [ -s "$BACKUP_FILE" ]; then
    echo "✅ Backup criado: $BACKUP_FILE ($(du -h $BACKUP_FILE | cut -f1))"
else
    echo "❌ ERRO: Backup vazio ou falhou"
    exit 1
fi

# 4. Upload para storage seguro (opcional)
# aws s3 cp $BACKUP_FILE s3://kaviar-backups/

echo "🎯 BACKUP CONCLUÍDO - Pode prosseguir com migration"
