#!/bin/bash
# Recriar EC2 em subnet PÚBLICA (mais rápido para setup)
set -euo pipefail

source /home/goes/kaviar/aws-resources.env

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Recriando EC2 em Subnet PÚBLICA (temporária)              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# 1. Terminar EC2 antiga
echo "1️⃣ Terminando EC2 antiga..."
aws ec2 terminate-instances --instance-ids i-0742a74bf6ada1f38 --region $AWS_REGION
echo "✅ EC2 antiga terminada"

# 2. Aguardar terminação
echo "⏳ Aguardando terminação..."
sleep 30

# 3. Criar User Data
cat > /tmp/ec2-userdata.sh <<EOFUSERDATA
#!/bin/bash
set -x
exec > >(tee /var/log/user-data.log) 2>&1

yum update -y
yum install -y postgresql15

cat > /home/ec2-user/setup-postgis.sh <<'EOFSETUP'
#!/bin/bash
set -euo pipefail

RDS_ENDPOINT="$RDS_ENDPOINT"
RDS_PORT="$RDS_PORT"
RDS_USERNAME="$RDS_USERNAME"
RDS_PASSWORD="$RDS_PASSWORD"

echo "🔧 Instalando PostGIS no RDS..."
echo "📍 Conectando em: \$RDS_ENDPOINT:\$RDS_PORT"
echo ""

echo "1️⃣ Criando database kaviar..."
PGPASSWORD=\$RDS_PASSWORD psql -h \$RDS_ENDPOINT -U \$RDS_USERNAME -d postgres -c "CREATE DATABASE kaviar;" || echo "Database já existe"

echo "2️⃣ Instalando extensões PostGIS..."
PGPASSWORD=\$RDS_PASSWORD psql -h \$RDS_ENDPOINT -U \$RDS_USERNAME -d kaviar -c "CREATE EXTENSION IF NOT EXISTS postgis;"
PGPASSWORD=\$RDS_PASSWORD psql -h \$RDS_ENDPOINT -U \$RDS_USERNAME -d kaviar -c "CREATE EXTENSION IF NOT EXISTS postgis_topology;"

echo "3️⃣ Validando PostGIS..."
POSTGIS_VERSION=\$(PGPASSWORD=\$RDS_PASSWORD psql -h \$RDS_ENDPOINT -U \$RDS_USERNAME -d kaviar -t -c "SELECT PostGIS_Version();")
echo "✅ PostGIS instalado: \$POSTGIS_VERSION"
EOFSETUP

chmod +x /home/ec2-user/setup-postgis.sh
chown ec2-user:ec2-user /home/ec2-user/setup-postgis.sh
EOFUSERDATA

# 4. Lançar nova EC2 em subnet PÚBLICA
echo ""
echo "4️⃣ Lançando EC2 em subnet pública..."

AMI_ID=$(aws ec2 describe-images \
  --owners amazon \
  --filters "Name=name,Values=al2023-ami-2023.*-x86_64" "Name=state,Values=available" \
  --query 'Images | sort_by(@, &CreationDate) | [-1].ImageId' \
  --output text \
  --region $AWS_REGION)

INSTANCE_ID=$(aws ec2 run-instances \
  --image-id $AMI_ID \
  --instance-type t3.micro \
  --iam-instance-profile Name=KaviarEC2SSMProfile \
  --security-group-ids $SG_EC2 \
  --subnet-id $SUBNET_PUBLIC_A \
  --associate-public-ip-address \
  --user-data file:///tmp/ec2-userdata.sh \
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=kaviar-util-public},{Key=Project,Value=kaviar}]" \
  --region $AWS_REGION \
  --query 'Instances[0].InstanceId' \
  --output text)

echo "✅ EC2 lançada: $INSTANCE_ID"

# Atualizar aws-resources.env
sed -i "s/export EC2_UTIL_ID=.*/export EC2_UTIL_ID=$INSTANCE_ID/" /home/goes/kaviar/aws-resources.env

echo ""
echo "⏳ Aguardando SSM (60 segundos)..."
sleep 60

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  ✅ EC2 PÚBLICA CRIADA                                     ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "📋 Instance ID: $INSTANCE_ID"
echo ""
echo "🎯 Conectar via SSM:"
echo "   aws ssm start-session --target $INSTANCE_ID --region $AWS_REGION"
echo ""
echo "   Dentro da sessão:"
echo "   sudo su - ec2-user"
echo "   ./setup-postgis.sh"
echo ""
