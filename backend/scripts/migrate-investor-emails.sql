-- ============================================================================
-- SCRIPT DE MIGRAÇÃO DE EMAILS DE INVESTIDORES/ANJOS
-- ============================================================================
-- Objetivo: Atualizar emails de contas read-only para emails reais
-- Modo: UPSERT (cria se não existe, atualiza se existe)
-- Segurança: Não deleta contas antigas, mantém histórico
-- ============================================================================

-- INSTRUÇÕES:
-- 1. Substitua os placeholders <EMAIL_REAL_X> pelos emails reais
-- 2. Execute este script no banco de dados de produção
-- 3. Valide com: SELECT email, name, role FROM admins WHERE role IN ('INVESTOR_VIEW', 'ANGEL_VIEWER');

-- ============================================================================
-- INVESTIDORES (INVESTOR_VIEW)
-- ============================================================================

INSERT INTO admins (id, email, name, role, password, must_change_password, active, created_at, updated_at)
VALUES 
  (gen_random_uuid(), '<EMAIL_REAL_INVESTIDOR_1>', 'Investidor 1', 'INVESTOR_VIEW', '$2a$10$placeholder', true, true, NOW(), NOW())
ON CONFLICT (email) 
DO UPDATE SET 
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  must_change_password = true,
  active = true,
  updated_at = NOW();

INSERT INTO admins (id, email, name, role, password, must_change_password, active, created_at, updated_at)
VALUES 
  (gen_random_uuid(), '<EMAIL_REAL_INVESTIDOR_2>', 'Investidor 2', 'INVESTOR_VIEW', '$2a$10$placeholder', true, true, NOW(), NOW())
ON CONFLICT (email) 
DO UPDATE SET 
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  must_change_password = true,
  active = true,
  updated_at = NOW();

INSERT INTO admins (id, email, name, role, password, must_change_password, active, created_at, updated_at)
VALUES 
  (gen_random_uuid(), '<EMAIL_REAL_INVESTIDOR_3>', 'Investidor 3', 'INVESTOR_VIEW', '$2a$10$placeholder', true, true, NOW(), NOW())
ON CONFLICT (email) 
DO UPDATE SET 
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  must_change_password = true,
  active = true,
  updated_at = NOW();

INSERT INTO admins (id, email, name, role, password, must_change_password, active, created_at, updated_at)
VALUES 
  (gen_random_uuid(), '<EMAIL_REAL_INVESTIDOR_4>', 'Investidor 4', 'INVESTOR_VIEW', '$2a$10$placeholder', true, true, NOW(), NOW())
ON CONFLICT (email) 
DO UPDATE SET 
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  must_change_password = true,
  active = true,
  updated_at = NOW();

INSERT INTO admins (id, email, name, role, password, must_change_password, active, created_at, updated_at)
VALUES 
  (gen_random_uuid(), '<EMAIL_REAL_INVESTIDOR_5>', 'Investidor 5', 'INVESTOR_VIEW', '$2a$10$placeholder', true, true, NOW(), NOW())
ON CONFLICT (email) 
DO UPDATE SET 
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  must_change_password = true,
  active = true,
  updated_at = NOW();

INSERT INTO admins (id, email, name, role, password, must_change_password, active, created_at, updated_at)
VALUES 
  (gen_random_uuid(), '<EMAIL_REAL_INVESTIDOR_6>', 'Investidor 6', 'INVESTOR_VIEW', '$2a$10$placeholder', true, true, NOW(), NOW())
ON CONFLICT (email) 
DO UPDATE SET 
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  must_change_password = true,
  active = true,
  updated_at = NOW();

INSERT INTO admins (id, email, name, role, password, must_change_password, active, created_at, updated_at)
VALUES 
  (gen_random_uuid(), '<EMAIL_REAL_INVESTIDOR_7>', 'Investidor 7', 'INVESTOR_VIEW', '$2a$10$placeholder', true, true, NOW(), NOW())
ON CONFLICT (email) 
DO UPDATE SET 
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  must_change_password = true,
  active = true,
  updated_at = NOW();

INSERT INTO admins (id, email, name, role, password, must_change_password, active, created_at, updated_at)
VALUES 
  (gen_random_uuid(), '<EMAIL_REAL_INVESTIDOR_8>', 'Investidor 8', 'INVESTOR_VIEW', '$2a$10$placeholder', true, true, NOW(), NOW())
ON CONFLICT (email) 
DO UPDATE SET 
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  must_change_password = true,
  active = true,
  updated_at = NOW();

INSERT INTO admins (id, email, name, role, password, must_change_password, active, created_at, updated_at)
VALUES 
  (gen_random_uuid(), '<EMAIL_REAL_INVESTIDOR_9>', 'Investidor 9', 'INVESTOR_VIEW', '$2a$10$placeholder', true, true, NOW(), NOW())
ON CONFLICT (email) 
DO UPDATE SET 
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  must_change_password = true,
  active = true,
  updated_at = NOW();

INSERT INTO admins (id, email, name, role, password, must_change_password, active, created_at, updated_at)
VALUES 
  (gen_random_uuid(), '<EMAIL_REAL_INVESTIDOR_10>', 'Investidor 10', 'INVESTOR_VIEW', '$2a$10$placeholder', true, true, NOW(), NOW())
