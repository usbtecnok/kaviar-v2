const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrate() {
  try {
    console.log('Aplicando migração: add_virtual_fence_center...');
    
    await prisma.$executeRawUnsafe(`
      ALTER TABLE drivers 
      ADD COLUMN IF NOT EXISTS virtual_fence_center_lat DECIMAL(10, 8),
      ADD COLUMN IF NOT EXISTS virtual_fence_center_lng DECIMAL(11, 8)
    `);
    
    console.log('✅ Migração aplicada com sucesso');
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Erro ao aplicar migração:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

migrate();
