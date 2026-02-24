-- Migration: Driver Credits System
-- Date: 2026-02-23
-- Environment: STAGING ONLY (production forbidden until validation)

-- Credit balance table (one row per driver)
CREATE TABLE IF NOT EXISTS credit_balance (
  driver_id INTEGER PRIMARY KEY REFERENCES drivers(id) ON DELETE CASCADE,
  balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CHECK (balance >= 0)
);

-- Credit ledger table (immutable audit log)
CREATE TABLE IF NOT EXISTS driver_credit_ledger (
  id SERIAL PRIMARY KEY,
  driver_id INTEGER NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  delta DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  reason TEXT NOT NULL,
  admin_user_id INTEGER REFERENCES users(id),
  idempotency_key VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CHECK (delta != 0)
);

-- Indexes for performance
CREATE INDEX idx_credit_ledger_driver ON driver_credit_ledger(driver_id, created_at DESC);
CREATE INDEX idx_credit_ledger_idempotency ON driver_credit_ledger(idempotency_key) WHERE idempotency_key IS NOT NULL;
