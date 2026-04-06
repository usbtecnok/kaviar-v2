import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcrypt';

async function main() {
  const email = 'financeiro@kaviar.com.br';
  const existing = await prisma.admins.findUnique({ where: { email } });

  if (existing) {
    console.log(`⚠️  Usuário ${email} já existe (id=${existing.id}, role=${existing.role})`);
    if (existing.role !== 'FINANCE') {
      await prisma.admins.update({ where: { email }, data: { role: 'FINANCE' } });
      console.log('✅ Role atualizada para FINANCE');
    }
    process.exit(0);
  }

  const tempPassword = 'Kaviar@Finance2026!';
  const password = await bcrypt.hash(tempPassword, 10);

  const admin = await prisma.admins.create({
    data: {
      name: 'Financeiro Kaviar',
      email,
      password,
      role: 'FINANCE',
      is_active: true,
      must_change_password: true,
    },
  });

  console.log('✅ Usuário financeiro criado:');
  console.log(`   ID:    ${admin.id}`);
  console.log(`   Email: ${admin.email}`);
  console.log(`   Role:  ${admin.role}`);
  console.log(`   Senha temporária: ${tempPassword}`);
  console.log('   ⚠️  must_change_password = true (troca obrigatória no primeiro login)');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Erro ao criar usuário financeiro:', err);
  process.exit(1);
});
