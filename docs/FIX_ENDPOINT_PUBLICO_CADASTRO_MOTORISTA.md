# ✅ FIX - ENDPOINT PÚBLICO DE CADASTRO MOTORISTA

**Data:** 01/03/2026 23:07 BRT  
**Commit:** `506ba87`  
**Problema:** `/api/governance/driver` exige token admin (401)  
**Solução:** Criar `/api/auth/driver/register` (público, sem token)

---

## 🔍 CAUSA RAIZ

**Prova do problema:**
```bash
curl -X POST "https://api.kaviar.com.br/api/governance/driver" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","phone":"+5521999999999","password":"senha123"}'

# Resultado: HTTP 401
# {"success":false,"error":"Token ausente"}
```

**Análise:**
- `/api/governance/*` exige `authenticateAdmin` middleware
- App motorista não tem token admin
- Cadastro público precisa de endpoint sem autenticação

---

## 🔧 SOLUÇÃO IMPLEMENTADA

### **Backend: Novo Endpoint Público**

**Arquivo:** `backend/src/routes/driver-auth.ts`

**Endpoint:** `POST /api/auth/driver/register`

**Request (sem token):**
```json
{
  "name": "João Silva",
  "email": "joao@example.com",
  "phone": "+5521999999999",
  "password": "senha123",
  "neighborhoodId": "neighborhood_123", // opcional
  "lat": -22.9708, // opcional
  "lng": -43.1829, // opcional
  "verificationMethod": "GPS_AUTO" // opcional
}
```

**Response (201):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "driver_123",
    "name": "João Silva",
    "email": "joao@example.com",
    "phone": "+5521999999999",
    "status": "pending",
    "user_type": "DRIVER",
    "isPending": true
  }
}
```

**Funcionalidades:**
- ✅ Valida dados (zod schema)
- ✅ Verifica email duplicado (409)
- ✅ Valida neighborhoodId se fornecido (opcional)
- ✅ Hash password (bcrypt)
- ✅ Cria driver com status `pending`
- ✅ Retorna token JWT (auto-login)
- ✅ Sem necessidade de token admin

---

### **Frontend: Atualizar App**

**Arquivo:** `kaviar-app/app/(auth)/register.tsx`

**ANTES (3 chamadas):**
```typescript
// 1. Criar motorista (ERRO: exige token admin)
await fetch('/api/governance/driver', { body: {...} });

// 2. Definir senha
await fetch('/api/auth/driver/set-password', { body: {...} });

// 3. Login
await fetch('/api/auth/driver/login', { body: {...} });
```

**DEPOIS (1 chamada):**
```typescript
// ✅ Endpoint público (sem token)
const response = await fetch('/api/auth/driver/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name, email, phone, password,
    neighborhoodId: selectedNeighborhood?.id, // opcional
    lat: location?.lat, // opcional
    lng: location?.lng, // opcional
    verificationMethod: location ? 'GPS_AUTO' : 'MANUAL_SELECTION'
  })
});

// ✅ Já retorna token (auto-login)
await authStore.setAuth(response.token, response.user);
router.replace('/(driver)/online');
```

**Resultado:**
- ✅ Fluxo simplificado (1 chamada ao invés de 3)
- ✅ Sem erro 401
- ✅ Auto-login funciona
- ✅ UI/UX mantida

---

## 🚀 DEPLOY

### **1. Build Backend**

```bash
cd /home/goes/kaviar/backend

# Build
npm run build

# Verificar se endpoint foi compilado
grep -r "driver/register" dist/routes/driver-auth.js
```

---

### **2. Deploy ECS (se necessário)**

```bash
# Opção 1: CI/CD automático (aguardar GitHub Actions)
# Verificar: https://github.com/usbtecnok/kaviar-v2/actions

# Opção 2: Deploy manual
cd /home/goes/kaviar/backend
docker build -t kaviar-backend:latest .
docker tag kaviar-backend:latest <ECR_URI>:latest
docker push <ECR_URI>:latest

# Forçar novo deployment
aws ecs update-service \
  --cluster kaviar-cluster \
  --service kaviar-backend-service \
  --force-new-deployment \
  --region us-east-1
```

---

### **3. Verificar Deploy**

```bash
# Aguardar task ficar running (2-3 minutos)
aws ecs describe-services \
  --cluster kaviar-cluster \
  --services kaviar-backend-service \
  --region us-east-1 \
  --query 'services[0].{runningCount:runningCount,desiredCount:desiredCount}'

