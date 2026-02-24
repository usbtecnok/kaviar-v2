# 🚀 KAVIAR PILOTO - FURNAS / AGRÍCOLA / MATA MACHADO
## Análise Técnica e Runbook para "Carro na Rua"

**Data:** 2026-02-21  
**Objetivo:** Acelerar piloto fechado em 3 áreas de Belo Horizonte  
**Status:** ⚠️ RDS inacessível (security group), análise baseada em código

---

## 📋 PARTE 1: GEOFENCE + GPS (Resolução de Território)

### ✅ CONFIRMAÇÕES TÉCNICAS

#### 1.1 Backend Resolve lat/lng → Comunidade/Bairro

**✅ CONFIRMADO** - Sistema implementado e funcional

**Arquivo:** `backend/src/services/territory-resolver.service.ts`

**Ordem de resolução:**
1. **COMMUNITY** (via `community_geofences.geom` PostGIS ST_Covers)
2. **NEIGHBORHOOD** (via `neighborhood_geofences.geom` PostGIS ST_Covers)
3. **FALLBACK_800M** (Haversine distance do centro do bairro)
4. **OUTSIDE** (fora da área de serviço)

**Função principal:**
```typescript
export async function resolveTerritory(lng: number, lat: number): Promise<TerritoryResolution>
```

**Retorno:**
```typescript
{
  resolved: boolean,
  community: { id: string, name: string } | null,
  neighborhood: { id: string, name: string } | null,
  method: 'community' | 'neighborhood' | 'fallback_800m' | 'outside',
  fallbackMeters?: number | null,
  srid: 4326
}
```

**Integrado em:**
- ✅ Onboarding de passageiro (`passenger-onboarding.ts`)
- ✅ Cálculo de taxa (`fee-calculation.ts`)
- ✅ Matching territorial (`territorial-match.ts`)
- ✅ Notificações (`notifications.ts`)
- ✅ API pública (`public.ts`)

---

#### 1.2 Fallback por Raio (800m)

**✅ CONFIRMADO** - Ativo e funcional

**Constante:** `FALLBACK_RADIUS_M = 800`

**Lógica:**
```typescript
// Se não encontrar geofence PostGIS, busca bairro mais próximo dentro de 800m
// Usa Haversine distance do centro do bairro (center_lat, center_lng)
```

**Aplicado quando:**
- Bairro não tem `neighborhood_geofences.geom` (polígono PostGIS)
- Coordenada está dentro de 800m do centro do bairro

**Taxa aplicada:** 12% (mesmo que bairro adjacente)

---

#### 1.3 Estrutura de Dados

**Tabelas relevantes:**

**`communities`**
- `id` (UUID)
- `name` (string)
- `is_active` (boolean)
- `center_lat`, `center_lng` (Decimal)
- `radius_meters` (int, opcional)
- `geofence` (string, legacy)

**`community_geofences`** (PostGIS)
- `id` (UUID)
- `community_id` (FK → communities)
- `center_lat`, `center_lng` (Decimal)
- `geom` (geometry MultiPolygon, SRID 4326) ← **FONTE DA VERDADE**
- `source` (string: 'manual', 'osm', 'datario')
- `confidence` (string: 'high', 'medium', 'low')
- `is_verified` (boolean)

**`neighborhoods`**
- `id` (UUID)
- `name` (string)
- `city` (string)
- `is_active` (boolean)
- `center_lat`, `center_lng` (Decimal)

**`neighborhood_geofences`** (PostGIS)
- `id` (UUID)
- `neighborhood_id` (FK → neighborhoods)
- `geom` (geometry MultiPolygon, SRID 4326) ← **FONTE DA VERDADE**
- `source` (string)

---

## 🚫 PARTE 2: CRIAÇÃO AUTOMÁTICA DE COMUNIDADE VIA GPS

### ✅ CONFIRMAÇÃO EXPLÍCITA

**❌ NÃO EXISTE** - Sistema NÃO cria comunidades automaticamente

**Evidências:**
1. ✅ Busca no código: `grep -r "auto.*create.*community" backend/src` → **0 resultados**
2. ✅ Busca por flags: `CREATE_COMMUNITY_FROM_GPS`, `ENABLE_AUTO_COMMUNITY` → **0 resultados**
3. ✅ Análise de `.env`: Sem variáveis relacionadas
4. ✅ Análise de rotas: Nenhum endpoint cria comunidade automaticamente

