const { PrismaClient } = require('@prisma/client');

async function testGeoResolveLogic() {
  const prisma = new PrismaClient();
  
  try {
    console.log('=== TESTE LÓGICA ENDPOINT GEO/RESOLVE ===\n');
    
    // Simular a lógica do endpoint
    const latitude = -22.9068;
    const longitude = -43.1729;
    
    console.log(`Testando coordenadas: lat=${latitude}, lon=${longitude}`);
    
    // Query exata do endpoint
    const result = await prisma.$queryRaw`
      SELECT id, name, description, is_active
      FROM communities 
      WHERE geom IS NOT NULL 
        AND is_active = true
        AND ST_Covers(geom, ST_SetSRID(ST_Point(${longitude}, ${latitude}), 4326))
      ORDER BY ST_Area(geom::geography) ASC
      LIMIT 1
    `;
    
    if (Array.isArray(result) && result.length > 0) {
      const area = result[0];
      const response = {
        match: true,
        area: {
          id: area.id,
          name: area.name,
          description: area.description,
          active: area.is_active
        }
      };
      
      console.log('✅ RESPOSTA DO ENDPOINT:');
      console.log(JSON.stringify(response, null, 2));
    } else {
      console.log('✅ RESPOSTA DO ENDPOINT:');
      console.log(JSON.stringify({ match: false }, null, 2));
    }
    
    // Teste com coordenadas fora (São Paulo)
    console.log('\n--- Teste coordenadas fora (São Paulo) ---');
    const spResult = await prisma.$queryRaw`
      SELECT id, name, description, is_active
      FROM communities 
      WHERE geom IS NOT NULL 
        AND is_active = true
        AND ST_Covers(geom, ST_SetSRID(ST_Point(-46.6333, -23.5505), 4326))
      ORDER BY ST_Area(geom::geography) ASC
      LIMIT 1
    `;
    
    if (Array.isArray(spResult) && spResult.length > 0) {
      console.log('✅ Match encontrado (inesperado):', spResult[0]);
    } else {
      console.log('✅ RESPOSTA: { "match": false }');
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testGeoResolveLogic();
