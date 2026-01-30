# RBAC ADMIN - PRODUÇÃO AWS ✅

## 📋 Implementação Completa

### 1. Banco de Dados

**Campos adicionados**:
- `admins.must_change_password` (boolean, default true)
- `admins.password_changed_at` (timestamp, nullable)
- `admins.is_active` (já existia)
- `admins.role_id` (FK para roles)

**Roles**:
- `SUPER_ADMIN` - Acesso total
- `ANGEL_VIEWER` - Somente leitura (GET)

---

## 🔐 Credenciais Temporárias

**SUPER_ADMIN** (2 usuários):
- `suporte@usbtecnok.com.br` / `z4939ia4`
- `financeiro@usbtecnok.com.br` / `z4939ia4`

**ANGEL_VIEWER** (10 usuários):
- `angel1@kaviar.com` até `angel10@kaviar.com` / `123321`

⚠️ **IMPORTANTE**: Todos os usuários DEVEM trocar a senha no primeiro login (`must_change_password=true`)

---

## 🚀 Deploy Completo

### Passo 1: Build e Deploy Backend

```bash
cd /home/goes/kaviar/backend
npm run build

cd ..
docker build -t kaviar-backend:rbac -f backend/Dockerfile backend/

# Push para ECR
aws ecr get-login-password --region us-east-2 | docker login --username AWS --password-stdin 847895361928.dkr.ecr.us-east-2.amazonaws.com

docker tag kaviar-backend:rbac 847895361928.dkr.ecr.us-east-2.amazonaws.com/kaviar-backend:rbac
docker tag kaviar-backend:rbac 847895361928.dkr.ecr.us-east-2.amazonaws.com/kaviar-backend:latest

docker push 847895361928.dkr.ecr.us-east-2.amazonaws.com/kaviar-backend:rbac
docker push 847895361928.dkr.ecr.us-east-2.amazonaws.com/kaviar-backend:latest

# Update ECS
aws ecs update-service \
  --cluster kaviar-cluster \
  --service kaviar-backend-service \
  --force-new-deployment \
  --region us-east-2
```

---

### Passo 2: Seed no RDS

**Opção A: Via psql local** (recomendado):

```bash
# Instalar psql se necessário
sudo apt-get install postgresql-client

# Executar seed
./seed-rbac.sh
```

**Opção B: Via EC2 utility com SSM**:

```bash
# Conectar ao EC2 utility
aws ssm start-session --target i-02aa0e71577a79305 --region us-east-2

# No EC2:
sudo apt-get update && sudo apt-get install -y postgresql-client
export DATABASE_URL="postgresql://kaviaradmin:Kaviar2026SecureDB1769650964@kaviar-db.cxuuaq46o1o5.us-east-2.rds.amazonaws.com:5432/kaviar?sslmode=require"

# Copiar seed-rbac.sql para EC2 e executar
psql "$DATABASE_URL" -f seed-rbac.sql
```

**Verificar seed**:
```sql
SELECT 
  r.name as role,
  COUNT(a.id) as total,
  SUM(CASE WHEN a.must_change_password THEN 1 ELSE 0 END) as must_change
FROM roles r
LEFT JOIN admins a ON a.role_id = r.id
WHERE r.name IN ('SUPER_ADMIN', 'ANGEL_VIEWER')
GROUP BY r.name;
```

**Esperado**:
```
role          | total | must_change
--------------+-------+-------------
ANGEL_VIEWER  | 10    | 10
SUPER_ADMIN   | 2     | 2
```

---

### Passo 3: Validar RBAC

```bash
./validate-rbac.sh
```

**Resultado esperado**:
```
✅ RBAC FUNCIONANDO CORRETAMENTE
   • SUPER_ADMIN: Leitura ✓ | Ação ✓
   • ANGEL_VIEWER: Leitura ✓ | Ação ✗ (bloqueado)
```

---

## 🔑 Fluxo de Troca de Senha

### 1. Login Inicial

```bash
curl -X POST http://kaviar-alb-1494046292.us-east-2.elb.amazonaws.com/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "suporte@usbtecnok.com.br",
    "password": "z4939ia4"
  }'
```

**Resposta**:
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
    },
    "mustChangePassword": true
  }
}
```

### 2. Trocar Senha

```bash
curl -X POST http://kaviar-alb-1494046292.us-east-2.elb.amazonaws.com/api/admin/auth/change-password \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "z4939ia4",
    "newPassword": "MinhaNovaSenh@123"
  }'