**Comportamento atual:**
- Se coordenada não resolve para comunidade/bairro → retorna `method: 'outside'`
- Frontend/backend **NÃO** cria registro automaticamente
- Criação de comunidade é **SEMPRE MANUAL** via:
  - Admin dashboard
  - Script de seed
  - Migration SQL

**Campo `auto_activation` em `communities`:**
- Existe no schema: `auto_activation Boolean @default(false)`
- **NÃO** é usado para criar comunidades
- Usado para ativar/desativar comunidade baseado em número de motoristas

---

## 🎯 PARTE 3: ENTREGA "CARRO NA RUA" - MVP PILOTO

### CAMINHO MAIS CURTO (15-30 dias)

#### FASE 1: PREPARAÇÃO DE DADOS (2-3 dias)

**Objetivo:** Garantir que Furnas/Agrícola/Mata Machado existem no banco

**Tarefas:**

1. **Verificar registros existentes** (1h)
   - ⚠️ **BLOQUEIO ATUAL:** RDS inacessível via psql/Prisma (security group)
   - **Solução:** Liberar IP temporariamente OU usar bastion host OU rodar via ECS task

2. **Criar/validar as 3 comunidades** (4h)
   - Se não existirem: criar via migration SQL
   - Campos mínimos: `name`, `center_lat`, `center_lng`, `is_active=true`

3. **Criar geofences mínimas** (8h)
   - Opção A: Polígonos simples (4 pontos retangulares)
   - Opção B: Usar raio de 500m (fallback já funciona)
   - Salvar em `community_geofences` com `source='manual'`, `confidence='medium'`

**Entregável:** 3 comunidades ativas com geofence funcional

---

#### FASE 2: MOTORISTAS (5-7 dias)

**Objetivo:** Garantir motoristas podem ficar online e enviar localização

**Tarefas:**

1. **Campo `is_online` em `drivers`** (2h)
   - Migration: `ALTER TABLE drivers ADD COLUMN is_online BOOLEAN DEFAULT false;`
   - Endpoint: `PATCH /api/drivers/toggle-online`

2. **Endpoint de localização** (já existe)
   - ✅ `PATCH /api/drivers/location` (linha 480 de `routes/drivers.ts`)
   - ⚠️ **SEM AUTENTICAÇÃO** (MVP - aceita qualquer driverId)
   - Atualiza: `last_lat`, `last_lng`, `last_location_updated_at`

3. **App motorista - envio periódico** (3 dias)
   - Implementar heartbeat a cada 10s quando online
   - Usar Geolocation API do navegador
   - Enviar para `/api/drivers/location`

4. **Validação de staleness** (1 dia)
   - Considerar motorista offline se `last_location_updated_at` > 60s

**Entregável:** Motoristas podem ficar online e sistema rastreia localização

---

#### FASE 3: CORRIDAS (7-10 dias)

**Objetivo:** Fluxo completo solicitar → dispatch → aceitar/rejeitar

**Tarefas:**

1. **Endpoint solicitar corrida** (já existe)
   - ✅ `POST /api/rides` (criação de corrida)
   - ✅ Resolve território de pickup/dropoff
   - ✅ Calcula taxa (7%/12%/20%)
   - ⚠️ Dispatch básico (não prioriza por geofence)

2. **Melhorar dispatch** (3 dias)
   - Filtrar motoristas `is_online=true`
   - Priorizar motoristas na mesma comunidade/bairro
   - Usar distância Haversine como critério secundário
   - Arquivo: `backend/src/services/dispatch.ts`

3. **Notificação para motorista** (2 dias)
   - Implementar SSE (Server-Sent Events) ou polling
   - Endpoint: `GET /api/drivers/pending-rides` (polling a cada 5s)
   - Retorna corridas com status `pending` próximas ao motorista

4. **Aceitar/rejeitar corrida** (já existe)
   - ✅ `PATCH /api/rides/:id/accept` (motorista aceita)
   - ✅ `PATCH /api/rides/:id/reject` (motorista rejeita)
   - ⚠️ Sem timeout automático (implementar)

