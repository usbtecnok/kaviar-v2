# 🔐 KAVIAR - DESBLOQUEIO RDS PARA PILOTO
## Relatório de Governança e Evidências

**Data:** 2026-02-21 12:17 BRT  
**Objetivo:** Liberar acesso mínimo ao RDS para piloto Furnas/Agrícola/Mata Machado  
**Usuário:** usbtecnok (profile kaviar)  
**Região:** us-east-2  
**IP Autorizado:** 191.57.12.81/32

---

## 📋 PROBLEMA IDENTIFICADO

**Erro atual:**
```
AccessDenied: User arn:aws:iam::847895361928:user/usbtecnok is not authorized to perform:
- rds:DescribeDBInstances
- ec2:DescribeSecurityGroups
- ec2:AuthorizeSecurityGroupIngress
```

**Impacto:**
- Impossível identificar RDS endpoint
- Impossível liberar IP no security group
- Impossível conectar ao banco para análise do piloto

---

## ✅ SOLUÇÃO APLICADA

### Opção Escolhida: **Policy Inline Mínima**

**Justificativa:**
- Menor privilégio possível
- Escopo limitado (apenas RDS read + SG ingress)
- Não usa policies gerenciadas amplas
- Fácil de auditar e remover

**Policy criada:** `KAVIARPilotRDSAccess`

**Permissões concedidas:**
```json
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
```

**Análise de segurança:**
- ✅ Apenas leitura em RDS (describe)
- ✅ Apenas ingress em SG (não egress)
- ✅ Não permite deletar/modificar RDS
- ✅ Não permite deletar SG
- ✅ Escopo: apenas necessário para o piloto

---

## 🔧 EXECUÇÃO

### Pré-requisitos

**⚠️ IMPORTANTE:** O usuário `usbtecnok` **NÃO** tem permissão para modificar suas próprias políticas IAM.

**Você precisa executar o script com credenciais de:**
- Root account
- Usuário com `iam:PutUserPolicy`
- Role com `AdministratorAccess`

### Comando de Execução

```bash
# OPÇÃO 1: Usar credenciais de root/admin
export AWS_ACCESS_KEY_ID=<admin-key>
export AWS_SECRET_ACCESS_KEY=<admin-secret>
./destravar-rds-piloto.sh

# OPÇÃO 2: Usar profile de admin
aws configure --profile admin
./destravar-rds-piloto.sh
# (modificar script para usar --profile admin ao invés de kaviar)

# OPÇÃO 3: Usar AWS Console
# 1. IAM → Users → usbtecnok → Permissions → Add inline policy
# 2. Colar JSON de /home/goes/kaviar/kaviar-pilot-rds-access-policy.json
# 3. Nome: KAVIARPilotRDSAccess
# 4. Create policy
```

---

## 📊 EVIDÊNCIAS ESPERADAS

### 1. Antes da Aplicação

**Políticas inline:**
```
(nenhuma)
```

**Políticas gerenciadas:**
```
(verificar com: aws iam list-attached-user-policies --user-name usbtecnok)
```

### 2. Depois da Aplicação

**Políticas inline:**
```
KAVIARPilotRDSAccess
```

**Conteúdo da policy:**
```json
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
```

### 3. Teste de Acesso RDS

**Comando:**
```bash
aws rds describe-db-instances \
  --profile kaviar \
  --region us-east-2 \
  --query 'DBInstances[*].[DBInstanceIdentifier,Endpoint.Address,VpcSecurityGroups[0].VpcSecurityGroupId]' \
  --output table
```

**Resultado esperado:**
```
-----------------------------------------------------------------
|                    DescribeDBInstances                        |
+---------------------------+-----------------------------------+
|  kaviar-prod-db           |  kaviar-prod-db.cxuuaq46o1o5...  |
|                           |  sg-XXXXXXXXXXXXXXXX              |
+---------------------------+-----------------------------------+
```

### 4. Security Group Identificado

**Comando:**
```bash
aws ec2 describe-security-groups \
  --profile kaviar \
  --region us-east-2 \
  --group-ids sg-XXXXXXXXXXXXXXXX \
  --query 'SecurityGroups[0].[GroupId,GroupName,Description]' \
  --output table
```

**Resultado esperado:**
```
sg-XXXXXXXXXXXXXXXX | kaviar-rds-sg | Security group for KAVIAR RDS
```

### 5. Regra Criada no SG

**Comando:**
```bash
aws ec2 describe-security-group-rules \
  --profile kaviar \
  --region us-east-2 \
  --filters "Name=group-id,Values=sg-XXXXXXXXXXXXXXXX" \
  --query 'SecurityGroupRules[?IsEgress==`false` && CidrIpv4==`191.57.12.81/32`]' \
  --output table
```

**Resultado esperado:**
```
----------------------------------------------------------------------------------
|                         DescribeSecurityGroupRules                             |
+------------------+----------+----------+----------+------------------+----------+
|  GroupId         | Protocol | FromPort | ToPort   | CidrIpv4         | Desc     |
+------------------+----------+----------+----------+------------------+----------+
|  sg-XXXXXX       |  tcp     |  5432    |  5432    |  191.57.12.81/32 | KAVIAR...|
+------------------+----------+----------+----------+------------------+----------+
```

**Descrição completa:** `KAVIAR TEMP DB ACCESS - Piloto Furnas/Agricola/Mata Machado`

### 6. Teste de Conexão

