# VALIDAÇÃO TERRITÓRIO - LOG COMPLETO

**Data:** 2026-02-05 23:16:24 BRT  
**Script:** scripts/validate_territory_real_data.sh  
**Resultado:** ✅ PASS (3/3 cenários)

---

## Log de Execução

```
🔍 VALIDAÇÃO TERRITÓRIO - DADOS REAIS
======================================
API: https://api.kaviar.com.br
Data: qui 05 fev 2026 23:16:24 -03

1️⃣ Autenticando admin...
✅ Admin autenticado

2️⃣ Buscando bairros...
✅ Bairro: Abolição (cd4853bf-d705-47cd-a02c-5f7852423447)

3️⃣ Criando motorista TEST_KIRO_...
✅ Motorista: 0a5d35d2-826b-4650-b322-fbddbb7f433b
✅ Motorista aprovado

4️⃣ CENÁRIO A: Mesmo bairro (7%)
  Coords: Abolição (-22.8857, -43.2994)
  Taxa: 7% | Tipo: SAME_NEIGHBORHOOD
  ✅ PASS

5️⃣ CENÁRIO B: Bairro adjacente (12%)
  Coords: Acari (-22.8214, -43.3411)
  Taxa: 12% | Tipo: ADJACENT_NEIGHBORHOOD
  ✅ PASS

6️⃣ CENÁRIO C: Fora da região (20%)
  Taxa: 20% | Tipo: OUTSIDE_FENCE
  ✅ PASS

7️⃣ Limpeza...
✅ Recursos TEST_KIRO_ removidos

======================================
RESULTADO FINAL: PASS
Log salvo em: /tmp/validate_territory_20260205_231624.log
```

---

## Coordenadas Utilizadas

### Abolição (Cenário A)
```sql
SELECT 
  ST_Y(ST_PointOnSurface(ng.geom)) AS lat,
  ST_X(ST_PointOnSurface(ng.geom)) AS lng
FROM neighborhood_geofences ng
JOIN neighborhoods n ON n.id = ng.neighborhood_id
WHERE n.name = 'Abolição'
LIMIT 1;

-- Resultado:
--        lat         |        lng
-- -------------------+--------------------
--  -22.88570991128094 | -43.29937885457156
```

### Acari (Cenário B)
```sql
SELECT 
  ST_Y(ST_PointOnSurface(ng.geom)) AS lat,
  ST_X(ST_PointOnSurface(ng.geom)) AS lng
FROM neighborhood_geofences ng
JOIN neighborhoods n ON n.id = ng.neighborhood_id
WHERE n.name = 'Acari'
LIMIT 1;

-- Resultado:
--         lat         |         lng
-- --------------------+---------------------
--  -22.821365718315544 | -43.341095893989184
```

---

## Resumo

| Cenário | Taxa Esperada | Taxa Obtida | Match Type | Status |
|---------|---------------|-------------|------------|--------|
| A - Mesmo bairro | 7% | 7% | SAME_NEIGHBORHOOD | ✅ PASS |
| B - Bairro adjacente | 12% | 12% | ADJACENT_NEIGHBORHOOD | ✅ PASS |
| C - Fora da região | 20% | 20% | OUTSIDE_FENCE | ✅ PASS |

**Resultado Final:** ✅ **PASS (3/3)**

---

## Arquivos Relacionados

- **Script:** `scripts/validate_territory_real_data.sh`
- **Documentação:** `docs/INVESTIGACAO_RDS_TERRITORIO_FINAL_2026-02-05.md`
- **Log original:** `/tmp/validate_territory_20260205_231624.log`
