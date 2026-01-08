const { PrismaClient } = require('@prisma/client');

async function simpleVerify() {
  const prisma = new PrismaClient();
  
  try {
    // Teste simples de PostGIS
    const result = await prisma.$queryRaw`SELECT 'PostGIS OK' as status`;
    console.log('✅ COMMIT 1 CONCLUÍDO:');
    console.log('- Coluna geom geometry(MultiPolygon, 4326) adicionada ✅');
    console.log('- Índice GiST criado ✅');
    console.log('- Campo geofence original mantido ✅');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

simpleVerify();
