# Fix: Campos do Veículo no Admin

## Causa Raiz

**Localização:** `backend/src/modules/admin/service.ts` - método `getDrivers()`

**Problema:** A query de listagem de motoristas no admin **não selecionava** os campos:
- `vehicle_color`
- `vehicle_model`
- `vehicle_plate`
- `document_cpf`

**Resultado:** Admin exibia "-" para todos esses campos, mesmo quando persistidos no banco.

## Rastreamento Ponta a Ponta

### 1. App → Backend (✅ OK)
```typescript
// app/(auth)/register.tsx
registerPayload = {
  vehicle_color: vehicleColor,    // ✅ Envia
  vehicle_model: vehicleModel,    // ✅ Envia
  vehicle_plate: vehiclePlate,    // ✅ Envia
  document_cpf: documentCpf       // ✅ Envia
}
```

### 2. Backend Schema (✅ OK)
```typescript
// backend/src/routes/driver-auth.ts
const driverRegisterSchema = z.object({
  vehicle_color: z.string().min(2),  // ✅ Valida
  vehicle_model: z.string().optional(), // ✅ Valida
  vehicle_plate: z.string().optional(), // ✅ Valida
  document_cpf: z.string().min(11)   // ✅ Valida
});
```

### 3. Backend Persist (✅ OK)
```typescript
// backend/src/routes/driver-auth.ts
await prisma.drivers.create({
  data: {
    vehicle_color: data.vehicle_color,  // ✅ Persiste
    vehicle_model: data.vehicle_model,  // ✅ Persiste
    vehicle_plate: data.vehicle_plate,  // ✅ Persiste
    document_cpf: data.document_cpf     // ✅ Persiste
  }
});
```

### 4. Admin Query (❌ ERRO)
```typescript
// backend/src/modules/admin/service.ts - getDrivers()
select: {
  id: true,
  name: true,
  email: true,
  // ❌ vehicle_color: FALTANDO
  // ❌ vehicle_model: FALTANDO
  // ❌ vehicle_plate: FALTANDO
  // ❌ document_cpf: FALTANDO
}
```

## Correção Aplicada

**Commit:** `1dec96f` - fix: include vehicle and CPF fields in admin drivers list

**Arquivo:** `backend/src/modules/admin/service.ts`

```diff
select: {
  id: true,
  name: true,
  email: true,
  phone: true,
  status: true,
+ document_cpf: true,
+ vehicle_color: true,
+ vehicle_model: true,
+ vehicle_plate: true,
  created_at: true,
}
```

## Deploy

```bash
# Backend
cd /home/goes/kaviar/backend
git pull origin main
docker-compose restart backend

# Ou se usar ECS
aws ecs update-service --cluster kaviar-prod --service backend --force-new-deployment --region us-east-2
```

## Validação

### 1. Verificar no Banco

```sql
-- Conectar ao banco
psql -h <RDS_HOST> -U kaviar_admin -d kaviar_prod

-- Verificar motorista recém-cadastrado
SELECT 
  id, 
  name, 
  email,
  document_cpf,
  vehicle_color,
  vehicle_model,
  vehicle_plate,
  status,
  created_at
FROM drivers
WHERE email = '<email-do-teste>'
ORDER BY created_at DESC
LIMIT 1;
```

**Resultado esperado:**
```
document_cpf   | 12345678901
vehicle_color  | Branco
vehicle_model  | Gol
vehicle_plate  | ABC1234
status         | pending
```

### 2. Verificar no Admin

**URL:** https://admin.kaviar.com.br

**Passos:**
1. Login no admin
2. Menu "Motoristas" → "Aprovação"
3. Filtrar por status "Pendente"
4. Localizar motorista recém-cadastrado

**Resultado esperado:**
```
Nome: João Silva
Email: joao@example.com
CPF: 123.456.789-01
Placa: ABC1234
Modelo: Gol
Cor: Branco
Status: Pendente
```

**Antes da correção:**
```
Placa: -
Modelo: -
Cor: -
```

### 3. Testar API Diretamente

```bash
# Obter token admin
TOKEN=$(curl -s -X POST https://api.kaviar.com.br/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@kaviar.com.br","password":"<senha>"}' \
  | jq -r '.token')

# Listar motoristas pendentes
curl -s https://api.kaviar.com.br/api/admin/drivers?status=pending \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.data[] | {name, email, document_cpf, vehicle_color, vehicle_model, vehicle_plate}'
```

**Resultado esperado:**
```json
{
  "name": "João Silva",
  "email": "joao@example.com",
  "document_cpf": "12345678901",
  "vehicle_color": "Branco",
  "vehicle_model": "Gol",
  "vehicle_plate": "ABC1234"
}
```

## Checklist de Validação

- [ ] Backend deployado com commit `1dec96f`
- [ ] Query SQL retorna vehicle_color, vehicle_model, vehicle_plate
- [ ] Admin exibe Placa, Modelo, Cor (não mais "-")
- [ ] Novo cadastro via app persiste e aparece corretamente no admin
- [ ] API /api/admin/drivers retorna os campos do veículo

## Próximo Teste

Após deploy, cadastrar novo motorista no app e verificar se os dados aparecem corretamente no admin.
