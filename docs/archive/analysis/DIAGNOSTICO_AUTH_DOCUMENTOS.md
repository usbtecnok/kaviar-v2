# DIAGNÓSTICO CIRÚRGICO: ERRO "NÃO AUTENTICADO" NO UPLOAD DE DOCUMENTOS

**Data:** 2026-03-07  
**Status:** 🔴 CAUSA RAIZ IDENTIFICADA

---

## SINTOMA

**Fluxo:**
1. ✅ Cadastro mobile completa com sucesso
2. ✅ Redireciona para tela de documentos
3. ✅ Tela de documentos abre
4. ❌ Ao tentar enviar documentos → erro "não autenticado"

---

## CAUSA RAIZ

### DIVERGÊNCIA DE CHAVES NO ASYNCSTORAGE

**Register/Login salvam token em:**
```typescript
// src/auth/auth.store.ts
async setAuth(token: string, user: User): Promise<void> {
  this.token = token;
  this.user = user;
  await AsyncStorage.setItem('auth_token', token);  // ✅ Chave: auth_token
  await AsyncStorage.setItem('auth_user', JSON.stringify(user));
}
```

**DocumentApi busca token em:**
```typescript
// app/services/documentApi.ts
export async function uploadDocuments(documents: DocumentUpload[]) {
  const token = await AsyncStorage.getItem('driver_token');  // ❌ Chave: driver_token
  if (!token) throw new Error('Não autenticado');
  
  const response = await fetch(`${API_URL}/api/drivers/me/documents`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });
}
```

**Resultado:**
- Token salvo em: `auth_token`
- Token buscado em: `driver_token`
- Token encontrado: `null`
- Erro: "Não autenticado"

---

## EVIDÊNCIAS

### 1. Register faz auto-login correto

**Arquivo:** `app/(auth)/register.tsx` (linha 252)
```typescript
// ✅ Auto-login com token retornado
await authStore.setAuth(registerJson.token, registerJson.user);

// Redireciona para documentos
Alert.alert(
  'Cadastro Realizado!',
  'Agora envie seus documentos para aprovação.',
  [
    {
      text: 'Enviar Documentos',
      onPress: () => router.replace('/(driver)/documents')
    }
  ]
);
```

### 2. AuthStore salva em 'auth_token'

**Arquivo:** `src/auth/auth.store.ts` (linhas 27-32)
```typescript
async setAuth(token: string, user: User): Promise<void> {
  this.token = token;
  this.user = user;
  await AsyncStorage.setItem('auth_token', token);      // ✅
  await AsyncStorage.setItem('auth_user', JSON.stringify(user));
}
```

### 3. DocumentApi busca em 'driver_token'

**Arquivo:** `app/services/documentApi.ts` (linha 22)
```typescript
export async function uploadDocuments(documents: DocumentUpload[]): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await AsyncStorage.getItem('driver_token');  // ❌ ERRADO
    if (!token) throw new Error('Não autenticado');
    
    // ...
  }
}
```

**Arquivo:** `app/services/documentApi.ts` (linha 56)
```typescript
export async function getMyDocuments(): Promise<{ success: boolean; data?: DocumentStatus[]; error?: string }> {
  try {
    const token = await AsyncStorage.getItem('driver_token');  // ❌ ERRADO
    if (!token) throw new Error('Não autenticado');
    
    // ...
  }
}
```

### 4. Login também usa 'auth_token'

**Arquivo:** `app/(auth)/login.tsx` (linha 27)
```typescript
const handleLogin = async () => {
  // ...
  const { token, user } = await loginFn(email, password);
  await authStore.setAuth(token, user);  // ✅ Salva em 'auth_token'
  
  if (userType === 'PASSENGER') {
    router.replace('/(passenger)/map');
  } else {
    router.replace('/(driver)/online');
  }
};
```

### 5. Backend espera Bearer token

**Arquivo:** `backend/src/middleware/auth.ts` (linhas 65-85)
```typescript
export const authenticateDriver = (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });  // ✅
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    if (decoded.role !== 'DRIVER') {
      return res.status(403).json({ error: 'Driver access required' });
    }

    (req as any).driverId = decoded.id;
    (req as any).user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
```

