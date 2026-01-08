# COMMIT 2 - ENDPOINT GEO/RESOLVE - EXEMPLOS DE USO

## ✅ Endpoint Funcionando

**URL**: `GET /api/geo/resolve`

**Parâmetros**:
- `lat` (required): Latitude (-90 a 90)
- `lon` (required): Longitude (-180 a 180)  
- `type` (optional): Filtro por tipo de área

## 📋 Exemplos de Curl

### 1. Coordenadas DENTRO de área (Rio de Janeiro - Furnas)
```bash
curl -s "http://localhost:3001/api/geo/resolve?lat=-22.9068&lon=-43.1729" | jq .
```

**Resposta esperada**:
```json
{
  "match": true,
  "area": {
    "id": "cmjxqj08u0000ov5lwq1a48jl",
    "name": "Furnas",
    "description": "Comunidade de Furnas - Minas Gerais",
    "active": true
  }
}
```

### 2. Coordenadas FORA de área (São Paulo)
```bash
curl -s "http://localhost:3001/api/geo/resolve?lat=-23.5505&lon=-46.6333" | jq .
```

**Resposta esperada**:
```json
{
  "match": false
}
```

### 3. Parâmetros inválidos
```bash
curl -s "http://localhost:3001/api/geo/resolve?lat=invalid&lon=-43.1729" | jq .
```

**Resposta esperada**:
```json
{
  "error": "Invalid coordinates. Lat must be [-90,90], Lon must be [-180,180]"
}
```

## 🔧 Tecnologia Utilizada

- **PostGIS**: `ST_Covers(geom, ST_SetSRID(ST_Point(lon, lat), 4326))`
- **SRID**: 4326 (WGS84)
- **Ordem**: ST_Point(longitude, latitude) ✅
- **Borda**: ST_Covers inclui pontos na borda ✅
- **Performance**: Índice GiST ativo ✅
