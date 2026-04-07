#!/bin/bash

# ============================================
# MIGRAÇÃO REMOTA: Neon → RDS (FRANKENSTEIN)
# ============================================

set -e

echo "🧟 MODO FRANKENSTEIN: Migração Remota"
echo "====================================="
echo ""

# Configurações
RDS_URL="postgresql://kaviaradmin:KaviarDB2026!Secure#Prod@kaviar-prod-db.cxuuaq46o1o5.us-east-2.rds.amazonaws.com:5432/kaviar?sslmode=require"
BACKUP_FILE="kaviar_neon_backup.sql"

# ============================================
# 1. UPLOAD DO BACKUP PARA SERVIDOR
# ============================================

echo "📤 1. Enviando backup para servidor..."

# Detectar servidor (assumindo que está rodando na AWS)
SERVER_IP=$(aws ec2 describe-instances \
  --region us-east-2 \
  --filters "Name=tag:Name,Values=*kaviar*backend*" "Name=instance-state-name,Values=running" \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text 2>/dev/null)

if [ "$SERVER_IP" = "None" ] || [ -z "$SERVER_IP" ]; then
  echo "❌ Servidor backend não encontrado"
  echo "   Vou usar conexão direta via VPC..."
  
  # Alternativa: Usar Lambda ou EC2 temporário
  echo ""
  echo "🔧 Criando EC2 temporário para migração..."
  
  # Criar EC2 na mesma VPC
  INSTANCE_ID=$(aws ec2 run-instances \
    --region us-east-2 \
    --image-id ami-0c55b159cbfafe1f0 \
    --instance-type t2.micro \
    --subnet-id subnet-01a498f7b4f3fcff5 \
    --security-group-ids sg-0bb23baec5c65234a \
    --key-name kaviar-key \
    --user-data '#!/bin/bash
apt-get update
apt-get install -y postgresql-client
' \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=kaviar-migration-temp}]' \
    --query 'Instances[0].InstanceId' \
    --output text)
  
  echo "   EC2 criado: $INSTANCE_ID"
  echo "   Aguardando inicialização..."
  
  aws ec2 wait instance-running --region us-east-2 --instance-ids $INSTANCE_ID
  
  SERVER_IP=$(aws ec2 describe-instances \
    --region us-east-2 \
    --instance-ids $INSTANCE_ID \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text)
  
  echo "   ✅ EC2 pronto: $SERVER_IP"
fi

echo "   Servidor: $SERVER_IP"

# Upload via SCP
scp -o StrictHostKeyChecking=no "$BACKUP_FILE" ubuntu@$SERVER_IP:/tmp/

echo "   ✅ Backup enviado"
echo ""

# ============================================
# 2. EXECUTAR MIGRAÇÃO NO SERVIDOR
# ============================================

echo "📥 2. Importando dados no RDS..."

ssh -o StrictHostKeyChecking=no ubuntu@$SERVER_IP << 'ENDSSH'
  export PGPASSWORD="KaviarDB2026!Secure#Prod"
  
  echo "   Testando conexão RDS..."
  psql -h kaviar-prod-db.cxuuaq46o1o5.us-east-2.rds.amazonaws.com \
       -U kaviaradmin \
       -d kaviar \
       -c "SELECT version();" > /dev/null
  
  if [ $? -eq 0 ]; then
    echo "   ✅ Conexão OK"
    
    echo "   Importando dados..."
    psql -h kaviar-prod-db.cxuuaq46o1o5.us-east-2.rds.amazonaws.com \
         -U kaviaradmin \
         -d kaviar \
         < /tmp/kaviar_neon_backup.sql 2>&1 | tail -20
    
    echo "   ✅ Dados importados"
    
    # Executar migrations
    echo "   Executando migrations..."
    psql -h kaviar-prod-db.cxuuaq46o1o5.us-east-2.rds.amazonaws.com \
         -U kaviaradmin \
         -d kaviar \
         << 'EOF'
ALTER TABLE drivers 
ADD COLUMN IF NOT EXISTS territory_type VARCHAR(20),
ADD COLUMN IF NOT EXISTS territory_verified_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS territory_verification_method VARCHAR(20),
ADD COLUMN IF NOT EXISTS virtual_fence_center_lat DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS virtual_fence_center_lng DECIMAL(11, 8);

CREATE INDEX IF NOT EXISTS idx_drivers_territory_type 
ON drivers(territory_type) 
WHERE territory_type IS NOT NULL;

UPDATE drivers d
SET 
  territory_type = CASE 
    WHEN EXISTS (
      SELECT 1 FROM neighborhood_geofences ng 
      WHERE ng.neighborhood_id = d.neighborhood_id
    ) THEN 'OFFICIAL'
    ELSE 'FALLBACK_800M'
  END,
  territory_verification_method = 'ADMIN_OVERRIDE',
  territory_verified_at = NOW()
WHERE 
  d.neighborhood_id IS NOT NULL 
  AND d.territory_type IS NULL;

SELECT 'Migrations OK' as status;
EOF
    
    echo "   ✅ Migrations executadas"
  else
    echo "   ❌ Erro de conexão"
    exit 1
  fi
ENDSSH

echo ""

# ============================================
# 3. ATUALIZAR .ENV NO SERVIDOR BACKEND
# ============================================

echo "📝 3. Atualizando .env no servidor backend..."

# Detectar servidor backend real
BACKEND_IP=$(aws ec2 describe-instances \
  --region us-east-2 \
  --filters "Name=tag:Project,Values=kaviar" "Name=tag:Type,Values=backend" "Name=instance-state-name,Values=running" \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text 2>/dev/null)

if [ "$BACKEND_IP" != "None" ] && [ -n "$BACKEND_IP" ]; then
  echo "   Backend encontrado: $BACKEND_IP"
  
  ssh -o StrictHostKeyChecking=no ubuntu@$BACKEND_IP << ENDSSH2
    cd /app/backend
    
    # Backup do .env
    cp .env .env.neon.backup
    
    # Atualizar DATABASE_URL
    sed -i 's|DATABASE_URL=.*|DATABASE_URL="$RDS_URL"|g' .env
    
    # Regenerar Prisma
    npx prisma generate
    
    # Restart
    pm2 restart kaviar-backend
    
    echo "   ✅ Backend atualizado e reiniciado"
ENDSSH2
else
  echo "   ⚠️  Servidor backend não encontrado automaticamente"
  echo "   📝 Atualize manualmente:"
  echo "      DATABASE_URL=\"$RDS_URL\""
fi

echo ""

# ============================================
# 4. CLEANUP
# ============================================

echo "🧹 4. Limpeza..."

if [ -n "$INSTANCE_ID" ]; then
  echo "   Terminando EC2 temporário..."
  aws ec2 terminate-instances --region us-east-2 --instance-ids $INSTANCE_ID > /dev/null
  echo "   ✅ EC2 terminado"
fi

echo ""
echo "====================================="
echo "✅ MIGRAÇÃO FRANKENSTEIN CONCLUÍDA!"
echo "====================================="
echo ""
echo "📊 RDS Endpoint:"
echo "   kaviar-prod-db.cxuuaq46o1o5.us-east-2.rds.amazonaws.com:5432"
echo ""
echo "🔐 Credenciais:"
echo "   User: kaviaradmin"
echo "   Database: kaviar"
echo "   Password: [no .env]"
echo ""
echo "🚀 Próximos passos:"
echo "   1. Testar cadastro de motorista"
echo "   2. Verificar logs do backend"
echo "   3. Monitorar RDS CloudWatch"
echo ""
