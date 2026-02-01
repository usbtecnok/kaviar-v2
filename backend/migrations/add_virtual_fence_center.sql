-- Add virtual fence center fields to drivers table
ALTER TABLE drivers 
ADD COLUMN IF NOT EXISTS virtual_fence_center_lat DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS virtual_fence_center_lng DECIMAL(11, 8);

COMMENT ON COLUMN drivers.virtual_fence_center_lat IS 'Latitude do centro virtual para fallback 800m (quando não há geofence oficial)';
COMMENT ON COLUMN drivers.virtual_fence_center_lng IS 'Longitude do centro virtual para fallback 800m (quando não há geofence oficial)';
