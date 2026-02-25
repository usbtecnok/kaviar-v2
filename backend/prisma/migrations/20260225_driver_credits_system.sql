-- Migration: Driver Credits System
-- Created: 2026-02-25
-- Description: Creates tables for driver credit balance and ledger

-- Table: credit_balance
-- Stores current credit balance for each driver
CREATE TABLE IF NOT EXISTS credit_balance (
    driver_id TEXT PRIMARY KEY,
    balance DECIMAL(10, 2) NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: driver_credit_ledger
-- Stores all credit transactions (audit log)
CREATE TABLE IF NOT EXISTS driver_credit_ledger (
    id SERIAL PRIMARY KEY,
    driver_id TEXT NOT NULL,
    delta DECIMAL(10, 2) NOT NULL,
    balance_after DECIMAL(10, 2) NOT NULL,
    reason TEXT NOT NULL,
    admin_user_id TEXT NOT NULL,
    idempotency_key TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_credit_ledger_driver_id ON driver_credit_ledger(driver_id);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_created_at ON driver_credit_ledger(created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_ledger_idempotency ON driver_credit_ledger(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Comments
COMMENT ON TABLE credit_balance IS 'Current credit balance for each driver';
COMMENT ON TABLE driver_credit_ledger IS 'Audit log of all credit transactions';
