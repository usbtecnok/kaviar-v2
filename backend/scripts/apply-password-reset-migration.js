const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Applying password reset migration...');
  
  // Add columns
  await prisma.$executeRawUnsafe(`
    ALTER TABLE admins ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255) UNIQUE;
  `);
  
  await prisma.$executeRawUnsafe(`
    ALTER TABLE admins ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMP;
  `);
  
  // Add index
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_admins_reset_token ON admins(reset_token) WHERE reset_token IS NOT NULL;
  `);
  
  console.log('SUCCESS: Migration applied');
}

main()
  .catch(error => {
    console.error('ERROR:', error.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