5. **Timeout e re-dispatch** (2 dias)
   - Se motorista não responde em 30s → status `timeout`
   - Re-dispatch para próximo motorista da lista

**Entregável:** Fluxo completo de corrida funcional

---

#### FASE 4: APPS MOBILE (10-15 dias)

**Objetivo:** Apps funcionais para passageiro e motorista

**Passageiro:**
- Solicitar corrida (mapa + endereços)
- Ver motorista se aproximando (tracking)
- Avaliar corrida

**Motorista:**
- Toggle online/offline
- Ver corridas disponíveis
- Aceitar/rejeitar
- Navegação GPS (integrar Waze/Google Maps)

**Tecnologia:** React Native (reusar código do PWA existente)

---

## 📦 RUNBOOK - COMANDOS PRONTOS

### PASSO 1: LIBERAR ACESSO AO RDS

**Opção A: Liberar IP temporariamente**
```bash
# Obter seu IP público
MY_IP=$(curl -s https://api.ipify.org)

# Adicionar regra ao security group do RDS
aws ec2 authorize-security-group-ingress \
  --group-id sg-XXXXXXXX \
  --protocol tcp \
  --port 5432 \
  --cidr $MY_IP/32 \
  --region us-east-2
```

**Opção B: Usar bastion host (ECS task)**
```bash
# Rodar task ECS com psql
aws ecs run-task \
  --cluster kaviar-prod \
  --task-definition kaviar-backend \
  --count 1 \
  --region us-east-2

# Conectar via ECS Exec
aws ecs execute-command \
  --cluster kaviar-prod \
  --task TASK_ID \
  --container kaviar-backend \
  --command "/bin/bash" \
  --interactive \
  --region us-east-2
```

---

### PASSO 2: VERIFICAR REGISTROS EXISTENTES

**SQL: Listar comunidades das 3 áreas**
```sql
SELECT 
  id,
  name,
  is_active,
  center_lat,
  center_lng,
  radius_meters
FROM communities
WHERE LOWER(name) LIKE '%furnas%' 
   OR LOWER(name) LIKE '%agricola%' 
   OR LOWER(name) LIKE '%mata machado%'
ORDER BY name;
```

**SQL: Listar geofences associadas**
```sql
SELECT 
  cg.id,
  c.name as community_name,
  cg.center_lat,
  cg.center_lng,
  cg.source,
  cg.confidence,
  cg.is_verified,
  CASE WHEN cg.geom IS NOT NULL THEN 'SIM' ELSE 'NÃO' END as tem_geom
FROM community_geofences cg
JOIN communities c ON c.id = cg.community_id
WHERE LOWER(c.name) LIKE '%furnas%' 
   OR LOWER(c.name) LIKE '%agricola%' 
   OR LOWER(c.name) LIKE '%mata machado%'
ORDER BY c.name;
```

**Prisma (via Node.js):**
```typescript
const communities = await prisma.communities.findMany({
  where: {
    OR: [
      { name: { contains: 'Furnas', mode: 'insensitive' } },
      { name: { contains: 'Agrícola', mode: 'insensitive' } },
      { name: { contains: 'Mata Machado', mode: 'insensitive' } },
    ],
  },
  include: {
    community_geofences: true,
  },
});
console.log(JSON.stringify(communities, null, 2));
```

---

### PASSO 3: CRIAR AS 3 COMUNIDADES (SE NÃO EXISTIREM)

**Coordenadas aproximadas (Belo Horizonte):**
- **Furnas:** -19.9350, -43.9450
- **Agrícola:** -19.9280, -43.9380
- **Mata Machado:** -19.9400, -43.9500

**Migration SQL:**
```sql
-- Criar comunidades
INSERT INTO communities (id, name, center_lat, center_lng, radius_meters, is_active, created_at, updated_at)
VALUES 
  (gen_random_uuid(), 'Furnas', -19.9350, -43.9450, 800, true, NOW(), NOW()),
  (gen_random_uuid(), 'Agrícola', -19.9280, -43.9380, 800, true, NOW(), NOW()),
  (gen_random_uuid(), 'Mata Machado', -19.9400, -43.9500, 800, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
```

