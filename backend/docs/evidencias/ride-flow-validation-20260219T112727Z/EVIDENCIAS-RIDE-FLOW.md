## Build/Commit (auto)
- UTC: 2026-02-19T11:27:51Z
- Branch: feat/dev-load-test-ride-flow-v1
- Commit: 52ca795d5702d26c8d4d35f7de06c99cc8c9673b

---

# Evidências SPEC_RIDE_FLOW_V1


## Validação Enterprise - Estado Atual

### Resumo Executivo
- ✅ Migrations parcialmente aplicadas (11 migrations)
- ⚠️  Migration ride_flow_v1 não encontrada na imagem ECS
- ⚠️  Tabelas rides_v2 e ride_offers não existem no DB
- ✅ Seed e test scripts não disponíveis na imagem ECS atual

### Ações Realizadas

#### Passo 1: Migrations
- Tentativa de aplicar migrations com prisma migrate deploy
- P3009 resolvido para migration 20260109114812_add_community_geofence
- P3018 encontrado em migrations subsequentes (tabelas dependencies faltando)
- 4 migrations aplicadas com sucesso:
  - 20260212121512_add_active_since_to_drivers
  - 20260212122930_add_premium_tourism_status
  - 20260212124106_add_premium_tourism_promoted_at
  - 20260212125747_premium_tourism_status_not_null

#### Passo 2: Seed + 20 Rides
- Task iniciada: 2504ecb54221487d871c8a4dcc7470ef
- Erro: seed-ride-flow-v1.ts não encontrado na imagem ECS
- Erro: scripts/test-ride-flow-v1.sh não encontrado

#### Passo 3: Logs
- Logs coletados: 20 linhas
- Marcadores gerados (vazios devido a falha no seed)

#### Passo 4: Sanity DB
- Task executada: 848551ce2c8b48b9b1796abeae3bafc7
- Erro P1014: tabela rides_v2 não existe

### Diagnóstico

**Problema Principal:** A imagem ECS (task-definition:148) não contém:
1. Migration 20260218000000_ride_flow_v1
2. Arquivo prisma/seed-ride-flow-v1.ts
3. Script scripts/test-ride-flow-v1.sh

**Solução Necessária:**
1. Build nova imagem Docker com código atualizado
2. Push para ECR
3. Criar nova task definition
4. Re-executar validação completa

---

## Evidências DB e SQL (auto) — 2026-02-19T11:27:20Z

### Checklist
- [x] Migration logs coletados
- [x] Sanity DB executado
- [ ] SQL full (não executado - tabelas não existem)
- [ ] 20 rides criadas (não executado - seed não disponível)

### DB sanity (raw — últimas 20 linhas)
```
Error: P1014
The underlying table for model `rides_v2` does not exist.
=== SANITY OK ===
```

### Migration logs (raw — últimas 60 linhas)
```
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "kaviar_validation", schema "public" at "kaviar-prod-db.cxuuaq46o1o5.us-east-2.rds.amazonaws.com:5432"
11 migrations found in prisma/migrations
Applying migration `20260212121512_add_active_since_to_drivers`
Applying migration `20260212122930_add_premium_tourism_status`
Applying migration `20260212124106_add_premium_tourism_promoted_at`
Applying migration `20260212125747_premium_tourism_status_not_null`
The following migration(s) have been applied:
migrations/
  └─ 20260212121512_add_active_since_to_drivers/
    └─ migration.sql
  └─ 20260212122930_add_premium_tourism_status/
    └─ migration.sql
  └─ 20260212124106_add_premium_tourism_promoted_at/
    └─ migration.sql
  └─ 20260212125747_premium_tourism_status_not_null/
    └─ migration.sql
      
All migrations have been successfully applied.
sh: 1: psql: not found
```

### Validation logs (raw — últimas 30 linhas)
```
=== VALIDATION START ===
node:internal/modules/run_main:123
    triggerUncaughtException(
    ^
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/app/prisma/seed-ride-flow-v1.ts' imported from /app/
    at finalizeResolution (node:internal/modules/esm/resolve:283:11)
    at moduleResolve (node:internal/modules/esm/resolve:952:10)
    at defaultResolve (node:internal/modules/esm/resolve:1188:11)
    at nextResolve (node:internal/modules/esm/hooks:864:28)
    at resolveBase (file:///app/node_modules/tsx/dist/esm/index.mjs?1771500072387:2:3744)
    at resolveDirectory (file:///app/node_modules/tsx/dist/esm/index.mjs?1771500072387:2:4243)
    at resolveTsPaths (file:///app/node_modules/tsx/dist/esm/index.mjs?1771500072387:2:4984)
    at resolve (file:///app/node_modules/tsx/dist/esm/index.mjs?1771500072387:2:5361)
    at nextResolve (node:internal/modules/esm/hooks:864:28)
    at Hooks.resolve (node:internal/modules/esm/hooks:306:30) {
  code: 'ERR_MODULE_NOT_FOUND',
  url: 'file:///app/prisma/seed-ride-flow-v1.ts'
}
Node.js v20.20.0
bash: scripts/test-ride-flow-v1.sh: No such file or directory
```

---
## Manifest (auto) — 2026-02-19T11:27:51Z

- Arquivos: 28
- Total bytes: 9958

### Top 10 (path | bytes | sha256)
```
anexos/validation-admin-kaviar-login.txt | 172 bytes | 5f84418b31012cb911a08610179f13f74a5d6090086625a4b9608d47db6f2ed7
anexos/validation-db-sanity.txt | 89 bytes | 0baed257e6946082960a17771647a119ef8f9ae02d7dd66de6b29ad7a40ecdc7
anexos/validation-db-user-grants.txt | 246 bytes | bcd495e4c63d23de34cd814cb663c805b04b1c2176f545c45a680016867e1e55
anexos/validation-dispatch-candidates.txt | 0 bytes | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
anexos/validation-dispatcher-filter.txt | 0 bytes | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
anexos/validation-full-logs.txt | 1109 bytes | 91855ddb107ffc3b3386e7547de6350f4788a232ddc7ab27e7f40ed0426c1186
anexos/validation-migrate-logs.txt | 945 bytes | 39d4a5d4aabbfe7053de3c509ae550251feb0b7b8adc1779e07573cfc6c24712
anexos/validation-migrate-task-arn.txt | 88 bytes | f0a3c0e277426dbacc57b5598398db3756a987807965c059d91b0b4c783dbde7
anexos/validation-offer-expired.txt | 0 bytes | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
anexos/validation-offer-sent.txt | 0 bytes | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
```
