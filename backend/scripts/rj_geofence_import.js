#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Piloto obrigatório - apenas estes primeiro
const PILOT_NEIGHBORHOODS = ['Botafogo', 'Tijuca', 'Glória'];

// IDs específicos sem geofence que devem ser incluídos no pipeline
const MISSING_GEOFENCE_IDS = [
  'cmk6uwnvh0001qqr377ziza29', // Morro da Providência
  'cmk6ux6v6001mqqr33ulgsn00', // Chapéu Mangueira  
  'cmk6ux6js001lqqr3di3r3xvd', // Morro da Babilônia
  'cmk6ux0dx0012qqr3sx949css', // Morro da Urca
  'cmk6ux7h3001oqqr3pjtmxcxo'  // Morro de Santa Marta
];

async function loadGeojsonData() {
  const geojsonPath = path.join(__dirname, '../../audit/rj_geofence_batch.geojson');
  const data = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));
  return data.features;
}

async function findCommunityByName(name) {
  return await prisma.community.findFirst({
    where: { name },
    include: { geofenceData: true }
  });
}

async function findCommunityById(id) {
  return await prisma.community.findFirst({
    where: { id },
    include: { geofenceData: true }
  });
}

async function importGeofence(community, geometry) {
  // Calcular centro do polígono (aproximação simples)
  let centerLat, centerLng;
  
  if (geometry.type === 'Polygon') {
    const coords = geometry.coordinates[0];
    const lats = coords.map(c => c[1]);
    const lngs = coords.map(c => c[0]);
    centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
  } else {
    // Fallback para community center
    centerLat = parseFloat(community.centerLat) || -22.9;
    centerLng = parseFloat(community.centerLng) || -43.2;
  }

  const geofenceData = {
    communityId: community.id,
    centerLat: centerLat,
    centerLng: centerLng,
    geojson: JSON.stringify(geometry),
    confidence: 'MED',
    isVerified: false,
    source: 'nominatim_batch',
    updatedAt: new Date()
  };

  if (community.geofenceData) {
    // Atualizar existente
    await prisma.communityGeofence.update({
      where: { communityId: community.id },
      data: geofenceData
    });
    return 'UPDATED';
  } else {
    // Criar novo
    await prisma.communityGeofence.create({
      data: geofenceData
    });
    return 'CREATED';
  }
}

function shouldUpdate(existingGeofence, newGeometry) {
  if (!existingGeofence) return true;
  
  let currentType = 'Point'; // default
  if (existingGeofence.geojson) {
    try {
      currentType = JSON.parse(existingGeofence.geojson).type;
    } catch (e) {
      currentType = 'Point';
    }
  }
  
  const newType = newGeometry.type;
  
  // Point -> Polygon é sempre melhoria
  if (currentType === 'Point' && (newType === 'Polygon' || newType === 'MultiPolygon')) {
    return true;
  }
  
  // Manter Polygon/MultiPolygon existente
  if ((currentType === 'Polygon' || currentType === 'MultiPolygon') && 
      (newType === 'Polygon' || newType === 'MultiPolygon')) {
    return false;
  }
  
  return false;
}

async function main() {
  console.log('🏙️  KAVIAR - Importação RJ Padrão Ouro (Piloto)');
  
  const features = await loadGeojsonData();
  console.log(`📦 ${features.length} polígonos carregados do GeoJSON`);
  
  // Filtrar apenas piloto + IDs específicos sem geofence
  const pilotFeatures = features.filter(f => 
    PILOT_NEIGHBORHOODS.includes(f.properties.name)
  );
  
  // Buscar features para IDs específicos sem geofence
  const missingGeofenceFeatures = [];
  for (const id of MISSING_GEOFENCE_IDS) {
    try {
      const community = await findCommunityById(id);
      if (community) {
        // Buscar no GeoJSON por nome da community
        const feature = features.find(f => f.properties.name === community.name);
        if (feature) {
          missingGeofenceFeatures.push(feature);
          console.log(`📍 [MISSING] Incluindo ${community.name} (${id}) no pipeline`);
        }
      }
    } catch (error) {
      console.error(`❌ Erro ao buscar community ${id}:`, error);
    }
  }
  
  const allFeatures = [...pilotFeatures, ...missingGeofenceFeatures];
  
  console.log(`🎯 Piloto: ${pilotFeatures.length} bairros selecionados`);
  console.log(`📍 IDs sem geofence: ${missingGeofenceFeatures.length} incluídos`);
  console.log(`📊 Total a processar: ${allFeatures.length}`);
  
  const results = {
    processed: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    details: []
  };
  
  for (const feature of allFeatures) {
    const name = feature.properties.name;
    const geometry = feature.geometry;
    
    console.log(`\n[${results.processed + 1}/${pilotFeatures.length}] ${name}`);
    
    try {
      const community = await findCommunityByName(name);
      
      if (!community) {
        console.log(`   ❌ Community não encontrada`);
        results.skipped++;
        results.details.push({
          name,
          action: 'SKIPPED',
          reason: 'Community não encontrada'
        });
        continue;
      }
      
      if (!shouldUpdate(community.geofenceData, geometry)) {
        console.log(`   ⏭️  Mantendo geofence existente (melhor qualidade)`);
        results.skipped++;
        results.details.push({
          name,
          action: 'SKIPPED',
          reason: 'Geofence existente é melhor ou igual'
        });
        continue;
      }
      
      const action = await importGeofence(community, geometry);
      console.log(`   ✅ ${action} - Polygon importado`);
      
      if (action === 'CREATED') {
        results.created++;
      } else {
        results.updated++;
      }
      
      results.details.push({
        name,
        communityId: community.id,
        action,
        geometryType: geometry.type,
        confidence: 'MED',
        isVerified: false
      });
      
    } catch (error) {
      console.log(`   ❌ Erro: ${error.message}`);
      results.skipped++;
      results.details.push({
        name,
        action: 'ERROR',
        reason: error.message
      });
    }
    
    results.processed++;
  }
  
  // Gerar relatório
  const report = `# Relatório - Importação RJ Padrão Ouro (Piloto)

**Data:** ${new Date().toISOString()}

## Resumo

- **Total processados:** ${results.processed}
- **Criados:** ${results.created}
- **Atualizados:** ${results.updated}
- **Ignorados:** ${results.skipped}

## Detalhes

${results.details.map(d => `### ${d.name}
- **Ação:** ${d.action}
${d.communityId ? `- **Community ID:** ${d.communityId}` : ''}
${d.geometryType ? `- **Tipo:** ${d.geometryType}` : ''}
${d.confidence ? `- **Confidence:** ${d.confidence}` : ''}
${d.reason ? `- **Motivo:** ${d.reason}` : ''}`).join('\n\n')}

## Validação Obrigatória

Testar em produção:

1. **Botafogo:** GET /api/governance/communities/{id}/geofence → deve retornar Polygon
2. **Tijuca:** GET /api/governance/communities/{id}/geofence → deve retornar Polygon  
3. **UI "Ver no mapa"** deve desenhar polígonos para ambos

## Próximos Passos

Após validação do piloto:
- Executar importação completa dos 13 polígonos restantes
- Manter isVerified=false para todos
- Documentar melhorias no "Ver no mapa"
`;

  const reportPath = path.join(__dirname, '../../audit/rj_geofence_import_report.md');
  fs.writeFileSync(reportPath, report);
  
  console.log(`\n📄 Relatório salvo: ${reportPath}`);
  console.log(`🎉 Piloto concluído: ${results.created} criados, ${results.updated} atualizados`);
  
  await prisma.$disconnect();
}

if (require.main === module) {
  main().catch(console.error);
}
