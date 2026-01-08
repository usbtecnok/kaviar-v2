const { PrismaClient } = require('@prisma/client');

async function checkPostGIS() {
  const prisma = new PrismaClient();
  
  try {
    console.log('=== PRÉ-CHECK POSTGIS - KAVIAR NEON DATABASE ===\n');
    
    // 1. Verificar versão do PostgreSQL
    console.log('1. Versão do PostgreSQL:');
    const version = await prisma.$queryRaw`SELECT version()`;
    console.log(version[0].version);
    console.log('');
    
    // 2. Verificar extensões PostGIS disponíveis
    console.log('2. Extensões PostGIS disponíveis:');
    const extensions = await prisma.$queryRaw`
      SELECT name, default_version, installed_version
      FROM pg_available_extensions
      WHERE name IN ('postgis', 'postgis_topology')
    `;
    console.log(extensions);
    console.log('');
    
    // 3. Tentar verificar se PostGIS já está instalado
    console.log('3. Verificando se PostGIS está instalado:');
    try {
      const postgisVersion = await prisma.$queryRaw`SELECT PostGIS_Version()`;
      console.log('✅ PostGIS instalado! Versão:', postgisVersion[0].postgis_version);
    } catch (error) {
      console.log('❌ PostGIS não está instalado ainda');
      
      // 4. Tentar instalar PostGIS
      console.log('\n4. Tentando instalar PostGIS:');
      try {
        await prisma.$queryRaw`CREATE EXTENSION IF NOT EXISTS postgis`;
        console.log('✅ Extensão PostGIS criada com sucesso!');
        
        const postgisVersion = await prisma.$queryRaw`SELECT PostGIS_Version()`;
        console.log('✅ PostGIS Version:', postgisVersion[0].postgis_version);
      } catch (installError) {
        console.log('❌ Erro ao instalar PostGIS:', installError.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro na verificação:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkPostGIS();
