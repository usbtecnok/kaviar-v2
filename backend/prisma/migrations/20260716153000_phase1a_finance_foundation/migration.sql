-- Fase 1A Financeiro e Contabilidade
-- Escopo: enums e tabelas-base somente.
-- Não aplica em produção nesta etapa.

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Enums da Fase 1A
CREATE TYPE "financial_recognition_subject" AS ENUM (
    'RIDE_REVENUE',
    'PREPAID_DRIVER_CREDITS',
    'MANAGER_PAYMENTS',
    'COMMERCIAL_PAYMENTS',
    'OTHER'
);

CREATE TYPE "financial_recognition_scope_type" AS ENUM (
    'GLOBAL',
    'TERRITORY',
    'CITY',
    'COST_CENTER'
);

CREATE TYPE "financial_recognition_policy" AS ENUM (
    'UNCLASSIFIED',
    'GROSS_PRINCIPAL',
    'NET_AGENT'
);

CREATE TYPE "financial_recognition_policy_status" AS ENUM (
    'DRAFT',
    'APPROVED',
    'SUPERSEDED',
    'REVOKED'
);

CREATE TYPE "financial_account_type" AS ENUM (
    'BANK',
    'CASH',
    'PIX_WALLET',
    'RECEIVABLE',
    'PAYABLE',
    'TAX',
    'CLEARING',
    'THIRD_PARTY',
    'INTERNAL',
    'ESCROW'
);

CREATE TYPE "financial_category_kind" AS ENUM (
    'REVENUE',
    'EXPENSE',
    'CONTRIBUTION',
    'WITHDRAWAL',
    'TRANSFER',
    'LIABILITY',
    'CLEARING',
    'ADJUSTMENT'
);

CREATE TYPE "financial_cost_center_type" AS ENUM (
    'COMPANY',
    'DEPARTMENT',
    'TERRITORY',
    'CITY',
    'PROJECT',
    'OTHER'
);

CREATE TYPE "financial_direction" AS ENUM (
    'IN',
    'OUT'
);

-- financial_accounts
CREATE TABLE "financial_accounts" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "financial_account_type" NOT NULL,
    "institution_name" TEXT,
    "bank_code" TEXT,
    "agency_encrypted" TEXT,
    "account_number_encrypted" TEXT,
    "account_digit_encrypted" TEXT,
    "pix_key_encrypted" TEXT,
    "document_encrypted" TEXT,
    "account_fingerprint" TEXT,
    "account_last4" TEXT,
    "pix_key_last4" TEXT,
    "encryption_key_version" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "opening_balance_cents" BIGINT NOT NULL DEFAULT 0,
    "opening_balance_date" TIMESTAMP(3),
    "allows_negative_balance" BOOLEAN NOT NULL DEFAULT false,
    "is_cash_equivalent" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_by_admin_id" TEXT,
    "updated_by_admin_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "financial_accounts_code_key" ON "financial_accounts"("code");
CREATE UNIQUE INDEX "financial_accounts_account_fingerprint_key" ON "financial_accounts"("account_fingerprint") WHERE "account_fingerprint" IS NOT NULL;
CREATE INDEX "financial_accounts_type_is_active_idx" ON "financial_accounts"("type", "is_active");
CREATE INDEX "financial_accounts_currency_idx" ON "financial_accounts"("currency");

