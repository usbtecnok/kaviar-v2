# STATE OF INVESTOR/ANGEL FRONTEND - DIAGNÓSTICO COMPLETO

**Data:** 2026-02-04  
**Status:** ❌ INCONSISTÊNCIA CRÍTICA DETECTADA

---

## 1️⃣ EXISTE FRONTEND DE INVESTIDOR SEPARADO?

### ❌ **NÃO EXISTE**

**Evidências:**
- ✅ Nenhuma rota `/investor`, `/investidores`, `/angel`, `/readonly`, `/pitch`, `/presentation`
- ✅ Nenhum componente `InvestorApp`, `InvestorLogin`, `InvestorDashboard`, `PitchDeck`
- ✅ Nenhuma variável de ambiente `VITE_*INVESTOR*` ou `INVESTOR_URL`
- ✅ Nenhum subdomínio ou URL separada

**O que existe:**
- Arquivo `src/demo/demoMode.ts` com lógica de detecção de `INVESTOR_VIEW`
- Componente `DemoBadge.tsx` que mostra "Visualização Investidor" quando role = `INVESTOR_VIEW`
- **Mas não há UI/rotas específicas para investidores**

### 🎯 Conclusão:
Investidores/Angels usam **o mesmo frontend Admin** (`/admin/*`) com restrições aplicadas no backend via middleware.

---

## 2️⃣ BACKEND: AUTENTICAÇÃO E MIDDLEWARE

### Endpoint de Login
**URL:** `POST /api/admin/auth/login`
- ✅ Usado por TODOS os perfis admin (SUPER_ADMIN, ANGEL_VIEWER, INVESTOR_VIEW)
- ✅ Retorna JWT com role no payload
- ✅ CORS funcionando (testado)

### Middleware `investorView`
**Localização:** `backend/src/middleware/investorView.ts`  
**Montado em:** `/api` (app.ts linha 140)

**Role aceita:** ⚠️ **APENAS `INVESTOR_VIEW`**
```typescript
if (user.role !== 'INVESTOR_VIEW') {
  return next(); // Não é investidor, permitir
}
```

**Paths liberados (públicos):**
- `/admin/auth/login`
- `/admin/auth/forgot-password`
- `/admin/auth/reset-password`

**Comportamento:**
- ✅ Bloqueia POST/PUT/PATCH/DELETE para `INVESTOR_VIEW`
- ✅ Permite GET (exceto endpoints sensíveis)
- ✅ Adiciona headers `X-Demo-Mode: true` e `X-Investor-View: true`

### ⚠️ PROBLEMA CRÍTICO: ANGEL_VIEWER NÃO É TRATADO

**Middleware `allowReadAccess`** (auth.ts linha 104):
```typescript
export const allowReadAccess = requireRole(['SUPER_ADMIN', 'ANGEL_VIEWER']);
```

**Inconsistência:**
- `investorView` middleware: aceita apenas `INVESTOR_VIEW`
- `allowReadAccess` middleware: aceita `SUPER_ADMIN` e `ANGEL_VIEWER`
- **`ANGEL_VIEWER` não passa pelo `investorView`, mas também não tem permissões de escrita**

---

## 3️⃣ CONTAS NO BANCO

### INVESTOR_VIEW (10 contas)
```
investor01@kaviar.com | active:true | mustChange:true
investor02@kaviar.com | active:true | mustChange:true
investor03@kaviar.com | active:true | mustChange:true
investor04@kaviar.com | active:true | mustChange:true
investor05@kaviar.com | active:true | mustChange:true
investor06@kaviar.com | active:true | mustChange:true
investor07@kaviar.com | active:true | mustChange:true
investor08@kaviar.com | active:true | mustChange:true
investor09@kaviar.com | active:true | mustChange:true
investor10@kaviar.com | active:true | mustChange:true
```

### ANGEL_VIEWER (10 contas)
```
angel1@kaviar.com | active:true | mustChange:true
angel2@kaviar.com | active:true | mustChange:true
angel3@kaviar.com | active:true | mustChange:true
angel4@kaviar.com | active:true | mustChange:true
angel5@kaviar.com | active:true | mustChange:true
angel6@kaviar.com | active:true | mustChange:true
angel7@kaviar.com | active:true | mustChange:true
angel8@kaviar.com | active:true | mustChange:true
angel9@kaviar.com | active:true | mustChange:true
angel10@kaviar.com | active:true | mustChange:true
```

### Estado das Senhas
- ✅ Todas as contas têm hash bcrypt (senhas não recuperáveis)
- ✅ `must_change_password: true` (forçar troca no primeiro acesso)
- ✅ `is_active: true`

### Fluxo de Forgot/Reset Password
- ✅ **Existe e funciona** para ambos os perfis
- ✅ Endpoint: `POST /api/admin/auth/forgot-password`
- ✅ Testado: HTTP 200 + mensagem neutra
- ✅ Rate limit: 3/hora

---

## 4️⃣ TESTES E2E - RESULTADOS

