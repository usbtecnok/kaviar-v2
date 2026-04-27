# KAVIAR — Onda 0: Preparação Multi-Cidade

**Data:** 18 de abril de 2026
**Baseado em:** Análise do código real do projeto (schema Prisma, dispatcher, pricing engine, territory resolver, admin, scripts)

---

## 1. Resumo Executivo da Onda 0

### Obrigatório antes de abrir novas cidades

1. **Criar model `cities`** no Prisma schema — entidade central que amarra neighborhoods, pricing e operação
2. **Filtro de cidade no dispatcher** — `DispatcherService.findCandidates()` hoje busca TODOS os motoristas online de todas as cidades
3. **Filtro de cidade no admin** — dashboard, listagens e métricas precisam de seletor de cidade
4. **Generalizar `geofence-governance.ts`** — hoje tem `RJ_BBOX` e `isLikelyInRioCity()` hardcoded
5. **Generalizar `neighborhood-policy.ts`** — `SENSITIVE_NEIGHBORHOODS` e `NEIGHBORHOOD_ALLOWLIST` são 100% RJ
6. **GeoJSON + seeds da primeira cidade nova** — sem polígonos importados, o territory resolver cai em fallback/OUTSIDE
7. **Kill switch por cidade** — mecanismo para desativar uma cidade sem afetar as outras

### Desejável mas pode ficar para depois

- Dashboard de métricas comparativas entre cidades
- Feature flags com escopo de cidade (hoje são globais ou por passenger_id)
- Read replicas do RDS por região
- Automação de importação de GeoJSON (CLI parametrizado)

### Não mexer agora (anti-frankenstein)

- **Não** criar banco separado por cidade — o modelo shared-DB com `city_id` é suficiente
- **Não** reescrever o territory resolver — ele já é genérico (PostGIS ST_Covers), só precisa de dados
- **Não** reescrever o pricing engine — `resolveProfile()` já resolve por proximidade geográfica
- **Não** criar microserviço de dispatch — o monolito atual aguenta 12 cidades tranquilo
- **Não** mexer no fluxo de corrida (`rides-v2.ts`) — ele já resolve território por coordenadas

---

## 2. Diagnóstico do Estado Atual

### Acoplado ao Rio de Janeiro

| Arquivo | Acoplamento | Detalhe |
|---|---|---|
| `src/utils/geofence-governance.ts` | **HARD** | `RJ_BBOX` hardcoded, `isLikelyInRioCity()` usado como guard rail |
| `src/config/neighborhood-policy.ts` | **HARD** | `SENSITIVE_NEIGHBORHOODS` e `NEIGHBORHOOD_ALLOWLIST` são 100% bairros do RJ |
| `src/scripts/import-geojson.ts` | **SOFT** | Paths hardcoded para `rio_bairros.geojson` e `rio_favelas.geojson` no `main()` |
| `data/` | **HARD** | Só contém `rj_bairros_*.geojson` — zero dados de outras cidades |
| `prisma/schema.prisma` | **SOFT** | `neighborhoods.city` tem default `"Rio de Janeiro"` |
| `src/scripts/seed-bairros.ts` | **HARD** | Seeds específicos do RJ |

### Naturalmente multi-cidade (já funciona)

| Componente | Arquivo | Por quê |
|---|---|---|
| Territory Resolver | `services/territory-resolver.service.ts` | Resolve por coordenadas via PostGIS. Não tem referência a cidade nenhuma. |
| Pricing Engine | `services/pricing-engine.ts` | `resolveProfile()` busca perfil por proximidade geográfica (`center_lat/lng + radius_km`). |
| Dispatcher scoring | `services/dispatcher.service.ts` | Scoring por tier territorial (COMMUNITY → NEIGHBORHOOD → OUTSIDE) + distância Haversine. |
| Ride creation | `routes/rides-v2.ts` | Resolve território da origem/destino por coordenadas, sem referência a cidade. |
| Feature flags | `services/feature-flag.service.ts` | Sistema genérico por key + passenger_id. |
| Settlements | `pricing-engine.ts` (settle) | Fonte de verdade econômica, snapshot de perfil. Independente de cidade. |
| RBAC | `middlewares/auth.ts` | Roles globais. `admins.lead_regions` existe para escopo regional. |

