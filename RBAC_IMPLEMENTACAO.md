# RBAC ADMIN - IMPLEMENTAÇÃO COMPLETA ✅

## 📦 Arquivos Criados/Modificados

### Backend

1. **prisma/seed-rbac.ts** (NOVO)
   - Cria roles: SUPER_ADMIN, ANGEL_VIEWER
   - Cria 2 SUPER_ADMIN: suporte@ e financeiro@
   - Cria 10 ANGEL_VIEWER: angel1@ até angel10@
   - Senha padrão: `Kaviar2026!Admin`

2. **src/modules/auth/service.ts** (MODIFICADO)
   - Removido whitelist de emails
   - Incluído role no token JWT
   - Incluído role no retorno do login
   - Validação de is_active

3. **src/middlewares/auth.ts** (MODIFICADO)
   - Removido whitelist de emails
   - Adicionado role no req.admin
   - Criado `requireSuperAdmin`
   - Criado `allowReadAccess`
   - Melhorado `requireRole()`

4. **src/middleware/rbac.ts** (NOVO - opcional)
   - Helpers alternativos de RBAC
   - Pode ser usado se preferir separar

### Documentação

5. **RBAC_ADMIN.md** (NOVO)
   - Documentação completa de roles
   - Endpoints protegidos
   - Exemplos de uso
   - Testes
   - Checklist de implementação

6. **deploy-rbac.sh** (NOVO)
   - Script para executar seed
   - Testes de login
   - Validação

---

## 🔐 Roles Implementadas

### SUPER_ADMIN
- `suporte@usbtecnok.com.br`
- `financeiro@usbtecnok.com.br`
- **Poder total**: Todas as operações

### ANGEL_VIEWER
- `angel1@kaviar.com` até `angel10@kaviar.com`
- **Somente leitura**: GET permitido, POST/PUT/DELETE bloqueado

---

## ✅ O Que Foi Implementado

### Backend ✅
- [x] Seed para criar roles e usuários
- [x] AuthService retorna role no token
- [x] authenticateAdmin adiciona role no req.admin
- [x] Helpers: requireSuperAdmin, allowReadAccess
- [x] Validação de is_active
- [x] Remoção de whitelist

### Documentação ✅
- [x] RBAC_ADMIN.md completo
- [x] Exemplos de uso
- [x] Testes documentados
- [x] Checklist de implementação

### Scripts ✅
- [x] seed-rbac.ts
- [x] deploy-rbac.sh

---

## ⏳ O Que Falta Fazer

