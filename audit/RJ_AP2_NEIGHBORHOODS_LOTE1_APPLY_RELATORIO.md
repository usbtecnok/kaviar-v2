# RJ AP2 NEIGHBORHOODS LOTE 1 - RELATÓRIO APPLY

**Data:** 2026-01-11T22:00:42.272-03:00  
**Operação:** AP2 Lote 1 APPLY  
**Status:** ✅ SUCESSO COMPLETO

## DATASET UTILIZADO

### FONTE OFICIAL
- **Origem:** IPP Data Rio (Portal Geo PCRJ)
- **URL:** https://gist.githubusercontent.com/esperanc/db213370dd176f8524ae6ba32433f90a/raw/6dff5654e9ff6395f09f18ea2692f40ed2060cb9/Limite_Bairro.geojson
- **Total RJ:** 162 bairros
- **AP2 Extraído:** 17 bairros (BOTAFOGO, COPACABANA, LAGOA)
- **Arquivo:** `/home/goes/kaviar/data/rj_bairros_ap2_lote1.geojson`

### LOTE 1 SELEÇÃO
**Critério:** 5 primeiros bairros alfabeticamente
**Nomes:** Botafogo, Catete, Copacabana, Cosme Velho, Flamengo

## EXECUÇÃO PIPELINE

### DRY-RUN (Obrigatório) ✅
```
Matches: 5/5
GeofenceType: Polygon/MultiPolygon
0 writes: Confirmado
Status: 5 CREATE pendentes
```

### APPLY (Após validação) ✅
```bash
node scripts/rj_neighborhoods_pipeline.js --apply 
  --geojson=/home/goes/kaviar/data/rj_bairros_ap2_lote1.geojson 
  --names="Botafogo,Catete,Copacabana,Cosme Velho,Flamengo"
```

**Resultado:**
- Processados: 5
- Criados: 5
- Falharam: 0

## IDs CRIADOS

| Nome | ID |
|------|-----|
| Botafogo | cmkagmioe000ct9qdowa2vq37 |
| Catete | cmkagmgpa0003t9qdptuq9q00 |
| Copacabana | cmkagmhvy0009t9qdk216cl9w |
| Cosme Velho | cmkagmh6c0006t9qdm403il6n |
| Flamengo | cmkagmffs0000t9qdi7jeekhb |

## EVIDÊNCIA OBJETIVA

### CONTAGEM TOTAL
- **Antes:** 70 neighborhoods
- **Depois:** 75 neighborhoods ✅
- **Incremento:** +5 (conforme esperado)

### CONTAGEM AP2
- **AP2 criados:** 5 neighborhoods ✅
- **Campo:** administrativeRegion = "AP2"

### TESTE GEOFENCE
- **Bairro:** Copacabana (cmkagmhvy0009t9qdk216cl9w)
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
- **AP2:** 5 bairros ✅ LOTE 1 (de 17 total)
- **Total:** 75 neighborhoods

## PRÓXIMOS PASSOS

### AP2 RESTANTE
- **Faltam:** 12 bairros (17 - 5 = 12)
- **Próximo:** AP2 Lote 2 (5 bairros)
- **Disponíveis:** Gávea, Glória, Humaitá, Ipanema, Jardim Botânico, Lagoa, Laranjeiras, Leblon, Leme, São Conrado, Urca, Vidigal

## GOVERNANÇA MANTIDA ✅

- ❌ **Sem mexer backend/schema/routes/frontend**
- ❌ **Sem substitutos fora do GeoJSON**
- ✅ **Pipeline oficial usado**
- ✅ **Processo padrão seguido**
- ✅ **DRY-RUN → APPLY → Evidência → Relatório**
- ✅ **Fonte oficial IPP Data Rio**

---
**Relatório gerado automaticamente pelo RJ Neighborhoods Pipeline**
