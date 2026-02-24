#!/bin/bash
# KAVIAR - Análise Piloto Furnas/Agrícola/Mata Machado
# Data: 2026-02-21

set -e

echo "=== KAVIAR PILOTO - ANÁLISE DE TERRITÓRIO ==="
echo ""

# Carregar credenciais do banco
if [ -f ~/kaviar/backend/.env ]; then
  export $(cat ~/kaviar/backend/.env | grep DATABASE_URL | xargs)
fi

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL não encontrada"
  exit 1
fi

echo "✅ Conectado ao banco"
echo ""

# 1. VERIFICAR COMUNIDADES EXISTENTES
echo "=== 1. COMUNIDADES CADASTRADAS (Furnas/Agrícola/Mata Machado) ==="
psql "$DATABASE_URL" -c "
SELECT 
  id,
  name,
  is_active,
  center_lat,
  center_lng,
  radius_meters,
  CASE WHEN geofence IS NOT NULL THEN 'SIM' ELSE 'NÃO' END as tem_geofence_legacy
FROM communities
WHERE LOWER(name) LIKE '%furnas%' 
   OR LOWER(name) LIKE '%agricola%' 
   OR LOWER(name) LIKE '%mata machado%'
ORDER BY name;
" 2>&1

echo ""

# 2. VERIFICAR GEOFENCES POSTGIS
echo "=== 2. GEOFENCES POSTGIS (community_geofences) ==="
psql "$DATABASE_URL" -c "
SELECT 
  cg.id,
  c.name as community_name,
  cg.center_lat,
  cg.center_lng,
  cg.source,
  cg.confidence,
  cg.is_verified,
  CASE WHEN cg.geom IS NOT NULL THEN 'SIM' ELSE 'NÃO' END as tem_geom_postgis
FROM community_geofences cg
JOIN communities c ON c.id = cg.community_id
WHERE LOWER(c.name) LIKE '%furnas%' 
   OR LOWER(c.name) LIKE '%agricola%' 
   OR LOWER(c.name) LIKE '%mata machado%'
ORDER BY c.name;
" 2>&1

echo ""

# 3. VERIFICAR NEIGHBORHOODS (bairros)
echo "=== 3. NEIGHBORHOODS (Bairros de BH) ==="
psql "$DATABASE_URL" -c "
SELECT 
  id,
  name,
  city,
  is_active,
  center_lat,
  center_lng
FROM neighborhoods
WHERE city = 'Belo Horizonte'
  AND (
    LOWER(name) LIKE '%furnas%' 
    OR LOWER(name) LIKE '%agricola%' 
    OR LOWER(name) LIKE '%mata machado%'
  )
ORDER BY name;
" 2>&1

echo ""

# 4. VERIFICAR NEIGHBORHOOD_GEOFENCES
echo "=== 4. NEIGHBORHOOD GEOFENCES (PostGIS) ==="
psql "$DATABASE_URL" -c "
SELECT 
  ng.id,
  n.name as neighborhood_name,
  n.city,
  ng.center_lat,
  ng.center_lng,
  ng.source,
  CASE WHEN ng.geom IS NOT NULL THEN 'SIM' ELSE 'NÃO' END as tem_geom_postgis
FROM neighborhood_geofences ng
JOIN neighborhoods n ON n.id = ng.neighborhood_id
WHERE n.city = 'Belo Horizonte'
  AND (
    LOWER(n.name) LIKE '%furnas%' 
    OR LOWER(n.name) LIKE '%agricola%' 
    OR LOWER(n.name) LIKE '%mata machado%'
  )
ORDER BY n.name;
" 2>&1

echo ""

# 5. CONTAR TOTAIS
echo "=== 5. RESUMO GERAL ==="
psql "$DATABASE_URL" -c "
SELECT 
  'Communities Total' as tipo,
  COUNT(*) as total,
  SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as ativos
FROM communities
UNION ALL
SELECT 
  'Communities com Geofence PostGIS' as tipo,
  COUNT(*) as total,
  COUNT(*) as ativos
FROM community_geofences
WHERE geom IS NOT NULL
UNION ALL
SELECT 
  'Neighborhoods Total (BH)' as tipo,
  COUNT(*) as total,
  SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as ativos
FROM neighborhoods
WHERE city = 'Belo Horizonte'
UNION ALL
SELECT 
  'Neighborhoods com Geofence PostGIS (BH)' as tipo,
  COUNT(*) as total,
  COUNT(*) as ativos
FROM neighborhood_geofences ng
JOIN neighborhoods n ON n.id = ng.neighborhood_id
WHERE n.city = 'Belo Horizonte' AND ng.geom IS NOT NULL;
" 2>&1

echo ""
echo "=== ANÁLISE CONCLUÍDA ==="
