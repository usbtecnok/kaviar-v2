# T2: MVP Onboarding de Motorista + Seed + Match Simulate

**Data:** 2026-02-11 23:00 BRT  
**Status:** ✅ IMPLEMENTADO (aguardando testes com DB)

---

## 1. Prisma Schema

### Model `drivers` (existente - adicionados índices)

```prisma
model drivers {
  // ... campos existentes ...
  
  @@index([territory_type])
  @@index([neighborhood_id, territory_type])
  @@index([status])                          // ✅ NOVO
  @@index([last_location_updated_at])        // ✅ NOVO
}
```

**Campos utilizados:**
- `id` (String, @id)
- `name` (String)
- `email` (String, @unique)
- `phone` (String, optional)
- `status` (String, default: "pending")
- `last_lat` (Decimal, optional)
- `last_lng` (Decimal, optional)
- `last_location_updated_at` (DateTime, optional)
- `created_at`, `updated_at`

**Migration:**
```bash
npx prisma migrate dev --name t2_driver_mvp_indexes
```

---

## 2. Endpoints Implementados

### 2.1 Admin Endpoints (`src/routes/admin-drivers.ts`)

#### A) POST /api/admin/drivers/create ✅ (já existia)
**Auth:** requireSuperAdmin  
**Body:**
```json
{
  "name": "João Silva",
  "email": "joao@example.com",
  "phone": "+5521999999999"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Motorista criado com sucesso",
  "data": {
    "id": "driver-1234567890",
    "name": "João Silva",
    "email": "joao@example.com",
    "status": "pending"
  }
}
```

#### B) PATCH /api/admin/drivers/:id/approve ✅ NOVO
**Auth:** requireSuperAdmin  
**Response:**
```json
{
  "success": true,
  "driver": {
    "id": "driver-1234567890",
    "status": "approved"
  }
}
```

#### C) PATCH /api/admin/drivers/:id/activate ✅ NOVO
**Auth:** requireSuperAdmin  
**Response:**
```json
{
  "success": true,
  "driver": {
    "id": "driver-1234567890",
    "status": "active"
  }
}
```

---

### 2.2 Driver Endpoint (`src/routes/drivers.ts`)

#### D) PATCH /api/drivers/location ✅ NOVO
**Auth:** Nenhuma (MVP - para seed/testing)  
**Body:**
```json
{
  "driverId": "driver-1234567890",
  "lat": -22.9668,
  "lng": -43.1729
}
```

**Validação:**
- lat: -90 a 90
- lng: -180 a 180

**Response:**
```json
{
  "success": true
}
```

---

### 2.3 Match Endpoint (`src/routes/match.ts`)

#### E) POST /api/match/simulate ✅ NOVO
**Auth:** Nenhuma (MVP)  
**Body:**
```json
{
  "origin": {
    "lat": -22.9668,
    "lng": -43.1729
  },
  "limit": 5
}
```

**Lógica:**
1. Busca drivers com:
   - `status = 'active'`
   - `last_lat` e `last_lng` não nulos
   - `last_location_updated_at >= now - 5min`
2. Calcula distância Haversine (em metros)
3. Score = 100000 - distanceMeters
4. Ordena por distância ASC
5. Retorna top N (default 5)

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "driverId": "seed-driver-1",
      "name": "Driver Copacabana 1",
      "distanceMeters": 245,
      "lastLocationAt": "2026-02-11T23:00:00.000Z",
      "score": 99755
    },
    {
      "driverId": "seed-driver-2",
      "name": "Driver Copacabana 2",
      "distanceMeters": 312,
      "lastLocationAt": "2026-02-11T23:00:00.000Z",
      "score": 99688
    }
  ],
  "total": 50
}
```

---

## 3. Seed Script

### `prisma/seed-drivers.ts` ✅

**Guardrail:**
```typescript
if (process.env.NODE_ENV === 'production') {
  console.error('❌ ERRO: Seed não pode ser executado em production!');
  process.exit(1);
}
```

**Distribuição:**
- 10 bairros RJ
- 5 drivers por bairro = 50 total
- Status: `active`
- Jitter: ±0.003 graus (≈ ±330m)
- Phone: `+5521999900001` a `+5521999900050` (únicos)
- Email: `driver1@seed.kaviar.local` a `driver50@seed.kaviar.local`

**Bairros:**
1. Copacabana (-22.9711, -43.1822)
2. Ipanema (-22.9836, -43.2074)
3. Botafogo (-22.9519, -43.1900)
4. Flamengo (-22.9339, -43.1746)
5. Tijuca (-22.9246, -43.2325)
6. Barra da Tijuca (-23.0006, -43.3659)
7. Madureira (-22.8747, -43.3425)
8. Campo Grande (-22.9056, -43.5615)
9. Recreio (-23.0278, -43.4779)
10. Centro (-22.9035, -43.2096)

**Executar:**
```bash
NODE_ENV=development npm run seed:drivers
```

---

## 4. Testes de Validação

### 4.1 Criar Driver (Admin)
```bash
curl -sS -X POST http://localhost:3003/api/admin/drivers/create \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João Silva",
    "phone": "+5521999999999",
    "email": "joao@example.com"
  }' | jq
