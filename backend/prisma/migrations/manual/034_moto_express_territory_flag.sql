-- Moto Express Phase 1: Add moto_express_enabled to operational_territories
-- Backward-compatible: all existing territories default to false (moto disabled)
ALTER TABLE operational_territories ADD COLUMN IF NOT EXISTS moto_express_enabled BOOLEAN NOT NULL DEFAULT false;

-- Feature flag global (disabled by default)
INSERT INTO feature_flags (key, enabled, rollout_percentage, created_at, updated_at)
VALUES ('ENABLE_MOTO_EXPRESS', false, 0, NOW(), NOW())
ON CONFLICT (key) DO NOTHING;
