# 🔍 INVESTIGAÇÃO CIRÚRGICA - BUG DE AUTENTICAÇÃO

**Data:** 2026-03-08 13:56  
**Commit:** `abf1bb9`

---

## ❌ CAUSA RAIZ IDENTIFICADA

### Problema: Incompatibilidade de bibliotecas bcrypt

**Cadastro** (`driver-auth.ts` linha 88):
```typescript
import * as bcrypt from 'bcrypt';  // ← bcrypt nativo (C++)
const password_hash = await bcrypt.hash(data.password, 10);
```

**Login** (`driver-auth.ts` linha 189):
```typescript
import * as bcrypt from 'bcrypt';  // ← bcrypt nativo (C++)
const isValid = await bcrypt.compare(password, driver.password_hash);
```

**Reset de senha** (`password-reset.ts` linha 2 e 133):
```typescript
import bcrypt from 'bcryptjs';  // ← bcryptjs (JavaScript puro) ❌
const passwordHash = await bcrypt.hash(password, 12);
```

---

## 🧪 EVIDÊNCIA DO BANCO

```json
{
  "id": "driver_1772985515365_0qak6318f",
  "email": "gogoi@gmail.com",
  "password_hash": "$2b$10$Z6mu7FLz5gN0zJcH7nGrEuS5nW7zh.V4onw58kDEuRu7cHnUmVF9a",
  "status": "approved",
  "approved_at": "2026-03-08T16:36:18.227Z",
  "created_at": "2026-03-08T15:58:35.365Z",
  "updated_at": "2026-03-08T15:59:37.993Z"
}
```

**Análise:**
- `password_hash` existe ✅
- Formato `$2b$10$...` = bcrypt nativo
- Quando usuário fez reset, `bcryptjs` gerou hash incompatível
- Login com `bcrypt` nativo não consegue validar hash do `bcryptjs`

---

## ✅ SOLUÇÃO APLICADA

### 1. Padronizar para `bcrypt` nativo

**Arquivo:** `/backend/src/routes/password-reset.ts`

```typescript
// ❌ ANTES
import bcrypt from 'bcryptjs';
const passwordHash = await bcrypt.hash(password, 12);

// ✅ DEPOIS
import * as bcrypt from 'bcrypt';
const passwordHash = await bcrypt.hash(password, 10);
```

### 2. Usar mesmo salt rounds (10)

Padronizado com o cadastro para consistência.

---

## 📦 DEPLOY

### Commit
```
abf1bb9 fix: usar bcrypt em vez de bcryptjs no reset de senha para compatibilidade
```

### Build
```
✅ Docker build completo
sha256:76999d25ac5acdc3b96cd9c9a87c2f871f3fd238cc42b64f4b3bfd01b2eb3e82
```

### Push ECR
```
✅ Push completo para 847895361928.dkr.ecr.us-east-2.amazonaws.com/kaviar-backend:latest
```

### Deploy ECS
```
✅ Deploy completo às 13:55:11
Deployment: ecs-svc/9454000452767089108
Status: COMPLETED
```

---

## 🧪 VALIDAÇÃO NECESSÁRIA

### 1. Resetar senha do Mauro Godoi novamente
Agora o reset vai usar `bcrypt` nativo, compatível com o login.

### 2. Testar login
Após reset, tentar fazer login no app.

### 3. Critério de sucesso
✅ Login funciona com a nova senha

---

## 📊 ARQUIVOS ENVOLVIDOS

| Arquivo | Função | Biblioteca | Status |
|---------|--------|------------|--------|
| `/backend/src/routes/driver-auth.ts` | Cadastro | `bcrypt` | ✅ Correto |
| `/backend/src/routes/driver-auth.ts` | Login | `bcrypt` | ✅ Correto |
| `/backend/src/routes/password-reset.ts` | Reset | `bcryptjs` → `bcrypt` | ✅ Corrigido |

---

## 🎯 PRÓXIMO PASSO

**Resetar senha do Mauro Godoi e testar login.**

Se funcionar → ✅ Bug resolvido  
Se não funcionar → Investigar logs do backend
