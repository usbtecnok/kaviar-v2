# RBAC ADMIN - Role-Based Access Control

## 📋 Roles Implementadas

### SUPER_ADMIN
**Poder total** - Pode executar todas as ações administrativas

**Usuários**:
- `suporte@usbtecnok.com.br`
- `financeiro@usbtecnok.com.br`

**Permissões**:
- ✅ Visualizar dashboards e relatórios
- ✅ Aprovar/rejeitar motoristas
- ✅ Editar configurações
- ✅ Criar/editar/excluir bairros e geofences
- ✅ Alterar preços
- ✅ Gerenciar usuários admin
- ✅ Todas as operações (GET, POST, PUT, PATCH, DELETE)

---

### ANGEL_VIEWER
**Somente leitura** - Investidores anjo podem visualizar mas não modificar

**Usuários** (10 investidores):
- `angel1@kaviar.com` até `angel10@kaviar.com`

**Permissões**:
- ✅ Visualizar dashboards e relatórios
- ✅ Visualizar lista de motoristas
- ✅ Visualizar lista de passageiros
- ✅ Visualizar corridas
- ✅ Visualizar métricas financeiras
- ✅ Visualizar configurações (read-only)
- ❌ Aprovar/rejeitar motoristas
- ❌ Editar configurações
- ❌ Criar/editar/excluir dados
- ❌ Alterar preços
- ❌ Operações destrutivas

---

## 🔐 Implementação Backend

### Middleware de Autenticação

```typescript
import { authenticateAdmin } from '../middlewares/auth';

// Todas as rotas admin requerem autenticação
router.use(authenticateAdmin);
```

### Middleware de Autorização

```typescript
import { requireSuperAdmin, allowReadAccess } from '../middlewares/auth';

// Apenas SUPER_ADMIN
router.post('/drivers/:id/approve', requireSuperAdmin, controller.approve);

// SUPER_ADMIN ou ANGEL_VIEWER
router.get('/drivers', allowReadAccess, controller.list);
```

### Helpers Disponíveis

```typescript
// Exigir SUPER_ADMIN
requireSuperAdmin

// Permitir leitura (SUPER_ADMIN ou ANGEL_VIEWER)
allowReadAccess

// Customizado
requireRole(['SUPER_ADMIN', 'CUSTOM_ROLE'])
```

---

## 🛣️ Endpoints Protegidos

### Leitura (GET) - SUPER_ADMIN ou ANGEL_VIEWER

```
GET /api/admin/drivers
GET /api/admin/drivers/:id
GET /api/admin/passengers
GET /api/admin/rides
GET /api/admin/metrics
GET /api/admin/compliance/documents
GET /api/admin/tour-packages
GET /api/admin/governance/neighborhoods
GET /api/admin/governance/geofences
```

### Ações (POST/PUT/PATCH/DELETE) - Apenas SUPER_ADMIN

```
POST   /api/admin/drivers/:id/approve
POST   /api/admin/drivers/:id/reject
DELETE /api/admin/drivers/:id
PUT    /api/admin/governance/neighborhoods/:id
POST   /api/admin/governance/geofences
DELETE /api/admin/governance/geofences/:id
PATCH  /api/admin/compliance/documents/:id/approve
PATCH  /api/admin/compliance/documents/:id/reject
PUT    /api/admin/tour-packages/:id
POST   /api/admin/pricing
```

---

## 🎨 Frontend Admin

### Verificação de Role

```typescript
// Obter role do usuário logado
const { user } = useAuth();
const isSuperAdmin = user?.role === 'SUPER_ADMIN';
const isAngelViewer = user?.role === 'ANGEL_VIEWER';
```

### Condicional de UI

```tsx
{isSuperAdmin && (
  <Button onClick={handleApprove}>Aprovar</Button>
)}

{isAngelViewer && (
  <Badge>Modo Leitura</Badge>
)}
```

### Desabilitar Ações

```tsx
<Button 
  disabled={isAngelViewer}
  onClick={handleDelete}
>
  Excluir
</Button>
```

---

## 🔧 Setup e Seed

### 1. Executar Seed

```bash
cd backend
npx ts-node prisma/seed-rbac.ts
```

