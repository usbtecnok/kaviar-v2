# Fix Admin useAuth - AuthProvider Wrapper

**Data:** 2026-02-15
**Objetivo:** Corrigir erro "useAuth must be used within AuthProvider" no Admin
**Escopo:** SOMENTE FRONTEND (não mexe em backend/WhatsApp/investidores)

## Problema
- Ao clicar no 👁️ (visualizar) no Admin, aparecia erro: `useAuth must be used within AuthProvider`
- Componentes do Admin usam `useAuth()` mas não estavam dentro do `AuthProvider`
- Rotas `/admin/*` e `/admin/reset-password` renderizavam sem contexto de autenticação

## Causa Raiz
- `App.jsx` não envolvia `AdminApp` e `AdminResetPassword` com `AuthProvider`
- Outros apps (PassengerApp, DriverApp) provavelmente têm seus próprios providers
- Admin precisa do contexto para acessar `user`, `loading`, etc.

## Solução Mínima

**Arquivo:** `frontend-app/src/App.jsx`

```diff
 import { RideProvider } from "./context/RideContext";
 import { DriverProvider } from "./context/DriverContext";
+import { AuthProvider } from "./contexts/AuthContext";

 export default function App() {
   return (
     <RideProvider>
       <DriverProvider>
         <Routes>
           {/* ... outras rotas ... */}
           
-          <Route path="/admin/reset-password" element={<AdminResetPassword />} />
+          <Route
+            path="/admin/reset-password"
+            element={
+              <AuthProvider>
+                <AdminResetPassword />
+              </AuthProvider>
+            }
+          />
           
-          <Route path="/admin/*" element={<AdminApp />} />
+          <Route
+            path="/admin/*"
+            element={
+              <AuthProvider>
+                <AdminApp />
+              </AuthProvider>
+            }
+          />
         </Routes>
       </DriverProvider>
     </RideProvider>
   );
 }
```

## Build + Deploy

```bash
cd ~/kaviar/frontend-app
npm run build

cd ~/kaviar
./scripts/deploy-frontend-atomic.sh
```

## Validação

```bash
cd ~/kaviar
./validate-admin-useauth-fix.sh
```

**Fluxo de teste:**
1. Login no Admin: `https://kaviar.com.br/admin/login`
2. Ir para: `https://kaviar.com.br/admin/drivers`
3. Clicar no 👁️ (visualizar motorista)
4. Verificar DevTools > Console

**Checklist:**
- ✅ Console sem erro `useAuth must be used within AuthProvider`
- ✅ Tela de detalhe abre normalmente
- ✅ Informações do motorista aparecem
- ✅ Testar também: `/admin/passengers`, `/admin/communities`, `/admin/reset-password`

**Antes (erro):**
```
Error: useAuth must be used within AuthProvider
  at useAuth (AuthContext.jsx:XX)
  at DriverDetails (DriverDetails.jsx:XX)
```

**Depois (funciona):**
```
✅ Console limpo
✅ Tela renderiza normalmente
```

## Garantias
- ✅ Mudança isolada no App Router
- ✅ Não mexe em backend
- ✅ Não afeta WhatsApp/Twilio
- ✅ Não afeta investidores
- ✅ Não afeta passageiro/motorista
- ✅ Fix estrutural (contexto React)

## Evidências
- Arquivo: `frontend-app/src/App.jsx`
- Mudança: Wrapped `AdminApp` e `AdminResetPassword` com `AuthProvider`
- Tipo: Fix de contexto React (estrutural, não lógica de negócio)
