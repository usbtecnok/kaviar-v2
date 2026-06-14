-- Moto Express Phase 1: Add vehicle_type to drivers
-- Backward-compatible: all existing drivers default to 'CAR'
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(20) NOT NULL DEFAULT 'CAR';
CREATE INDEX IF NOT EXISTS idx_drivers_vehicle_type ON drivers(vehicle_type);
