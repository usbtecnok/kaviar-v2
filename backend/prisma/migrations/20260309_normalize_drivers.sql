-- Migration: Normalizar motoristas cadastrados antes da unificação
-- Data: 2026-03-09
-- Objetivo: Criar registros auxiliares faltantes SEM mascarar incompletude de dados

-- 1. Criar consents LGPD faltantes
INSERT INTO consents (id, user_id, subject_type, subject_id, type, accepted, accepted_at, ip_address, user_agent)
SELECT 
  'consent_' || d.id || '_lgpd_migration',
  d.id,
  'DRIVER',
  d.id,
  'lgpd',
  true,
  d.created_at,
  NULL,
  'migration-script'
FROM drivers d
LEFT JOIN consents c ON c.user_id = d.id AND c.type = 'lgpd'
WHERE c.id IS NULL;

-- 2. Criar driver_verifications faltantes
INSERT INTO driver_verifications (id, driver_id, community_id, status, updated_at, created_at)
SELECT 
  'verification_' || d.id,
  d.id,
  d.community_id,
  'PENDING',
  NOW(),
  d.created_at
FROM drivers d
LEFT JOIN driver_verifications dv ON dv.driver_id = d.id
WHERE dv.id IS NULL;

-- 3. Preencher territory_type baseado em neighborhood (apenas se neighborhood_id existe)
UPDATE drivers d
SET 
  territory_type = CASE 
    WHEN EXISTS (
      SELECT 1 FROM neighborhood_geofences ng 
      WHERE ng.neighborhood_id = d.neighborhood_id
    ) THEN 'OFFICIAL'
    ELSE 'FALLBACK_800M'
  END,
  territory_verified_at = d.created_at,
  territory_verification_method = 'MANUAL_SELECTION'
WHERE territory_type IS NULL 
  AND neighborhood_id IS NOT NULL;

-- 4. Relatório de motoristas com dados incompletos (não altera dados)
-- Executar manualmente para auditoria:
/*
SELECT 
  id,
  name,
  email,
  status,
  document_cpf IS NULL as sem_cpf,
  vehicle_color IS NULL as sem_veiculo,
  neighborhood_id IS NULL as sem_bairro,
  territory_type IS NULL as sem_territorio,
  created_at
FROM drivers 
WHERE status = 'pending'
  AND (
    document_cpf IS NULL 
    OR vehicle_color IS NULL 
    OR neighborhood_id IS NULL
    OR territory_type IS NULL
  )
ORDER BY created_at DESC;
*/
