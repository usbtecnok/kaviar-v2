# 🤝 DIVISÃO DE RESPONSABILIDADES - MIGRAÇÃO AWS KAVIAR

**Data:** 2026-01-28  
**Objetivo:** Migração Render → AWS com divisão clara de tarefas

---

## 🤖 O QUE EU (KIRO) POSSO FAZER

### ✅ Automação e Scripts

**1. Criar Scripts de Infraestrutura**
```bash
# Posso gerar scripts bash completos para:
- Criar VPC, Subnets, Security Groups
- Provisionar RDS, Redis, S3, SQS
- Configurar ALB e Target Groups
- Deploy ECS com Task Definitions
```

**2. Gerar Arquivos de Configuração**
```bash
# Posso criar:
- Dockerfile otimizado
- docker-compose.yml para testes locais
- Task Definitions ECS (JSON)
- CloudFormation/Terraform templates
- GitHub Actions CI/CD pipelines
- Scripts de migração de dados
```

**3. Código de Integração AWS**
```javascript
// Posso implementar:
- Cliente S3 para uploads (substituir filesystem)
- Cliente SQS para jobs assíncronos
- Cliente Redis para cache
- Cliente Secrets Manager para credenciais
- Health checks e readiness probes
```

**4. Scripts de Validação**
```bash
# Posso criar testes automatizados:
- Validar conectividade RDS
- Testar endpoints ALB
- Verificar health checks
- Comparar dados Neon vs RDS
- Smoke tests pós-deploy
```

**5. Documentação Técnica**
```markdown
# Posso documentar:
- Arquitetura AWS detalhada
- Runbooks de troubleshooting
- Guias de rollback
- Procedimentos de backup/restore
- Playbooks de incidentes
```

---

## 👤 O QUE VOCÊ PRECISA FAZER

### ⚠️ Ações que Exigem Credenciais/Acesso AWS

**1. Configurar Conta AWS**
```bash
# Você precisa:
✓ Criar conta AWS (ou usar existente)
✓ Configurar billing alerts
✓ Criar IAM user com permissões admin
✓ Gerar Access Key + Secret Key
✓ Executar: aws configure
```

**2. Executar Scripts de Provisionamento**
```bash
# Você precisa rodar os comandos que eu gero:
✓ Executar scripts bash de criação de recursos
✓ Confirmar criação de recursos (custos)
✓ Salvar IDs de recursos (VPC, Subnets, etc)
✓ Validar que recursos foram criados
```

**3. Gerenciar Credenciais Sensíveis**
```bash
# Você precisa:
✓ Definir senhas seguras (RDS, Redis)
✓ Configurar Secrets Manager
✓ Atualizar variáveis de ambiente
✓ Guardar credenciais em local seguro
```

**4. Build e Push de Imagens Docker**
```bash
# Você precisa:
✓ Fazer login no ECR (aws ecr get-login-password)
✓ Executar docker build
✓ Executar docker push
✓ Validar que imagem está no ECR
```

**5. Migração de Dados**
```bash
# Você precisa:
✓ Fazer backup do Neon (pg_dump)
✓ Restaurar no RDS (psql)
✓ Executar migrations Prisma
✓ Validar integridade dos dados
✓ Migrar arquivos uploads para S3 (se houver)
```

**6. Atualizar DNS**
```bash
# Você precisa:
✓ Acessar provedor de DNS (Route 53, Cloudflare, etc)
✓ Atualizar registro A para ALB DNS
✓ Aguardar propagação DNS (5-30 min)
✓ Validar que domínio aponta para AWS
```

**7. Monitoramento Pós-Deploy**
```bash
# Você precisa:
✓ Monitorar CloudWatch Logs por 24-48h
✓ Validar que não há erros críticos
✓ Testar funcionalidades principais
✓ Confirmar que tráfego está fluindo
```

**8. Desativar Render**
```bash
# Você precisa:
✓ Acessar Render Dashboard
✓ Suspender serviços (não deletar ainda)
✓ Manter por 7 dias (rollback safety)
✓ Deletar após confirmação de estabilidade
```

