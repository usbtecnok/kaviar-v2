-- Moto Passenger Phase 1: Add service_category to pricing_profiles
-- Allows separate pricing for CAR_NORMAL, MOTO_DELIVERY, MOTO_PASSENGER
-- Backward-compatible: all existing profiles default to 'CAR_NORMAL'
ALTER TABLE pricing_profiles ADD COLUMN IF NOT EXISTS service_category VARCHAR(30) NOT NULL DEFAULT 'CAR_NORMAL';
