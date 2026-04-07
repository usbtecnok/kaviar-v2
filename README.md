# KAVIAR

Plataforma de mobilidade urbana comunitária — backend API, admin dashboard e app mobile.

## Estrutura

```
backend/           → API Node.js + TypeScript + Prisma + PostgreSQL
frontend-app/      → Admin dashboard (React + Vite + MUI)
app/               → App mobile motorista/passageiro (Expo/React Native)
src/               → Código compartilhado do app mobile
scripts/           → Scripts operacionais organizados por categoria
  deploy/          → Deploy ECS, S3, CloudFront
  validate/        → Validações de ambiente e funcionalidade
  test/            → Testes de integração e E2E
  seed/            → Seeds de banco
  migrate/         → Migrações manuais
  infra/           → Provisionamento AWS
  utils/           → Utilitários (tokens, setup, build)
docs/              → Documentação organizada
  aws/             → Infra e migrações AWS
  runbooks/        → Runbooks operacionais
  investidores/    → Demo, apresentações, investor docs
  archive/         → Histórico técnico (fixes, deploys, análises, planos)
infra/aws/         → Scripts de provisionamento AWS (VPC, RDS, ECS, S3, HTTPS)
data/              → GeoJSON de bairros (RJ)
```

## Setup local

```bash
# Node 20
nvm use

# Backend
cd backend
cp .env.example .env   # configurar DATABASE_URL e JWT_SECRET
npm install
npx prisma generate
npx prisma db push     # ou npx prisma migrate deploy
npm run dev

# Frontend admin
cd frontend-app
npm install
npm run dev            # http://localhost:5173
```

## Deploy

**Backend** — ECS (us-east-2):
```bash
cd backend
npm run build
docker build -t kaviar-backend .
# Push para ECR + force-new-deployment no ECS
```

**Frontend** — S3 + CloudFront:
```bash
cd frontend-app
npm run build
aws s3 sync dist s3://kaviar-frontend-847895361928/ --delete
aws cloudfront create-invalidation --distribution-id E30XJMSBHGZAGN --paths "/*"
```

## Roles

| Role | Acesso |
|------|--------|
| `SUPER_ADMIN` | Acesso total |
| `FINANCE` | Pagamentos de indicação |
| `ANGEL_VIEWER` | Leitura (investidores) |
| `LEAD_AGENT` | Captação de leads |
| `OPERATOR` | Operações (feature flags, virtual fence) |

## Stack

- **Backend**: Node.js 20, TypeScript, Express, Prisma, PostgreSQL (RDS)
- **Frontend admin**: React, Vite, Material UI
- **App mobile**: Expo, React Native
- **Infra**: AWS (ECS Fargate, RDS, S3, CloudFront, ALB)
- **CI/CD**: GitHub Actions → ECR → ECS