---

## 🔄 FLUXO DE TRABALHO COLABORATIVO

### Iteração Típica

```
┌─────────────────────────────────────────────────────────┐
│ VOCÊ: "Kiro, crie script para provisionar RDS"         │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ KIRO: Gera script bash completo com todos os comandos  │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ VOCÊ: Executa script, salva outputs (RDS_ENDPOINT)     │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ VOCÊ: "Kiro, RDS_ENDPOINT=xyz.rds.amazonaws.com"       │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ KIRO: Gera próximo script (Task Definition com RDS)    │
└─────────────────────────────────────────────────────────┘
```

---

## 📋 CHECKLIST DETALHADO

### FASE 1: Preparação (Você)
- [ ] Criar/acessar conta AWS
- [ ] Configurar billing alerts ($100/mês)
- [ ] Criar IAM user "kaviar-admin"
- [ ] Gerar Access Key + Secret
- [ ] Executar `aws configure` no terminal
- [ ] Validar: `aws sts get-caller-identity`

### FASE 2: Infraestrutura Base (Colaborativo)

**Kiro faz:**
- [x] Gerar script de criação de VPC
- [x] Gerar script de criação de Subnets
- [x] Gerar script de Security Groups

**Você faz:**
- [ ] Executar scripts
- [ ] Salvar IDs em `aws-resources.env`
- [ ] Validar no AWS Console

### FASE 3: RDS PostgreSQL (Colaborativo)

**Kiro faz:**
- [x] Gerar script de criação RDS
- [ ] Gerar script de migração de dados
- [ ] Gerar script de validação

**Você faz:**
- [ ] Definir senha RDS segura
- [ ] Executar script de criação
- [ ] Aguardar RDS ficar disponível (10 min)
- [ ] Fazer backup Neon: `pg_dump > backup.sql`
- [ ] Executar script de migração
- [ ] Validar dados: `SELECT COUNT(*) FROM drivers;`

### FASE 4: S3 + Redis + SQS (Colaborativo)

**Kiro faz:**
- [x] Gerar scripts de criação
- [ ] Gerar código de integração S3 no backend

**Você faz:**
- [ ] Executar scripts
- [ ] Salvar endpoints/URLs
- [ ] Validar recursos criados

### FASE 5: Docker + ECR (Colaborativo)

**Kiro faz:**
- [x] Criar Dockerfile otimizado
- [ ] Gerar script de build e push
- [ ] Criar docker-compose para testes locais

**Você faz:**
- [ ] Testar build local: `docker build -t kaviar .`
- [ ] Fazer login ECR
- [ ] Executar push para ECR
- [ ] Validar imagem no AWS Console

### FASE 6: ECS + ALB (Colaborativo)

**Kiro faz:**
- [x] Gerar Task Definition JSON
- [x] Gerar scripts de criação ECS/ALB
- [ ] Gerar script de deploy

**Você faz:**
- [ ] Executar scripts
- [ ] Aguardar service ficar estável (5 min)
- [ ] Testar: `curl http://$ALB_DNS/api/health`
- [ ] Validar logs CloudWatch

### FASE 7: Frontend (Colaborativo)

**Kiro faz:**
- [ ] Atualizar .env.production com ALB_DNS
- [ ] Gerar script de build e upload S3
- [ ] Gerar script CloudFront (opcional)

**Você faz:**
- [ ] Executar build: `npm run build`
- [ ] Executar upload S3
- [ ] Testar frontend: `http://bucket.s3-website...`

### FASE 8: Cutover (Você)

- [ ] Validar todos os endpoints AWS
- [ ] Atualizar DNS (api.kaviar.com → ALB)
- [ ] Monitorar por 24h
- [ ] Suspender Render (não deletar)
- [ ] Após 7 dias: deletar Render

---

## 🛠️ FERRAMENTAS QUE VOCÊ PRECISA