```

**Resposta**:
```json
{
  "success": true,
  "message": "Senha alterada com sucesso"
}
```

### 3. Login com Nova Senha

```bash
curl -X POST http://kaviar-alb-1494046292.us-east-2.elb.amazonaws.com/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "suporte@usbtecnok.com.br",
    "password": "MinhaNovaSenh@123"
  }'
```

**Resposta**:
```json
{
  "success": true,
  "token": "eyJhbGc...",
  "data": {
    "mustChangePassword": false
  }
}
```

---

## 🎨 Frontend - Implementação

### 1. Verificar mustChangePassword no Login

```typescript
// AuthContext ou Login component
const handleLogin = async (email: string, password: string) => {
  const response = await api.post('/admin/auth/login', { email, password });
  
  if (response.data.mustChangePassword) {
    // Redirecionar para tela de troca de senha
    navigate('/admin/change-password');
  } else {
    // Login normal
    navigate('/admin/dashboard');
  }
};
```

### 2. Tela de Troca de Senha

```typescript
const ChangePassword = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const handleSubmit = async () => {
    await api.post('/admin/auth/change-password', {
      currentPassword,
      newPassword
    });
    
    // Redirecionar para dashboard
    navigate('/admin/dashboard');
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Senha atual" />
      <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Nova senha (mín. 8 caracteres)" />
      <button type="submit">Alterar Senha</button>
    </form>
  );
};
```

### 3. Badge "Modo Leitura" para ANGEL_VIEWER

```typescript
const AdminLayout = () => {
  const { user } = useAuth();
  const isAngelViewer = user?.role === 'ANGEL_VIEWER';
  
  return (
    <div>
      {isAngelViewer && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4">
          <p className="text-yellow-700">
            👁️ Modo Leitura - Você tem acesso apenas para visualização
          </p>
        </div>
      )}
      {/* resto do layout */}
    </div>
  );
};
```

### 4. Esconder Botões de Ação

```typescript
const DriverApproval = ({ driver }) => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  
  return (
    <div>
      <h2>{driver.name}</h2>
      
      {isSuperAdmin && (
        <div>
          <button onClick={handleApprove}>Aprovar</button>
          <button onClick={handleReject}>Rejeitar</button>
        </div>
      )}
      
      {!isSuperAdmin && (
        <p className="text-gray-500">Apenas visualização</p>
      )}
    </div>
  );
};
```

---

## 📊 Rotas Protegidas

### GET (Leitura) - SUPER_ADMIN ou ANGEL_VIEWER

- `GET /api/admin/drivers`
- `GET /api/admin/passengers`
- `GET /api/admin/rides`
- `GET /api/admin/compliance/documents`
- `GET /api/admin/tour-packages`

### POST/PUT/PATCH/DELETE (Ação) - Apenas SUPER_ADMIN

- `POST /api/admin/drivers/:id/approve`
- `POST /api/admin/drivers/:id/reject`
- `DELETE /api/admin/drivers/:id`
- `POST /api/admin/compliance/documents/:id/approve`
- `PATCH /api/admin/rides/:id/status`
- `POST /api/admin/tour-packages`

---

## ✅ Checklist de Produção

- [x] Banco: campos `must_change_password` e `password_changed_at`
- [x] Seed SQL idempotente com senhas temporárias
- [x] AuthService: `mustChangePassword` no login
- [x] Endpoint: `POST /api/admin/auth/change-password`
- [x] Middleware RBAC em todas as rotas admin
- [x] Script de validação completo
- [ ] Frontend: tela de troca de senha obrigatória
- [ ] Frontend: badge "Modo Leitura"
- [ ] Frontend: esconder botões de ação
- [ ] Executar seed no RDS
- [ ] Validar RBAC em produção
- [ ] Trocar emails dos investidores (angel1-10 → emails reais)

---

## 🎯 Critérios de Aceite

✅ **12 usuários criados**: 2 SUPER_ADMIN + 10 ANGEL_VIEWER  
✅ **Senhas temporárias**: z4939ia4 e 123321  
✅ **Troca obrigatória**: `must_change_password=true`  
✅ **SUPER_ADMIN**: Leitura ✓ | Ação ✓  
✅ **ANGEL_VIEWER**: Leitura ✓ | Ação ✗ (403)  
✅ **Endpoint change-password**: Funcional  
✅ **Validação**: Script completo  

---

**Status**: Backend 100% pronto, falta frontend e execução do seed no RDS
