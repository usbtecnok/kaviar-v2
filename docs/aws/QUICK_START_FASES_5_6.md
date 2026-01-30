# QUICK START - FASES 5 & 6

## ⚡ Execução Rápida

### Fase 5: Frontend (S3 + CloudFront)
```bash
# Deploy
./aws-phase5-frontend.sh

# Validar
./validate-phase5.sh

# Acessar
# URL será exibida no final do script
```

**Tempo estimado**: 5-10 minutos (CloudFront deployment)

---

### Fase 6: HTTPS (ACM + ALB)

#### Opção A: SEM domínio (apenas logs)
```bash
./aws-phase6-https.sh
# Responder "N" quando perguntar sobre domínio
```

**Resultado**: CloudWatch Logs + S3 Access Logs configurados

---

#### Opção B: COM domínio (HTTPS completo)
```bash
# 1. Solicitar certificado
./aws-phase6-https.sh
# Responder "Y" e informar domínio (ex: api.kaviar.com)

# 2. Obter registros DNS de validação
aws acm describe-certificate \
  --certificate-arn $(grep CERT_ARN aws-resources.env | cut -d'"' -f2) \
  --region us-east-2 \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord'

# 3. Adicionar registro CNAME no Route53 ou provedor DNS

# 4. Aguardar validação (5-30 min)
watch -n 30 'aws acm describe-certificate \
  --certificate-arn $(grep CERT_ARN aws-resources.env | cut -d'"' -f2) \
  --region us-east-2 \
  --query "Certificate.Status" --output text'

# 5. Executar novamente após validação
./aws-phase6-https.sh

# 6. Validar
./validate-phase6.sh
```

**Tempo estimado**: 30-60 minutos (validação DNS)

---

## 🔍 Validação Rápida

### Verificar Backend (Fase 4B)
```bash
./validate-fase4b.sh
```

### Verificar Frontend (Fase 5)
```bash
./validate-phase5.sh
```

### Verificar HTTPS (Fase 6)
```bash
./validate-phase6.sh
```

---

## 🌐 URLs Finais

### Desenvolvimento (sem domínio)
```bash
# Frontend
source aws-resources.env
echo "Frontend: https://$CLOUDFRONT_DOMAIN"

# Backend
echo "Backend: http://$ALB_DNS"
```

### Produção (com domínio)
```bash
# Frontend
echo "Frontend: https://app.kaviar.com"

# Backend
echo "Backend: https://api.kaviar.com"
```

---

## 🐛 Troubleshooting Rápido

### Frontend não carrega
```bash
# Invalidar cache CloudFront
aws cloudfront create-invalidation \
  --distribution-id $CLOUDFRONT_ID \
  --paths "/*"

# Verificar build
cd /home/goes/kaviar/frontend-app
npm run build
```

### API não conecta
```bash
# Verificar ALB
curl -v http://$ALB_DNS/api/health

# Verificar .env.production
cat /home/goes/kaviar/frontend-app/.env.production
```

### CloudFront ainda em deployment
```bash
# Verificar status
aws cloudfront get-distribution \
  --id $CLOUDFRONT_ID \
  --query 'Distribution.Status' \
  --output text

# Aguardar (5-10 min)
watch -n 30 'aws cloudfront get-distribution \
  --id $CLOUDFRONT_ID \
  --query "Distribution.Status" --output text'
```

---

## 📊 Status Atual

```bash
# Resumo completo
cat <<'EOF'
╔════════════════════════════════════════════════════════════╗
║  KAVIAR AWS MIGRATION - STATUS                             ║
╚════════════════════════════════════════════════════════════╝

✅ Fase 1: VPC + Networking
✅ Fase 2: RDS PostgreSQL + PostGIS
✅ Fase 3: S3 + Redis + SQS
✅ Fase 4: Docker + ECR + ECS + ALB
📝 Fase 5: Frontend (S3 + CloudFront) - PRONTO PARA EXECUTAR
📝 Fase 6: HTTPS (ACM + ALB 443) - PRONTO PARA EXECUTAR
⏸️  Fase 7: DNS (Route53)
⏸️  Fase 8: Monitoring (CloudWatch)

EOF

# Validar fases concluídas
./validate-fase4b.sh
```

---

## 📝 Próximos Passos

1. **Executar Fase 5** (Frontend)
   ```bash
   ./aws-phase5-frontend.sh
   ```

2. **Testar no browser**
   ```bash
   source aws-resources.env
   echo "Acesse: https://$CLOUDFRONT_DOMAIN"
   ```

3. **(Opcional) Executar Fase 6** (HTTPS)
   ```bash
   ./aws-phase6-https.sh
   ```

4. **Planejar cutover** (Render → AWS)
   ```bash
   cat CUTOVER_CHECKLIST.md
   ```

---

## 📚 Documentação Completa

- `FASES_5_6_RESUMO.md` - Resumo executivo detalhado
- `CUTOVER_CHECKLIST.md` - Checklist completo de migração
- `RUNBOOK_FASE4B.md` - Troubleshooting backend
- `STATE_OF_PROJECT.md` - Status geral do projeto