**Comando:**
```bash
export DATABASE_URL="postgresql://kaviaradmin:KaviarDB2026SecureProd@kaviar-prod-db.cxuuaq46o1o5.us-east-2.rds.amazonaws.com:5432/kaviar?sslmode=require"
psql "$DATABASE_URL" -c "SELECT version();"
```

**Resultado esperado:**
```
                                                 version
---------------------------------------------------------------------------------------------------------
 PostgreSQL 15.x on x86_64-pc-linux-gnu, compiled by gcc (GCC) x.x.x, 64-bit
(1 row)
```

---

## 🛡️ GOVERNANÇA E COMPLIANCE

### Princípios Aplicados

✅ **Least Privilege**
- Apenas permissões necessárias
- Sem acesso a outros serviços
- Sem permissões de escrita em RDS

✅ **Temporary Access**
- Policy inline (fácil de remover)
- Regra de SG com descrição "TEMP"
- Documentado para remoção futura

✅ **Auditoria**
- Todas as ações registradas em CloudTrail
- Policy versionada em Git
- Relatório de governança completo

✅ **Segurança de Rede**
- Apenas IP específico (/32)
- Não aberto para 0.0.0.0/0
- Apenas porta necessária (5432)

### Checklist de Segurança

- [x] Policy com menor privilégio possível
- [x] Apenas IP específico autorizado (/32)
- [x] Descrição clara na regra do SG
- [x] Não aberto para internet (0.0.0.0/0)
- [x] Não altera produção além do necessário
- [x] Documentação completa
- [x] Plano de remoção documentado

---

## 🔄 PLANO DE REMOÇÃO

### Quando Remover

**Após conclusão do piloto:**
- Análise de dados concluída
- Comunidades criadas
- Testes de território validados
- Não há mais necessidade de acesso direto ao RDS

### Como Remover

**1. Remover regra do Security Group:**
```bash
# Obter ID da regra
RULE_ID=$(aws ec2 describe-security-group-rules \
  --profile kaviar \
  --region us-east-2 \
  --filters "Name=group-id,Values=sg-XXXXXXXXXXXXXXXX" \
  --query 'SecurityGroupRules[?IsEgress==`false` && CidrIpv4==`191.57.12.81/32`].SecurityGroupRuleId' \
  --output text)

# Remover regra
aws ec2 revoke-security-group-ingress \
  --profile kaviar \
  --region us-east-2 \
  --group-id sg-XXXXXXXXXXXXXXXX \
  --security-group-rule-ids $RULE_ID
```

**2. Remover policy inline (opcional):**
```bash
# Com credenciais de admin
aws iam delete-user-policy \
  --user-name usbtecnok \
  --policy-name KAVIARPilotRDSAccess
```

**Nota:** A policy inline pode permanecer se houver necessidade futura de acesso read-only ao RDS. Apenas a regra do SG deve ser removida obrigatoriamente.

---

## 📝 PRÓXIMOS PASSOS

### Após Desbloqueio

1. **Rodar análise de dados:**
   ```bash
   cd /home/goes/kaviar/backend
   npx tsx analise-piloto.ts
   ```

2. **Verificar comunidades existentes:**
   - Furnas
   - Agrícola
   - Mata Machado

3. **Criar comunidades (se necessário):**
   - Usar SQL do runbook
   - Criar geofences mínimas

4. **Testar resolução de território:**
   - 6 coordenadas (2 por área)
   - Validar fallback 800m

5. **Continuar com piloto:**
   - Seguir runbook em `/home/goes/kaviar/PILOTO_FURNAS_RUNBOOK.md`

---

## 📂 ARQUIVOS GERADOS

**Localização:** `/home/goes/kaviar/`

1. **kaviar-pilot-rds-access-policy.json**
   - Policy IAM em formato JSON
   - Pronta para aplicar via Console ou CLI

2. **destravar-rds-piloto.sh**
   - Script automatizado completo
   - Aplica policy + libera SG + testa conexão
   - Gera evidências automaticamente

3. **DESBLOQUEIO_RDS_GOVERNANCA.md** (este arquivo)
   - Relatório de governança
   - Evidências esperadas
   - Plano de remoção

---

## ⚠️ AVISOS IMPORTANTES

1. **Credenciais de Admin Necessárias**
   - O script requer credenciais com `iam:PutUserPolicy`
   - Usuário `usbtecnok` não pode aplicar a policy em si mesmo

2. **Propagação de Permissões**
   - Aguardar 10-30 segundos após aplicar policy
   - Testar com `aws rds describe-db-instances`

3. **Segurança**
   - Regra do SG é temporária
   - Remover após conclusão do piloto
   - Não compartilhar credenciais do RDS

4. **Backup**
   - Fazer backup antes de modificar dados
   - Testar em ambiente de staging primeiro (se possível)

---

## 📞 SUPORTE

**Dúvidas sobre:**
- Execução do script: Ver comentários em `destravar-rds-piloto.sh`
- Policy IAM: Ver `kaviar-pilot-rds-access-policy.json`
- Piloto: Ver `PILOTO_FURNAS_RUNBOOK.md`

**Problemas comuns:**
- AccessDenied ao aplicar policy → Usar credenciais de admin
- Timeout ao conectar RDS → Aguardar propagação da regra do SG (30-60s)
- Policy não funciona → Verificar se foi aplicada corretamente com `aws iam get-user-policy`

---

**Relatório gerado por:** Kiro (KAVIAR AI Assistant)  
**Data:** 2026-02-21 12:17 BRT  
**Status:** ⚠️ Aguardando execução com credenciais de admin
