# FIX: AUTENTICAÇÃO NO UPLOAD DE DOCUMENTOS

**Data:** 2026-03-07  
**Commit:** `09faa9f`  
**Status:** ✅ CORRIGIDO

---

## PROBLEMA

**Sintoma:**
- ✅ Cadastro mobile completa
- ✅ Redireciona para tela de documentos
- ✅ Tela abre normalmente
- ❌ Upload retorna erro "não autenticado"

---

## CAUSA RAIZ

### Divergência de Chaves no AsyncStorage

**Token salvo em:**
```typescript
// src/auth/auth.store.ts
await AsyncStorage.setItem('auth_token', token);  ✅
```

**Token buscado em:**
```typescript
// app/services/documentApi.ts (ANTES)
const token = await AsyncStorage.getItem('driver_token');  ❌
```

**Resultado:**
- Chave salva: `auth_token`
- Chave buscada: `driver_token`
- Token encontrado: `null`
- Erro: "Não autenticado"

---

## CORREÇÃO MÍNIMA

### Arquivo: `app/services/documentApi.ts`

**Antes:**
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function uploadDocuments(documents: DocumentUpload[]) {
  const token = await AsyncStorage.getItem('driver_token');  // ❌
  if (!token) throw new Error('Não autenticado');
  // ...
}

export async function getMyDocuments() {
  const token = await AsyncStorage.getItem('driver_token');  // ❌
  if (!token) throw new Error('Não autenticado');
  // ...
}
```

**Depois:**
```typescript
import { authStore } from '../../src/auth/auth.store';

export async function uploadDocuments(documents: DocumentUpload[]) {
  const token = authStore.getToken();  // ✅
  if (!token) throw new Error('Não autenticado');
  // ...
}

export async function getMyDocuments() {
  const token = authStore.getToken();  // ✅
  if (!token) throw new Error('Não autenticado');
  // ...
}
```

**Mudanças:**
- Linha 1: Trocar import de `AsyncStorage` por `authStore`
- Linha 22: Trocar `AsyncStorage.getItem('driver_token')` por `authStore.getToken()`
- Linha 56: Trocar `AsyncStorage.getItem('driver_token')` por `authStore.getToken()`

**Total:** 3 linhas

---

## SINGLE SOURCE OF TRUTH

### Antes (Divergente)

**authStore:**
```typescript
setAuth() → AsyncStorage.setItem('auth_token', token)
getToken() → return this.token
```

**documentApi:**
```typescript
uploadDocuments() → AsyncStorage.getItem('driver_token')  ❌
```

**Problema:** Duas fontes de verdade, chaves diferentes

### Depois (Alinhado)

**authStore:**
```typescript
setAuth() → AsyncStorage.setItem('auth_token', token)
getToken() → return this.token
```

**documentApi:**
```typescript
uploadDocuments() → authStore.getToken()  ✅
```

**Resultado:** Single source of truth mantido

---

## VALIDAÇÃO

### Teste 1: Upload após Registro
1. Abrir app mobile
2. Cadastrar novo motorista
3. Tela de documentos abre
4. Selecionar 6 documentos
5. Clicar "Enviar Documentos"
6. ✅ Upload deve funcionar (sem erro "não autenticado")

### Teste 2: Upload após Login
1. Fazer login como motorista existente
2. Navegar para tela de documentos
3. Selecionar documentos
4. Clicar "Enviar Documentos"
5. ✅ Upload deve funcionar

### Teste 3: Verificar Token
```typescript
// Debug no documentApi.ts
const token = authStore.getToken();
console.log('[documentApi] Token:', token ? 'EXISTS' : 'NULL');
console.log('[documentApi] Token length:', token?.length);
```

**Resultado esperado:**
```
[documentApi] Token: EXISTS
[documentApi] Token length: 200+ (JWT)
```

---

## ARQUIVOS ENVOLVIDOS

### Corrigido
- `app/services/documentApi.ts` - Usar authStore em vez de AsyncStorage direto

### Corretos (não alterados)
- `src/auth/auth.store.ts` - Single source of truth para auth
- `app/(auth)/register.tsx` - Auto-login correto
- `app/(auth)/login.tsx` - Login correto
- `backend/src/middleware/auth.ts` - Middleware correto

---

## FLUXO CORRIGIDO

```
1. Register
   └─> authStore.setAuth(token, user)
   └─> AsyncStorage.setItem('auth_token', token)  ✅

2. Redirect
   └─> router.replace('/(driver)/documents')

3. Upload
   └─> documentApi.uploadDocuments()
   └─> authStore.getToken()  ✅
   └─> token = 'eyJhbGc...'
   └─> fetch com Authorization: Bearer token

4. Backend
   └─> authenticateDriver middleware
   └─> Valida token
   └─> Upload processa  ✅
```

---

## PRINCÍPIOS KAVIAR

✅ **Single Source of Truth:** authStore é única fonte de token  
✅ **Sem Frankenstein:** Removeu duplicação de lógica de token  
✅ **Minimal Patch:** 3 linhas alteradas  
✅ **Clean Contract:** Mantém interface consistente  
✅ **Surgical Fix:** Corrigiu causa raiz, não sintoma

---

## DOCUMENTAÇÃO

📄 **DIAGNOSTICO_AUTH_DOCUMENTOS.md** - Análise completa, evidências, fluxos  
📄 **FIX_AUTH_DOCUMENTOS.md** - Este documento (resumo executivo)

---

## BUILD

Para testar a correção:

**Opção A: Build EAS**
```bash
cd /home/goes/kaviar
eas build --platform android --profile driver-apk
```

**Opção B: Desenvolvimento Local**
```bash
cd /home/goes/kaviar
npx expo start
```

---

## CHECKLIST

### Correção
- [x] Identificar causa raiz
- [x] Implementar correção mínima
- [x] Manter single source of truth
- [x] Commitar e documentar

### Validação
- [ ] Build novo do app
- [ ] Testar upload após registro
- [ ] Testar upload após login
- [ ] Verificar token no console
- [ ] Confirmar upload no backend/admin

---

## PRÓXIMOS PASSOS

1. ✅ Build novo do app mobile
2. ✅ Testar fluxo completo: registro → documentos → upload
3. ✅ Verificar no admin que documentos aparecem
4. ✅ Marcar issue como resolvida
