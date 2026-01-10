#!/usr/bin/env node

/**
 * Módulo de busca de polígonos oficiais do RJ
 * Integra com OpenStreetMap Nominatim API para buscar geometrias
 */

import fetch from 'node-fetch';

// Configuração OSM Nominatim
const OSM_BASE = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'KAVIAR-RJ-Geofence-Pipeline/1.0';

/**
 * Buscar polígono no OpenStreetMap
 */
async function searchOSMPolygon(communityName) {
  try {
    // Construir query de busca
    const searchTerms = [
      `${communityName}, Rio de Janeiro, Brasil`,
      `${communityName}, RJ, Brasil`,
      `Bairro ${communityName}, Rio de Janeiro`
    ];
    
    for (const query of searchTerms) {
      console.log(`    🔍 OSM: "${query}"`);
      
      const response = await fetch(`${OSM_BASE}/search?` + new URLSearchParams({
        q: query,
        format: 'geojson',
        polygon_geojson: '1',
        addressdetails: '1',
        limit: '5',
        countrycodes: 'br'
      }), {
        headers: {
          'User-Agent': USER_AGENT
        }
      });
      
      if (!response.ok) {
        console.warn(`    ⚠️ OSM HTTP ${response.status}`);
        continue;
      }
      
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        // Filtrar resultados relevantes
        const candidates = data.features.filter(feature => {
          const props = feature.properties;
          const address = props.address || {};
          
          // Deve estar no Rio de Janeiro
          const isRJ = address.city === 'Rio de Janeiro' || 
                      address.state === 'Rio de Janeiro' ||
                      props.display_name?.includes('Rio de Janeiro');
          
          // Deve ter geometria Polygon
          const hasPolygon = feature.geometry?.type === 'Polygon' || 
                           feature.geometry?.type === 'MultiPolygon';
          
          // Deve ser área (não ponto)
          const isArea = props.osm_type === 'way' || props.osm_type === 'relation';
          
          return isRJ && hasPolygon && isArea;
        });
        
        if (candidates.length > 0) {
          const best = candidates[0]; // Primeiro resultado (melhor score)
          
          console.log(`    ✅ OSM encontrado: ${best.properties.display_name}`);
          console.log(`    📍 Tipo: ${best.geometry.type}, OSM: ${best.properties.osm_type}/${best.properties.osm_id}`);
          
          return {
            type: best.geometry.type,
            coordinates: best.geometry.coordinates,
            source: `OSM_${best.properties.osm_type}_${best.properties.osm_id}`,
            confidence: calculateOSMConfidence(best, communityName),
            metadata: {
              osm_id: best.properties.osm_id,
              osm_type: best.properties.osm_type,
              display_name: best.properties.display_name,
              place_rank: best.properties.place_rank,
              importance: best.properties.importance
            }
          };
        }
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`    📭 OSM: Nenhum polígono encontrado`);
    return null;
    
  } catch (error) {
    console.warn(`    ❌ OSM erro: ${error.message}`);
    return null;
  }
}

/**
 * Calcular confiança do resultado OSM
 */
function calculateOSMConfidence(feature, searchName) {
  let confidence = 0.5; // Base
  
  const props = feature.properties;
  const displayName = props.display_name?.toLowerCase() || '';
  const searchLower = searchName.toLowerCase();
  
  // Boost se nome exato
  if (displayName.includes(searchLower)) {
    confidence += 0.3;
  }
  
  // Boost por importância OSM
  if (props.importance) {
    confidence += Math.min(props.importance * 0.2, 0.2);
  }
  
  // Boost por rank (menor = melhor)
  if (props.place_rank && props.place_rank <= 20) {
    confidence += 0.1;
  }
  
  // Boost por tipo de geometria
  if (feature.geometry.type === 'Polygon') {
    confidence += 0.1;
  }
  
  return Math.min(confidence, 1.0);
}

/**
 * Buscar em múltiplas fontes (extensível)
 */
async function fetchOfficialPolygon(communityName) {
  console.log(`🔍 Buscando polígono oficial para: ${communityName}`);
  
  // 1. Tentar OpenStreetMap
  const osmResult = await searchOSMPolygon(communityName);
  if (osmResult) {
    return osmResult;
  }
  
  // 2. TODO: Adicionar outras fontes
  // - Prefeitura RJ (se tiver API)
  // - IBGE (malhas territoriais)
  // - Dados locais
  
  return null;
}

export { fetchOfficialPolygon, searchOSMPolygon };
