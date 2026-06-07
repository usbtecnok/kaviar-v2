# Runbook — Migration 011: women_driver_preference

## Pré-requisitos

- Branch mergeada ou código deployado
- Acesso ao banco de produção
- Feature flag `WOMEN_DRIVER_PREFERENCE_ENABLED=false` confirmada

## Execução

```bash
# No container ECS:
cat > /tmp/011_women_driver_preference.sql << 'EOF'
<conteúdo da migration>
EOF

cd /app && npx prisma db execute --schema ./prisma/schema.prisma --file /tmp/011_women_driver_preference.sql
```

## Validação

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'passengers' AND column_name LIKE 'women%';
-- Esperado: 5 colunas

SELECT column_name FROM information_schema.columns
WHERE table_name = 'drivers' AND column_name LIKE 'women%';
-- Esperado: 4 colunas

SELECT column_name FROM information_schema.columns
WHERE table_name = 'rides_v2' AND column_name = 'prefer_woman_driver';
-- Esperado: 1 coluna

SELECT table_name FROM information_schema.tables
WHERE table_name = 'women_matching_consent_events';
-- Esperado: 1 tabela

SELECT COUNT(*) FROM women_matching_consent_events;
-- Esperado: 0
```

## Rollback

```sql
DROP TABLE IF EXISTS women_matching_consent_events;
ALTER TABLE passengers
  DROP COLUMN IF EXISTS women_matching_opt_in,
  DROP COLUMN IF EXISTS prefer_woman_driver_default,
  DROP COLUMN IF EXISTS women_matching_opted_in_at,
  DROP COLUMN IF EXISTS women_matching_opted_out_at,
  DROP COLUMN IF EXISTS women_matching_consent_version;
ALTER TABLE drivers
  DROP COLUMN IF EXISTS women_matching_opt_in,
  DROP COLUMN IF EXISTS women_matching_opted_in_at,
  DROP COLUMN IF EXISTS women_matching_opted_out_at,
  DROP COLUMN IF EXISTS women_matching_consent_version;
ALTER TABLE rides_v2
  DROP COLUMN IF EXISTS prefer_woman_driver;
```