### Riscos de abrir sem preparação

1. **Dispatcher cross-city:** Motorista de SP recebe oferta de corrida no RJ (distância > 12km descarta, mas gasta CPU e queries desnecessárias)
2. **Pricing errado:** Sem GeoJSON importado, toda corrida em cidade nova é classificada como `external` (taxa 20%)
3. **Admin cego:** Operador não consegue filtrar por cidade — vê tudo misturado
4. **Geofence governance bloqueia:** `isLikelyInRioCity()` retorna false para qualquer coordenada fora do RJ, bloqueando verificação de bairros
5. **Neighborhood policy vazia:** Cidades novas não têm `SENSITIVE_NEIGHBORHOODS` nem `NEIGHBORHOOD_ALLOWLIST`, caindo em comportamento default sem proteção

---

## 3. Mudanças de Modelagem de Dados

### Criar entidade `cities`? SIM — é necessário

Hoje `neighborhoods.city` é uma string livre com default `"Rio de Janeiro"`. Isso funciona para 1 cidade, mas para 12:
- Não há como fazer kill switch por cidade
- Não há como associar pricing profile a cidade
- Não há como filtrar admin por cidade de forma confiável
- Typos na string (`"Rio de janeiro"` vs `"Rio de Janeiro"`) quebram tudo

### Estrutura mínima recomendada

```prisma
model cities {
  id            String   @id @default(uuid())
  name          String   @unique          // "Rio de Janeiro"
  slug          String   @unique          // "rio-de-janeiro"
  state         String                    // "RJ"
  timezone      String   @default("America/Sao_Paulo")
  is_active     Boolean  @default(false)  // kill switch
  launched_at   DateTime?
  // Bbox para guard rail (substitui RJ_BBOX hardcoded)
  bbox_min_lat  Decimal? @db.Decimal(10, 8)
  bbox_max_lat  Decimal? @db.Decimal(10, 8)
  bbox_min_lng  Decimal? @db.Decimal(11, 8)
  bbox_max_lng  Decimal? @db.Decimal(11, 8)
  created_at    DateTime @default(now())
  updated_at    DateTime @updatedAt

  neighborhoods neighborhoods[]
  pricing_profiles pricing_profiles[]
}
```

### Relacionamentos

**Obrigatório agora:**
- `neighborhoods.city_id` → FK para `cities.id` (substituir o campo string `city`)
- `pricing_profiles.city_id` → FK para `cities.id` (opcional, null = default global)

**Pode ser posterior:**
- `drivers.city_id` — derivável via `driver.neighborhood.city_id`, não precisa de campo direto agora
- `passengers.city_id` — idem, derivável via neighborhood
- `rides_v2.city_id` — derivável via `origin_neighborhood.city_id`, mas útil para queries rápidas (desnormalização futura)

### Migration strategy

A migration precisa:
1. Criar tabela `cities`
2. Inserir cidade "Rio de Janeiro" com os dados do `RJ_BBOX` atual
3. Adicionar `city_id` em `neighborhoods` (nullable inicialmente)
4. Popular `city_id` em todos os neighborhoods existentes (`UPDATE neighborhoods SET city_id = '<rj-uuid>' WHERE city = 'Rio de Janeiro'`)
5. Tornar `city_id` NOT NULL
6. Manter campo `city` (string) temporariamente para backward compatibility
7. Adicionar `city_id` opcional em `pricing_profiles`

---

## 4. Mudanças no Dispatcher

### Problema atual

Em `services/dispatcher.service.ts`, o método `findCandidates()` faz:

