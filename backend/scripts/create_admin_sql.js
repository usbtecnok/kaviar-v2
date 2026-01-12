const bcrypt = require('bcrypt');

async function createAdminHashes() {
  const password = '@#*Z4939ia4';
  const hash = await bcrypt.hash(password, 10);
  
  console.log('ADMIN_PASSWORD_HASH:');
  console.log(hash);
  
  // SQL direto para inserir admins
  console.log('\n=== SQL PARA EXECUTAR MANUALMENTE ===');
  console.log(`
-- Criar role admin se não existir
INSERT INTO roles (id, name, created_at, updated_at) 
VALUES ('admin_role_id', 'admin', NOW(), NOW()) 
ON CONFLICT (name) DO NOTHING;

-- Upsert admin suporte
INSERT INTO admins (id, name, email, password_hash, is_active, role_id, created_at, updated_at)
VALUES ('admin_suporte_id', 'Suporte USB Tecnok', 'suporte@usbtecnok.com.br', '${hash}', true, 'admin_role_id', NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, updated_at = NOW();

-- Upsert admin financeiro  
INSERT INTO admins (id, name, email, password_hash, is_active, role_id, created_at, updated_at)
VALUES ('admin_financeiro_id', 'Financeiro USB Tecnok', 'financeiro@usbtecnok.com.br', '${hash}', true, 'admin_role_id', NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, updated_at = NOW();
  `);
}

createAdminHashes();
