# FASES 5 & 6 - FRONTEND + HTTPS

## 📦 Entregáveis

### Fase 5: Frontend (S3 + CloudFront)
**Script**: `aws-phase5-frontend.sh`

**Funcionalidades**:
- ✅ Cria S3 bucket com website hosting
- ✅ Build do frontend com `VITE_API_BASE_URL` apontando para ALB
- ✅ Upload para S3 com cache headers otimizados
- ✅ CloudFront distribution com HTTPS automático
- ✅ Custom error pages (SPA routing)
- ✅ Validação pós-deploy

**Recursos Criados**:
- S3 Bucket: `kaviar-frontend-{ACCOUNT_ID}`
- CloudFront Distribution (HTTPS gratuito)
- S3 Website URL (HTTP)
- CloudFront URL (HTTPS)

**Uso**:
```bash
chmod +x aws-phase5-frontend.sh
./aws-phase5-frontend.sh
```

**Validação**:
```bash
./validate-phase5.sh
```

---

### Fase 6: HTTPS (ACM + ALB 443)
**Script**: `aws-phase6-https.sh`

**Funcionalidades**:
- ✅ Solicita certificado ACM (requer domínio)
- ✅ Validação DNS automática
- ✅ Listener HTTPS (porta 443)
- ✅ Redirect HTTP → HTTPS (301)
- ✅ CloudWatch Logs para ALB
- ✅ S3 Access Logs
- ✅ Fallback para CloudFront HTTPS (sem domínio)

**Recursos Criados**:
- Certificado ACM (se domínio disponível)
- Listener HTTPS no ALB
- Redirect HTTP → HTTPS
- CloudWatch Log Group
- S3 Bucket para access logs

**Uso**:
```bash
chmod +x aws-phase6-https.sh
./aws-phase6-https.sh
```

**Validação**:
```bash
./validate-phase6.sh
```

---

### Checklist de Cutover
**Arquivo**: `CUTOVER_CHECKLIST.md`

**Conteúdo**:
- ✅ Pré-cutover (validação AWS)
- ✅ Backup Render (database + uploads)
- ✅ Sincronização de dados
- ✅ Atualização de DNS
- ✅ Testes funcionais
- ✅ Monitoramento (primeiras 24h)
- ✅ Procedimentos de rollback (rápido e completo)
- ✅ Critérios de sucesso/falha
- ✅ Comunicação

---

## 🎯 Fluxo de Execução

### Cenário 1: SEM domínio próprio (Recomendado para início)

```bash
# 1. Deploy Frontend
./aws-phase5-frontend.sh
# ✅ Frontend em: https://{cloudfront-id}.cloudfront.net

# 2. Validar
./validate-phase5.sh
# ✅ S3 + CloudFront + API connection

# 3. Configurar Logs (Fase 6 parcial)
./aws-phase6-https.sh
# Responder "N" quando perguntar sobre domínio
# ✅ CloudWatch Logs configurado

# 4. Testar no browser
open https://{cloudfront-id}.cloudfront.net
```

**Resultado**:
- Frontend: HTTPS via CloudFront (certificado AWS gratuito)
- Backend: HTTP via ALB (interno, acessado pelo CloudFront)
- Logs: CloudWatch + S3

---

### Cenário 2: COM domínio próprio (Produção)

```bash
# 1. Deploy Frontend
./aws-phase5-frontend.sh
# ✅ Frontend em CloudFront

# 2. Configurar HTTPS no ALB
./aws-phase6-https.sh
# Responder "Y" quando perguntar sobre domínio
# Informar: api.kaviar.com
# ✅ Certificado ACM solicitado

# 3. Validar DNS no Route53
aws acm describe-certificate --certificate-arn $CERT_ARN --region us-east-2
# Adicionar registro CNAME de validação

# 4. Aguardar validação (5-30 min)
watch -n 30 'aws acm describe-certificate --certificate-arn $CERT_ARN --region us-east-2 --query "Certificate.Status" --output text'

# 5. Executar novamente após validação
./aws-phase6-https.sh
# ✅ Listener HTTPS + Redirect configurados

# 6. Atualizar DNS (Route53)
# Apontar api.kaviar.com → ALB
# Apontar app.kaviar.com → CloudFront

# 7. Rebuild frontend com domínio
cd frontend
cat > .env.production <<EOF
VITE_API_BASE_URL=https://api.kaviar.com
EOF
npm run build
aws s3 sync dist/ s3://$FRONTEND_BUCKET/ --delete
aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_ID --paths "/*"

# 8. Validar
./validate-phase6.sh
# ✅ HTTPS funcionando
```

