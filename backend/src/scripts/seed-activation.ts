import { prisma } from '../lib/prisma';

async function main() {
  console.log('🌱 Iniciando seed de ativação do sistema...');

  // 0. Criar admin se não existir
  const adminRole = await prisma.roles.upsert({
    where: { name: 'SUPER_ADMIN' },
    update: {},
    create: { name: 'SUPER_ADMIN' }
  });

  let admin = await prisma.admins.findFirst({
    where: { email: 'admin@kaviar.com' }
  });

  if (!admin) {
    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    admin = await prisma.admins.create({
      data: {
        name: 'Admin Kaviar',
        email: 'admin@kaviar.com',
        passwordHash: hashedPassword,
        roleId: adminRole.id,
        isActive: true
      }
    });
  }
  console.log('✅ Admin criado/verificado');

  // 1. Verificar se comunidade Furnas já existe
  let community = await prisma.communities.findFirst({
    where: { name: 'Furnas' }
  });

  if (!community) {
    community = await prisma.communities.create({
      data: {
        name: 'Furnas',
        description: 'Comunidade de Furnas - Minas Gerais',
        isActive: true
      }
    });
  }
  console.log('✅ Comunidade Furnas criada/verificada');

  // 2. Verificar se passageiro fictício já existe
  let passenger = await prisma.passengers.findFirst({
    where: { email: 'passageiro@furnas.com' }
  });

  if (!passenger) {
    passenger = await prisma.passengers.create({
      data: {
        name: 'João Silva',
        email: 'passageiro@furnas.com',
        phone: '(35) 99999-1111',
        communityId: community.id,
        status: 'approved'
      }
    });
  }
  console.log('✅ Passageiro fictício criado/verificado');

  // 3. Criar consentimento LGPD para passageiro
  await prisma.user_consents.upsert({
    where: {
      passengerId_consentType: {
        passengerId: passenger.id,
        consentType: 'lgpd'
      }
    },
    update: {},
    create: {
      passengerId: passenger.id,
      consentType: 'lgpd',
      accepted: true,
      acceptedAt: new Date(),
      ipAddress: 'seed-script'
    }
  });
  console.log('✅ Consentimento LGPD criado para passageiro');

  // 4. Verificar se motorista fictício já existe
  let driver = await prisma.drivers.findFirst({
    where: { email: 'motorista@furnas.com' }
  });

  if (!driver) {
    driver = await prisma.drivers.create({
      data: {
        name: 'Carlos Santos',
        email: 'motorista@furnas.com',
        phone: '(35) 99999-2222',
        status: 'approved',
        communityId: community.id,
        documentCpf: '123.456.789-00',
        documentRg: 'MG-12.345.678',
        documentCnh: '12345678901',
        vehiclePlate: 'ABC-1234',
        vehicleModel: 'Honda Civic 2020'
      }
    });
  }
  console.log('✅ Motorista fictício criado/verificado');

  // 5. Verificar se guia turístico fictício já existe
  let guide = await prisma.tourist_guides.findFirst({
    where: { email: 'guia@furnas.com' }
  });

  if (!guide) {
    guide = await prisma.tourist_guides.create({
      data: {
        name: 'Maria Oliveira',
        email: 'guia@furnas.com',
        phone: '(35) 99999-3333',
        communityId: community.id,
        status: 'approved',
        isBilingual: true,
        languages: ['Português', 'Inglês', 'Espanhol'],
        alsoDriver: false
      }
    });
  }
  console.log('✅ Guia turístico fictício criado/verificado');

  console.log('🎉 Seed de ativação concluído com sucesso!');
  console.log(`📊 Dados criados:
  - Comunidade: ${community.name}
  - Passageiro: ${passenger.name} (${passenger.email})
  - Motorista: ${driver.name} (${driver.email})
  - Guia: ${guide.name} (${guide.email})`);
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
