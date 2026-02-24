#!/bin/bash
# KAVIAR - Destravar Acesso RDS para Piloto
# Data: 2026-02-21
# Objetivo: Liberar permissões mínimas para usbtecnok acessar RDS

set -e

echo "=== KAVIAR - DESTRAVAR ACESSO RDS ==="
echo ""
echo "⚠️  IMPORTANTE: Execute este script com credenciais de ADMIN/ROOT"
echo "    (não use profile kaviar/usbtecnok)"
echo ""

# Variáveis
USER_NAME="usbtecnok"
POLICY_NAME="KAVIARPilotRDSAccess"
MY_IP="191.57.12.81"
REGION="us-east-2"

# Verificar se está usando credenciais corretas
echo "Verificando credenciais..."
CALLER_IDENTITY=$(aws sts get-caller-identity --output json 2>&1)
if echo "$CALLER_IDENTITY" | grep -q "usbtecnok"; then
  echo "❌ ERRO: Você está usando credenciais do usbtecnok"
  echo "   Use credenciais de admin/root para aplicar a policy"
  exit 1
fi

echo "✅ Credenciais OK"
echo "$CALLER_IDENTITY" | jq -r '.Arn'
echo ""

# 1. EVIDÊNCIA ANTES
echo "=== 1. EVIDÊNCIA ANTES ==="
echo ""
echo "Políticas inline atuais do usuário $USER_NAME:"
aws iam list-user-policies --user-name "$USER_NAME" --output json | jq -r '.PolicyNames[]' || echo "(nenhuma)"
echo ""
echo "Políticas gerenciadas anexadas:"
aws iam list-attached-user-policies --user-name "$USER_NAME" --output json | jq -r '.AttachedPolicies[] | "\(.PolicyName) - \(.PolicyArn)"' || echo "(nenhuma)"
echo ""

# 2. APLICAR POLICY INLINE
echo "=== 2. APLICAR POLICY INLINE ==="
echo ""
echo "Criando policy inline: $POLICY_NAME"
cat > /tmp/kaviar-pilot-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "KAVIARPilotRDSAccess",
      "Effect": "Allow",
      "Action": [
        "rds:DescribeDBInstances",
        "rds:DescribeDBClusters"
      ],
      "Resource": "*"
    },
    {
      "Sid": "KAVIARPilotSGAccess",
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeSecurityGroups",
        "ec2:DescribeSecurityGroupRules",
        "ec2:AuthorizeSecurityGroupIngress",
        "ec2:RevokeSecurityGroupIngress"
      ],
      "Resource": "*"
    }
  ]
}
EOF

cat /tmp/kaviar-pilot-policy.json
echo ""

aws iam put-user-policy \
  --user-name "$USER_NAME" \
  --policy-name "$POLICY_NAME" \
  --policy-document file:///tmp/kaviar-pilot-policy.json

echo "✅ Policy inline aplicada"
echo ""

# 3. EVIDÊNCIA DEPOIS
echo "=== 3. EVIDÊNCIA DEPOIS ==="
echo ""
echo "Políticas inline do usuário $USER_NAME:"
aws iam list-user-policies --user-name "$USER_NAME" --output json | jq -r '.PolicyNames[]'
echo ""
echo "Conteúdo da policy $POLICY_NAME:"
aws iam get-user-policy --user-name "$USER_NAME" --policy-name "$POLICY_NAME" --output json | jq -r '.PolicyDocument | fromjson'
echo ""

# 4. TESTAR ACESSO RDS (com profile kaviar)
echo "=== 4. TESTAR ACESSO RDS ==="
echo ""
echo "Aguardando propagação de permissões (10s)..."
sleep 10
echo ""
echo "Testando: aws rds describe-db-instances (profile kaviar)"
aws rds describe-db-instances \
  --profile kaviar \
  --region "$REGION" \
  --query 'DBInstances[*].[DBInstanceIdentifier,Endpoint.Address,VpcSecurityGroups[0].VpcSecurityGroupId]' \
  --output table

echo ""
echo "✅ Acesso RDS funcionando"
echo ""

# 5. IDENTIFICAR RDS E SECURITY GROUP
echo "=== 5. IDENTIFICAR RDS E SECURITY GROUP ==="
echo ""
RDS_INFO=$(aws rds describe-db-instances \
  --profile kaviar \
  --region "$REGION" \
  --query 'DBInstances[?contains(DBInstanceIdentifier, `kaviar`)].[DBInstanceIdentifier,Endpoint.Address,Endpoint.Port,VpcSecurityGroups[0].VpcSecurityGroupId]' \
  --output json)

echo "$RDS_INFO" | jq -r '.[] | "DB Identifier: \(.[0])\nEndpoint: \(.[1]):\(.[2])\nSecurity Group: \(.[3])\n"'