ALTER TABLE "financial_accounts"
    ADD CONSTRAINT "financial_accounts_created_by_admin_id_fkey"
    FOREIGN KEY ("created_by_admin_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "financial_accounts"
    ADD CONSTRAINT "financial_accounts_updated_by_admin_id_fkey"
    FOREIGN KEY ("updated_by_admin_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Prisma não expressa este CHECK com dependência entre valor e flag.
ALTER TABLE "financial_accounts"
    ADD CONSTRAINT "financial_accounts_opening_balance_non_negative_when_disallowed_chk"
    CHECK ("opening_balance_cents" >= 0 OR "allows_negative_balance" = true);

-- financial_categories
CREATE TABLE "financial_categories" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "financial_category_kind" NOT NULL,
    "parent_id" TEXT,
    "default_direction" "financial_direction",
    "requires_document" BOOLEAN NOT NULL DEFAULT false,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_by_admin_id" TEXT,
    "updated_by_admin_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "financial_categories_code_key" ON "financial_categories"("code");
CREATE INDEX "financial_categories_kind_is_active_idx" ON "financial_categories"("kind", "is_active");
CREATE INDEX "financial_categories_parent_id_idx" ON "financial_categories"("parent_id");
CREATE INDEX "financial_categories_sort_order_idx" ON "financial_categories"("sort_order");

ALTER TABLE "financial_categories"
    ADD CONSTRAINT "financial_categories_parent_id_fkey"
    FOREIGN KEY ("parent_id") REFERENCES "financial_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "financial_categories"
    ADD CONSTRAINT "financial_categories_created_by_admin_id_fkey"
    FOREIGN KEY ("created_by_admin_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "financial_categories"
    ADD CONSTRAINT "financial_categories_updated_by_admin_id_fkey"
    FOREIGN KEY ("updated_by_admin_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Prisma não expressa este CHECK de auto-referência.
ALTER TABLE "financial_categories"
    ADD CONSTRAINT "financial_categories_parent_not_self_chk"
    CHECK ("parent_id" IS NULL OR "parent_id" <> "id");

-- financial_cost_centers
CREATE TABLE "financial_cost_centers" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "financial_cost_center_type" NOT NULL,
    "parent_id" TEXT,
    "territory_id" TEXT,
    "city" TEXT,
    "state" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_admin_id" TEXT,
    "updated_by_admin_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_cost_centers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "financial_cost_centers_code_key" ON "financial_cost_centers"("code");
CREATE INDEX "financial_cost_centers_type_is_active_idx" ON "financial_cost_centers"("type", "is_active");
CREATE INDEX "financial_cost_centers_parent_id_idx" ON "financial_cost_centers"("parent_id");
CREATE INDEX "financial_cost_centers_territory_id_idx" ON "financial_cost_centers"("territory_id");
CREATE INDEX "financial_cost_centers_city_state_idx" ON "financial_cost_centers"("city", "state");

ALTER TABLE "financial_cost_centers"
    ADD CONSTRAINT "financial_cost_centers_parent_id_fkey"
    FOREIGN KEY ("parent_id") REFERENCES "financial_cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "financial_cost_centers"
    ADD CONSTRAINT "financial_cost_centers_territory_id_fkey"
    FOREIGN KEY ("territory_id") REFERENCES "operational_territories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "financial_cost_centers"
    ADD CONSTRAINT "financial_cost_centers_created_by_admin_id_fkey"
    FOREIGN KEY ("created_by_admin_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "financial_cost_centers"
    ADD CONSTRAINT "financial_cost_centers_updated_by_admin_id_fkey"
    FOREIGN KEY ("updated_by_admin_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Prisma não expressa este CHECK de auto-referência.
ALTER TABLE "financial_cost_centers"
    ADD CONSTRAINT "financial_cost_centers_parent_not_self_chk"
    CHECK ("parent_id" IS NULL OR "parent_id" <> "id");

-- financial_recognition_policies
CREATE TABLE "financial_recognition_policies" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "subject" "financial_recognition_subject" NOT NULL,
    "scope_type" "financial_recognition_scope_type" NOT NULL,
    "territory_id" TEXT,
    "cost_center_id" TEXT,
    "city" TEXT,
    "state" TEXT,
    "policy" "financial_recognition_policy" NOT NULL,
    "status" "financial_recognition_policy_status" NOT NULL,
    "effective_from" TIMESTAMP(3) NOT NULL,
    "effective_until" TIMESTAMP(3),
    "approved_by_admin_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "created_by_admin_id" TEXT,
    "updated_by_admin_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_recognition_policies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "financial_recognition_policies_code_key" ON "financial_recognition_policies"("code");
CREATE INDEX "financial_recognition_policies_subject_scope_status_idx" ON "financial_recognition_policies"("subject", "scope_type", "status");
CREATE INDEX "financial_recognition_policies_territory_id_idx" ON "financial_recognition_policies"("territory_id");
CREATE INDEX "financial_recognition_policies_cost_center_id_idx" ON "financial_recognition_policies"("cost_center_id");
CREATE INDEX "financial_recognition_policies_effective_from_effective_until_idx" ON "financial_recognition_policies"("effective_from", "effective_until");

ALTER TABLE "financial_recognition_policies"
    ADD CONSTRAINT "financial_recognition_policies_territory_id_fkey"
    FOREIGN KEY ("territory_id") REFERENCES "operational_territories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "financial_recognition_policies"
    ADD CONSTRAINT "financial_recognition_policies_cost_center_id_fkey"
    FOREIGN KEY ("cost_center_id") REFERENCES "financial_cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "financial_recognition_policies"
    ADD CONSTRAINT "financial_recognition_policies_approved_by_admin_id_fkey"
    FOREIGN KEY ("approved_by_admin_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "financial_recognition_policies"
    ADD CONSTRAINT "financial_recognition_policies_created_by_admin_id_fkey"
    FOREIGN KEY ("created_by_admin_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "financial_recognition_policies"
    ADD CONSTRAINT "financial_recognition_policies_updated_by_admin_id_fkey"
    FOREIGN KEY ("updated_by_admin_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Prisma não expressa este CHECK temporal.
ALTER TABLE "financial_recognition_policies"
    ADD CONSTRAINT "financial_recognition_policies_effective_window_chk"
    CHECK ("effective_until" IS NULL OR "effective_until" > "effective_from");

-- Prisma não expressa esta consistência de escopo.
ALTER TABLE "financial_recognition_policies"
    ADD CONSTRAINT "financial_recognition_policies_scope_consistency_chk"
    CHECK (
        (
            "scope_type" = 'GLOBAL'
            AND "territory_id" IS NULL
            AND "cost_center_id" IS NULL
            AND "city" IS NULL
            AND "state" IS NULL
        )
        OR (
            "scope_type" = 'TERRITORY'
            AND "territory_id" IS NOT NULL
            AND "cost_center_id" IS NULL
            AND "city" IS NULL
            AND "state" IS NULL
        )
        OR (
            "scope_type" = 'CITY'
            AND "territory_id" IS NULL
            AND "cost_center_id" IS NULL
            AND "city" IS NOT NULL
            AND "state" IS NOT NULL
        )
        OR (
            "scope_type" = 'COST_CENTER'
            AND "territory_id" IS NULL
            AND "cost_center_id" IS NOT NULL
            AND "city" IS NULL
            AND "state" IS NULL
        )
    );

-- Prisma não expressa a não sobreposição de políticas aprovadas para mesmo subject + scope.
-- Esta exclusão temporal usa btree_gist para comparar os campos do escopo e o intervalo de vigência.
ALTER TABLE "financial_recognition_policies"
    ADD CONSTRAINT "financial_recognition_policies_approved_no_overlap_excl"
    EXCLUDE USING gist (
        "subject" WITH =,
        "scope_type" WITH =,
        COALESCE("territory_id", '') WITH =,
        COALESCE("cost_center_id", '') WITH =,
        COALESCE("city", '') WITH =,
        COALESCE("state", '') WITH =,
        tsrange("effective_from", COALESCE("effective_until", 'infinity'::timestamp), '[)') WITH &&
    ) WHERE ("status" = 'APPROVED');

-- Idempotência e duplicidade serão reforçadas por constraints parciais nas fases seguintes.
-- Nesta Fase 1A não há tabelas de transação, documento ou conciliação.