```typescript
const onlineDrivers = await prisma.driver_status.findMany({
  where: { availability: 'online' },
  include: { driver: { include: { driver_location: true } } }
});
```

Isso retorna TODOS os motoristas online de TODAS as cidades. Com 12 cidades e 400+ motoristas, itera todos para calcular Haversine e descartar 95% por distância.

### Solução: filtro por cidade antes da iteração

A corrida (`rides_v2`) já tem `origin_neighborhood_id` resolvido. Basta:

1. Resolver a cidade da corrida via neighborhood
2. Filtrar motoristas pela mesma cidade

```typescript
// No início de findCandidates(), ANTES do loop:
let rideCityId: string | null = null;
if (ride.origin_neighborhood_id) {
  const originNb = await prisma.neighborhoods.findUnique({
    where: { id: ride.origin_neighborhood_id },
    select: { city_id: true }
  });
  rideCityId = originNb?.city_id || null;
}

const onlineDrivers = await prisma.driver_status.findMany({
  where: {
    availability: 'online',
    ...(rideCityId ? {
      driver: {
        neighborhoods: { city_id: rideCityId }
      }
    } : {})
  },
  include: { driver: { include: { driver_location: true } } }
});
```

### Impacto

- **Performance:** Reduz de ~400 iterações para ~30-50 (motoristas da cidade). Query mais seletiva.
- **Scoring:** Zero impacto — o scoring territorial (COMMUNITY → NEIGHBORHOOD → OUTSIDE) continua idêntico.
- **Risco:** Baixo. Se `rideCityId` for null (corrida sem neighborhood resolvido), cai no comportamento atual (busca global). Fail-safe.
- **Fallback:** Motorista sem `neighborhood_id` não aparece no filtro. Isso é correto — motorista sem bairro cadastrado não deveria receber ofertas.

### Implementação incremental

1. Adicionar o filtro com feature flag (`DISPATCH_CITY_FILTER=true`)
2. Logar quando o filtro é aplicado vs quando cai no fallback global
3. Ativar em produção após validar que não reduz pool de candidatos no RJ
4. Remover feature flag quando estável

---

## 5. Mudanças no Territory Resolver e Cobertura

### O que precisa mudar: NADA no resolver

O `territory-resolver.service.ts` já é 100% genérico:
- `resolveCommunity()` → PostGIS `ST_Covers` em `community_geofences.geom`
- `resolveNeighborhood()` → PostGIS `ST_Covers` em `neighborhood_geofences.geom`
- `resolveFallback()` → Haversine 800m do centro do neighborhood

Nenhuma referência a cidade. Funciona para qualquer coordenada do planeta.

### O que precisa mudar: dados de cobertura

Para cada cidade nova, o fluxo é:

1. **Obter GeoJSON** — Fontes: IBGE (malha de setores/bairros), prefeituras (dados abertos), OpenStreetMap
2. **Validar GeoJSON** — Geometrias válidas (`ST_IsValid`), sem self-intersections
3. **Importar via `import-geojson.ts`** — O script já aceita parâmetro `city` na função `importGeoJSON(filePath, city, areaType)`
4. **Verificar resolução** — Testar coordenadas conhecidas da cidade contra o territory resolver

### Generalizar o script de importação

O `main()` de `import-geojson.ts` tem paths hardcoded. Mudar para aceitar argumentos:

```typescript
// Antes (hardcoded):
await importGeoJSON(path.join(dataDir, 'rio_bairros.geojson'), 'Rio de Janeiro', 'BAIRRO_OFICIAL');

// Depois (parametrizado):
const [,, filePath, citySlug, areaType] = process.argv;
// ts-node import-geojson.ts ../data/niteroi_bairros.geojson niteroi BAIRRO_OFICIAL
```

### Generalizar `geofence-governance.ts`

Substituir `RJ_BBOX` hardcoded por lookup na tabela `cities`:

