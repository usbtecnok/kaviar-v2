# Geofence Gap Report

**Data:** 2026-02-06  
**Região:** us-east-2  
**Database:** kaviar-prod-db

---

## 📊 Diagnóstico

### Totais
```sql
SELECT COUNT(*) AS neighborhoods_total FROM neighborhoods;
-- Result: 268

SELECT COUNT(*) AS geofences_total FROM neighborhood_geofences;
-- Result: 262
```

**Gap:** 6 bairros sem geofence

---

## 🔍 Bairros Sem Geofence

```sql
SELECT n.id, n.name, n.city
FROM neighborhoods n
LEFT JOIN neighborhood_geofences ng ON ng.neighborhood_id = n.id
WHERE ng.id IS NULL
ORDER BY n.city, n.name;
```

| ID | Nome | Cidade |
|----|------|--------|
| 127233ae-b714-4e55-8145-ba9ee168f198 | Castelo | Rio de Janeiro |
| 8f73997e-5ee7-4ea0-8240-93326f51c9fa | Cinelândia | Rio de Janeiro |
| f2f2d694-76ec-4544-b356-7ee05fecba2b | Freguesia | Rio de Janeiro |
| ca9f2d82-9bc8-467f-85cb-17c971dbcb9e | Oswaldo Cruz | Rio de Janeiro |
| 4aefb73e-2b57-45b2-8c18-e80d6e3d992a | Santana | Rio de Janeiro |
| f0fe14bc-d6e8-4624-9607-8dc7369b66da | Turiaçu | Rio de Janeiro |

---

## ⚠️ Sanity Checks

### Geometrias Inválidas
```sql
SELECT COUNT(*) AS invalid_geom
FROM neighborhood_geofences
WHERE NOT ST_IsValid(geom);
-- Result: 1
```

**Erro detectado:** Ring Self-intersection at point (-43.225180, -22.874637)

### SRID Incorreto
```sql
SELECT COUNT(*) AS wrong_srid
FROM neighborhood_geofences
WHERE ST_SRID(geom) <> 4326;
-- Result: 0
```

✅ Todos os SRIDs estão corretos (4326)

---

## 🎯 Ações Necessárias

### 1. Importar Geofences Faltantes (6 bairros)
**Fonte:** Arquivos GeoJSON originais do projeto

**Comando de importação (exemplo):**
```bash
node backend/src/scripts/import-geojson.ts \
  --file data/geojson/rio-bairros.geojson \
  --area-type BAIRRO_OFICIAL \
  --city "Rio de Janeiro"
```

**Validação pós-importação:**
```sql
-- Deve retornar 0
SELECT COUNT(*) AS missing_geofences
FROM neighborhoods n
LEFT JOIN neighborhood_geofences ng ON ng.neighborhood_id = n.id
WHERE ng.id IS NULL;
```

### 2. Corrigir Geometria Inválida
**Identificar qual geofence:**
```sql
SELECT ng.id, n.name, ST_IsValidReason(ng.geom) as reason
FROM neighborhood_geofences ng
JOIN neighborhoods n ON n.id = ng.neighborhood_id
WHERE NOT ST_IsValid(ng.geom);
```

**Correção automática (PostGIS):**
```sql
UPDATE neighborhood_geofences
SET geom = ST_MakeValid(geom)
WHERE NOT ST_IsValid(geom);
```

---

## 📋 Critérios de Sucesso

Após correção, todas as queries devem retornar 0:

- ✅ `missing_geofences = 0` (atualmente: 6)
- ⚠️ `invalid_geom = 0` (atualmente: 1)
- ✅ `wrong_srid = 0` (já correto)

---

## 🔗 Referências

- **Script de importação:** `backend/src/scripts/import-geojson.ts`
- **Dados GeoJSON:** `data/geojson/` (verificar se existem)
- **Command ID SSM:** `7399e046-11d9-4f0c-969d-57538eff5ada`

---

## ⏭️ Próximos Passos

1. Localizar arquivos GeoJSON dos 6 bairros faltantes
2. Executar import-geojson.ts para cada bairro
3. Corrigir geometria inválida com ST_MakeValid
4. Re-executar validação
5. Atualizar este documento com resultado final
