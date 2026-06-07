# Runbook — Migration 012: women_preference_eligibility

## Pré-requisitos

- Backend saudável (health OK)
- ECS estável (desired=running=1)
- Feature flag `WOMEN_DRIVER_PREFERENCE_ENABLED=false`
- Acesso ao banco via `kaviaradmin`

## Execução

Via task ECS `kaviar-backend-migration:2` ou psql direto:

```bash
psql -v ON_ERROR_STOP=1 -h kaviar-prod-db.cxuuaq46o1o5.us-east-2.rds.amazonaws.com \
  -U kaviaradmin -d kaviar -f 012_women_preference_eligibility.sql
```

## Validação

```sql
-- Verificar colunas passengers
SELECT column_name FROM information_schema.columns
WHERE table_name = 'passengers' AND column_name LIKE 'women_preference_%';
-- Esperado: 4 colunas

-- Verificar colunas drivers
SELECT column_name FROM information_schema.columns
WHERE table_name = 'drivers' AND column_name LIKE 'women_preference_%';
-- Esperado: 4 colunas

-- Verificar constraint action atualizada
SELECT pg_get_constraintdef(oid) FROM pg_constraint
WHERE conname = 'women_matching_consent_events_action_check';
-- Esperado: inclui eligibility_declared e eligibility_revoked

-- Verificar que ninguém é elegível
SELECT COUNT(*) FROM passengers WHERE women_preference_eligible = true;
-- Esperado: 0
SELECT COUNT(*) FROM drivers WHERE women_preference_eligible = true;
-- Esperado: 0
```

## Rollback

```sql
DELETE FROM women_matching_consent_events
  WHERE action IN ('eligibility_declared', 'eligibility_revoked');

ALTER TABLE women_matching_consent_events
  DROP CONSTRAINT IF EXISTS women_matching_consent_events_action_check;
ALTER TABLE women_matching_consent_events
  ADD CONSTRAINT women_matching_consent_events_action_check
  CHECK (action IN ('opt_in','opt_out','default_preference_enabled','default_preference_disabled'));

ALTER TABLE passengers DROP CONSTRAINT IF EXISTS passengers_women_eligibility_source_check;
ALTER TABLE drivers DROP CONSTRAINT IF EXISTS drivers_women_eligibility_source_check;

ALTER TABLE passengers
  DROP COLUMN IF EXISTS women_preference_eligible,
  DROP COLUMN IF EXISTS women_preference_eligible_at,
  DROP COLUMN IF EXISTS women_preference_eligibility_source,
  DROP COLUMN IF EXISTS women_preference_eligibility_revoked_at;

ALTER TABLE drivers
  DROP COLUMN IF EXISTS women_preference_eligible,
  DROP COLUMN IF EXISTS women_preference_eligible_at,
  DROP COLUMN IF EXISTS women_preference_eligibility_source,
  DROP COLUMN IF EXISTS women_preference_eligibility_revoked_at;
```
