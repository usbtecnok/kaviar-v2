import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function validateConnection() {
  try {
    console.log('🔍 Testando conexão com Supabase...');
    
    // Test connection
    await prisma.$connect();
    console.log('✅ Conexão estabelecida com sucesso!');
    
    // Test query
    const result = await prisma.$queryRaw`SELECT version()`;
    console.log('📊 Versão do PostgreSQL:', result);
    
    // Check if tables exist
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    console.log('📋 Tabelas encontradas:', tables);
    
    if (Array.isArray(tables) && tables.length > 0) {
      console.log('✅ Banco configurado corretamente!');
    } else {
      console.log('⚠️  Nenhuma tabela encontrada. Execute: npm run db:migrate');
    }
    
  } catch (error) {
    console.error('❌ Erro de conexão:', error);
    console.log('\n🔧 Verifique:');
    console.log('1. DATABASE_URL está correto no .env');
    console.log('2. DATABASE_PASSWORD está correto');
    console.log('3. PROJECT_ID está correto');
    console.log('4. Consulte SUPABASE_SETUP.md');
  } finally {
    await prisma.$disconnect();
  }
}

validateConnection();
