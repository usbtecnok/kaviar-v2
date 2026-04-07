# Admin Presign Feature - Deployment Summary

## Objetivo
Corrigir botão "Ver Documento" no Admin que estava abrindo URLs diretas (404) para arquivos S3.

## Implementação

### Backend (Isolado, Zero Impacto)
- **Arquivo novo**: `backend/src/routes/admin-presign.ts`
- **Rota**: `GET /api/admin/presign?key=certidoes/<arquivo>`
- **Proteção**: `authenticateAdmin` middleware (mesmo usado em todas rotas /api/admin/*)
- **Feature Flag**: `FEATURE_ADMIN_PRESIGN=true` (em .env)
- **Validações**:
  - Key obrigatória e string
  - Deve começar com `certidoes/`
  - Proibido `..` (path traversal)
- **Resposta**: `{ success: true, url: <presigned_url> }` (expira em 300s)
- **S3**: Bucket `kaviar-uploads-847895361928`, região `us-east-2`

### Frontend
- **Arquivos modificados**:
  - `frontend-app/src/pages/admin/DriverDetail.jsx`
  - `frontend-app/src/pages/admin/DriverApproval.jsx`
- **Mudança**: Substituir `href` direto por:
  1. `api.get('/api/admin/presign?key=...')`
  2. `window.open(url, '_blank', 'noopener,noreferrer')`

### Registro em app.ts
```typescript
import adminPresignRoutes from './routes/admin-presign';
app.use('/api/admin', adminPresignRoutes);
```

## Variáveis de Ambiente (.env)
```bash
FEATURE_ADMIN_PRESIGN=true
S3_UPLOADS_BUCKET=kaviar-uploads-847895361928
```

## Rollback Instantâneo
1. **Desabilitar feature**: `FEATURE_ADMIN_PRESIGN=false` (rota retorna 404)
2. **Reverter frontend**: `git revert 472791e` (volta para links diretos)

## Validação
1. Login admin: `/admin/login`
2. Acessar: `/admin/drivers/<id>`
3. Clicar "Ver Documento" (👁️)
4. DevTools → Network:
   - Request: `GET /api/admin/presign?key=certidoes/...`
   - Headers: `Authorization: Bearer <admin_token>`
   - Response: `{ success: true, url: "https://..." }`
   - Status: 200
5. Nova aba abre com imagem do S3 (presigned URL válida por 5min)

## Segurança
- ✅ Admin auth obrigatória
- ✅ Validação de path (apenas certidoes/*)
- ✅ Path traversal bloqueado (..)
- ✅ Feature flag para kill switch
- ✅ URLs expiram em 5 minutos
- ✅ Zero modificação em endpoints existentes

## Commit
```
472791e - feat(admin): add presigned URL endpoint for S3 documents (feature flag)
```

## Deploy
- Backend: Requer rebuild + redeploy (ECS)
- Frontend: Requer build + deploy (S3/CloudFront)
- Env vars: Adicionar `FEATURE_ADMIN_PRESIGN=true` no ECS Task Definition

## Risco
**MÍNIMO** - Rota isolada, feature flag, zero impacto em código existente.
