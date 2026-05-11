-- Add phone to partner_members
ALTER TABLE "partner_members" ADD COLUMN IF NOT EXISTS "phone" TEXT;

-- Create partner_member_payments
CREATE TABLE IF NOT EXISTS "partner_member_payments" (
    "id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "reference_month" TEXT NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "payment_method" TEXT NOT NULL DEFAULT 'pix',
    "paid_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receipt_code" TEXT NOT NULL,
    "notes" TEXT,
    "registered_by" TEXT NOT NULL,
    "whatsapp_sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "partner_member_payments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "partner_member_payments_receipt_code_key" ON "partner_member_payments"("receipt_code");
CREATE INDEX IF NOT EXISTS "partner_member_payments_partner_id_reference_month_idx" ON "partner_member_payments"("partner_id", "reference_month");
CREATE INDEX IF NOT EXISTS "partner_member_payments_member_id_idx" ON "partner_member_payments"("member_id");

ALTER TABLE "partner_member_payments" ADD CONSTRAINT "partner_member_payments_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "territorial_partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "partner_member_payments" ADD CONSTRAINT "partner_member_payments_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "partner_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
