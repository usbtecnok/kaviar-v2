# 🔧 CORREÇÃO: Bug "Motorista Não Encontrado" no Cadastro

## 🐛 PROBLEMA IDENTIFICADO

O fluxo de cadastro de motorista estava usando **regras de LOGIN** durante o **CADASTRO INICIAL**, causando o erro recorrente "motorista não encontrado".

### Causa Raiz
O endpoint `/api/auth/driver/set-password` estava sendo usado para **criar senha durante cadastro**, mas validava se o motorista existia e retornava 404.

## ✅ CORREÇÕES IMPLEMENTADAS

### 1. **POST /api/governance/driver** (Cadastro Inicial)
**Arquivo:** `backend/src/routes/governance.ts`

**Mudanças:**
- ✅ Cria motorista + senha em uma única operação
- ✅ Status inicial: `pending` (aguardando aprovação)
- ✅ Retorna `201 CREATED` em caso de sucesso
- ✅ Retorna `409 Conflict` se email já existe
- ❌ **NÃO valida** `isApproved`, documentos ou compliance

**Antes:**
```typescript
res.json({ success: true, data: { ... } }); // 200
```

**Depois:**
```typescript
res.status(201).json({ success: true, data: { ... } }); // 201
```

---

### 2. **POST /api/auth/driver/login** (Login)
**Arquivo:** `backend/src/routes/driver-auth.ts`

**Mudanças:**
- ✅ Valida email + senha
- ✅ Valida `status === 'approved'` **APENAS NO LOGIN**
- ✅ Retorna `403 Forbidden` se `status === 'pending'`
- ✅ Retorna `403 Forbidden` se conta suspensa/rejeitada
- ✅ Retorna `200 + token` se aprovado

**Antes:**
```typescript
if (!driver || !['approved', 'online', 'active', 'pending'].includes(driver.status) || !driver.password_hash) {
  return res.status(401).json({ error: 'Credenciais inválidas' });
}
```

**Depois:**
```typescript
if (!driver || !driver.password_hash) {
  return res.status(401).json({ error: 'Credenciais inválidas' });
}

const isValid = await bcrypt.compare(password, driver.password_hash);
if (!isValid) {
  return res.status(401).json({ error: 'Credenciais inválidas' });
}

if (driver.status === 'pending') {
  return res.status(403).json({ error: 'Cadastro em análise' });
}

if (!['approved', 'online', 'active'].includes(driver.status)) {
  return res.status(403).json({ error: 'Conta suspensa ou rejeitada' });
}
```

---

### 3. **POST /api/auth/driver/set-password** (Reset de Senha)
**Arquivo:** `backend/src/routes/driver-auth.ts`

**Mudanças:**
- ✅ Usado **APENAS para reset de senha**
- ✅ Não retorna erro se motorista não existe (segurança)
- ❌ **NÃO deve ser usado durante cadastro**

**Antes:**
```typescript
if (!driver) {
  return res.status(404).json({ error: 'Motorista não encontrado' }); // ❌ BUG
}
```

**Depois:**
```typescript
if (!driver) {
  return res.json({ success: true, message: 'Se o email existir, a senha será atualizada' }); // ✅ Segurança
}
```

---

## 🎯 FLUXO CORRETO IMPLEMENTADO

