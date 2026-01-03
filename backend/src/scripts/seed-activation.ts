import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de ativação do sistema...');

  // 1. Verificar se comunidade Furnas já existe
  let community = await prisma.community.findFirst({
    where: { name: 'Furnas' }
  });

  if (!community) {
    community = await prisma.community.create({
      data: {
        name: 'Furnas',
        description: 'Comunidade de Furnas - Minas Gerais',
        isActive: true
      }
    });
  }
  console.log('✅ Comunidade Furnas criada/verificada');

  // 2. Verificar se passageiro fictício já existe
  let passenger = await prisma.passenger.findFirst({
    where: { email: 'passageiro@furnas.com' }
  });

  if (!passenger) {
    passenger = await prisma.passenger.create({
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
  await prisma.userConsent.upsert({
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
  let driver = await prisma.driver.findFirst({
    where: { email: 'motorista@furnas.com' }
  });

  if (!driver) {
    driver = await prisma.driver.create({
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
  let guide = await prisma.touristGuide.findFirst({
    where: { email: 'guia@furnas.com' }
  });

  if (!guide) {
    guide = await prisma.touristGuide.create({
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
