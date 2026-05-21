-- CreateTable: operator_profiles (PF/PJ/Associação)
CREATE TABLE "operator_profiles" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "territory_id" TEXT NOT NULL,
    "recipient_type" TEXT NOT NULL DEFAULT 'territorial_operator',
    "relationship_type" TEXT NOT NULL DEFAULT 'territorial_operator',
    "display_name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "pix_key" TEXT,
    "pix_key_type" TEXT,
    "bank_name" TEXT,
    "full_name" TEXT,
    "document_cpf" TEXT,
    "document_rg" TEXT,
    "company_name" TEXT,
    "trade_name" TEXT,
    "document_cnpj" TEXT,
    "legal_representative_name" TEXT,
    "legal_representative_cpf" TEXT,
    "document_status" TEXT NOT NULL DEFAULT 'pending',
    "contract_status" TEXT NOT NULL DEFAULT 'pending',
    "terms_accepted_at" TIMESTAMP(3),
    "responsibility_terms_accepted_at" TIMESTAMP(3),
    "verified_by" TEXT,
    "verified_at" TIMESTAMP(3),
    "rejected_reason" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operator_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "operator_profiles_admin_id_key" ON "operator_profiles"("admin_id");
CREATE INDEX "operator_profiles_territory_id_idx" ON "operator_profiles"("territory_id");
CREATE INDEX "operator_profiles_is_active_idx" ON "operator_profiles"("is_active");

ALTER TABLE "operator_profiles" ADD CONSTRAINT "operator_profiles_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "operator_profiles" ADD CONSTRAINT "operator_profiles_territory_id_fkey" FOREIGN KEY ("territory_id") REFERENCES "operational_territories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: territory_payouts
CREATE TABLE "territory_payouts" (
    "id" TEXT NOT NULL,
    "territory_id" TEXT NOT NULL,
    "operator_profile_id" TEXT NOT NULL,
    "reference_month" TEXT NOT NULL,
    "calculated_amount" DECIMAL(10,2) NOT NULL,
    "approved_amount" DECIMAL(10,2),
    "status" TEXT NOT NULL DEFAULT 'calculated',
    "calculation_details" JSONB,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "paid_by" TEXT,
    "paid_at" TIMESTAMP(3),
    "payment_method" TEXT,
    "payment_ref" TEXT,
    "receipt_url" TEXT,
    "fiscal_document_required" BOOLEAN NOT NULL DEFAULT false,
    "fiscal_document_type" TEXT NOT NULL DEFAULT 'none',
    "fiscal_document_url" TEXT,
    "fiscal_document_ref" TEXT,
    "fiscal_notes" TEXT,
    "cancel_reason" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "territory_payouts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "territory_payouts_territory_month_key" ON "territory_payouts"("territory_id", "reference_month");
CREATE INDEX "territory_payouts_status_idx" ON "territory_payouts"("status");
CREATE INDEX "territory_payouts_operator_profile_id_idx" ON "territory_payouts"("operator_profile_id");

ALTER TABLE "territory_payouts" ADD CONSTRAINT "territory_payouts_territory_id_fkey" FOREIGN KEY ("territory_id") REFERENCES "operational_territories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "territory_payouts" ADD CONSTRAINT "territory_payouts_operator_profile_id_fkey" FOREIGN KEY ("operator_profile_id") REFERENCES "operator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
