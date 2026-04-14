-- Adicionar passageiros beta à allowlist no RDS
INSERT INTO feature_flag_allowlist (key, passenger_id, created_at)
VALUES 
  ('passenger_favorites_matching', 'pass_1769968889345_6o21yd4z8', NOW()),
  ('passenger_favorites_matching', 'pass_1769968890164_d5kpel78r', NOW())
ON CONFLICT (key, passenger_id) DO NOTHING;

-- Verificar
SELECT * FROM feature_flag_allowlist WHERE key = 'passenger_favorites_matching';
