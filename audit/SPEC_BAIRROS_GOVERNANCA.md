# 🏛️ KAVIAR - ESPECIFICAÇÃO BAIRROS GOVERNANÇA

**Data/Hora:** 2026-01-11T12:18:00-03:00  
**Branch:** main (031a5ee)  
**Status:** SPEC-ONLY (Não implementado)

## 🎯 OBJETIVO

Adicionar suporte a **BAIRROS** (Neighborhoods) no sistema KAVIAR, mantendo total compatibilidade com **COMMUNITIES** existentes, para atender à demanda da AP5 (Zona Oeste) do Rio de Janeiro.

## 📊 PROPOSTA 1 - MODELS PRISMA

### Model Neighborhood
```prisma
model Neighborhood {
  id                    String   @id @default(cuid())
  name                  String   @unique
  description           String?
  zone                  String?  // "Zona Norte", "Zona Sul", "Zona Oeste", "Centro"
  administrativeRegion  String?  @map("administrative_region") // "AP1", "AP2", "AP3", "AP4", "AP5"
  isActive              Boolean  @default(true) @map("is_active")
  centerLat             Decimal? @map("center_lat") @db.Decimal(10, 8)
  centerLng             Decimal? @map("center_lng") @db.Decimal(11, 8)
  isVerified            Boolean  @default(false) @map("is_verified")
  verifiedAt            DateTime? @map("verified_at")
  verifiedBy            String?  @map("verified_by")
  createdAt             DateTime @default(now()) @map("created_at")
  updatedAt             DateTime @updatedAt @map("updated_at")

  // Relations
  geofenceData          NeighborhoodGeofence?
  communities           Community[] // Bairro pode conter múltiplas communities

  @@map("neighborhoods")
}
```

### Model NeighborhoodGeofence
```prisma
model NeighborhoodGeofence {
  id              String      @id @default(cuid())
  neighborhoodId  String      @unique @map("neighborhood_id")
  geofenceType    String      @map("geofence_type") // "Polygon", "MultiPolygon", "Circle"
  coordinates     Json        // GeoJSON coordinates
  source          String?     // "OSM_relation_123", "IPP_DATA_RIO", "MANUAL"
  sourceUrl       String?     @map("source_url")
  area            Decimal?    @db.Decimal(15, 6) // Area in square meters
  perimeter       Decimal?    @db.Decimal(15, 6) // Perimeter in meters
  createdAt       DateTime    @default(now()) @map("created_at")
  updatedAt       DateTime    @updatedAt @map("updated_at")

  // Relations
  neighborhood    Neighborhood @relation(fields: [neighborhoodId], references: [id], onDelete: Cascade)

  @@map("neighborhood_geofences")
}
```

### Alteração no Model Community (Opcional)
```prisma
model Community {
  // ... campos existentes ...
  
  // Nova relação opcional
  neighborhoodId  String?     @map("neighborhood_id")
  neighborhood    Neighborhood? @relation(fields: [neighborhoodId], references: [id])
  
  // ... resto do model inalterado ...
}
```

## 🔗 PROPOSTA 2 - ENDPOINTS DE GOVERNANÇA

### Estrutura de Rotas
```
/api/governance/neighborhoods
├── GET    /                    # Listar todos os bairros
├── GET    /:id                 # Buscar bairro por ID
├── POST   /                    # Criar novo bairro (admin)
├── PUT    /:id                 # Atualizar bairro (admin)
├── DELETE /:id                 # Remover bairro (admin)
├── PATCH  /:id/verify          # Marcar como verificado
├── GET    /:id/geofence        # Buscar geofence do bairro
├── PUT    /:id/geofence        # Atualizar geofence do bairro
└── GET    /zones/:zone         # Listar bairros por zona
```

### Exemplos de Response