DB_IDENTIFIER=$(echo "$RDS_INFO" | jq -r '.[0][0]')
DB_ENDPOINT=$(echo "$RDS_INFO" | jq -r '.[0][1]')
DB_PORT=$(echo "$RDS_INFO" | jq -r '.[0][2]')
SG_ID=$(echo "$RDS_INFO" | jq -r '.[0][3]')

echo "Variáveis extraídas:"
echo "  DB_IDENTIFIER=$DB_IDENTIFIER"
echo "  DB_ENDPOINT=$DB_ENDPOINT"
echo "  DB_PORT=$DB_PORT"
echo "  SG_ID=$SG_ID"
echo ""

# 6. VERIFICAR REGRAS ATUAIS DO SG
echo "=== 6. REGRAS ATUAIS DO SECURITY GROUP ==="
echo ""
aws ec2 describe-security-group-rules \
  --profile kaviar \
  --region "$REGION" \
  --filters "Name=group-id,Values=$SG_ID" \
  --query 'SecurityGroupRules[?IsEgress==`false`].[GroupId,IpProtocol,FromPort,ToPort,CidrIpv4,Description]' \
  --output table

echo ""

# 7. ADICIONAR REGRA PARA MEU IP
echo "=== 7. ADICIONAR REGRA PARA MEU IP ==="
echo ""
echo "Adicionando regra: TCP $DB_PORT de $MY_IP/32"
echo ""

# Verificar se regra já existe
EXISTING_RULE=$(aws ec2 describe-security-group-rules \
  --profile kaviar \
  --region "$REGION" \
  --filters "Name=group-id,Values=$SG_ID" \
  --query "SecurityGroupRules[?IsEgress==\`false\` && CidrIpv4==\`$MY_IP/32\` && FromPort==\`$DB_PORT\`].SecurityGroupRuleId" \
  --output text)

if [ -n "$EXISTING_RULE" ]; then
  echo "⚠️  Regra já existe: $EXISTING_RULE"
  echo "   Pulando criação"
else
  aws ec2 authorize-security-group-ingress \
    --profile kaviar \
    --region "$REGION" \
    --group-id "$SG_ID" \
    --ip-permissions "IpProtocol=tcp,FromPort=$DB_PORT,ToPort=$DB_PORT,IpRanges=[{CidrIp=$MY_IP/32,Description='KAVIAR TEMP DB ACCESS - Piloto Furnas/Agricola/Mata Machado'}]"
  
  echo "✅ Regra criada com sucesso"
fi

echo ""

# 8. VERIFICAR REGRAS APÓS ADIÇÃO
echo "=== 8. REGRAS APÓS ADIÇÃO ==="
echo ""
aws ec2 describe-security-group-rules \
  --profile kaviar \
  --region "$REGION" \
  --filters "Name=group-id,Values=$SG_ID" \
  --query 'SecurityGroupRules[?IsEgress==`false`].[GroupId,IpProtocol,FromPort,ToPort,CidrIpv4,Description]' \
  --output table

echo ""

# 9. TESTAR CONEXÃO
echo "=== 9. TESTAR CONEXÃO AO RDS ==="
echo ""
echo "Testando conectividade TCP..."
timeout 5 bash -c "cat < /dev/null > /dev/tcp/$DB_ENDPOINT/$DB_PORT" 2>/dev/null && echo "✅ Porta $DB_PORT acessível" || echo "❌ Porta $DB_PORT inacessível (pode levar alguns segundos para propagar)"

echo ""
echo "Testando com psql..."
export DATABASE_URL="postgresql://kaviaradmin:KaviarDB2026SecureProd@$DB_ENDPOINT:$DB_PORT/kaviar?sslmode=require"
psql "$DATABASE_URL" -c "SELECT version();" 2>&1 | head -5

echo ""
echo "=== DESBLOQUEIO CONCLUÍDO ==="
echo ""
echo "📋 RESUMO:"
echo "  ✅ Policy inline aplicada: $POLICY_NAME"
echo "  ✅ Acesso RDS funcionando"
echo "  ✅ Security Group identificado: $SG_ID"
echo "  ✅ Regra criada: TCP $DB_PORT de $MY_IP/32"
echo "  ✅ Conexão testada"
echo ""
echo "🔗 Próximos passos:"
echo "  1. Rodar análise: cd /home/goes/kaviar/backend && npx tsx analise-piloto.ts"
echo "  2. Criar comunidades (se necessário)"
echo "  3. Testar resolução de território"
echo ""
echo "⚠️  LEMBRETE: Remover regra do SG quando terminar o piloto:"
echo "  aws ec2 revoke-security-group-ingress --profile kaviar --region $REGION --group-id $SG_ID --ip-permissions \"IpProtocol=tcp,FromPort=$DB_PORT,ToPort=$DB_PORT,IpRanges=[{CidrIp=$MY_IP/32}]\""
echo ""
