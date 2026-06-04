-- AlterTable: delivery fields on commerce_orders
ALTER TABLE "commerce_orders" ADD COLUMN IF NOT EXISTS "order_code" VARCHAR(10);
ALTER TABLE "commerce_orders" ADD COLUMN IF NOT EXISTS "delivery_code" VARCHAR(6);
ALTER TABLE "commerce_orders" ADD COLUMN IF NOT EXISTS "delivery_status" VARCHAR(20) NOT NULL DEFAULT 'none';
ALTER TABLE "commerce_orders" ADD COLUMN IF NOT EXISTS "delivery_requested_at" TIMESTAMPTZ;
ALTER TABLE "commerce_orders" ADD COLUMN IF NOT EXISTS "driver_id" TEXT;
ALTER TABLE "commerce_orders" ADD COLUMN IF NOT EXISTS "driver_name" VARCHAR(100);
ALTER TABLE "commerce_orders" ADD COLUMN IF NOT EXISTS "dispatched_at" TIMESTAMPTZ;
ALTER TABLE "commerce_orders" ADD COLUMN IF NOT EXISTS "delivered_at" TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS "idx_commerce_orders_code" ON "commerce_orders"("order_code");