#### GET /api/governance/neighborhoods
```json
{
  "success": true,
  "data": [
    {
      "id": "clx1234567890",
      "name": "Bangu",
      "description": "Bairro Bangu - Zona Oeste",
      "zone": "Zona Oeste",
      "administrativeRegion": "AP5",
      "isActive": true,
      "centerLat": "-22.8791",
      "centerLng": "-43.4654",
      "isVerified": false,
      "geofenceType": "Polygon",
      "createdAt": "2026-01-11T12:00:00Z"
    }
  ],
  "total": 160,
  "page": 1,
  "limit": 50
}
```

#### GET /api/governance/neighborhoods/:id/geofence
```json
{
  "success": true,
  "data": {
    "id": "clx1234567890",
    "neighborhoodId": "clx1234567890",
    "geofenceType": "Polygon",
    "coordinates": {
      "type": "Polygon",
      "coordinates": [[[-43.4654, -22.8791], ...]]
    },
    "source": "IPP_DATA_RIO_2024",
    "area": 15420000.50,
    "perimeter": 18500.25
  }
}
```

## 📥 PROPOSTA 3 - PLANO DE IMPORT IDEMPOTENTE

### Fonte Oficial: IPP/Data.Rio "Limite de Bairros"
- **URL:** https://www.data.rio/datasets/limite-de-bairros-do-municipio-do-rio-de-janeiro
- **Formato:** GeoJSON/Shapefile
- **Atualização:** Anual (fonte oficial da Prefeitura)

### Script de Import: `rj_neighborhoods_pipeline.js`
```bash
# Localização
/home/goes/kaviar/backend/scripts/rj_neighborhoods_pipeline.js

# Comandos
node scripts/rj_neighborhoods_pipeline.js --dry-run
node scripts/rj_neighborhoods_pipeline.js --apply --ids id1,id2,id3,id4,id5
node scripts/rj_neighborhoods_pipeline.js --apply --allowlist audit/rj_neighborhoods_allowlist.txt
```

### Fluxo de Import Idempotente
1. **Download:** Baixar GeoJSON oficial do Data.Rio
2. **Parse:** Extrair nome, coordenadas, zona administrativa
3. **Normalize:** Padronizar nomes (acentos, case)
4. **Match:** Verificar se bairro já existe (por nome normalizado)
5. **Create/Update:** Criar novo ou atualizar geofence existente
6. **Validate:** Verificar integridade do polígono
7. **Report:** Gerar relatório de execução

### Estrutura de Dados Esperada
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "nome": "Bangu",
        "zona": "Zona Oeste",
        "ap": "AP5",
        "area_km2": 15.42
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[-43.4654, -22.8791], ...]]
      }
    }
  ]
}
```

## 🚀 PROPOSTA 4 - PLANO DE EXECUÇÃO POR LOTES

### Lote Padrão: 5 IDs da AP5
```
Lote 1: Bangu, Realengo, Campo Grande, Santa Cruz, Sepetiba
Lote 2: Guaratiba, Paciência, Cosmos, Santíssimo, Senador Camará
Lote 3: Senador Vasconcelos, Deodoro, Vila Militar, Magalhães Bastos, Jardim Sulacap
```

### Comandos de Execução
```bash
# 1. Dry-run para análise
node scripts/rj_neighborhoods_pipeline.js --dry-run --ids clx001,clx002,clx003,clx004,clx005

# 2. Aplicar lote
node scripts/rj_neighborhoods_pipeline.js --apply --ids clx001,clx002,clx003,clx004,clx005

# 3. Segunda execução (idempotência)
node scripts/rj_neighborhoods_pipeline.js --apply --ids clx001,clx002,clx003,clx004,clx005
```

### Evidência com cURL
```bash
# Antes da execução
for id in clx001 clx002 clx003 clx004 clx005; do
  curl -s "http://localhost:3001/api/governance/neighborhoods/$id" | jq '.data.geofenceType // "null"'
done

# Depois da execução
for id in clx001 clx002 clx003 clx004 clx005; do
  curl -s "http://localhost:3001/api/governance/neighborhoods/$id" | jq '.data | {name, geofenceType, isVerified}'
