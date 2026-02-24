-- ============================================
-- KAVIAR — Seed: Definir senhas para drivers de teste
-- Ambiente: kaviar_validation (staging)
-- ============================================

-- Senha: "test123" (bcrypt hash com salt 10)
-- Gerado com: bcrypt.hash('test123', 10)

UPDATE drivers 
SET password_hash = '$2b$10$iD747L2Xgsag.meibEeXpOsiPQSuzwrqv6NHkR2Ly.2bPOk7TU..i'
WHERE email IN (
  'test-driver-1@kaviar.com',
  'test-driver-2@kaviar.com'
)
AND (password_hash IS NULL OR password_hash = '');

-- Verificar
SELECT id, name, email, status, 
       CASE WHEN password_hash IS NOT NULL THEN 'SIM' ELSE 'NÃO' END as tem_senha
FROM drivers
WHERE email LIKE '%test-driver%'
ORDER BY email;
