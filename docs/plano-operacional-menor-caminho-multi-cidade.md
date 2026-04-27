# KAVIAR — Plano Operacional: Menor Caminho Viável Multi-Cidade

**Data:** 18 de abril de 2026
**Escopo:** Blocos A + C + E parcial + kill switch
**Objetivo:** Preparar o KAVIAR para abrir 2-3 cidades com segurança mínima

---

## 1. Resumo Executivo

### O que será implementado agora

1. **Tabela `cities`** no banco + migration para ligar neighborhoods existentes
2. **Filtro de cidade no dispatcher** para evitar cross-city dispatch
3. **Kill switch por cidade** na criação de corrida
4. **Dados mínimos da primeira cidade nova** (GeoJSON + pricing profile)

### O que fica de fora de propósito

- Filtro de cidade no admin dashboard (operador filtra mentalmente por enquanto)
- Generalização de `geofence-governance.ts` (hardcode RJ não bloqueia cidades novas no dispatch)
- Generalização de `neighborhood-policy.ts` (cidades novas operam sem política de vizinhança — comportamento default)
- Feature flags com escopo de cidade
- Dashboard comparativo entre cidades

### Qual problema resolve

Hoje, se cadastrarmos bairros de Niterói e motoristas de Niterói, o dispatcher do RJ vai iterar esses motoristas desnecessariamente, e não existe forma de desligar uma cidade com problema. Este plano resolve exatamente isso: **isolamento de cidade no dispatch + kill switch + dados mínimos para operar**.

---

## 2. Escopo Exato por Bloco

### Bloco A — Model `cities` + migration

- Criar model `cities` no Prisma schema (estrutura mínima)
- Migration: criar tabela, inserir "Rio de Janeiro", adicionar `city_id` em `neighborhoods`
- Popular `city_id` em todos os neighborhoods existentes
- Endpoint básico `GET /api/admin/cities` (listagem)
- Endpoint `PATCH /api/admin/cities/:id` (ativar/desativar — kill switch)

### Bloco C — Filtro de cidade no dispatcher

- Resolver `city_id` da corrida via `origin_neighborhood_id`
- Filtrar `driver_status` por motoristas da mesma cidade
- Feature flag `DISPATCH_CITY_FILTER` para rollback instantâneo
- Logging de diagnóstico

### Bloco E parcial — Dados da primeira cidade nova

- Obter GeoJSON de bairros (Niterói como exemplo)
- Importar via `import-geojson.ts` (já aceita parâmetro `city`)
- Criar pricing profile para a cidade
- Inserir cidade no banco com `is_active: false`
- Validar territory resolver com coordenadas reais
- Ativar quando pronto

### Kill switch

- Check de `cities.is_active` na rota `POST /api/v2/rides` antes de criar corrida
- Se cidade da origem não está ativa (ou não existe), retorna erro claro
- RJ começa com `is_active: true` — zero impacto na operação atual

---

## 3. Arquivos e Pontos Reais do Código a Alterar

### Banco / Schema

| Arquivo | Alteração | Papel |
|---|---|---|
| `backend/prisma/schema.prisma` | Adicionar model `cities` | Entidade central de cidade |
| `backend/prisma/schema.prisma` | Adicionar `city_id` em `neighborhoods` | FK que liga bairro à cidade |
| `backend/prisma/schema.prisma` | Adicionar `city_id` opcional em `pricing_profiles` | Associar perfil de pricing à cidade |

### Backend — Dispatcher

| Arquivo | Alteração | Papel |
|---|---|---|
| `backend/src/services/dispatcher.service.ts` | Filtro por `city_id` em `findCandidates()` | Evitar cross-city dispatch |

### Backend — Kill switch

| Arquivo | Alteração | Papel |
|---|---|---|
| `backend/src/routes/rides-v2.ts` | Check `cities.is_active` no `POST /` | Bloquear corridas em cidade desativada |

### Backend — Admin (mínimo)

| Arquivo | Alteração | Papel |
|---|---|---|
| `backend/src/routes/admin.ts` (ou novo `admin-cities.ts`) | `GET /api/admin/cities` + `PATCH /:id` | Listar e ativar/desativar cidades |

### Dados

| Arquivo | Alteração | Papel |
|---|---|---|
| `data/` | Adicionar GeoJSON da cidade nova | Polígonos de bairros |
| `backend/src/scripts/import-geojson.ts` | Nenhuma (já aceita `city` como param) | Importação já funciona |

---

## 4. Plano de Implementação Passo a Passo

### Fase 1: Schema + Migration (dia 1-2)

**Passo 1.1** — Adicionar model `cities` no `schema.prisma`

```prisma
model cities {
  id           String   @id @default(uuid())
  name         String   @unique
  slug         String   @unique
  state        String
  is_active    Boolean  @default(false)
  launched_at  DateTime?
  created_at   DateTime @default(now())
  updated_at   DateTime @updatedAt

  neighborhoods neighborhoods[]
}
```