```typescript
// Antes:
export function isLikelyInRioCity(lat: number, lng: number): boolean { ... }

// Depois:
export async function isLikelyInCity(lat: number, lng: number, cityId: string): Promise<boolean> {
  const city = await getCityById(cityId); // com cache
  if (!city?.bbox_min_lat) return true; // sem bbox = aceita tudo
  return lat >= city.bbox_min_lat && lat <= city.bbox_max_lat
      && lng >= city.bbox_min_lng && lng <= city.bbox_max_lng;
}
```

### Generalizar `neighborhood-policy.ts`

Mover `SENSITIVE_NEIGHBORHOODS` e `NEIGHBORHOOD_ALLOWLIST` para o banco:

**Opção pragmática (Onda 0):** Manter o arquivo mas tornar city-aware:

```typescript
const POLICIES: Record<string, { sensitive: Set<string>; allowlist: Record<string, string[]> }> = {
  'rio-de-janeiro': {
    sensitive: new Set(['Copacabana', 'Ipanema', ...]),
    allowlist: { 'Copacabana': ['Leme', 'Ipanema', ...], ... }
  },
  // Cidades novas começam sem política (comportamento default)
};

export function isSensitiveNeighborhood(name: string, citySlug: string): boolean {
  return POLICIES[citySlug]?.sensitive?.has(name) ?? false;
}
```

**Opção ideal (posterior):** Tabela `neighborhood_policies` no banco. Mas isso é Onda 2.

---

## 6. Mudanças no Pricing Engine

### O que já funciona

O `pricing-engine.ts` resolve perfil por proximidade geográfica:

```typescript
export async function resolveProfile(lat: number, lng: number): Promise<PricingProfile> {
  // Busca perfil regional por center_lat/lng + radius_km
  // Fallback para perfil default
}
```

Isso já é multi-cidade nativo. Basta criar um `pricing_profile` por cidade com `center_lat/lng` e `radius_km` adequados.

### O que precisa mudar: POUCO

**Obrigatório agora:**
1. Criar pricing profile para cada cidade nova (1 INSERT por cidade)
2. Adicionar `city_id` opcional em `pricing_profiles` para facilitar admin (FK para `cities`)

**Pode esperar:**
- Pricing dinâmico por demanda/cidade
- Perfis diferentes por bairro dentro da mesma cidade
- A/B testing de pricing por cidade

### Risco

Se uma cidade nova não tem pricing profile com `center_lat/lng`, o `resolveProfile()` cai no perfil default. Isso é **aceitável** como fallback — a cidade nova opera com pricing padrão até ter perfil próprio.

---

## 7. Mudanças no Admin

### Estado atual

- `routes/admin-dashboard-metrics.ts` → Métricas globais, sem filtro de cidade
- `routes/dashboard.ts` → Overview global, mas já faz `GROUP BY city` em neighborhoods
- `routes/admin-operations.ts` → Monitor de corridas/ofertas global
- `routes/admin-drivers.ts` → Listagem global de motoristas
- `modules/admin/dashboard-service.ts` → Queries globais (usa model `rides` antigo)

### Mínimo necessário (Onda 0)

**1. Seletor de cidade no frontend**

Query param `?city=rio-de-janeiro` em todas as rotas admin. O frontend adiciona um dropdown no header.

**2. Filtro de cidade nas queries backend**

Padrão: adicionar `WHERE neighborhoods.city_id = $cityId` (via join) nas listagens de:
- Motoristas (`admin-drivers.ts`)
- Corridas (`admin-operations.ts` monitor)
- Métricas (`admin-dashboard-metrics.ts`)

Se `city` não for passado, retorna tudo (backward compatible).

**3. Endpoint de cidades**

```
GET  /api/admin/cities          → lista cidades (ativas e inativas)
POST /api/admin/cities          → cria cidade (SUPER_ADMIN)
PUT  /api/admin/cities/:id      → atualiza (ativar/desativar = kill switch)
```

**4. Métricas por cidade no dashboard**

