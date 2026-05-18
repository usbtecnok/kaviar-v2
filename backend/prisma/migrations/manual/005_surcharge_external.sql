-- Add surcharge_external column to pricing_profiles
-- Applied when route_territory = 'external' (Área 2)
-- Default 0 = no change to existing behavior

ALTER TABLE pricing_profiles
  ADD COLUMN IF NOT EXISTS surcharge_external DECIMAL(8,2) NOT NULL DEFAULT 0;
