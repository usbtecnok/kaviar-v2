#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const RJ_PRIORITY_NEIGHBORHOODS = [
  'Botafogo', 'Centro', 'Tijuca', 'Ipanema', 'Copacabana', 'Leblon',
  'Flamengo', 'Laranjeiras', 'Urca', 'Leme', 'Catete', 'Glória',
  'Santa Teresa', 'Lapa', 'Gávea', 'Jardim Botânico', 'Humaitá',
  'Lagoa', 'São Cristóvão', 'Maracanã', 'Vila Isabel', 'Grajaú',
  'Andaraí', 'Praça da Bandeira', 'Estácio', 'Rio Comprido',
  'Cidade Nova', 'Gamboa', 'Santo Cristo', 'Saúde', 'Catumbi',
  'Barra da Tijuca', 'Jacarepaguá', 'Anil', 'Itanhangá'
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchCommunities() {
  const response = await fetch('https://kaviar-v2.onrender.com/api/governance/communities');
  const data = await response.json();
  return data.data || [];
}

async function checkGeofenceStatus(communityId) {
  try {
    const response = await fetch(`https://kaviar-v2.onrender.com/api/governance/communities/${communityId}/geofence`);
    const data = await response.json();
    return data.data?.geometry?.type || 'SEM_DADOS';
  } catch (error) {
    return 'SEM_DADOS';
  }
}

function isRJCommunity(community) {
  const desc = community.description || '';
  const name = community.name || '';
  
  // Filtro robusto: descrição contém RJ E nome está na lista prioritária
  return desc.includes('Rio de Janeiro') && RJ_PRIORITY_NEIGHBORHOODS.includes(name);
}

async function searchPolygonGeofence(community) {
  const searchQuery = `${community.name}, Rio de Janeiro, Brazil`;
  
  try {
    console.log(`🔍 ${searchQuery}`);
    
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&polygon_geojson=1&limit=3&addressdetails=1`;
    
    const response = await fetch(url, {
      headers: { 'User-Agent': 'KAVIAR-RJ-Batch/1.0' }
    });
    
    const data = await response.json();
    
    if (data.length === 0) {
      return { success: false, reason: 'Não encontrado no OpenStreetMap' };
    }
    
    // Procurar polygon de qualidade
    for (const result of data) {
      const hasPolygon = result.geojson && 
                        (result.geojson.type === 'Polygon' || result.geojson.type === 'MultiPolygon');
      
      const isRJ = result.display_name?.includes('Rio de Janeiro');
      const isBoundary = result.type === 'administrative' || result.class === 'boundary';
      
      if (hasPolygon && isRJ) {
        return {
          success: true,
          geometry: result.geojson,
          centerLat: parseFloat(result.lat),
          centerLng: parseFloat(result.lon),
          confidence: (hasPolygon && isRJ && isBoundary) ? 'HIGH' : 'MED',
          source: 'nominatim',
          placeType: result.type || result.class
        };
      }
    }
    
    return { success: false, reason: 'Polygon não encontrado, mantendo Point fallback' };
    
  } catch (error) {
    return { success: false, reason: `Erro: ${error.message}` };
  }
}

async function main() {
  console.log('🏙️  KAVIAR - Fase RJ Padrão Ouro (Auditoria)');
  
  const allCommunities = await fetchCommunities();
  const rjCommunities = allCommunities.filter(isRJCommunity);
  
  console.log(`📊 ${rjCommunities.length} bairros RJ prioritários`);
  
  const results = {
    processed: 0,
    upgraded_to_polygon: 0,
    kept_as_point: 0,
    details: []
  };
  
  const geojsonFeatures = [];
  
  for (const community of rjCommunities) {
    console.log(`\n[${results.processed + 1}/${rjCommunities.length}] ${community.name}`);
    
    const currentStatus = await checkGeofenceStatus(community.id);
    console.log(`   Status: ${currentStatus}`);
    
    results.processed++;
    
    if (currentStatus === 'SEM_DADOS' || currentStatus === 'Point') {
      const searchResult = await searchPolygonGeofence(community);
      
      if (searchResult.success) {
        console.log(`   ✅ Polygon (${searchResult.confidence})`);
        
        results.upgraded_to_polygon++;
        results.details.push({
          id: community.id,
          name: community.name,
          action: 'UPGRADE_TO_POLYGON',
          confidence: searchResult.confidence
        });
        
        geojsonFeatures.push({
          type: 'Feature',
          properties: {
            id: community.id,
            name: community.name,
            confidence: searchResult.confidence
          },
          geometry: searchResult.geometry
        });
        
      } else {
        console.log(`   ⚠️  ${searchResult.reason}`);
        results.kept_as_point++;
        results.details.push({
          id: community.id,
          name: community.name,
          action: 'KEEP_AS_POINT',
          reason: searchResult.reason
        });
      }
    }
    
    await sleep(1500);
  }
  
  // Gerar relatório
  const report = `# Relatório - Fase RJ Padrão Ouro em Lote

**Data:** ${new Date().toISOString()}

## Resumo

- **Total processados:** ${results.processed}
- **Upgrades para Polygon/MultiPolygon:** ${results.upgraded_to_polygon}
- **Mantidos como Point fallback:** ${results.kept_as_point}

## Detalhes

${results.details.map(d => `### ${d.name}
- **Ação:** ${d.action}
${d.confidence ? `- **Confidence:** ${d.confidence}` : ''}
${d.reason ? `- **Motivo:** ${d.reason}` : ''}`).join('\n\n')}
`;

  fs.writeFileSync(path.join(__dirname, '../audit/rj_geofence_batch_report.md'), report);
  
  if (geojsonFeatures.length > 0) {
    const geojson = { type: 'FeatureCollection', features: geojsonFeatures };
    fs.writeFileSync(path.join(__dirname, '../audit/rj_geofence_batch.geojson'), JSON.stringify(geojson, null, 2));
  }
  
  console.log(`\n🎉 Concluído: ${results.upgraded_to_polygon} upgrades, ${results.kept_as_point} fallbacks`);
}

if (require.main === module) {
  main().catch(console.error);
}
