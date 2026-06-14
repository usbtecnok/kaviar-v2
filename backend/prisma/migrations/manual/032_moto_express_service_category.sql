-- Moto Express Phase 1: Add service_category to rides_v2
-- Backward-compatible: all existing rides default to 'CAR_NORMAL'
ALTER TABLE rides_v2 ADD COLUMN IF NOT EXISTS service_category VARCHAR(30) NOT NULL DEFAULT 'CAR_NORMAL';
CREATE INDEX IF NOT EXISTS idx_rides_v2_service_category ON rides_v2(service_category);
