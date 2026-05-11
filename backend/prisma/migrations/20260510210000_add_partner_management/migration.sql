ALTER TABLE "territorial_partners" ADD COLUMN IF NOT EXISTS "plan" TEXT NOT NULL DEFAULT 'basic';

CREATE TABLE IF NOT EXISTS "partner_members" (
    "id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "partner_members_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "partner_transactions" (
    "id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'outro',
    "reference_month" TEXT,
    "member_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "partner_transactions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "partner_members_partner_id_status_idx" ON "partner_members"("partner_id", "status");
CREATE INDEX IF NOT EXISTS "partner_transactions_partner_id_reference_month_idx" ON "partner_transactions"("partner_id", "reference_month");
CREATE INDEX IF NOT EXISTS "partner_transactions_partner_id_type_idx" ON "partner_transactions"("partner_id", "type");

ALTER TABLE "partner_members" DROP CONSTRAINT IF EXISTS "partner_members_partner_id_fkey";
ALTER TABLE "partner_members" ADD CONSTRAINT "partner_members_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "territorial_partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "partner_transactions" DROP CONSTRAINT IF EXISTS "partner_transactions_partner_id_fkey";
ALTER TABLE "partner_transactions" ADD CONSTRAINT "partner_transactions_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "territorial_partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Set Fazendinha to management plan
UPDATE "territorial_partners" SET "plan" = 'management' WHERE "referral_code" = 'FAZENDINHA';
