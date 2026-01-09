# Rio de Janeiro Communities Import

Automação para importar comunidades/favelas do Rio de Janeiro usando dados oficiais do SABREN (Sistema de Assentamentos de Baixa Renda).

## Comunidades Importadas (MVP)

**Copacabana/Ipanema:**
- Cantagalo
- Pavão-Pavãozinho

**Copacabana:**
- Tabajaras

**Leme:**
- Chapéu Mangueira
- Babilônia

## Fonte de Dados

SABREN - Limites de Favelas 2022 (MapServer Layer 13):
`https://pgeo3.rio.rj.gov.br/arcgis/rest/services/SABREN/Limites_de_Favelas/MapServer/13/query`

## Hierarquia de Resolução

O sistema agora prioriza **COMUNIDADE > BAIRRO**:
1. Se o ponto cai em uma comunidade, retorna a comunidade
2. Se não, procura no bairro correspondente
3. Critério de desempate: área menor (mais específica)

## Execução

### Obter ADMIN_TOKEN

```bash
# Login como admin
curl -X POST https://kaviar-v2.onrender.com/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@kaviar.com","password":"sua_senha"}' \
  | jq -r '.data.token'
```

### Variáveis de Ambiente

```bash
export ADMIN_TOKEN="seu_token_admin_aqui"
export BASE_URL="https://kaviar-v2.onrender.com"  # opcional, default localhost
```

### Comando

```bash
cd /home/goes/kaviar/backend
node scripts/geo/fetch-and-import-rio-comunidades.js
```

## Exemplo de Output

```
🚀 Starting Rio communities import...
🔍 Fetching communities from SABREN FeatureServer...
📡 Query: (bairro LIKE '%Copacabana%' OR bairro LIKE '%Leme%' OR bairro LIKE '%Ipanema%') AND (nome LIKE '%Cantagalo%' OR nome LIKE '%Pavão-Pavãozinho%' OR ...)
✅ Got GeoJSON format
📤 Importing communities to KAVIAR...

📊 COMMUNITIES IMPORT REPORT
============================
🎯 Target communities: 8
🔍 Found in SABREN: 5
📥 Total processed: 5
✅ Inserted: 5
🔄 Updated: 0
❌ Errors: 0

✅ FOUND COMMUNITIES:
  • Babilônia (Leme) [Complexo do Leme]
  • Chapéu Mangueira (Leme) [Complexo do Leme]
  • Cantagalo (Copacabana/Ipanema)
  • Pavão-Pavãozinho (Copacabana/Ipanema)
  • Tabajaras (Copacabana)

🌐 Test resolve (Babilônia): https://kaviar-v2.onrender.com/api/geo/resolve?lat=-22.9665&lon=-43.1611
🌐 Test resolve (Copacabana): https://kaviar-v2.onrender.com/api/geo/resolve?lat=-22.9711&lon=-43.1822

🎉 Communities import completed successfully!
```

## Testes de Validação

### Teste Prioridade: Comunidade > Bairro

```bash
# Ponto dentro da Babilônia (deve retornar comunidade)
curl "https://kaviar-v2.onrender.com/api/geo/resolve?lat=-22.9665&lon=-43.1611"
# Esperado: {"match": true, "area": {"id": "comunidade-babilonia", ...}}

# Ponto em Copacabana fora de comunidades (deve retornar bairro)
curl "https://kaviar-v2.onrender.com/api/geo/resolve?lat=-22.9711&lon=-43.1822"
# Esperado: {"match": true, "area": {"id": "bairro-copacabana", ...}}
```

### Teste Comunidades Específicas

```bash
# Chapéu Mangueira (Leme)
curl "https://kaviar-v2.onrender.com/api/geo/resolve?lat=-22.9658&lon=-43.1598"

# Cantagalo (Copacabana/Ipanema)
curl "https://kaviar-v2.onrender.com/api/geo/resolve?lat=-22.9885&lon=-43.1965"

# Pavão-Pavãozinho (Copacabana/Ipanema)
curl "https://kaviar-v2.onrender.com/api/geo/resolve?lat=-22.9890&lon=-43.1970"
```

## Coordenadas de Referência

- **Babilônia:** -22.9665, -43.1611
- **Chapéu Mangueira:** -22.9658, -43.1598
- **Cantagalo:** -22.9885, -43.1965
- **Pavão-Pavãozinho:** -22.9890, -43.1970
- **Copacabana (fora de comunidade):** -22.9711, -43.1822
