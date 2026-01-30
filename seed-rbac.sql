-- RBAC Seed - Idempotente
-- Senhas temporárias: SUPER_ADMIN=z4939ia4, ANGEL_VIEWER=12332100
-- Usuários DEVEM trocar senha no primeiro login

BEGIN;

-- 1. Adicionar colunas se não existirem
ALTER TABLE admins 
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP;

-- 2. Criar roles
INSERT INTO roles (id, name, created_at, updated_at)
VALUES 
  ('super-admin', 'SUPER_ADMIN', NOW(), NOW()),
  ('angel-viewer', 'ANGEL_VIEWER', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- 3. Criar SUPER_ADMIN (senha temporária: z4939ia4)
INSERT INTO admins (id, name, email, password_hash, is_active, role_id, must_change_password, created_at, updated_at)
VALUES 
  (
    'admin-suporte',
    'Suporte USB Tecnok',
    'suporte@usbtecnok.com.br',
    '$2b$10$dKrn9Ma7uEvJD2o7U7cRjOgj0KPd89vQwLdbdBzDXWzdKyAd1wxja',
    true,
    'super-admin',
    true,
    NOW(),
    NOW()
  ),
  (
    'admin-financeiro',
    'Financeiro USB Tecnok',
    'financeiro@usbtecnok.com.br',
    '$2b$10$dKrn9Ma7uEvJD2o7U7cRjOgj0KPd89vQwLdbdBzDXWzdKyAd1wxja',
    true,
    'super-admin',
    true,
    NOW(),
    NOW()
  )
ON CONFLICT (email) DO UPDATE SET 
  role_id = EXCLUDED.role_id,
  password_hash = EXCLUDED.password_hash,
  must_change_password = true,
  is_active = true;

-- 4. Criar ANGEL_VIEWER (senha temporária: 12332100)
INSERT INTO admins (id, name, email, password_hash, is_active, role_id, must_change_password, created_at, updated_at)
VALUES 
  ('angel-01', 'Investidor Anjo 1', 'angel1@kaviar.com', '$2b$10$dZq3MoW9TBbNpFpDe//6Z.k47hO8T7eiklU3LTkrKlLg6jr.vkMdS', true, 'angel-viewer', true, NOW(), NOW()),
  ('angel-02', 'Investidor Anjo 2', 'angel2@kaviar.com', '$2b$10$dZq3MoW9TBbNpFpDe//6Z.k47hO8T7eiklU3LTkrKlLg6jr.vkMdS', true, 'angel-viewer', true, NOW(), NOW()),
  ('angel-03', 'Investidor Anjo 3', 'angel3@kaviar.com', '$2b$10$dZq3MoW9TBbNpFpDe//6Z.k47hO8T7eiklU3LTkrKlLg6jr.vkMdS', true, 'angel-viewer', true, NOW(), NOW()),
  ('angel-04', 'Investidor Anjo 4', 'angel4@kaviar.com', '$2b$10$dZq3MoW9TBbNpFpDe//6Z.k47hO8T7eiklU3LTkrKlLg6jr.vkMdS', true, 'angel-viewer', true, NOW(), NOW()),
  ('angel-05', 'Investidor Anjo 5', 'angel5@kaviar.com', '$2b$10$dZq3MoW9TBbNpFpDe//6Z.k47hO8T7eiklU3LTkrKlLg6jr.vkMdS', true, 'angel-viewer', true, NOW(), NOW()),
  ('angel-06', 'Investidor Anjo 6', 'angel6@kaviar.com', '$2b$10$dZq3MoW9TBbNpFpDe//6Z.k47hO8T7eiklU3LTkrKlLg6jr.vkMdS', true, 'angel-viewer', true, NOW(), NOW()),
  ('angel-07', 'Investidor Anjo 7', 'angel7@kaviar.com', '$2b$10$dZq3MoW9TBbNpFpDe//6Z.k47hO8T7eiklU3LTkrKlLg6jr.vkMdS', true, 'angel-viewer', true, NOW(), NOW()),
  ('angel-08', 'Investidor Anjo 8', 'angel8@kaviar.com', '$2b$10$dZq3MoW9TBbNpFpDe//6Z.k47hO8T7eiklU3LTkrKlLg6jr.vkMdS', true, 'angel-viewer', true, NOW(), NOW()),
  ('angel-09', 'Investidor Anjo 9', 'angel9@kaviar.com', '$2b$10$dZq3MoW9TBbNpFpDe//6Z.k47hO8T7eiklU3LTkrKlLg6jr.vkMdS', true, 'angel-viewer', true, NOW(), NOW()),
  ('angel-10', 'Investidor Anjo 10', 'angel10@kaviar.com', '$2b$10$dZq3MoW9TBbNpFpDe//6Z.k47hO8T7eiklU3LTkrKlLg6jr.vkMdS', true, 'angel-viewer', true, NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET 
  role_id = EXCLUDED.role_id,
  password_hash = EXCLUDED.password_hash,
  must_change_password = true,
  is_active = true;

COMMIT;

-- 5. Verificar
SELECT 
  r.name as role,
  COUNT(a.id) as total_users,
  SUM(CASE WHEN a.must_change_password THEN 1 ELSE 0 END) as must_change_password
FROM roles r
LEFT JOIN admins a ON a.role_id = r.id
WHERE r.name IN ('SUPER_ADMIN', 'ANGEL_VIEWER')
GROUP BY r.name
ORDER BY r.name;
