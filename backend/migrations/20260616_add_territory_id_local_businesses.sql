-- Add territory_id to local_businesses (nullable, no data loss)
ALTER TABLE local_businesses ADD COLUMN IF NOT EXISTS territory_id UUID;
CREATE INDEX IF NOT EXISTS idx_local_businesses_territory ON local_businesses (territory_id, is_active);
