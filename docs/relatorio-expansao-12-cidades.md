# KAVIAR — Relatório Executivo: Simulação de Operação em 12 Cidades

**Data:** 18 de abril de 2026
**Classificação:** Interno — Estratégia de Expansão
**Autor:** Análise técnica automatizada sobre codebase real

---

## 1. Resumo Executivo

O KAVIAR foi construído com uma arquitetura territorial sofisticada (comunidades → bairros → geofences PostGIS → fallback 800m) e um pricing engine com perfis regionais. Isso é uma base sólida. Porém, **a plataforma foi projetada e testada para operar no Rio de Janeiro** — toda a cobertura GeoJSON, seeds, scripts e validações são RJ-centric.

**Veredicto:** A expansão para 12 cidades é tecnicamente viável sem reescrever o sistema, mas **não é viável abrir tudo de uma vez**. A arquitetura suporta multi-cidade com adaptações cirúrgicas. O gargalo real não é código — é **operação, cobertura territorial e liquidez de motoristas**.

**Recomendação:** Rollout em 3 ondas, começando por 2 cidades-piloto, com intervalo de 6-8 semanas entre ondas.

---

## 2. Diagnóstico da Capacidade Atual

### O que já existe e funciona

| Componente | Status | Detalhe |
|---|---|---|
| **Modelo de dados multi-cidade** | ✅ Parcial | `neighborhoods.city` existe com default "Rio de Janeiro". Unique constraint `[name, city]` permite bairros homônimos em cidades diferentes. |
| **Territory Resolver (PostGIS)** | ✅ Pronto | Cadeia COMMUNITY → NEIGHBORHOOD → FALLBACK_800M → OUTSIDE. Funciona para qualquer coordenada. |
| **Pricing Engine com perfis regionais** | ✅ Pronto | `pricing_profiles` suporta `center_lat/lng + radius_km`. Resolve perfil por proximidade geográfica. Cada cidade pode ter seu perfil. |
| **Dispatcher territorial** | ✅ Pronto | 3 tiers (COMMUNITY → NEIGHBORHOOD → OUTSIDE) com scoring por distância. Raio máximo 12km configurável. |
| **Feature flags** | ✅ Pronto | Sistema de 3 camadas (allowlist → rollout % → master switch). Permite ativar features por cidade gradualmente. |
| **RBAC** | ✅ Pronto | Roles SUPER_ADMIN, OPERATOR, LEAD_AGENT, FINANCE, ANGEL_VIEWER. `admins.lead_regions` existe para escopo regional. |
| **Ride settlements** | ✅ Pronto | Fonte de verdade econômica separada, com snapshot de perfil de pricing. Auditável. |

### O que NÃO existe

| Componente | Status | Impacto |
|---|---|---|
| **Campo `city_id` em drivers/passengers** | ❌ Ausente | Motoristas e passageiros não têm vínculo explícito com cidade. Dependem de `neighborhood_id` → `neighborhoods.city`. |
| **GeoJSON de outras cidades** | ❌ Ausente | Só existe `data/rj_bairros_*`. Sem polígonos para nenhuma outra cidade. |
| **Filtro de cidade no admin dashboard** | ❌ Ausente | Admin vê tudo flat. Sem seletor de cidade, sem métricas por cidade. |
| **Filtro de cidade no dispatcher** | ❌ Ausente | O dispatcher busca TODOS os motoristas online. Em 12 cidades, vai iterar motoristas de SP para corrida no RJ. |
| **Seeds/scripts multi-cidade** | ❌ Ausente | Todos os seeds são RJ-specific. |
| **Monitoramento por cidade** | ❌ Ausente | Logs e métricas não segmentam por cidade. |
| **Tabela `cities`** | ❌ Ausente | Não existe entidade cidade. O campo `neighborhoods.city` é uma string livre. |

---

## 3. Simulação de Operação em 12 Cidades

### Cenário simulado