### Backend
- [ ] Aplicar `requireSuperAdmin` nas rotas de ação:
  - POST /api/admin/drivers/:id/approve
  - POST /api/admin/drivers/:id/reject
  - DELETE /api/admin/*
  - PUT /api/admin/*
  - PATCH /api/admin/compliance/*/approve
  - POST /api/admin/governance/*

- [ ] Aplicar `allowReadAccess` nas rotas de leitura:
  - GET /api/admin/drivers
  - GET /api/admin/passengers
  - GET /api/admin/rides
  - GET /api/admin/metrics
  - GET /api/admin/compliance/*
  - GET /api/admin/governance/*

### Frontend
- [ ] Adicionar role no AuthContext
- [ ] Criar hook useRole() ou similar
- [ ] Esconder botões de ação para ANGEL_VIEWER
- [ ] Mostrar badge "Modo Leitura"
- [ ] Desabilitar formulários para ANGEL_VIEWER
- [ ] Testar Mixed Content (HTTP backend + HTTPS frontend)

### Deploy
- [ ] Executar seed no RDS (via ECS task ou EC2 utility)
- [ ] Trocar senhas padrão
- [ ] Configurar emails reais dos investidores

---

## 🧪 Como Testar

### 1. Executar Seed (Local ou RDS)

**Local** (para desenvolvimento):
```bash
cd backend
npx ts-node prisma/seed-rbac.ts
```

**RDS** (produção - via EC2 utility ou ECS task):
```bash
# Conectar ao EC2 utility ou criar task ECS
# Executar seed apontando para RDS
DATABASE_URL="postgresql://..." npx ts-node prisma/seed-rbac.ts
```

### 2. Testar Login SUPER_ADMIN

```bash
curl -X POST http://kaviar-alb-1494046292.us-east-2.elb.amazonaws.com/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "suporte@usbtecnok.com.br",
    "password": "Kaviar2026!Admin"
  }'
```

**Esperado**:
```json
{
  "success": true,
  "token": "eyJhbGc...",
  "data": {
    "token": "eyJhbGc...",
    "user": {
      "id": "admin-suporte",
      "email": "suporte@usbtecnok.com.br",
      "name": "Suporte USB Tecnok",
      "role": "SUPER_ADMIN"
    }
  }
}
```

### 3. Testar Login ANGEL_VIEWER

```bash
curl -X POST http://kaviar-alb-1494046292.us-east-2.elb.amazonaws.com/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "angel1@kaviar.com",
    "password": "Kaviar2026!Admin"
  }'
```

**Esperado**: Token com `role: "ANGEL_VIEWER"`

### 4. Testar Leitura ANGEL_VIEWER (deve funcionar)

```bash
TOKEN="<angel_viewer_token>"

curl -X GET http://kaviar-alb-1494046292.us-east-2.elb.amazonaws.com/api/admin/drivers \
  -H "Authorization: Bearer $TOKEN"
```

**Esperado**: HTTP 200 (se rota tiver `allowReadAccess`)

### 5. Testar Ação ANGEL_VIEWER (deve bloquear)

```bash
TOKEN="<angel_viewer_token>"

curl -X POST http://kaviar-alb-1494046292.us-east-2.elb.amazonaws.com/api/admin/drivers/123/approve \
  -H "Authorization: Bearer $TOKEN"
```

**Esperado**: HTTP 403
```json
{
  "success": false,
  "error": "Acesso negado. Permissão insuficiente.",
  "requiredRoles": ["SUPER_ADMIN"],
  "userRole": "ANGEL_VIEWER"
}
```

---

## 🚀 Próximos Passos

### 1. Executar Seed no RDS

**Opção A: Via EC2 Utility**
```bash
# Criar EC2 utility na VPC
# Instalar Node.js e dependências
# Executar seed apontando para RDS
```

**Opção B: Via ECS Task**
```bash
# Criar task definition para seed
# Executar task one-time
# Task executa seed e termina
```

### 2. Aplicar RBAC nas Rotas

Editar arquivos de rotas e adicionar middlewares:

```typescript
// Leitura
router.get('/drivers', authenticateAdmin, allowReadAccess, controller.list);

// Ação
router.post('/drivers/:id/approve', authenticateAdmin, requireSuperAdmin, controller.approve);
```

### 3. Atualizar Frontend

```typescript
// AuthContext
const { user } = useAuth();
const isSuperAdmin = user?.role === 'SUPER_ADMIN';

// UI
{isSuperAdmin && <Button>Aprovar</Button>}
{!isSuperAdmin && <Badge>Modo Leitura</Badge>}
```

### 4. Testar Mixed Content

Acessar frontend HTTPS (CloudFront) e verificar se consegue fazer requests para backend HTTP (ALB).

**Possíveis problemas**:
- Mixed Content (HTTPS → HTTP bloqueado)
- CORS

**Solução**:
- Implementar Fase 6 (HTTPS no ALB)
- Ou usar proxy CloudFront → ALB

---

## 📋 Credenciais Padrão

**SUPER_ADMIN**:
- Email: `suporte@usbtecnok.com.br`
- Senha: `Kaviar2026!Admin`

**ANGEL_VIEWER**:
- Email: `angel1@kaviar.com` até `angel10@kaviar.com`
- Senha: `Kaviar2026!Admin`

⚠️ **TROCAR TODAS AS SENHAS EM PRODUÇÃO!**

---

## 🎯 Status Atual

✅ **Backend**: Código implementado, falta aplicar nas rotas  
✅ **Seed**: Criado e testado localmente  
✅ **Documentação**: Completa  
⏳ **Deploy**: Falta executar seed no RDS  
⏳ **Frontend**: Falta implementar UI condicional  
⏳ **Testes**: Falta testar com backend AWS  

---

## 📞 Suporte

Ver `RBAC_ADMIN.md` para documentação completa.
