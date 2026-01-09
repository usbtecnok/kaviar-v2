#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Lista de comunidades obtida da API de produção
const communities = [
  { id: "cmk142l3l000295s2zzirb380", name: "Butuí", description: "Bairro Butuí" },
  { id: "cmk142lez000395s2m0t9tfoz", name: "Tijuaçu", description: "Bairro Tijuaçu" },
  { id: "cmjxqj08u0000ov5lwq1a48jl", name: "Furnas", description: "Comunidade de Furnas - Minas Gerais" },
  { id: "cmk142kr0000195s2hi9n7r2v", name: "Agrícola", description: "Bairro Agrícola" },
  { id: "cmk142k5h000095s2tpr31oit", name: "Mata Machado", description: "Bairro Mata Machado" },
  { id: "neighborhood-copacabana", name: "Copacabana", description: "Copacabana - Rio de Janeiro" },
  { id: "neighborhood-ipanema", name: "Ipanema", description: "Ipanema - Rio de Janeiro" },
  { id: "cmk5h8a9z0000i502hg8s1n4b", name: "Tambau,sp", description: null },
  { id: "cmk5nbzdm0000jk7ajtqeo1mx", name: "Recreio dos Bandeirantes", description: null },
  { id: "cmk67ht9400003mx35y0t9u00", name: "anil", description: null },
  { id: "bairro-alto-da-boa-vista", name: "Alto da Boa Vista", description: "Alto da Boa Vista - Rio de Janeiro" },
  { id: "bairro-leme", name: "Leme", description: "Leme - Rio de Janeiro" },
  { id: "bairro-copacabana", name: "Copacabana", description: "Copacabana - Rio de Janeiro" },
  { id: "bairro-ipanema", name: "Ipanema", description: "Ipanema - Rio de Janeiro" },
  { id: "bairro-jo-", name: "Joá", description: "Joá - Rio de Janeiro" },
  { id: "bairro-barra-da-tijuca", name: "Barra da Tijuca", description: "Barra da Tijuca - Rio de Janeiro" },
  { id: "comunidade-ladeira-dos-tabajaras--n--256", name: "Ladeira dos Tabajaras, nº 256", description: "Ladeira dos Tabajaras, nº 256 - Rio de Janeiro" },
  { id: "comunidade-ladeira-dos-tabajaras--n--248", name: "Ladeira dos Tabajaras, nº 248", description: "Ladeira dos Tabajaras, nº 248 - Rio de Janeiro" },
  { id: "comunidade-babil-nia", name: "Babilônia", description: "Babilônia - Rio de Janeiro" },
  { id: "comunidade-chap-u-mangueira", name: "Chapéu Mangueira", description: "Chapéu Mangueira - Rio de Janeiro" },
  { id: "comunidade-pav-o-pav-ozinho", name: "Pavão-Pavãozinho", description: "Pavão-Pavãozinho - Rio de Janeiro" },
  { id: "comunidade-morro-do-cantagalo", name: "Morro do Cantagalo", description: "Morro do Cantagalo - Rio de Janeiro" }
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function searchGeofence(community) {
  const { name, description } = community;
  
  // Extrair contexto da descrição
  let context = '';
  if (description && description.includes(' - ')) {
    context = description.split(' - ')[1];
  }
  
  // Construir query de busca
  let searchQuery = name;
  if (context) {
    searchQuery += `, ${context}`;
  }
  
  try {
    console.log(`Pesquisando: ${searchQuery}`);
    
    // Usar Nominatim (OpenStreetMap)
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&polygon_geojson=1&limit=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'KAVIAR-Geofence-Research/1.0'
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
    
    return {
      id: community.id,
      name: community.name,
      found: true,
      centerLat: parseFloat(result.lat),
      centerLng: parseFloat(result.lon),
      geometry: hasGeometry ? result.geojson : null,
      placeType: result.type || result.class,
      source: 'nominatim',
      sourceRef: result.osm_id,
      confidence: hasGeometry ? 'HIGH' : 'MED',
      notes: hasGeometry ? 'Boundary encontrado' : 'Apenas ponto central'
    };
    
  } catch (error) {
    return {
      id: community.id,
      name: community.name,
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
  console.log('🌍 Iniciando pesquisa de geofence...');
  
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
  const auditDir = path.join(__dirname, '..', 'audit');
  if (!fs.existsSync(auditDir)) {
    fs.mkdirSync(auditDir, { recursive: true });
  }
  
  // Salvar JSON bruto
  fs.writeFileSync(
    path.join(auditDir, 'geofences_raw.json'),
    JSON.stringify(results, null, 2)
  );
  
  // Salvar GeoJSON
  const geojson = {
    type: 'FeatureCollection',
    features: geojsonFeatures
  };
  
  fs.writeFileSync(
    path.join(auditDir, 'geofences.geojson'),
    JSON.stringify(geojson, null, 2)
  );
  
  // Gerar relatório markdown
  let report = '# Relatório de Pesquisa Geofence\n\n';
  report += `**Data:** ${new Date().toISOString()}\n`;
  report += `**Total de comunidades:** ${communities.length}\n`;
  report += `**Encontradas:** ${results.filter(r => r.found).length}\n`;
  report += `**Com geometria:** ${results.filter(r => r.geometry).length}\n\n`;
  
  report += '## Resultados\n\n';
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
  
  report += '\n## Estatísticas\n\n';
  const stats = {
    total: results.length,
    found: results.filter(r => r.found).length,
    withGeometry: results.filter(r => r.geometry).length,
    highConfidence: results.filter(r => r.confidence === 'HIGH').length,
    medConfidence: results.filter(r => r.confidence === 'MED').length,
    lowConfidence: results.filter(r => r.confidence === 'LOW').length
  };
  
  report += `- **Total:** ${stats.total}\n`;
  report += `- **Encontradas:** ${stats.found} (${(stats.found/stats.total*100).toFixed(1)}%)\n`;
  report += `- **Com geometria:** ${stats.withGeometry} (${(stats.withGeometry/stats.total*100).toFixed(1)}%)\n`;
  report += `- **Alta confiança:** ${stats.highConfidence}\n`;
  report += `- **Média confiança:** ${stats.medConfidence}\n`;
  report += `- **Baixa confiança:** ${stats.lowConfidence}\n`;
  
  fs.writeFileSync(
    path.join(auditDir, 'geofence_fetch_report.md'),
    report
  );
  
  console.log('✅ Pesquisa concluída!');
  console.log(`📁 Arquivos gerados em: ${auditDir}`);
  console.log(`📊 Encontradas: ${stats.found}/${stats.total} (${(stats.found/stats.total*100).toFixed(1)}%)`);
  console.log(`🗺️ Com geometria: ${stats.withGeometry}/${stats.total} (${(stats.withGeometry/stats.total*100).toFixed(1)}%)`);
}

if (require.main === module) {
  main().catch(console.error);
}