**Passo 1.2** — Adicionar `city_id` em `neighborhoods`

```prisma
model neighborhoods {
  // ... campos existentes ...
  city_id    String?
  cities     cities?  @relation(fields: [city_id], references: [id])
  // manter campo `city` String existente por backward compat
}
```

**Passo 1.3** — Adicionar `city_id` opcional em `pricing_profiles`

```prisma
model pricing_profiles {
  // ... campos existentes ...
  city_id    String?  @db.Uuid
}
```

**Passo 1.4** — Gerar e aplicar migration

```bash
cd backend
npx prisma migrate dev --name add-cities-model
```

**Passo 1.5** — Script de seed: inserir RJ e popular city_id

```sql
-- Inserir Rio de Janeiro
INSERT INTO cities (id, name, slug, state, is_active, created_at, updated_at)
VALUES (gen_random_uuid(), 'Rio de Janeiro', 'rio-de-janeiro', 'RJ', true, NOW(), NOW());

-- Popular city_id em todos os neighborhoods existentes
UPDATE neighborhoods
SET city_id = (SELECT id FROM cities WHERE slug = 'rio-de-janeiro')
WHERE city = 'Rio de Janeiro' OR city_id IS NULL;
```

**Validação após Fase 1:**
- `SELECT COUNT(*) FROM cities;` → deve retornar 1
- `SELECT COUNT(*) FROM neighborhoods WHERE city_id IS NULL;` → deve retornar 0
- `npx prisma generate` sem erros
- Backend compila e sobe normalmente
- Todas as rotas existentes funcionam (nenhuma depende de `cities` ainda)

**O que pode quebrar:** Nada. É puramente aditivo. Nenhum código existente referencia `cities` ou `city_id`.

### Fase 2: Kill switch na criação de corrida (dia 2)

**Passo 2.1** — Adicionar check em `routes/rides-v2.ts`, no `POST /`

Após resolver território da origem (linha ~103 do arquivo atual), antes do pricing:

```typescript
// Kill switch: verificar se cidade da origem está ativa
if (originNeighborhoodId) {
  const originNb = await prisma.neighborhoods.findUnique({
    where: { id: originNeighborhoodId },
    select: { city_id: true }
  });
  if (originNb?.city_id) {
    const city = await prisma.cities.findUnique({
      where: { id: originNb.city_id },
      select: { is_active: true, name: true }
    });
    if (city && !city.is_active) {
      // Cancelar a corrida recém-criada
      await prisma.rides_v2.update({
        where: { id: ride.id },
        data: { status: 'canceled_by_passenger' }
      });
      return res.status(400).json({
        error: `Serviço temporariamente indisponível em ${city.name}`
      });
    }
  }
}
```

**Validação:** Criar cidade de teste com `is_active: false`, tentar criar corrida com origem nessa cidade → deve retornar 400.

**O que pode quebrar:** Nada para o RJ (está `is_active: true`). Corridas sem neighborhood resolvido passam direto (fail-open).

### Fase 3: Filtro de cidade no dispatcher (dia 3-4)

**Passo 3.1** — Alterar `findCandidates()` em `dispatcher.service.ts`

Substituir a query atual:

```typescript
// ANTES:
const onlineDrivers = await prisma.driver_status.findMany({
  where: { availability: 'online' },
  include: { driver: { include: { driver_location: true } } }
});
```

Por:

```typescript
// DEPOIS:
const cityFilterEnabled = process.env.DISPATCH_CITY_FILTER === 'true';
let rideCityId: string | null = null;

if (cityFilterEnabled && ride.origin_neighborhood_id) {
  const originNb = await prisma.neighborhoods.findUnique({
    where: { id: ride.origin_neighborhood_id },
    select: { city_id: true }
  });
  rideCityId = originNb?.city_id || null;
}

const driverFilter: any = { availability: 'online' };
if (rideCityId) {
  driverFilter.driver = { neighborhoods: { city_id: rideCityId } };
}

const onlineDrivers = await prisma.driver_status.findMany({
  where: driverFilter,
  include: { driver: { include: { driver_location: true } } }
});

console.log(`[DISPATCHER_CITY_FILTER] ride_id=${ride.id} city_filter=${!!rideCityId} city_id=${rideCityId || 'global'} drivers_returned=${onlineDrivers.length}`);
```

**Passo 3.2** — Adicionar env var

```
DISPATCH_CITY_FILTER=false   # desligado por padrão no deploy
```

**Passo 3.3** — Deploy com flag desligada, validar que comportamento é idêntico

**Passo 3.4** — Ligar flag (`DISPATCH_CITY_FILTER=true`), monitorar logs

**Validação:**
- Com flag OFF: logs mostram `city_filter=false`, comportamento idêntico ao atual
- Com flag ON + corrida no RJ: logs mostram `city_filter=true city_id=<rj-uuid>`, só motoristas do RJ retornados
- Com flag ON + corrida sem neighborhood: logs mostram `city_filter=false` (fallback global)

