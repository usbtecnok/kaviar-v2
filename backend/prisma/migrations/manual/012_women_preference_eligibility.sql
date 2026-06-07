-- =====================================================================
-- Migration 012: women_preference_eligibility (Fase 3A)
-- Elegibilidade separada para o programa Preferência por Motorista Mulher
--
-- Feature flag: WOMEN_DRIVER_PREFERENCE_ENABLED permanece false
-- Dispatch: NÃO alterado.
-- Nenhum usuário se torna elegível automaticamente.
--
-- Riscos:
--   - ALTER TABLE ADD COLUMN com DEFAULT: lock curto (~segundos)
--   - Volume atual: ~150 passengers, ~10 drivers
--   - Sem UPDATE automático — zero conversões
--
-- ROLLBACK (ordem obrigatória):
--   -- Pré-condição: apagar eventos novos se existirem
--   DELETE FROM women_matching_consent_events
--     WHERE action IN ('eligibility_declared', 'eligibility_revoked');
--
--   ALTER TABLE women_matching_consent_events
--     DROP CONSTRAINT IF EXISTS women_matching_consent_events_action_check;
--   ALTER TABLE women_matching_consent_events
--     ADD CONSTRAINT women_matching_consent_events_action_check
--     CHECK (action IN ('opt_in','opt_out','default_preference_enabled','default_preference_disabled'));
--
--   ALTER TABLE passengers DROP CONSTRAINT IF EXISTS passengers_women_eligibility_source_check;
--   ALTER TABLE drivers DROP CONSTRAINT IF EXISTS drivers_women_eligibility_source_check;
--
--   ALTER TABLE passengers
--     DROP COLUMN IF EXISTS women_preference_eligible,
--     DROP COLUMN IF EXISTS women_preference_eligible_at,
--     DROP COLUMN IF EXISTS women_preference_eligibility_source,
--     DROP COLUMN IF EXISTS women_preference_eligibility_revoked_at;
--   ALTER TABLE drivers
--     DROP COLUMN IF EXISTS women_preference_eligible,
--     DROP COLUMN IF EXISTS women_preference_eligible_at,
--     DROP COLUMN IF EXISTS women_preference_eligibility_source,
--     DROP COLUMN IF EXISTS women_preference_eligibility_revoked_at;
-- =====================================================================

-- 1. Elegibilidade: passengers
ALTER TABLE passengers
  ADD COLUMN IF NOT EXISTS women_preference_eligible BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS women_preference_eligible_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS women_preference_eligibility_source TEXT,
  ADD COLUMN IF NOT EXISTS women_preference_eligibility_revoked_at TIMESTAMPTZ;

-- 2. Elegibilidade: drivers
ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS women_preference_eligible BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS women_preference_eligible_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS women_preference_eligibility_source TEXT,
  ADD COLUMN IF NOT EXISTS women_preference_eligibility_revoked_at TIMESTAMPTZ;

-- 3. Constraints de source (idempotente)
ALTER TABLE passengers
  DROP CONSTRAINT IF EXISTS passengers_women_eligibility_source_check;
ALTER TABLE passengers
  ADD CONSTRAINT passengers_women_eligibility_source_check
  CHECK (women_preference_eligibility_source IS NULL OR women_preference_eligibility_source = 'self_attestation');

ALTER TABLE drivers
  DROP CONSTRAINT IF EXISTS drivers_women_eligibility_source_check;
ALTER TABLE drivers
  ADD CONSTRAINT drivers_women_eligibility_source_check
  CHECK (women_preference_eligibility_source IS NULL OR women_preference_eligibility_source = 'self_attestation');

-- 4. Atualizar constraint de action nos eventos (idempotente)
ALTER TABLE women_matching_consent_events
  DROP CONSTRAINT IF EXISTS women_matching_consent_events_action_check;
ALTER TABLE women_matching_consent_events
  ADD CONSTRAINT women_matching_consent_events_action_check
  CHECK (action IN (
    'opt_in',
    'opt_out',
    'default_preference_enabled',
    'default_preference_disabled',
    'eligibility_declared',
    'eligibility_revoked'
  ));
