-- SQL Queries para Validação - Bug Cadastro Motorista
-- Execute no Supabase SQL Editor ou psql

-- ============================================
-- 1. VERIFICAR MOTORISTAS RECÉM-CADASTRADOS
-- ============================================

-- Listar últimos 10 motoristas cadastrados
SELECT 
  id,
  name,
  email,
  status,
  password_hash IS NOT NULL as has_password,
  created_at
FROM drivers
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- 2. VERIFICAR MOTORISTAS PENDENTES
-- ============================================

-- Contar motoristas por status
SELECT 
  status,
  COUNT(*) as total
FROM drivers
GROUP BY status
ORDER BY total DESC;

-- Listar motoristas pendentes de aprovação
SELECT 
  id,
  name,
  email,
  phone,
  created_at,
  EXTRACT(EPOCH FROM (NOW() - created_at))/3600 as hours_waiting
FROM drivers
WHERE status = 'pending'
ORDER BY created_at DESC;

-- ============================================
-- 3. APROVAR MOTORISTA PARA TESTE
-- ============================================

-- Aprovar motorista específico por email
UPDATE drivers 
SET 
  status = 'approved',
  approved_at = NOW(),
  approved_by = 'admin-test',
  updated_at = NOW()
WHERE email = 'SEU_EMAIL_DE_TESTE@kaviar.com';

-- Aprovar motorista específico por ID
UPDATE drivers 
SET 
  status = 'approved',
  approved_at = NOW(),
  approved_by = 'admin-test',
  updated_at = NOW()
WHERE id = 'SEU_ID_AQUI';

-- ============================================
-- 4. VERIFICAR SENHA CRIADA
-- ============================================

-- Verificar se motoristas têm senha
SELECT 
  id,
  name,
  email,
  status,
  CASE 
    WHEN password_hash IS NULL THEN '❌ SEM SENHA'
    WHEN LENGTH(password_hash) > 0 THEN '✅ COM SENHA'
    ELSE '⚠️ SENHA VAZIA'
  END as password_status,
  created_at
FROM drivers
ORDER BY created_at DESC
LIMIT 20;

-- Contar motoristas sem senha (BUG)
SELECT 
  COUNT(*) as motoristas_sem_senha
FROM drivers
WHERE password_hash IS NULL OR password_hash = '';

-- ============================================
-- 5. LIMPAR DADOS DE TESTE
-- ============================================

-- CUIDADO: Deletar motoristas de teste
-- DELETE FROM drivers WHERE email LIKE '%test%@kaviar.com';
-- DELETE FROM drivers WHERE email LIKE '%quicktest%@kaviar.com';

-- Visualizar antes de deletar
SELECT id, name, email, status, created_at
FROM drivers 
WHERE email LIKE '%test%@kaviar.com' 
   OR email LIKE '%quicktest%@kaviar.com'
ORDER BY created_at DESC;

-- ============================================
-- 6. VERIFICAR DUPLICATAS
-- ============================================

-- Encontrar emails duplicados (não deveria existir)
SELECT 
  email,
  COUNT(*) as total
FROM drivers
GROUP BY email
HAVING COUNT(*) > 1;

-- ============================================
-- 7. AUDITORIA DE CADASTROS
-- ============================================

-- Cadastros nas últimas 24 horas
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as cadastros,
  COUNT(CASE WHEN password_hash IS NOT NULL THEN 1 END) as com_senha,
  COUNT(CASE WHEN password_hash IS NULL THEN 1 END) as sem_senha
FROM drivers
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;

-- ============================================
-- 8. VERIFICAR FLUXO COMPLETO
-- ============================================

-- Verificar motorista específico (substitua o email)
SELECT 
  id,
  name,
  email,
  phone,
  status,
  password_hash IS NOT NULL as has_password,
  LENGTH(password_hash) as password_length,
  created_at,
  updated_at,
  approved_at,
  approved_by
FROM drivers
WHERE email = 'SEU_EMAIL_AQUI@kaviar.com';

-- ============================================
-- 9. RESETAR STATUS PARA TESTE
-- ============================================

-- Voltar motorista para pending (para testar login com 403)
UPDATE drivers 
SET 
  status = 'pending',
  approved_at = NULL,
  approved_by = NULL,
  updated_at = NOW()
WHERE email = 'SEU_EMAIL_DE_TESTE@kaviar.com';

-- ============================================
-- 10. ESTATÍSTICAS GERAIS
-- ============================================

-- Dashboard de motoristas
SELECT 
  COUNT(*) as total_motoristas,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendentes,
  COUNT(CASE WHEN status = 'approved' THEN 1 END) as aprovados,
  COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejeitados,
  COUNT(CASE WHEN status = 'suspended' THEN 1 END) as suspensos,
  COUNT(CASE WHEN password_hash IS NULL THEN 1 END) as sem_senha,
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as ultimos_7_dias
FROM drivers;

-- ============================================
-- QUERIES ÚTEIS PARA DEBUG
-- ============================================

-- Encontrar motorista por telefone
SELECT id, name, email, phone, status
FROM drivers
WHERE phone LIKE '%999999999%';

-- Encontrar motorista por nome
SELECT id, name, email, phone, status
FROM drivers
WHERE name ILIKE '%test%';

-- Verificar último motorista criado
SELECT *
FROM drivers
ORDER BY created_at DESC
LIMIT 1;

-- ============================================
-- VALIDAÇÃO PÓS-CORREÇÃO
-- ============================================

-- Esta query deve retornar 0 após a correção
-- (motoristas sem senha criados após a correção)
SELECT COUNT(*) as bug_ainda_existe
FROM drivers
WHERE password_hash IS NULL
  AND created_at > '2026-01-18 20:00:00'; -- Data da correção

-- Se retornar > 0, o bug ainda existe!
