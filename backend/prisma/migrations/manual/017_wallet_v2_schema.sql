-- Migration 017: Wallet V2 Schema
-- Cria estrutura para modelo financeiro de taxa unica 18% com wallet em reais.
-- Nao altera tabelas existentes. Nao ativa fluxo. Apenas estrutura.

BEGIN;

-- 1. Wallet do motorista
CREATE TABLE driver_wallets (
  driver_id      TEXT PRIMARY KEY REFERENCES drivers(id),
  balance_cents  BIGINT NOT NULL DEFAULT 0 CHECK (balance_cents >= 0),
  reserved_cents BIGINT NOT NULL DEFAULT 0 CHECK (reserved_cents >= 0),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (reserved_cents <= balance_cents)
);

-- 2. Ledger da wallet (imutavel, append-only)
CREATE TABLE wallet_ledger (
  id                   BIGSERIAL PRIMARY KEY,
  driver_id            TEXT NOT NULL REFERENCES drivers(id),
  entry_type           TEXT NOT NULL,
  balance_delta_cents  BIGINT NOT NULL DEFAULT 0,
  reserved_delta_cents BIGINT NOT NULL DEFAULT 0,
  balance_after_cents  BIGINT NOT NULL,
  reserved_after_cents BIGINT NOT NULL,
  reference_type       TEXT,
  reference_id         TEXT,
  actor_type           TEXT,
  actor_id             TEXT,
  reason               TEXT NOT NULL,
  metadata             JSONB,
  idempotency_key      TEXT NOT NULL UNIQUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_wallet_ledger_driver ON wallet_ledger(driver_id, created_at DESC);
CREATE INDEX idx_wallet_ledger_ref ON wallet_ledger(reference_type, reference_id);

-- 3. Recargas via Pix
CREATE TABLE wallet_recharges (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id         TEXT NOT NULL REFERENCES drivers(id),
  package_id        TEXT,
  amount_cents      BIGINT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'expired', 'refunded')),
  payment_provider  TEXT NOT NULL DEFAULT 'asaas',
  external_id       TEXT,
  pix_qr_code       TEXT,
  pix_copy_paste    TEXT,
  pix_expires_at    TIMESTAMPTZ,
  confirmed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (payment_provider, external_id)
);
CREATE INDEX idx_wallet_recharges_driver ON wallet_recharges(driver_id, created_at DESC);
CREATE INDEX idx_wallet_recharges_pending ON wallet_recharges(status) WHERE status = 'pending';

-- 4. Pacotes de recarga
CREATE TABLE recharge_packages (
  id           TEXT PRIMARY KEY,
  label        TEXT NOT NULL,
  amount_cents BIGINT NOT NULL,
  sort_order   INT NOT NULL DEFAULT 0,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO recharge_packages (id, label, amount_cents, sort_order, is_active, created_at) VALUES
  ('saldo-20', 'R$ 20', 2000, 1, true, NOW()),
  ('saldo-50', 'R$ 50', 5000, 2, true, NOW()),
  ('saldo-100', 'R$ 100', 10000, 3, true, NOW());

-- 5. Debitos pendentes
CREATE TABLE pending_debits (
  id                    BIGSERIAL PRIMARY KEY,
  ride_id               TEXT NOT NULL UNIQUE,
  driver_id             TEXT NOT NULL REFERENCES drivers(id),
  final_price_cents     BIGINT NOT NULL,
  fee_percent_snapshot  DECIMAL(5,2) NOT NULL DEFAULT 18.00,
  fee_amount_cents      BIGINT NOT NULL,
  fee_collected_cents   BIGINT NOT NULL DEFAULT 0,
  fee_pending_cents     BIGINT NOT NULL,
  reserved_amount_cents BIGINT NOT NULL DEFAULT 0,
  reason                TEXT NOT NULL DEFAULT 'platform_fee',
  attempts              INT NOT NULL DEFAULT 0,
  last_error            TEXT,
  status                TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'resolved', 'failed', 'waived')),
  idempotency_key       TEXT UNIQUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at           TIMESTAMPTZ,
  CHECK (fee_collected_cents + fee_pending_cents = fee_amount_cents)
);
CREATE INDEX idx_pending_debits_driver ON pending_debits(driver_id, status);
CREATE INDEX idx_pending_debits_pending ON pending_debits(status) WHERE status = 'pending';