**O que pode quebrar:**
- Motorista sem `neighborhood_id` não aparece no filtro. Isso é correto — motorista sem bairro não deveria receber ofertas. Mas verificar se existem motoristas aprovados sem bairro no RJ.
- Se a query Prisma com nested filter for lenta, desligar flag imediatamente.

### Fase 4: Endpoint admin de cidades (dia 4)

**Passo 4.1** — Criar `backend/src/routes/admin-cities.ts`

```typescript
import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateAdmin, requireSuperAdmin } from '../middlewares/auth';

const router = Router();
router.use(authenticateAdmin);

// GET /api/admin/cities
router.get('/', async (req: Request, res: Response) => {
  const cities = await prisma.cities.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { neighborhoods: true } } }
  });
  res.json({ success: true, data: cities });
});

// PATCH /api/admin/cities/:id (kill switch)
router.patch('/:id', requireSuperAdmin, async (req: Request, res: Response) => {
  const { is_active } = req.body;
  if (typeof is_active !== 'boolean') {
    return res.status(400).json({ error: 'is_active (boolean) obrigatório' });
  }
  const city = await prisma.cities.update({
    where: { id: req.params.id },
    data: {
      is_active,
      launched_at: is_active ? new Date() : undefined
    }
  });
  console.log(`[CITY_TOGGLE] city=${city.name} is_active=${city.is_active} by=${(req as any).adminId}`);
  res.json({ success: true, data: city });
});

export default router;
```

**Passo 4.2** — Registrar rota em `routes/admin.ts` ou `app.ts`

**Validação:** `GET /api/admin/cities` retorna RJ com `is_active: true` e count de neighborhoods.

### Fase 5: Dados da primeira cidade nova (dia 5-6)

**Passo 5.1** — Obter GeoJSON de Niterói

Fontes: IBGE (malha municipal), dados abertos da prefeitura, OpenStreetMap.
Salvar em `data/niteroi_bairros.geojson`.

**Passo 5.2** — Inserir cidade no banco

```sql
INSERT INTO cities (id, name, slug, state, is_active, created_at, updated_at)
VALUES (gen_random_uuid(), 'Niterói', 'niteroi', 'RJ', false, NOW(), NOW());
```

**Passo 5.3** — Importar GeoJSON

O `import-geojson.ts` já tem a função `importGeoJSON(filePath, city, areaType)`. Basta chamar:

```typescript
await importGeoJSON('data/niteroi_bairros.geojson', 'Niterói', 'BAIRRO_OFICIAL');
```

Após importação, popular `city_id`:

```sql
UPDATE neighborhoods
SET city_id = (SELECT id FROM cities WHERE slug = 'niteroi')
WHERE city = 'Niterói' AND city_id IS NULL;
```

**Passo 5.4** — Criar pricing profile

```sql
INSERT INTO pricing_profiles (
  slug, name, base_fare, per_km, per_minute, minimum_fare,
  fee_local, fee_adjacent, fee_external,
  credit_cost_local, credit_cost_external, max_dispatch_km,
  center_lat, center_lng, radius_km,
  is_default, is_active, city_id, created_at, updated_at
) VALUES (
  'niteroi-standard', 'Niterói Padrão',
  4.50, 1.80, 0.30, 8.00,
  7, 12, 20,
  1, 2, 12,
  -22.8833, -43.1036, 15,
  false, true,
  (SELECT id FROM cities WHERE slug = 'niteroi'),
  NOW(), NOW()
);
```

**Passo 5.5** — Validar territory resolver

```sql
-- Testar coordenada conhecida de Niterói (Centro)
-- Deve resolver para um neighborhood importado
SELECT n.name, ng.id
FROM neighborhoods n
JOIN neighborhood_geofences ng ON ng.neighborhood_id = n.id
WHERE n.city = 'Niterói'
  AND ST_Covers(ng.geom, ST_SetSRID(ST_MakePoint(-43.1036, -22.8833), 4326));
```

**Passo 5.6** — Teste E2E completo

1. Criar motorista de teste em Niterói (com neighborhood de Niterói)
2. Criar passageiro de teste
3. Solicitar corrida com origem em Niterói
4. Verificar: territory resolver encontra bairro → pricing usa perfil Niterói → dispatcher filtra só motoristas de Niterói → oferta enviada

**Passo 5.7** — Ativar cidade

```sql
UPDATE cities SET is_active = true, launched_at = NOW() WHERE slug = 'niteroi';
```

Ou via endpoint: `PATCH /api/admin/cities/<niteroi-id>` com `{ "is_active": true }`.

---

## 5. Migração de Banco

### Menor migration possível

