# KAVIAR Multioperação Territorial

> Frente estratégica futura — diagnóstico técnico e plano de expansão.
> Data do diagnóstico: 2026-05-20

## Resumo

O KAVIAR já possui infraestrutura territorial significativa (PostGIS, geofences, neighborhoods com campo `city`, territory-resolver, pricing por camada, portal de parceiros com escopo). O gap principal é a **camada de permissões admin com escopo geográfico** — hoje todas as APIs admin retornam dados globais sem filtro territorial.

A proposta é manter uma **única plataforma KAVIAR** com separação interna por território e permissões, sem criar sistemas separados por estado.

---

## Base territorial já existente

| Estrutura | Aproveitamento |
|-----------|----------------|
| `neighborhoods` (com campo `city`) | Alto — hierarquia bairro→cidade |
| `neighborhood_geofences` (PostGIS nativo) | Alto — resolução geográfica |
| `communities` + `community_geofences` | Alto — granularidade sub-bairro |
| `territorial_partners` + `partner_users` | Alto — parceiros com escopo |
| `drivers.community_id` / `neighborhood_id` | Alto — vínculo territorial |
| `passengers.community_id` / `neighborhood_id` | Alto — vínculo territorial |
| `rides_v2.origin_neighborhood_id` / `origin_community_id` | Alto — corrida sabe onde aconteceu |
| `ride_settlements` (territory classification) | Alto — liquidação territorial |
| `pricing_profiles` (fee_local/adjacent/external) | Alto — precificação por camada |
| `territory-resolver.service.ts` | Alto — resolução COMMUNITY→NEIGHBORHOOD→FALLBACK→OUTSIDE |
| `driver_territory_stats` | Médio — métricas por período |
| `local_operators` (com campo `city`) | Médio — operadores locais |
| Portal de parceiros (`partner-portal.ts`) | Alto — modelo de escopo reaproveitável |

---

## Arquitetura recomendada

### Modelo de dados

```
operational_territories
├── id              UUID PK
├── name            String ("Rio de Janeiro", "São Paulo", "Belo Horizonte")
├── level           String ("state" | "city" | "region")
├── parent_id       UUID? FK → operational_territories.id
├── center_lat      Decimal?
├── center_lng      Decimal?
├── is_active       Boolean default true
├── created_at      DateTime
├── updated_at      DateTime

admin_territory_access
├── id              UUID PK
├── admin_id        UUID FK → admins.id
├── territory_id    UUID FK → operational_territories.id
├── access_level    String ("full" | "read_only")
├── created_at      DateTime
```

### Campos adicionais em tabelas existentes

- `neighborhoods.territory_id` → FK para `operational_territories`
- `territorial_partners.territory_id` → FK para `operational_territories`

### Derivação (sem campos novos)

- `drivers` → território derivado via `neighborhood_id` → `neighborhoods.territory_id`
- `passengers` → idem
- `rides_v2` → território derivado via `origin_neighborhood_id`
- `communities` → território derivado via geofence (territory-resolver)

### Fluxo de filtro no admin

1. No modelo proposto, o admin faz login → JWT poderá conter `role` + `territory_ids[]`
2. Middleware `applyTerritoryScope(req)` resolve os `neighborhood_ids` do território
3. Queries admin recebem `WHERE neighborhood_id IN (...)` automaticamente
4. `SUPER_ADMIN` → bypass (sem filtro)

### Modelo de referência

O portal de parceiros (`partner-portal.ts`) já implementa escopo correto: `authenticatePartner` extrai `partnerId` do JWT e todas as queries filtram por `partner_id`. O mesmo padrão serve para `territory_ids` no admin.

---

## Fases

### Fase 0 — Diagnóstico técnico ✅

- Mapeamento do estado atual
- Tabelas aproveitáveis identificadas
- APIs afetadas listadas
- Riscos avaliados
- Arquitetura mínima definida

**Status: concluído (este documento).**

### Fase 1 — Modelo territorial mínimo

**Objetivo:** criar a base de territórios sem mudar regra de corrida.

Entregáveis:
- Tabela `operational_territories`
- Seed com RJ como operação atual (state: "Rio de Janeiro", city: "Rio de Janeiro")
- Campo `territory_id` em `neighborhoods`
- Migration vinculando neighborhoods existentes ao território RJ
- Sem mexer nos apps

**Estimativa: 1-2 dias**
**Risco: baixo (migration aditiva)**

### Fase 2 — Permissões regionais no admin

**Objetivo:** permitir que admins tenham escopo territorial.

Entregáveis:
- Tabela `admin_territory_access`
- Middleware `applyTerritoryScope`
- Filtro obrigatório nos ~15 endpoints admin
- Proteção contra acesso cruzado (403 se fora do escopo)
- Painel admin filtrado por território
- Novos roles: `STATE_ADMIN`, `CITY_ADMIN`, `TERRITORY_ADMIN`, `SUPPORT_LOCAL`

