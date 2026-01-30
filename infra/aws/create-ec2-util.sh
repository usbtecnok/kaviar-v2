#!/bin/bash
# KAVIAR - Criar EC2 Utilitária para Setup RDS
# Método: EC2 + SSM Session Manager (sem SSH, sem IP público)

set -euo pipefail

source /home/goes/kaviar/aws-resources.env

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  KAVIAR - EC2 Utilitária para Setup RDS                    ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# 1. Criar IAM Role para EC2 (SSM)
echo "1️⃣ Criando IAM Role para SSM..."

cat > /tmp/ec2-trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

aws iam create-role \
  --role-name KaviarEC2SSMRole \
  --assume-role-policy-document file:///tmp/ec2-trust-policy.json \
  --region $AWS_REGION 2>/dev/null || echo "Role já existe"

aws iam attach-role-policy \
  --role-name KaviarEC2SSMRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore \
  --region $AWS_REGION 2>/dev/null || true

aws iam create-instance-profile \
  --instance-profile-name KaviarEC2SSMProfile \
  --region $AWS_REGION 2>/dev/null || echo "Instance profile já existe"

aws iam add-role-to-instance-profile \
  --instance-profile-name KaviarEC2SSMProfile \
  --role-name KaviarEC2SSMRole \
  --region $AWS_REGION 2>/dev/null || true

echo "✅ IAM Role configurada"

# 2. Criar Security Group para EC2
echo ""
echo "2️⃣ Criando Security Group para EC2..."

SG_EC2=$(aws ec2 describe-security-groups \
  --region $AWS_REGION \
  --filters Name=vpc-id,Values=$VPC_ID Name=group-name,Values=kaviar-ec2-util-sg \
  --query 'SecurityGroups[0].GroupId' \
  --output text 2>/dev/null || echo "None")

if [ "$SG_EC2" = "None" ] || [ -z "$SG_EC2" ]; then
  SG_EC2=$(aws ec2 create-security-group \
    --group-name kaviar-ec2-util-sg \
    --description "Security group for Kaviar EC2 utility instance" \
    --vpc-id $VPC_ID \
    --region $AWS_REGION \
    --query 'GroupId' \
    --output text)
  echo "✅ Security Group EC2 criado: $SG_EC2"
else
  echo "✅ Security Group EC2 já existe: $SG_EC2"
fi

# 3. Atualizar SG do RDS para aceitar EC2
echo ""
echo "3️⃣ Atualizando Security Group do RDS..."

aws ec2 authorize-security-group-ingress \
  --group-id $SG_RDS \
  --protocol tcp \
  --port 5432 \
  --source-group $SG_EC2 \
  --region $AWS_REGION 2>/dev/null || echo "Regra já existe"

echo "✅ RDS aceita conexões do EC2"

# 4. Criar User Data Script
echo ""
echo "4️⃣ Criando User Data Script..."

cat > /tmp/ec2-userdata.sh <<'EOFUSERDATA'
#!/bin/bash
set -x
exec > >(tee /var/log/user-data.log) 2>&1

# Instalar PostgreSQL client
yum update -y
yum install -y postgresql15

# Criar script de setup
cat > /home/ec2-user/setup-postgis.sh <<'EOFSETUP'
#!/bin/bash
set -euo pipefail

RDS_ENDPOINT="__RDS_ENDPOINT__"
RDS_PORT="__RDS_PORT__"
RDS_USERNAME="__RDS_USERNAME__"
RDS_PASSWORD="__RDS_PASSWORD__"

echo "🔧 Instalando PostGIS no RDS..."
echo "📍 Conectando em: $RDS_ENDPOINT:$RDS_PORT"
echo ""

# Criar database
echo "1️⃣ Criando database kaviar..."
PGPASSWORD=$RDS_PASSWORD psql -h $RDS_ENDPOINT -U $RDS_USERNAME -d postgres -c "CREATE DATABASE kaviar;" || echo "Database já existe"

