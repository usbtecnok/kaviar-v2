const { PrismaClient } = require('@prisma/client');

async function testGeoEndpoint() {
  const prisma = new PrismaClient();
  
  try {
    console.log('=== TESTE COMMIT 2: ENDPOINT GEO/RESOLVE ===\n');
    
    // 1. Verificar se há communities na base
    const communities = await prisma.$queryRaw`
      SELECT id, name, geofence, geom IS NOT NULL as has_geom, is_active
      FROM communities 
      LIMIT 5
    `;
    
    console.log('1. Communities na base:');
    console.table(communities);
    
    // 2. Criar um polígono de teste se não houver dados
    if (Array.isArray(communities) && communities.length === 0) {
      console.log('\n2. Criando community de teste...');
      
      await prisma.$queryRaw`
        INSERT INTO communities (id, name, description, is_active, geom)
        VALUES (
          'test-sp-centro',
          'São Paulo Centro',
          'Área de teste - Centro de São Paulo',
          true,
          ST_GeomFromText('MULTIPOLYGON(((-46.6400 -23.5500, -46.6300 -23.5500, -46.6300 -23.5400, -46.6400 -23.5400, -46.6400 -23.5500)))', 4326)
        )
        ON CONFLICT (id) DO NOTHING
      `;
      
      console.log('✅ Community de teste criada');
    }
    
    // 3. Testar coordenadas dentro e fora
    console.log('\n3. Testando resolução geográfica:');
    
    // Ponto dentro do centro de SP (aproximado)
    const insideTest = await prisma.$queryRaw`
      SELECT id, name, description, is_active
      FROM communities 
      WHERE geom IS NOT NULL 
        AND is_active = true
        AND ST_Covers(geom, ST_SetSRID(ST_Point(-46.635, -23.545), 4326))
      ORDER BY ST_Area(geom::geography) ASC
      LIMIT 1
    `;
    
    console.log('Ponto dentro (-46.635, -23.545):', insideTest.length > 0 ? '✅ MATCH' : '❌ NO MATCH');
    if (insideTest.length > 0) {
      console.log('Area encontrada:', insideTest[0]);
    }
    
    // Ponto fora (Rio de Janeiro)
    const outsideTest = await prisma.$queryRaw`
      SELECT id, name, description, is_active
      FROM communities 
      WHERE geom IS NOT NULL 
        AND is_active = true
        AND ST_Covers(geom, ST_SetSRID(ST_Point(-43.1729, -22.9068), 4326))
      ORDER BY ST_Area(geom::geography) ASC
      LIMIT 1
    `;
    
    console.log('Ponto fora (-43.1729, -22.9068):', outsideTest.length > 0 ? '✅ MATCH' : '❌ NO MATCH');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testGeoEndpoint();
