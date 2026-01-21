-- =====================================================
-- TESTE: Verificar LGPD e Community após upload de docs
-- =====================================================
-- Execute após fazer upload de documentos com:
-- - lgpdAccepted=true
-- - communityId=<uuid>

-- 1. Verificar LGPD consent na tabela consents
SELECT 
  id,
  subject_type,
  subject_id,
  type,
  accepted,
  accepted_at,
  ip_address
FROM consents 
WHERE subject_type = 'DRIVER' 
  AND subject_id = '<DRIVER_ID>' 
  AND type = 'lgpd';

-- Esperado: 1 registro com accepted=true

-- 2. Verificar community_id em driver_verifications
SELECT 
  id,
  driver_id,
  community_id,
  status,
  updated_at
FROM driver_verifications 
WHERE driver_id = '<DRIVER_ID>';

-- Esperado: 1 registro com community_id preenchido

-- 3. Verificar documentos em driver_documents
SELECT 
  type,
  status,
  submitted_at
FROM driver_documents 
WHERE driver_id = '<DRIVER_ID>'
ORDER BY type;

-- Esperado: 6 registros (CPF, RG, CNH, PROOF_OF_ADDRESS, VEHICLE_PHOTO, BACKGROUND_CHECK)
-- Todos com status='SUBMITTED'

-- 4. Verificar elegibilidade (simular o que approval faz)
SELECT 
  'LGPD_CONSENT' as requirement,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM consents 
      WHERE subject_type='DRIVER' 
        AND subject_id='<DRIVER_ID>' 
        AND type='lgpd' 
        AND accepted=true
    ) THEN '✅ OK'
    ELSE '❌ MISSING'
  END as status
UNION ALL
SELECT 
  'COMMUNITY_ASSIGNMENT',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM driver_verifications 
      WHERE driver_id='<DRIVER_ID>' 
        AND community_id IS NOT NULL
    ) THEN '✅ OK'
    ELSE '❌ MISSING'
  END
UNION ALL
SELECT 
  'VEHICLE_COLOR',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM drivers 
      WHERE id='<DRIVER_ID>' 
        AND vehicle_color IS NOT NULL
    ) THEN '✅ OK'
    ELSE '❌ MISSING'
  END;

-- Esperado: Todos com status='✅ OK'