# Instalar extensões
echo "2️⃣ Instalando extensões PostGIS..."
PGPASSWORD=$RDS_PASSWORD psql -h $RDS_ENDPOINT -U $RDS_USERNAME -d kaviar -c "CREATE EXTENSION IF NOT EXISTS postgis;"
PGPASSWORD=$RDS_PASSWORD psql -h $RDS_ENDPOINT -U $RDS_USERNAME -d kaviar -c "CREATE EXTENSION IF NOT EXISTS postgis_topology;"

# Validar
echo "3️⃣ Validando PostGIS..."
POSTGIS_VERSION=$(PGPASSWORD=$RDS_PASSWORD psql -h $RDS_ENDPOINT -U $RDS_USERNAME -d kaviar -t -c "SELECT PostGIS_Version();")
echo "✅ PostGIS instalado: $POSTGIS_VERSION"
EOFSETUP

chmod +x /home/ec2-user/setup-postgis.sh
chown ec2-user:ec2-user /home/ec2-user/setup-postgis.sh

echo "EC2 pronta para SSM Session Manager" > /tmp/ec2-ready
EOFUSERDATA

# Substituir variáveis
sed -i "s|__RDS_ENDPOINT__|$RDS_ENDPOINT|g" /tmp/ec2-userdata.sh
sed -i "s|__RDS_PORT__|$RDS_PORT|g" /tmp/ec2-userdata.sh
sed -i "s|__RDS_USERNAME__|$RDS_USERNAME|g" /tmp/ec2-userdata.sh
sed -i "s|__RDS_PASSWORD__|$RDS_PASSWORD|g" /tmp/ec2-userdata.sh

# 5. Lançar EC2
echo ""
echo "5️⃣ Lançando EC2 utilitária..."

# Obter AMI Amazon Linux 2023 mais recente
AMI_ID=$(aws ec2 describe-images \
  --owners amazon \
  --filters "Name=name,Values=al2023-ami-2023.*-x86_64" "Name=state,Values=available" \
  --query 'Images | sort_by(@, &CreationDate) | [-1].ImageId' \
  --output text \
  --region $AWS_REGION)

echo "AMI: $AMI_ID"

INSTANCE_ID=$(aws ec2 run-instances \
  --image-id $AMI_ID \
  --instance-type t3.micro \
  --iam-instance-profile Name=KaviarEC2SSMProfile \
  --security-group-ids $SG_EC2 \
  --subnet-id $SUBNET_PRIVATE_A \
  --user-data file:///tmp/ec2-userdata.sh \
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=kaviar-util},{Key=Project,Value=kaviar}]" \
  --region $AWS_REGION \
  --query 'Instances[0].InstanceId' \
  --output text)

echo "✅ EC2 lançada: $INSTANCE_ID"

# Aguardar SSM estar pronto
echo ""
echo "⏳ Aguardando SSM Session Manager ficar disponível (2-3 minutos)..."
sleep 120

# Salvar ID
echo "export EC2_UTIL_ID=$INSTANCE_ID" >> /home/goes/kaviar/aws-resources.env
echo "export SG_EC2=$SG_EC2" >> /home/goes/kaviar/aws-resources.env

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  ✅ EC2 UTILITÁRIA CRIADA                                  ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "📋 Instance ID: $INSTANCE_ID"
echo ""
echo "🎯 Próximos passos:"
echo ""
echo "1. Conectar via SSM:"
echo "   aws ssm start-session --target $INSTANCE_ID --region $AWS_REGION"
echo ""
echo "2. Dentro da sessão SSM, executar:"
echo "   sudo su - ec2-user"
echo "   ./setup-postgis.sh"
echo ""
echo "3. Após sucesso, deletar EC2:"
echo "   aws ec2 terminate-instances --instance-ids $INSTANCE_ID --region $AWS_REGION"
echo ""
