-- Migration: Community Geofence PostGIS Geometry
-- Date: 2026-02-10
-- Purpose: Migrate community_geofences from String geojson to native PostGIS geometry
-- Anti-Frankenstein: Unify spatial resolution with indexed geometry column

-- ============================================
-- 1. ADD GEOMETRY COLUMN
-- ============================================

ALTER TABLE community_geofences
ADD COLUMN IF NOT EXISTS geom geometry(MultiPolygon, 4326);

COMMENT ON COLUMN community_geofences.geom IS 'PostGIS native geometry - MultiPolygon SRID 4326 (WGS84)';

-- ============================================
-- 2. POPULATE FROM GEOJSON
-- ============================================

UPDATE community_geofences
SET geom = ST_SetSRID(ST_GeomFromGeoJSON(geojson), 4326)
WHERE geojson IS NOT NULL
  AND geom IS NULL;

-- ============================================
-- 3. FIX AND NORMALIZE GEOMETRIES
-- ============================================

-- Make invalid geometries valid
UPDATE community_geofences
SET geom = ST_MakeValid(geom)
WHERE geom IS NOT NULL 
  AND NOT ST_IsValid(geom);

-- Ensure all geometries are MultiPolygon
UPDATE community_geofences
SET geom = ST_Multi(geom)
WHERE geom IS NOT NULL 
  AND ST_GeometryType(geom) = 'ST_Polygon';

-- ============================================
-- 4. CREATE SPATIAL INDEX (GIST)
-- ============================================

CREATE INDEX IF NOT EXISTS community_geofences_geom_gist
ON community_geofences
USING GIST (geom);

-- ============================================
-- 5. ENFORCE TYPE AND SRID
-- ============================================

ALTER TABLE community_geofences
ALTER COLUMN geom TYPE geometry(MultiPolygon, 4326)
USING ST_SetSRID(ST_Multi(COALESCE(geom, ST_GeomFromGeoJSON(geojson))), 4326);

-- ============================================
-- 6. VALIDATION QUERIES
-- ============================================

-- Check all geometries are valid
DO $$
DECLARE
  invalid_count INTEGER;
  total_count INTEGER;
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count FROM community_geofences;
  SELECT COUNT(*) INTO null_count FROM community_geofences WHERE geom IS NULL;
  SELECT COUNT(*) INTO invalid_count FROM community_geofences WHERE geom IS NOT NULL AND NOT ST_IsValid(geom);
  
  RAISE NOTICE '✅ Migration complete:';
  RAISE NOTICE '   Total communities: %', total_count;
  RAISE NOTICE '   With geometry: %', total_count - null_count;
  RAISE NOTICE '   NULL geometry: %', null_count;
  RAISE NOTICE '   Invalid geometry: %', invalid_count;
  
  IF invalid_count > 0 THEN
    RAISE WARNING '⚠️  Found % invalid geometries - manual review required', invalid_count;
  END IF;
END $$;

-- Verify SRID
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN ST_SRID(geom) = 4326 THEN 1 END) as srid_4326,
  COUNT(CASE WHEN ST_SRID(geom) != 4326 THEN 1 END) as srid_wrong
FROM community_geofences
WHERE geom IS NOT NULL;

-- Verify index exists
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'community_geofences'
  AND indexname = 'community_geofences_geom_gist';
