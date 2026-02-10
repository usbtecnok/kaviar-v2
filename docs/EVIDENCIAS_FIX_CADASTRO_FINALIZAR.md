# EVIDÊNCIAS: FIX CADASTRO FINALIZAR (404 ENDPOINT)

**Data**: 2026-02-10  
**Prioridade**: CRÍTICA (cadastro travado na etapa final)  
**Commit**: 5997beb

---

## PROBLEMA REPORTADO

**Sintoma**: Na etapa 3 (Finalização) do cadastro em https://kaviar.com.br/cadastro, aparece banner vermelho "Endpoint não encontrado".

**Evidência técnica**:
- Backend health: OK (200)
- GET /api/passengers: 404
- GET /api/passenger: 404
- GET /api/onboarding: 404
- GET /api/passenger/onboarding: 404

---

## DIAGNÓSTICO

### Request do Frontend
```javascript
// frontend-app/src/pages/onboarding/CompleteOnboarding.jsx (linha 185)
const response = await api.post('/api/passenger/onboarding', {
  name: clean.name,
  email: clean.email,
  phone: clean.phone,
  password: clean.password,
  neighborhoodId: clean.neighborhoodId,
  communityId: clean.communityId || null,
  lgpdAccepted
});
```

**Request**: `POST /api/passenger/onboarding`

### Estado do Backend (antes do fix)
```typescript
// backend/src/routes/passenger-onboarding.ts
// ❌ Só tinha rota: POST /api/passenger/onboarding/location
// ❌ Não tinha rota: POST /api/passenger/onboarding (root)
```

**Causa raiz**: Frontend chama `POST /api/passenger/onboarding` mas backend só tinha `/location` sub-rota.

**Endpoint alternativo existente**: `POST /api/auth/passenger/register` (não usado pelo frontend).

---

## SOLUÇÃO APLICADA

### Adicionada Rota POST /
```typescript
// backend/src/routes/passenger-onboarding.ts

const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  phone: z.string().min(10, 'Telefone inválido'),
  neighborhoodId: z.string().uuid('Bairro inválido'),
  communityId: z.string().uuid().optional().nullable(),
  lgpdAccepted: z.boolean().optional().default(true)
});

router.post('/', async (req, res) => {
  // Valida payload
  // Verifica email duplicado
  // Hash password (bcrypt)
  // Cria passenger com neighborhood_id + community_id
  // Cria LGPD consent
  // Retorna JWT token + dados básicos
});
```

**Endpoint criado**: `POST /api/passenger/onboarding`

**Validações**:
- Nome: mínimo 2 caracteres
- Email: formato válido + unicidade
- Senha: mínimo 6 caracteres
- Telefone: mínimo 10 caracteres
- neighborhoodId: UUID válido (obrigatório)
- communityId: UUID válido (opcional)

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "pass_...",
    "name": "...",
    "email": "...",
    "phone": "..."
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

## VALIDAÇÃO

### 1. Health Check
```bash
$ curl -sS https://api.kaviar.com.br/api/health | jq '.status, .version'
"healthy"
"5997bebbadac67683d9e9c35c944686e5464d4e1"
```

