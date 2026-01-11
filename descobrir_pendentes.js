const { PrismaClient } = require('./backend/node_modules/@prisma/client');

async function descobrirPendentes() {
  const prisma = new PrismaClient();
  
  console.log('🔍 DESCOBERTA - Revisão de Geofences (16 pendentes esperados)');
  console.log('Banco: ***neon.tech (PRODUÇÃO)');
  console.log('');
  
  try {
    const pendentes = await prisma.communityGeofence.findMany({
      where: {
        geojson: { not: null },
        isVerified: false
      },
      include: {
        community: {
          select: { name: true }
        }
      },
      orderBy: { community: { name: 'asc' } }
    });
    
    console.log(`📊 RESULTADO: ${pendentes.length} itens encontrados`);
    
    if (pendentes.length !== 16) {
      console.log(`⚠️  ATENÇÃO: Esperados 16, encontrados ${pendentes.length}`);
      console.log('❌ NÃO APLICAR até isolar os 16 corretos');
    }
    
    console.log('');
    console.log('📋 TABELA DOS PENDENTES:');
    console.log('Nome | ID | geometry.type | isVerified | Resultado Esperado');
    console.log(''.padEnd(80, '-'));
    
    const allowlist = [];
    
    for (const item of pendentes) {
      const geojson = JSON.parse(item.geojson);
      const geometryType = geojson.geometry?.type || 'INVALID';
      const resultadoEsperado = ['Polygon', 'MultiPolygon'].includes(geometryType) ? 'ELIGÍVEL' : 'FAILED';
      
      console.log(`${item.community.name} | ${item.id} | ${geometryType} | ${item.isVerified} | ${resultadoEsperado}`);
      allowlist.push(item.id);
    }
    
    console.log('');
    console.log('🎯 ALLOWLIST GERADA:');
    console.log(JSON.stringify(allowlist, null, 2));
    
  } finally {
    await prisma.$disconnect();
  }
}

descobrirPendentes().catch(console.error);
