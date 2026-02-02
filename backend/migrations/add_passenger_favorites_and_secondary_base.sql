-- Migration: Add passenger favorites and driver secondary base
-- Date: 2026-02-01

-- 1. Add secondary base fields to drivers table
ALTER TABLE drivers 
ADD COLUMN IF NOT EXISTS secondary_base_lat NUMERIC(10,8),
ADD COLUMN IF NOT EXISTS secondary_base_lng NUMERIC(11,8),
ADD COLUMN IF NOT EXISTS secondary_base_label VARCHAR(255),
ADD COLUMN IF NOT EXISTS secondary_base_enabled BOOLEAN DEFAULT false;

-- 2. Create passenger_favorite_locations table
CREATE TABLE IF NOT EXISTS passenger_favorite_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passenger_id TEXT NOT NULL REFERENCES passengers(id) ON DELETE CASCADE,
  label VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('HOME', 'WORK', 'OTHER')),
  lat NUMERIC(10,8) NOT NULL CHECK (lat >= -90 AND lat <= 90),
  lng NUMERIC(11,8) NOT NULL CHECK (lng >= -180 AND lng <= 180),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 3. Create index on passenger_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_passenger_favorite_locations_passenger_id 
ON passenger_favorite_locations(passenger_id);

-- 4. Add constraint: maximum 3 favorites per passenger
-- (enforced in application logic, not DB constraint)

-- 5. Comments for documentation
COMMENT ON TABLE passenger_favorite_locations IS 'Stores up to 3 favorite locations per passenger (HOME required, WORK and OTHER optional)';
COMMENT ON COLUMN passenger_favorite_locations.type IS 'Location type: HOME (required), WORK, or OTHER';
COMMENT ON COLUMN drivers.secondary_base_lat IS 'Optional secondary base latitude for improved territorial matching';
COMMENT ON COLUMN drivers.secondary_base_lng IS 'Optional secondary base longitude for improved territorial matching';
COMMENT ON COLUMN drivers.secondary_base_enabled IS 'Whether secondary base is active for matching algorithm';
