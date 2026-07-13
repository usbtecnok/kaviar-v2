-- Remove legacy Asaas test runtime artifacts.
-- Preserve Wallet V2/SumUp and the legacy purchases table used by read-only analytics.

ALTER TABLE IF EXISTS "drivers" DROP COLUMN IF EXISTS "asaas_customer_id";
ALTER TABLE IF EXISTS "passengers" DROP COLUMN IF EXISTS "asaas_customer_id";
ALTER TABLE IF EXISTS "driver_credit_purchases" DROP COLUMN IF EXISTS "asaas_customer_id";
ALTER TABLE IF EXISTS "driver_credit_purchases" DROP COLUMN IF EXISTS "asaas_payment_id";
ALTER TABLE IF EXISTS "commerce_orders" DROP COLUMN IF EXISTS "asaas_payment_id";
ALTER TABLE IF EXISTS "ride_compensations" DROP COLUMN IF EXISTS "asaas_payment_id";
DROP TABLE IF EXISTS "asaas_webhook_events";
