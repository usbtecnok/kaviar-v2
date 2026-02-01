-- Migration: Beta Monitor Checkpoints System
-- Date: 2026-02-01
-- Purpose: Persistent monitoring for feature flag rollouts

-- 1. Create beta_monitor_checkpoints table
CREATE TABLE IF NOT EXISTS beta_monitor_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key TEXT NOT NULL,
  phase TEXT NOT NULL,
  checkpoint_label TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  status TEXT NOT NULL CHECK (status IN ('PASS', 'WARN', 'FAIL')),
  metrics_json JSONB,
  config_json JSONB,
  determinism_json JSONB,
  alerts_json JSONB,
  notes TEXT
);

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS idx_beta_monitor_feature_created 
  ON beta_monitor_checkpoints(feature_key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_beta_monitor_phase_created 
  ON beta_monitor_checkpoints(phase, created_at DESC);

-- 3. Comments
COMMENT ON TABLE beta_monitor_checkpoints IS 'Automated monitoring checkpoints for feature flag rollouts';
COMMENT ON COLUMN beta_monitor_checkpoints.metrics_json IS 'HTTP status breakdown, error rates, request counts';
COMMENT ON COLUMN beta_monitor_checkpoints.config_json IS 'Feature flag config snapshot (enabled, rollout, allowlist count)';
COMMENT ON COLUMN beta_monitor_checkpoints.determinism_json IS 'Determinism test results for beta passengers';
COMMENT ON COLUMN beta_monitor_checkpoints.alerts_json IS 'Rollback triggers and warnings detected';
