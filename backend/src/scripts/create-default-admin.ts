import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createDefaultAdmin() {
  try {
    // Check if SUPER_ADMIN role exists
    let superAdminRole = await prisma.roles.findUnique({
      where: { name: 'SUPER_ADMIN' }
    });

    if (!superAdminRole) {
      superAdminRole = await prisma.roles.create({
        data: { name: 'SUPER_ADMIN' }
      });
      console.log('✅ Role SUPER_ADMIN criada');
    }

    // Check if OPERATOR role exists
    let operatorRole = await prisma.roles.findUnique({
      where: { name: 'OPERATOR' }
    });

    if (!operatorRole) {
      operatorRole = await prisma.roles.create({
        data: { name: 'OPERATOR' }
      });
      console.log('✅ Role OPERATOR criada');
    }

    // Check if default admin exists
    const existingAdmin = await prisma.admins.findUnique({
      where: { email: 'admin@kaviar.com' }
    });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('admin123', 12);
      
      await prisma.admins.create({
        data: {
          name: 'Admin Kaviar',
          email: 'admin@kaviar.com',
          passwordHash: hashedPassword,
          roleId: superAdminRole.id,
          isActive: true,
        }
      });
      
      console.log('✅ Admin padrão criado');
      console.log('📧 Email: admin@kaviar.com');
      console.log('🔑 Senha: admin123');
    } else {
      console.log('ℹ️  Admin padrão já existe');
    }

  } catch (error) {
    console.error('❌ Erro ao criar admin padrão:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createDefaultAdmin();