| # | Cidade | Porte | Motoristas estimados (mês 1) | Bairros cobertos | Liquidez esperada |
|---|---|---|---|---|---|
| 1 | Rio de Janeiro | Grande | 80-120 | 160+ (já mapeados) | Alta |
| 2 | São Paulo | Grande | 50-80 | 50-80 (a mapear) | Média-alta |
| 3 | Niterói | Média | 20-35 | 20-30 | Média |
| 4 | Belo Horizonte | Grande | 30-50 | 40-60 | Média |
| 5 | Curitiba | Grande | 20-40 | 30-50 | Média-baixa |
| 6 | Salvador | Grande | 15-30 | 20-40 | Baixa-média |
| 7 | Recife | Grande | 10-25 | 15-30 | Baixa |
| 8 | Brasília | Grande | 10-20 | 10-20 | Baixa |
| 9 | Duque de Caxias | Média | 10-20 | 10-15 | Baixa |
| 10 | São Gonçalo | Média | 8-15 | 8-12 | Muito baixa |
| 11 | Nova Iguaçu | Média | 5-12 | 5-10 | Muito baixa |
| 12 | Campos dos Goytacazes | Pequena | 3-8 | 3-8 | Crítica |

### O que acontece no dispatch com 12 cidades simultâneas

**Cenário atual (sem filtro de cidade):**

```
Passageiro pede corrida em Curitiba
  → Dispatcher busca TODOS os motoristas online (12 cidades)
  → Calcula Haversine para ~400 motoristas
  → 95% são descartados por distância > 12km
  → Funciona, mas é desperdício de CPU e queries
```

**Impacto real:** Com 400 motoristas online simultâneos em 12 cidades, o dispatcher faz ~400 cálculos de distância por corrida. Não é catastrófico, mas é ineficiente. Com 2.000 motoristas, começa a pesar.

**Solução necessária:** Adicionar filtro de cidade no `findCandidates()` do dispatcher. É uma mudança de 5 linhas — filtrar `driver_status` por `driver.neighborhoods.city` antes de iterar.

---

## 4. Gargalos Técnicos

### GT-1: Dispatcher sem escopo de cidade (Severidade: ALTA)

O `DispatcherService.findCandidates()` busca todos os motoristas online sem filtro geográfico prévio. Funciona para 1 cidade, não escala para 12.

**Fix:** Adicionar `WHERE neighborhoods.city = $cityFromRide` na query de motoristas online. Estimativa: 1 dia.

### GT-2: Ausência de GeoJSON para 11 cidades (Severidade: CRÍTICA)

O territory resolver depende de `neighborhood_geofences.geom` (PostGIS). Sem polígonos importados, toda resolução territorial cai no fallback 800m ou OUTSIDE. Isso significa:
- Pricing sempre classifica como `external` (taxa 20%)
- Motoristas não têm território verificado
- Match territorial não funciona

**Fix:** Obter GeoJSON oficial de cada cidade (IBGE, prefeituras, OpenStreetMap) e importar via `import-geojson.ts`. Estimativa: 2-5 dias por cidade dependendo da qualidade dos dados.

### GT-3: Banco único sem particionamento (Severidade: MÉDIA)

Um único PostgreSQL (RDS) para 12 cidades. Com o volume atual, não é problema. Com 10k+ corridas/dia distribuídas em 12 cidades, queries sem índice de cidade vão degradar.

**Fix:** Adicionar índice `idx_rides_v2_city` (via neighborhood → city). Considerar read replicas se latência subir. Estimativa: 1 dia para índices, 1 semana para read replica se necessário.

### GT-4: Admin dashboard sem filtro de cidade (Severidade: ALTA)

O frontend admin carrega todos os motoristas, corridas e métricas sem segmentação. Com 12 cidades, o operador de Curitiba vê dados do RJ misturados.

**Fix:** Adicionar seletor de cidade no admin + filtro em todas as queries de listagem. Estimativa: 3-5 dias.

### GT-5: Pricing profile resolution por proximidade (Severidade: BAIXA)

O `resolveProfile()` já busca perfil regional por `center_lat/lng + radius_km`. Funciona para multi-cidade nativamente. Basta criar um `pricing_profile` por cidade.

**Fix:** Criar perfis de pricing para cada cidade. Estimativa: 1 hora por cidade.

