-- Add missing column expected by Prisma: drivers.premium_tourism_status
-- TEXT NULL for immediate unblock; will align with Prisma enum later
-- Applied manually via ECS task on 2026-02-12 09:30 BRT
ALTER TABLE "drivers"
ADD COLUMN IF NOT EXISTS "premium_tourism_status" TEXT NULL;