```sql
-- 1. Criar tabela cities
CREATE TABLE cities (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(255) NOT NULL UNIQUE,
  slug       VARCHAR(255) NOT NULL UNIQUE,
  state      VARCHAR(2) NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT false,
  launched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Inserir Rio de Janeiro (ativo)
INSERT INTO cities (name, slug, state, is_active, launched_at)
VALUES ('Rio de Janeiro', 'rio-de-janeiro', 'RJ', true, NOW());

-- 3. Adicionar city_id em neighborhoods (nullable)
ALTER TABLE neighborhoods ADD COLUMN city_id UUID REFERENCES cities(id);

-- 4. Popular city_id para todos os neighborhoods existentes
UPDATE neighborhoods
SET city_id = (SELECT id FROM cities WHERE slug = 'rio-de-janeiro');

-- 5. Adicionar city_id opcional em pricing_profiles
ALTER TABLE pricing_profiles ADD COLUMN city_id UUID REFERENCES cities(id);

-- 6. Criar índice
CREATE INDEX idx_neighborhoods_city_id ON neighborhoods(city_id);
```

### Estratégia de segurança

- **Passo 3 é nullable** — se a migration falhar no passo 4, o sistema continua funcionando (nenhum código existente usa `city_id`)
- **Não tornar NOT NULL agora** — fazer isso numa migration futura após validar que todos os neighborhoods têm `city_id`
- **Manter campo `city` (string)** — backward compatibility total. Remover só quando todo o código usar `city_id`
- **Rodar em dev primeiro**, validar, depois aplicar em produção com `npx prisma migrate deploy`

### Como evitar inconsistência

Após migration em produção, rodar validação:

```sql
-- Deve retornar 0
SELECT COUNT(*) FROM neighborhoods WHERE city_id IS NULL;

-- Deve retornar 1
SELECT COUNT(*) FROM cities;

-- Deve bater com total de neighborhoods
SELECT c.name, COUNT(n.id)
FROM cities c
LEFT JOIN neighborhoods n ON n.city_id = c.id
GROUP BY c.name;
```

---

## 6. Filtro no Dispatcher — Detalhe

### Alteração exata

Arquivo: `backend/src/services/dispatcher.service.ts`
Método: `findCandidates()` (linha ~193)

**Antes:**

```typescript
const onlineDrivers = await prisma.driver_status.findMany({
  where: { availability: 'online' },
  include: { driver: { include: { driver_location: true } } }
});
```

**Depois:**

```typescript
const cityFilterEnabled = process.env.DISPATCH_CITY_FILTER === 'true';
let rideCityId: string | null = null;

if (cityFilterEnabled && ride.origin_neighborhood_id) {
  const originNb = await prisma.neighborhoods.findUnique({
    where: { id: ride.origin_neighborhood_id },
    select: { city_id: true }
  });
  rideCityId = originNb?.city_id || null;
}

const onlineDrivers = await prisma.driver_status.findMany({
  where: {
    availability: 'online',
    ...(rideCityId ? { driver: { neighborhoods: { city_id: rideCityId } } } : {})
  },
  include: { driver: { include: { driver_location: true } } }
});

console.log(`[DISPATCHER_CITY_FILTER] ride_id=${ride.id} enabled=${cityFilterEnabled} city_id=${rideCityId || 'global'} candidates=${onlineDrivers.length}`);
```

### Feature flag

- **Env var:** `DISPATCH_CITY_FILTER=true|false`
- **Flag OFF:** Query idêntica à atual (sem filtro de cidade). Zero impacto.
- **Flag ON:** Filtra motoristas pela cidade da corrida. Se corrida não tem neighborhood resolvido, cai no global (fail-open).

### Como desligar rapidamente

1. Mudar env var no ECS task definition: `DISPATCH_CITY_FILTER=false`
2. Force new deployment: `aws ecs update-service --force-new-deployment`
3. Em ~2 minutos, dispatcher volta ao comportamento global

Não exige rollback de código. Não exige migration reversa.

### Impacto esperado

- **Performance:** Melhora. Query retorna ~30-50 motoristas (1 cidade) em vez de ~400 (12 cidades).
- **Comportamento:** Idêntico para o RJ (todos os motoristas do RJ continuam no pool). Cidades novas ficam isoladas.
- **Edge case:** Motorista sem `neighborhood_id` não aparece no filtro com flag ON. Verificar antes de ativar:

```sql
SELECT COUNT(*) FROM drivers
WHERE status = 'approved' AND neighborhood_id IS NULL;
```

Se > 0, decidir: atribuir bairro a esses motoristas ou aceitar que ficam fora do dispatch filtrado.

---

## 7. Dados Mínimos para Primeira Cidade Nova

### Obrigatório cadastrar

1. **Registro na tabela `cities`** — nome, slug, state, `is_active: false`
2. **Bairros na tabela `neighborhoods`** — com `city = 'Niterói'` e `city_id` correto
3. **Geofences na tabela `neighborhood_geofences`** — polígonos PostGIS para cada bairro
4. **Pricing profile na tabela `pricing_profiles`** — com `center_lat/lng` e `radius_km` da cidade