O `routes/dashboard.ts` já faz `GROUP BY city`. Basta expor isso de forma mais clara e adicionar filtro.

### O que NÃO fazer agora

- Não criar dashboards separados por cidade
- Não implementar permissões de admin por cidade (usar `lead_regions` existente se necessário)
- Não criar sistema de alertas por cidade

---

## 8. Plano de Implementação em Etapas

### Bloco A — Model `cities` + migration (sem dependências)

1. Criar model `cities` no schema.prisma
2. Migration: criar tabela, inserir RJ, adicionar `city_id` em neighborhoods
3. Popular `city_id` nos neighborhoods existentes
4. Adicionar `city_id` opcional em `pricing_profiles`
5. Endpoint CRUD `/api/admin/cities`

**Dependências:** Nenhuma. Pode ser feito primeiro.
**Risco:** Baixo. Aditivo — não quebra nada existente.

### Bloco B — Generalizar hardcodes RJ (depende de A)

1. Refatorar `geofence-governance.ts`: substituir `RJ_BBOX` por lookup em `cities.bbox_*`
2. Refatorar `neighborhood-policy.ts`: tornar city-aware
3. Parametrizar `import-geojson.ts` main()

**Dependências:** Bloco A (precisa da tabela `cities` com bbox).
**Risco:** Médio. Precisa garantir que o comportamento para RJ não muda.

### Bloco C — Filtro de cidade no dispatcher (depende de A)

1. Adicionar filtro por `city_id` em `findCandidates()`
2. Feature flag `DISPATCH_CITY_FILTER`
3. Logging de diagnóstico (candidatos filtrados vs total)
4. Teste: criar corrida no RJ, verificar que só motoristas do RJ aparecem

**Dependências:** Bloco A (neighborhoods precisa de `city_id`).
**Risco:** Médio. Precisa de feature flag para rollback seguro.

### Bloco D — Filtro de cidade no admin (depende de A)

1. Seletor de cidade no frontend (dropdown no header)
2. Query param `?city_slug=` em rotas admin
3. Filtro nas listagens: motoristas, corridas, métricas
4. Dashboard overview com breakdown por cidade

**Dependências:** Bloco A (endpoint de cidades).
**Risco:** Baixo. Aditivo — sem filtro, comportamento atual.

### Bloco E — Dados da primeira cidade nova (depende de A + B)

1. Obter GeoJSON de Niterói (ou cidade escolhida)
2. Importar via script parametrizado
3. Criar pricing profile da cidade
4. Criar cidade no banco com `is_active: false`
5. Testar territory resolver com coordenadas da cidade
6. Ativar cidade (`is_active: true`)

**Dependências:** Blocos A e B.
**Risco:** Baixo. Dados novos, não afeta RJ.

### Paralelismo possível

```
Semana 1-2:  [Bloco A] ─────────────────────────────
Semana 1-2:  [Bloco D frontend] ──────── (paralelo)
Semana 2-3:  [Bloco B] ── (após A)
Semana 2-3:  [Bloco C] ── (após A, paralelo com B)
Semana 3-4:  [Bloco E] ── (após A+B)
```

**Total estimado: 3-4 semanas com 1 dev.**

---

## 9. Riscos Técnicos e Operacionais

### Risco de regressão

| Onde | Risco | Mitigação |
|---|---|---|
| Migration `city_id` em neighborhoods | Médio — se FK quebrar, queries falham | Migration em 2 passos: nullable → popular → NOT NULL |
| Dispatcher com filtro de cidade | Médio — pode reduzir pool de candidatos | Feature flag + logging + fallback para busca global |
| `geofence-governance.ts` refactor | Alto — usado em verificação de bairros | Manter `isLikelyInRioCity()` como alias que chama a nova função com city_id do RJ |

### Risco de dados inconsistentes

