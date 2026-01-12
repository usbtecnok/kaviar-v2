-- Migration: Refactor communities to logical entity model
-- Date: 2026-01-12

-- Step 1: Add new columns
ALTER TABLE communities 
ADD COLUMN neighborhood_id VARCHAR,
ADD COLUMN operational_profile VARCHAR DEFAULT 'NORMAL',
ADD COLUMN notes TEXT;

-- Step 2: Remove old geographic columns (keeping data safe)
ALTER TABLE communities 
DROP COLUMN IF EXISTS description,
DROP COLUMN IF EXISTS center_lat,
DROP COLUMN IF EXISTS center_lng,
DROP COLUMN IF EXISTS radius_meters,
DROP COLUMN IF EXISTS geofence,
DROP COLUMN IF EXISTS min_active_drivers,
DROP COLUMN IF EXISTS deactivation_threshold,
DROP COLUMN IF EXISTS auto_activation,
DROP COLUMN IF EXISTS last_evaluated_at;

-- Step 3: Add foreign key constraint
ALTER TABLE communities 
ADD CONSTRAINT fk_communities_neighborhood 
FOREIGN KEY (neighborhood_id) REFERENCES neighborhoods(id);

-- Step 4: Create index for performance
CREATE INDEX idx_communities_neighborhood_active 
ON communities(neighborhood_id, is_active);

-- Step 5: Archive Jabour (already done, but ensuring)
UPDATE communities 
SET is_active = false 
WHERE name ILIKE '%jabour%';

-- Note: This migration removes geographic functionality from communities
-- All location resolution now happens via neighborhoods only
-- Communities are purely logical entities that modify operational behavior
