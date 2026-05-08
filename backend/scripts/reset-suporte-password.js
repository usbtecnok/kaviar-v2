const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash(process.env.ADMIN_DEFAULT_PASSWORD || 'CHANGE_ME', 10);
  
  // Resetar apenas suporte@kaviar.com.br
  const result = await prisma.admins.updateMany({
    where: {
      email: 'suporte@kaviar.com.br'
    },
    data: {
      password: hash,
      must_change_password: true,
      updated_at: new Date()
    }
  });
  
  console.log(`SUCCESS: ${JSON.stringify({ updated: result.count, email: 'suporte@kaviar.com.br', password: process.env.ADMIN_DEFAULT_PASSWORD || 'CHANGE_ME', must_change: true })}`);
}

main()
  .catch(error => {
    console.error(`ERROR: ${error.message}`);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
