import { prisma } from '../lib/prisma';

async function createTestData() {
  console.log('🧪 Criando dados de teste para corridas...');

  // Create test passengers
  const passenger1 = await prisma.passengers.upsert({
    where: { email: 'joao@test.com' },
    update: {},
    create: {
      name: 'João Silva',
      email: 'joao@test.com',
      phone: '+5511999999999',
    },
  });

  const passenger2 = await prisma.passengers.upsert({
    where: { email: 'maria@test.com' },
    update: {},
    create: {
      name: 'Maria Santos',
      email: 'maria@test.com',
      phone: '+5511888888888',
    },
  });

  // Create test drivers
  const driver1 = await prisma.drivers.upsert({
    where: { email: 'carlos@driver.com' },
    update: {},
    create: {
      name: 'Carlos Motorista',
      email: 'carlos@driver.com',
      phone: '+5511777777777',
      status: 'approved',
    },
  });

  const driver2 = await prisma.drivers.upsert({
    where: { email: 'ana@driver.com' },
    update: {},
    create: {
      name: 'Ana Condutora',
      email: 'ana@driver.com',
      phone: '+5511666666666',
      status: 'approved',
    },
  });

  // Create test rides
  const rides = [
    {
      passengerId: passenger1.id,
      driverId: driver1.id,
      origin: 'Shopping Center',
      destination: 'Aeroporto Internacional',
      type: 'normal',
      status: 'started',
      price: 45.50,
      platformFee: 6.83,
      driverAmount: 38.67,
      paymentMethod: 'credit_card',
    },
    {
      passengerId: passenger2.id,
      driverId: driver2.id,
      origin: 'Centro da Cidade',
      destination: 'Universidade',
      type: 'combo',
      status: 'completed',
      price: 25.00,
      platformFee: 3.75,
      driverAmount: 21.25,
      paymentMethod: 'pix',
    },
    {
      passengerId: passenger1.id,
      driverId: null,
      origin: 'Casa',
      destination: 'Trabalho',
      type: 'normal',
      status: 'requested',
      price: 15.75,
      paymentMethod: 'credit_card',
    },
    {
      passengerId: passenger2.id,
      driverId: driver1.id,
      origin: 'Hospital',
      destination: 'Farmácia',
      type: 'comunidade',
      status: 'accepted',
      price: 12.30,
      paymentMethod: 'debit_card',
    },
  ];

  for (const rideData of rides) {
    const ride = await prisma.rides.create({
      data: rideData,
    });

    // Create status history
    await prisma.ride_status_history.create({
      data: {
        rideId: ride.id,
        status: rideData.status,
      },
    });

    console.log(`✅ Corrida criada: ${rideData.origin} → ${rideData.destination} (${rideData.status})`);
  }

  console.log('🎉 Dados de teste criados com sucesso!');
}

createTestData()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
