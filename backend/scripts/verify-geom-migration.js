const { PrismaClient } = require('@prisma/client');

async function verifyGeomColumn() {
  const prisma = new PrismaClient();
  
  try {
    console.log('=== VERIFICAÇÃO COMMIT 1: COLUNA GEOM + ÍNDICE ===\n');
    
    // 1. Verificar estrutura da tabela communities
    console.log('1. Estrutura da tabela communities:');
    const tableInfo = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'communities' AND column_name IN ('geofence', 'geom')
      ORDER BY column_name
    `;
    console.table(tableInfo);
    
    // 2. Verificar índices da tabela
    console.log('2. Índices da tabela communities:');
    const indexes = await prisma.$queryRaw`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'communities'
      ORDER BY indexname
    `;
    console.table(indexes);
    
    // 3. Verificar se a coluna geom aceita dados PostGIS
    console.log('3. Teste de inserção PostGIS:');
    const testGeom = await prisma.$queryRaw`
      SELECT ST_GeomFromText('MULTIPOLYGON(((-23.550520 -46.633308, -23.550520 -46.632308, -23.549520 -46.632308, -23.549520 -46.633308, -23.550520 -46.633308)))', 4326) as test_geom
    `;
    console.log('✅ PostGIS funcionando:', testGeom[0].test_geom ? 'SIM' : 'NÃO');
    
  } catch (error) {
    console.error('❌ Erro na verificação:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyGeomColumn();