### Conjunto mínimo para operação real

- **Bairros:** Pelo menos os 10-15 bairros mais populosos/centrais com polígonos válidos
- **Pricing:** 1 perfil com parâmetros calibrados (base_fare, per_km, fees por tier)
- **Motoristas:** Pelo menos 5-10 aprovados com `neighborhood_id` de bairros da cidade
- **Cobertura:** Territory resolver deve resolver corretamente coordenadas dos bairros principais

### Validações antes de liberar

```sql
-- 1. Bairros importados com geofence
SELECT COUNT(*) FROM neighborhoods n
JOIN neighborhood_geofences ng ON ng.neighborhood_id = n.id
WHERE n.city = 'Niterói' AND ng.geom IS NOT NULL;
-- Deve ser >= 10

-- 2. Geometrias válidas
SELECT n.name, ST_IsValid(ng.geom) as valid
FROM neighborhoods n
JOIN neighborhood_geofences ng ON ng.neighborhood_id = n.id
WHERE n.city = 'Niterói' AND NOT ST_IsValid(ng.geom);
-- Deve retornar 0 rows

-- 3. Pricing profile existe e está ativo
SELECT slug, is_active, center_lat, center_lng, radius_km
FROM pricing_profiles WHERE city_id = (SELECT id FROM cities WHERE slug = 'niteroi');
-- Deve retornar 1 row com is_active = true

-- 4. Territory resolver funciona (coordenada central de Niterói)
SELECT n.name FROM neighborhoods n
JOIN neighborhood_geofences ng ON ng.neighborhood_id = n.id
WHERE ST_Covers(ng.geom, ST_SetSRID(ST_MakePoint(-43.1036, -22.8833), 4326));
-- Deve retornar um bairro de Niterói
```

---

## 8. Feature Flags e Rollback

### Flags a criar

| Flag | Tipo | Default | Propósito |
|---|---|---|---|
| `DISPATCH_CITY_FILTER` | Env var | `false` | Ativa filtro de cidade no dispatcher |

Apenas 1 flag. Mínimo possível.

### Comportamento com flag ligada

- Dispatcher resolve `city_id` da corrida via `origin_neighborhood_id`
- Filtra motoristas online pela mesma `city_id`
- Se corrida não tem neighborhood resolvido → fallback global (busca todos)
- Log: `[DISPATCHER_CITY_FILTER] enabled=true city_id=<uuid> candidates=N`

### Comportamento com flag desligada

- Dispatcher busca todos os motoristas online (comportamento atual exato)
- Log: `[DISPATCHER_CITY_FILTER] enabled=false city_id=global candidates=N`

### Como voltar ao estado anterior

| Cenário | Ação | Tempo | Exige deploy? |
|---|---|---|---|
| Filtro dispatcher com problema | Mudar `DISPATCH_CITY_FILTER=false` no ECS | ~2 min | Sim (env var change + force deploy) |
| Kill switch bloqueando corridas indevidamente | `UPDATE cities SET is_active = true WHERE slug = 'rio-de-janeiro'` | ~10 seg | Não |
| Migration com problema | Rollback: `ALTER TABLE neighborhoods DROP COLUMN city_id` | ~1 min | Não (código não depende de city_id com flag OFF) |

### O que exige rollback de código vs só desligar flag

- **Só flag:** Filtro do dispatcher. Desligar `DISPATCH_CITY_FILTER` reverte 100%.
- **Só banco:** Kill switch. Setar `is_active = true` reverte.
- **Rollback de código:** Nenhum cenário exige. Todo o código novo é protegido por flag ou é aditivo (endpoint de cities, model no schema).

---

## 9. Plano de Testes

### Testes unitários mínimos

1. **Kill switch logic:** Corrida com cidade ativa → passa. Corrida com cidade inativa → bloqueia.
2. **City filter logic:** Com `rideCityId` definido, query inclui filtro. Com `rideCityId` null, query é global.

### Testes de integração mínimos

1. **Migration:** Após rodar, todos os neighborhoods têm `city_id` populado.
2. **Territory resolver + cidade nova:** Coordenada de Niterói resolve para bairro de Niterói.
3. **Pricing engine + cidade nova:** `resolveProfile()` com coordenada de Niterói retorna perfil de Niterói.
4. **Dispatcher + filtro:** Com flag ON, corrida no RJ retorna só motoristas do RJ.

### Testes E2E mínimos

1. **Corrida completa no RJ (regressão):**
   - Criar corrida → territory resolve → pricing quote → dispatch → oferta enviada → aceitar → settle
   - Deve funcionar identicamente ao estado atual

2. **Corrida completa em Niterói:**
   - Criar motorista com neighborhood de Niterói
   - Criar corrida com origem em Niterói
   - Verificar: territory resolve para bairro de Niterói → pricing usa perfil Niterói → dispatch filtra só motoristas de Niterói → oferta enviada ao motorista correto