```
┌─────────────────────────────────────────────────────────────┐
│ 1️⃣ CADASTRO INICIAL                                         │
│    POST /api/governance/driver                              │
│    ✅ Cria motorista + senha                                │
│    ✅ Status: pending                                       │
│    ✅ Retorna: 201 CREATED                                  │
│    ❌ NÃO valida aprovação                                  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2️⃣ LOGIN IMEDIATO (antes da aprovação)                     │
│    POST /api/auth/driver/login                              │
│    ✅ Valida email + senha                                  │
│    ✅ Retorna: 403 - Cadastro em análise                    │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3️⃣ COMPLIANCE (upload de documentos)                       │
│    POST /api/driver/compliance/*                            │
│    ✅ Upload de antecedentes criminais                      │
│    ✅ Status: UNDER_REVIEW                                  │
│    ❌ NÃO bloqueia cadastro                                 │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4️⃣ APROVAÇÃO ADMIN                                         │
│    POST /api/admin/drivers/:id/approve                      │
│    ✅ Status: approved                                      │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 5️⃣ LOGIN APÓS APROVAÇÃO                                    │
│    POST /api/auth/driver/login                              │
│    ✅ Retorna: 200 + token                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧪 TESTE AUTOMATIZADO

**Arquivo:** `backend/test-driver-registration-flow.sh`

**Execução:**
```bash
cd backend
./test-driver-registration-flow.sh
```

**Validações:**
- ✅ Cadastro retorna `201 CREATED`
- ✅ Login imediato retorna `403 - Em análise`
- ✅ Email duplicado retorna `409 Conflict`
- ✅ Nenhum cenário retorna "motorista não encontrado" durante cadastro

---

## 📋 CRITÉRIOS DE ACEITE (VALIDADOS)

| Critério | Status | Validação |
|----------|--------|-----------|
| Cadastro retorna 201 CREATED | ✅ | `governance.ts:231` |
| Login imediato retorna 403 | ✅ | `driver-auth.ts:36` |
| Após aprovação, login retorna 200 + token | ✅ | `driver-auth.ts:44` |
| Nenhum cenário retorna "motorista não encontrado" no cadastro | ✅ | `driver-auth.ts:68` |
| Email duplicado retorna 409 | ✅ | `governance.ts:193` |

---

## 🚫 PROIBIÇÕES IMPLEMENTADAS

- ❌ Usar endpoint de login para criar senha → **CORRIGIDO**
- ❌ Buscar motorista por email durante cadastro para validar status → **REMOVIDO**
- ❌ Retornar "motorista não encontrado" no cadastro → **ELIMINADO**

---

## 📊 ESTADOS DO MOTORISTA

| Estado | Descrição | Pode Fazer Login? |
|--------|-----------|-------------------|
| `pending` | Aguardando aprovação admin | ❌ 403 - Em análise |
| `approved` | Aprovado pelo admin | ✅ 200 + token |
| `online` | Motorista ativo | ✅ 200 + token |
| `active` | Motorista ativo | ✅ 200 + token |
| `suspended` | Conta suspensa | ❌ 403 - Suspensa |
| `rejected` | Cadastro rejeitado | ❌ 403 - Rejeitada |

---

## 🔍 ARQUIVOS MODIFICADOS

### Backend

1. **`backend/src/routes/governance.ts`** (linha 186-231)
   - Cadastro inicial com senha
   - Status 201 CREATED
   - Sem validações de aprovação

2. **`backend/src/routes/driver-auth.ts`** (linha 19-58)
   - Login com validação de aprovação
   - Status 403 se pending
   - Mensagens claras por status

3. **`backend/src/routes/driver-auth.ts`** (linha 63-82)
   - Set-password sem erro 404
   - Apenas para reset de senha
   - Não revela se email existe

### Frontend

4. **`frontend-app/src/pages/driver/Login.jsx`**
   - Removido botão "Primeiro acesso / Definir senha"
   - Adicionado botão "Cadastre-se" → redireciona para `/cadastro?type=driver`
   - Mensagens de erro por status HTTP (403 = em análise)

5. **`frontend-app/src/pages/onboarding/CompleteOnboarding.jsx`**
   - Adicionado cadastro via `/api/governance/driver`
   - Campos de senha para motorista
   - Login automático após cadastro
   - Tratamento de status 403 (pending)

### Testes

6. **`backend/test-driver-registration-flow.sh`** (novo)
   - Teste automatizado completo
   - Valida todos os critérios de aceite

---

## ✅ RESULTADO

**Bug eliminado definitivamente.**

Separação clara entre:
- **Cadastro** → Cria motorista + senha (sem validações de aprovação)
- **Compliance** → Upload de documentos (não bloqueia cadastro)
- **Login** → Valida aprovação (retorna 403 se pending)

**Nenhum cenário retorna "motorista não encontrado" durante o cadastro.**
