# 🚀 KAVIAR - MIGRAÇÃO RENDER → AWS (RESUMO EXECUTIVO)

## 📊 Visão Geral

**Tempo Total:** 2-3 dias  
**Custo Mensal AWS:** ~$92 (vs Render ~$50-70)  
**Benefícios:** Escalabilidade, controle total, performance, segurança enterprise

---

## 🎯 Arquitetura Final AWS

```
Internet
   ↓
Application Load Balancer (ALB)
   ↓
ECS Fargate (2-10 tasks auto-scaling)
   ├─ Backend API (Node.js + Express)
   └─ Worker (SQS consumer)
   ↓
├─ RDS PostgreSQL + PostGIS
├─ ElastiCache Redis
├─ S3 (uploads + frontend)
└─ SQS (jobs assíncronos)
```

---

## 📋 Checklist de Migração

### FASE 1: Infraestrutura Base (1-2 dias)
- [ ] Criar VPC + Subnets (públicas e privadas)
- [ ] Criar Internet Gateway + Route Tables
- [ ] Criar Security Groups (ALB, ECS, RDS, Redis)

### FASE 2: Banco de Dados (2-3 horas)
- [ ] Criar RDS PostgreSQL 15.4 (db.t3.micro)
- [ ] Instalar extensão PostGIS
- [ ] Migrar dados do Neon → RDS (pg_dump/restore)
- [ ] Executar migrations Prisma

### FASE 3: Storage (30 min)
- [ ] Criar bucket S3 para uploads
- [ ] Configurar CORS e IAM policies
- [ ] Migrar arquivos existentes (se houver)

### FASE 4: Cache (1 hora)
- [ ] Criar ElastiCache Redis (cache.t3.micro)
- [ ] Configurar subnet group e security group

### FASE 5: Containers (2-3 horas)
- [ ] Criar Dockerfile para backend
- [ ] Criar repositório ECR
- [ ] Build e push da imagem Docker
- [ ] Criar ECS Cluster (Fargate)
- [ ] Criar Task Definition
- [ ] Criar IAM Roles (execution + task)

### FASE 6: Load Balancer (1 hora)
- [ ] Criar Application Load Balancer
- [ ] Criar Target Group (health check /api/health)
- [ ] Criar Listener HTTP:80
- [ ] Configurar Security Groups

### FASE 7: Deploy Backend (30 min)
- [ ] Criar ECS Service (2 tasks)
- [ ] Validar health checks
- [ ] Testar endpoints via ALB

### FASE 8: Frontend (1 hora)
- [ ] Build frontend com VITE_API_BASE_URL=ALB_DNS
- [ ] Criar bucket S3 para frontend
- [ ] Upload de arquivos estáticos
- [ ] (Opcional) Criar CloudFront distribution

### FASE 9: Jobs Assíncronos (30 min)
- [ ] Criar fila SQS + DLQ
- [ ] Criar ECS Service worker (1 task)
- [ ] Configurar IAM policies para SQS

### FASE 10: Segurança (30 min)
- [ ] Migrar secrets para Secrets Manager
- [ ] Atualizar Task Definition com secrets
- [ ] Configurar IAM policies

### FASE 11: Monitoramento (1 hora)
- [ ] Criar CloudWatch Log Groups
- [ ] Criar CloudWatch Alarms (CPU, Memory, 5xx)
- [ ] Criar Dashboard

### FASE 12: Cutover (1 hora)
- [ ] Validar todos os componentes
- [ ] Atualizar DNS (Route 53 ou externo)
- [ ] Monitorar por 24h
- [ ] Desativar Render.com

---

## 💰 Comparação de Custos

| Componente | Render | AWS | Diferença |
|------------|--------|-----|-----------|
| Backend | $25/mês | $30/mês (ECS) | +$5 |
| Database | $25/mês (Neon) | $15/mês (RDS t3.micro) | -$10 |
| Cache | - | $12/mês (Redis t3.micro) | +$12 |
| Load Balancer | Incluído | $20/mês (ALB) | +$20 |
| Storage | Incluído | $5/mês (S3) | +$5 |
| CDN | - | Incluído (CloudFront) | $0 |
| **TOTAL** | **~$50-70** | **~$92** | **+$22-42** |

**Benefícios do custo extra:**
- Auto-scaling (suporta 10x mais tráfego)
- Cache Redis (performance 5-10x melhor)
- Controle total da infraestrutura
- Backup automatizado
- Monitoramento enterprise

---

## 🚀 Comandos Rápidos

### Iniciar Migração
```bash
cd /home/goes/kaviar

# Seguir guias na ordem:
cat AWS_MIGRATION_GUIDE_PART1.md  # Infra + RDS + S3 + Redis
cat AWS_MIGRATION_GUIDE_PART2.md  # ECS + Docker + ALB
cat AWS_MIGRATION_GUIDE_PART3.md  # Frontend + SQS + Cutover
```

### Validar Infraestrutura
```bash
source aws-resources.env

# Health check
curl "http://$ALB_DNS/api/health"

# Login admin
curl -X POST "http://$ALB_DNS/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@kaviar.com","password":"<ADMIN_PASSWORD>"}'

# Logs
aws logs tail /ecs/kaviar-backend --follow --region us-east-2
```

### Rollback (Se Necessário)
```bash
# 1. Reverter DNS para Render
# 2. Manter AWS rodando por 7 dias
# 3. Deletar recursos AWS se não usar:

aws ecs delete-service --cluster kaviar-cluster --service kaviar-backend-service --force --region us-east-2
aws ecs delete-cluster --cluster kaviar-cluster --region us-east-2
aws rds delete-db-instance --db-instance-identifier kaviar-db --skip-final-snapshot --region us-east-2
# ... (deletar outros recursos)
```

---

## 📞 Suporte

**Documentação AWS:**
- ECS: https://docs.aws.amazon.com/ecs/
- RDS: https://docs.aws.amazon.com/rds/
- ALB: https://docs.aws.amazon.com/elasticloadbalancing/

**Guias Completos:**
- Parte 1: `AWS_MIGRATION_GUIDE_PART1.md` (Infra base)
- Parte 2: `AWS_MIGRATION_GUIDE_PART2.md` (ECS + ALB)
- Parte 3: `AWS_MIGRATION_GUIDE_PART3.md` (Frontend + Cutover)

---

**Status:** Pronto para iniciar migração  
**Última atualização:** 2026-01-28 21:34 BRT
