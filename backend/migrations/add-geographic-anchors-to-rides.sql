-- Migration: Add geographic anchors to rides table
-- Date: 2026-01-12

-- Step 1: Add new columns
ALTER TABLE rides 
ADD COLUMN neighborhood_id VARCHAR,
ADD COLUMN community_id VARCHAR;

-- Step 2: Add foreign key constraints
ALTER TABLE rides 
ADD CONSTRAINT fk_rides_neighborhood 
FOREIGN KEY (neighborhood_id) REFERENCES neighborhoods(id);

ALTER TABLE rides 
ADD CONSTRAINT fk_rides_community 
FOREIGN KEY (community_id) REFERENCES communities(id);

-- Step 3: Create indexes for performance
CREATE INDEX idx_rides_neighborhood 
ON rides(neighborhood_id);

CREATE INDEX idx_rides_community 
ON rides(community_id);

CREATE INDEX idx_rides_neighborhood_community 
ON rides(neighborhood_id, community_id);

-- Step 4: Add constraint to ensure neighborhood_id is required for new rides
-- (Existing rides without neighborhood_id will remain valid for historical data)
-- New application logic will enforce this at the service level

-- Note: This migration adds immutable geographic anchors to rides
-- neighborhood_id: OBRIGATÓRIO - âncora territorial
-- community_id: OPCIONAL - modificador operacional
-- Both fields are set once at creation and never updated
