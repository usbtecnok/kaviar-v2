-- =====================================================================
-- Migration 015: Shadow Mode Foundation
--
-- Creates ONLY the 3 tables needed for Phase 1 shadow calculations:
--   1. platform_fee_configs — global fee rate with approval workflow
--   2. territory_manager_assignments — financial mandate per territory
--   3. wallet_shadow_results — shadow calculation outputs (isolated)
--
-- Does NOT create wallet, ledger, reservation, recharge, referral,
-- payout, or any real financial table. Those belong to future phases.
-- Does NOT alter rides_v2, pricing_profiles, or any existing table.
--
-- ROLLBACK:
--   DROP TABLE IF EXISTS wallet_shadow_results;
--   DROP TABLE IF EXISTS territory_manager_assignments;
--   DROP TABLE IF EXISTS platform_fee_configs;
-- =====================================================================

-- ═══ platform_fee_configs ═══
CREATE TABLE platform_fee_configs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_fee_percent  DECIMAL(5,2) NOT NULL
    CHECK (platform_fee_percent > 0 AND platform_fee_percent <= 50),
  effective_from        TIMESTAMPTZ NOT NULL,
  effective_to          TIMESTAMPTZ,
  approval_status       TEXT NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'approved', 'rejected', 'superseded')),
  change_reason         TEXT NOT NULL,
  created_by            TEXT NOT NULL REFERENCES admins(id) ON DELETE RESTRICT,
  approved_by           TEXT REFERENCES admins(id) ON DELETE RESTRICT,
  approved_at           TIMESTAMPTZ,
  rejected_reason       TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_pfc_open_ended
  ON platform_fee_configs(approval_status)
  WHERE approval_status = 'approved' AND effective_to IS NULL;

-- ═══ territory_manager_assignments ═══
CREATE TABLE territory_manager_assignments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  territory_id        TEXT NOT NULL REFERENCES operational_territories(id) ON DELETE RESTRICT,
  admin_id            TEXT NOT NULL REFERENCES admins(id) ON DELETE RESTRICT,
  operator_profile_id TEXT REFERENCES operator_profiles(id) ON DELETE RESTRICT,
  status              TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'terminated', 'pending_approval')),
  started_at          TIMESTAMPTZ NOT NULL,
  ended_at            TIMESTAMPTZ,
  end_reason          TEXT,
  created_by          TEXT NOT NULL REFERENCES admins(id) ON DELETE RESTRICT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_tma_active_territory
  ON territory_manager_assignments(territory_id)
  WHERE status = 'active';

CREATE INDEX idx_tma_admin ON territory_manager_assignments(admin_id);
CREATE INDEX idx_tma_territory ON territory_manager_assignments(territory_id);

-- ═══ wallet_shadow_results ═══
CREATE TABLE wallet_shadow_results (
  id                          BIGSERIAL PRIMARY KEY,
  ride_id                     TEXT NOT NULL REFERENCES rides_v2(id) ON DELETE RESTRICT,
  driver_id                   TEXT NOT NULL REFERENCES drivers(id) ON DELETE RESTRICT,
  calculation_version         INT NOT NULL DEFAULT 1,
  calculation_status          TEXT NOT NULL DEFAULT 'success'
    CHECK (calculation_status IN ('success', 'error')),
  final_price_cents           INT CHECK (final_price_cents >= 0),
  wait_charge_cents           INT CHECK (wait_charge_cents >= 0),
  fee_config_id               UUID REFERENCES platform_fee_configs(id) ON DELETE RESTRICT,
  fee_percent                 DECIMAL(5,2) CHECK (fee_percent >= 0),
  fee_amount_cents            INT CHECK (fee_amount_cents >= 0),
  matrix_share_percent        DECIMAL(5,2) CHECK (matrix_share_percent >= 0),
  matrix_share_cents          INT CHECK (matrix_share_cents >= 0),
  manager_share_percent       DECIMAL(5,2) CHECK (manager_share_percent >= 0),
  manager_share_cents         INT CHECK (manager_share_cents >= 0),
  driver_earnings_cents       INT CHECK (driver_earnings_cents >= 0),
  territory_id                TEXT REFERENCES operational_territories(id) ON DELETE RESTRICT,
  assignment_id               UUID REFERENCES territory_manager_assignments(id) ON DELETE RESTRICT,
  assignment_status           TEXT CHECK (assignment_status IS NULL OR assignment_status IN ('active', 'suspended', 'terminated')),
  allocation_reason           TEXT CHECK (allocation_reason IS NULL OR allocation_reason IN ('standard', 'no_manager', 'manager_suspended')),
  legacy_credit_cost          INT,
  legacy_nominal_value_cents  INT CHECK (legacy_nominal_value_cents >= 0),
  divergence_cents            INT,
  reference_month             DATE,
  error_code                  TEXT,
  error_message               TEXT,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(ride_id, calculation_version),
  CONSTRAINT chk_shares_sum CHECK (
    calculation_status = 'error'
    OR (matrix_share_cents + manager_share_cents = fee_amount_cents)
  )
);

CREATE INDEX idx_wsr_month ON wallet_shadow_results(reference_month) WHERE calculation_status = 'success';
CREATE INDEX idx_wsr_driver ON wallet_shadow_results(driver_id);
CREATE INDEX idx_wsr_status ON wallet_shadow_results(calculation_status);