### GT-6: Feature flags não são city-scoped (Severidade: BAIXA)

Feature flags são globais ou por `passenger_id`. Não há como ativar uma feature só em Curitiba.

**Fix:** Adicionar campo `city` opcional em `feature_flags` ou usar naming convention (`passenger_favorites_matching_curitiba`). Estimativa: 1-2 dias.

### GT-7: Realtime (SSE) sem namespace de cidade (Severidade: BAIXA)

O `realTimeService.emitToDriver()` é direto por `driver_id`. Funciona independente de cidade. Sem gargalo aqui.

---

## 5. Gargalos Operacionais

### GO-1: Captação de motoristas em 12 cidades simultâneas

Cada cidade precisa de um pipeline de captação: agentes de indicação (`referral_agents`), leads (`consultant_leads`), onboarding, verificação de documentos, aprovação. O time atual consegue operar isso em 12 cidades ao mesmo tempo?

**Risco:** Motoristas aprovados sem verificação adequada. Experiência degradada.

### GO-2: Cobertura territorial desigual

Cidades como Campos dos Goytacazes terão 3-8 motoristas cobrindo 3-8 bairros. Isso significa:
- Tempo de espera > 15 minutos em horários fora de pico
- Corridas caindo em `no_driver` frequentemente
- Passageiro desinstala o app após 2-3 experiências ruins

**Risco:** Marca queimada em cidades com baixa liquidez antes de ter chance de crescer.

### GO-3: Suporte e operação distribuída

O painel admin atual não tem conceito de "operador da cidade X". Um OPERATOR vê tudo. Com 12 cidades, quem monitora o que?

**Risco:** Incidentes em cidades menores passam despercebidos.

### GO-4: Community leaders em cidades novas

O modelo KAVIAR depende de `community_leaders` para governança local. Em cidades novas, não existem líderes comunitários. O sistema de comunidades fica vazio.

**Risco:** Perda do diferencial comunitário que define o KAVIAR.

### GO-5: WhatsApp como canal central

O sistema de WhatsApp (`wa_conversations`, `wa_messages`) é centralizado. Com 12 cidades, o volume de mensagens pode sobrecarregar o time de atendimento.

---

## 6. Riscos por Cidade e por Expansão Simultânea

### Matriz de risco por cidade

| Cidade | Risco técnico | Risco operacional | Risco de liquidez | Risco total |
|---|---|---|---|---|
| Rio de Janeiro | 🟢 Baixo | 🟢 Baixo | 🟢 Baixo | 🟢 **Baixo** |
| São Paulo | 🟡 Médio | 🟡 Médio | 🟡 Médio | 🟡 **Médio** |
| Niterói | 🟢 Baixo | 🟢 Baixo | 🟡 Médio | 🟢 **Baixo-Médio** |
| Belo Horizonte | 🟡 Médio | 🟡 Médio | 🟡 Médio | 🟡 **Médio** |
| Curitiba | 🟡 Médio | 🟡 Médio | 🟠 Alto | 🟡 **Médio-Alto** |
| Salvador | 🟡 Médio | 🟠 Alto | 🟠 Alto | 🟠 **Alto** |
| Recife | 🟡 Médio | 🟠 Alto | 🟠 Alto | 🟠 **Alto** |
| Brasília | 🟡 Médio | 🟠 Alto | 🟠 Alto | 🟠 **Alto** |
| Duque de Caxias | 🟢 Baixo | 🟡 Médio | 🟠 Alto | 🟡 **Médio** |
| São Gonçalo | 🟢 Baixo | 🟡 Médio | 🔴 Crítico | 🟠 **Alto** |
| Nova Iguaçu | 🟢 Baixo | 🟡 Médio | 🔴 Crítico | 🟠 **Alto** |
| Campos dos Goytacazes | 🟢 Baixo | 🟠 Alto | 🔴 Crítico | 🔴 **Crítico** |

### Riscos da expansão simultânea

