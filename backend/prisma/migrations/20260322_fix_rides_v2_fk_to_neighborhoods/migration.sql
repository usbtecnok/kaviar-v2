-- AlterTable: rides_v2.origin_neighborhood_id FK communities -> neighborhoods
-- AlterTable: rides_v2.dest_neighborhood_id FK communities -> neighborhoods

-- Drop old FKs pointing to communities
ALTER TABLE "rides_v2" DROP CONSTRAINT IF EXISTS "rides_v2_origin_neighborhood_id_fkey";
ALTER TABLE "rides_v2" DROP CONSTRAINT IF EXISTS "rides_v2_dest_neighborhood_id_fkey";

-- Nullify any orphan values that don't exist in neighborhoods
UPDATE "rides_v2" SET origin_neighborhood_id = NULL
WHERE origin_neighborhood_id IS NOT NULL
  AND origin_neighborhood_id NOT IN (SELECT id FROM neighborhoods);

UPDATE "rides_v2" SET dest_neighborhood_id = NULL
WHERE dest_neighborhood_id IS NOT NULL
  AND dest_neighborhood_id NOT IN (SELECT id FROM neighborhoods);

-- Create new FKs pointing to neighborhoods
ALTER TABLE "rides_v2"
  ADD CONSTRAINT "rides_v2_origin_neighborhood_id_fkey"
  FOREIGN KEY ("origin_neighborhood_id") REFERENCES "neighborhoods"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "rides_v2"
  ADD CONSTRAINT "rides_v2_dest_neighborhood_id_fkey"
  FOREIGN KEY ("dest_neighborhood_id") REFERENCES "neighborhoods"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
