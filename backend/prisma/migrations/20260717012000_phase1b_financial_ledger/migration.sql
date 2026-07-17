-- Fase 1B: Livro de lancamentos e vinculos
-- Escopo: enums, financial_transactions, financial_transaction_allocations, financial_transaction_links.

CREATE TYPE "financial_transaction_type" AS ENUM (
    'INCOME',
    'EXPENSE',
    'TRANSFER',
    'RECEIVABLE',
    'PAYABLE',
    'ADJUSTMENT',
    'REVERSAL',
    'REFUND',
    'RECONCILIATION',
    'ACCRUAL',
    'SETTLEMENT',
    'WITHDRAWAL',
    'DEPOSIT',
    'TAX',
    'FEE',
    'COMPENSATION'
);

CREATE TYPE "financial_transaction_status" AS ENUM (
    'DRAFT',
    'PENDING',
    'POSTED',
    'CANCELED',
    'REVERSED',
    'BLOCKED',
    'RECONCILED',
    'CLOSED'
);

CREATE TYPE "financial_payment_method" AS ENUM (
    'PIX',
    'ASAAS',
    'SUMUP',
    'BANK_TRANSFER',
    'TED',
    'DOC',
    'CASH',
    'CARD',
    'BOLETO',
    'INTERNAL',
    'NONE'
);

CREATE TYPE "financial_source_type" AS ENUM (
    'RIDE',
    'DRIVER_WALLET',
    'CREDIT_SALE',
    'TERRITORIAL_PAYOUT',
    'COMMERCIAL_ORDER',
    'MANUAL',
    'BANK_IMPORT',
    'BANK_WEBHOOK',
    'PAYMENT_PROVIDER',
    'NFSE',
    'ACCOUNTING',
    'REFUND',
    'TAX',
    'ADJUSTMENT'
);

CREATE TYPE "financial_origin_type" AS ENUM (
    'OPERATIONAL',
    'COMMERCIAL',
    'BANK',
    'PROVIDER',
    'MANUAL',
    'ACCOUNTING',
    'TAX',
    'INTERNAL'
);

CREATE TYPE "financial_transaction_allocation_type" AS ENUM (
    'SIMPLE',
    'ALLOCATED',
    'ADJUSTMENT',
    'RECLASSIFICATION'
);

CREATE TYPE "financial_transaction_link_type" AS ENUM (
    'SETTLEMENT',
    'TRANSFER_PAIR',
    'REVERSAL',
    'DOCUMENT_LINK',
    'RECONCILIATION',
    'COMPETENCE',
    'RATEIO',
    'ACCOUNTANT_REVIEW'
);

