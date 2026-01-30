#!/bin/bash
# Seed RBAC via API endpoint
set -euo pipefail

source /home/goes/kaviar/aws-resources.env

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  SEED RBAC VIA API                                         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Criar endpoint temporário no backend para seed
# Por enquanto, vamos executar SQL direto

echo "📋 Execute o SQL manualmente no RDS:"
echo ""
echo "psql \"$DATABASE_URL\" <<'SQL'"
cat <<'SQL'
-- RBAC Seed
INSERT INTO roles (id, name, created_at, updated_at)
VALUES 
  ('super-admin', 'SUPER_ADMIN', NOW(), NOW()),
  ('angel-viewer', 'ANGEL_VIEWER', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

INSERT INTO admins (id, name, email, password_hash, is_active, role_id, created_at, updated_at)
VALUES 
  ('admin-suporte', 'Suporte USB Tecnok', 'suporte@usbtecnok.com.br', '$2b$10$UYp0mX3PI8NE.J0Uy6C9J.7utpar..zWzTvjjiaxsmEeZjfSna0AW', true, 'super-admin', NOW(), NOW()),
  ('admin-financeiro', 'Financeiro USB Tecnok', 'financeiro@usbtecnok.com.br', '$2b$10$UYp0mX3PI8NE.J0Uy6C9J.7utpar..zWzTvjjiaxsmEeZjfSna0AW', true, 'super-admin', NOW(), NOW()),
  ('angel-01', 'Investidor Anjo 1', 'angel1@kaviar.com', '$2b$10$UYp0mX3PI8NE.J0Uy6C9J.7utpar..zWzTvjjiaxsmEeZjfSna0AW', true, 'angel-viewer', NOW(), NOW()),
  ('angel-02', 'Investidor Anjo 2', 'angel2@kaviar.com', '$2b$10$UYp0mX3PI8NE.J0Uy6C9J.7utpar..zWzTvjjiaxsmEeZjfSna0AW', true, 'angel-viewer', NOW(), NOW()),
  ('angel-03', 'Investidor Anjo 3', 'angel3@kaviar.com', '$2b$10$UYp0mX3PI8NE.J0Uy6C9J.7utpar..zWzTvjjiaxsmEeZjfSna0AW', true, 'angel-viewer', NOW(), NOW()),
  ('angel-04', 'Investidor Anjo 4', 'angel4@kaviar.com', '$2b$10$UYp0mX3PI8NE.J0Uy6C9J.7utpar..zWzTvjjiaxsmEeZjfSna0AW', true, 'angel-viewer', NOW(), NOW()),
  ('angel-05', 'Investidor Anjo 5', 'angel5@kaviar.com', '$2b$10$UYp0mX3PI8NE.J0Uy6C9J.7utpar..zWzTvjjiaxsmEeZjfSna0AW', true, 'angel-viewer', NOW(), NOW()),
  ('angel-06', 'Investidor Anjo 6', 'angel6@kaviar.com', '$2b$10$UYp0mX3PI8NE.J0Uy6C9J.7utpar..zWzTvjjiaxsmEeZjfSna0AW', true, 'angel-viewer', NOW(), NOW()),
  ('angel-07', 'Investidor Anjo 7', 'angel7@kaviar.com', '$2b$10$UYp0mX3PI8NE.J0Uy6C9J.7utpar..zWzTvjjiaxsmEeZjfSna0AW', true, 'angel-viewer', NOW(), NOW()),
  ('angel-08', 'Investidor Anjo 8', 'angel8@kaviar.com', '$2b$10$UYp0mX3PI8NE.J0Uy6C9J.7utpar..zWzTvjjiaxsmEeZjfSna0AW', true, 'angel-viewer', NOW(), NOW()),
  ('angel-09', 'Investidor Anjo 9', 'angel9@kaviar.com', '$2b$10$UYp0mX3PI8NE.J0Uy6C9J.7utpar..zWzTvjjiaxsmEeZjfSna0AW', true, 'angel-viewer', NOW(), NOW()),
  ('angel-10', 'Investidor Anjo 10', 'angel10@kaviar.com', '$2b$10$UYp0mX3PI8NE.J0Uy6C9J.7utpar..zWzTvjjiaxsmEeZjfSna0AW', true, 'angel-viewer', NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET role_id = EXCLUDED.role_id;

SELECT 
  r.name as role,
  COUNT(a.id) as users
FROM roles r
LEFT JOIN admins a ON a.role_id = r.id
WHERE r.name IN ('SUPER_ADMIN', 'ANGEL_VIEWER')
GROUP BY r.name
ORDER BY r.name;
SQL
echo "SQL"
echo ""
echo "✅ Seed SQL pronto para executar"
echo "   Senha: Kaviar2026!Admin"
echo ""
