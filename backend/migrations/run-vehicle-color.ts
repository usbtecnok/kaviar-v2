import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Adding vehicle_color column to drivers table...');
  
  await prisma.$executeRawUnsafe(`
    ALTER TABLE drivers ADD COLUMN IF NOT EXISTS vehicle_color TEXT;
  `);
  
  console.log('✅ Migration completed successfully');
}

main()
  .catch((e) => {
    console.error('❌ Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