**Estimativa: 4-6 dias**
**Risco: médio (toca middleware auth — extensão cuidadosa)**

### Fase 3 — Métricas regionais

**Objetivo:** dashboard por região.

Entregáveis:
- Corridas por território
- Motoristas por território
- Passageiros por território
- Parceiros por território
- Demanda reprimida por território
- Relatórios separados por estado/cidade

**Estimativa: 2-3 dias**
**Risco: baixo (queries aditivas)**

### Fase 4 — Expansão operacional

**Objetivo:** permitir abrir SP, MG ou outro estado de forma controlada.

Entregáveis:
- Cadastro de nova operação (territory)
- Admin regional vinculado
- Parceiros regionais
- Motoristas vinculados à região (via neighborhood)
- Seed de neighborhoods para nova cidade
- GeoJSON de bairros da nova cidade

**Estimativa: 3-5 dias**
**Risco: baixo (dados novos, sem alterar lógica existente)**

### Fase 5 — Ajustes no dispatcher e apps (se necessário)

**Objetivo:** só mexer em corrida, GPS, app e dispatcher se realmente for necessário.

Possíveis entregáveis:
- Restrição hard por território no dispatcher
- Configuração de raio operacional por região
- Ajustes no app para exibir região
- Regras de cross-territory (motorista de SP pode atender RJ?)

**Estimativa: 1-3 semanas**
**Risco: ALTO — maior risco de regressão**

---

## Endpoints afetados (filtro territorial obrigatório)

| Endpoint | Prioridade |
|----------|-----------|
| `GET /api/admin/rides` | Alta |
| `GET /api/admin/drivers` | Alta |
| `GET /api/admin/passengers` | Alta |
| `GET /api/admin/territorial-partners` | Alta |
| `GET /api/admin/dashboard/metrics` | Alta |
| `GET /api/admin/dashboard/overview` | Alta |
| `GET /api/admin/operations/monitor` | Alta |
| `GET /api/admin/ratings/overview` | Média |
| `GET /api/admin/compensations` | Média |
| `GET /api/admin/referrals` | Média |
| `GET /api/admin/communities` | Média |
| `GET /api/admin/local-operators` | Média |
| `GET /api/admin/local-businesses` | Média |
| `GET /api/admin/whatsapp` | Baixa |
| `GET /api/admin/staff` | Baixa |

---

## Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Admin regional acessar dados de outra região | Alta (hoje não há filtro) | Alto | Fase 2 resolve |
| Regressão no dispatcher | Baixa (Fases 1-4) | Alto | Não mexer até Fase 5 |
| Regressão no fluxo de corrida | Zero (Fases 1-4) | Crítico | Regra de proteção |
| Migration quebrar dados existentes | Baixa | Médio | Migrations aditivas, seed RJ |
| Complexidade no middleware auth | Média | Médio | Extensão aditiva, não reescrita |
| Performance de queries com filtro territorial | Baixa | Baixo | Índices em territory_id |

---

## Arquivos sensíveis — NÃO ALTERAR nas fases iniciais

| Arquivo/Área | Motivo |
|--------------|--------|
| `app/(passenger)/map.tsx` | Fluxo crítico do passageiro |
| `backend/src/services/dispatcher.service.ts` | Lógica de dispatch de corridas |
| `backend/src/services/territory-resolver.service.ts` | Resolução territorial (funciona, não mexer) |
| Fluxo de corrida ativa (rides_v2 state machine) | Risco de regressão crítico |
| Push notifications (expo/FCM) | Não relacionado a território |
| Vinheta/som do motorista | Não relacionado |
| Pagamentos/Asaas (webhooks, credit purchases) | Financeiro — não tocar |
| Compensação por deslocamento | Financeiro — não tocar |
| Portal de parceiros validado | Funciona — usar como modelo, não alterar |

---

## Regras de proteção

1. **Fases 1-4 NÃO devem alterar:** apps mobile, dispatcher, push, Asaas, map.tsx, fluxo de corrida ativa.
2. **Fase 5 só inicia** com operação real em outro estado e após validação completa das fases anteriores.
3. **Migrations devem ser aditivas** — nunca remover colunas ou alterar tipos existentes.
4. **Testes obrigatórios** antes de qualquer merge que toque no middleware auth.
5. **SUPER_ADMIN sempre tem bypass** — nunca pode ser bloqueado por filtro territorial.
6. **Rollback seguro** — se `territory_id` for null, comportamento deve ser idêntico ao atual (sem filtro).

---

## Decisões em aberto (para definir antes da implementação)

- [ ] Motorista pode atuar em mais de um território simultaneamente?
- [ ] Passageiro de uma cidade pode chamar motorista de outra (cross-territory)?
- [ ] Parceiro pode ter motoristas de mais de uma região?
- [ ] Qual a granularidade mínima de um território? (estado, cidade, zona, bairro)
- [ ] Admins regionais podem criar outros admins?
- [ ] Métricas financeiras (faturamento) ficam visíveis para admin regional?
