const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('z4939ia4', 10);
  
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
  
  console.log(`SUCCESS: ${JSON.stringify({ updated: result.count, email: 'suporte@kaviar.com.br', password: 'z4939ia4', must_change: true })}`);
}

main()
  .catch(error => {
    console.error(`ERROR: ${error.message}`);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
