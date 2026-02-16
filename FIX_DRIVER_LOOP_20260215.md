# Fix Loop Motorista - Auth e Governance

**Data:** 2026-02-15
**Objetivo:** Corrigir loop de redirect na tela de documentos do motorista
**Escopo:** SOMENTE FRONTEND (não mexe em backend/WhatsApp/investidores)

## Problema
- Tela de documentos do motorista chamava `GET /api/governance/communities` (protegido, admin only)
- Retornava 401 porque token de motorista não tem permissão
- Interceptor redirecionava para `/login` causando loop
- API client estava usando token correto mas endpoint era proibido

## Causa Raiz
1. `Documents.jsx` chamava endpoint governance (admin only) desnecessariamente
2. Campo "Comunidade" é opcional mas tentava carregar lista de endpoint protegido
3. Interceptor não tinha proteção contra redirect em governance routes para não-admins

## Solução Mínima

### 1. Remover chamada proibida
**Arquivo:** `frontend-app/src/pages/driver/Documents.jsx`

```diff
  useEffect(() => {
    const token = localStorage.getItem('kaviar_driver_token');
    if (!token) {
      navigate('/motorista/login');
      return;
    }
    setAuthLoading(false);
-   loadCommunities();
+   // Comunidade é opcional - não precisa carregar
  }, [navigate]);

  const loadCommunities = async () => {
-   try {
-     const response = await api.get('/api/governance/communities');
-     if (response.data.success) {
-       setCommunities(response.data.data);
-     }
-   } catch (error) {
-     console.error('Erro ao carregar comunidades:', error);
-   }
+   // Removido: endpoint /api/governance/communities é protegido (admin only)
+   // Comunidade é opcional no cadastro do motorista
+   console.log('[Driver Documents] Comunidade é opcional - não carrega lista');
  };
```

### 2. Proteção contra loop no interceptor
**Arquivo:** `frontend-app/src/api/index.js`

```diff
  if (error.response?.status === 401) {
    if (isAuthRoute(url)) {
      console.log('[API] 401 em auth route - sem redirect');
      return Promise.reject(error);
    }
    
+   // Se 401 em endpoint governance/admin mas usuário está em rota de motorista/passageiro, não redirecionar
+   const isGovernanceRoute = url?.includes('/api/governance/') || url?.includes('/api/admin/');
+   const currentPath = window.location.pathname;
+   const isDriverPage = currentPath.startsWith('/motorista');
+   const isPassengerPage = currentPath.startsWith('/passageiro') || currentPath === '/';
+   
+   if (isGovernanceRoute && (isDriverPage || isPassengerPage)) {
+     console.log('[API] 401 em governance/admin route mas usuário não é admin - sem redirect');
+     return Promise.reject(error);
+   }
    
    const scope = getTokenScope(url);
    // ... resto do código
  }
```

## Build + Deploy

```bash
cd ~/kaviar/frontend-app
npm ci
npm run build

cd ~/kaviar
./scripts/deploy-frontend-atomic.sh
```

## Validação

```bash
cd ~/kaviar
./validate-driver-loop-fix.sh
```

**Fluxo de teste:**
1. Cadastrar motorista em `https://kaviar.com.br/cadastro?type=driver`
2. Após login, acessar página de documentos
3. Verificar DevTools > Console (sem loop)
4. Verificar DevTools > Network (sem `/api/governance/communities`)

**Checklist:**
- ✅ Console sem loop de redirect
- ✅ Console sem erro 401 repetido
- ✅ Network sem `GET /api/governance/communities`
- ✅ Requests do motorista com `Authorization: Bearer <kaviar_driver_token>`
- ✅ Página de documentos carrega normalmente
- ✅ Campo "Comunidade" fica vazio (opcional)
- ❌ NÃO pode usar `kaviar_token` (passageiro) em rotas de motorista

## Garantias
- ✅ Não mexe em backend
- ✅ Não afeta WhatsApp/Twilio
- ✅ Não afeta investidores
- ✅ Não afeta fluxo de passageiro
- ✅ Não afeta fluxo de admin
- ✅ Interceptor já estava correto (selecionava token por escopo)
- ✅ Problema era apenas endpoint proibido sendo chamado

## Evidências
- Arquivo 1: `frontend-app/src/pages/driver/Documents.jsx` (removido loadCommunities)
- Arquivo 2: `frontend-app/src/api/index.js` (proteção contra loop em governance)
- Interceptor: já selecionava token correto por URL (`/api/driver/*` → `kaviar_driver_token`)