1. **Diluição de foco:** Time técnico e operacional dividido entre 12 frentes. Bugs em uma cidade afetam todas (banco compartilhado).
2. **Reputação prematura:** App Store reviews negativas de cidades com baixa liquidez contaminam a percepção geral.
3. **Custo de GeoJSON:** Mapear 11 cidades com qualidade leva tempo. Lançar sem mapeamento = pricing quebrado.
4. **Suporte sobrecarregado:** 12 cidades × problemas de onboarding × WhatsApp = caos.
5. **Rollback impossível:** Se precisar desativar uma cidade, não existe mecanismo de "desligar cidade X" no sistema atual.

---

## 7. Recomendação: Abrir Tudo de Uma Vez ou por Ondas?

### ❌ Abrir tudo de uma vez — NÃO RECOMENDADO

Motivos:
- GeoJSON de 11 cidades não existe. Sem isso, o pricing e o territory resolver não funcionam corretamente.
- O admin dashboard não tem filtro de cidade. Operação vira caos.
- O dispatcher sem escopo de cidade vai degradar performance.
- Cidades com 3-8 motoristas vão gerar experiência ruim e reviews negativas.
- Não existe mecanismo de kill switch por cidade.

### ✅ Rollout por ondas — RECOMENDADO

Motivos:
- Permite validar as adaptações técnicas em escala controlada.
- Cada onda gera aprendizado operacional para a próxima.
- Cidades com baixa liquidez podem ser preparadas com mais tempo de captação.
- Risco contido: se uma cidade falha, as outras não são afetadas.

---

## 8. Plano Sugerido de Rollout

### Onda 0 — Preparação técnica (2-3 semanas)

Antes de abrir qualquer cidade nova:

1. Criar tabela `cities` (id, name, state, is_active, launched_at, config JSON)
2. Adicionar `city_id` em `drivers`, `passengers` (derivado de `neighborhood.city` ou explícito)
3. Filtro de cidade no dispatcher (`findCandidates`)
4. Filtro de cidade no admin dashboard (seletor + queries)
5. Script de importação de GeoJSON parametrizado por cidade
6. Kill switch por cidade (feature flag `city_active_{slug}`)
7. Métricas e logs segmentados por cidade

### Onda 1 — Cidades adjacentes ao RJ (semana 4-6)

| Cidade | Justificativa |
|---|---|
| **Niterói** | Proximidade geográfica, possível overlap de motoristas, baixo risco |
| **São Gonçalo** | Região metropolitana RJ, teste de cidade com baixa liquidez |

**Meta:** Validar que o sistema multi-cidade funciona end-to-end. Testar pricing regional, dispatcher com filtro, admin com seletor.

**Critério de sucesso:** 80% das corridas com motorista encontrado em < 8 min. Zero bugs de cross-city dispatch.

### Onda 2 — Capitais de médio porte (semana 10-14)

| Cidade | Justificativa |
|---|---|
| **São Paulo** | Maior mercado, precisa de GeoJSON robusto |
| **Belo Horizonte** | Capital com boa infraestrutura |
| **Curitiba** | Teste de mercado sul |
| **Duque de Caxias** | Baixada Fluminense, complementa RJ |

**Meta:** Escalar operação para 6 cidades. Validar que o time operacional aguenta.

**Critério de sucesso:** Métricas por cidade no dashboard. Tempo médio de match < 10 min em todas as cidades.

### Onda 3 — Expansão completa (semana 18-22)

| Cidade | Justificativa |
|---|---|
| **Salvador** | Nordeste |
| **Recife** | Nordeste |
| **Brasília** | Centro-Oeste |
| **Nova Iguaçu** | Baixada Fluminense |
| **Campos dos Goytacazes** | Interior RJ — só se liquidez mínima garantida |

**Meta:** 12 cidades operando. Campos só entra se tiver mínimo de 10 motoristas captados antes do lançamento.

**Critério de sucesso:** Nenhuma cidade com taxa de `no_driver` > 30%.

---

## 9. Checklist Técnico

### Pré-requisito (Onda 0)