**Resultado**:
- Frontend: https://app.kaviar.com (CloudFront)
- Backend: https://api.kaviar.com (ALB + ACM)
- Logs: CloudWatch + S3

---

## 🔍 Troubleshooting

### Frontend não carrega
```bash
# Verificar build
cd /home/goes/kaviar/frontend
cat .env.production
npm run build

# Verificar S3
aws s3 ls s3://$FRONTEND_BUCKET/ --recursive

# Verificar CloudFront
aws cloudfront get-distribution --id $CLOUDFRONT_ID --query 'Distribution.Status'

# Invalidar cache
aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_ID --paths "/*"
```

### API não conecta
```bash
# Verificar ALB
curl -v http://$ALB_DNS/api/health

# Verificar CORS no backend
# (adicionar CloudFront domain nas origens permitidas)

# Verificar .env.production
cat /home/goes/kaviar/frontend/.env.production
```

### Certificado ACM não valida
```bash
# Ver registros DNS necessários
aws acm describe-certificate --certificate-arn $CERT_ARN --region us-east-2 --query 'Certificate.DomainValidationOptions[0].ResourceRecord'

# Adicionar no Route53
aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "_xxx.api.kaviar.com",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "_yyy.acm-validations.aws"}]
      }
    }]
  }'

# Aguardar validação
watch -n 30 'aws acm describe-certificate --certificate-arn $CERT_ARN --region us-east-2 --query "Certificate.Status" --output text'
```

---

## 📊 Arquitetura Final

```
┌─────────────────────────────────────────────────────────┐
│                        INTERNET                         │
└─────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
         ┌──────▼──────┐         ┌─────▼──────┐
         │ CloudFront  │         │    ALB     │
         │   (HTTPS)   │         │  (HTTPS)   │
         └──────┬──────┘         └─────┬──────┘
                │                      │
         ┌──────▼──────┐         ┌─────▼──────┐
         │  S3 Bucket  │         │ ECS Tasks  │
         │  (Frontend) │         │ (Backend)  │
         └─────────────┘         └─────┬──────┘
                                       │
                        ┌──────────────┼──────────────┐
                        │              │              │
                   ┌────▼───┐    ┌────▼───┐    ┌────▼───┐
                   │  RDS   │    │ Redis  │    │   S3   │
                   └────────┘    └────────┘    └────────┘
```

**Fluxo de Requisição**:
1. Usuário acessa `https://app.kaviar.com`
2. CloudFront serve frontend do S3
3. Frontend faz API calls para `https://api.kaviar.com`
4. ALB roteia para ECS tasks
5. Backend acessa RDS/Redis/S3

---

## ✅ Critérios de Aceite

### Fase 5
- ✅ Frontend acessível via CloudFront HTTPS
- ✅ API_BASE_URL apontando para ALB
- ✅ Login funcionando
- ✅ Dashboard carregando
- ✅ Cache headers otimizados

### Fase 6
- ✅ Certificado ACM validado (se domínio)
- ✅ Listener HTTPS no ALB
- ✅ Redirect HTTP → HTTPS
- ✅ CloudWatch Logs configurado
- ✅ S3 Access Logs habilitado

---

## 🚀 Próximas Fases

- **Fase 7**: DNS (Route53 + domínio customizado)
- **Fase 8**: Monitoring (CloudWatch Dashboards + Alarms)

---

## 📝 Notas Importantes

1. **CloudFront deployment**: Pode levar 5-10 minutos para propagar
2. **Certificado ACM**: Requer domínio próprio e validação DNS
3. **CORS**: Adicionar CloudFront domain nas origens permitidas do backend
4. **Cache**: Invalidar CloudFront após cada deploy (`/*`)
5. **Custos**: CloudFront tem free tier (1TB/mês), depois ~$0.085/GB
6. **Rollback**: Manter Render ativo por 24-48h após cutover
