const { PrismaClient } = require('@prisma/client');

async function checkTableStructure() {
  const prisma = new PrismaClient();
  
  try {
    console.log('=== ESTRUTURA DA TABELA COMMUNITIES ===\n');
    
    // Verificar colunas e constraints
    const columns = await prisma.$queryRaw`
      SELECT 
        column_name, 
        data_type, 
        is_nullable, 
        column_default,
        character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'communities' 
      ORDER BY ordinal_position
    `;
    
    console.log('Colunas da tabela communities:');
    console.table(columns);
    
    // Verificar constraints NOT NULL
    const notNullColumns = columns.filter(col => col.is_nullable === 'NO');
    console.log('\nColunas NOT NULL (obrigatórias):');
    notNullColumns.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} ${col.column_default ? `(default: ${col.column_default})` : ''}`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTableStructure();