-- 6. Fee splits por corrida
CREATE TABLE ride_fee_splits (
  id                    BIGSERIAL PRIMARY KEY,
  ride_id               TEXT NOT NULL UNIQUE,
  driver_id             TEXT NOT NULL,
  final_price_cents     BIGINT NOT NULL,
  fee_percent           DECIMAL(5,2) NOT NULL DEFAULT 18.00,
  fee_amount_cents      BIGINT NOT NULL,
  fee_collected_cents   BIGINT NOT NULL DEFAULT 0,
  fee_pending_cents     BIGINT NOT NULL DEFAULT 0,
  matrix_share_percent  DECIMAL(5,2) NOT NULL DEFAULT 60.00,
  matrix_share_cents    BIGINT NOT NULL,
  manager_share_percent DECIMAL(5,2) NOT NULL DEFAULT 40.00,
  manager_share_cents   BIGINT NOT NULL,
  territory_id          TEXT,
  manager_id            TEXT,
  reference_month       TEXT NOT NULL,
  collection_status     TEXT NOT NULL DEFAULT 'collected'
    CHECK (collection_status IN ('collected', 'pending')),
  idempotency_key       TEXT UNIQUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (fee_collected_cents + fee_pending_cents = fee_amount_cents)
);
CREATE INDEX idx_fee_splits_territory_month ON ride_fee_splits(territory_id, reference_month);
CREATE INDEX idx_fee_splits_pending ON ride_fee_splits(collection_status) WHERE collection_status = 'pending';

-- 7. Referral rewards
CREATE TABLE driver_referral_rewards (
  id                  BIGSERIAL PRIMARY KEY,
  driver_id           TEXT NOT NULL UNIQUE REFERENCES drivers(id),
  referrer_id         TEXT NOT NULL,
  referrer_type       TEXT NOT NULL,
  first_valid_ride_id TEXT NOT NULL,
  total_reward_cents  BIGINT NOT NULL DEFAULT 2000,
  matrix_cost_cents   BIGINT NOT NULL DEFAULT 1000,
  manager_cost_cents  BIGINT NOT NULL DEFAULT 1000,
  territory_id        TEXT,
  manager_id          TEXT,
  status              TEXT NOT NULL DEFAULT 'eligible'
    CHECK (status IN ('eligible', 'approved', 'paid', 'rejected', 'waived')),
  approved_at         TIMESTAMPTZ,
  idempotency_key     TEXT UNIQUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE referral_reward_payouts (
  id                 BIGSERIAL PRIMARY KEY,
  reward_id          BIGINT NOT NULL REFERENCES driver_referral_rewards(id),
  referrer_type      TEXT NOT NULL,
  referrer_id        TEXT NOT NULL,
  amount_cents       BIGINT NOT NULL DEFAULT 2000,
  matrix_cost_cents  BIGINT NOT NULL DEFAULT 1000,
  manager_cost_cents BIGINT NOT NULL DEFAULT 1000,
  territory_id       TEXT,
  manager_id         TEXT,
  status             TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  payment_method     TEXT,
  paid_at            TIMESTAMPTZ,
  idempotency_key    TEXT UNIQUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Ledger territorial
CREATE TABLE territory_ledger (
  id               BIGSERIAL PRIMARY KEY,
  territory_id     TEXT NOT NULL,
  manager_id       TEXT,
  reference_month  TEXT NOT NULL,
  entry_type       TEXT NOT NULL,
  amount_cents     BIGINT NOT NULL,
  description      TEXT,
  reference_type   TEXT,
  reference_id     TEXT,
  idempotency_key  TEXT UNIQUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_territory_ledger_month ON territory_ledger(territory_id, reference_month);
CREATE INDEX idx_territory_ledger_type ON territory_ledger(entry_type, reference_month);

COMMIT;
