-- Add referral_code to territorial_partners
ALTER TABLE "territorial_partners" ADD COLUMN IF NOT EXISTS "referral_code" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "territorial_partners_referral_code_key" ON "territorial_partners"("referral_code");

-- Create partner_link_requests table
CREATE TABLE IF NOT EXISTS "partner_link_requests" (
    "id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "source" TEXT NOT NULL DEFAULT 'referral_code',
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_link_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "partner_link_requests_partner_id_driver_id_key" ON "partner_link_requests"("partner_id", "driver_id");
CREATE INDEX IF NOT EXISTS "partner_link_requests_partner_id_status_idx" ON "partner_link_requests"("partner_id", "status");
CREATE INDEX IF NOT EXISTS "partner_link_requests_status_idx" ON "partner_link_requests"("status");

ALTER TABLE "partner_link_requests" DROP CONSTRAINT IF EXISTS "partner_link_requests_partner_id_fkey";
ALTER TABLE "partner_link_requests" ADD CONSTRAINT "partner_link_requests_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "territorial_partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed: set referral_code FAZENDINHA for Associação Fazendinha
UPDATE "territorial_partners" SET "referral_code" = 'FAZENDINHA' WHERE "name" = 'Associação Fazendinha' AND "referral_code" IS NULL;
