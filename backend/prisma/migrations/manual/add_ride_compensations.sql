-- Compensação por Deslocamento — ride_compensations
-- Idempotente: IF NOT EXISTS em tudo

CREATE TABLE IF NOT EXISTS ride_compensations (
  id                 TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id            TEXT NOT NULL UNIQUE,
  driver_id          TEXT NOT NULL,
  passenger_id       TEXT NOT NULL,
  amount_cents       INT NOT NULL DEFAULT 500,
  credits_amount     INT NOT NULL DEFAULT 1,
  status             TEXT NOT NULL DEFAULT 'pending',
  external_reference TEXT UNIQUE,
  asaas_payment_id   TEXT UNIQUE,
  pix_qr_code        TEXT,
  pix_copy_paste     TEXT,
  pix_expires_at     TIMESTAMPTZ,
  invoice_url        TEXT,
  paid_at            TIMESTAMPTZ,
  waived_at          TIMESTAMPTZ,
  waived_by          TEXT,
  waived_reason      TEXT,
  notes              TEXT,
  created_by         TEXT NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ride_compensations_status ON ride_compensations(status);
CREATE INDEX IF NOT EXISTS idx_ride_compensations_driver ON ride_compensations(driver_id);
