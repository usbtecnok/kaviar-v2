-- Ride sharing: add share_token and share_expires_at to rides_v2
ALTER TABLE "rides_v2" ADD COLUMN IF NOT EXISTS "share_token" TEXT;
ALTER TABLE "rides_v2" ADD COLUMN IF NOT EXISTS "share_expires_at" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "rides_v2_share_token_key" ON "rides_v2"("share_token") WHERE "share_token" IS NOT NULL;