done
```

### Relatório Padrão
```
/home/goes/kaviar/audit/RJ_NEIGHBORHOODS_LOTE{N}_RELATORIO.md

Conteúdo:
- Data/hora + branch
- 5 IDs + nomes dos bairros
- Status antes/depois (geofenceType)
- Comandos executados + outputs
- Prova de idempotência (2ª execução)
- Evidência cURL
- Conformidade anti-frankenstein
```

## 🔧 IMPLEMENTAÇÃO TÉCNICA

### Migration Prisma
```sql
-- 001_create_neighborhoods.sql
CREATE TABLE "neighborhoods" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "zone" TEXT,
  "administrative_region" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "center_lat" DECIMAL(10,8),
  "center_lng" DECIMAL(11,8),
  "is_verified" BOOLEAN NOT NULL DEFAULT false,
  "verified_at" TIMESTAMP(3),
  "verified_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "neighborhoods_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "neighborhoods_name_key" ON "neighborhoods"("name");

-- 002_create_neighborhood_geofences.sql
CREATE TABLE "neighborhood_geofences" (
  "id" TEXT NOT NULL,
  "neighborhood_id" TEXT NOT NULL,
  "geofence_type" TEXT NOT NULL,
  "coordinates" JSONB NOT NULL,
  "source" TEXT,
  "source_url" TEXT,
  "area" DECIMAL(15,6),
  "perimeter" DECIMAL(15,6),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "neighborhood_geofences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "neighborhood_geofences_neighborhood_id_key" ON "neighborhood_geofences"("neighborhood_id");
```

### Arquivos a Criar
```
backend/src/
├── controllers/neighborhood.ts
├── services/neighborhood.ts
├── routes/neighborhoods.ts
├── utils/neighborhood-validator.ts
└── scripts/rj_neighborhoods_pipeline.js

backend/prisma/
└── migrations/
    ├── 001_create_neighborhoods/
    └── 002_create_neighborhood_geofences/

backend/audit/
├── rj_neighborhoods_allowlist.txt
└── RJ_NEIGHBORHOODS_LOTE{N}_RELATORIO.md
```

## ✅ COMPATIBILIDADE

### Garantias de Não-Quebra
1. **Communities inalteradas:** Todos os endpoints atuais funcionam
2. **Geofences separados:** NeighborhoodGeofence não interfere em CommunityGeofence
3. **Rotas isoladas:** `/neighborhoods` não conflita com `/communities`
4. **Models independentes:** Neighborhood é opcional para Community

### Coexistência
- **Communities:** Comunidades/favelas (escala micro)
- **Neighborhoods:** Bairros administrativos (escala macro)
- **Relação:** 1 Neighborhood pode ter N Communities

## 📊 CRONOGRAMA DE IMPLEMENTAÇÃO

### Fase 1: Models + Migration (1 dia)
- Criar models Prisma
- Gerar e aplicar migrations
- Testes de integridade

### Fase 2: Endpoints + Controllers (1 dia)
- Implementar rotas `/api/governance/neighborhoods`
- Controllers e services
- Validações e middlewares

### Fase 3: Pipeline de Import (1 dia)
- Script `rj_neighborhoods_pipeline.js`
- Download e parse do Data.Rio
- Lógica idempotente

### Fase 4: Testes + Execução (1 dia)
- Testes unitários
- Execução por lotes da AP5
- Relatórios de evidência

## 🎯 RESULTADO ESPERADO

Após implementação completa:
```bash
# Listar bairros da AP5
curl -s "http://localhost:3001/api/governance/neighborhoods?zone=Zona+Oeste&ap=AP5" | jq '.data[].name'

# Resultado esperado:
"Bangu"
"Realengo"
"Campo Grande"
"Santa Cruz"
"Sepetiba"
"Guaratiba"
"Paciência"
"Cosmos"
"Santíssimo"
"Senador Camará"
"Senador Vasconcelos"
```

---
*Especificação completa - Pronto para implementação*