**Output esperado**:
```
🔐 Seeding RBAC Admin Users...
✓ Roles criadas
✓ SUPER_ADMIN criados (2)
✓ ANGEL_VIEWER criados (10)

📋 Credenciais padrão:
   Email: suporte@usbtecnok.com.br
   Senha: Kaviar2026!Admin

⚠️  TROCAR SENHAS EM PRODUÇÃO!
```

### 2. Credenciais Padrão

**SUPER_ADMIN**:
- Email: `suporte@usbtecnok.com.br`
- Senha: `Kaviar2026!Admin`

**ANGEL_VIEWER**:
- Email: `angel1@kaviar.com` até `angel10@kaviar.com`
- Senha: `Kaviar2026!Admin`

⚠️ **IMPORTANTE**: Trocar todas as senhas em produção!

---

## 🧪 Testes

### Teste 1: Login SUPER_ADMIN

```bash
curl -X POST http://localhost:3001/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "suporte@usbtecnok.com.br",
    "password": "Kaviar2026!Admin"
  }'
```

**Esperado**: Token JWT com `role: "SUPER_ADMIN"`

### Teste 2: Login ANGEL_VIEWER

```bash
curl -X POST http://localhost:3001/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "angel1@kaviar.com",
    "password": "Kaviar2026!Admin"
  }'
```

**Esperado**: Token JWT com `role: "ANGEL_VIEWER"`

### Teste 3: ANGEL_VIEWER - Leitura OK

```bash
TOKEN="<angel_viewer_token>"

curl -X GET http://localhost:3001/api/admin/drivers \
  -H "Authorization: Bearer $TOKEN"
```

**Esperado**: HTTP 200 com lista de motoristas

### Teste 4: ANGEL_VIEWER - Ação Bloqueada

```bash
TOKEN="<angel_viewer_token>"

curl -X POST http://localhost:3001/api/admin/drivers/123/approve \
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

### Teste 5: SUPER_ADMIN - Ação OK

```bash
TOKEN="<super_admin_token>"

curl -X POST http://localhost:3001/api/admin/drivers/123/approve \
  -H "Authorization: Bearer $TOKEN"
```

**Esperado**: HTTP 200 com sucesso

---

## 📝 Checklist de Implementação

### Backend
- [x] Migration/Seed para roles
- [x] Atualizar AuthService para incluir role no token
- [x] Atualizar authenticateAdmin para adicionar role no req.admin
- [x] Criar helpers: requireSuperAdmin, allowReadAccess
- [ ] Aplicar requireSuperAdmin em rotas de ação
- [ ] Aplicar allowReadAccess em rotas de leitura

### Frontend
- [ ] Adicionar role no context de autenticação
- [ ] Criar hook useRole() ou similar
- [ ] Esconder botões de ação para ANGEL_VIEWER
- [ ] Mostrar badge "Modo Leitura"
- [ ] Desabilitar formulários para ANGEL_VIEWER

### Testes
- [ ] Testar login SUPER_ADMIN
- [ ] Testar login ANGEL_VIEWER
- [ ] Testar leitura ANGEL_VIEWER (deve funcionar)
- [ ] Testar ação ANGEL_VIEWER (deve retornar 403)
- [ ] Testar ação SUPER_ADMIN (deve funcionar)

---

## 🔒 Segurança

### Princípios
1. **Least Privilege**: ANGEL_VIEWER tem apenas permissões de leitura
2. **Defense in Depth**: Validação no backend E frontend
3. **Explicit Deny**: Sem role = sem acesso
4. **Audit Trail**: Todas as ações logadas com role do usuário

### Boas Práticas
- ✅ Validar role no backend (nunca confiar apenas no frontend)
- ✅ Retornar 403 (Forbidden) para ações não autorizadas
- ✅ Incluir role no token JWT
- ✅ Verificar is_active antes de autenticar
- ✅ Trocar senhas padrão em produção

---

## 🚀 Próximos Passos

1. **Aplicar RBAC nas rotas existentes**:
   - Identificar rotas de leitura → `allowReadAccess`
   - Identificar rotas de ação → `requireSuperAdmin`

2. **Atualizar frontend**:
   - Adicionar role no AuthContext
   - Implementar UI condicional
   - Testar fluxos completos

3. **Produção**:
   - Trocar senhas padrão
   - Configurar emails reais dos investidores
   - Testar com usuários reais

4. **Auditoria**:
   - Adicionar logging de ações por role
   - Criar relatório de acessos
   - Monitorar tentativas de acesso negado