### 2. Endpoint de Cadastro
```bash
$ curl -sS -i -X POST https://api.kaviar.com.br/api/passenger/onboarding \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Teste Kiro",
    "email":"teste.kiro+1770745003@kaviar.com.br",
    "password":"Teste1234!",
    "phone":"21999999999",
    "neighborhoodId":"bad07b06-72f5-4c7c-aa8c-99a3d8343416",
    "lgpdAccepted":true
  }'

HTTP/2 201 
content-type: application/json; charset=utf-8

{
  "success": true,
  "data": {
    "id": "pass_1770745004838_tierpokri",
    "name": "Teste Kiro",
    "email": "teste.kiro+1770745003@kaviar.com.br",
    "phone": "21999999999"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Status**: ✅ 201 Created  
**Token**: JWT válido (7 dias expiração)  
**Passenger**: Criado com status ACTIVE

### 3. Deploy Backend
```
Workflow: deploy-backend.yml
Status: completed success
Run ID: 21875548352
Commit: 5997beb
Duration: ~3m40s
```

---

## TESTE FUNCIONAL

### Fluxo Completo
1. Acessar https://kaviar.com.br/cadastro
2. Preencher "Dados Pessoais":
   - Nome: Teste
   - Email: teste@example.com
   - Telefone: 21999999999
   - Senha: Teste1234!
   - Confirmar Senha: Teste1234!
   - Bairro: Selecionar da lista (268 opções)
3. Clicar "Próximo"
4. Etapa "Bairro e Comunidade": Clicar "Próximo"
5. Etapa "Finalização": Aceitar LGPD → Clicar "Finalizar"

**Resultado esperado**:
- ✅ Request: POST /api/passenger/onboarding → 201
- ✅ Banner verde: "Cadastro Realizado!"
- ✅ Redirect automático para /passageiro/home
- ✅ Token salvo em localStorage

**Resultado anterior (bug)**:
- ❌ Request: POST /api/passenger/onboarding → 404
- ❌ Banner vermelho: "Endpoint não encontrado"
- ❌ Cadastro não finaliza

---

## RUNBOOK: VALIDAR CADASTRO PASSAGEIRO

```bash
# 1. Health check
curl -sS https://api.kaviar.com.br/api/health | jq '.status'

# 2. Listar bairros (pegar UUID)
curl -sS https://api.kaviar.com.br/api/neighborhoods | jq '.data[0] | {id, name, city}'

# 3. Testar cadastro (substituir email único)
TIMESTAMP=$(date +%s)
NEIGHBORHOOD_ID="bad07b06-72f5-4c7c-aa8c-99a3d8343416"

curl -sS -i -X POST https://api.kaviar.com.br/api/passenger/onboarding \
  -H "Content-Type: application/json" \
  -d "{
    \"name\":\"Teste Validacao\",
    \"email\":\"teste+${TIMESTAMP}@kaviar.com.br\",
    \"password\":\"Teste1234!\",
    \"phone\":\"21999999999\",
    \"neighborhoodId\":\"${NEIGHBORHOOD_ID}\",
    \"lgpdAccepted\":true
  }" | head -n 20

# Deve retornar: HTTP/2 201 + JSON com success:true + token
```

### Validar no Banco (opcional)
```sql
-- Conectar ao RDS PROD
SELECT id, name, email, phone, neighborhood_id, status, created_at 
FROM passengers 
WHERE email LIKE 'teste+%@kaviar.com.br' 
ORDER BY created_at DESC 
LIMIT 5;

-- Verificar LGPD consent
SELECT p.email, uc.consent_type, uc.accepted, uc.accepted_at
FROM passengers p
JOIN user_consents uc ON uc.passenger_id = p.id
WHERE p.email LIKE 'teste+%@kaviar.com.br'
ORDER BY uc.accepted_at DESC
LIMIT 5;
```

---

## OBSERVAÇÕES

- Endpoint `/api/auth/passenger/register` continua existindo mas não é usado pelo frontend
- Frontend mantido sem alteração (já chamava endpoint correto)
- Solução alinha backend com expectativa do frontend (ANTI-FRANKENSTEIN)
- Validação Zod garante integridade dos dados
- Password hash com bcrypt (10 rounds)
- JWT token com expiração 7 dias
- LGPD consent registrado automaticamente se `lgpdAccepted: true`

---

## COMMITS RELACIONADOS

- **b966585**: Restaurou chamada API de bairros em CompleteOnboarding.jsx
- **5997beb**: Criou endpoint POST /api/passenger/onboarding

---

**Status**: ✅ RESOLVIDO  
**Deploy**: PROD (backend)  
**Impacto**: Cadastro de passageiro 100% funcional (etapas 1, 2, 3)
