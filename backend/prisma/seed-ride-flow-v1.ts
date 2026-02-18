import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

async function seedRideFlowV1() {
  console.log('🌱 Seeding SPEC_RIDE_FLOW_V1 test data...');

  const now = new Date();

  // Criar passageiro de teste (beta + password_hash)
  const password_hash = await bcrypt.hash('test1234', 10);
  
  const passenger = await prisma.passengers.upsert({
    where: { id: 'pass_beta_test_001' },
    create: {
      id: 'pass_beta_test_001',
      name: 'Test Passenger',
      email: 'passenger@test.com',
      phone: '+5521999999001',
      status: 'ACTIVE',
      password_hash,
      created_at: now,
      updated_at: now
    },
    update: {
      status: 'ACTIVE',
      password_hash,
      updated_at: now
    }
  });
  console.log('✓ Passenger created:', passenger.id);

  // Criar 2 motoristas de teste
  const driverHash = await bcrypt.hash('test1234', 10);

  const driver1 = await prisma.drivers.upsert({
    where: { id: 'test-driver-1' },
    create: {
      id: 'test-driver-1',
      name: 'Test Driver 1',
      email: 'driver1@test.com',
      phone: '+5521999999101',
      status: 'active',
      password_hash: driverHash,
      last_lat: -22.9668,
      last_lng: -43.1729,
      created_at: now,
      updated_at: now
    },
    update: {
      password_hash: driverHash,
      updated_at: now
    }
  });
  console.log('✓ Driver 1 created:', driver1.id);

  const driver2 = await prisma.drivers.upsert({
    where: { id: 'test-driver-2' },
    create: {
      id: 'test-driver-2',
      name: 'Test Driver 2',
      email: 'driver2@test.com',
      phone: '+5521999999102',
      status: 'active',
      password_hash: driverHash,
      last_lat: -22.9700,
      last_lng: -43.1800,
      created_at: now,
      updated_at: now
    },
    update: {
      password_hash: driverHash,
      updated_at: now
    }
  });
  console.log('✓ Driver 2 created:', driver2.id);

  // Criar status e localização para os motoristas
  await prisma.driver_status.upsert({
    where: { driver_id: driver1.id },
    create: {
      driver_id: driver1.id,
      availability: 'online',
      updated_at: now
    },
    update: {
      availability: 'online',
      updated_at: now
    }
  });

  await prisma.driver_status.upsert({
    where: { driver_id: driver2.id },
    create: {
      driver_id: driver2.id,
      availability: 'online',
      updated_at: now
    },
    update: {
      availability: 'online',
      updated_at: now
    }
  });

  await prisma.driver_locations.upsert({
    where: { driver_id: driver1.id },
    create: {
      driver_id: driver1.id,
      lat: -22.9668,
      lng: -43.1729,
      updated_at: now
    },
    update: {
      lat: -22.9668,
      lng: -43.1729,
      updated_at: now
    }
  });

  await prisma.driver_locations.upsert({
    where: { driver_id: driver2.id },
    create: {
      driver_id: driver2.id,
      lat: -22.9700,
      lng: -43.1800,
      updated_at: now
    },
    update: {
      lat: -22.9700,
      lng: -43.1800,
      updated_at: now
    }
  });

  console.log('✓ Driver status and locations created');
  console.log('');
  console.log('✅ Seed completed!');
  console.log('');
  console.log('Test credentials:');
  console.log('  Passenger ID: pass_beta_test_001');
  console.log('  Passenger Email: passenger@test.com');
  console.log('  Passenger Password: test1234');
  console.log('  Driver 1 ID: test-driver-1');
  console.log('  Driver 1 Email: driver1@test.com');
  console.log('  Driver 1 Password: test1234');
  console.log('  Driver 2 ID: test-driver-2');
  console.log('  Driver 2 Email: driver2@test.com');
  console.log('  Driver 2 Password: test1234');
}

seedRideFlowV1()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
