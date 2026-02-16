# Backend Deployment Steps - Admin Presign Feature

## ⚠️ IMPORTANTE: Adicionar variável de ambiente no ECS

Antes de fazer o deploy do backend, adicionar no ECS Task Definition:

```bash
FEATURE_ADMIN_PRESIGN=true
S3_UPLOADS_BUCKET=kaviar-uploads-847895361928
```

## Comandos de Deploy

```bash
cd ~/kaviar/backend

# 1. Build
npm run build

# 2. Deploy (assumindo que existe script de deploy)
# Verificar qual script usar:
ls -la scripts/deploy*.sh

# OU deploy manual via Docker/ECS
# (ajustar conforme processo atual)
```

## Verificação Pós-Deploy

### 1. Testar endpoint diretamente
```bash
# Obter token admin
TOKEN="<seu_admin_token>"

# Testar presign endpoint
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.kaviar.com.br/api/admin/presign?key=certidoes/1771203253639-782641575.jpeg"

# Resposta esperada:
# {"success":true,"url":"https://kaviar-uploads-847895361928.s3.us-east-2.amazonaws.com/..."}
```

### 2. Testar no Admin UI
1. Login: https://kaviar.com.br/admin/login
2. Navegar: /admin/drivers/<id>
3. Clicar "Ver Documento"
4. DevTools → Network:
   - Request: `GET /api/admin/presign?key=certidoes/...`
   - Status: 200
   - Response: `{ success: true, url: "..." }`
5. Nova aba deve abrir com imagem do S3

### 3. Verificar logs
```bash
# Verificar se feature flag está ativa
grep "FEATURE_ADMIN_PRESIGN" /path/to/logs

# Verificar requests
grep "admin-presign" /path/to/logs
```

## Rollback

### Opção 1: Desabilitar feature flag
```bash
# No ECS Task Definition, mudar:
FEATURE_ADMIN_PRESIGN=false

# Redeploy backend
# Rota retornará 404 automaticamente
```

### Opção 2: Reverter código
```bash
cd ~/kaviar
git revert 472791e
git push origin main
# Redeploy backend e frontend
```

## Status Atual

✅ Frontend deployed (CloudFront invalidation: I3ZUPXPJA3W3ZVAGUZD339BF7H)
⏳ Backend pending deployment (precisa adicionar env vars + deploy)

## Arquivos Modificados

**Backend:**
- `backend/src/routes/admin-presign.ts` (novo)
- `backend/src/app.ts` (1 import + 1 linha)

**Frontend:**
- `frontend-app/src/pages/admin/DriverDetail.jsx`
- `frontend-app/src/pages/admin/DriverApproval.jsx`

**Commit:** 472791e
