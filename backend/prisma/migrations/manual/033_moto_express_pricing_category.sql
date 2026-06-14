-- Moto Express Phase 1: Add vehicle_category to pricing_profiles
-- Backward-compatible: all existing profiles default to 'CAR'
ALTER TABLE pricing_profiles ADD COLUMN IF NOT EXISTS vehicle_category VARCHAR(20) NOT NULL DEFAULT 'CAR';
