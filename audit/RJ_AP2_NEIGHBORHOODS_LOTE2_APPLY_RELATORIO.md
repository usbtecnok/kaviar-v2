# RJ AP2 NEIGHBORHOODS LOTE 2 - RELATÓRIO APPLY

**Data:** 2026-01-11T22:07:58.951-03:00  
**Operação:** AP2 Lote 2 APPLY  
**Status:** ✅ SUCESSO COMPLETO

## DATASET UTILIZADO

### FONTE OFICIAL
- **Origem:** IPP Data Rio (Portal Geo PCRJ)
- **Total AP2:** 17 bairros (Zona Sul)
- **Arquivo:** `/home/goes/kaviar/data/rj_bairros_ap2_lote2.geojson`

### LOTE 2 SELEÇÃO
**Critério:** Sequência alfabética (após Lote 1)
**Nomes:** Glória, Laranjeiras, Leme, Urca, Humaitá
**Validação:** ✅ Todos existem no dataset AP2

## EXECUÇÃO PIPELINE

### DRY-RUN (Obrigatório) ✅
```
Matches: 5/5 ✅
Encontrados: Glória, Laranjeiras, Humaitá, Urca, Leme
GeofenceType: Polygon/MultiPolygon
0 writes: Confirmado
Status: 5 CREATE pendentes
```

### APPLY (Após validação) ✅
```bash
node scripts/rj_neighborhoods_pipeline.js --apply 
  --geojson=/home/goes/kaviar/data/rj_bairros_ap2_lote2.geojson 
  --names="Glória,Laranjeiras,Leme,Urca,Humaitá"
```

**Resultado:**
- Processados: 5
- Criados: 5
- Falharam: 0

## IDs CRIADOS

| Nome | ID |
|------|-----|
| Glória | cmkags86f0000134h3dqnd5pf |
| Humaitá | cmkags9u50006134he3j7ar35 |
| Laranjeiras | cmkags99m0003134hz6wdumxs |
| Leme | cmkagsbnl000c134h5mhv2vid |
| Urca | cmkagsab80009134hdh3z8z5b |

## EVIDÊNCIA OBJETIVA

### CONTAGEM TOTAL
- **Antes:** 75 neighborhoods
- **Depois:** 80 neighborhoods ✅
- **Incremento:** +5 (conforme esperado)

### CONTAGEM AP2
- **Antes:** 5 neighborhoods (Lote 1)
- **Depois:** 10 neighborhoods ✅
- **Incremento:** +5 (Lote 2)

### TESTE GEOFENCE
- **Bairro:** Urca (cmkagsab80009134hdh3z8z5b)
- **GeofenceType:** MultiPolygon ✅
- **Status:** Funcional

### IDEMPOTÊNCIA ✅
**2ª Execução:**
```
Processados: 0
Criados: 0
Pulados: 5 ← Todos já existem
Falharam: 0
```

## DISTRIBUIÇÃO ATUALIZADA

- **AP5:** 20 bairros ✅ COMPLETO
- **AP4:** 15 bairros ✅ COMPLETO  
- **AP3:** 35 bairros ✅ COMPLETO
- **AP2:** 10 bairros ✅ LOTE 1+2 (de 17 total)
- **Total:** 80 neighborhoods

## PROGRESSO AP2

### IMPORTADOS (10/17)
**Lote 1:** Botafogo, Catete, Copacabana, Cosme Velho, Flamengo  
**Lote 2:** Glória, Humaitá, Laranjeiras, Leme, Urca

### RESTANTES (7/17)
**Disponíveis:** Gávea, Ipanema, Jardim Botânico, Lagoa, Leblon, São Conrado, Vidigal

### PRÓXIMOS PASSOS
- **AP2 Lote 3:** 5 bairros (Gávea, Ipanema, Jardim Botânico, Lagoa, Leblon)
- **AP2 Lote 4:** 2 bairros finais (São Conrado, Vidigal)

## GOVERNANÇA MANTIDA ✅

- ❌ **Sem mexer backend/schema/routes/frontend**
- ❌ **Sem substitutos fora do GeoJSON**
- ✅ **Pipeline oficial usado**
- ✅ **Processo padrão seguido**
- ✅ **DRY-RUN → APPLY → Evidência → Relatório**
- ✅ **Fonte oficial IPP Data Rio**
- ✅ **Allowlist via --names exatos**

---
**Relatório gerado automaticamente pelo RJ Neighborhoods Pipeline**
