const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Applying password reset migration...');
    
    await prisma.$executeRawUnsafe(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255) UNIQUE`);
    console.log('✓ Added reset_token column');
    
    await prisma.$executeRawUnsafe(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMP`);
    console.log('✓ Added reset_token_expires_at column');
    
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_admins_reset_token ON admins(reset_token) WHERE reset_token IS NOT NULL`);
    console.log('✓ Created index');
    
    console.log('SUCCESS: Migration completed');
  } catch (error) {
    console.error('ERROR:', error.message);
    throw error;
  }
}

main()
  .catch(error => {
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