| Onde | Risco | Mitigação |
|---|---|---|
| Neighborhoods sem `city_id` | Alto se migration falhar parcialmente | Script de validação: `SELECT COUNT(*) FROM neighborhoods WHERE city_id IS NULL` |
| GeoJSON com geometrias inválidas | Médio — territory resolver retorna OUTSIDE | Validar com `ST_IsValid()` no import |
| Pricing profile sem `center_lat/lng` | Baixo — cai no default | Aceitável como fallback |

### Risco de mexer demais

| Tentação | Por que evitar |
|---|---|
| Adicionar `city_id` direto em drivers/passengers | Desnormalização prematura. Derivar via neighborhood é suficiente. |
| Criar tabela `neighborhood_policies` | Over-engineering. Arquivo com map por city_slug resolve. |
| Reescrever dashboard-service.ts | Usa model `rides` (v1). Não é usado em produção real — `admin-dashboard-metrics.ts` usa `rides_v2`. Deixar morrer naturalmente. |

---

## 10. Checklist de Pronto para Onda 1

### Checklist técnico

- [ ] Tabela `cities` existe com RJ cadastrado e `is_active: true`
- [ ] Todos os neighborhoods têm `city_id` NOT NULL
- [ ] Dispatcher filtra motoristas por cidade (feature flag ativa)
- [ ] Admin tem seletor de cidade funcional
- [ ] `geofence-governance.ts` não tem hardcode de RJ (usa tabela `cities`)
- [ ] `neighborhood-policy.ts` é city-aware
- [ ] Script de importação de GeoJSON aceita cidade como parâmetro
- [ ] Cidade nova (Niterói) tem GeoJSON importado e validado
- [ ] Cidade nova tem pricing profile criado
- [ ] Teste E2E: corrida em cidade nova → dispatch → match → pricing → settlement funciona
- [ ] Teste E2E: corrida no RJ continua funcionando identicamente
- [ ] Corridas de cidade X não geram ofertas para motoristas de cidade Y
- [ ] Kill switch funciona: `cities.is_active = false` impede novas corridas

### Checklist operacional

- [ ] Mínimo 10 motoristas aprovados na cidade nova antes do lançamento
- [ ] Pelo menos 1 operador designado para monitorar a cidade nova
- [ ] Pipeline de captação (referral agents) ativo na cidade
- [ ] Material de onboarding adaptado (bairros locais, referências)
- [ ] Runbook de lançamento documentado
- [ ] Runbook de rollback (desativar cidade) documentado
- [ ] Canal WhatsApp com capacidade para volume adicional
- [ ] Critérios de go/no-go definidos (métricas de saúde)

---

## 11. Estimativa Qualitativa de Esforço

| Bloco | Esforço | Complexidade | Sensibilidade | Notas |
|---|---|---|---|---|
| **A: Model cities + migration** | Baixo | Baixa | Média | Migration precisa ser cuidadosa (popular city_id). Código é simples. |
| **B: Generalizar hardcodes RJ** | Médio | Média | Alta | `geofence-governance.ts` é usado em verificação. Precisa de testes. |
| **C: Filtro dispatcher** | Baixo | Baixa | Alta | Poucas linhas de código, mas impacto direto no core do produto. Feature flag obrigatória. |
| **D: Filtro admin** | Médio | Média | Baixa | Mais volume de trabalho (várias rotas + frontend), mas baixo risco. |
| **E: Dados cidade nova** | Baixo-Médio | Baixa | Baixa | Depende da qualidade do GeoJSON disponível. |

---

## 12. Recomendação Final

### Menor Onda 0 possível viável

Se o objetivo é lançar UMA cidade nova (ex: Niterói) com o mínimo de mudanças:

1. **Bloco A** — Criar `cities`, migrar neighborhoods (3-4 dias)
2. **Bloco C** — Filtro de cidade no dispatcher (1-2 dias)
3. **Bloco E parcial** — Importar GeoJSON de Niterói + pricing profile (1-2 dias)

Total: ~1 semana. O admin fica sem filtro (operador filtra mentalmente), o `geofence-governance.ts` continua com hardcode do RJ (Niterói não é bloqueado porque a função só é usada em verificação de bairros, não no dispatch).