3. **Isolamento cross-city:**
   - Motorista online no RJ + corrida em Niterói
   - Dispatcher NÃO deve enviar oferta ao motorista do RJ

4. **Kill switch:**
   - Desativar Niterói → tentar criar corrida → deve retornar erro
   - Reativar → corrida funciona

5. **Fallback (corrida sem neighborhood):**
   - Corrida com coordenadas fora de qualquer geofence
   - Com flag ON: dispatcher cai no global (busca todos)
   - Corrida não fica presa

### Cenários de regressão obrigatórios no Rio

- [ ] Corrida normal RJ → dispatch → match → pricing → complete ✓
- [ ] Corrida agendada RJ → scheduled dispatch funciona ✓
- [ ] Corrida homebound RJ → fee reduzida aplicada ✓
- [ ] Motorista sem crédito → credit gate funciona ✓
- [ ] Oferta expira → redispatch funciona ✓
- [ ] Dashboard admin `/api/admin/dashboard/metrics` retorna dados ✓
- [ ] Dashboard admin `/api/admin/dashboard/overview` retorna dados ✓
- [ ] Monitor operacional `/api/admin/operations/monitor` retorna dados ✓

### Cenários obrigatórios na primeira cidade nova

- [ ] Territory resolver encontra bairro com coordenada central da cidade
- [ ] Pricing engine retorna perfil da cidade (não o default)
- [ ] Dispatcher com flag ON filtra só motoristas da cidade
- [ ] Corrida criada com sucesso quando cidade está ativa
- [ ] Corrida bloqueada quando cidade está inativa
- [ ] Motorista de outra cidade NÃO recebe oferta

---

## 10. Checklist de Pronto para Produção

### Checklist técnico

- [ ] Model `cities` no schema.prisma
- [ ] Migration aplicada em dev sem erros
- [ ] Migration aplicada em produção sem erros
- [ ] RJ inserido com `is_active: true`
- [ ] Todos os neighborhoods têm `city_id` populado (`SELECT COUNT(*) WHERE city_id IS NULL` = 0)
- [ ] Endpoint `GET /api/admin/cities` funciona
- [ ] Endpoint `PATCH /api/admin/cities/:id` funciona (toggle is_active)
- [ ] Kill switch em `POST /api/v2/rides` implementado
- [ ] Filtro de cidade no dispatcher implementado com feature flag
- [ ] `DISPATCH_CITY_FILTER=false` no deploy inicial
- [ ] Backend compila e sobe sem erros
- [ ] `npx prisma generate` sem erros

### Checklist de dados territoriais

- [ ] GeoJSON da cidade nova obtido e salvo em `data/`
- [ ] Bairros importados via `import-geojson.ts`
- [ ] `city_id` populado nos neighborhoods da cidade nova
- [ ] Geometrias válidas (`ST_IsValid` = true para todos)
- [ ] Territory resolver resolve coordenada central da cidade
- [ ] Pricing profile criado com parâmetros calibrados
- [ ] Cidade inserida no banco com `is_active: false`

### Checklist operacional

- [ ] Pelo menos 5 motoristas aprovados na cidade nova com `neighborhood_id` correto
- [ ] Teste E2E completo na cidade nova (corrida ponta a ponta)
- [ ] Teste de isolamento cross-city validado
- [ ] Testes de regressão no RJ passando
- [ ] `DISPATCH_CITY_FILTER=true` ativado e monitorado por 24h no RJ
- [ ] Cidade nova ativada (`is_active: true`)

### Checklist de rollback

- [ ] Sabe como desligar `DISPATCH_CITY_FILTER` (env var no ECS)
- [ ] Sabe como desativar cidade (`PATCH /api/admin/cities/:id` ou SQL direto)
- [ ] Sabe como reverter migration se necessário (`DROP COLUMN city_id`)
- [ ] Nenhuma dessas ações exige downtime

---

## 11. Riscos e Mitigação

### Risco 1: Regressão no Rio

| Aspecto | Detalhe |
|---|---|
| **Probabilidade** | Baixa |
| **Impacto** | Alto |
| **Causa** | Migration quebra algo, ou filtro exclui motoristas válidos do RJ |
| **Mitigação** | Migration é aditiva (não altera colunas existentes). Filtro tem feature flag OFF por padrão. Testes de regressão obrigatórios antes de ativar. |
| **Rollback** | Desligar flag. Se migration quebrou: `DROP COLUMN city_id` (nenhum código depende dele com flag OFF). |

### Risco 2: Filtro exclui motoristas válidos

| Aspecto | Detalhe |
|---|---|
| **Probabilidade** | Média |
| **Impacto** | Alto |
| **Causa** | Motoristas aprovados sem `neighborhood_id` ficam fora do filtro |
| **Mitigação** | Antes de ativar flag, rodar: `SELECT COUNT(*) FROM drivers WHERE status = 'approved' AND neighborhood_id IS NULL`. Se > 0, atribuir bairro ou manter flag OFF até resolver. |
| **Rollback** | Desligar flag. |

