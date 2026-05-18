-- Update pricing policy: fees 12/15/22% + surcharge_external R$5.00
-- Applies to all active profiles

UPDATE pricing_profiles SET
  fee_local = 12,
  fee_adjacent = 15,
  fee_external = 22,
  surcharge_external = 5.00,
  updated_at = now()
WHERE is_active = true;
