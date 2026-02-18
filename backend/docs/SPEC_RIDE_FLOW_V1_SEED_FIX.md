# SPEC_RIDE_FLOW_V1 - Correção do Seed (Timestamps)

**Data:** 2026-02-18 07:37 BRT  
**Status:** ✅ CORRIGIDO

---

## 🔍 Diagnóstico

O seed estava falhando no DB dev (PostGIS/Docker porta 5433) com:

```
Argument `updated_at` is missing.
```

**Causa raiz:**
- Models `passengers`, `drivers`, `driver_status`, `driver_locations` têm `updated_at: DateTime` **required** sem `@default`
- Prisma exige passar valores reais no `create` e `update`
- Seed antigo não passava `created_at` nem `updated_at`

**Impacto:**
- Seed não criava `passenger@test.com`
- Login retornava "Email ou senha incorretos"
- Script não conseguia obter token
- Teste falhava com 401

---

## ✅ Correção Aplicada

**Arquivo:** `prisma/seed-ride-flow-v1.ts`

### Mudanças:

1. **Definir timestamp único:**
```typescript
const now = new Date();
```

2. **Passenger - Adicionar timestamps:**
```typescript
create: {
  id: 'pass_beta_test_001',
  name: 'Test Passenger',
  email: 'passenger@test.com',
  phone: '+5521999999001',
  status: 'ACTIVE',
  password_hash,
  created_at: now,    // ✅ Adicionado
  updated_at: now     // ✅ Adicionado
},
update: {
  status: 'ACTIVE',
  password_hash,
  updated_at: now     // ✅ Adicionado
}
```

3. **Drivers - Adicionar timestamps:**
```typescript
create: {
  id: 'test-driver-1',
  name: 'Test Driver 1',
  email: 'driver1@test.com',
  phone: '+5521999999101',
  status: 'active',
  last_lat: -22.9668,
  last_lng: -43.1729,
  created_at: now,    // ✅ Adicionado
  updated_at: now     // ✅ Adicionado
},
update: {
  updated_at: now     // ✅ Adicionado
}
```

4. **Driver Status - Adicionar timestamps:**
```typescript
create: {
  driver_id: driver1.id,
  availability: 'online',
  updated_at: now     // ✅ Adicionado
},
update: {
  availability: 'online',
  updated_at: now     // ✅ Adicionado
}
```

5. **Driver Locations - Adicionar timestamps:**
```typescript
create: {
  driver_id: driver1.id,
  lat: -22.9668,
  lng: -43.1729,
  updated_at: now     // ✅ Adicionado
},
update: {
  lat: -22.9668,
  lng: -43.1729,
  updated_at: now     // ✅ Adicionado
}
```

---

## 🧪 Validação

### 1. Rodar seed no DB dev

```bash
$ DATABASE_URL="postgresql://postgres:dev@localhost:5433/kaviar_dev?schema=public" \
  npx tsx prisma/seed-ride-flow-v1.ts

🌱 Seeding SPEC_RIDE_FLOW_V1 test data...
✓ Passenger created: pass_beta_test_001
✓ Driver 1 created: test-driver-1
✓ Driver 2 created: test-driver-2
✓ Driver status and locations created

✅ Seed completed!

Test credentials:
  Passenger ID: pass_beta_test_001
  Passenger Email: passenger@test.com
  Passenger Password: test1234
  Driver 1 ID: test-driver-1
  Driver 2 ID: test-driver-2
```

✅ **Seed executou sem erro de timestamps**

### 2. Verificar dados no banco

```bash
$ psql postgresql://postgres:dev@localhost:5433/kaviar_dev -c \
  "SELECT id, email, status, created_at, updated_at FROM passengers WHERE id='pass_beta_test_001';"

       id           |        email         | status  |         created_at         |         updated_at
--------------------+----------------------+---------+----------------------------+----------------------------
 pass_beta_test_001 | passenger@test.com   | ACTIVE  | 2026-02-18 07:37:18.552-03 | 2026-02-18 07:37:18.552-03
```

✅ **Passenger criado com timestamps corretos**

### 3. Testar login

```bash
$ curl -sS -X POST http://localhost:3003/api/auth/passenger/login \
  -H "Content-Type: application/json" \
  -d '{"email":"passenger@test.com","password":"test1234"}'

{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "pass_beta_test_001",
    "name": "Test Passenger",
    "email": "passenger@test.com",
    "role": "passenger"
  }
}
```

✅ **Login retorna token com sucesso**

### 4. Rodar script de teste

```bash
$ DATABASE_URL="postgresql://postgres:dev@localhost:5433/kaviar_dev?schema=public" \
  ./scripts/test-ride-flow-v1.sh

🚀 SPEC_RIDE_FLOW_V1 - Teste de 20 Corridas
==========================================
API: http://localhost:3003

🔐 Autenticando passageiro...
✓ Token obtido

📍 Setup: Colocando motoristas online...
✓ Motoristas online

🚗 Criando 20 corridas...

Corrida 1/20: ✓ ride_id=... status=requested
Corrida 2/20: ✓ ride_id=... status=requested
...
Corrida 20/20: ✓ ride_id=... status=requested

==========================================
📊 RESULTADOS
==========================================
Total de corridas: 20
Aceitas (simulado): 14
Sem motorista: 0
Erros: 0

✅ Teste concluído!
```

✅ **Script executou com sucesso, 20 corridas criadas**

---

## 📦 Arquivo Modificado

- ✅ `prisma/seed-ride-flow-v1.ts`

---

## 📝 Nota sobre Infra Dev

**Setup do DB local (PostGIS Docker porta 5433):**

```bash
# Limpar schema
psql postgresql://postgres:dev@localhost:5433/kaviar_dev -c \
  "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Habilitar PostGIS
psql postgresql://postgres:dev@localhost:5433/kaviar_dev -c \
  "CREATE EXTENSION postgis;"

# Push schema (sem force-reset para preservar geometry)
DATABASE_URL="postgresql://postgres:dev@localhost:5433/kaviar_dev?schema=public" \
  npx prisma db push

# Seed
DATABASE_URL="postgresql://postgres:dev@localhost:5433/kaviar_dev?schema=public" \
  npx tsx prisma/seed-ride-flow-v1.ts
```

---

## 🎯 Commit Sugerido

```bash
git add prisma/seed-ride-flow-v1.ts
git commit -m "fix(seed): add required timestamps to all creates and updates

- Add const now = new Date() for consistent timestamps
- Add created_at and updated_at to passengers create
- Add created_at and updated_at to drivers create
- Add updated_at to all updates (passengers, drivers, status, locations)
- Fixes 'Argument updated_at is missing' error in PostGIS dev DB

Resolves seed failure on local Docker PostGIS (port 5433)"
```

---

## ✅ Resultado Final

- ✅ Seed executa sem erro de timestamps
- ✅ Passenger criado com ACTIVE + password_hash
- ✅ 2 drivers criados com status online + locations
- ✅ Login retorna token válido
- ✅ Script de 20 corridas executa com sucesso

**Status:** SEED FUNCIONANDO - PRONTO PARA TESTES COMPLETOS 🚀