### ✅ Teste 1: Login Endpoint
```bash
POST /api/admin/auth/login
Origin: https://app.kaviar.com.br
Body: {"email":"investor01@kaviar.com","password":"teste123"}

Resultado: HTTP 401 (senha incorreta, mas endpoint funciona)
CORS: ✅ access-control-allow-origin presente
Rate limit: ✅ 10/min
```

### ✅ Teste 2: Forgot Password
```bash
POST /api/admin/auth/forgot-password
Origin: https://app.kaviar.com.br
Body: {"email":"investor01@kaviar.com","userType":"admin"}

Resultado: HTTP 200
Response: {"success":true,"message":"Se o email existir..."}
CORS: ✅ OK
Rate limit: ✅ 3/hora
```

### ✅ Teste 3: Health Endpoint (público)
```bash
GET /api/health
Origin: https://app.kaviar.com.br

Resultado: HTTP 200
CORS: ✅ OK
Version: aed2730e40a9def3e4e1cd30fca07c5ea015bc7c
```

### ❌ Teste 4: Frontend Routes
```bash
URL: https://app.kaviar.com.br/admin/forgot-password

Resultado: NÃO EXISTE (rota não definida)
```

**Rotas existentes no frontend:**
- ✅ `/forgot-password` (raiz, não admin)
- ✅ `/admin/login`
- ✅ `/admin/change-password`
- ❌ `/admin/forgot-password` (NÃO EXISTE)

---

## 🚨 PROBLEMAS IDENTIFICADOS

### 1. Inconsistência de Roles
- **Backend:** Middleware `investorView` aceita apenas `INVESTOR_VIEW`
- **Backend:** Middleware `allowReadAccess` aceita `ANGEL_VIEWER`
- **Banco:** Existem 10 contas `ANGEL_VIEWER` + 10 `INVESTOR_VIEW`
- **Resultado:** `ANGEL_VIEWER` não é bloqueado pelo `investorView`, mas também não tem permissões claras

### 2. Rota de Forgot Password Inconsistente
- **Backend:** `/api/admin/auth/forgot-password` ✅ funciona
- **Frontend:** `/admin/forgot-password` ❌ não existe
- **Frontend:** `/forgot-password` ✅ existe (mas não é específica para admin)

### 3. Duplicação de Contas
- 20 contas read-only no total (10 INVESTOR + 10 ANGEL)
- Propósito não está claro
- Documentação menciona apenas INVESTOR_VIEW

### 4. Frontend Não Diferencia Perfis
- Não há UI específica para investidores/angels
- Apenas badge visual "Visualização Investidor"
- Usam mesma interface admin com restrições invisíveis

---

## ✅ O QUE FUNCIONA

1. ✅ Login via `/api/admin/auth/login` para todos os perfis
2. ✅ CORS correto em todos os endpoints
3. ✅ Forgot/Reset password funcionando
4. ✅ Middleware `investorView` bloqueia POST/PUT/PATCH/DELETE para `INVESTOR_VIEW`
5. ✅ Rate limiting ativo
6. ✅ Git SHA exposto no health endpoint

---

## 🎯 RECOMENDAÇÕES

### Opção A: Unificar em INVESTOR_VIEW (Recomendado)
1. Converter todas as 10 contas `ANGEL_VIEWER` → `INVESTOR_VIEW`
2. Deletar role `ANGEL_VIEWER` do código
3. Manter apenas `INVESTOR_VIEW` como role read-only
4. Atualizar documentação

### Opção B: Suportar Ambas as Roles
1. Atualizar `investorView` middleware para aceitar `['INVESTOR_VIEW', 'ANGEL_VIEWER']`
2. Documentar diferença entre as duas roles (se houver)
3. Manter 20 contas separadas

### Opção C: Criar Frontend Separado (Não Recomendado)
1. Criar `/investor/*` ou `/angel/*` routes
2. UI simplificada apenas com dashboards read-only
3. Muito trabalho para pouco benefício

### Fix Imediato: Rota Forgot Password
**Problema:** Link para `/admin/forgot-password` não existe no frontend

**Solução 1 (Mínima):** Adicionar rota no AdminApp.jsx:
```jsx
<Route path="/forgot-password" element={<ForgotPassword />} />
```

**Solução 2 (Correta):** Usar rota existente `/forgot-password` (raiz) e ajustar links

---

## 📊 RESUMO EXECUTIVO

| Item | Status | Ação Necessária |
|------|--------|-----------------|
| Frontend separado | ❌ Não existe | Nenhuma (usar admin) |
| Login funcionando | ✅ OK | Nenhuma |
| CORS | ✅ OK | Nenhuma |
| Forgot/Reset password | ✅ Backend OK, ❌ Rota frontend | Adicionar rota |
| Middleware investorView | ⚠️ Só INVESTOR_VIEW | Decidir sobre ANGEL_VIEWER |
| Contas duplicadas | ⚠️ 10+10 | Unificar ou documentar |
| Documentação | ⚠️ Desatualizada | Atualizar |

---

**Conclusão:** Sistema funcional mas com inconsistências de design. Investidores/Angels usam interface admin normal com restrições backend. Rota de forgot password precisa ser adicionada ao frontend admin.
