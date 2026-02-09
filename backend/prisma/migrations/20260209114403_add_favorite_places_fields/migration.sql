-- Add new fields to passenger_favorite_locations
ALTER TABLE passenger_favorite_locations 
  ADD COLUMN IF NOT EXISTS address_text TEXT,
  ADD COLUMN IF NOT EXISTS place_source TEXT NOT NULL DEFAULT 'manual';

-- Add unique constraint to enforce 1 HOME, 1 WORK, 1 OTHER per passenger
-- Drop existing index if needed and create unique constraint
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'passenger_favorite_locations_passenger_id_type_key'
  ) THEN
    CREATE UNIQUE INDEX passenger_favorite_locations_passenger_id_type_key 
      ON passenger_favorite_locations(passenger_id, type);
  END IF;
END $$;

-- Add check constraint for valid types (optional, can be enforced in app)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'passenger_favorite_locations_type_check'
  ) THEN
    ALTER TABLE passenger_favorite_locations 
      ADD CONSTRAINT passenger_favorite_locations_type_check 
      CHECK (type IN ('HOME', 'WORK', 'OTHER'));
  END IF;
END $$;
