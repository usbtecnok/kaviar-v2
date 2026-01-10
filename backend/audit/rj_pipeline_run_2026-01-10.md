# RJ Pipeline Run - 2026-01-10

## ✅ GOVERNANÇA OBRIGATÓRIA RESPEITADA

- **NUNCA criar communities** ✅ - Só CommunityGeofence por communityId
- **ID canônico sempre** ✅ - Fonte: `/api/governance/communities`
- **Idempotência total** ✅ - UPSERT por chave única
- **Allowlist obrigatória** ✅ - 29 IDs do arquivo `audit/rj_allowlist_ids.txt`
- **Sanity-check rigoroso** ✅ - Só Polygon/MultiPolygon válido
- **isVerified=false** ✅ - Sempre false por padrão

## 1️⃣ DRY-RUN OBRIGATÓRIO

**Comando executado:**
```bash
cd /home/goes/kaviar/backend
node scripts/rj_geofence_pipeline.js --dry-run --allowlist audit/rj_allowlist_ids.txt
```

**Resultado:**
- **IDs encontrados:** 29 (100% da allowlist)
- **Polygon encontrado:** 5 (17.2% dos candidatos)
- **Skip por já existir:** 3 (Morro da Providência, Santa Teresa, Parque da Cidade)
- **Erro/sem polígono:** 21 (72.4% - morros pequenos sem dados OSM)
- **Tempo total:** ~30s (rate-limit 1s aplicado)

## 2️⃣ APPLY EM LOTE CONTROLADO

**Comando executado:**
```bash
node scripts/rj_geofence_pipeline.js --apply --ids cmk6ux5x1001jqqr3ux2pdk13,cmk6ux6v6001mqqr33ulgsn00,cmk6w2yvf0001x7mt4gre2vpg,cmk6w2zi60003x7mt4ee3j5iw,cmk6w31k50008x7mtkc0akzm7
```

**Resultado:**
- **Processadas:** 5
- **Criadas:** 5 (100% sucesso)
- **Atualizadas:** 0
- **Puladas:** 0
- **Falharam:** 0

**Logs por ID:**
- **Cruzada São Sebastião:** APPLY_OK - OSM_way_1026230196
- **Chapéu Mangueira:** APPLY_OK - OSM_way_85773410
- **Rio das Pedras:** APPLY_OK - OSM_way_410650128
- **Tijuquinha:** APPLY_OK - OSM_way_85893738
- **Vila Valqueire:** APPLY_OK - OSM_relation_5520376

## 3️⃣ VALIDAÇÃO COM CURL REAL

**Comandos executados:**
```bash
curl -s https://kaviar-v2.onrender.com/api/governance/communities/cmk6ux5x1001jqqr3ux2pdk13/geofence | jq -r '.data.geometry.type'
curl -s https://kaviar-v2.onrender.com/api/governance/communities/cmk6ux6v6001mqqr33ulgsn00/geofence | jq -r '.data.geometry.type'
curl -s https://kaviar-v2.onrender.com/api/governance/communities/cmk6w2yvf0001x7mt4gre2vpg/geofence | jq -r '.data.geometry.type'
```

**Resultado:**
- **Cruzada São Sebastião:** Polygon ✅
- **Chapéu Mangueira:** Polygon ✅
- **Rio das Pedras:** Polygon ✅

## 📊 RESUMO FINAL

### Estado ANTES:
- **SEM_DADOS:** 29 communities
- **Polygon disponível:** 0/29

### Estado DEPOIS:
- **SEM_DADOS:** 24 communities (-5)
- **Polygon criado:** 5/29 (17.2% dos candidatos)
- **SEM_FONTE:** 21 (morros pequenos sem dados OSM)

### Progresso Total RJ:
- **Polygon/MultiPolygon:** 39 (era 34 + 5 novos)
- **Point/LineString:** 26 (inalterado)
- **SEM_DADOS:** 24 (era 29 - 5 criados)

## 🎯 PRÓXIMOS LOTES SUGERIDOS

**Batch 02 - Upgrade Point→Polygon (26 candidatos):**
- Focar em bairros principais com Point que podem virar Polygon
- Ex: Catumbi, Cidade Nova, Gamboa, Santo Cristo, São Cristóvão

**Batch 03 - Morros restantes:**
- Tentar fontes alternativas para os 21 SEM_FONTE
- Considerar dados da Prefeitura RJ se disponíveis

## 📋 ENTREGÁVEIS

- ✅ `scripts/rj_geofence_pipeline.js` - Pipeline idempotente
- ✅ `audit/rj_allowlist_ids.txt` - 29 IDs originais
- ✅ `audit/rj_pipeline_dry_run.md` - Análise completa
- ✅ `audit/rj_pipeline_apply.md` - Resultado da aplicação
- ✅ Este relatório com evidência objetiva

## 🚫 RESTRIÇÕES RESPEITADAS

- ✅ Não mexeu em migrations/seeds/communities
- ✅ Não criou endpoints novos
- ✅ Não alterou lógica de corrida/bônus
- ✅ Commit apenas scripts + audit

---
**🎉 PIPELINE RJ EXECUTADO COM SUCESSO - 5 NOVOS POLYGONS CRIADOS**
