import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Inicializando dados padrão...');

  // Create roles
  const superAdminRole = await prisma.role.upsert({
    where: { name: 'SUPER_ADMIN' },
    update: {},
    create: { name: 'SUPER_ADMIN' },
  });

  const operatorRole = await prisma.role.upsert({
    where: { name: 'OPERATOR' },
    update: {},
    create: { name: 'OPERATOR' },
  });

  console.log('✅ Roles criadas');

  // Create default admin

    throw new Error('ADMIN_DEFAULT_PASSWORD missing for seed');
  }

  const hashedPassword = await bcrypt.hash(process.env.ADMIN_DEFAULT_PASSWORD as string, 12);
  
  const admin = await prisma.admin.upsert({
    where: { email: 'admin@kaviar.com' },
    update: {
      passwordHash: hashedPassword,
      isActive: true,
    },
    create: {
      name: 'Admin Kaviar',
      email: 'admin@kaviar.com',
      passwordHash: hashedPassword,
      roleId: superAdminRole.id,
      isActive: true,
    },
  });

  console.log('✅ Admin padrão criado/atualizado');
  console.log('📧 Email: admin@kaviar.com');
  console.log('🔑 Admin password set via ADMIN_DEFAULT_PASSWORD');
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
