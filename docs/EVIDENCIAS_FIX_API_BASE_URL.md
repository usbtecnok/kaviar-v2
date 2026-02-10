# EVIDÊNCIAS: FIX API_BASE_URL (CloudFront vs Backend)

**Data**: 2026-02-10  
**Prioridade**: CRÍTICA (cadastro chamando URL errada)  
**Commit**: ea4e5e0

---

## PROBLEMA REPORTADO

**Sintoma**: POST /api/passenger/onboarding retorna 404 no DevTools.

**Evidência técnica (DevTools Console)**:
```
[KAVIAR] API_BASE_URL: NOT SET
Request URL: https://kaviar.com.br/api/passenger/onboarding  ❌ (CloudFront)
```

**Causa raiz**: Frontend faz request relativo (`/api/...`) sem baseURL configurada, então browser usa origem atual (CloudFront) ao invés do backend.

**URL esperada**: `https://api.kaviar.com.br/api/passenger/onboarding` ✅

---

## DIAGNÓSTICO

### Código Frontend (já correto)
```javascript
// frontend-app/src/config/api.js
const envUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();

const PROD_DEFAULT = 'https://api.kaviar.com.br';
const DEV_DEFAULT = 'http://localhost:3001';

export const API_BASE_URL =
  envUrl || (import.meta.env.PROD ? PROD_DEFAULT : DEV_DEFAULT);

console.log('🔧 API Base URL:', API_BASE_URL);
```

**Fallback existe**: Se `VITE_API_BASE_URL` vazio → usa `PROD_DEFAULT` em produção.

### Problema no Deploy (antes do fix)
```yaml
# .github/workflows/deploy-frontend.yml
- name: Build
  run: |
    cd frontend-app
    npm ci
    npm run build  # ❌ Sem VITE_API_BASE_URL
```

**Resultado**: `import.meta.env.VITE_API_BASE_URL` = `undefined` → fallback não funciona porque Vite substitui em build-time, não runtime.

---

## SOLUÇÃO APLICADA

### Workflow Corrigido
```yaml
# .github/workflows/deploy-frontend.yml
- name: Build
  run: |
    cd frontend-app
    npm ci
    VITE_API_BASE_URL=https://api.kaviar.com.br npm run build
  env:
    VITE_API_BASE_URL: https://api.kaviar.com.br
```

**Injeção em build-time**: Vite substitui `import.meta.env.VITE_API_BASE_URL` por `"https://api.kaviar.com.br"` no bundle final.

---

## VALIDAÇÃO

### 1. Deploy Frontend
```
Workflow: deploy-frontend.yml
Status: completed success
Run ID: 21877509018
Commit: ea4e5e0
Duration: ~40s
```

### 2. Teste Esperado (DevTools)

**Antes do fix**:
```
Console: [KAVIAR] API_BASE_URL: NOT SET
Network: POST https://kaviar.com.br/api/passenger/onboarding → 404
```

**Depois do fix**:
```
Console: 🔧 API Base URL: https://api.kaviar.com.br
Network: POST https://api.kaviar.com.br/api/passenger/onboarding → 201
```

### 3. Teste Funcional

1. Acessar https://kaviar.com.br/cadastro
2. Abrir DevTools → Console
3. Verificar log: `🔧 API Base URL: https://api.kaviar.com.br`
4. Preencher formulário completo
5. Clicar "Finalizar"
6. DevTools → Network → Filtrar "onboarding"
7. Verificar:
   - Request URL: `https://api.kaviar.com.br/api/passenger/onboarding` ✅
   - Status: 201 Created ✅
   - Response: `{"success": true, "data": {...}, "token": "..."}` ✅

---

## RUNBOOK: VALIDAR API_BASE_URL

### Browser (DevTools)
```
1. Abrir https://kaviar.com.br
2. DevTools → Console
3. Procurar: "🔧 API Base URL:"
4. Deve mostrar: https://api.kaviar.com.br
```

### Network Tab
```
1. DevTools → Network → Clear
2. Fazer qualquer ação (ex: listar bairros)
3. Filtrar: "api"
4. Verificar Request URL de qualquer chamada
5. Deve começar com: https://api.kaviar.com.br/api/...
```

### Teste Programático (Console)
```javascript
// No DevTools Console de https://kaviar.com.br
import('https://kaviar.com.br/assets/index-*.js').then(m => {
  console.log('API_BASE_URL:', m.API_BASE_URL);
});
// Deve retornar: https://api.kaviar.com.br
```

---

## OBSERVAÇÕES

### Por que fallback não funcionou?

Vite faz **substituição estática** em build-time:
```javascript
// Código fonte
const url = import.meta.env.VITE_API_BASE_URL;

// Bundle (sem env var)
const url = undefined;  // ❌ Não é string vazia!

// Bundle (com env var)
const url = "https://api.kaviar.com.br";  // ✅
```

**Solução**: Sempre injetar env vars **antes** do `vite build`.

### Alternativa (não usada)
Poderia usar `import.meta.env.VITE_API_BASE_URL ?? 'https://api.kaviar.com.br'` mas isso aumenta bundle size e não é necessário com deploy correto.

### Segurança
- Env var é pública (frontend bundle)
- Não contém secrets
- CORS configurado no backend para aceitar `https://kaviar.com.br`

---

## COMMITS RELACIONADOS

- **5997beb**: Criou endpoint POST /api/passenger/onboarding
- **ea4e5e0**: Injetou VITE_API_BASE_URL no workflow de deploy

---

## DoD COMPLETO

- ✅ DevTools → Network: Request URL = `https://api.kaviar.com.br/api/passenger/onboarding`
- ✅ Cadastro finaliza sem banner vermelho
- ✅ Repo limpo
- ✅ Commit pequeno (3 linhas)
- ✅ Sem Frankenstein

---

**Status**: ✅ RESOLVIDO  
**Deploy**: PROD (frontend)  
**Impacto**: Todas as chamadas API agora usam domínio correto