CREATE TABLE "financial_transactions" (
    "id" TEXT NOT NULL,
    "external_reference" TEXT,
    "provider" TEXT,
    "provider_event_id" TEXT,
    "source_type" "financial_source_type" NOT NULL,
    "source_id" TEXT,
    "origin_type" "financial_origin_type" NOT NULL,
    "origin_id" TEXT,

    "account_id" TEXT NOT NULL,
    "counterparty_account_id" TEXT,
    "category_id" TEXT,
    "cost_center_id" TEXT,
    "transfer_group_id" TEXT,

    "direction" "financial_direction" NOT NULL,
    "transaction_type" "financial_transaction_type" NOT NULL,
    "status" "financial_transaction_status" NOT NULL DEFAULT 'DRAFT',
    "payment_method" "financial_payment_method",
    "recognition_policy" "financial_recognition_policy",

    "competence_date" TIMESTAMP(3) NOT NULL,
    "transaction_date" TIMESTAMP(3) NOT NULL,
    "due_date" TIMESTAMP(3),
    "settlement_date" TIMESTAMP(3),

    "gross_amount_cents" BIGINT NOT NULL,
    "fee_amount_cents" BIGINT NOT NULL DEFAULT 0,
    "discount_amount_cents" BIGINT NOT NULL DEFAULT 0,
    "retention_amount_cents" BIGINT NOT NULL DEFAULT 0,
    "net_amount_cents" BIGINT NOT NULL,
    "transfer_amount_cents" BIGINT,

    "reversal_of_id" TEXT,
    "canceled_reason" TEXT,
    "canceled_at" TIMESTAMP(3),

    "description" TEXT NOT NULL,
    "memo" TEXT,
    "metadata" JSONB,
    "idempotency_key" TEXT,

    "created_by_admin_id" TEXT,
    "approved_by_admin_id" TEXT,
    "responsible_admin_id" TEXT,

    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_transactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "financial_transaction_allocations" (
    "id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "cost_center_id" TEXT,
    "amount_cents" BIGINT NOT NULL,
    "allocation_type" "financial_transaction_allocation_type" NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "created_by_admin_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_transaction_allocations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "financial_transaction_links" (
    "id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "linked_transaction_id" TEXT NOT NULL,
    "link_type" "financial_transaction_link_type" NOT NULL,
    "amount_cents" BIGINT,
    "metadata" JSONB,
    "created_by_admin_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_transaction_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "financial_transactions_idempotency_key_key" ON "financial_transactions"("idempotency_key");

CREATE INDEX "financial_transactions_account_id_transaction_date_idx" ON "financial_transactions"("account_id", "transaction_date");
CREATE INDEX "financial_transactions_counterparty_account_id_idx" ON "financial_transactions"("counterparty_account_id");
CREATE INDEX "financial_transactions_category_id_competence_date_idx" ON "financial_transactions"("category_id", "competence_date");
CREATE INDEX "financial_transactions_cost_center_id_competence_date_idx" ON "financial_transactions"("cost_center_id", "competence_date");
CREATE INDEX "financial_transactions_status_direction_idx" ON "financial_transactions"("status", "direction");
CREATE INDEX "financial_transactions_source_type_source_id_idx" ON "financial_transactions"("source_type", "source_id");
CREATE INDEX "financial_transactions_provider_provider_event_id_idx" ON "financial_transactions"("provider", "provider_event_id");
CREATE INDEX "financial_transactions_origin_type_origin_id_idx" ON "financial_transactions"("origin_type", "origin_id");
CREATE INDEX "financial_transactions_transfer_group_id_idx" ON "financial_transactions"("transfer_group_id");
CREATE INDEX "financial_transactions_reversal_of_id_idx" ON "financial_transactions"("reversal_of_id");
CREATE INDEX "financial_transactions_created_by_admin_id_idx" ON "financial_transactions"("created_by_admin_id");
CREATE INDEX "financial_transactions_approved_by_admin_id_idx" ON "financial_transactions"("approved_by_admin_id");
CREATE INDEX "financial_transactions_responsible_admin_id_idx" ON "financial_transactions"("responsible_admin_id");

CREATE INDEX "financial_transaction_allocations_transaction_id_idx" ON "financial_transaction_allocations"("transaction_id");
CREATE INDEX "financial_transaction_allocations_category_id_idx" ON "financial_transaction_allocations"("category_id");
CREATE INDEX "financial_transaction_allocations_cost_center_id_idx" ON "financial_transaction_allocations"("cost_center_id");
CREATE INDEX "financial_transaction_allocations_allocation_type_idx" ON "financial_transaction_allocations"("allocation_type");
CREATE INDEX "financial_transaction_allocations_created_by_admin_id_idx" ON "financial_transaction_allocations"("created_by_admin_id");

CREATE UNIQUE INDEX "financial_transaction_links_transaction_id_linked_transacti_key"
    ON "financial_transaction_links"("transaction_id", "linked_transaction_id", "link_type");
CREATE INDEX "financial_transaction_links_link_type_idx" ON "financial_transaction_links"("link_type");
CREATE INDEX "financial_transaction_links_linked_transaction_id_idx" ON "financial_transaction_links"("linked_transaction_id");
CREATE INDEX "financial_transaction_links_created_by_admin_id_idx" ON "financial_transaction_links"("created_by_admin_id");

ALTER TABLE "financial_transactions"
    ADD CONSTRAINT "financial_transactions_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES "financial_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "financial_transactions"
    ADD CONSTRAINT "financial_transactions_counterparty_account_id_fkey"
    FOREIGN KEY ("counterparty_account_id") REFERENCES "financial_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "financial_transactions"
    ADD CONSTRAINT "financial_transactions_category_id_fkey"
    FOREIGN KEY ("category_id") REFERENCES "financial_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "financial_transactions"
    ADD CONSTRAINT "financial_transactions_cost_center_id_fkey"
    FOREIGN KEY ("cost_center_id") REFERENCES "financial_cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "financial_transactions"
    ADD CONSTRAINT "financial_transactions_reversal_of_id_fkey"
    FOREIGN KEY ("reversal_of_id") REFERENCES "financial_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "financial_transactions"
    ADD CONSTRAINT "financial_transactions_created_by_admin_id_fkey"
    FOREIGN KEY ("created_by_admin_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "financial_transactions"
    ADD CONSTRAINT "financial_transactions_approved_by_admin_id_fkey"
    FOREIGN KEY ("approved_by_admin_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "financial_transactions"
    ADD CONSTRAINT "financial_transactions_responsible_admin_id_fkey"
    FOREIGN KEY ("responsible_admin_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "financial_transaction_allocations"
    ADD CONSTRAINT "financial_transaction_allocations_transaction_id_fkey"
    FOREIGN KEY ("transaction_id") REFERENCES "financial_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "financial_transaction_allocations"
    ADD CONSTRAINT "financial_transaction_allocations_category_id_fkey"
    FOREIGN KEY ("category_id") REFERENCES "financial_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "financial_transaction_allocations"
    ADD CONSTRAINT "financial_transaction_allocations_cost_center_id_fkey"
    FOREIGN KEY ("cost_center_id") REFERENCES "financial_cost_centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "financial_transaction_allocations"
    ADD CONSTRAINT "financial_transaction_allocations_created_by_admin_id_fkey"
    FOREIGN KEY ("created_by_admin_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "financial_transaction_links"
    ADD CONSTRAINT "financial_transaction_links_transaction_id_fkey"
    FOREIGN KEY ("transaction_id") REFERENCES "financial_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "financial_transaction_links"
    ADD CONSTRAINT "financial_transaction_links_linked_transaction_id_fkey"
    FOREIGN KEY ("linked_transaction_id") REFERENCES "financial_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "financial_transaction_links"
    ADD CONSTRAINT "financial_transaction_links_created_by_admin_id_fkey"
    FOREIGN KEY ("created_by_admin_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "financial_transactions"
    ADD CONSTRAINT "financial_transactions_non_negative_amounts_chk"
    CHECK (
        "gross_amount_cents" >= 0
        AND "fee_amount_cents" >= 0
        AND "discount_amount_cents" >= 0
        AND "retention_amount_cents" >= 0
        AND "net_amount_cents" >= 0
        AND ("transfer_amount_cents" IS NULL OR "transfer_amount_cents" >= 0)
    );

ALTER TABLE "financial_transactions"
    ADD CONSTRAINT "financial_transactions_reversal_not_self_chk"
    CHECK ("reversal_of_id" IS NULL OR "reversal_of_id" <> "id");

ALTER TABLE "financial_transactions"
    ADD CONSTRAINT "financial_transactions_counterparty_not_self_chk"
    CHECK ("counterparty_account_id" IS NULL OR "counterparty_account_id" <> "account_id");

ALTER TABLE "financial_transactions"
    ADD CONSTRAINT "financial_transactions_cancel_status_consistency_chk"
    CHECK (
        (
            "status" = 'CANCELED'::"financial_transaction_status"
            AND "canceled_at" IS NOT NULL
            AND "canceled_reason" IS NOT NULL
            AND length(btrim("canceled_reason")) > 0
        )
        OR (
            "status" <> 'CANCELED'::"financial_transaction_status"
            AND "canceled_at" IS NULL
            AND "canceled_reason" IS NULL
        )
    );

ALTER TABLE "financial_transactions"
    ADD CONSTRAINT "financial_transactions_transfer_consistency_chk"
    CHECK (
        (
            "transaction_type" = 'TRANSFER'::"financial_transaction_type"
            AND "transfer_group_id" IS NOT NULL
            AND "counterparty_account_id" IS NOT NULL
            AND "transfer_amount_cents" IS NOT NULL
            AND "transfer_amount_cents" > 0
        )
        OR (
            "transaction_type" <> 'TRANSFER'::"financial_transaction_type"
            AND "transfer_group_id" IS NULL
            AND "transfer_amount_cents" IS NULL
        )
    );

ALTER TABLE "financial_transactions"
    ADD CONSTRAINT "financial_transactions_settlement_not_draft_chk"
    CHECK (
        "settlement_date" IS NULL
        OR "status" <> 'DRAFT'::"financial_transaction_status"
    );

ALTER TABLE "financial_transactions"
    ADD CONSTRAINT "financial_transactions_description_not_blank_chk"
    CHECK (length(btrim("description")) > 0);

CREATE UNIQUE INDEX "financial_transactions_source_type_source_id_unique_not_null"
    ON "financial_transactions"("source_type", "source_id")
    WHERE "source_id" IS NOT NULL;

CREATE UNIQUE INDEX "financial_transactions_source_type_external_reference_unique_not_null"
    ON "financial_transactions"("source_type", "external_reference")
    WHERE "external_reference" IS NOT NULL;

CREATE UNIQUE INDEX "financial_transactions_provider_provider_event_id_unique_not_null"
    ON "financial_transactions"("provider", "provider_event_id")
    WHERE "provider" IS NOT NULL AND "provider_event_id" IS NOT NULL;

ALTER TABLE "financial_transaction_allocations"
    ADD CONSTRAINT "financial_transaction_allocations_amount_positive_chk"
    CHECK ("amount_cents" > 0);

ALTER TABLE "financial_transaction_allocations"
    ADD CONSTRAINT "financial_transaction_allocations_description_not_blank_chk"
    CHECK ("description" IS NULL OR length(btrim("description")) > 0);

CREATE UNIQUE INDEX "financial_transaction_allocations_functional_unique_idx"
    ON "financial_transaction_allocations"(
        "transaction_id",
        "category_id",
        COALESCE("cost_center_id", ''),
        "allocation_type",
        COALESCE("description", '')
    );

ALTER TABLE "financial_transaction_links"
    ADD CONSTRAINT "financial_transaction_links_not_self_chk"
    CHECK ("transaction_id" <> "linked_transaction_id");

ALTER TABLE "financial_transaction_links"
    ADD CONSTRAINT "financial_transaction_links_amount_positive_if_present_chk"
    CHECK ("amount_cents" IS NULL OR "amount_cents" > 0);

CREATE OR REPLACE FUNCTION "financial_transaction_allocations_block_direct_classification"()
RETURNS TRIGGER AS $$
DECLARE
    tx_category_id TEXT;
    tx_cost_center_id TEXT;
BEGIN
    SELECT "category_id", "cost_center_id"
      INTO tx_category_id, tx_cost_center_id
      FROM "financial_transactions"
     WHERE "id" = NEW."transaction_id";

    IF tx_category_id IS NOT NULL OR tx_cost_center_id IS NOT NULL THEN
        RAISE EXCEPTION 'Cannot add allocation when transaction has direct category/cost_center classification';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "financial_transaction_allocations_prevent_direct_classification_trg"
BEFORE INSERT OR UPDATE ON "financial_transaction_allocations"
FOR EACH ROW
EXECUTE FUNCTION "financial_transaction_allocations_block_direct_classification"();

CREATE OR REPLACE FUNCTION "financial_transactions_block_direct_classification_when_allocated"()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW."category_id" IS NOT NULL OR NEW."cost_center_id" IS NOT NULL)
       AND EXISTS (
            SELECT 1
              FROM "financial_transaction_allocations" a
             WHERE a."transaction_id" = NEW."id"
       ) THEN
        RAISE EXCEPTION 'Cannot set direct category/cost_center when transaction already has allocations';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "financial_transactions_prevent_direct_classification_when_allocated_trg"
BEFORE UPDATE OF "category_id", "cost_center_id" ON "financial_transactions"
FOR EACH ROW
EXECUTE FUNCTION "financial_transactions_block_direct_classification_when_allocated"();
