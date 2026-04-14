-- KAVIAR Test Users Creation Script
-- Execute este script no banco de dados para criar usuários de teste

-- 1. Admin de teste
INSERT INTO admins (id, name, email, password_hash, is_active, role_id, created_at, updated_at)
VALUES (
  'admin-test-001',
  'Admin Teste',
  'admin@kaviar.com',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: admin123
  true,
  'role-admin-001',
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- 2. Role admin (se não existir)
INSERT INTO roles (id, name, created_at, updated_at)
VALUES (
  'role-admin-001',
  'admin',
  NOW(),
  NOW()
) ON CONFLICT (name) DO NOTHING;

-- 3. Passageiro de teste (com LGPD aceito)
INSERT INTO passengers (id, name, email, password_hash, phone, status, created_at, updated_at)
VALUES (
  'passenger-test-001',
  'Passageiro Teste',
  'passenger@test.com',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: pass123
  '(21) 99999-0001',
  'ACTIVE',
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- 4. Consentimento LGPD para passageiro
INSERT INTO user_consents (id, passenger_id, consent_type, accepted, accepted_at, ip_address, created_at)
VALUES (
  'consent-lgpd-001',
  'passenger-test-001',
  'LGPD',
  true,
  NOW(),
  '127.0.0.1',
  NOW()
) ON CONFLICT (passenger_id, consent_type) DO NOTHING;

-- 5. Motorista de teste (pendente de aprovação)
INSERT INTO drivers (id, name, email, password_hash, phone, status, document_cpf, document_rg, document_cnh, vehicle_plate, vehicle_model, created_at, updated_at)
VALUES (
  'driver-test-001',
  'Motorista Teste',
  'driver@test.com',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: driver123
  '(21) 99999-0002',
  'pending',
  '123.456.789-00',
  '12.345.678-9',
  '12345678901',
  'ABC-1234',
  'Honda Civic 2020',
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- 6. Guia turístico de teste (pendente de aprovação)
INSERT INTO tourist_guides (id, name, email, phone, status, is_bilingual, languages, also_driver, created_at, updated_at)
VALUES (
  'guide-test-001',
  'Guia Teste',
  'guide@test.com',
  '(21) 99999-0003',
  'pending',
  true,
  ARRAY['Português', 'Inglês', 'Espanhol'],
  false,
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- Verificar se os usuários foram criados
SELECT 'ADMIN' as type, name, email, is_active as status FROM admins WHERE email = 'admin@kaviar.com'
UNION ALL
SELECT 'PASSENGER' as type, name, email, status FROM passengers WHERE email = 'passenger@test.com'
UNION ALL
SELECT 'DRIVER' as type, name, email, status FROM drivers WHERE email = 'driver@test.com'
UNION ALL
SELECT 'GUIDE' as type, name, email, status FROM tourist_guides WHERE email = 'guide@test.com';

-- Verificar consentimento LGPD
SELECT 'LGPD_CONSENT' as type, passenger_id, consent_type, accepted, accepted_at 
FROM user_consents 
WHERE passenger_id = 'passenger-test-001' AND consent_type = 'LGPD';
