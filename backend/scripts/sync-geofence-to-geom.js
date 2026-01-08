const { PrismaClient } = require('@prisma/client');

async function syncGeofenceToGeom() {
  const prisma = new PrismaClient();
  
  try {
    console.log('=== SINCRONIZAÇÃO GEOFENCE → GEOM ===\n');
    
    // 1. Buscar communities com geofence JSON mas sem geom
    const communitiesWithGeofence = await prisma.$queryRaw`
      SELECT id, name, geofence
      FROM communities 
      WHERE geofence IS NOT NULL 
        AND geofence != 'null'
        AND geom IS NULL
    `;
    
    console.log(`Encontradas ${communitiesWithGeofence.length} communities para sincronizar`);
    
    let syncCount = 0;
    
    for (const community of communitiesWithGeofence) {
      try {
        const geofenceData = JSON.parse(community.geofence);
        
        if (geofenceData.type === 'polygon' && geofenceData.path && Array.isArray(geofenceData.path)) {
          // Converter path para formato WKT MultiPolygon
          const coordinates = geofenceData.path.map(point => `${point.lng} ${point.lat}`).join(', ');
          const wkt = `MULTIPOLYGON(((${coordinates})))`;
          
          console.log(`Sincronizando ${community.name}: ${coordinates.substring(0, 50)}...`);
          
          // Atualizar geom usando PostGIS
          await prisma.$queryRaw`
            UPDATE communities 
            SET geom = ST_GeomFromText(${wkt}, 4326)
            WHERE id = ${community.id}
          `;
          
          syncCount++;
        }
      } catch (parseError) {
        console.log(`❌ Erro ao processar ${community.name}:`, parseError.message);
      }
    }
    
    console.log(`\n✅ Sincronizadas ${syncCount} communities`);
    
    // 2. Testar novamente após sincronização
    console.log('\n=== TESTE APÓS SINCRONIZAÇÃO ===');
    
    // Testar com coordenadas do Rio de Janeiro (onde estão os dados)
    const rioTest = await prisma.$queryRaw`
      SELECT id, name, description, is_active
      FROM communities 
      WHERE geom IS NOT NULL 
        AND is_active = true
        AND ST_Covers(geom, ST_SetSRID(ST_Point(-43.1729, -22.9068), 4326))
      ORDER BY ST_Area(geom::geography) ASC
      LIMIT 1
    `;
    
    console.log('Teste Rio (-43.1729, -22.9068):', rioTest.length > 0 ? '✅ MATCH' : '❌ NO MATCH');
    if (rioTest.length > 0) {
      console.log('Area encontrada:', rioTest[0]);
    }
    
  } catch (error) {
    console.error('❌ Erro na sincronização:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

syncGeofenceToGeom();
