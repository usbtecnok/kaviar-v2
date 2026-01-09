#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkGeofences() {
  const communities = await prisma.community.findMany({
    where: {
      name: { in: ['Botafogo', 'Centro', 'Tijuca', 'Glória'] }
    },
    include: { geofenceData: true }
  });

  console.log('=== ESTADO ATUAL DOS GEOFENCES ===\n');
  
  for (const community of communities) {
    console.log(`${community.name} (${community.id}):`);
    
    if (community.geofenceData) {
      console.log(`  ✅ Tem CommunityGeofence`);
      console.log(`  📍 Tipo: ${community.geofenceData.geojson ? JSON.parse(community.geofenceData.geojson).type : 'N/A'}`);
      console.log(`  🔒 Verified: ${community.geofenceData.isVerified}`);
      console.log(`  📊 Confidence: ${community.geofenceData.confidence}`);
    } else {
      console.log(`  ❌ Sem CommunityGeofence`);
    }
    
    // Verificar campo geofence legacy
    if (community.geofence) {
      console.log(`  📜 Legacy geofence: ${community.geofence.substring(0, 50)}...`);
    }
    
    console.log('');
  }
  
  await prisma.$disconnect();
}

checkGeofences().catch(console.error);
