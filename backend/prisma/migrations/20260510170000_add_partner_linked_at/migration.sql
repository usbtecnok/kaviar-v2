ALTER TABLE "drivers" ADD COLUMN IF NOT EXISTS "territorial_partner_linked_at" TIMESTAMP(3);

-- Backfill: set linked_at to now() for drivers already linked
UPDATE "drivers" SET "territorial_partner_linked_at" = NOW() WHERE "territorial_partner_id" IS NOT NULL AND "territorial_partner_linked_at" IS NULL;
