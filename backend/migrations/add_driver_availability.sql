-- Add available field to drivers
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS available BOOLEAN DEFAULT true;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS available_updated_at TIMESTAMP;

-- Index for quick filtering
CREATE INDEX IF NOT EXISTS idx_drivers_available ON drivers(available) WHERE available = true;
