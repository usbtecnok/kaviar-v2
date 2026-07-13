ALTER TABLE IF EXISTS "drivers"
DROP COLUMN IF EXISTS "asaas_customer_id";

ALTER TABLE IF EXISTS "passengers"
DROP COLUMN IF EXISTS "asaas_customer_id";
