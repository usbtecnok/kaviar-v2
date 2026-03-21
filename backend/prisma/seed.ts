import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Inicializando dados padrão...');

  // Admin padrão
  const hashedPassword = await bcrypt.hash('admin123', 12);
  await prisma.admins.upsert({
    where: { email: 'admin@kaviar.com' },
    update: { password: hashedPassword },
    create: {
      name: 'Admin Kaviar',
      email: 'admin@kaviar.com',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      is_active: true,
      must_change_password: false,
    },
  });
  console.log('✅ Admin: admin@kaviar.com / admin123');

  // Bairro de teste
  const neighborhood = await prisma.neighborhoods.upsert({
    where: { id: 'bairro-centro-rj' },
    update: {},
    create: {
      id: 'bairro-centro-rj',
      name: 'Centro',
      city: 'Rio de Janeiro',
      area_type: 'BAIRRO_OFICIAL',
      is_active: true,
      updated_at: new Date(),
    },
  });
  console.log('✅ Bairro: Centro - RJ');

  // Comunidade de teste
  await prisma.communities.upsert({
    where: { id: 'comunidade-centro-rj' },
    update: {},
    create: {
      id: 'comunidade-centro-rj',
      name: 'Comunidade Centro RJ',
      is_active: true,
      updated_at: new Date(),
    },
  });
  console.log('✅ Comunidade: Comunidade Centro RJ');

  // Motorista de teste
  const driverPassword = await bcrypt.hash('driver123', 10);
  await prisma.drivers.upsert({
    where: { email: 'motorista@kaviar.com' },
    update: { password_hash: driverPassword },
    create: {
      id: 'driver-test-001',
      name: 'Motorista Teste',
      email: 'motorista@kaviar.com',
      phone: '21999990001',
      password_hash: driverPassword,
      status: 'approved',
      neighborhood_id: neighborhood.id,
      document_cpf: '000.000.000-00',
      vehicle_color: 'Prata',
      vehicle_model: 'Gol 2020',
      vehicle_plate: 'ABC-1234',
      updated_at: new Date(),
    },
  });
  console.log('✅ Motorista: motorista@kaviar.com / driver123 (approved)');

  // Motorista pendente (para testar fluxo de documentos)
  await prisma.drivers.upsert({
    where: { email: 'novo.motorista@kaviar.com' },
    update: { password_hash: driverPassword },
    create: {
      id: 'driver-test-002',
      name: 'Novo Motorista',
      email: 'novo.motorista@kaviar.com',
      phone: '21999990002',
      password_hash: driverPassword,
      status: 'pending',
      neighborhood_id: neighborhood.id,
      document_cpf: '111.111.111-11',
      vehicle_color: 'Branco',
      updated_at: new Date(),
    },
  });
  console.log('✅ Motorista pendente: novo.motorista@kaviar.com / driver123 (pending)');

  // Passageiro de teste (para fluxo de corrida v2)
  const passengerPassword = await bcrypt.hash('pass123', 10);
  await prisma.passengers.upsert({
    where: { email: 'passageiro@kaviar.com' },
    update: { password_hash: passengerPassword },
    create: {
      id: 'passenger-test-001',
      name: 'Passageiro Teste',
      email: 'passageiro@kaviar.com',
      phone: '21999990003',
      password_hash: passengerPassword,
      status: 'ACTIVE',
      updated_at: new Date(),
    },
  });

  // Consent LGPD do passageiro (obrigatório para login)
  await prisma.user_consents.upsert({
    where: { passenger_id_consent_type: { passenger_id: 'passenger-test-001', consent_type: 'LGPD' } },
    update: { accepted: true },
    create: {
      id: 'consent-lgpd-passenger-test-001',
      passenger_id: 'passenger-test-001',
      consent_type: 'LGPD',
      accepted: true,
      accepted_at: new Date(),
      ip_address: '127.0.0.1',
    },
  });
  console.log('✅ Passageiro: passageiro@kaviar.com / pass123 (ACTIVE + LGPD)');

  console.log('\n🎉 Seed completo!');
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
