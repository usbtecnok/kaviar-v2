# CI/CD - GitHub Actions

## Workflows Configurados

### 1. Backend Deploy (`deploy-backend.yml`)

**Trigger**: Push em `main` com mudanças em `backend/**`

**Passos**:
1. Build Docker image
2. Push para ECR (latest + SHA)
3. Force new deployment no ECS
4. Aguarda estabilização

**Tempo**: ~5-7 minutos

### 2. Frontend Deploy (`deploy-frontend.yml`)

**Trigger**: Push em `main` com mudanças em `frontend-app/**`

**Passos**:
1. Build com Vite
2. Upload para S3
3. Invalidação CloudFront

**Tempo**: ~2-3 minutos

## Configuração de Secrets

No GitHub, adicione em **Settings → Secrets and variables → Actions**:

```
AWS_ACCESS_KEY_ID: AKIA...
AWS_SECRET_ACCESS_KEY: ...
```

### Criar IAM User para CI/CD

```bash
# 1. Criar user
aws iam create-user --user-name github-actions-kaviar

# 2. Criar policy
cat > /tmp/github-policy.json <<'JSON'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ecs:UpdateService",
        "ecs:DescribeServices"
      ],
      "Resource": "arn:aws:ecs:us-east-2:847895361928:service/kaviar-cluster/kaviar-backend-service"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::kaviar-frontend-847895361928",
        "arn:aws:s3:::kaviar-frontend-847895361928/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateInvalidation"
      ],
      "Resource": "arn:aws:cloudfront::847895361928:distribution/E30XJMSBHGZAGN"
    }
  ]
}
JSON

aws iam create-policy \
  --policy-name GitHubActionsKaviarPolicy \
  --policy-document file:///tmp/github-policy.json

# 3. Attach policy
aws iam attach-user-policy \
  --user-name github-actions-kaviar \
  --policy-arn arn:aws:iam::847895361928:policy/GitHubActionsKaviarPolicy

# 4. Create access key
aws iam create-access-key --user-name github-actions-kaviar
```

Copie o `AccessKeyId` e `SecretAccessKey` e adicione nos secrets do GitHub.

## Uso

### Deploy automático

```bash
# Backend
git add backend/
git commit -m "feat: nova feature"
git push origin main
# → GitHub Actions faz deploy automaticamente

# Frontend
git add frontend-app/
git commit -m "feat: nova tela"
git push origin main
# → GitHub Actions faz deploy automaticamente
```

### Deploy manual (fallback)

```bash
# Backend
cd backend
docker build -t kaviar-backend:manual .
docker tag kaviar-backend:manual 847895361928.dkr.ecr.us-east-2.amazonaws.com/kaviar-backend:manual
docker push 847895361928.dkr.ecr.us-east-2.amazonaws.com/kaviar-backend:manual
aws ecs update-service --cluster kaviar-cluster --service kaviar-backend-service --force-new-deployment --region us-east-2

# Frontend
cd frontend-app
npm run build
aws s3 sync dist/ s3://kaviar-frontend-847895361928/ --exclude "index.html"
aws s3 cp dist/index.html s3://kaviar-frontend-847895361928/index.html --cache-control "no-cache"
aws cloudfront create-invalidation --distribution-id E30XJMSBHGZAGN --paths "/*" --region us-east-2
```

## Monitoramento

Ver logs do workflow:
- GitHub → Actions → Deploy Backend/Frontend

Ver logs da aplicação:
```bash
aws logs tail /ecs/kaviar-backend --follow --region us-east-2
```

## Rollback

```bash
# Voltar para versão anterior
aws ecs update-service \
  --cluster kaviar-cluster \
  --service kaviar-backend-service \
  --task-definition kaviar-backend:5 \
  --region us-east-2
```

## Segurança

✅ Secrets no GitHub (não no código)
✅ IAM User com permissões mínimas
✅ Deploy apenas de branch main
✅ Logs de todas as execuções
