# EVIDÊNCIAS: INSTRUMENTAÇÃO VALIDAÇÃO CADASTRO (400 DEBUG)

**Data**: 2026-02-10  
**Prioridade**: URGENTE (debug de 400)  
**Commit**: 21519e3

---

## PROBLEMA REPORTADO

**Sintoma**: Cadastro falha com HTTP 400 após fix do API_BASE_URL.

**Evidência**:
```
API_BASE_URL: https://api.kaviar.com.br ✅
XHR POST https://api.kaviar.com.br/api/passenger/onboarding → 400 ❌
```

**Hipótese**: Validação Zod falhando por campo obrigatório faltando ou divergência de nomes entre frontend/backend.

---

## SOLUÇÃO APLICADA

### Backend: Logs Detalhados
```typescript
// backend/src/routes/passenger-onboarding.ts

router.post('/', async (req, res) => {
  try {
    // 1. Log do payload recebido
    console.log('[passenger/onboarding] Received payload:', JSON.stringify(req.body, null, 2));
    
    const { name, email, password, phone, neighborhoodId, communityId, lgpdAccepted } = 
      registerSchema.parse(req.body);
    
    // ... resto do código
  } catch (error) {
    console.error('[passenger/onboarding] Error:', error);
    
    if (error instanceof z.ZodError) {
      // 2. Mapear todos os erros de validação
      const issues = error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message
      }));
      
      // 3. Log dos erros para CloudWatch
      console.error('[passenger/onboarding] Validation errors:', JSON.stringify(issues, null, 2));
      
      // 4. Retornar erro + lista de issues
      return res.status(400).json({
        success: false,
        error: error.errors[0].message,  // Primeira mensagem (compatibilidade)
        issues                            // Array completo de erros
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Erro ao finalizar cadastro'
    });
  }
});
```

### Frontend: Logs + Exibição de Issues
```javascript
// frontend-app/src/pages/onboarding/CompleteOnboarding.jsx

if (userType === 'passenger') {
  const payload = {
    name: clean.name,
    email: clean.email,
    phone: clean.phone,
    password: clean.password,
    neighborhoodId: clean.neighborhoodId,
    communityId: clean.communityId || null,
    lgpdAccepted
  };
  
  // 1. Log do payload antes do POST
  console.log('[CADASTRO] Payload enviado:', payload);
  
  const response = await api.post('/api/passenger/onboarding', payload);
  // ...
}

// Tratamento de erro melhorado
catch (error) {
  // 2. Log do erro completo
  console.error('[CADASTRO] Erro:', error.response?.data || error);
  
  const apiError = error.response?.data;

  // 3. Exibir issues detalhados se disponíveis
  if (apiError?.issues && Array.isArray(apiError.issues)) {
    setError(apiError.issues.map(i => `${i.field}: ${i.message}`).join('\n'));
  } else if (Array.isArray(apiError?.error)) {
    setError(apiError.error.map(e => e.message).join('\n'));
  } else if (typeof apiError?.error === 'string') {
    setError(apiError.error);
  } else {
    setError('Erro ao finalizar cadastro. Verifique os dados informados.');
  }
}
```

---

## VALIDAÇÃO

### 1. Deploy
```
Backend: completed/success (commit 21519e3)
Frontend: completed/success (commit 21519e3)
Version: 21519e3fa4...
```

### 2. Teste com Payload Válido
```bash
$ curl -X POST https://api.kaviar.com.br/api/passenger/onboarding \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Teste Debug",
    "email":"teste.debug+1770749020@kaviar.com.br",
    "password":"Teste1234!",
    "phone":"21999999999",
    "neighborhoodId":"bad07b06-72f5-4c7c-aa8c-99a3d8343416",
    "lgpdAccepted":true
  }'

HTTP/2 201 ✅
{
  "success": true,
  "data": {
    "id": "pass_1770749021371_uj3pli74p",
    "name": "Teste Debug",
    "email": "teste.debug+1770749020@kaviar.com.br",
    "phone": "21999999999"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### 3. Teste com Payload Inválido (Validação Detalhada)
```bash
$ curl -X POST https://api.kaviar.com.br/api/passenger/onboarding \
  -H "Content-Type: application/json" \
  -d '{
    "name":"T",
    "email":"invalido",
    "password":"123",
    "phone":"123",
    "neighborhoodId":"not-uuid",
    "lgpdAccepted":true
  }'

