# CHECKLIST: CUTOVER RENDER → AWS

## 📋 Pré-Cutover (Validação AWS)

### Backend (ECS + ALB)
- [ ] `./validate-fase4b.sh` → ✅ 2 targets healthy
- [ ] `curl http://$ALB_DNS/api/health` → HTTP 200
- [ ] Logs no CloudWatch: `aws logs tail /ecs/kaviar-backend --follow`
- [ ] Database conectado (verificar logs)
- [ ] Redis conectado (verificar logs)
- [ ] S3 uploads funcionando (testar upload)
- [ ] SQS jobs funcionando (verificar queue)

### Frontend (S3 + CloudFront)
- [ ] `./validate-phase5.sh` → ✅ CloudFront deployed
- [ ] `curl https://$CLOUDFRONT_DOMAIN` → HTTP 200
- [ ] API_BASE_URL apontando para ALB
- [ ] Login funcionando
- [ ] Dashboard carregando
- [ ] Uploads funcionando

### HTTPS (Opcional - requer domínio)
- [ ] `./validate-phase6.sh` → ✅ Certificado validado
- [ ] `curl https://$DOMAIN_NAME/api/health` → HTTP 200
- [ ] Redirect HTTP → HTTPS funcionando

## 🚀 Cutover (Migração)

### 1. Backup Render (CRÍTICO)
```bash
# Backup database Neon
pg_dump $RENDER_DATABASE_URL > backup-render-$(date +%Y%m%d-%H%M%S).sql

# Backup S3 uploads (se houver)
aws s3 sync s3://render-uploads/ s3://kaviar-uploads-backup/
```

### 2. Sincronizar Dados (se necessário)
```bash
# Migrar dados do Neon para RDS
psql $DATABASE_URL < backup-render-*.sql

# Migrar uploads
aws s3 sync s3://render-uploads/ s3://kaviar-uploads-1769655575/
```

### 3. Atualizar DNS (se usando domínio próprio)
```bash
# Route53 - Apontar para ALB
aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.kaviar.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z3AADJGX6KTTL2",
          "DNSName": "'$ALB_DNS'",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }'

# Frontend - Apontar para CloudFront
aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "app.kaviar.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z2FDTNDATAQYW2",
          "DNSName": "'$CLOUDFRONT_DOMAIN'",
          "EvaluateTargetHealth": false
        }
      }
    }]
  }'
```

### 4. Atualizar Variáveis de Ambiente
```bash
# Frontend - Rebuild com nova API URL
cd /home/goes/kaviar/frontend
cat > .env.production <<EOF
VITE_API_BASE_URL=https://api.kaviar.com
VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
EOF

npm run build
aws s3 sync dist/ s3://$FRONTEND_BUCKET/ --delete
aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_ID --paths "/*"
```

### 5. Desativar Render (APÓS VALIDAÇÃO)
```bash
# Pausar serviços no Render.com
# (fazer via dashboard ou API)

# OU manter em standby por 24-48h
```

## ✅ Pós-Cutover (Validação Produção)

### Testes Funcionais
- [ ] Login de usuário
- [ ] Cadastro de motorista
- [ ] Upload de documentos
- [ ] Aprovação de documentos (admin)
- [ ] Criação de corrida
- [ ] Geofencing funcionando
- [ ] Notificações WhatsApp (Twilio)
- [ ] Jobs SQS processando

### Monitoramento (primeiras 24h)
```bash
# Logs em tempo real
aws logs tail /ecs/kaviar-backend --follow --region us-east-2

# Métricas ALB
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApplicationELB \
  --metric-name TargetResponseTime \
  --dimensions Name=LoadBalancer,Value=app/kaviar-alb/... \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average

# Erros 5xx
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApplicationELB \
  --metric-name HTTPCode_Target_5XX_Count \
  --dimensions Name=LoadBalancer,Value=app/kaviar-alb/... \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

### Alertas Críticos
- [ ] Target unhealthy → Slack/Email
- [ ] 5xx errors > 10/min → Slack/Email
- [ ] Response time > 2s → Slack/Email
- [ ] ECS tasks stopped → Slack/Email

## 🔄 ROLLBACK (Se necessário)

### Rollback Rápido (DNS)
```bash
# Reverter DNS para Render
aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.kaviar.com",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "kaviar-v2.onrender.com"}]
      }
    }]
  }'

