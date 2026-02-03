# CORS Fix - CloudFront Origin

**Data:** 03/02/2026 20:59 BRT  
**Commit:** 675525d  
**Status:** ✅ Código corrigido (aguardando deploy)

---

## 🐛 Problema

**Sintoma:**
- "Erro de conexão" em "Esqueci minha senha" (frontend)
- POST /api/admin/auth/forgot-password funciona via curl ✅
- OPTIONS retorna 204, mas SEM `Access-Control-Allow-Origin` ❌

**Causa:**
- CloudFront origin `https://d29p7cirgjqbxl.cloudfront.net` não estava no whitelist CORS
- Navegador bloqueia preflight OPTIONS sem header correto

---

## ✅ Solução Aplicada

**Arquivo:** `backend/src/app.ts` (linha 61)

**Mudança:**
```typescript
const allowedOrigins = [
  'https://app.kaviar.com.br',
  'https://kaviar.com.br',
  'https://www.kaviar.com.br',
  'https://d29p7cirgjqbxl.cloudfront.net', // ✅ ADICIONADO
  'http://localhost:5173'
];
```

**Comportamento:**
- OPTIONS agora retorna `Access-Control-Allow-Origin: https://d29p7cirgjqbxl.cloudfront.net`
- POST funciona sem "Erro de conexão"
- Mantém `credentials: true` com whitelist explícito (não usa `*`)

---

## 🚀 Deploy Necessário

**Backend:**
```bash
cd /home/goes/kaviar/backend
npm run build
pm2 restart kaviar-api
# OU
systemctl restart kaviar-api
# OU
kill -HUP <PID>
```

**Validação:**
```bash
curl -i -X OPTIONS https://api.kaviar.com.br/api/admin/auth/forgot-password \
  -H "Origin: https://d29p7cirgjqbxl.cloudfront.net" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type"
```

**Esperado:**
```
HTTP/2 204
access-control-allow-origin: https://d29p7cirgjqbxl.cloudfront.net  ✅
access-control-allow-credentials: true
access-control-allow-methods: GET,POST,PUT,PATCH,DELETE,OPTIONS
access-control-allow-headers: Content-Type,Authorization
```

---

## 🧪 Teste no Navegador

**URL:**
```
https://d29p7cirgjqbxl.cloudfront.net/admin/forgot-password
```

**Passos:**
1. Abrir DevTools → Network
2. Inserir email e clicar "Enviar"
3. Verificar:
   - ✅ OPTIONS retorna 204 com `access-control-allow-origin`
   - ✅ POST retorna 200 (ou 404 se email não existe)
   - ❌ Não aparece "Erro de conexão"

---

## 📝 Commit

```
675525d - fix: add CloudFront origin to CORS whitelist
```

**Mudanças:**
- 1 arquivo modificado
- 1 linha adicionada
- 0 linhas removidas

---

## ✅ Checklist

- [x] Código corrigido
- [x] Commit feito
- [x] Push feito
- [x] Build executado
- [ ] Backend reiniciado (aguardando)
- [ ] Validação curl (aguardando)
- [ ] Teste no navegador (aguardando)

---

**Próximo passo:** Reiniciar backend e validar

---

**Versão:** 1.0  
**Preparado por:** Kiro (AWS AI Assistant)  
**Data:** 03/02/2026 20:59 BRT
