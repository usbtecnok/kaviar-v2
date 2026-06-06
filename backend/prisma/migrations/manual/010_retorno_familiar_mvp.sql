-- =====================================================================
-- Migration 010: Retorno Familiar KAVIAR MVP
--
-- Cria tabelas para o programa voluntário de retorno familiar.
-- Não altera: credit_balance, driver_credit_ledger, driver_credit_purchases,
--             rides_v2, ride_settlements, pricing_profiles, territory_price_floors.
--
-- ROLLBACK:
--   DROP TABLE IF EXISTS retorno_familiar_requests;
--   DROP TABLE IF EXISTS retorno_familiar_policy;
-- =====================================================================

CREATE TABLE IF NOT EXISTS retorno_familiar_policy (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year                 INT NOT NULL UNIQUE,
  percent_rate         DECIMAL(5,2) NOT NULL,
  max_per_driver_cents INT,
  fund_budget_cents    INT,
  request_start        DATE NOT NULL,
  request_end          DATE NOT NULL,
  payment_deadline     DATE,
  is_active            BOOLEAN NOT NULL DEFAULT false,
  notes                TEXT,
  created_by           TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS retorno_familiar_requests (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id               TEXT NOT NULL REFERENCES drivers(id),
  policy_id               UUID NOT NULL REFERENCES retorno_familiar_policy(id),
  year                    INT NOT NULL,

  total_paid_cents        INT NOT NULL,
  total_purchases         INT NOT NULL,
  calculated_return_cents INT NOT NULL,

  status                  TEXT NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested','in_review','approved','rejected','paid','canceled')),

  approved_amount_cents   INT,
  reviewed_by             TEXT,
  reviewed_at             TIMESTAMPTZ,
  review_reason           TEXT,

  paid_at                 TIMESTAMPTZ,
  paid_method             TEXT,
  paid_reference          TEXT,
  paid_by                 TEXT,

  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(driver_id, year)
);

CREATE INDEX IF NOT EXISTS idx_rfr_status ON retorno_familiar_requests(status);
CREATE INDEX IF NOT EXISTS idx_rfr_year ON retorno_familiar_requests(year);
CREATE INDEX IF NOT EXISTS idx_rfr_policy ON retorno_familiar_requests(policy_id);
CREATE INDEX IF NOT EXISTS idx_rfr_driver ON retorno_familiar_requests(driver_id);
