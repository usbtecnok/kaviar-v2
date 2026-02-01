# 🗺️ KAVIAR - Sistema de Geofencing Inclusivo

## 🎯 Diferencial Competitivo

O Kaviar não usa apenas "pontos no mapa". Trabalhamos com:
- **Polígonos precisos** (áreas desenhadas)
- **Raios de segurança** configuráveis
- **Suporte a áreas com GPS impreciso** (favelas/comunidades)

## 📊 Estrutura de Dados

### Tipos de Áreas
1. **BAIRRO_OFICIAL** - Bairros oficiais da prefeitura
2. **FAVELA** - Comunidades/favelas (podem estar dentro de bairros)
3. **COMUNIDADE** - Áreas comunitárias
4. **DISTRITO** - Distritos administrativos
5. **AREA_RISCO** - Áreas de risco mapeadas

### Hierarquia
```
Cidade (Rio de Janeiro)
├── Bairro Oficial (Copacabana)
│   ├── Favela A (dentro do bairro)
│   └── Favela B (dentro do bairro)
└── Bairro Oficial (Botafogo)
    └── Comunidade C
```

## 📥 Fontes de Dados GeoJSON

### Rio de Janeiro

#### 1. Bairros Oficiais (163 bairros)
**Fonte**: Data.Rio / Portal Geo PCRJ
- URL: http://portalgeo-pcrj.opendata.arcgis.com/
- Dataset: Limite de Bairros
- ID: 8454eb0454b7424d89c61b67742286a1_15
- Formato: GeoJSON
- **Download**: 
  ```bash
  curl "https://services.arcgis.com/FWW8ZAuwuf5l2kHY/arcgis/rest/services/Limite_Bairro/FeatureServer/0/query?where=1%3D1&outFields=*&outSR=4326&f=geojson" -o rio_bairros.geojson
  ```

#### 2. Favelas/Comunidades (~700 áreas)
**Fonte**: IPP Rio (Instituto Pereira Passos)
- URL: https://www.data.rio/
- Dataset: Áreas de Favelas
- **Alternativa**: Sabren (Sistema de Assentamentos de Baixa Renda)
- **Download manual**: Acessar Data.Rio → Buscar "favelas" ou "comunidades"

**Fonte Alternativa**: OpenStreetMap
```bash
# Extrair favelas do OSM
curl "https://overpass-api.de/api/interpreter?data=[out:json];area[name='Rio de Janeiro']->.a;(node['place'='neighbourhood']['informal'='yes'](area.a);way['place'='neighbourhood']['informal'='yes'](area.a););out geom;" -o rio_favelas_osm.json
```

### São Paulo

#### 1. Distritos Oficiais (96 distritos)
**Fonte**: GeoSampa
- URL: http://geosampa.prefeitura.sp.gov.br/
- Dataset: Distritos Municipais
- **Download**:
  ```bash
  curl "http://geosampa.prefeitura.sp.gov.br/geoserver/geoportal/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=geoportal:distrito&outputFormat=json" -o sp_distritos.geojson
  ```

#### 2. Favelas/Comunidades
**Fonte**: HABISP (Sistema de Informações para Habitação Social)
- URL: https://www.prefeitura.sp.gov.br/cidade/secretarias/habitacao/
- Dataset: Assentamentos Precários

## 🛠️ Como Importar

### 1. Baixar GeoJSONs
```bash
cd backend/data/geojson

# Rio - Bairros
curl "https://services.arcgis.com/FWW8ZAuwuf5l2kHY/arcgis/rest/services/Limite_Bairro/FeatureServer/0/query?where=1%3D1&outFields=*&outSR=4326&f=geojson" -o rio_bairros.geojson

# São Paulo - Distritos
curl "http://geosampa.prefeitura.sp.gov.br/geoserver/geoportal/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=geoportal:distrito&outputFormat=json" -o sp_distritos.geojson
```

### 2. Executar Migration
```bash
cd backend
PGPASSWORD='npg_2xbfMWRF6hrO' psql -h ep-wispy-thunder-ad850l5j-pooler.c-2.us-east-1.aws.neon.tech -U neondb_owner -d neondb -f ../migration_geofencing.sql
```

### 3. Importar Dados
```bash
DATABASE_URL="postgresql://neondb_owner:npg_2xbfMWRF6hrO@ep-wispy-thunder-ad850l5j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require" npx tsx src/scripts/import-geojson.ts
```

## 📊 Estrutura do Banco

### Tabela: neighborhoods
```sql
- id (UUID)
- name (TEXT)
- city (TEXT)
- area_type (VARCHAR) -- BAIRRO_OFICIAL, FAVELA, COMUNIDADE, DISTRITO
- parent_neighborhood_id (TEXT) -- Para favelas dentro de bairros
- zone (TEXT) -- Zona Sul, Zona Norte, etc
- population (INTEGER)
- area_km2 (DECIMAL)
- is_active (BOOLEAN)
```

### Tabela: neighborhood_geofences
```sql
- id (UUID)
- neighborhood_id (TEXT FK)
- geom (GEOMETRY Polygon/MultiPolygon)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

## 🎯 Funcionalidades PostGIS

### Verificar se ponto está dentro do bairro
```sql
SELECT point_in_neighborhood(-22.9068, -43.1729, 'neighborhood-id');
```

### Calcular área em km²
```sql
SELECT calculate_area_km2(geom) FROM neighborhood_geofences WHERE neighborhood_id = 'id';
```

### Buscar bairros próximos (raio de 5km)
```sql
SELECT n.name, ST_Distance(
  ST_Transform(ng.geom, 3857),
  ST_Transform(ST_SetSRID(ST_MakePoint(-43.1729, -22.9068), 4326), 3857)
) / 1000 as distance_km
FROM neighborhoods n
JOIN neighborhood_geofences ng ON ng.neighborhood_id = n.id
WHERE ST_DWithin(
  ST_Transform(ng.geom, 3857),
  ST_Transform(ST_SetSRID(ST_MakePoint(-43.1729, -22.9068), 4326), 3857),
  5000
)
ORDER BY distance_km;
```

## 📈 Métricas Esperadas

### Rio de Janeiro
- **Bairros Oficiais**: 163
- **Favelas/Comunidades**: ~700
- **Total**: ~863 áreas

### São Paulo
- **Distritos**: 96
- **Favelas/Comunidades**: ~1.700
- **Total**: ~1.796 áreas

## 🎨 Frontend - Separação Visual

### Dashboard Admin
```typescript
// Filtros
- Cidade: [Rio de Janeiro] [São Paulo]
- Tipo: [Todos] [Bairros] [Favelas] [Comunidades]
- Zona: [Todas] [Zona Sul] [Zona Norte] [Zona Oeste] [Centro]

// Visualização
- Mapa com cores diferentes por tipo
- Lista agrupada por cidade → tipo → zona
- Métricas separadas (motoristas por tipo de área)
```

## 🚀 Próximos Passos

1. ✅ Migration executada
2. ✅ Script de importação criado
3. ⏳ Baixar GeoJSONs oficiais
4. ⏳ Importar dados
5. ⏳ Atualizar API para filtrar por area_type
6. ⏳ Atualizar Frontend com filtros
7. ⏳ Implementar visualização no mapa

---
**Data**: 2026-01-30
**Status**: Estrutura pronta, aguardando GeoJSONs
