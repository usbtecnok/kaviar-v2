-- Migration: Add PostGIS geometry column to communities table
-- Date: 2026-01-08
-- Purpose: Add spatial geometry support for geofence operations

-- Add geometry column for MultiPolygon with SRID 4326 (WGS84)
ALTER TABLE communities 
ADD COLUMN geom geometry(MultiPolygon, 4326);

-- Create spatial index for performance
CREATE INDEX communities_geom_gist_idx ON communities USING GIST (geom);

-- Add comment for documentation
COMMENT ON COLUMN communities.geom IS 'PostGIS geometry column for spatial operations - MultiPolygon in WGS84 (SRID 4326)';