ON CONFLICT (email) 
DO UPDATE SET 
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  must_change_password = true,
  active = true,
  updated_at = NOW();

-- ============================================================================
-- ANJOS (ANGEL_VIEWER)
-- ============================================================================

INSERT INTO admins (id, email, name, role, password, must_change_password, active, created_at, updated_at)
VALUES 
  (gen_random_uuid(), '<EMAIL_REAL_ANGEL_1>', 'Angel Viewer 01', 'ANGEL_VIEWER', '$2a$10$placeholder', true, true, NOW(), NOW())
ON CONFLICT (email) 
DO UPDATE SET 
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  must_change_password = true,
  active = true,
  updated_at = NOW();

INSERT INTO admins (id, email, name, role, password, must_change_password, active, created_at, updated_at)
VALUES 
  (gen_random_uuid(), '<EMAIL_REAL_ANGEL_2>', 'Angel Viewer 02', 'ANGEL_VIEWER', '$2a$10$placeholder', true, true, NOW(), NOW())
ON CONFLICT (email) 
DO UPDATE SET 
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  must_change_password = true,
  active = true,
  updated_at = NOW();

INSERT INTO admins (id, email, name, role, password, must_change_password, active, created_at, updated_at)
VALUES 
  (gen_random_uuid(), '<EMAIL_REAL_ANGEL_3>', 'Angel Viewer 03', 'ANGEL_VIEWER', '$2a$10$placeholder', true, true, NOW(), NOW())
ON CONFLICT (email) 
DO UPDATE SET 
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  must_change_password = true,
  active = true,
  updated_at = NOW();

INSERT INTO admins (id, email, name, role, password, must_change_password, active, created_at, updated_at)
VALUES 
  (gen_random_uuid(), '<EMAIL_REAL_ANGEL_4>', 'Angel Viewer 04', 'ANGEL_VIEWER', '$2a$10$placeholder', true, true, NOW(), NOW())
ON CONFLICT (email) 
DO UPDATE SET 
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  must_change_password = true,
  active = true,
  updated_at = NOW();

INSERT INTO admins (id, email, name, role, password, must_change_password, active, created_at, updated_at)
VALUES 
  (gen_random_uuid(), '<EMAIL_REAL_ANGEL_5>', 'Angel Viewer 05', 'ANGEL_VIEWER', '$2a$10$placeholder', true, true, NOW(), NOW())
ON CONFLICT (email) 
DO UPDATE SET 
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  must_change_password = true,
  active = true,
  updated_at = NOW();

INSERT INTO admins (id, email, name, role, password, must_change_password, active, created_at, updated_at)
VALUES 
  (gen_random_uuid(), '<EMAIL_REAL_ANGEL_6>', 'Angel Viewer 06', 'ANGEL_VIEWER', '$2a$10$placeholder', true, true, NOW(), NOW())
ON CONFLICT (email) 
DO UPDATE SET 
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  must_change_password = true,
  active = true,
  updated_at = NOW();

INSERT INTO admins (id, email, name, role, password, must_change_password, active, created_at, updated_at)
VALUES 
  (gen_random_uuid(), '<EMAIL_REAL_ANGEL_7>', 'Angel Viewer 07', 'ANGEL_VIEWER', '$2a$10$placeholder', true, true, NOW(), NOW())
ON CONFLICT (email) 
DO UPDATE SET 
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  must_change_password = true,
  active = true,
  updated_at = NOW();

INSERT INTO admins (id, email, name, role, password, must_change_password, active, created_at, updated_at)
VALUES 
  (gen_random_uuid(), '<EMAIL_REAL_ANGEL_8>', 'Angel Viewer 08', 'ANGEL_VIEWER', '$2a$10$placeholder', true, true, NOW(), NOW())
ON CONFLICT (email) 
DO UPDATE SET 
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  must_change_password = true,
  active = true,
  updated_at = NOW();

INSERT INTO admins (id, email, name, role, password, must_change_password, active, created_at, updated_at)
VALUES 
  (gen_random_uuid(), '<EMAIL_REAL_ANGEL_9>', 'Angel Viewer 09', 'ANGEL_VIEWER', '$2a$10$placeholder', true, true, NOW(), NOW())
ON CONFLICT (email) 
DO UPDATE SET 
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  must_change_password = true,
  active = true,
  updated_at = NOW();

INSERT INTO admins (id, email, name, role, password, must_change_password, active, created_at, updated_at)
VALUES 
  (gen_random_uuid(), '<EMAIL_REAL_ANGEL_10>', 'Angel Viewer 10', 'ANGEL_VIEWER', '$2a$10$placeholder', true, true, NOW(), NOW())
ON CONFLICT (email) 
DO UPDATE SET 
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  must_change_password = true,
  active = true,
  updated_at = NOW();

-- ============================================================================
-- VALIDAÇÃO PÓS-EXECUÇÃO
-- ============================================================================
-- Execute para verificar:
-- SELECT email, name, role, must_change_password, active FROM admins WHERE role IN ('INVESTOR_VIEW', 'ANGEL_VIEWER') ORDER BY role, email;
