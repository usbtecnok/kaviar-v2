-- Migration: Add vehicle_color column to drivers table
-- Date: 2026-01-18
-- Purpose: Separate vehicle color from model for better passenger identification

-- Add vehicle_color column (nullable, not required for initial registration)
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS vehicle_color TEXT;

-- Add comment for documentation
COMMENT ON COLUMN drivers.vehicle_color IS 'Vehicle color - required for driver approval but not for initial registration';
