-- =====================================================
-- FIX: Garantir que neighborhoods.city está preenchido
-- =====================================================
-- ⚠️ ATENÇÃO: NÃO EXECUTAR UPDATE SEM VALIDAR PRIMEIRO
-- =====================================================

-- 1. VERIFICAÇÃO DE RISCO: Estado atual por cidade
SELECT 
  city,
  count(*) as total,
  count(*) FILTER (WHERE city IS NULL OR city = '') as sem_city,
  count(*) FILTER (WHERE city IS NOT NULL AND city != '') as com_city
FROM neighborhoods
GROUP BY city
ORDER BY total DESC;

-- 2. Verificar se há bairros de outras cidades (SP, etc)
SELECT 
  CASE 
    WHEN city ILIKE '%são paulo%' OR city ILIKE '%sp%' THEN 'São Paulo'
    WHEN city ILIKE '%rio%' OR city ILIKE '%rj%' THEN 'Rio de Janeiro'
    WHEN city IS NULL OR city = '' THEN 'NULL/VAZIO'
    ELSE city
  END as cidade_grupo,
  count(*) as qtd
FROM neighborhoods
GROUP BY cidade_grupo
ORDER BY qtd DESC;

-- 3. Verificar bairros com city NULL/vazio
SELECT id, name, city, zone, administrative_region
FROM neighborhoods
WHERE city IS NULL OR city = ''
ORDER BY name
LIMIT 20;

-- =====================================================
-- ⚠️ PARAR AQUI E VALIDAR OS RESULTADOS ACIMA
-- =====================================================


-- 4. UPDATE SEGURO (comentado - só descomentar após validar acima)
/*
UPDATE neighborhoods
SET city = 'Rio de Janeiro', updated_at = NOW()
WHERE (city IS NULL OR city = '')
  AND (
    zone ILIKE '%zona%'
    OR administrative_region ILIKE '%AP%'
  );
*/

-- 5. Verificar resultado (após UPDATE)
/*
SELECT 
  count(*) as total,
  count(*) FILTER (WHERE city IS NULL OR city = '') as sem_city,
  count(*) FILTER (WHERE city = 'Rio de Janeiro') as rio
FROM neighborhoods;
*/
