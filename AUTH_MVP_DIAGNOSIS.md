# 🔐 Diagnóstico - Autenticação MVP

**Data**: 2026-01-18 19:13 BRT  
**Status**: Problemas Identificados  
**Prioridade**: Alta

---

## 🔍 Problemas Identificados

### 1. Login do Motorista - Senha Não Criada

**Problema**: Cadastro de motorista não cria senha inicial

**Fluxo Atual**:
```
Admin cria motorista → Email cadastrado → password_hash = NULL
Motorista tenta login → Falha (sem senha)
```

**Endpoint Existente** (mas não integrado):
```http
POST /api/auth/driver/set-password
Body: { "email": "...", "password": "..." }
```

**Solução**:
- ✅ Endpoint já existe em `backend/src/routes/driver-auth.ts`
- ❌ Frontend não tem página de "Definir Senha"
- ❌ Link de primeiro acesso não funciona

**Arquivos Envolvidos**:
- `backend/src/routes/admin-drivers.ts` (linha 52: gera link mas não funciona)
- `backend/src/routes/driver-auth.ts` (endpoint set-password existe)
- Frontend: página `/motorista/definir-senha` não existe

---

### 2. Login do Passageiro - Loop Infinito

**Problema**: Após login bem-sucedido, entra em loop de redirecionamento

**Fluxo Atual**:
```
1. LoginForm.jsx faz POST /api/auth/passenger/login ✅
2. Salva token e user no localStorage ✅
3. Navega para /passageiro/home ✅
4. ProtectedRoute verifica user via AuthContext ❌
5. AuthContext.login() não atualiza state ❌
6. user = null → Redireciona para /login ❌
7. Loop infinito
```

**Causa Raiz**:
```javascript
// AuthContext.jsx - linha 35
const login = async (email, password, userType) => {
  const token = localStorage.getItem('kaviar_token');
  const userData = localStorage.getItem('kaviar_user');
  
  if (token && userData) {
    try {
      setUser(JSON.parse(userData)); // ✅ Atualiza state
      return { success: true };
    } catch (error) {
      return { success: false, error: '...' };
    }
  }
  
  // ❌ Não faz chamada à API!
  return { success: false, error: 'Credenciais não encontradas' };
};
```

**Problema**: 
- `LoginForm.jsx` chama API diretamente (correto)
- `AuthContext.login()` não é chamado após login
- State `user` não é atualizado
- ProtectedRoute vê `user = null` e redireciona

**Arquivos Envolvidos**:
- `frontend-app/src/auth/AuthContext.jsx` (login não funciona)
- `frontend-app/src/components/auth/LoginForm.jsx` (não chama AuthContext)
- `frontend-app/src/routes/ProtectedRoute.jsx` (verifica user)

---

## 🎯 Soluções Propostas

### Solução 1: First Access Motorista

**Criar página de definir senha**:
```
frontend-app/src/pages/driver/SetPassword.jsx
```

**Fluxo**:
1. Admin cria motorista
2. Sistema retorna link: `/motorista/definir-senha?email=...`
3. Motorista acessa link
4. Preenche senha (mín. 6 caracteres)
5. POST /api/auth/driver/set-password
6. Redireciona para login

**Arquivos a Criar**:
- `frontend-app/src/pages/driver/SetPassword.jsx`

**Arquivos a Modificar**:
- `frontend-app/src/App.jsx` (adicionar rota)

---

### Solução 2: Corrigir Loop do Passageiro

**Opção A - Atualizar AuthContext após login**:
```javascript
// LoginForm.jsx
const handleSubmit = async (e) => {
  // ... código existente ...
  
  if (response.data.success) {
    localStorage.setItem('kaviar_token', response.data.token);
    localStorage.setItem('kaviar_user', JSON.stringify(response.data.user));
    
    // ✅ Atualizar state do AuthContext
    setUser(response.data.user); // Precisa expor setUser
    
    navigate('/passageiro/home');
  }
};
```

**Opção B - Refatorar AuthContext.login()**:
```javascript
// AuthContext.jsx
const login = async (email, password, userType) => {
  try {
    const endpoint = userType === 'PASSENGER' 
      ? '/api/auth/passenger/login'
      : '/api/auth/driver/login';
    
    const response = await api.post(endpoint, { email, password });
    
    if (response.data.success) {
      localStorage.setItem('kaviar_token', response.data.token);
      localStorage.setItem('kaviar_user', JSON.stringify(response.data.user));
      setUser(response.data.user); // ✅ Atualiza state
      return { success: true };
    }
  } catch (error) {
    return { success: false, error: error.response?.data?.error };
  }
};
```

**Recomendação**: Opção A (mais simples, menos refatoração)

**Arquivos a Modificar**:
- `frontend-app/src/auth/AuthContext.jsx` (expor setUser)
- `frontend-app/src/components/auth/LoginForm.jsx` (chamar setUser)

---

## 📋 Checklist de Implementação

### First Access Motorista
- [ ] Criar `SetPassword.jsx`
- [ ] Adicionar rota em `App.jsx`
- [ ] Testar fluxo completo
- [ ] Validar senha (mín. 6 caracteres)

### Loop do Passageiro
- [ ] Expor `setUser` no AuthContext
- [ ] Atualizar `LoginForm.jsx` para chamar `setUser`
- [ ] Testar login → navegação → persistência
- [ ] Validar ProtectedRoute

---

## 🔒 Garantias de Governança

```
✅ Zero alterações em compliance
✅ Zero novas tabelas
✅ Zero migrations
✅ Apenas correção de autenticação
✅ Endpoints backend já existem
✅ Mudanças mínimas no frontend
```

---

## 🧪 Testes Necessários

### Motorista
1. Admin cria motorista
2. Motorista acessa link de primeiro acesso
3. Define senha
4. Faz login com email + senha
5. Acessa área protegida

### Passageiro
1. Passageiro faz login
2. Verifica redirecionamento para /passageiro/home
3. Atualiza página (F5)
4. Verifica se continua logado
5. Navega entre páginas protegidas

---

## 📊 Impacto

**Arquivos a Criar**: 1
- `frontend-app/src/pages/driver/SetPassword.jsx`

**Arquivos a Modificar**: 3
- `frontend-app/src/App.jsx` (1 linha - nova rota)
- `frontend-app/src/auth/AuthContext.jsx` (expor setUser)
- `frontend-app/src/components/auth/LoginForm.jsx` (chamar setUser)

**Tempo Estimado**: 30 minutos

**Risco**: Baixo (correções isoladas)

---

## ✅ Critérios de Sucesso

- [ ] Motorista consegue definir senha inicial
- [ ] Motorista consegue fazer login
- [ ] Passageiro não entra em loop após login
- [ ] Sessão persiste após F5
- [ ] ProtectedRoute funciona corretamente

---

**Modo Anti-Frankenstein: ATIVO ✅**  
**Compliance: Não afetado ✅**
