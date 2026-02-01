# Criação de Admins - Evidências

## Data: 2026-01-31T22:55:00-03:00

## Objetivo Cumprido ✅

Criar/atualizar 12 admins no banco de produção com:
- Senhas temporárias hasheadas (bcrypt cost 10)
- `must_change_password = true` (obrigatório trocar no 1º login)
- `is_active = true`
- Roles corretas: 2 SUPER_ADMIN + 10 ANGEL_VIEWER

---

## 1. Execução do Upsert

**Método:** ECS one-off task (inline script via node -e)

**Resultado:**
```
Upsert iniciado
suporte@usbtecnok.com.br OK
financeiro@kaviar.com.br OK
angel1@kaviar.com OK
angel2@kaviar.com OK
angel3@kaviar.com OK
angel4@kaviar.com OK
angel5@kaviar.com OK
angel6@kaviar.com OK
angel7@kaviar.com OK
angel8@kaviar.com OK
angel9@kaviar.com OK
angel10@kaviar.com OK
```

✅ **12 admins processados com sucesso**

---

## 2. Contagem por Role

```json
[
  { "role": "ANGEL_VIEWER", "count": 20 },
  { "role": "SUPER_ADMIN", "count": 3 }
]
```

**Nota:** Total inclui admins antigos. Os 12 novos/atualizados:
- 2 SUPER_ADMIN: suporte@usbtecnok.com.br, financeiro@kaviar.com.br
- 10 ANGEL_VIEWER: angel1-10@kaviar.com

---

## 3. Verificação dos 12 Admins

```json
[
  {
    "email": "financeiro@kaviar.com.br",
    "role": "SUPER_ADMIN",
    "must_change_password": true,
    "is_active": true
  },
  {
    "email": "suporte@usbtecnok.com.br",
    "role": "SUPER_ADMIN",
    "must_change_password": true,
    "is_active": true
  },
  {
    "email": "angel1@kaviar.com",
    "role": "ANGEL_VIEWER",
    "must_change_password": true,
    "is_active": true
  },
  {
    "email": "angel2@kaviar.com",
    "role": "ANGEL_VIEWER",
    "must_change_password": true,
    "is_active": true
  },
  {
    "email": "angel3@kaviar.com",
    "role": "ANGEL_VIEWER",
    "must_change_password": true,
    "is_active": true
  },
  {
    "email": "angel4@kaviar.com",
    "role": "ANGEL_VIEWER",
    "must_change_password": true,
    "is_active": true
  },
  {
    "email": "angel5@kaviar.com",
    "role": "ANGEL_VIEWER",
    "must_change_password": true,
    "is_active": true
  },
  {
    "email": "angel6@kaviar.com",
    "role": "ANGEL_VIEWER",
    "must_change_password": true,
    "is_active": true
  },
  {
    "email": "angel7@kaviar.com",
    "role": "ANGEL_VIEWER",
    "must_change_password": true,
    "is_active": true
  },
  {
    "email": "angel8@kaviar.com",
    "role": "ANGEL_VIEWER",
    "must_change_password": true,
    "is_active": true
  },
  {
    "email": "angel9@kaviar.com",
    "role": "ANGEL_VIEWER",
    "must_change_password": true,
    "is_active": true
  },
  {
    "email": "angel10@kaviar.com",
    "role": "ANGEL_VIEWER",
    "must_change_password": true,
    "is_active": true
  }
]
```

✅ **Todos com `must_change_password: true` e `is_active: true`**

---

## 4. Teste de Login

### 4.1 SUPER_ADMIN (suporte@usbtecnok.com.br)

**Request:**
```bash
POST /api/admin/auth/login
{
  "email": "suporte@usbtecnok.com.br",
  "password": "[senha_temporaria]"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "user": {
      "id": "aa7734f7-52e2-4e99-8f80-f5138226d053",
      "email": "suporte@usbtecnok.com.br",
      "name": "Suporte USB Tecnok",
      "role": "SUPER_ADMIN"
    },
    "mustChangePassword": true
  }
}
```

