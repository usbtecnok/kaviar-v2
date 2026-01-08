const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function testGeoJSONImport() {
  const prisma = new PrismaClient();
  
  try {
    console.log('=== TESTE COMMIT 3: IMPORTADOR GEOJSON ===\n');
    
    // 1. Carregar GeoJSON de teste
    const geojsonPath = path.join(__dirname, 'geo', 'test-neighborhoods-rj.geojson');
    const geojsonData = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));
    
    console.log('1. GeoJSON carregado:');
    console.log(`- Tipo: ${geojsonData.type}`);
    console.log(`- Features: ${geojsonData.features.length}`);
    geojsonData.features.forEach((f, i) => {
      console.log(`  ${i + 1}. ${f.properties.name} (${f.geometry.type})`);
    });
    
    // 2. Simular lógica de importação
    console.log('\n2. Simulando importação...');
    
    let insertedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const [index, feature] of geojsonData.features.entries()) {
      try {
        const name = feature.properties.name;
        const type = 'NEIGHBORHOOD';
        const city = 'Rio de Janeiro';
        
        // Convert geometry to PostGIS format - ensure MultiPolygon
        let geometryForPostGIS;
        if (feature.geometry.type === 'Polygon') {
          // Convert Polygon to MultiPolygon
          geometryForPostGIS = {
            type: 'MultiPolygon',
            coordinates: [feature.geometry.coordinates]
          };
        } else {
          geometryForPostGIS = feature.geometry;
        }
        
        const geojsonString = JSON.stringify(geometryForPostGIS);
        
        // Convert to legacy geofence format
        const coordinates = feature.geometry.coordinates[0];
        const legacyGeofence = JSON.stringify({
          type: 'polygon',
          path: coordinates.map(([lng, lat]) => ({ lat, lng }))
        });
        
        // Generate unique ID
        const communityId = `neighborhood-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        
        console.log(`Processando: ${name} (ID: ${communityId})`);
        
        // Upsert community with all required fields
        const result = await prisma.$queryRaw`
          INSERT INTO communities (
            id, name, description, is_active, created_at, updated_at, 
            auto_activation, deactivation_threshold, min_active_drivers,
            geofence, geom
          ) VALUES (
            ${communityId},
            ${name},
            ${`${name} - ${city}`},
            true,
            NOW(),
            NOW(),
            false,
            1,
            3,
            ${legacyGeofence},
            ST_GeomFromGeoJSON(${geojsonString})
          )
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            geofence = EXCLUDED.geofence,
            geom = ST_GeomFromGeoJSON(${geojsonString}),
            updated_at = NOW()
          RETURNING (xmax = 0) AS inserted
        `;
        
        if (Array.isArray(result) && result.length > 0) {
          const wasInserted = result[0].inserted;
          if (wasInserted) {
            insertedCount++;
            console.log(`  ✅ Inserido`);
          } else {
            updatedCount++;
            console.log(`  🔄 Atualizado`);
          }
        }
        
      } catch (featureError) {
        console.log(`  ❌ Erro: ${featureError.message}`);
        errorCount++;
      }
    }
    
    const summary = {
      total: geojsonData.features.length,
      inserted: insertedCount,
      updated: updatedCount,
      errors: errorCount
    };
    
    console.log('\n3. Resultado da importação:');
    console.table(summary);
    
    // 4. Verificar dados importados
    console.log('\n4. Verificando dados importados:');
    const imported = await prisma.$queryRaw`
      SELECT id, name, description, geofence IS NOT NULL as has_geofence, geom IS NOT NULL as has_geom
      FROM communities 
      WHERE id LIKE 'neighborhood-%'
      ORDER BY name
    `;
    
    console.table(imported);
    
    // 5. Testar resolução com novos dados
    console.log('\n5. Testando resolução geográfica:');
    
    // Coordenadas dentro de Copacabana
    const copaTest = await prisma.$queryRaw`
      SELECT id, name
      FROM communities 
      WHERE geom IS NOT NULL 
        AND ST_Covers(geom, ST_SetSRID(ST_Point(-43.185, -22.965), 4326))
      LIMIT 1
    `;
    
    console.log('Teste Copacabana (-43.185, -22.965):', copaTest.length > 0 ? `✅ ${copaTest[0].name}` : '❌ NO MATCH');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testGeoJSONImport();
