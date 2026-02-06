# Fix: Neighborhoods sem campo `city` nos endpoints

## Problema Identificado

Frontend esperava:
```json
{
  "id": "...",
  "name": "Abolição",
  "city": "Rio de Janeiro",
  "zone": null,
  "is_active": true
}
```

Mas recebia:
```json
{
  "id": "...",
  "name": "Abolição",
  "zone": null,
  "is_active": true
}
```

**Causa:** Campo `city` foi comentado nos endpoints com nota "HOTFIX: prod DB sem coluna city"

## Arquitetura Atual

- **NÃO existe tabela `cities`** no schema Prisma
- Campo `city` em `neighborhoods` é String com default "Rio de Janeiro"
- Não há FK/relação com tabela cities

## Correções Aplicadas

### 1. Backend - Endpoints corrigidos

**Arquivo:** `backend/src/routes/governance.ts`
```typescript
// ANTES (comentado):
// city: true, // HOTFIX: prod DB sem coluna city

// DEPOIS:
city: true,
```

**Arquivo:** `backend/src/services/territory-service.ts`
```typescript
// Adicionado city no select e no map:
select: {
  id: true,
  name: true,
  city: true,  // ← ADICIONADO
  zone: true,
  // ...
}

const all = allNeighborhoods.map((n) => ({
  id: n.id,
  name: n.name,
  city: n.city,  // ← ADICIONADO
  zone: n.zone,
  // ...
}));
```

### 2. Banco de Dados - Verificação

**Script:** `backend/migrations/fix_neighborhoods_city.sql`

Execute via ECS task ou EC2:
```bash
psql -h kaviar-prod-db... -U kaviaradmin -d kaviar -f fix_neighborhoods_city.sql
```

O script:
1. Verifica quantos bairros têm city preenchido
2. Lista cidades distintas
3. Atualiza bairros com city NULL para "Rio de Janeiro"
4. Valida resultado

## Payload Esperado Agora

### Endpoint: `GET /api/governance/neighborhoods`
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Abolição",
      "city": "Rio de Janeiro",
      "zone": "Zona Norte",
      "is_active": true
    }
  ]
}
```

### Endpoint: `GET /api/neighborhoods/smart-list`
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Abolição",
      "city": "Rio de Janeiro",
      "zone": "Zona Norte",
      "hasGeofence": true,
      "minFee": 7,
      "maxFee": 20
    }
  ],
  "detected": null,
  "nearby": []
}
```

## Frontend - Compatibilidade

Frontend pode agora:
```typescript
// Filtrar por cidade (string)
const rjNeighborhoods = neighborhoods.filter(n => n.city === "Rio de Janeiro");

// Exibir cidade
<Text>{neighborhood.city}</Text>

// Agrupar por cidade
const grouped = groupBy(neighborhoods, 'city');
```

## Próximos Passos (Futuro)

Se precisar de múltiplas cidades com relação FK:

1. Criar tabela `cities`:
```prisma
model cities {
  id            String          @id @default(uuid())
  name          String
  state         String
  neighborhoods neighborhoods[]
}
```

2. Adicionar FK em neighborhoods:
```prisma
model neighborhoods {
  // ...
  city_id String?
  city    cities? @relation(fields: [city_id], references: [id])
}
```

3. Migrar dados:
```sql
INSERT INTO cities (id, name, state) VALUES (uuid_generate_v4(), 'Rio de Janeiro', 'RJ');
UPDATE neighborhoods SET city_id = (SELECT id FROM cities WHERE name = 'Rio de Janeiro');
```

Mas por enquanto, String funciona perfeitamente.

## Deploy

1. Commit das mudanças
2. Build da imagem Docker
3. Deploy no ECS (task definition nova)
4. Executar script SQL no banco (opcional, se houver nulls)
5. Testar endpoints no frontend

## Validação

```bash
# Testar endpoint governance
curl https://api.kaviar.com.br/api/governance/neighborhoods

# Testar smart-list
curl https://api.kaviar.com.br/api/neighborhoods/smart-list

# Verificar que city está presente no JSON
```

---

**Data:** 2026-02-06  
**Autor:** Kiro AI  
**Status:** ✅ Código corrigido, aguardando deploy