HTTP/2 400 ✅
{
  "success": false,
  "error": "Nome deve ter pelo menos 2 caracteres",
  "issues": [
    {
      "field": "name",
      "message": "Nome deve ter pelo menos 2 caracteres"
    },
    {
      "field": "email",
      "message": "Email inválido"
    },
    {
      "field": "password",
      "message": "Senha deve ter pelo menos 6 caracteres"
    },
    {
      "field": "phone",
      "message": "Telefone inválido"
    },
    {
      "field": "neighborhoodId",
      "message": "Bairro inválido"
    }
  ]
}
```

---

## RUNBOOK: DEBUG 400 NO CADASTRO

### 1. Verificar Logs do Frontend (DevTools Console)
```
Procurar por:
[CADASTRO] Payload enviado: {...}
[CADASTRO] Erro: {...}
```

**Checklist do payload**:
- `name`: string com 2+ caracteres
- `email`: formato válido (xxx@yyy.zzz)
- `password`: 6+ caracteres
- `phone`: 10+ caracteres
- `neighborhoodId`: UUID válido (formato: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
- `communityId`: UUID válido ou null
- `lgpdAccepted`: boolean (true/false)

### 2. Verificar Logs do Backend (CloudWatch)
```
Filtro: [passenger/onboarding]

Logs esperados:
[passenger/onboarding] Received payload: {...}
[passenger/onboarding] Validation errors: [...]  (se 400)
```

### 3. Testar Endpoint Diretamente
```bash
# Pegar UUID de bairro válido
NEIGHBORHOOD_ID=$(curl -sS https://api.kaviar.com.br/api/neighborhoods | jq -r '.data[0].id')

# Testar cadastro
curl -i -X POST https://api.kaviar.com.br/api/passenger/onboarding \
  -H "Content-Type: application/json" \
  -d "{
    \"name\":\"Teste Validacao\",
    \"email\":\"teste+$(date +%s)@kaviar.com.br\",
    \"password\":\"Teste1234!\",
    \"phone\":\"21999999999\",
    \"neighborhoodId\":\"$NEIGHBORHOOD_ID\",
    \"lgpdAccepted\":true
  }"

# Deve retornar: HTTP/2 201 + JSON com success:true
```

### 4. Casos Comuns de 400

| Campo | Problema | Solução |
|-------|----------|---------|
| `neighborhoodId` | String vazia ou "name" ao invés de UUID | Usar UUID de `/api/neighborhoods` |
| `email` | Formato inválido ou já cadastrado | Validar formato + verificar duplicidade |
| `password` | Menos de 6 caracteres | Validar no frontend antes do submit |
| `phone` | Menos de 10 caracteres | Validar formato (DDD + número) |
| `lgpdAccepted` | Undefined ou string | Garantir boolean true/false |

---

## OBSERVAÇÕES

### Schema Zod (Backend)
```typescript
const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  phone: z.string().min(10, 'Telefone inválido'),
  neighborhoodId: z.string().uuid('Bairro inválido'),
  communityId: z.string().uuid().optional().nullable(),
  lgpdAccepted: z.boolean().optional().default(true)
});
```

### Payload Frontend (Esperado)
```javascript
{
  name: "João Silva",                                    // string 2+
  email: "joao@example.com",                             // email válido
  password: "Senha123!",                                 // string 6+
  phone: "21999999999",                                  // string 10+
  neighborhoodId: "bad07b06-72f5-4c7c-aa8c-99a3d8343416", // UUID
  communityId: null,                                     // UUID ou null
  lgpdAccepted: true                                     // boolean
}
```

### Próximos Passos (se 400 persistir)
1. Copiar payload do console `[CADASTRO] Payload enviado:`
2. Copiar erro do console `[CADASTRO] Erro:`
3. Verificar CloudWatch logs do backend
4. Comparar payload enviado vs schema Zod
5. Identificar campo divergente

---

## COMMITS RELACIONADOS

- **ea4e5e0**: Injetou VITE_API_BASE_URL no workflow
- **21519e3**: Adicionou logs detalhados de validação

---

**Status**: ✅ INSTRUMENTADO  
**Deploy**: PROD (backend + frontend)  
**Impacto**: Erros 400 agora retornam feedback detalhado campo-a-campo
