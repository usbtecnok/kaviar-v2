# RBAC Frontend - Implementação Kaviar

## ✅ Implementado

### 1. Tela de Troca de Senha
**Arquivo**: `frontend-app/src/pages/admin/ChangePassword.jsx`

- Formulário com senha atual + nova senha + confirmação
- Validação mínima de 8 caracteres
- Chama `POST /api/admin/auth/change-password`
- Atualiza localStorage após sucesso
- Redireciona para `/admin`

### 2. Badge "Modo Leitura"
**Arquivo**: `frontend-app/src/components/admin/AdminApp.jsx` (AdminHeader)

```jsx
{isAngelViewer && (
  <Chip 
    label="👁️ Modo Leitura" 
    size="small"
    sx={{ bgcolor: '#FFA726', color: '#000', fontWeight: 'bold' }} 
  />
)}
```

### 3. Proteção de Rotas
**Arquivo**: `frontend-app/src/components/admin/ProtectedAdminRoute.jsx`

- Verifica `mustChangePassword` no localStorage
- Redireciona para `/admin/change-password` se true
- Bloqueia acesso a todas as rotas até trocar senha

### 4. Redirecionamento no Login
**Arquivo**: `frontend-app/src/components/admin/AdminLogin.jsx`

```jsx
if (data.data.mustChangePassword) {
  navigate('/admin/change-password', { replace: true });
} else {
  navigate(from, { replace: true });
}
```

### 5. Hooks e Utilitários

**`hooks/useAdminAuth.js`**:
```js
const { isSuperAdmin, isAngelViewer, mustChangePassword } = useAdminAuth();
```

**`hooks/useRBACInterceptor.js`**:
- Intercepta respostas 403
- Mostra alert "Sem permissão: você está em modo somente leitura"

**`components/admin/RBACButton.jsx`**:
```jsx
<RBACButton onClick={handleApprove}>Aprovar</RBACButton>
// Só renderiza se SUPER_ADMIN
```

## 📝 Próximos Passos (Manual)

### Aplicar RBACButton nas Páginas

Substituir botões de ação em:

1. **DriverApproval.jsx**:
```jsx
import { RBACButton } from '../../components/admin/RBACButton';

<RBACButton onClick={handleApprove}>Aprovar</RBACButton>
<RBACButton onClick={handleReject}>Rejeitar</RBACButton>
```

2. **DriversManagement.jsx**:
```jsx
<RBACButton onClick={handleDelete}>Excluir</RBACButton>
```

3. **CommunitiesManagement.jsx**:
```jsx
<RBACButton onClick={handleSave}>Salvar</RBACButton>
```

4. **Todas as páginas admin** com botões de ação

### Adicionar Interceptor no AdminApp

```jsx
import { useRBACInterceptor } from '../../hooks/useRBACInterceptor';

function AdminHome() {
  useRBACInterceptor(); // Adicionar no topo
  // ...
}
```

## 🧪 Validação

### 1. Testar Troca de Senha
```bash
# Login com SUPER_ADMIN
curl -X POST http://ALB_DNS/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"suporte@usbtecnok.com.br","password":"z4939ia4"}'

# Deve redirecionar para /admin/change-password
# Trocar senha no browser
# Verificar redirecionamento para /admin
```

### 2. Testar Badge
```bash
# Login com ANGEL_VIEWER
# Email: angel1@kaviar.com
# Senha: 12332100

# Verificar badge "👁️ Modo Leitura" no header
```

### 3. Testar Botões Escondidos
```bash
# Login como ANGEL_VIEWER
# Navegar para /admin/drivers/approval
# Verificar que botões Aprovar/Rejeitar NÃO aparecem
```

### 4. Testar Toast 403
```bash
# Login como ANGEL_VIEWER
# Tentar ação via console:
fetch('http://ALB_DNS/api/admin/drivers/approve/123', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer TOKEN' }
})

# Deve mostrar alert "Sem permissão"
```

## 📊 Checklist de Deploy

- [ ] Build frontend: `npm run build`
- [ ] Upload para S3: `aws s3 sync dist/ s3://kaviar-frontend-847895361928/`
- [ ] Invalidar CloudFront: `aws cloudfront create-invalidation --distribution-id E30XJMSBHGZAGN --paths "/*"`
- [ ] Testar em produção: https://d29p7cirgjqbxl.cloudfront.net
- [ ] Validar com SUPER_ADMIN
- [ ] Validar com ANGEL_VIEWER

## 🔑 Credenciais de Teste

**SUPER_ADMIN**:
- suporte@usbtecnok.com.br / z4939ia4
- financeiro@usbtecnok.com.br / z4939ia4

**ANGEL_VIEWER**:
- angel1@kaviar.com / 12332100
- angel2@kaviar.com / 12332100
- ... até angel10@kaviar.com

⚠️ **Todos devem trocar senha no primeiro login**