- [ ] Criar model `cities` no Prisma schema (id, name, slug, state, is_active, timezone, config)
- [ ] Adicionar `city_id` (ou derivar via neighborhood) em queries críticas
- [ ] Filtro de cidade no `DispatcherService.findCandidates()` — filtrar motoristas por cidade da corrida
- [ ] Filtro de cidade no admin dashboard — seletor global + todas as listagens
- [ ] Criar `pricing_profile` para cada cidade com parâmetros regionais
- [ ] Script de importação de GeoJSON parametrizado (`import-geojson.ts` aceitar `--city`)
- [ ] Índice `idx_neighborhoods_city` (já existe) — validar performance com volume
- [ ] Índice em `rides_v2` por cidade (via join com neighborhoods)
- [ ] Kill switch por cidade via feature flag
- [ ] Logs estruturados com campo `city` em todos os eventos de dispatch/pricing/match
- [ ] Endpoint `/admin/cities` para CRUD de cidades
- [ ] Dashboard de métricas por cidade (corridas, motoristas online, tempo médio de match, taxa no_driver)

### Por cidade nova

- [ ] GeoJSON de bairros importado e validado (PostGIS `ST_IsValid`)
- [ ] `pricing_profile` criado com parâmetros calibrados
- [ ] Seed de bairros (`neighborhoods`) com `city` correto
- [ ] Pelo menos 1 community leader cadastrado (ou operação sem comunidade)
- [ ] Mínimo de 10 motoristas aprovados antes do lançamento
- [ ] Teste E2E: criar corrida → dispatch → match → pricing → settlement
- [ ] Validar que corridas da cidade X não vazam para motoristas da cidade Y

---

## 10. Checklist Operacional

### Pré-requisito

- [ ] Definir responsável operacional por cidade (ou grupo de cidades)
- [ ] Pipeline de captação de motoristas ativo em cada cidade (referral agents, leads)
- [ ] Material de onboarding adaptado por cidade (bairros, referências locais)
- [ ] Canal WhatsApp com capacidade para volume multi-cidade
- [ ] Runbook de lançamento de cidade nova (passo a passo)
- [ ] Runbook de desativação de cidade (kill switch + comunicação)
- [ ] Critérios de go/no-go por cidade (mínimo de motoristas, cobertura de bairros)

### Por onda

- [ ] Captação de motoristas iniciada 4 semanas antes do lançamento
- [ ] GeoJSON validado e importado 2 semanas antes
- [ ] Pricing profile calibrado e testado 1 semana antes
- [ ] Teste de carga simulado (dispatch com N motoristas na cidade)
- [ ] Comunicação para motoristas e passageiros da cidade
- [ ] Monitoramento intensivo nas primeiras 72h (dashboard + alertas)
- [ ] Retrospectiva após 2 semanas de operação
- [ ] Decisão de go/no-go para próxima onda baseada em métricas reais

### Métricas de saúde por cidade (monitorar continuamente)

| Métrica | Saudável | Alerta | Crítico |
|---|---|---|---|
| Taxa de `no_driver` | < 15% | 15-30% | > 30% |
| Tempo médio de match | < 5 min | 5-10 min | > 10 min |
| Motoristas online simultâneos | > 10 | 5-10 | < 5 |
| Corridas/dia | > 20 | 10-20 | < 10 |
| NPS passageiro | > 40 | 20-40 | < 20 |

---

## Conclusão

A arquitetura do KAVIAR é surpreendentemente preparada para multi-cidade — o territory resolver, pricing engine e dispatcher já trabalham com coordenadas e perfis regionais. O que falta é **infraestrutura de dados** (GeoJSON, seeds, filtros) e **infraestrutura operacional** (admin por cidade, monitoramento, captação).

O maior risco não é técnico. É **lançar em cidades sem liquidez suficiente e queimar a marca**. Campos dos Goytacazes com 3 motoristas não é expansão — é experimento com risco reputacional.

**Estimativa de esforço técnico para Onda 0:** 2-3 semanas com 1 dev full-time.
**Estimativa de esforço operacional para Onda 1:** 4-6 semanas de captação prévia.

Anti-frankenstein: não adicionar complexidade desnecessária. O sistema já resolve território, pricing e dispatch por coordenadas. O trabalho é **alimentar o sistema com dados de cada cidade** e **dar visibilidade operacional por cidade no admin**.