**Risco:** Operável, mas o admin fica confuso com dados misturados. Aceitável para 2 cidades, não para 12.

### Onda 0 ideal

Todos os 5 blocos (A + B + C + D + E):

1. **Bloco A** — Model cities + migration (semana 1)
2. **Bloco B + C** em paralelo — Generalizar hardcodes + filtro dispatcher (semana 2)
3. **Bloco D** — Filtro admin (semana 2-3)
4. **Bloco E** — Dados + validação da primeira cidade nova (semana 3)

Total: ~3 semanas. Sistema pronto para expansão controlada com visibilidade operacional.

### Recomendação anti-frankenstein

**Ir com a Onda 0 ideal (3 semanas).** O custo marginal dos blocos B e D é baixo comparado ao risco de operar 12 cidades com admin cego e hardcodes do RJ. O investimento de 3 semanas evita meses de dor operacional.

A regra é: **cada bloco deve funcionar em produção sozinho, sem depender dos próximos**. Se o Bloco A entrar e o resto atrasar, o sistema continua funcionando identicamente. Se o Bloco C entrar com feature flag desligada, zero impacto. Isso é expansão incremental de verdade.

---

## Ordem Exata de Execução

```
1. [Bloco A] Criar model cities no schema.prisma
2. [Bloco A] Escrever migration (criar tabela, inserir RJ, add city_id)
3. [Bloco A] Rodar migration em dev, validar
4. [Bloco A] Endpoint CRUD /api/admin/cities
5. [Bloco A] Rodar migration em produção
   ── checkpoint: RJ funciona identicamente ──
6. [Bloco C] Adicionar filtro city_id em findCandidates() com feature flag
7. [Bloco C] Deploy com DISPATCH_CITY_FILTER=false
8. [Bloco C] Ativar flag, monitorar logs de dispatch
   ── checkpoint: dispatch filtra por cidade ──
9. [Bloco B] Refatorar geofence-governance.ts (bbox da tabela cities)
10. [Bloco B] Refatorar neighborhood-policy.ts (city-aware)
11. [Bloco B] Parametrizar import-geojson.ts
    ── checkpoint: zero hardcode RJ ──
12. [Bloco D] Seletor de cidade no frontend admin
13. [Bloco D] Filtro de cidade nas rotas admin backend
14. [Bloco D] Métricas por cidade no dashboard
    ── checkpoint: admin multi-cidade funcional ──
15. [Bloco E] Obter e validar GeoJSON da cidade nova
16. [Bloco E] Importar GeoJSON + criar pricing profile
17. [Bloco E] Criar cidade no banco (is_active: false)
18. [Bloco E] Teste E2E completo na cidade nova
19. [Bloco E] Ativar cidade (is_active: true)
    ── PRONTO PARA ONDA 1 ──
```

---

## Menor Caminho Viável

Para lançar as primeiras novas cidades com segurança, o mínimo absoluto é:

| # | O quê | Por quê | Esforço |
|---|---|---|---|
| 1 | Tabela `cities` + `city_id` em neighborhoods | Sem isso, não há como identificar nem desativar uma cidade | 3-4 dias |
| 2 | Filtro de cidade no dispatcher | Sem isso, motoristas de SP recebem ofertas do RJ | 1-2 dias |
| 3 | GeoJSON + pricing profile da cidade nova | Sem isso, pricing e territory resolver não funcionam | 1-2 dias |
| 4 | Kill switch (`cities.is_active`) checado na criação de corrida | Sem isso, não há como desligar uma cidade com problema | 0.5 dia |

**Total do menor caminho: ~7 dias úteis.**

Isso entrega um sistema que funciona para 2-3 cidades. Para 12 cidades com operação saudável, os blocos B (generalizar hardcodes) e D (admin com filtro) são necessários — mas podem entrar na semana seguinte sem bloquear o lançamento.
