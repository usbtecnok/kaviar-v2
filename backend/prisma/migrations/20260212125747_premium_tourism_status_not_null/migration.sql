-- Fix premium_tourism_status: align DB with Prisma schema (NOT NULL)
-- Applied manually via ECS task on 2026-02-12 09:58 BRT
-- Updated 8 drivers with NULL values to 'inactive'

UPDATE "drivers" 
SET "premium_tourism_status"='inactive' 
WHERE "premium_tourism_status" IS NULL;

ALTER TABLE "drivers" 
ALTER COLUMN "premium_tourism_status" SET DEFAULT 'inactive';

ALTER TABLE "drivers" 
ALTER COLUMN "premium_tourism_status" SET NOT NULL;
