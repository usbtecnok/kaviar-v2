#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function searchGeofence(community) {
  const { name, description } = community;
  
  // Extrair contexto da descrição (bairro e cidade)
  let context = 'Rio de Janeiro, RJ';
  if (description && description.includes(' - ')) {
    const parts = description.split(' - ');
    if (parts.length >= 2) {
      context = parts.slice(-2).join(', '); // Últimas duas partes
    }
  }
  
  // Construir query de busca
  let searchQuery = `${name}, ${context}`;
  
  try {
    console.log(`Pesquisando: ${searchQuery}`);
    
    // Usar Nominatim (OpenStreetMap)
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&polygon_geojson=1&limit=1&countrycodes=br`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'KAVIAR-RJ-ZoneOeste-Research/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.length === 0) {
      return {
        id: community.id,
        name: community.name,
        description: community.description,
        found: false,
        centerLat: null,
        centerLng: null,
        geometry: null,
        placeType: null,
        source: 'nominatim',
        sourceRef: null,
        confidence: 'LOW',
        notes: 'Não encontrado no OpenStreetMap'
      };
    }
    
    const result = data[0];
    const hasGeometry = result.geojson && result.geojson.coordinates;
    
    // Determinar confiança baseada na qualidade dos dados e tipo de lugar
    let confidence = 'LOW';
    
    if (hasGeometry && result.type && ['administrative', 'boundary'].includes(result.class)) {
      confidence = 'HIGH';
    } else if (hasGeometry && ['residential', 'suburb', 'neighbourhood'].includes(result.type)) {
      confidence = 'MED';
    } else if (hasGeometry) {
      confidence = 'MED';
    } else if (result.type && ['city', 'town', 'village'].includes(result.type)) {
      confidence = 'MED';
    }
    
    // Comunidades/favelas específicas podem ter confiança menor se ambíguas
    if (name.includes('Morro') || name.includes('Vila') || name.includes('Cidade de')) {
      if (confidence === 'HIGH') confidence = 'MED';
      if (confidence === 'MED' && !hasGeometry) confidence = 'LOW';
    }
    
    return {
      id: community.id,
      name: community.name,
      description: community.description,
      found: true,
      centerLat: parseFloat(result.lat),
      centerLng: parseFloat(result.lon),
      geometry: hasGeometry ? result.geojson : null,
      placeType: result.type || result.class,
      source: 'nominatim',
      sourceRef: result.osm_id,
      confidence,
      notes: hasGeometry ? 'Boundary encontrado' : 'Apenas ponto central'
    };
    
  } catch (error) {
    return {
      id: community.id,
      name: community.name,
      description: community.description,
      found: false,
      centerLat: null,
      centerLng: null,
      geometry: null,
      placeType: null,
      source: 'nominatim',
      sourceRef: null,
      confidence: 'LOW',
      notes: `Erro na consulta: ${error.message}`
    };
  }
}

async function main() {
  console.log('🌍 Iniciando pesquisa de geofence para Zona Oeste/Barra + Alto da Boa Vista...');
  
  // Buscar comunidades da Zona Oeste/Barra + Alto da Boa Vista
  const targetNeighborhoods = ['Barra da Tijuca', 'Itanhangá', 'Anil', 'Jacarepaguá', 'Alto da Boa Vista'];
  const targetCommunities = ['Rio das Pedras', 'Muzema', 'Tijuquinha', 'Cidade de Deus', 'Vila Valqueire', 'Borel', 'Formiga'];
  
  const communities = await prisma.community.findMany({
    where: {
      AND: [
        { description: { contains: 'Rio de Janeiro' } },
        {
          OR: [
            { name: { in: targetNeighborhoods } },
            { name: { in: targetCommunities } }
          ]
        }
      ]
    },
    select: {
      id: true,
      name: true,
      description: true
    }
  });
  
  console.log(`📊 ${communities.length} comunidades encontradas para Zona Oeste/Barra + Alto da Boa Vista`);
  
  const results = [];
  const geojsonFeatures = [];
  
  for (let i = 0; i < communities.length; i++) {
    const community = communities[i];
    console.log(`[${i + 1}/${communities.length}] ${community.name}`);
    
    const result = await searchGeofence(community);
    results.push(result);
    
    // Adicionar ao GeoJSON se tem geometria
    if (result.geometry) {
      geojsonFeatures.push({
        type: 'Feature',
        properties: {
          id: result.id,
          name: result.name,
          description: result.description,
          placeType: result.placeType,
          confidence: result.confidence,
          source: result.source,
          sourceRef: result.sourceRef
        },
        geometry: result.geometry
      });
    }
    
    // Rate limiting - aguardar 1 segundo entre requisições
    await sleep(1000);
  }
  
  // Criar diretório audit se não existir
  const auditDir = path.join(__dirname, '..', '..', 'audit');
  if (!fs.existsSync(auditDir)) {
    fs.mkdirSync(auditDir, { recursive: true });
  }
  
  // Salvar JSON bruto
  fs.writeFileSync(
    path.join(auditDir, 'rj_zone_oeste_geofences_raw.json'),
    JSON.stringify(results, null, 2)
  );
  
  // Salvar GeoJSON
  const geojson = {
    type: 'FeatureCollection',
    features: geojsonFeatures
  };
  
  fs.writeFileSync(
    path.join(auditDir, 'rj_zone_oeste_geofences.geojson'),
    JSON.stringify(geojson, null, 2)
  );
  
  // Gerar relatório markdown
  let report = '# Relatório de Pesquisa Geofence - Zona Oeste/Barra + Alto da Boa Vista\n\n';
  report += `**Data:** ${new Date().toISOString()}\n`;
  report += `**Total de comunidades:** ${communities.length}\n`;
  report += `**Encontradas:** ${results.filter(r => r.found).length}\n`;
  report += `**Com geometria:** ${results.filter(r => r.geometry).length}\n\n`;
  
  report += '## Resultados por Confiança\n\n';
  const byConfidence = {
    HIGH: results.filter(r => r.confidence === 'HIGH').length,
    MED: results.filter(r => r.confidence === 'MED').length,
    LOW: results.filter(r => r.confidence === 'LOW').length
  };
  
  report += `- **HIGH:** ${byConfidence.HIGH} (${(byConfidence.HIGH/results.length*100).toFixed(1)}%)\n`;
  report += `- **MED:** ${byConfidence.MED} (${(byConfidence.MED/results.length*100).toFixed(1)}%)\n`;
  report += `- **LOW:** ${byConfidence.LOW} (${(byConfidence.LOW/results.length*100).toFixed(1)}%)\n\n`;
  
  report += '## Resultados Detalhados\n\n';
  report += '| Nome | Encontrou? | Tipo | Confidence | Fonte/Ref | Observações |\n';
  report += '|------|------------|------|------------|-----------|-------------|\n';
  
  results.forEach(r => {
    const found = r.found ? 'Sim' : 'Não';
    const type = r.geometry ? 
      (r.geometry.type === 'Polygon' ? 'POLYGON' : 
       r.geometry.type === 'MultiPolygon' ? 'MULTIPOLYGON' : 
       r.geometry.type) : 
      (r.found ? 'POINT' : '-');
    
    report += `| ${r.name} | ${found} | ${type} | ${r.confidence} | ${r.source}:${r.sourceRef || 'N/A'} | ${r.notes} |\n`;
  });
  
  report += '\n## Estatísticas Finais\n\n';
  const stats = {
    total: results.length,
    found: results.filter(r => r.found).length,
    withGeometry: results.filter(r => r.geometry).length,
    neighborhoods: results.filter(r => targetNeighborhoods.includes(r.name)).length,
    communities: results.filter(r => targetCommunities.includes(r.name)).length
  };
  
  report += `- **Total:** ${stats.total}\n`;
  report += `- **Encontradas:** ${stats.found} (${(stats.found/stats.total*100).toFixed(1)}%)\n`;
  report += `- **Com geometria:** ${stats.withGeometry} (${(stats.withGeometry/stats.total*100).toFixed(1)}%)\n`;
  report += `- **Bairros:** ${stats.neighborhoods}\n`;
  report += `- **Comunidades/Favelas:** ${stats.communities}\n`;
  
  fs.writeFileSync(
    path.join(auditDir, 'rj_zone_oeste_geofence_research_report.md'),
    report
  );
  
  console.log('✅ Pesquisa concluída!');
  console.log(`📁 Arquivos gerados em: ${auditDir}`);
  console.log(`📊 Encontradas: ${stats.found}/${stats.total} (${(stats.found/stats.total*100).toFixed(1)}%)`);
  console.log(`🗺️ Com geometria: ${stats.withGeometry}/${stats.total} (${(stats.withGeometry/stats.total*100).toFixed(1)}%)`);
  
  await prisma.$disconnect();
}

if (require.main === module) {
  main().catch(console.error);
}