**Endpoint:** `POST /api/drivers/me/documents`
```typescript
router.post('/me/documents', authenticateDriver, uploadToS3.fields([...]), async (req, res) => {
  // Requer autenticação via middleware
});
```

---

## FLUXO COMPLETO

### Fluxo Atual (Quebrado)

```
1. Register → authStore.setAuth(token, user)
   └─> AsyncStorage.setItem('auth_token', token)  ✅

2. Redirect → /(driver)/documents

3. Upload → documentApi.uploadDocuments()
   └─> AsyncStorage.getItem('driver_token')  ❌
   └─> token = null
   └─> throw Error('Não autenticado')

4. Backend nunca é chamado (erro antes do fetch)
```

### Fluxo Esperado (Correto)

```
1. Register → authStore.setAuth(token, user)
   └─> AsyncStorage.setItem('auth_token', token)  ✅

2. Redirect → /(driver)/documents

3. Upload → documentApi.uploadDocuments()
   └─> AsyncStorage.getItem('auth_token')  ✅
   └─> token = 'eyJhbGc...'
   └─> fetch com Authorization: Bearer token

4. Backend → authenticateDriver middleware
   └─> Valida token
   └─> Upload processa
```

---

## SINGLE SOURCE OF TRUTH

### Chave Correta: `auth_token`

**Usado por:**
- ✅ `src/auth/auth.store.ts` - setAuth, init, clearAuth
- ✅ `app/(auth)/login.tsx` - via authStore
- ✅ `app/(auth)/register.tsx` - via authStore
- ✅ `app/index.tsx` - via authStore (init)

**Deveria ser usado por:**
- ❌ `app/services/documentApi.ts` - uploadDocuments
- ❌ `app/services/documentApi.ts` - getMyDocuments

---

## CORREÇÃO MÍNIMA

### Arquivo: `app/services/documentApi.ts`

**Trocar:**
```typescript
const token = await AsyncStorage.getItem('driver_token');  // ❌
```

**Por:**
```typescript
const token = await AsyncStorage.getItem('auth_token');  // ✅
```

**Linhas afetadas:**
- Linha 22 (uploadDocuments)
- Linha 56 (getMyDocuments)

**Total:** 2 linhas

---

## ALTERNATIVA (MELHOR)

Usar `authStore` diretamente em vez de AsyncStorage:

```typescript
import { authStore } from '../../src/auth/auth.store';

export async function uploadDocuments(documents: DocumentUpload[]) {
  try {
    const token = authStore.getToken();  // ✅ Single source of truth
    if (!token) throw new Error('Não autenticado');
    
    // ...
  }
}
```

**Vantagens:**
- ✅ Single source of truth (authStore)
- ✅ Não duplica chave de storage
- ✅ Mais fácil de manter
- ✅ Consistente com resto do app

---

## VALIDAÇÃO

### Teste 1: Upload após registro
1. Cadastrar novo motorista no app
2. Tela de documentos abre
3. Selecionar documentos
4. Clicar "Enviar Documentos"
5. ✅ Upload deve funcionar (sem erro "não autenticado")

### Teste 2: Upload após login
1. Fazer login como motorista existente
2. Navegar para documentos
3. Selecionar documentos
4. Clicar "Enviar Documentos"
5. ✅ Upload deve funcionar

### Teste 3: Verificar token no storage
```typescript
// Debug no documentApi.ts
const token = authStore.getToken();
console.log('[documentApi] Token:', token ? 'EXISTS' : 'NULL');
```

---

## ARQUIVOS ENVOLVIDOS

### Arquivo a corrigir
- `app/services/documentApi.ts` - Trocar `driver_token` por `auth_token` ou usar `authStore.getToken()`

### Arquivos corretos (não mexer)
- `src/auth/auth.store.ts` - Single source of truth para auth
- `app/(auth)/register.tsx` - Auto-login correto
- `app/(auth)/login.tsx` - Login correto
- `backend/src/middleware/auth.ts` - Middleware correto

---

## RESUMO

**Problema:** Chave de token divergente  
**Causa:** documentApi busca `driver_token`, mas token está em `auth_token`  
**Correção:** Trocar chave ou usar `authStore.getToken()`  
**Impacto:** 2 linhas de código  
**Princípio:** Single source of truth mantido
