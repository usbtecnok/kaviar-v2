#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkGeofences() {
  const communities = await prisma.community.findMany({
    where: {
      description: { contains: 'Rio de Janeiro' }
    },
    include: { geofenceData: true },
    orderBy: { name: 'asc' }
  });

  console.log('=== ESTADO ATUAL DOS GEOFENCES RJ ===\n');
  
  const results = {
    withPolygon: [],
    withPoint: [],
    withoutGeofence: [],
    total: communities.length
  };
  
  for (const community of communities) {
    console.log(`${community.name} (${community.id}):`);
    
    if (community.geofenceData) {
      let geometryType = 'N/A';
      if (community.geofenceData.geojson) {
        try {
          const parsed = JSON.parse(community.geofenceData.geojson);
          geometryType = parsed.type;
        } catch (e) {
          geometryType = 'INVALID_JSON';
        }
      }
      
      console.log(`  ✅ Tem CommunityGeofence`);
      console.log(`  📍 Tipo: ${geometryType}`);
      console.log(`  🔒 Verified: ${community.geofenceData.isVerified}`);
      console.log(`  📊 Confidence: ${community.geofenceData.confidence}`);
      
      if (geometryType === 'Polygon' || geometryType === 'MultiPolygon') {
        results.withPolygon.push({ id: community.id, name: community.name, type: geometryType });
      } else {
        results.withPoint.push({ id: community.id, name: community.name, type: geometryType });
      }
    } else {
      console.log(`  ❌ Sem CommunityGeofence (retornará 404/204)`);
      results.withoutGeofence.push({ id: community.id, name: community.name });
    }
    
    console.log('');
  }
  
  console.log('=== RESUMO ===');
  console.log(`📊 Total RJ: ${results.total}`);
  console.log(`✅ Com Polygon/MultiPolygon: ${results.withPolygon.length}`);
  console.log(`⚠️  Com Point/outros: ${results.withPoint.length}`);
  console.log(`❌ SEM DADOS (404/204): ${results.withoutGeofence.length}`);
  
  if (results.withoutGeofence.length > 0) {
    console.log('\n=== IDs SEM GEOFENCE (candidatos para pipeline RJ) ===');
    results.withoutGeofence.forEach(item => {
      console.log(`${item.id} - ${item.name}`);
    });
  }
  
  await prisma.$disconnect();
}

checkGeofences().catch(console.error);
