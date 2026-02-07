# COMMIT 3 - IMPORTADOR GEOJSON - EXEMPLOS DE USO

## ✅ Endpoint Funcionando

**URL**: `POST /api/admin/geofence/import-geojson`

**Headers**: 
- `Content-Type: application/json`
- `Authorization: Bearer <admin_token>`

**Body**:
```json
{
  "type": "NEIGHBORHOOD",
  "city": "Rio de Janeiro", 
  "geojson": {
    "type": "FeatureCollection",
    "features": [...]
  }
}
```

## 📋 Exemplo de Curl

### 1. Importar bairros do Rio de Janeiro
```bash
# Primeiro fazer login admin para obter token
TOKEN=$(curl -s -X POST "http://localhost:3001/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@kaviar.com","password":"<ADMIN_PASSWORD>"}' | jq -r .token)

# Importar GeoJSON
curl -X POST "http://localhost:3001/api/admin/geofence/import-geojson" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d @scripts/geo/test-neighborhoods-rj.geojson
```

### 2. Resposta esperada
```json
{
  "success": true,
  "summary": {
    "total": 2,
    "inserted": 2,
    "updated": 0,
    "errors": 0,
    "type": "NEIGHBORHOOD",
    "city": "Rio de Janeiro"
  },
  "errors": []
}
```

## 🔧 Funcionalidades

- ✅ **Conversão automática**: Polygon → MultiPolygon
- ✅ **Compatibilidade UI**: Gera geofence JSON para painel existente
- ✅ **Upsert inteligente**: Evita duplicatas por ID único
- ✅ **Validação robusta**: Geometria e propriedades
- ✅ **Logs detalhados**: Inseridos/atualizados/erros
- ✅ **PostGIS nativo**: ST_GeomFromGeoJSON com SRID 4326

## 📊 Resultado dos Testes

```
=== IMPORTAÇÃO CONCLUÍDA ===
Total: 2 features
Inseridos: 2 communities  
Atualizados: 0 communities
Erros: 0

✅ Copacabana importada e testada
✅ Ipanema importada e testada
✅ Resolução geográfica funcionando
```
