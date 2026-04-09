-- PROVISIONAL: valores para desenvolvimento e teste inicial
-- Calibrar com dados reais antes de produção

INSERT INTO pricing_profiles (slug, name, base_fare, per_km, per_minute, minimum_fare,
  fee_local, fee_adjacent, fee_external, credit_cost_local, credit_cost_external,
  max_dispatch_km, center_lat, center_lng, radius_km, is_default, updated_at)
VALUES
  ('rio-furnas', 'Furnas / Rio de Janeiro', 4.00, 1.80, 0.25, 7.00,
   7, 12, 20, 1, 2, 12, -22.9700, -43.1800, 30, false, now()),
  ('default', 'Padrão Nacional', 4.50, 2.00, 0.30, 8.00,
   10, 12, 18, 1, 2, 15, NULL, NULL, NULL, true, now())
ON CONFLICT (slug) DO NOTHING;
