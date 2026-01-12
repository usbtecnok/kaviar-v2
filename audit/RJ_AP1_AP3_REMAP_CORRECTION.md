# RJ AP1/AP3 CORREÇÃO - REMAP CONTROLADO

**Data:** 2026-01-11T22:46:18.263-03:00  
**Operação:** Correção AP1/AP3 Remap  
**Status:** ✅ EXECUTADO E VALIDADO (Render Shell)

## PROBLEMA IDENTIFICADO

### DESCOBERTA CRÍTICA
Durante execução do AP1 Lote 1, descobriu-se que **7 bairros AP1** foram incorretamente importados como **AP3** nos lotes anteriores.

### BAIRROS AFETADOS
| Nome | ID | Status Antes | Status Depois |
|------|-----|--------------|---------------|
| Centro | cmk9uctlj0000d23w2x6zvd4r | AP3 | AP1 |
| Lapa | cmk9ucuxw0006d23whxvmeb14 | AP3 | AP1 |
| Santa Teresa | cmk9ucug00003d23w7cnz61fe | AP3 | AP1 |
| Catumbi | cmk9ucvhs0009d23wab7899fj | AP3 | AP1 |
| Estácio | cmk9uivtx000cnhpxl7fxufk9 | AP3 | AP1 |
| Cidade Nova | cmk9uiv9n0009nhpxpt9fb28j | AP3 | AP1 |
| Rio Comprido | cmk9ucvyv000cd23w8t6gdh6r | AP3 | AP1 |

## CORREÇÃO EXECUTADA

### MÉTODO CONTROLADO
- **Ferramenta:** Render Shell + Prisma
- **Escopo:** Apenas metadados (administrativeRegion + zone)
- **Preservado:** IDs, geofences, geometrias, coordenadas

### SCRIPT UTILIZADO
```javascript
const result = await prisma.neighborhood.updateMany({
  where: { name: { in: TARGET_NAMES } },
  data: {
    administrativeRegion: 'AP1',
    zone: 'Centro'
  }
});
```

### RESULTADO EXECUTADO ✅
- **UPDATED_COUNT:** 7 ✅
- **Status:** OK_AP1_REMAP_DONE ✅
- **Idempotente:** ✅ (pode ser executado múltiplas vezes)
- **Sem side effects:** ✅ (não altera geofences)

## EVIDÊNCIA OBJETIVA

### CONTAGEM ANTES
- **AP1:** 4 bairros
- **AP3:** 35 bairros
- **Total:** 91 neighborhoods

### CONTAGEM DEPOIS (EXECUTADA) ✅
- **AP1:** 11 bairros (+7) ✅
- **AP3:** 28 bairros (-7) ✅
- **Total:** 91 neighborhoods (inalterado) ✅

### VALIDAÇÃO API ✅
- **Endpoint:** `https://kaviar-v2.onrender.com/api/governance/neighborhoods`
- **Verificação nominal:** Todos os 7 bairros confirmados como AP1
- **Contagens:** AP1=11, AP3=28 (conforme esperado)
- **Integridade:** IDs e geofences preservados

## FONTE OFICIAL VALIDADA

### MAPEAMENTO CORRETO (IPP Data Rio)
**AP1 (Centro/Portuária):**
- CENTRO → Centro, Lapa, Santa Teresa, Catumbi, Estácio
- PORTUARIA → Caju, Gamboa, Santo Cristo, Saúde  
- RIO COMPRIDO → Rio Comprido
- SANTA TEREZA → (já incluído)
- CIDADE NOVA → Cidade Nova

**Total AP1:** 11 bairros ✅

## GOVERNANÇA MANTIDA

### PROCESSO CONTROLADO ✅
- ❌ **Sem mexer backend/schema/endpoints**
- ❌ **Sem migrations ou alterações estruturais**
- ❌ **Sem alterar pipeline neighborhoods**
- ✅ **Apenas correção de metadados**
- ✅ **Render Shell com Prisma**
- ✅ **Script idempotente**

### INTEGRIDADE PRESERVADA ✅
- ✅ **IDs originais mantidos**
- ✅ **Geofences intactas**
- ✅ **Geometrias preservadas**
- ✅ **Coordenadas inalteradas**

## PRÓXIMOS PASSOS

### AP1 FECHAMENTO
Após correção, AP1 estará completo:
- **N_ap1 (oficial):** 11 bairros
- **M_ap1 (banco):** 11 bairros
- **GAP:** 0 ✅

### RELATÓRIO FECHAMENTO
Gerar: `/home/goes/kaviar/audit/RJ_AP1_FECHAMENTO.md`

### DISTRIBUIÇÃO FINAL CORRIGIDA
- **AP5:** 20 bairros ✅ COMPLETO
- **AP4:** 15 bairros ✅ COMPLETO  
- **AP3:** 28 bairros ✅ CORRIGIDO
- **AP2:** 17 bairros ✅ COMPLETO
- **AP1:** 11 bairros ✅ COMPLETO
- **Total:** 91 neighborhoods

---
**Correção AP1/AP3 executada com sucesso via Render Shell**
