-- Migration: Feature Flags System for Rollout Control
-- Date: 2026-02-01

-- 1. Create feature_flags table
CREATE TABLE IF NOT EXISTS feature_flags (
  key VARCHAR(100) PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false,
  rollout_percentage INTEGER NOT NULL DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  updated_by_admin_id TEXT,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 2. Create feature_flag_allowlist table
CREATE TABLE IF NOT EXISTS feature_flag_allowlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) NOT NULL,
  passenger_id TEXT NOT NULL,
  created_by_admin_id TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(key, passenger_id)
);

-- 3. Create index on allowlist
CREATE INDEX IF NOT EXISTS idx_feature_flag_allowlist_key_passenger 
ON feature_flag_allowlist(key, passenger_id);

-- 4. Insert default feature flag for passenger favorites matching
INSERT INTO feature_flags (key, enabled, rollout_percentage)
VALUES ('passenger_favorites_matching', false, 0)
ON CONFLICT (key) DO NOTHING;

-- 5. Comments for documentation
COMMENT ON TABLE feature_flags IS 'Feature flags for gradual rollout control';
COMMENT ON TABLE feature_flag_allowlist IS 'Allowlist of passengers for beta testing features';
COMMENT ON COLUMN feature_flags.rollout_percentage IS 'Percentage (0-100) for deterministic rollout based on passenger_id hash';
