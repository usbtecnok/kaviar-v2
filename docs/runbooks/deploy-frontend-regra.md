# Regra Operacional — Deploy Frontend

**Data:** 2026-06-04
**Decisão:** Frontend publicado exclusivamente via CI/CD (GitHub Actions).

## Fluxo padrão (frontend)

1. Fazer commit das alterações em `frontend-app/`
2. Push para `origin/main`
3. Aguardar GitHub Actions concluir deploy (S3 sync + CloudFront invalidation)
4. Validar:
   - `app.kaviar.com.br` HTTP 200
   - `kaviar.com.br` HTTP 200
   - Assets JS referenciados retornando HTTP 200 com tamanho real (não 1626 bytes)
   - `/admin/manager-team` abrindo
   - Backend health OK

## Proibido em operação normal

- **NÃO** fazer `aws s3 sync --delete` manual do frontend enquanto CI/CD está ativo
- Isso causa race condition: CI/CD e deploy manual geram hashes diferentes, deletando assets um do outro

## Deploy manual de frontend — apenas emergência

Condições para deploy manual:
1. Confirmar que CI/CD não está rodando
2. Fazer sync completo: `aws s3 sync dist/ s3://kaviar-frontend-847895361928/ --delete`
3. Forçar upload do `index.html`: `aws s3 cp dist/index.html s3://kaviar-frontend-847895361928/index.html --content-type text/html --cache-control no-cache`
4. Invalidar CloudFront: `aws cloudfront create-invalidation --distribution-id E30XJMSBHGZAGN --paths "/*"`
5. Validar que assets referenciados existem e retornam tamanho correto

## Backend

Deploy do backend segue fluxo normal (CI/CD via push to main → ECR → ECS force-new-deployment).

## Causa da decisão

Em 2026-06-04 houve 3 ocorrências de tela branca causadas por:
- `s3 sync` parcial que não re-uploadou `index.html`
- Race condition entre deploy manual e CI/CD deletando assets um do outro
- `index.html` referenciando bundles que já haviam sido deletados
