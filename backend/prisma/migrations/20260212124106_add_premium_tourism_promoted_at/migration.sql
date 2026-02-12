-- Add missing column expected by Prisma: drivers.premium_tourism_promoted_at
-- Applied manually via ECS task on 2026-02-12 09:41 BRT
ALTER TABLE "drivers"
ADD COLUMN IF NOT EXISTS "premium_tourism_promoted_at" TIMESTAMPTZ NULL;