✅ **Login OK + mustChangePassword=true**

---

### 4.2 ANGEL_VIEWER (angel1@kaviar.com)

**Request:**
```bash
POST /api/admin/auth/login
{
  "email": "angel1@kaviar.com",
  "password": "[senha_temporaria]"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "user": {
      "id": "3750939c-fa65-4e87-a9e2-f680de673c1a",
      "email": "angel1@kaviar.com",
      "name": "Angel Viewer 01",
      "role": "ANGEL_VIEWER"
    },
    "mustChangePassword": true
  }
}
```

✅ **Login OK + mustChangePassword=true**

---

## 5. Teste RBAC

### ANGEL_VIEWER tentando PUT (esperado: 403)

**Request:**
```bash
PUT /api/admin/drivers/{driverId}/virtual-fence-center
Authorization: Bearer {ANGEL_TOKEN}
{
  "lat": -23.5505,
  "lng": -46.6333
}
```

**Response:**
```json
{
  "success": false,
  "error": "Acesso negado. Permissão insuficiente.",
  "requiredRoles": ["SUPER_ADMIN", "OPERATOR"],
  "userRole": "ANGEL_VIEWER"
}
```

**HTTP Status:** 403

✅ **RBAC validado - ANGEL_VIEWER bloqueado corretamente**

---

## 6. Lista de Admins Criados

**Nota:** Senhas temporárias não documentadas por segurança. Usuários devem trocar no primeiro login.

### SUPER_ADMIN (2)
- suporte@usbtecnok.com.br | SUPER_ADMIN | must_change: true | active: true
- financeiro@kaviar.com.br | SUPER_ADMIN | must_change: true | active: true

### ANGEL_VIEWER (10)
- angel1@kaviar.com | ANGEL_VIEWER | must_change: true | active: true
- angel2@kaviar.com | ANGEL_VIEWER | must_change: true | active: true
- angel3@kaviar.com | ANGEL_VIEWER | must_change: true | active: true
- angel4@kaviar.com | ANGEL_VIEWER | must_change: true | active: true
- angel5@kaviar.com | ANGEL_VIEWER | must_change: true | active: true
- angel6@kaviar.com | ANGEL_VIEWER | must_change: true | active: true
- angel7@kaviar.com | ANGEL_VIEWER | must_change: true | active: true
- angel8@kaviar.com | ANGEL_VIEWER | must_change: true | active: true
- angel9@kaviar.com | ANGEL_VIEWER | must_change: true | active: true
- angel10@kaviar.com | ANGEL_VIEWER | must_change: true | active: true

---

## 7. Resumo Final

✅ **12 admins criados/atualizados**  
✅ **2 SUPER_ADMIN**  
✅ **10 ANGEL_VIEWER**  
✅ **must_change_password=true para todos**  
✅ **is_active=true para todos**  
✅ **Senhas hasheadas com bcrypt (cost 10)**  
✅ **Login SUPER_ADMIN funcionando**  
✅ **Login ANGEL_VIEWER funcionando**  
✅ **RBAC validado (403 para ANGEL_VIEWER em PUT)**  

---

## 8. Segurança

- ✅ Senhas temporárias não salvas em documentação/commit
- ✅ Senhas hasheadas com bcrypt cost 10
- ✅ Troca obrigatória no primeiro login
- ✅ RBAC funcionando corretamente
- ✅ Todos os admins ativos

---

## 9. Próximos Passos

1. Distribuir credenciais temporárias para os usuários via canal seguro
2. Orientar sobre troca de senha no primeiro login
3. Validar que todos trocaram a senha após primeiro acesso
4. Monitorar logs de autenticação

---

**Status:** ✅ COMPLETO  
**Data:** 2026-01-31T22:55:00-03:00  
**Executado por:** Kiro CLI (ECS one-off task)