### Instaladas Localmente
```bash
✓ AWS CLI (aws --version)
✓ Docker (docker --version)
✓ Node.js 18+ (node --version)
✓ PostgreSQL client (psql --version)
✓ jq (para parsing JSON)
✓ curl (para testes HTTP)
```

### Acessos Necessários
```bash
✓ Conta AWS com billing configurado
✓ Acesso ao Neon (para backup)
✓ Acesso ao Render (para desativar)
✓ Acesso ao DNS (Route 53 ou externo)
✓ Acesso ao GitHub (para CI/CD futuro)
```

---

## 💡 DICAS PARA SUCESSO

### Para Você

**1. Trabalhe em Etapas**
```bash
# Não tente fazer tudo de uma vez
# Valide cada fase antes de prosseguir
✓ Fase 1 → Validar → Fase 2 → Validar → ...
```

**2. Salve Todos os IDs**
```bash
# Sempre salve outputs em aws-resources.env
echo "VPC_ID=vpc-123456" >> aws-resources.env
echo "RDS_ENDPOINT=xyz.rds.amazonaws.com" >> aws-resources.env
```

**3. Teste Localmente Primeiro**
```bash
# Antes de deploy AWS, teste local:
docker-compose up  # Testar containers
npm run build      # Testar build frontend
```

**4. Mantenha Backup**
```bash
# Sempre faça backup antes de migrar:
pg_dump > backup-$(date +%Y%m%d).sql
aws s3 cp backup.sql s3://kaviar-backups/
```

**5. Monitore Custos**
```bash
# Configure billing alerts:
- $50 (warning)
- $100 (alert)
- $150 (critical)
```

### Para Mim (Kiro)

**1. Gerar Scripts Idempotentes**
```bash
# Scripts devem ser seguros para re-executar
# Usar --query para capturar IDs
# Adicionar validações antes de criar
```

**2. Documentar Cada Passo**
```bash
# Sempre explicar o que cada comando faz
# Incluir outputs esperados
# Adicionar troubleshooting
```

**3. Priorizar Segurança**
```bash
# Nunca hardcodar credenciais
# Usar Secrets Manager
# Configurar Security Groups restritivos
```

---

## 🚨 QUANDO ME CHAMAR

### Situações Ideais para Pedir Ajuda

```bash
✓ "Kiro, gere script para criar RDS com PostGIS"
✓ "Kiro, crie Dockerfile otimizado para o backend"
✓ "Kiro, implemente integração S3 para uploads"
✓ "Kiro, gere Task Definition ECS com todas as envs"
✓ "Kiro, crie script de validação pós-deploy"
✓ "Kiro, erro X ao executar comando Y, como resolver?"
✓ "Kiro, gere CI/CD pipeline GitHub Actions"
```

### O Que Não Posso Fazer

```bash
✗ Executar comandos AWS (preciso de suas credenciais)
✗ Acessar AWS Console (você precisa fazer)
✗ Fazer backup do Neon (preciso de acesso)
✗ Atualizar DNS (você precisa de acesso)
✗ Validar custos reais (você vê no billing)
```

---

## 📞 PRÓXIMOS PASSOS IMEDIATOS

### Agora (5 minutos)
```bash
1. Você: Criar conta AWS (se não tiver)
2. Você: aws configure
3. Você: aws sts get-caller-identity
4. Você: "Kiro, estou pronto, vamos começar pela VPC"
```

### Depois (Iterativo)
```bash
Loop:
  1. Você pede: "Kiro, próxima fase"
  2. Eu gero: Scripts + documentação
  3. Você executa: Comandos
  4. Você valida: Recursos criados
  5. Você reporta: "Fase X concluída, VPC_ID=vpc-123"
  6. Repeat
```

---

**Resumo:** Eu gero todos os scripts e código. Você executa comandos e valida resultados. Trabalhamos juntos iterativamente até migração completa! 🚀

**Pronto para começar?** Me avise quando tiver AWS CLI configurado e podemos iniciar pela Fase 1 (VPC).
