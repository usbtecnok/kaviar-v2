-- Moto Passenger Phase 1: feature flag + territory-level control
-- Backward-compatible: all territories default to false (moto passenger disabled)

ALTER TABLE operational_territories ADD COLUMN IF NOT EXISTS moto_passenger_enabled BOOLEAN NOT NULL DEFAULT false;

INSERT INTO feature_flags (key, enabled, rollout_percentage, created_at, updated_at)
VALUES ('ENABLE_MOTO_PASSENGER', false, 0, NOW(), NOW())
ON CONFLICT (key) DO NOTHING;
