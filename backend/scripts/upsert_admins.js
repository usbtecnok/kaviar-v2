const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

async function upsertAdmins() {
  const prisma = new PrismaClient();
  
  try {
    // Primeiro, criar role admin se não existir
    const adminRole = await prisma.role.upsert({
      where: { name: 'admin' },
      update: {},
      create: { name: 'admin' }
    });
    
    const admins = [
      { email: 'suporte@usbtecnok.com.br', name: 'Suporte USB Tecnok' },
      { email: 'financeiro@usbtecnok.com.br', name: 'Financeiro USB Tecnok' }
    ];
    
    const password = '@#*Z4939ia4';
    const passwordHash = await bcrypt.hash(password, 10);
    
    for (const admin of admins) {
      const result = await prisma.admin.upsert({
        where: { email: admin.email },
        update: { passwordHash },
        create: {
          email: admin.email,
          name: admin.name,
          passwordHash,
          isActive: true,
          roleId: adminRole.id
        }
      });
      
      console.log(`OK_ADMIN_UPSERT { email: "${result.email}", id: "${result.id}" }`);
    }
  } catch (error) {
    console.error('ERRO_UPSERT:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

upsertAdmins();
