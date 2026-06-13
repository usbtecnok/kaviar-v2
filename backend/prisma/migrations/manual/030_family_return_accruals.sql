-- Family Return Accruals: 10% das recargas acumulado (NÃO é saldo disponível)
CREATE TABLE IF NOT EXISTS family_return_accruals (
  id BIGSERIAL PRIMARY KEY,
  driver_id TEXT NOT NULL,
  recharge_id UUID NOT NULL,
  source_amount_cents BIGINT NOT NULL,
  accrued_amount_cents BIGINT NOT NULL,
  percent DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  status TEXT NOT NULL DEFAULT 'accrued',
  idempotency_key TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_family_return_accruals_driver ON family_return_accruals(driver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_family_return_accruals_status ON family_return_accruals(status);
