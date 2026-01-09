const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const communities = await prisma.community.findMany({
    select: { id: true, name: true }
  });
  
  console.log(`Total de comunidades no banco: ${communities.length}`);
  communities.forEach(c => console.log(`- ${c.name} (${c.id})`));
  
  await prisma.$disconnect();
}

main().catch(console.error);