```

**Esperado:** `status: "pending"`, id gerado

---

### 4.2 Aprovar Driver
```bash
curl -sS -X PATCH http://localhost:3003/api/admin/drivers/<id>/approve \
  -H "Authorization: Bearer <ADMIN_TOKEN>" | jq
```

**Esperado:** `status: "approved"`

---

### 4.3 Ativar Driver
```bash
curl -sS -X PATCH http://localhost:3003/api/admin/drivers/<id>/activate \
  -H "Authorization: Bearer <ADMIN_TOKEN>" | jq
```

**Esperado:** `status: "active"`

---

### 4.4 Atualizar Localização
```bash
curl -sS -X PATCH http://localhost:3003/api/drivers/location \
  -H "Content-Type: application/json" \
  -d '{
    "driverId": "<id>",
    "lat": -22.9668,
    "lng": -43.1729
  }' | jq
```

**Esperado:** `success: true`

---

### 4.5 Executar Seed
```bash
NODE_ENV=development npm run seed:drivers
```

**Esperado:**
```
🌱 Iniciando seed de drivers...
✅ Copacabana: 5 drivers criados
✅ Ipanema: 5 drivers criados
...
🎉 Seed completo! 50 drivers criados.
```

---

### 4.6 Match Simulate
```bash
curl -sS -X POST http://localhost:3003/api/match/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "origin": {
      "lat": -22.9668,
      "lng": -43.1729
    },
    "limit": 5
  }' | jq
```

**Esperado:**
- `results` com 5 drivers
- Ordenados por `distanceMeters` ASC
- Todos com `status: "active"`
- `lastLocationAt` recente (< 5min)

---

## 5. Critérios de Aceite

- [x] Prisma schema atualizado com índices
- [x] Admin consegue criar driver (PENDING)
- [x] Admin consegue aprovar driver (APPROVED)
- [x] Admin consegue ativar driver (ACTIVE)
- [x] Endpoint location atualiza last_lat/last_lng/last_location_updated_at
- [x] seed:drivers cria 50 ACTIVE com coords realistas e phones únicos
- [x] match/simulate retorna TOP 5 ordenado por distância
- [x] DEV-only guardrails: seed não roda em production
- [ ] Evidências de testes com DB real (aguardando acesso)
- [x] Build sem erros
- [x] Código implementado

---

## 6. Algoritmo Haversine (Match)

```typescript
const haversine = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371000; // Raio da Terra em metros
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distância em metros
};
```

**Score MVP:** `score = 100000 - distanceMeters`

---

## 7. Próximos Passos (Pós-T2)

1. **Auth real:** Adicionar autenticação JWT para `/api/drivers/location`
2. **Filtros avançados:** Adicionar filtro por `neighborhood_id`, `territory_type`
3. **Cache:** Redis para cache de drivers ativos (TTL 1min)
4. **Matching avançado:** Incorporar score territorial, histórico de aceitação
5. **Monitoring:** Logs estruturados de matching (requestId, driverId, distanceMeters)

---

## 8. Arquivos Modificados/Criados

**Modificados:**
- `prisma/schema.prisma` (índices)
- `src/routes/admin-drivers.ts` (approve, activate)
- `src/routes/drivers.ts` (location)
- `src/routes/match.ts` (simulate)
- `package.json` (script seed:drivers)

**Criados:**
- `prisma/seed-drivers.ts`
- `docs/ops/t2-driver-mvp.md`

---

**Status:** ✅ T2 IMPLEMENTADO - Aguardando testes com DB real para validação completa
