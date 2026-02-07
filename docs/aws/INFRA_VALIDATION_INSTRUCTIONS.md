# Instruções de Validação de Infraestrutura - Kaviar

## Validação SEM AWS CLI (Parcial)

### 1. Validar Render.com (PaaS)
```bash
# Backend
curl -i "https://kaviar-v2.onrender.com/api/health"
# Esperado: HTTP 200 + JSON {"success": true, ...}

# Frontend
curl -i "https://kaviar-frontend.onrender.com"
# Esperado: HTTP 200 + HTML
```

### 2. Validar AWS ALB (se DNS disponível)
```bash
# Configurar DNS do ALB
export ALB_DNS="kaviar-alb-123456789.us-east-2.elb.amazonaws.com"

# Testar health check
curl -i "http://$ALB_DNS/api/health"
# Esperado: HTTP 200 + JSON {"success": true, ...}

# Testar endpoint específico
curl -X POST "http://$ALB_DNS/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@kaviar.com","password":"<ADMIN_PASSWORD>"}'
# Esperado: HTTP 200 + token JWT
```

### 3. Registrar Evidências
```bash
# Salvar resultado em arquivo
{
  echo "=== Validação de Infraestrutura ==="
  echo "Data: $(date)"
  echo ""
  echo "Render Backend:"
  curl -s "https://kaviar-v2.onrender.com/api/health" | jq
  echo ""
  echo "AWS ALB (se configurado):"
  [ -n "$ALB_DNS" ] && curl -s "http://$ALB_DNS/api/health" | jq || echo "ALB_DNS não configurado"
} > infra-validation-$(date +%Y%m%d-%H%M%S).log
```

---

## Validação COM AWS CLI (Completa)

### 1. Configurar Credenciais
```bash
aws configure
# AWS Access Key ID: <sua-key>
# AWS Secret Access Key: <sua-secret>
# Default region: us-east-2
# Default output format: json
```

### 2. Executar Script de Validação
```bash
# Script TEMP (não commitado)
./validate-aws-infra.sh

# Ou validação manual:
aws ecs list-clusters --region us-east-2
aws logs describe-log-groups --log-group-name-prefix "/ecs/kaviar" --region us-east-2
aws sqs list-queues --region us-east-2
aws s3api list-buckets --query 'Buckets[?contains(Name, `kaviar`)]'
aws rds describe-db-instances --region us-east-2
aws elasticache describe-cache-clusters --region us-east-2
aws elbv2 describe-load-balancers --region us-east-2
```

### 3. Atualizar STATE_OF_PROJECT.md
Após validação bem-sucedida, atualizar seção "AWS (Confirmado via Endpoint)" com:
- ALB DNS
- ECS Cluster ARN
- RDS Endpoint
- S3 Bucket names
- SQS Queue URLs
- Data/hora da validação

---

## Decisão de Estado

| Cenário | Estado no STATE_OF_PROJECT.md |
|---------|-------------------------------|
| Render.com responde HTTP 200 | ✅ "Repo/Deploy PaaS (Confirmado)" |
| ALB responde HTTP 200 | ✅ "AWS (Confirmado via Endpoint)" |
| ALB_DNS não configurado + sem AWS CLI | ⏸️ "AWS (Não Confirmado - Falta de Credenciais)" |
| Nenhum recurso AWS encontrado via CLI | ℹ️ Manter "Não Confirmado" (não afirmar "não existe") |

---

**Última atualização:** 2026-01-28 21:23 BRT
