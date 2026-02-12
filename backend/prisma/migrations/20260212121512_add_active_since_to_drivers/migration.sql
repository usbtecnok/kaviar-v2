-- Add missing column expected by Prisma: drivers.active_since
-- Nullable to avoid breaking existing rows
-- Applied manually via ECS task on 2026-02-12 09:19 BRT
ALTER TABLE "drivers"
ADD COLUMN IF NOT EXISTS "active_since" TIMESTAMPTZ;
