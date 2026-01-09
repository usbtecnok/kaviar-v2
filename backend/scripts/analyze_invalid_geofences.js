const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeInvalidGeofences() {
  console.log('🔍 ANÁLISE DE GEOFENCES INVÁLIDOS');
  console.log('==================================');
  
  const communities = await prisma.community.findMany({
    where: { 
      geofenceData: { 
        isNot: null
      }
    },
    include: { geofenceData: true }
  });

  const invalid = [];
  const validTypes = ['Polygon', 'MultiPolygon'];

  for (const community of communities) {
    const geofence = community.geofenceData;
    if (!geofence) continue;

    let issues = [];

    // Verificar tipo de geometria
    if (geofence.geojson) {
      try {
        const geometry = JSON.parse(geofence.geojson);
        if (!validTypes.includes(geometry.type)) {
          issues.push(`Tipo inválido: ${geometry.type}`);
        }
      } catch (e) {
        issues.push('JSON inválido');
      }
    }

    // Verificar se centro está no RJ (heurística)
    const lat = parseFloat(geofence.centerLat);
    const lng = parseFloat(geofence.centerLng);
    const isInRJ = lat >= -23.1 && lat <= -22.7 && lng >= -43.8 && lng <= -43.1;
    
    if (!isInRJ) {
      issues.push(`Centro fora do RJ: ${lat}, ${lng}`);
    }

    if (issues.length > 0) {
      invalid.push({
        id: community.id,
        name: community.name,
        issues,
        centerLat: geofence.centerLat,
        centerLng: geofence.centerLng,
        confidence: geofence.confidence,
        isVerified: geofence.isVerified,
        geometryType: geofence.geojson ? JSON.parse(geofence.geojson).type : 'N/A'
      });
    }
  }

  console.log(`\n📊 RESUMO:`);
  console.log(`Total de comunidades com geofence: ${communities.length}`);
  console.log(`Geofences inválidos encontrados: ${invalid.length}`);
  
  if (invalid.length > 0) {
    console.log(`\n❌ GEOFENCES INVÁLIDOS:`);
    invalid.forEach((item, index) => {
      console.log(`\n${index + 1}. ${item.name} (${item.id})`);
      console.log(`   Tipo: ${item.geometryType}`);
      console.log(`   Centro: ${item.centerLat}, ${item.centerLng}`);
      console.log(`   Confiança: ${item.confidence}`);
      console.log(`   Verificado: ${item.isVerified}`);
      console.log(`   Problemas: ${item.issues.join(', ')}`);
    });

    // Casos específicos para refetch
    const needsRefetch = invalid.filter(item => 
      item.issues.some(issue => 
        issue.includes('LineString') || 
        issue.includes('Point') || 
        issue.includes('Fora do RJ')
      )
    );

    if (needsRefetch.length > 0) {
      console.log(`\n🔄 CANDIDATOS PARA REFETCH (${needsRefetch.length}):`);
      needsRefetch.forEach(item => {
        console.log(`- ${item.name}: "${item.name}, Rio de Janeiro, RJ, Brasil"`);
      });
    }
  }

  await prisma.$disconnect();
  return invalid;
}

if (require.main === module) {
  analyzeInvalidGeofences().catch(console.error);
}

module.exports = { analyzeInvalidGeofences };
