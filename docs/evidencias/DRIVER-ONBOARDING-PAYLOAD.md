# Driver Onboarding - Payload Correto

## Schema Zod (Backend)

```typescript
const driverOnboardingSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),              // OBRIGATÓRIO
  email: z.string().email('Email inválido'),                  // OBRIGATÓRIO
  phone: z.string().optional(),                               // OPCIONAL
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'), // OBRIGATÓRIO
  neighborhoodId: z.string().min(1, 'Bairro é obrigatório'),  // OBRIGATÓRIO
  communityId: z.string().optional(),                         // OPCIONAL
  familyBonusAccepted: z.boolean().optional(),                // OPCIONAL
  familyProfile: z.string().optional()                        // OPCIONAL
});
```

## Campos Obrigatórios

1. `name` - Nome completo do motorista
2. `email` - Email válido
3. `password` - Senha com mínimo 6 caracteres
4. `neighborhoodId` - UUID do bairro

## Campos Opcionais

1. `phone` - Telefone
2. `communityId` - UUID ou slug da comunidade
3. `familyBonusAccepted` - Boolean
4. `familyProfile` - String

## Payload Mínimo Válido

```json
{
  "name": "João Silva",
  "email": "joao.silva@example.com",
  "password": "senha123",
  "neighborhoodId": "default-neighborhood"
}
```

## Payload Completo

```json
{
  "name": "João Silva",
  "email": "joao.silva@example.com",
  "phone": "21987654321",
  "password": "senha123",
  "neighborhoodId": "550e8400-e29b-41d4-a716-446655440000",
  "communityId": "rocinha",
  "familyBonusAccepted": true,
  "familyProfile": "Pai de família"
}
```

## cURL de Teste

### Produção

```bash
curl -X POST https://api.kaviar.com.br/api/driver/onboarding \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João Teste",
    "email": "joao.teste@example.com",
    "password": "senha123",
    "neighborhoodId": "default-neighborhood"
  }'
```

### Local

```bash
curl -X POST http://localhost:3000/api/driver/onboarding \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João Teste",
    "email": "joao.teste@example.com",
    "password": "senha123",
    "neighborhoodId": "default-neighborhood"
  }'
```

## Response Esperado

### Sucesso (200)

```json
{
  "success": true,
  "message": "Cadastro realizado com sucesso",
  "data": {
    "id": "driver-1708380000000",
    "name": "João Teste",
    "email": "joao.teste@example.com",
    "status": "pending"
  }
}
```

### Erro - Email já existe (400)

```json
{
  "success": false,
  "error": "Email já cadastrado"
}
```

### Erro - Campo obrigatório faltando (400)

```json
{
  "success": false,
  "error": "Senha deve ter pelo menos 6 caracteres",
  "field": "password",
  "details": [
    {
      "field": "password",
      "message": "Senha deve ter pelo menos 6 caracteres"
    }
  ]
}
```

## Validação no PWA

O componente `RequestAccess.jsx` agora envia todos os campos obrigatórios:

```javascript
await requestDriverAccess({
  name: formData.name,
  email: formData.email,
  phone: formData.phone || undefined,
  password: formData.password,
  neighborhoodId: formData.neighborhoodId
});
```

## Melhorias no Backend

Erro agora retorna:
- `error`: Mensagem do primeiro erro
- `field`: Nome do campo com erro
- `details`: Array com todos os erros

Isso permite ao frontend mostrar mensagens mais específicas.

## Teste Real (Produção)

```bash
# Teste com payload correto
curl -X POST https://api.kaviar.com.br/api/driver/onboarding \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Driver MVP",
    "email": "test-driver-mvp@kaviar.com",
    "password": "senha123",
    "neighborhoodId": "default-neighborhood"
  }'
```

**Resultado esperado:** 200 com `{ success: true, data: { id, name, email, status: "pending" } }`

## Notas

1. Driver criado com `status: "pending"` (aguarda aprovação admin)
2. Password é hasheado com bcrypt antes de salvar
3. `neighborhoodId` pode ser "default-neighborhood" para testes
4. `communityId` aceita UUID ou slug (ex: "rocinha")
5. Rate limit: não há (endpoint público)