# Reativar Render
# (via dashboard)
```

**Tempo de rollback**: ~5-10 minutos (TTL DNS)

### Rollback Completo (Destruir AWS)
```bash
# 1. Deletar ECS Service
aws ecs update-service \
  --cluster kaviar-cluster \
  --service kaviar-backend-service \
  --desired-count 0 \
  --region us-east-2

aws ecs delete-service \
  --cluster kaviar-cluster \
  --service kaviar-backend-service \
  --region us-east-2

# 2. Deletar ALB
ALB_ARN=$(aws elbv2 describe-load-balancers --names kaviar-alb --region us-east-2 --query 'LoadBalancers[0].LoadBalancerArn' --output text)
aws elbv2 delete-load-balancer --load-balancer-arn $ALB_ARN --region us-east-2

# 3. Deletar Target Group (aguardar ALB deletar)
sleep 60
TG_ARN=$(aws elbv2 describe-target-groups --names kaviar-backend-tg --region us-east-2 --query 'TargetGroups[0].TargetGroupArn' --output text)
aws elbv2 delete-target-group --target-group-arn $TG_ARN --region us-east-2

# 4. Deletar CloudFront
aws cloudfront delete-distribution \
  --id $CLOUDFRONT_ID \
  --if-match $(aws cloudfront get-distribution --id $CLOUDFRONT_ID --query 'ETag' --output text)

# 5. Esvaziar e deletar S3 buckets
aws s3 rm s3://$FRONTEND_BUCKET --recursive
aws s3api delete-bucket --bucket $FRONTEND_BUCKET --region us-east-2

# 6. Manter RDS/Redis/SQS (dados preservados)
# OU deletar se não for reutilizar
```

**Tempo de rollback completo**: ~30-60 minutos

## 📊 Critérios de Sucesso

### Cutover bem-sucedido se:
- ✅ Todos os testes funcionais passando
- ✅ Latência < 500ms (p95)
- ✅ Taxa de erro < 0.1%
- ✅ Uptime > 99.9% nas primeiras 24h
- ✅ Nenhum incidente crítico

### Rollback necessário se:
- ❌ Taxa de erro > 5%
- ❌ Latência > 3s (p95)
- ❌ Funcionalidade crítica quebrada
- ❌ Perda de dados
- ❌ Downtime > 15 minutos

## 📝 Comunicação

### Antes do Cutover
- [ ] Notificar equipe (24h antes)
- [ ] Notificar usuários (se downtime esperado)
- [ ] Agendar janela de manutenção (ex: 2h)

### Durante o Cutover
- [ ] Status page atualizado
- [ ] Canal de comunicação ativo (Slack)
- [ ] Monitoramento ativo

### Após o Cutover
- [ ] Notificar sucesso/rollback
- [ ] Post-mortem (se problemas)
- [ ] Documentar lições aprendidas

## 🔗 Links Úteis

- **Render Backend**: https://kaviar-v2.onrender.com
- **Render Frontend**: https://kaviar-frontend.onrender.com
- **AWS ALB**: http://kaviar-alb-1494046292.us-east-2.elb.amazonaws.com
- **AWS CloudFront**: https://$CLOUDFRONT_DOMAIN
- **CloudWatch Logs**: https://console.aws.amazon.com/cloudwatch/home?region=us-east-2#logsV2:log-groups/log-group/$252Fecs$252Fkaviar-backend

## 📞 Contatos de Emergência

- **DevOps**: [seu contato]
- **Backend Lead**: [seu contato]
- **AWS Support**: [caso enterprise]
