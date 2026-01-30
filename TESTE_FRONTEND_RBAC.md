# TESTE FRONTEND RBAC - Guia Completo

## 🧪 Testes no Browser

### Setup
```
Frontend: https://d29p7cirgjqbxl.cloudfront.net
Backend: http://kaviar-alb-1494046292.us-east-2.elb.amazonaws.com
```

---

## Teste 1: SUPER_ADMIN - Primeiro Login (Troca Obrigatória)

### 1.1 Login Inicial
1. Abrir: `https://d29p7cirgjqbxl.cloudfront.net/admin/login`
2. Preencher:
   - Email: `suporte@usbtecnok.com.br`
   - Senha: `z4939ia4`
3. Clicar em "Entrar"

**Esperado**:
- ✅ Redirecionar para `/admin/change-password`
- ✅ Mostrar mensagem: "Você precisa trocar sua senha"
- ✅ Bloquear acesso a outras rotas até trocar

### 1.2 Trocar Senha
1. Na tela de troca de senha:
   - Senha atual: `z4939ia4`
   - Nova senha: `MinhaSenh@123`
2. Clicar em "Alterar Senha"

**Esperado**:
- ✅ Mensagem de sucesso
- ✅ Redirecionar para `/admin/dashboard`
- ✅ Acesso liberado ao painel

### 1.3 Testar Ações
1. Navegar para "Motoristas Pendentes"
2. Verificar botões visíveis:
   - ✅ "Aprovar"
   - ✅ "Rejeitar"
   - ✅ "Excluir"
3. Clicar em "Aprovar" em um motorista

**Esperado**:
- ✅ Ação executada com sucesso
- ✅ Mensagem de confirmação

---

## Teste 2: ANGEL_VIEWER - Primeiro Login (Troca Obrigatória)

### 2.1 Login Inicial
1. Abrir: `https://d29p7cirgjqbxl.cloudfront.net/admin/login`
2. Preencher:
   - Email: `angel1@kaviar.com`
   - Senha: `12332100`
3. Clicar em "Entrar"

**Esperado**:
- ✅ Redirecionar para `/admin/change-password`
- ✅ Bloquear acesso até trocar senha

### 2.2 Trocar Senha
1. Na tela de troca de senha:
   - Senha atual: `12332100`
   - Nova senha: `InvestorSenh@456`
2. Clicar em "Alterar Senha"

**Esperado**:
- ✅ Mensagem de sucesso
- ✅ Redirecionar para `/admin/dashboard`

### 2.3 Verificar Modo Leitura
1. No topo do painel, verificar:
   - ✅ Badge amarelo: "👁️ Modo Leitura"
   - ✅ Texto: "Você tem acesso apenas para visualização"

### 2.4 Testar Leitura
1. Navegar para "Motoristas Pendentes"
2. Verificar lista de motoristas:
   - ✅ Lista carrega normalmente
   - ✅ Pode ver detalhes dos motoristas

### 2.5 Verificar Botões Escondidos
1. Na lista de motoristas, verificar:
   - ❌ Botão "Aprovar" NÃO aparece
   - ❌ Botão "Rejeitar" NÃO aparece
   - ❌ Botão "Excluir" NÃO aparece
   - ✅ Apenas visualização

### 2.6 Tentar Ação via Console (Teste de Segurança)
1. Abrir DevTools (F12)
2. Na aba Console, executar:
```javascript
fetch('http://kaviar-alb-1494046292.us-east-2.elb.amazonaws.com/api/admin/drivers/test-id/approve', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token'),
    'Content-Type': 'application/json'
  },
  body: '{}'
}).then(r => r.json()).then(console.log)
```

**Esperado**:
- ✅ Resposta: `{"success": false, "error": "Acesso negado. Permissão insuficiente."}`
- ✅ Toast/mensagem: "Sem permissão (somente leitura)"

---

## Teste 3: Logout e Re-login (Sem Troca de Senha)

### 3.1 SUPER_ADMIN - Re-login
1. Fazer logout
2. Login com:
   - Email: `suporte@usbtecnok.com.br`
   - Senha: `MinhaSenh@123` (nova senha)

**Esperado**:
- ✅ Login direto para dashboard
- ✅ SEM redirecionar para troca de senha
- ✅ Acesso total às ações

### 3.2 ANGEL_VIEWER - Re-login
1. Fazer logout
2. Login com:
   - Email: `angel1@kaviar.com`
   - Senha: `InvestorSenh@456` (nova senha)

**Esperado**:
- ✅ Login direto para dashboard
- ✅ SEM redirecionar para troca de senha
- ✅ Badge "Modo Leitura" visível
- ✅ Botões de ação escondidos

