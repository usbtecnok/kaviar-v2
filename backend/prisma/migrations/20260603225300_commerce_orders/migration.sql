-- AlterTable: add slug to commerce_accounts
ALTER TABLE "commerce_accounts" ADD COLUMN "slug" VARCHAR(100);
CREATE UNIQUE INDEX "commerce_accounts_slug_key" ON "commerce_accounts"("slug");

-- CreateTable: commerce_orders
CREATE TABLE "commerce_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "commerce_account_id" UUID NOT NULL,
    "customer_name" VARCHAR(255) NOT NULL,
    "customer_phone" VARCHAR(30) NOT NULL,
    "customer_address" TEXT,
    "delivery_type" VARCHAR(20) NOT NULL DEFAULT 'pickup',
    "status" VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    "subtotal_cents" INT NOT NULL,
    "delivery_fee_cents" INT NOT NULL DEFAULT 0,
    "kaviar_commission_cents" INT NOT NULL,
    "commerce_net_cents" INT NOT NULL,
    "total_cents" INT NOT NULL,
    "payment_method" VARCHAR(20),
    "payment_status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "accepted_at" TIMESTAMPTZ,
    "prepared_at" TIMESTAMPTZ,
    "ready_at" TIMESTAMPTZ,
    "canceled_at" TIMESTAMPTZ,
    "cancel_reason" TEXT,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "commerce_orders_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_commerce_orders_account_status" ON "commerce_orders"("commerce_account_id", "status");
CREATE INDEX "idx_commerce_orders_status" ON "commerce_orders"("status");
CREATE INDEX "idx_commerce_orders_created" ON "commerce_orders"("created_at" DESC);

ALTER TABLE "commerce_orders" ADD CONSTRAINT "commerce_orders_account_fkey"
  FOREIGN KEY ("commerce_account_id") REFERENCES "commerce_accounts"("id") ON UPDATE CASCADE;

-- CreateTable: commerce_order_items
CREATE TABLE "commerce_order_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "product_name" VARCHAR(255) NOT NULL,
    "quantity" INT NOT NULL,
    "unit_price_cents" INT NOT NULL,
    "total_cents" INT NOT NULL,
    "notes" VARCHAR(255),
    CONSTRAINT "commerce_order_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_commerce_order_items_order" ON "commerce_order_items"("order_id");

ALTER TABLE "commerce_order_items" ADD CONSTRAINT "commerce_order_items_order_fkey"
  FOREIGN KEY ("order_id") REFERENCES "commerce_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
