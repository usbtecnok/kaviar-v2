# Fix Admin Scope Precedence - Bearer null

**Data:** 2026-02-16
**Objetivo:** Corrigir Admin "Ver documentos" enviando `Authorization: Bearer null`
**Escopo:** SOMENTE FRONTEND (não mexe em backend/WhatsApp/investidores)

## Problema
- Admin clicava "Ver documentos" → chamava `/api/admin/drivers/:id/secondary-base`
- Request enviava `Authorization: Bearer null` → 401 Unauthorized
- Tela não carregava (erro de autenticação)

## Causa Raiz
**Bug de precedência no `getTokenScope()`:**

```javascript
// ❌ ANTES (errado)
const getTokenScope = (url) => {
  if (url?.includes('/api/driver')) return 'driver';  // ⚠️ Match em /api/admin/drivers/
  if (url?.includes('/api/admin/')) return 'admin';
  return 'passenger';
};
```

**Problema:**
- URL: `/api/admin/drivers/123/secondary-base`
- Contém substring `/api/driver` → scope = `driver`
- Pegava `kaviar_driver_token` (null no contexto admin)
- Enviava `Authorization: Bearer null`

## Solução Mínima

**Arquivo:** `frontend-app/src/api/index.js`

### 1. Admin FIRST + match exato driver
```diff
 const getTokenScope = (url) => {
-  if (url?.includes('/api/driver')) return 'driver';
-  if (url?.includes('/api/admin/')) return 'admin';
+  if (url?.includes('/api/admin/')) return 'admin';
+  if (url?.includes('/api/driver/') || url?.includes('/api/drivers/')) return 'driver';
   return 'passenger';
 };
```

**Lógica:**
- ✅ Admin primeiro (maior precedência)
- ✅ Driver com `/` no final (match exato)
- ✅ `/api/admin/drivers/` → admin (correto)
- ✅ `/api/driver/` → driver (correto)
- ✅ `/api/drivers/` → driver (correto)

### 2. Nunca enviar Bearer null
```diff
 if (token) {
   config.headers.Authorization = `Bearer ${token}`;
   console.log('[API] ✅ Request:', ...);
 } else {
+  delete config.headers.Authorization;
   console.warn('[API] ⚠️ Request WITHOUT token:', ...);
 }
```

**Lógica:**
- ✅ Se token existe → adiciona header
- ✅ Se token null/undefined → remove header (não envia `Bearer null`)

## Build + Deploy

```bash
cd ~/kaviar
git add frontend-app/src/api/index.js
git commit -m "fix(frontend): admin scope precedence + avoid Bearer null"
git push origin main

cd ~/kaviar/frontend-app
npm ci
npm run build

cd ~/kaviar
./scripts/deploy-frontend-atomic.sh
```

## Validação

```bash
cd ~/kaviar
./validate-admin-scope-fix.sh
```

**Fluxo de teste:**
1. Login Admin → `/admin/drivers`
2. Clicar "Ver documentos"
3. DevTools > Network → request `/api/admin/drivers/:id/secondary-base`

**Checklist:**
- ✅ `Authorization: Bearer <jwt_admin_válido>`
- ✅ Status: 200 ou 404 (não 401)
- ✅ Console: `{ scope: 'admin', storageKey: 'kaviar_admin_token', hasToken: true }`
- ❌ NÃO pode: `Authorization: Bearer null`
- ❌ NÃO pode: `{ scope: 'driver' }`

## Antes vs Depois

### Antes (bug)
```
URL: /api/admin/drivers/123/secondary-base
getTokenScope() → 'driver' (❌ errado, match em substring)
Token: kaviar_driver_token → null
Header: Authorization: Bearer null
Status: 401 Unauthorized
```

### Depois (correto)
```
URL: /api/admin/drivers/123/secondary-base
getTokenScope() → 'admin' (✅ correto, admin first)
Token: kaviar_admin_token → <jwt_válido>
Header: Authorization: Bearer <jwt_válido>
Status: 200 OK
```

## Garantias
- ✅ Não mexe em backend
- ✅ Não afeta WhatsApp/Twilio
- ✅ Não afeta investidores
- ✅ Não afeta passageiro/motorista (quando logados)
- ✅ Fix de lógica de precedência (ordem importa)
- ✅ Previne `Bearer null` em qualquer contexto

## Evidências
- Arquivo: `frontend-app/src/api/index.js`
- Mudança 1: Admin scope FIRST (linha ~26)
- Mudança 2: `delete config.headers.Authorization` quando token null (linha ~60)
- Tipo: Fix de precedência + sanitização de header
