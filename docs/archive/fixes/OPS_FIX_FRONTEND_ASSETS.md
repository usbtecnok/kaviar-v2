# OPS_FIX_FRONTEND_ASSETS.md (FINAL)

**Data:** 2026-02-10  
**Sistema:** KAVIAR (Frontend) — https://kaviar.com.br  
**Infra:** CloudFront + S3 (origin via S3 website endpoint)

## 1) Incidente
O frontend falhou ao carregar o módulo principal `assets/index-*.js` com erro de MIME:
- Browser bloqueou módulo por `type MIME não permitido (text/html)`
- `NS_ERROR_CORRUPTED_CONTENT`
- Em alguns requests: `x-cache: Error from cloudfront`

## 2) Causa raiz (Root Cause)
Deploy inconsistente publicou `index.html` apontando para `assets/index-<hash>.js` **inexistente** (assets não subiram ou subiram depois).

Como o origin era **S3 Website Endpoint**, quando o objeto não existe ele retorna **HTML de erro**, fazendo o `.js` ser servido como `text/html` via CDN.

## 3) Correção imediata (Hotfix)
- Re-publicação consistente do build do frontend (dist completo) no bucket correto
- Invalidation CloudFront para remover cache ruim
- Validação objetiva via `curl` e `head-object`

## 4) Correção definitiva (Anti-Frankenstein)
### Deploy "atômico" (assets-first, index-last)
Workflow ajustado para garantir ordem:
1. Build
2. Upload de assets primeiro (exclui `index.html`)
3. Upload do `index.html` por último (cache-control no-cache)
4. Invalidation CloudFront

### Prevenção de deploy concorrente
Adicionado `concurrency` no GitHub Actions para impedir deploys concorrentes atropelarem a publicação.

## 5) Evidências objetivas (PROD)
- `index.html` referencia asset existente: `/assets/index-Dw4LLP3W.js`
- Headers do asset (PROD):
  - `HTTP/2 200`
  - `content-type: text/javascript`
  - `cache-control: public, max-age=31536000`

## 6) Status
✅ **RESOLVIDO** — Frontend consistente e pipeline protegido contra "Frankenstein".
