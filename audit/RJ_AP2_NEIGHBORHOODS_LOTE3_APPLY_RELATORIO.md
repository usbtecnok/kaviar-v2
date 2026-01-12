# RJ AP2 NEIGHBORHOODS LOTE 3 - RELATÓRIO APPLY

**Data:** 2026-01-11T22:10:50.604-03:00  
**Operação:** AP2 Lote 3 APPLY  
**Status:** ✅ SUCESSO COMPLETO

## DATASET UTILIZADO

### FONTE OFICIAL
- **Origem:** IPP Data Rio (Portal Geo PCRJ)
- **Total AP2:** 17 bairros (Zona Sul)
- **Arquivo:** `/home/goes/kaviar/data/rj_bairros_ap2_lote3.geojson`

### LOTE 3 SELEÇÃO
**Critério:** Sequência alfabética (após Lotes 1 e 2)
**Nomes:** Gávea, Ipanema, Jardim Botânico, Lagoa, Leblon
**Validação:** ✅ Todos confirmados no dataset AP2

## EXECUÇÃO PIPELINE

### DRY-RUN (Obrigatório) ✅
```
Matches: 5/5 ✅
Encontrados: Ipanema, Leblon, Lagoa, Jardim Botânico, Gávea
GeofenceType: Polygon/MultiPolygon
0 writes: Confirmado
Status: 5 CREATE pendentes
```

### APPLY (Após validação) ✅
```bash
node scripts/rj_neighborhoods_pipeline.js --apply 
  --geojson=/home/goes/kaviar/data/rj_bairros_ap2_lote3.geojson 
  --names="Gávea,Ipanema,Jardim Botânico,Lagoa,Leblon"
```

**Resultado:**
- Processados: 5
- Criados: 5
- Falharam: 0

## IDs CRIADOS

| Nome | ID |
|------|-----|
| Gávea | cmkagvw7a000cq0q9nv01fb49 |
| Ipanema | cmkagvsyo0000q0q9g1l2wo1r |
| Jardim Botânico | cmkagvve80009q0q9ucdhyz33 |
| Lagoa | cmkagvuxr0006q0q9f3huuwj6 |
| Leblon | cmkagvudu0003q0q952qp3dty |

## EVIDÊNCIA OBJETIVA

### CONTAGEM TOTAL
- **Antes:** 80 neighborhoods
- **Depois:** 85 neighborhoods ✅
- **Incremento:** +5 (conforme esperado)

### CONTAGEM AP2
- **Antes:** 10 neighborhoods (Lotes 1+2)
- **Depois:** 15 neighborhoods ✅
- **Incremento:** +5 (Lote 3)

### TESTE GEOFENCE
- **Bairro:** Ipanema (cmkagvsyo0000q0q9g1l2wo1r)
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
- **AP2:** 15 bairros ✅ LOTE 1+2+3 (de 17 total)
- **Total:** 85 neighborhoods

## PROGRESSO AP2

### IMPORTADOS (15/17)
**Lote 1:** Botafogo, Catete, Copacabana, Cosme Velho, Flamengo  
**Lote 2:** Glória, Humaitá, Laranjeiras, Leme, Urca  
**Lote 3:** Gávea, Ipanema, Jardim Botânico, Lagoa, Leblon

### RESTANTES (2/17)
**Finais:** São Conrado, Vidigal

### PRÓXIMO PASSO
- **AP2 Lote 4:** 2 bairros finais (São Conrado, Vidigal)
- **AP2 FECHAMENTO:** GAP CHECK (N=17 vs M=17 → GAP=0)

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
