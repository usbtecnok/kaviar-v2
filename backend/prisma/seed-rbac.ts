import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🔐 Seeding RBAC Admin Users...');

  // 1. Criar roles
  const superAdminRole = await prisma.roles.upsert({
    where: { name: 'SUPER_ADMIN' },
    update: {},
    create: {
      id: 'super-admin',
      name: 'SUPER_ADMIN',
      created_at: new Date(),
      updated_at: new Date(),
    },
  });

  const angelViewerRole = await prisma.roles.upsert({
    where: { name: 'ANGEL_VIEWER' },
    update: {},
    create: {
      id: 'angel-viewer',
      name: 'ANGEL_VIEWER',
      created_at: new Date(),
      updated_at: new Date(),
    },
  });

  console.log('✓ Roles criadas');

  // 2. Criar SUPER_ADMIN
  const defaultPassword = 'Kaviar2026!Admin'; // Trocar em produção
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  const superAdmins = [
    {
      id: 'admin-suporte',
      name: 'Suporte USB Tecnok',
      email: 'suporte@usbtecnok.com.br',
    },
    {
      id: 'admin-financeiro',
      name: 'Financeiro USB Tecnok',
      email: 'financeiro@usbtecnok.com.br',
    },
  ];

  for (const admin of superAdmins) {
    await prisma.admins.upsert({
      where: { email: admin.email },
      update: { role_id: superAdminRole.id },
      create: {
        ...admin,
        password_hash: hashedPassword,
        is_active: true,
        role_id: superAdminRole.id,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  }

  console.log('✓ SUPER_ADMIN criados (2)');

  // 3. Criar ANGEL_VIEWER (10 investidores)
  const angelInvestors = [
    { id: 'angel-01', name: 'Investidor Anjo 1', email: 'angel1@kaviar.com' },
    { id: 'angel-02', name: 'Investidor Anjo 2', email: 'angel2@kaviar.com' },
    { id: 'angel-03', name: 'Investidor Anjo 3', email: 'angel3@kaviar.com' },
    { id: 'angel-04', name: 'Investidor Anjo 4', email: 'angel4@kaviar.com' },
    { id: 'angel-05', name: 'Investidor Anjo 5', email: 'angel5@kaviar.com' },
    { id: 'angel-06', name: 'Investidor Anjo 6', email: 'angel6@kaviar.com' },
    { id: 'angel-07', name: 'Investidor Anjo 7', email: 'angel7@kaviar.com' },
    { id: 'angel-08', name: 'Investidor Anjo 8', email: 'angel8@kaviar.com' },
    { id: 'angel-09', name: 'Investidor Anjo 9', email: 'angel9@kaviar.com' },
    { id: 'angel-10', name: 'Investidor Anjo 10', email: 'angel10@kaviar.com' },
  ];

  for (const angel of angelInvestors) {
    await prisma.admins.upsert({
      where: { email: angel.email },
      update: { role_id: angelViewerRole.id },
      create: {
        ...angel,
        password_hash: hashedPassword,
        is_active: true,
        role_id: angelViewerRole.id,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  }

  console.log('✓ ANGEL_VIEWER criados (10)');
  console.log('');
  console.log('📋 Credenciais padrão:');
  console.log(`   Email: suporte@usbtecnok.com.br`);
  console.log(`   Senha: ${defaultPassword}`);
  console.log('');
  console.log('⚠️  TROCAR SENHAS EM PRODUÇÃO!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
