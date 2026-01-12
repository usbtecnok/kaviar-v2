# RJ AP2 NEIGHBORHOODS LOTE 4 - RELATÓRIO APPLY (FECHAMENTO)

**Data:** 2026-01-11T22:14:12.929-03:00  
**Operação:** AP2 Lote 4 APPLY (FECHAMENTO)  
**Status:** ✅ SUCESSO COMPLETO

## DATASET UTILIZADO

### FONTE OFICIAL
- **Origem:** IPP Data Rio (Portal Geo PCRJ)
- **Total AP2:** 17 bairros (Zona Sul)
- **Arquivo:** `/home/goes/kaviar/data/rj_bairros_ap2_lote4.geojson`

### LOTE 4 SELEÇÃO (FECHAMENTO)
**Critério:** 2 bairros finais restantes
**Nomes:** São Conrado, Vidigal
**Validação:** ✅ Confirmados no dataset AP2

## EXECUÇÃO PIPELINE

### DRY-RUN (Obrigatório) ✅
```
Matches: 2/2 ✅
Encontrados: Vidigal, São Conrado
GeofenceType: Polygon/MultiPolygon
0 writes: Confirmado
Status: 2 CREATE pendentes
```

### APPLY (Após validação) ✅
```bash
node scripts/rj_neighborhoods_pipeline.js --apply 
  --geojson=/home/goes/kaviar/data/rj_bairros_ap2_lote4.geojson 
  --names="São Conrado,Vidigal"
```

**Resultado:**
- Processados: 2
- Criados: 2
- Falharam: 0

## IDs CRIADOS

| Nome | ID |
|------|-----|
| São Conrado | cmkah07ox000313jxc3pynm7u |
| Vidigal | cmkah069r000013jx6uvrke2j |

## EVIDÊNCIA OBJETIVA

### CONTAGEM TOTAL
- **Antes:** 85 neighborhoods
- **Depois:** 87 neighborhoods ✅
- **Incremento:** +2 (conforme esperado)

### CONTAGEM AP2
- **Antes:** 15 neighborhoods (Lotes 1+2+3)
- **Depois:** 17 neighborhoods ✅
- **Incremento:** +2 (Lote 4 - FECHAMENTO)

### TESTE GEOFENCE
- **Bairro:** Vidigal (cmkah069r000013jx6uvrke2j)
- **GeofenceType:** Polygon ✅
- **Status:** Funcional

### IDEMPOTÊNCIA ✅
**2ª Execução:**
```
Processados: 0
Criados: 0
Pulados: 2 ← Todos já existem
Falharam: 0
```

## DISTRIBUIÇÃO FINAL

- **AP5:** 20 bairros ✅ COMPLETO
- **AP4:** 15 bairros ✅ COMPLETO  
- **AP3:** 35 bairros ✅ COMPLETO
- **AP2:** 17 bairros ✅ COMPLETO
- **Total:** 87 neighborhoods

## AP2 COMPLETO (17/17)

### TODOS OS LOTES EXECUTADOS
**Lote 1:** Botafogo, Catete, Copacabana, Cosme Velho, Flamengo  
**Lote 2:** Glória, Humaitá, Laranjeiras, Leme, Urca  
**Lote 3:** Gávea, Ipanema, Jardim Botânico, Lagoa, Leblon  
**Lote 4:** São Conrado, Vidigal

### GAP CHECK CONFIRMADO
- **N_ap2 (oficial):** 17
- **M_ap2 (banco):** 17
- **GAP:** 0 ✅

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