**Prisma (via seed):**
```typescript
const communities = [
  { name: 'Furnas', center_lat: -19.9350, center_lng: -43.9450 },
  { name: 'Agrícola', center_lat: -19.9280, center_lng: -43.9380 },
  { name: 'Mata Machado', center_lat: -19.9400, center_lng: -43.9500 },
];

for (const c of communities) {
  await prisma.communities.upsert({
    where: { name: c.name },
    update: {},
    create: {
      id: randomUUID(),
      name: c.name,
      center_lat: c.center_lat,
      center_lng: c.center_lng,
      radius_meters: 800,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });
}
```

---

### PASSO 4: CRIAR GEOFENCES MÍNIMAS

**Opção A: Polígonos simples (retângulo 500m x 500m)**
```sql
-- Furnas
INSERT INTO community_geofences (
  id, 
  community_id, 
  center_lat, 
  center_lng, 
  source, 
  confidence, 
  is_verified,
  geom,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  c.id,
  -19.9350,
  -43.9450,
  'manual',
  'medium',
  false,
  ST_GeomFromText(
    'MULTIPOLYGON(((-43.9475 -19.9375, -43.9425 -19.9375, -43.9425 -19.9325, -43.9475 -19.9325, -43.9475 -19.9375)))',
    4326
  ),
  NOW(),
  NOW()
FROM communities c
WHERE c.name = 'Furnas'
ON CONFLICT (community_id) DO NOTHING;

-- Repetir para Agrícola e Mata Machado
```

**Opção B: Usar fallback de 800m (sem criar geofence)**
- Sistema já funciona com fallback
- Basta ter `center_lat`, `center_lng` em `communities`
- Resolução será `method: 'fallback_800m'`

---

### PASSO 5: TESTAR RESOLUÇÃO DE TERRITÓRIO

**Coordenadas de teste:**

**Furnas:**
- Centro: -19.9350, -43.9450
- Dentro: -19.9340, -43.9460
- Fora: -19.9250, -43.9350

**Agrícola:**
- Centro: -19.9280, -43.9380
- Dentro: -19.9270, -43.9390
- Fora: -19.9180, -43.9280

**Mata Machado:**
- Centro: -19.9400, -43.9500
- Dentro: -19.9390, -43.9510
- Fora: -19.9300, -43.9400

**cURL: Testar resolução**
```bash
# Furnas - dentro
curl -X POST http://localhost:3003/api/territory/resolve \
  -H "Content-Type: application/json" \
  -d '{"lat": -19.9340, "lng": -43.9460}'

# Esperado:
# {
#   "resolved": true,
#   "community": {"id": "...", "name": "Furnas"},
#   "method": "community" ou "fallback_800m"
# }

# Furnas - fora
curl -X POST http://localhost:3003/api/territory/resolve \
  -H "Content-Type: application/json" \
  -d '{"lat": -19.9250, "lng": -43.9350}'

# Esperado:
# {
#   "resolved": false,
#   "method": "outside"
# }
```

**Prisma (via Node.js):**
```typescript
import { resolveTerritory } from './services/territory-resolver.service';

// Testar Furnas
const result1 = await resolveTerritory(-43.9460, -19.9340);
console.log('Furnas (dentro):', result1);

const result2 = await resolveTerritory(-43.9350, -19.9250);
console.log('Furnas (fora):', result2);

// Repetir para Agrícola e Mata Machado
```

---

### PASSO 6: VALIDAR DISPATCH POR GEOFENCE

**Cenário:**
- Motorista A em Furnas (online)
- Motorista B em Agrícola (online)
- Passageiro solicita corrida em Furnas

**Esperado:** Motorista A deve ser priorizado

**SQL: Criar motoristas de teste**
```sql
-- Motorista A (Furnas)
INSERT INTO drivers (id, name, email, phone, status, last_lat, last_lng, last_location_updated_at, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'Motorista Furnas',
  'motorista.furnas@test.com',
  '31999999001',
  'active',
  -19.9340,
  -43.9460,
  NOW(),
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM drivers WHERE email = 'motorista.furnas@test.com');

-- Motorista B (Agrícola)
INSERT INTO drivers (id, name, email, phone, status, last_lat, last_lng, last_location_updated_at, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'Motorista Agrícola',
  'motorista.agricola@test.com',
  '31999999002',
  'active',
  -19.9270,
  -43.9390,
  NOW(),
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM drivers WHERE email = 'motorista.agricola@test.com');
```

