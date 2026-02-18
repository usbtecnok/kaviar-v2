import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

async function seedLoadTest() {
  console.log('🌱 Seeding load test: 10 drivers + 1 passenger...');

  const now = new Date();
  const driverHash = await bcrypt.hash('test1234', 10);
  const passengerHash = await bcrypt.hash('test1234', 10);

  // Passenger
  await prisma.passengers.upsert({
    where: { id: 'pass_load_test' },
    create: {
      id: 'pass_load_test',
      name: 'Load Test Passenger',
      email: 'passenger@test.com',
      phone: '+5521999999001',
      status: 'ACTIVE',
      password_hash: passengerHash,
      created_at: now,
      updated_at: now
    },
    update: {
      status: 'ACTIVE',
      password_hash: passengerHash,
      updated_at: now
    }
  });

  // Geofence coords (Rio - Copacabana area)
  // INSIDE: -22.965 to -22.975 lat, -43.170 to -43.185 lng
  // OUTSIDE: -22.980 to -22.990 lat, -43.190 to -43.200 lng

  const driversInside = [
    { id: 'driver-inside-1', email: 'driver1@test.com', lat: -22.9668, lng: -43.1729 },
    { id: 'driver-inside-2', email: 'driver2@test.com', lat: -22.9700, lng: -43.1800 },
    { id: 'driver-inside-3', email: 'driver3@test.com', lat: -22.9680, lng: -43.1750 },
    { id: 'driver-inside-4', email: 'driver4@test.com', lat: -22.9710, lng: -43.1820 },
    { id: 'driver-inside-5', email: 'driver5@test.com', lat: -22.9690, lng: -43.1770 },
  ];

  const driversOutside = [
    { id: 'driver-outside-1', email: 'driver6@test.com', lat: -22.9820, lng: -43.1920 },
    { id: 'driver-outside-2', email: 'driver7@test.com', lat: -22.9850, lng: -43.1950 },
    { id: 'driver-outside-3', email: 'driver8@test.com', lat: -22.9830, lng: -43.1930 },
    { id: 'driver-outside-4', email: 'driver9@test.com', lat: -22.9860, lng: -43.1960 },
    { id: 'driver-outside-5', email: 'driver10@test.com', lat: -22.9840, lng: -43.1940 },
  ];

  const allDrivers = [...driversInside, ...driversOutside];

  // Validar que drivers INSIDE estão realmente dentro do range
  const insideValid = driversInside.every(d => 
    d.lat >= -22.975 && d.lat <= -22.965 && d.lng >= -43.185 && d.lng <= -43.170
  );
  const outsideValid = driversOutside.every(d => 
    !(d.lat >= -22.975 && d.lat <= -22.965 && d.lng >= -43.185 && d.lng <= -43.170)
  );

  if (!insideValid || !outsideValid) {
    console.error('❌ ERROR: Driver coordinates do not match INSIDE/OUTSIDE boundaries!');
    process.exit(1);
  }

  for (const d of allDrivers) {
    await prisma.drivers.upsert({
      where: { id: d.id },
      create: {
        id: d.id,
        name: `Test Driver ${d.id}`,
        email: d.email,
        phone: `+552199999${allDrivers.indexOf(d) + 1}`,
        status: 'active',
        password_hash: driverHash,
        last_lat: d.lat,
        last_lng: d.lng,
        created_at: now,
        updated_at: now
      },
      update: {
        password_hash: driverHash,
        status: 'active',
        last_lat: d.lat,
        last_lng: d.lng,
        updated_at: now
      }
    });

    await prisma.driver_status.upsert({
      where: { driver_id: d.id },
      create: {
        driver_id: d.id,
        availability: 'online',
        updated_at: now
      },
      update: {
        availability: 'online',
        updated_at: now
      }
    });

    await prisma.driver_locations.upsert({
      where: { driver_id: d.id },
      create: {
        driver_id: d.id,
        lat: d.lat,
        lng: d.lng,
        updated_at: now
      },
      update: {
        lat: d.lat,
        lng: d.lng,
        updated_at: now
      }
    });
  }

  console.log('✅ Seed completed!');
  console.log('');
  console.log('📍 Geofence boundaries (INSIDE):');
  console.log('   Lat: -22.975 to -22.965');
  console.log('   Lng: -43.185 to -43.170');
  console.log('');
  console.log('🚗 Drivers INSIDE geofence (5):');
  driversInside.forEach(d => {
    console.log(`   ${d.id}: lat=${d.lat}, lng=${d.lng}`);
  });
  console.log('');
  console.log('🚗 Drivers OUTSIDE geofence (5):');
  driversOutside.forEach(d => {
    console.log(`   ${d.id}: lat=${d.lat}, lng=${d.lng}`);
  });
  console.log('');
  console.log('👤 Passenger: passenger@test.com / test1234');
  console.log('🔑 All drivers: test1234');
}

seedLoadTest()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