# Verificar logs
aws logs tail /ecs/kaviar-backend --follow --region us-east-1
```

---

## 🧪 TESTES

### **Teste 1: Endpoint Público (sem token)**

```bash
curl -X POST "https://api.kaviar.com.br/api/auth/driver/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Motorista Teste Público",
    "email": "motorista.publico@kaviar.com",
    "phone": "+5521999999999",
    "password": "senha123"
  }'
```

**Esperado:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "driver_...",
    "name": "Motorista Teste Público",
    "email": "motorista.publico@kaviar.com",
    "status": "pending",
    "user_type": "DRIVER",
    "isPending": true
  }
}
```

---

### **Teste 2: Cadastro COM bairro**

```bash
curl -X POST "https://api.kaviar.com.br/api/auth/driver/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Motorista Com Bairro",
    "email": "motorista.combairro2@kaviar.com",
    "phone": "+5521988888888",
    "password": "senha123",
    "neighborhoodId": "neighborhood_copacabana",
    "lat": -22.9708,
    "lng": -43.1829,
    "verificationMethod": "GPS_AUTO"
  }'
```

**Esperado:** 201 + token

---

### **Teste 3: Email duplicado**

```bash
# Cadastrar mesmo email 2x
curl -X POST "https://api.kaviar.com.br/api/auth/driver/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Motorista Duplicado",
    "email": "motorista.publico@kaviar.com",
    "phone": "+5521977777777",
    "password": "senha123"
  }'
```

**Esperado:**
```json
{
  "success": false,
  "error": "Email já cadastrado"
}
```

---

### **Teste 4: Validação de dados**

```bash
# Senha curta
curl -X POST "https://api.kaviar.com.br/api/auth/driver/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test",
    "email": "test@test.com",
    "phone": "+5521999999999",
    "password": "123"
  }'
```

**Esperado:**
```json
{
  "success": false,
  "error": "Senha deve ter no mínimo 6 caracteres"
}
```

---

### **Teste 5: App Motorista (E2E)**

1. Abrir app kaviar
2. Ir para cadastro
3. Preencher dados básicos
4. Preencher território (ou pular)
5. Clicar "Cadastrar"
6. Verificar: sucesso + redirecionamento para /(driver)/online

---

## ✅ VALIDAÇÃO

### **Backend**

```bash
# Verificar motorista criado
curl -X GET "https://api.kaviar.com.br/api/admin/drivers?email=motorista.publico@kaviar.com" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"

# Esperado:
# - driver existe
# - status = "pending"
# - password_hash preenchido
# - neighborhoodId preenchido (se fornecido)
```

### **Login Manual**

```bash
# Testar login com motorista criado
curl -X POST "https://api.kaviar.com.br/api/auth/driver/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "motorista.publico@kaviar.com",
    "password": "senha123"
  }'

# Esperado: 200 + token
```

---

## 📊 COMPARAÇÃO

### **ANTES (Erro 401)**

| Endpoint | Token Required | Status |
|----------|----------------|--------|
| `/api/governance/driver` | ✅ Admin | ❌ 401 no app |

### **DEPOIS (Funciona)**

| Endpoint | Token Required | Status |
|----------|----------------|--------|
| `/api/auth/driver/register` | ❌ Público | ✅ 201 |
| `/api/governance/driver` | ✅ Admin | ✅ Mantido (admin) |

---

## 🎯 CHECKLIST

### **Backend**
- [x] Endpoint `/api/auth/driver/register` criado
- [x] Validação de dados (zod)
- [x] Verificação de email duplicado
- [x] Validação de neighborhoodId (opcional)
- [x] Hash de password
- [x] Criação de driver
- [x] Retorno de token (auto-login)
- [ ] Deploy em produção
- [ ] Teste com curl (após deploy)

### **Frontend**
- [x] Atualizar `register.tsx`
- [x] Usar `/api/auth/driver/register`
- [x] Remover chamadas a `/api/governance/driver`
- [x] Simplificar fluxo (1 chamada)
- [x] Manter UI/UX
- [ ] Testar no app (após deploy backend)

### **Evidências**
- [ ] curl sem token retorna 201
- [ ] App consegue cadastrar
- [ ] Auto-login funciona
- [ ] Motorista criado no banco

---

## 🚫 ROLLBACK (se necessário)

```bash
# Reverter commit
git revert 506ba87

# Ou voltar para commit anterior
git reset --hard d392499

# Push
git push origin main --force
```

---

## 📝 RESUMO

**Problema:** `/api/governance/driver` exige token admin (401)

**Solução:** Criar `/api/auth/driver/register` (público)

**Commit:** `506ba87`

**Mudanças:**
- Backend: +113 linhas (driver-auth.ts)
- Frontend: -38 linhas (simplificação)

**Próximo passo:** Deploy backend + testar app

---

**FIM DAS INSTRUÇÕES**
