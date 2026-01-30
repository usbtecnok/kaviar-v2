# 🚀 KAVIAR - COMANDOS DE DEPLOY PARA AWS

## ⚡ DEPLOY AUTOMÁTICO (RECOMENDADO)

Execute este único comando para fazer deploy completo:

```bash
cd /home/goes/kaviar
./deploy-aws-complete.sh
```

Este script irá:
1. ✅ Verificar ambiente e configurações
2. ✅ Sincronizar schema do banco (Prisma DB Push)
3. ✅ Executar migrations SQL customizadas
4. ✅ Popular banco com dados iniciais (Admin + Dona Maria + Motoristas)
5. ✅ Fazer commit e push para GitHub
6. ✅ Aguardar deploy automático via GitHub Actions

---

## 🔧 DEPLOY MANUAL (PASSO A PASSO)

Se preferir executar manualmente:

### 1. Sincronizar Banco de Dados

```bash
cd /home/goes/kaviar/backend

# Gerar Prisma Client
npx prisma generate

# Aplicar schema no banco (reset + sync)
npx prisma db push --accept-data-loss
```

### 2. Executar Migrations SQL Customizadas

```bash
# Migration 1: Sistema de Reputação
psql "$DATABASE_URL" -f prisma/migrations/20260129_community_reputation_system.sql

# Migration 2: Functions e Triggers
psql "$DATABASE_URL" -f prisma/migrations/20260129_reputation_functions.sql
```

### 3. Popular Banco com Dados Iniciais

```bash
# Seed 1: Admin padrão e roles
npm run db:seed

# Seed 2: Líderes comunitários e motoristas
node scripts/seed_reputation_data.js
```

### 4. Commit e Push para GitHub

```bash
cd /home/goes/kaviar

git add .

git commit -m "feat: Sistema de Reputação Comunitária Imutável (Ledger) e Badges de Segurança

- Implementado ledger imutável com hash SHA-256
- Criado 4 níveis de reputação (NEW, ACTIVE, VERIFIED, GUARDIAN)
- Sistema de validação por lideranças comunitárias
- Badges visuais no frontend
- Painéis admin e líder
- Cálculo automático via triggers PostgreSQL
- Performance < 50ms com cache em stats table
- Documentação completa em docs/COMMUNITY_REPUTATION_SYSTEM.md"

git push origin main
```

### 5. Acompanhar Deploy

Acesse: https://github.com/usbtecnok/kaviar-v2/actions

---

## 📊 INFRAESTRUTURA AWS

### Backend (ECS Fargate)
- **Região**: us-east-2 (Ohio)
- **Cluster**: kaviar-cluster
- **Service**: kaviar-backend-service
- **Container Registry**: ECR (847895361928.dkr.ecr.us-east-2.amazonaws.com)

### Frontend (S3 + CloudFront)
- **Região**: us-east-2 (Ohio)
- **Bucket S3**: kaviar-frontend-847895361928
- **CloudFront ID**: E30XJMSBHGZAGN

### Database (Neon PostgreSQL)
- **Região**: us-east-1 (Virginia)
- **Host**: ep-wispy-thunder-ad850l5j-pooler.c-2.us-east-1.aws.neon.tech
- **Database**: neondb
- **Connection**: Pooler mode (pgbouncer)

---

## 🎯 ENDPOINTS

- **Backend API**: https://api.kaviar.com.br
- **Frontend**: https://kaviar.com.br
- **Admin Panel**: https://kaviar.com.br/admin

---

## 👤 CREDENCIAIS PADRÃO

**Admin:**
- Email: `admin@kaviar.com`
- Senha: `admin123`

**Líderes Comunitários (Seed):**
- Dona Maria Silva (Paraisópolis)
- Sr. João Santos (Heliópolis)

**Motoristas (Seed):**
- Carlos Novato (NEW - 2 corridas)
- Ana Ativa (ACTIVE - 15 corridas)
- Pedro Experiente (ACTIVE - 30 corridas)
- Maria Verificada (VERIFIED - 60 corridas)
- José Guardião (GUARDIAN - 250 corridas)

---

## 🔍 VERIFICAR STATUS DO DEPLOY

### GitHub Actions
```bash
# Abrir no navegador
xdg-open https://github.com/usbtecnok/kaviar-v2/actions
```

### Backend (ECS)
```bash
aws ecs describe-services \
  --cluster kaviar-cluster \
  --services kaviar-backend-service \
  --region us-east-2 \
  --query 'services[0].deployments[0].status'
```

### Frontend (CloudFront)
```bash
aws cloudfront get-distribution \
  --id E30XJMSBHGZAGN \
  --region us-east-2 \
  --query 'Distribution.Status'
```

---

## 🧪 TESTAR APÓS DEPLOY

### 1. Testar Backend API
```bash
curl https://api.kaviar.com.br/health
```

### 2. Testar Sistema de Reputação
```bash
# Consultar reputação de motorista
curl https://api.kaviar.com.br/api/reputation/{driverId}/{communityId}

# Listar líderes comunitários
curl https://api.kaviar.com.br/api/reputation/admin/leaders/{communityId}
```

### 3. Testar Frontend
```bash
# Abrir no navegador
xdg-open https://kaviar.com.br/admin
```

---

## 🐛 TROUBLESHOOTING

### Erro: "DATABASE_URL not found"
```bash
# Verificar .env
cat backend/.env | grep DATABASE_URL

# Exportar manualmente
export DATABASE_URL="postgresql://neondb_owner:npg_2xbfMWRF6hrO@ep-wispy-thunder-ad850l5j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&connection_limit=1"
```

### Erro: "psql command not found"
```bash
# Instalar PostgreSQL client
sudo apt-get update
sudo apt-get install postgresql-client
```

### Erro: "Permission denied" no script
```bash
chmod +x deploy-aws-complete.sh
```

### Deploy travado no GitHub Actions
```bash
# Verificar logs
gh run list --limit 1
gh run view --log
```

---

## 📚 DOCUMENTAÇÃO

- **Sistema de Reputação**: `docs/COMMUNITY_REPUTATION_SYSTEM.md`
- **Resumo Task 20**: `TASK_20_IMPLEMENTATION_SUMMARY.md`
- **GitHub Actions**: `.github/workflows/`

---

## ⏱️ TEMPO ESTIMADO

- **DB Push + Seed**: 2-3 minutos
- **Git Push**: 10-30 segundos
- **GitHub Actions Deploy**: 5-10 minutos
- **Total**: ~10-15 minutos

---

## 🎉 SUCESSO!

Após o deploy, você terá:

✅ Banco de dados sincronizado com schema completo
✅ Sistema de Reputação Comunitária funcionando
✅ Ledger imutável com hash SHA-256
✅ 4 níveis de badges (NEW, ACTIVE, VERIFIED, GUARDIAN)
✅ Líderes comunitários cadastrados
✅ Motoristas de exemplo com diferentes reputações
✅ Backend rodando no ECS Fargate
✅ Frontend no S3 + CloudFront
✅ Deploy automático configurado

**KAVIAR BRILHANDO NA AMAZON! 🚀**
