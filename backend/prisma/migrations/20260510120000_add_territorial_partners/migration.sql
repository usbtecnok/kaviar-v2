-- CreateTable: territorial_partners
CREATE TABLE "territorial_partners" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "partner_type" TEXT NOT NULL DEFAULT 'association',
    "address" TEXT,
    "responsible_name" TEXT NOT NULL,
    "responsible_role" TEXT NOT NULL DEFAULT 'presidente',
    "responsible_phone" TEXT,
    "responsible_email" TEXT,
    "commission_percent" DECIMAL(5,2) NOT NULL DEFAULT 5,
    "monthly_fee_cents" INTEGER,
    "billing_due_day" INTEGER,
    "billing_status" TEXT NOT NULL DEFAULT 'current',
    "last_payment_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "territorial_partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable: partner_commissions
CREATE TABLE "partner_commissions" (
    "id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "ride_id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "ride_final_price" DECIMAL(8,2) NOT NULL,
    "commission_percent" DECIMAL(5,2) NOT NULL,
    "commission_amount" DECIMAL(8,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paid_at" TIMESTAMP(3),
    "paid_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: partner_payments
CREATE TABLE "partner_payments" (
    "id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "reference_month" TEXT,
    "paid_at" TIMESTAMP(3) NOT NULL,
    "receipt_url" TEXT,
    "notes" TEXT,
    "registered_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_payments_pkey" PRIMARY KEY ("id")
);

-- AlterTable: drivers - add territorial_partner_id
ALTER TABLE "drivers" ADD COLUMN "territorial_partner_id" TEXT;

-- CreateIndex
CREATE INDEX "territorial_partners_status_idx" ON "territorial_partners"("status");
CREATE INDEX "territorial_partners_partner_type_idx" ON "territorial_partners"("partner_type");
CREATE INDEX "territorial_partners_billing_status_idx" ON "territorial_partners"("billing_status");
CREATE UNIQUE INDEX "partner_commissions_ride_id_partner_id_key" ON "partner_commissions"("ride_id", "partner_id");
CREATE INDEX "partner_commissions_partner_id_status_idx" ON "partner_commissions"("partner_id", "status");
CREATE INDEX "partner_commissions_driver_id_idx" ON "partner_commissions"("driver_id");
CREATE INDEX "partner_payments_partner_id_paid_at_idx" ON "partner_payments"("partner_id", "paid_at" DESC);
CREATE INDEX "drivers_territorial_partner_id_idx" ON "drivers"("territorial_partner_id");

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_territorial_partner_id_fkey" FOREIGN KEY ("territorial_partner_id") REFERENCES "territorial_partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "partner_commissions" ADD CONSTRAINT "partner_commissions_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "territorial_partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "partner_payments" ADD CONSTRAINT "partner_payments_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "territorial_partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed: Associação Fazendinha (idempotente)
INSERT INTO "territorial_partners" ("id", "name", "partner_type", "address", "responsible_name", "responsible_role", "status", "billing_status", "commission_percent", "created_at", "updated_at")
SELECT
    gen_random_uuid()::text,
    'Associação Fazendinha',
    'association',
    'Estrada das Furnas, 3001, fundos',
    'Mônica',
    'presidente',
    'active',
    'current',
    5,
    NOW(),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM "territorial_partners" WHERE "name" = 'Associação Fazendinha');
