-- =====================================================================
-- Migration 011: women_driver_preference (Fase 1)
-- Preferência por Motorista Mulher — Estrutura e consentimento
--
-- Feature flag: WOMEN_DRIVER_PREFERENCE_ENABLED=false
-- Dispatch: NÃO alterado nesta fase.
-- Todos os defaults false/null — zero impacto operacional.
--
-- ROLLBACK (ordem obrigatória):
--   DROP TABLE IF EXISTS women_matching_consent_events;
--   ALTER TABLE passengers
--     DROP COLUMN IF EXISTS women_matching_opt_in,
--     DROP COLUMN IF EXISTS prefer_woman_driver_default,
--     DROP COLUMN IF EXISTS women_matching_opted_in_at,
--     DROP COLUMN IF EXISTS women_matching_opted_out_at,
--     DROP COLUMN IF EXISTS women_matching_consent_version;
--   ALTER TABLE drivers
--     DROP COLUMN IF EXISTS women_matching_opt_in,
--     DROP COLUMN IF EXISTS women_matching_opted_in_at,
--     DROP COLUMN IF EXISTS women_matching_opted_out_at,
--     DROP COLUMN IF EXISTS women_matching_consent_version;
--   ALTER TABLE rides_v2
--     DROP COLUMN IF EXISTS prefer_woman_driver;
-- =====================================================================

-- Passageira
ALTER TABLE passengers
  ADD COLUMN IF NOT EXISTS women_matching_opt_in BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS prefer_woman_driver_default BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS women_matching_opted_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS women_matching_opted_out_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS women_matching_consent_version TEXT;

-- Motorista
ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS women_matching_opt_in BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS women_matching_opted_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS women_matching_opted_out_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS women_matching_consent_version TEXT;

-- Corrida (apenas flag, dispatch não usa nesta fase)
ALTER TABLE rides_v2
  ADD COLUMN IF NOT EXISTS prefer_woman_driver BOOLEAN NOT NULL DEFAULT false;

-- Histórico de consentimento
CREATE TABLE IF NOT EXISTS women_matching_consent_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type TEXT NOT NULL
    CHECK (actor_type IN ('passenger', 'driver')),
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL
    CHECK (action IN ('opt_in', 'opt_out', 'default_preference_enabled', 'default_preference_disabled')),
  consent_version TEXT,
  source TEXT NOT NULL DEFAULT 'api',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wm_consent_actor
  ON women_matching_consent_events (actor_type, actor_id, created_at DESC);
