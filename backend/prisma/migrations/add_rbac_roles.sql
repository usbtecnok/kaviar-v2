-- RBAC Admin: Criar roles SUPER_ADMIN e ANGEL_VIEWER

-- Inserir roles se não existirem
INSERT INTO roles (id, name, created_at, updated_at)
VALUES 
  ('super-admin', 'SUPER_ADMIN', NOW(), NOW()),
  ('angel-viewer', 'ANGEL_VIEWER', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Criar admins SUPER_ADMIN
INSERT INTO admins (id, name, email, password_hash, is_active, role_id, created_at, updated_at)
VALUES 
  (
    'admin-suporte',
    'Suporte USB Tecnok',
    'suporte@usbtecnok.com.br',
    '$2b$10$YourHashedPasswordHere', -- Será atualizado pelo seed
    true,
    'super-admin',
    NOW(),
    NOW()
  ),
  (
    'admin-financeiro',
    'Financeiro USB Tecnok',
    'financeiro@usbtecnok.com.br',
    '$2b$10$YourHashedPasswordHere', -- Será atualizado pelo seed
    true,
    'super-admin',
    NOW(),
    NOW()
  )
ON CONFLICT (email) DO UPDATE SET role_id = 'super-admin';

-- Comentário: Investidores anjo serão criados via seed script
