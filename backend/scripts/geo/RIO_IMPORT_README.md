# Rio de Janeiro Neighborhoods Import

Automação para importar bairros do Rio de Janeiro no sistema KAVIAR usando a API oficial da Prefeitura.

## Bairros Importados

- Ipanema
- Copacabana  
- Leme
- Barra da Tijuca
- Joá
- Alto da Boa Vista

## Fonte de Dados

API ArcGIS da Prefeitura do Rio de Janeiro:
`https://pgeo3.rio.rj.gov.br/arcgis/rest/services/Cartografia/Limites_administrativos/MapServer/4/query`

## Execução

### Variáveis de Ambiente

```bash
export ADMIN_TOKEN="seu_token_admin_aqui"
export BASE_URL="http://localhost:3001"  # opcional, default localhost
```

### Comando

```bash
cd /home/goes/kaviar/backend
node scripts/geo/fetch-and-import-rio-bairros.js
```

## Exemplo de Output

```
🚀 Starting Rio neighborhoods import...
🔍 Fetching neighborhoods from Rio ArcGIS API...
✅ Got GeoJSON format
📤 Importing to KAVIAR...

📊 IMPORT REPORT
================
🎯 Target neighborhoods: 6
🔍 Found in ArcGIS: 5
📥 Total processed: 5
✅ Inserted: 3
🔄 Updated: 2
❌ Errors: 0

✅ FOUND NEIGHBORHOODS:
  • Ipanema
  • Copacabana
  • Leme
  • Barra da Tijuca
  • Alto da Boa Vista

❌ MISSING NEIGHBORHOODS:
  • Joá

🌐 Test resolve: http://localhost:3001/api/geo/resolve?lat=-22.9868&lon=-43.2050

🎉 Import completed successfully!
```

## Teste de Validação

Após importação, teste o resolve com coordenadas de Copacabana:
```bash
curl "http://localhost:3001/api/geo/resolve?lat=-22.9868&lon=-43.2050"
```
