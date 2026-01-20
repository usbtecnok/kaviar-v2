-- Script SQL para verificar documentos de um motorista
-- Execute no Supabase SQL Editor ou psql

-- 1. Listar motoristas recentes
SELECT id, name, email, status, created_at 
FROM drivers 
ORDER BY created_at DESC 
LIMIT 5;

-- 2. Para um driver específico, verificar documentos em driver_documents
-- Substitua 'DRIVER_ID_AQUI' pelo ID real
SELECT 
  id,
  driver_id,
  type,
  status,
  file_url,
  submitted_at,
  created_at
FROM driver_documents
WHERE driver_id = 'DRIVER_ID_AQUI'
ORDER BY created_at DESC;

-- 3. Verificar documentos em driver_compliance_documents
SELECT 
  id,
  driver_id,
  type,
  status,
  file_url,
  lgpd_consent_accepted,
  created_at
FROM driver_compliance_documents
WHERE driver_id = 'DRIVER_ID_AQUI'
ORDER BY created_at DESC;

-- 4. Contar documentos por tipo para todos os drivers
SELECT 
  type,
  status,
  COUNT(*) as total
FROM driver_documents
GROUP BY type, status
ORDER BY type, status;