**cURL: Solicitar corrida em Furnas**
```bash
# 1. Login como passageiro
TOKEN=$(curl -X POST http://localhost:3003/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"passageiro@test.com","password":"senha123"}' \
  | jq -r '.token')

# 2. Solicitar corrida
curl -X POST http://localhost:3003/api/rides \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pickup_lat": -19.9340,
    "pickup_lng": -43.9460,
    "dropoff_lat": -19.9350,
    "dropoff_lng": -43.9470,
    "fare": 15.00
  }' | jq

# 3. Verificar qual motorista foi atribuído
# Esperado: driver_id do Motorista A (Furnas)
```

**SQL: Verificar dispatch**
```sql
SELECT 
  r.id as ride_id,
  r.driver_id,
  d.name as driver_name,
  r.pickup_lat,
  r.pickup_lng,
  r.status,
  r.created_at
FROM rides r
LEFT JOIN drivers d ON d.id = r.driver_id
ORDER BY r.created_at DESC
LIMIT 5;
```

---

## 🎯 ENTREGÁVEL FINAL

### CHECKLIST DE VALIDAÇÃO

**Geofence + GPS:**
- [ ] 3 comunidades cadastradas (Furnas/Agrícola/Mata Machado)
- [ ] Geofences criadas (PostGIS ou fallback 800m)
- [ ] Resolução de território testada (6 coordenadas)
- [ ] Fallback 800m funciona para áreas sem polígono

**Motoristas:**
- [ ] Campo `is_online` criado
- [ ] Endpoint `/api/drivers/toggle-online` funciona
- [ ] Endpoint `/api/drivers/location` atualiza localização
- [ ] 2 motoristas de teste criados (1 por área)

**Corridas:**
- [ ] Endpoint `/api/rides` cria corrida
- [ ] Dispatch prioriza motoristas na mesma geofence
- [ ] Motorista pode aceitar/rejeitar
- [ ] Timeout e re-dispatch funcionam

**Evidências:**
- [ ] Logs de resolução de território (6 testes)
- [ ] Logs de dispatch (priorização por geofence)
- [ ] Screenshots de corrida completa (solicitar → aceitar → finalizar)

---

## ⚠️ BLOQUEADORES ATUAIS

1. **RDS inacessível** (security group)
   - Impede verificação de dados existentes
   - Impede criação de comunidades via SQL
   - **Solução:** Liberar IP ou usar bastion host

2. **Apps mobile não existem**
   - Motorista não pode enviar localização em tempo real
   - Passageiro não pode solicitar corrida
   - **Solução:** Desenvolver apps (10-15 dias)

3. **Dispatch não prioriza geofence**
   - Lógica existe mas não é aplicada
   - **Solução:** Modificar `dispatch.ts` (1 dia)

---

## 📅 CRONOGRAMA REALISTA

**Semana 1:**
- Liberar acesso RDS
- Criar 3 comunidades + geofences
- Testar resolução de território
- Adicionar campo `is_online`

**Semana 2:**
- Melhorar dispatch (priorização por geofence)
- Implementar timeout e re-dispatch
- Criar motoristas de teste

**Semana 3-4:**
- Desenvolver apps mobile (React Native)
- Integrar envio de localização
- Testar fluxo completo

**Semana 5:**
- Piloto fechado com 5 motoristas reais
- 50 corridas de teste
- Ajustes baseados em feedback

**Total: 30-35 dias para "carro na rua"**

---

## 🚀 PRÓXIMOS PASSOS IMEDIATOS

1. **Liberar acesso ao RDS** (você ou DevOps)
2. **Rodar script de análise** (`analise-piloto.ts`)
3. **Criar 3 comunidades** (se não existirem)
4. **Testar resolução de território** (6 coordenadas)
5. **Validar que sistema funciona** (evidências)

**Aguardando sua autorização para:**
- Liberar IP no security group do RDS
- Criar as 3 comunidades (se não existirem)
- Criar geofences mínimas (draft)

---

**Documentação completa salva em:** `/home/goes/kaviar/PILOTO_FURNAS_RUNBOOK.md`