### Risco 3: Dados territoriais incompletos

| Aspecto | Detalhe |
|---|---|
| **Probabilidade** | Média |
| **Impacto** | Médio |
| **Causa** | GeoJSON com bairros faltando ou geometrias inválidas |
| **Mitigação** | Validar com `ST_IsValid()`. Testar territory resolver com coordenadas conhecidas. Cidade começa `is_active: false` — só ativa após validação. |
| **Rollback** | Manter cidade inativa. Corrigir dados. |

### Risco 4: Inconsistência neighborhoods ↔ cities

| Aspecto | Detalhe |
|---|---|
| **Probabilidade** | Baixa |
| **Impacto** | Médio |
| **Causa** | Neighborhoods com `city_id` NULL após migration |
| **Mitigação** | Script de validação pós-migration. `city_id` é nullable, então não quebra nada — apenas o filtro não funciona para esses neighborhoods. |
| **Rollback** | Re-rodar UPDATE para popular `city_id`. |

### Risco 5: Performance da query com nested filter

| Aspecto | Detalhe |
|---|---|
| **Probabilidade** | Baixa |
| **Impacto** | Médio |
| **Causa** | Prisma gera JOIN complexo para filtrar `driver_status → driver → neighborhoods → city_id` |
| **Mitigação** | Índice `idx_neighborhoods_city_id` criado na migration. Monitorar tempo de query nos logs. |
| **Rollback** | Desligar flag. |

---

## 12. Estimativa Qualitativa por Etapa

| Etapa | Esforço | Sensibilidade | Criticidade | Notas |
|---|---|---|---|---|
| Schema `cities` + migration | **Baixo** | Média | Alta | Fundação de tudo. Simples mas precisa ser cuidadoso. |
| Seed RJ + popular city_id | **Baixo** | Alta | Alta | Se falhar, filtro não funciona. Validar com queries. |
| Kill switch em rides-v2 | **Baixo** | Baixa | Média | ~15 linhas. Fail-open (não bloqueia se não resolver cidade). |
| Filtro dispatcher + flag | **Baixo** | Alta | Alta | ~20 linhas. Impacto direto no core. Flag obrigatória. |
| Endpoint admin cities | **Baixo** | Baixa | Baixa | CRUD simples. Não afeta nada existente. |
| GeoJSON cidade nova | **Médio** | Baixa | Média | Depende da qualidade dos dados disponíveis. |
| Import + pricing profile | **Baixo** | Média | Média | Script já existe. Pricing é 1 INSERT. |
| Testes E2E | **Médio** | — | Alta | Obrigatório antes de ativar. |

---

## 13. Ordem Exata de Execução Recomendada

```
DIA 1
  □ 1. Adicionar model cities no schema.prisma
  □ 2. Adicionar city_id em neighborhoods (nullable)
  □ 3. Adicionar city_id em pricing_profiles (nullable)
  □ 4. npx prisma migrate dev --name add-cities
  □ 5. Validar: npx prisma generate sem erros, backend compila

DIA 2
  □ 6. Escrever seed: INSERT cities (RJ), UPDATE neighborhoods SET city_id
  □ 7. Rodar seed em dev
  □ 8. Validar: SELECT COUNT(*) FROM neighborhoods WHERE city_id IS NULL = 0
  □ 9. Implementar kill switch em routes/rides-v2.ts
  □ 10. Testar kill switch em dev (cidade ativa → passa, inativa → bloqueia)

DIA 3
  □ 11. Implementar filtro de cidade em dispatcher.service.ts (findCandidates)
  □ 12. Adicionar env var DISPATCH_CITY_FILTER=false
  □ 13. Testar com flag OFF: comportamento idêntico ao atual
  □ 14. Testar com flag ON: só motoristas da cidade retornados
  □ 15. Criar routes/admin-cities.ts (GET + PATCH)
  □ 16. Registrar rota no app

DIA 4
  □ 17. Rodar testes de regressão completos no RJ
  □ 18. Deploy em produção com DISPATCH_CITY_FILTER=false
  □ 19. Rodar migration em produção
  □ 20. Rodar seed em produção (INSERT RJ + UPDATE city_id)
  □ 21. Validar queries de consistência em produção
  □ 22. Ativar DISPATCH_CITY_FILTER=true
  □ 23. Monitorar logs de dispatch por 24h

DIA 5-6
  □ 24. Obter GeoJSON da cidade nova (Niterói)
  □ 25. INSERT cidade nova no banco (is_active: false)
  □ 26. Importar GeoJSON via import-geojson.ts
  □ 27. Popular city_id nos neighborhoods da cidade nova
  □ 28. Criar pricing profile da cidade nova
  □ 29. Validar territory resolver com coordenadas reais
  □ 30. Validar geometrias (ST_IsValid)

DIA 7
  □ 31. Cadastrar motoristas de teste na cidade nova
  □ 32. Teste E2E completo: corrida na cidade nova
  □ 33. Teste de isolamento: motorista RJ não recebe oferta de Niterói
  □ 34. Teste de regressão: corrida no RJ continua normal
  □ 35. Ativar cidade nova (is_active: true)
  □ 36. Monitorar primeiras corridas reais
```

