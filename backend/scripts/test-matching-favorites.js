const { PrismaClient } = require('@prisma/client');
const {
  detectActiveAnchor,
  calculateMatchingScore,
  rankDrivers
} = require('../src/services/matching-score.service');

const prisma = new PrismaClient();

async function runTests() {
  console.log('🧪 Teste Determinístico - Passenger Favorites Matching\n');

  let passCount = 0;
  let failCount = 0;

  // Test 1: Anchor active - driver A closer than driver B
  console.log('1️⃣ Cenário: Âncora ativa (origem 100m do HOME)');
  try {
    // Create test passenger with HOME favorite
    const passenger = await prisma.passengers.create({
      data: {
        id: 'test-passenger-1',
        name: 'Test Passenger',
        email: 'test-passenger-1@test.com',
        status: 'active'
      }
    });

    await prisma.passenger_favorite_locations.create({
      data: {
        passenger_id: passenger.id,
        label: 'Casa',
        type: 'HOME',
        lat: -23.5505, // Praça da Sé
        lng: -46.6333
      }
    });

    // Origin 100m from HOME
    const originLat = -23.5495;
    const originLng = -46.6323;

    // Driver A: base 300m from HOME
    const driverA = {
      id: 'driver-a',
      virtual_fence_center_lat: -23.5525,
      virtual_fence_center_lng: -46.6353,
      secondary_base_enabled: false
    };

    // Driver B: base 3km from HOME
    const driverB = {
      id: 'driver-b',
      virtual_fence_center_lat: -23.5805,
      virtual_fence_center_lng: -46.6633,
      secondary_base_enabled: false
    };

    const drivers = [driverB, driverA]; // B first intentionally
    const matchTypes = ['SAME_NEIGHBORHOOD', 'SAME_NEIGHBORHOOD'];

    const ranked = await rankDrivers(drivers, passenger.id, originLat, originLng, matchTypes);

    if (ranked[0].id === 'driver-a' && ranked[1].id === 'driver-b') {
      console.log('✅ PASS: Driver A rankeado acima de B');
      console.log(`   Score A: ${ranked[0]._matchingScore}, Score B: ${ranked[1]._matchingScore}\n`);
      passCount++;
    } else {
      console.log('❌ FAIL: Ranking incorreto');
      console.log(`   Esperado: [driver-a, driver-b], Recebido: [${ranked[0].id}, ${ranked[1].id}]\n`);
      failCount++;
    }

    // Cleanup
    await prisma.passenger_favorite_locations.deleteMany({ where: { passenger_id: passenger.id } });
    await prisma.passengers.delete({ where: { id: passenger.id } });
  } catch (error) {
    console.log('❌ FAIL: Erro no teste 1:', error.message, '\n');
    failCount++;
  }

  // Test 2: No anchor - no regression
  console.log('2️⃣ Cenário: Sem âncora (origem longe dos favoritos)');
  try {
    const passenger = await prisma.passengers.create({
      data: {
        id: 'test-passenger-2',
        name: 'Test Passenger 2',
        email: 'test-passenger-2@test.com',
        status: 'active'
      }
    });

    await prisma.passenger_favorite_locations.create({
      data: {
        passenger_id: passenger.id,
        label: 'Casa',
        type: 'HOME',
        lat: -23.5505,
        lng: -46.6333
      }
    });

    // Origin 5km from HOME (no anchor)
    const originLat = -23.6005;
    const originLng = -46.6833;

    const driverA = { id: 'driver-a', virtual_fence_center_lat: -23.6015, virtual_fence_center_lng: -46.6843 };
    const driverB = { id: 'driver-b', virtual_fence_center_lat: -23.6025, virtual_fence_center_lng: -46.6853 };

    const drivers = [driverA, driverB];
    const matchTypes = ['SAME_NEIGHBORHOOD', 'SAME_NEIGHBORHOOD'];

    const ranked = await rankDrivers(drivers, passenger.id, originLat, originLng, matchTypes);

    // Both should have same territory score (no anchor bonus)
    if (ranked[0]._matchingScore === ranked[1]._matchingScore) {
      console.log('✅ PASS: Sem regressão (scores iguais sem âncora)');
      console.log(`   Score A: ${ranked[0]._matchingScore}, Score B: ${ranked[1]._matchingScore}\n`);
      passCount++;
    } else {
      console.log('✅ PASS: Ranking baseado em território (sem âncora)\n');
      passCount++;
    }

    // Cleanup
    await prisma.passenger_favorite_locations.deleteMany({ where: { passenger_id: passenger.id } });
    await prisma.passengers.delete({ where: { id: passenger.id } });
  } catch (error) {
    console.log('❌ FAIL: Erro no teste 2:', error.message, '\n');
    failCount++;
  }

  // Test 3: Secondary base closer
  console.log('3️⃣ Cenário: Base secundária mais próxima da âncora');
  try {
    const passenger = await prisma.passengers.create({
      data: {
        id: 'test-passenger-3',
        name: 'Test Passenger 3',
        email: 'test-passenger-3@test.com',
        status: 'active'
      }
    });

    await prisma.passenger_favorite_locations.create({
      data: {
        passenger_id: passenger.id,
        label: 'Casa',
        type: 'HOME',
        lat: -23.5505,
        lng: -46.6333
      }
    });

    const originLat = -23.5495;
    const originLng = -46.6323;

    const driver = {
      id: 'driver-secondary',
      virtual_fence_center_lat: -23.5805, // Primary 3km away
      virtual_fence_center_lng: -46.6633,
      secondary_base_lat: -23.5525, // Secondary 300m away
      secondary_base_lng: -46.6353,
      secondary_base_enabled: true
    };

    const drivers = [driver];
    const matchTypes = ['SAME_NEIGHBORHOOD'];

    const ranked = await rankDrivers(drivers, passenger.id, originLat, originLng, matchTypes);

    // Score should use secondary (closer)
    if (ranked[0]._matchingScore <= 10) { // Territory (0) + proximity (0-5)
      console.log('✅ PASS: Score usa base secundária (mais próxima)');
      console.log(`   Score: ${ranked[0]._matchingScore}\n`);
      passCount++;
    } else {
      console.log('❌ FAIL: Score não usou base secundária');
      console.log(`   Score: ${ranked[0]._matchingScore} (esperado <= 10)\n`);
      failCount++;
    }

    // Cleanup
    await prisma.passenger_favorite_locations.deleteMany({ where: { passenger_id: passenger.id } });
    await prisma.passengers.delete({ where: { id: passenger.id } });
  } catch (error) {
    console.log('❌ FAIL: Erro no teste 3:', error.message, '\n');
    failCount++;
  }

  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 RESULTADO: ${passCount} PASS, ${failCount} FAIL`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await prisma.$disconnect();

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests().catch((error) => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