---

## 🧪 Testes via curl (API)

### Setup
```bash
export ALB_DNS="kaviar-alb-1494046292.us-east-2.elb.amazonaws.com"
```

### Teste 4: Login e mustChangePassword

#### 4.1 SUPER_ADMIN - Primeiro Login
```bash
curl -X POST "http://$ALB_DNS/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "suporte@usbtecnok.com.br",
    "password": "z4939ia4"
  }' | jq '.'
```

**Esperado**:
```json
{
  "success": true,
  "token": "eyJhbGc...",
  "data": {
    "user": {
      "role": "SUPER_ADMIN"
    },
    "mustChangePassword": true
  }
}
```

#### 4.2 Trocar Senha
```bash
SUPER_TOKEN="<token_do_login>"

curl -X POST "http://$ALB_DNS/api/admin/auth/change-password" \
  -H "Authorization: Bearer $SUPER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "z4939ia4",
    "newPassword": "MinhaSenh@123"
  }' | jq '.'
```

**Esperado**:
```json
{
  "success": true,
  "message": "Senha alterada com sucesso"
}
```

#### 4.3 Re-login (Sem mustChangePassword)
```bash
curl -X POST "http://$ALB_DNS/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "suporte@usbtecnok.com.br",
    "password": "MinhaSenh@123"
  }' | jq '.'
```

**Esperado**:
```json
{
  "success": true,
  "data": {
    "mustChangePassword": false
  }
}
```

### Teste 5: ANGEL_VIEWER - Permissões

#### 5.1 Login
```bash
curl -X POST "http://$ALB_DNS/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "angel1@kaviar.com",
    "password": "12332100"
  }' | jq '.'
```

**Salvar token**:
```bash
ANGEL_TOKEN="<token_aqui>"
```

#### 5.2 Trocar Senha
```bash
curl -X POST "http://$ALB_DNS/api/admin/auth/change-password" \
  -H "Authorization: Bearer $ANGEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "12332100",
    "newPassword": "InvestorSenh@456"
  }' | jq '.'
```

#### 5.3 Re-login com Nova Senha
```bash
curl -X POST "http://$ALB_DNS/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "angel1@kaviar.com",
    "password": "InvestorSenh@456"
  }' | jq '.'
```

**Salvar novo token**:
```bash
ANGEL_TOKEN="<novo_token>"
```

#### 5.4 Testar Leitura (GET) - Deve Funcionar
```bash
curl -X GET "http://$ALB_DNS/api/admin/drivers" \
  -H "Authorization: Bearer $ANGEL_TOKEN" | jq '.success'
```

**Esperado**: `true`

#### 5.5 Testar Ação (POST) - Deve Bloquear
```bash
curl -X POST "http://$ALB_DNS/api/admin/drivers/test-id/approve" \
  -H "Authorization: Bearer $ANGEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' | jq '.'
```

**Esperado**:
```json
{
  "success": false,
  "error": "Acesso negado. Permissão insuficiente.",
  "requiredRoles": ["SUPER_ADMIN"],
  "userRole": "ANGEL_VIEWER"
}
```

---

## ✅ Checklist de Validação

### Backend
- [ ] Login retorna `mustChangePassword: true` no primeiro acesso
- [ ] Endpoint `/api/admin/auth/change-password` funciona
- [ ] Após troca, `mustChangePassword: false`
- [ ] ANGEL_VIEWER: GET retorna 200
- [ ] ANGEL_VIEWER: POST retorna 403

### Frontend
- [ ] Redireciona para `/admin/change-password` se `mustChangePassword: true`
- [ ] Bloqueia acesso a rotas até trocar senha
- [ ] Após troca, libera acesso ao painel
- [ ] Badge "Modo Leitura" visível para ANGEL_VIEWER
- [ ] Botões de ação escondidos para ANGEL_VIEWER
- [ ] Toast "Sem permissão" se tentar ação via API

### Credenciais
- [ ] SUPER_ADMIN: `z4939ia4` (8 chars)
- [ ] ANGEL_VIEWER: `12332100` (8 chars)
- [ ] Ambas exigem troca no primeiro login

---

## 📊 Resumo Esperado

| Usuário | Senha Temp | Troca Obrigatória | GET | POST | Badge |
|---------|------------|-------------------|-----|------|-------|
| SUPER_ADMIN | z4939ia4 | ✅ | ✅ 200 | ✅ 200/404 | ❌ |
| ANGEL_VIEWER | 12332100 | ✅ | ✅ 200 | ❌ 403 | ✅ "Modo Leitura" |

---

**Status**: Pronto para validação em produção AWS
