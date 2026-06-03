-- CreateTable: commerce_accounts
CREATE TABLE "commerce_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "crm_lead_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "trade_name" VARCHAR(255),
    "category" VARCHAR(50) NOT NULL DEFAULT 'outro',
    "document_cnpj" VARCHAR(20),
    "document_cpf" VARCHAR(14),
    "phone" VARCHAR(30),
    "email" VARCHAR(255),
    "address" TEXT,
    "neighborhood_id" TEXT,
    "territory_id" UUID,
    "logo_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
    "commission_percent" DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    "approved_by" TEXT,
    "approved_at" TIMESTAMPTZ,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "deleted_at" TIMESTAMPTZ,
    CONSTRAINT "commerce_accounts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_commerce_accounts_status" ON "commerce_accounts"("status");
CREATE INDEX "idx_commerce_accounts_territory" ON "commerce_accounts"("territory_id");
CREATE INDEX "idx_commerce_accounts_crm_lead" ON "commerce_accounts"("crm_lead_id");

-- CreateTable: commerce_users
CREATE TABLE "commerce_users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "commerce_account_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" VARCHAR(20) NOT NULL DEFAULT 'owner',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "must_change_password" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "commerce_users_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "commerce_users_email_key" UNIQUE ("email")
);

CREATE INDEX "idx_commerce_users_account" ON "commerce_users"("commerce_account_id");

ALTER TABLE "commerce_users" ADD CONSTRAINT "commerce_users_account_fkey"
  FOREIGN KEY ("commerce_account_id") REFERENCES "commerce_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: commerce_products
CREATE TABLE "commerce_products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "commerce_account_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "category" VARCHAR(50),
    "price_cents" INT NOT NULL,
    "image_url" TEXT,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "is_restricted" BOOLEAN NOT NULL DEFAULT false,
    "stock_quantity" INT,
    "min_stock_alert" INT,
    "sort_order" INT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "deleted_at" TIMESTAMPTZ,
    CONSTRAINT "commerce_products_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_commerce_products_account" ON "commerce_products"("commerce_account_id");
CREATE INDEX "idx_commerce_products_available" ON "commerce_products"("commerce_account_id","is_available") WHERE "deleted_at" IS NULL;

ALTER TABLE "commerce_products" ADD CONSTRAINT "commerce_products_account_fkey"
  FOREIGN KEY ("commerce_account_id") REFERENCES "commerce_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
