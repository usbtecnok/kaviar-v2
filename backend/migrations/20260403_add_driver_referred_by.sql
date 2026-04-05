-- Migration: Add referred_by to drivers + referral audit log
-- Date: 2026-04-03
-- Purpose: Track who referred each driver (consultant link)

ALTER TABLE drivers ADD COLUMN IF NOT EXISTS referred_by TEXT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS referred_at TIMESTAMP;

-- Referral audit: immutable log of when referral was set
CREATE TABLE IF NOT EXISTS driver_referral_log (
  id SERIAL PRIMARY KEY,
  driver_id TEXT NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  referred_by TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'first_credit_purchase',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_referral_log_driver ON driver_referral_log(driver_id);
CREATE INDEX IF NOT EXISTS idx_referral_log_referred_by ON driver_referral_log(referred_by);