---

## 14. Definição de Pronto

O KAVIAR está pronto para abrir as primeiras 2-3 cidades quando **todos** estes critérios forem verdadeiros:

### Critérios técnicos

1. Tabela `cities` existe com RJ ativo e cidade nova cadastrada
2. 100% dos neighborhoods têm `city_id` NOT NULL
3. `DISPATCH_CITY_FILTER=true` rodando em produção há pelo menos 24h sem incidentes
4. Kill switch testado e funcional (ativar/desativar cidade via endpoint)
5. Cidade nova tem ≥ 10 bairros com geofence PostGIS válida
6. Territory resolver resolve corretamente coordenadas da cidade nova
7. Pricing engine retorna perfil da cidade nova (não o default)
8. Teste E2E ponta a ponta na cidade nova passou
9. Teste de isolamento cross-city passou
10. Testes de regressão no RJ passaram

### Critérios operacionais

1. Pelo menos 5 motoristas aprovados na cidade nova com `neighborhood_id` correto
2. Operador sabe como ativar/desativar cidade (endpoint ou SQL)
3. Operador sabe como desligar filtro do dispatcher (env var)
4. Runbook de rollback documentado e testado

### Critério de confiança

Se a resposta para todas estas perguntas for "sim":
- Uma corrida no RJ funciona exatamente como antes?
- Uma corrida na cidade nova encontra motorista local?
- Um motorista do RJ NÃO recebe oferta da cidade nova?
- Consigo desligar a cidade nova em < 1 minuto se der problema?

**Então está pronto.**

---

## O Que Não Fazer Agora

| Tentação | Por que não |
|---|---|
| Adicionar `city_id` direto em `drivers` e `passengers` | Desnormalização prematura. Derivar via `neighborhood.city_id` é suficiente para 2-3 cidades. |
| Filtro de cidade no admin dashboard | Operável com 2-3 cidades sem filtro. Priorizar quando chegar em 5+. |
| Generalizar `geofence-governance.ts` | O `isLikelyInRioCity()` só é usado em verificação de bairros no admin, não no dispatch. Não bloqueia cidades novas. |
| Generalizar `neighborhood-policy.ts` | Cidades novas operam sem política de vizinhança (comportamento default = sem restrição). Aceitável para início. |
| Feature flags com escopo de cidade | O sistema atual (global + passenger_id) é suficiente. Escopo por cidade é Onda 0 ideal. |
| Criar tabela `neighborhood_policies` no banco | Over-engineering. Arquivo com map por city_slug resolve quando necessário. |
| Dashboard comparativo entre cidades | Luxo. Primeiro fazer funcionar, depois comparar. |
| Read replicas por região | Volume de 2-3 cidades não justifica. Revisitar com 6+. |
| Reescrever `import-geojson.ts` main() | O `main()` tem paths hardcoded, mas a função `importGeoJSON()` já aceita parâmetros. Chamar a função diretamente é suficiente. |
| Tornar `city_id` NOT NULL na migration inicial | Fazer em 2 passos é mais seguro. NOT NULL vem depois de validar que tudo está populado. |

---

## Gatilhos para Evoluir do Menor Caminho Viável para a Onda 0 Ideal

Evoluir quando **qualquer** destes gatilhos disparar:

| Gatilho | Sinal | Próximo bloco |
|---|---|---|
| **3ª cidade ativada** | Admin começa a reclamar de dados misturados | **Bloco D:** Filtro de cidade no admin dashboard |
| **Motorista de cidade nova tenta verificar bairro** | `isLikelyInRioCity()` retorna false e bloqueia | **Bloco B:** Generalizar `geofence-governance.ts` |
| **Cidade nova precisa de política de vizinhança** | Bairros sensíveis sem proteção | **Bloco B:** Generalizar `neighborhood-policy.ts` |
| **5+ cidades ativas** | Volume de dados no admin fica ingerenciável | **Bloco D completo:** Métricas por cidade, filtros em todas as listagens |
| **Feature precisa ser ativada só em 1 cidade** | Feature flag global não serve | **Feature flags city-scoped** |
| **Latência de queries subindo** | Dashboard lento, dispatch lento | **Índices adicionais + considerar read replica** |
| **Operador de cidade X vê dados de cidade Y** | Confusão operacional | **Permissões admin por cidade** (usar `lead_regions` existente) |

**Regra:** Não implementar nenhum desses blocos preventivamente. Implementar quando o gatilho disparar. Isso é anti-frankenstein.
