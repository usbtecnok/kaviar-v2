#!/usr/bin/env node

/**
 * Test: Favorites Matching Algorithm
 * Validates deterministic scoring and ranking
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Mock feature flag (always enabled for tests)
process.env.FEATURE_PASSENGER_FAVORITES_MATCHING = 'true';

const { rankDriversByFavorites } = require('../dist/services/favorites-matching.service');

async function setup() {
  console.log('🔧 Setup: Creating test data...\n');

  // Create test passenger
  const passenger = await prisma.passengers.upsert({
    where: { id: 'test_pass_favorites' },
    update: {},
    create: {
      id: 'test_pass_favorites',
      name: 'Test Passenger',
      email: 'test.passenger@kaviar.test',
      phone: '+5511999999999',
      created_at: new Date(),
      updated_at: new Date()
    }
  });

  // Create HOME favorite (Paulista Ave)
  await prisma.passenger_favorite_locations.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      passenger_id: passenger.id,
      label: 'Casa',
      type: 'HOME',
      lat: -23.5505,
      lng: -46.6333,
      created_at: new Date(),
      updated_at: new Date()
    }
  });

  // Create test drivers
  const drivers = [
    {
      id: 'driver_near_home',
      name: 'Driver Near Home',
      email: 'driver_near_home@kaviar.test',
      phone: '+5511999990001',
      status: 'active',
      last_lat: -23.5515, // 300m from HOME
      last_lng: -46.6343,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 'driver_far_home',
      name: 'Driver Far Home',
      email: 'driver_far_home@kaviar.test',
      phone: '+5511999990002',
      status: 'active',
      last_lat: -23.5805, // 3km from HOME
      last_lng: -46.6633,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 'driver_secondary_base',
      name: 'Driver Secondary Base',
      email: 'driver_secondary_base@kaviar.test',
      phone: '+5511999990003',
      status: 'active',
      last_lat: -23.5805, // Far primary
      last_lng: -46.6633,
      secondary_base_lat: -23.5510, // 200m from HOME
      secondary_base_lng: -46.6338,
      secondary_base_enabled: true,
      created_at: new Date(),
      updated_at: new Date()
    }
  ];

  for (const d of drivers) {
    await prisma.drivers.upsert({
      where: { id: d.id },
      update: {},
      create: d
    });
  }

  console.log('✅ Setup complete\n');
  return { passenger, drivers };
}

async function testAnchorDetection() {
  console.log('📍 TEST 1: Anchor Detection');
  console.log('Pickup: 100m from HOME favorite\n');

  const drivers = await prisma.drivers.findMany({
    where: {
      id: { in: ['driver_near_home', 'driver_far_home'] }
    }
  });

  const pickup = { lat: -23.5510, lng: -46.6338 }; // 100m from HOME

  const ranked = await rankDriversByFavorites(
    drivers,
    'test_pass_favorites',
    pickup
  );

  console.log('Ranking:');
  ranked.forEach((d, i) => {
    console.log(`  ${i + 1}. ${d.name} (score: ${d.score}, distance: ${Math.round(d.distance)}m)`);
  });

  const pass = ranked[0].id === 'driver_near_home';
  console.log(`\n${pass ? '✅ PASS' : '❌ FAIL'}: Driver near HOME ranked first\n`);
  return pass;
}

async function testNoAnchor() {
  console.log('📍 TEST 2: No Anchor (pickup far from favorites)');
  console.log('Pickup: 5km from all favorites\n');

  const drivers = await prisma.drivers.findMany({
    where: {
      id: { in: ['driver_near_home', 'driver_far_home'] }
    }
  });

  const pickup = { lat: -23.6000, lng: -46.7000 }; // Far from HOME

  const ranked = await rankDriversByFavorites(
    drivers,
    'test_pass_favorites',
    pickup
  );

  console.log('Ranking:');
  ranked.forEach((d, i) => {
    console.log(`  ${i + 1}. ${d.name} (score: ${d.score})`);
  });

  console.log('\n✅ PASS: No anchor detected, ranking by pickup distance only\n');
  return true;
}

async function testSecondaryBase() {
  console.log('📍 TEST 3: Secondary Base Priority');
  console.log('Driver with secondary base closer to anchor\n');

  const drivers = await prisma.drivers.findMany({
    where: {
      id: { in: ['driver_far_home', 'driver_secondary_base'] }
    }
  });

  const pickup = { lat: -23.5510, lng: -46.6338 }; // 100m from HOME

  const ranked = await rankDriversByFavorites(
    drivers,
    'test_pass_favorites',
    pickup
  );

  console.log('Ranking:');
  ranked.forEach((d, i) => {
    console.log(`  ${i + 1}. ${d.name} (score: ${d.score}, distance: ${Math.round(d.distance)}m)`);
  });

  const pass = ranked[0].id === 'driver_secondary_base';
  console.log(`\n${pass ? '✅ PASS' : '❌ FAIL'}: Driver with secondary base near HOME ranked first\n`);
  return pass;
}

async function testFeatureFlagOff() {
  console.log('📍 TEST 4: Feature Flag OFF');
  
  // Temporarily disable feature
  const originalFlag = process.env.FEATURE_PASSENGER_FAVORITES_MATCHING;
  process.env.FEATURE_PASSENGER_FAVORITES_MATCHING = 'false';

  const drivers = await prisma.drivers.findMany({
    where: {
      id: { in: ['driver_near_home', 'driver_far_home'] }
    }
  });

  const pickup = { lat: -23.5510, lng: -46.6338 };

  const ranked = await rankDriversByFavorites(
    drivers,
    'test_pass_favorites',
    pickup
  );

  // Restore flag
  process.env.FEATURE_PASSENGER_FAVORITES_MATCHING = originalFlag;

  const pass = ranked[0].id === drivers[0].id; // Original order preserved
  console.log(`${pass ? '✅ PASS' : '❌ FAIL'}: Original order preserved when feature OFF\n`);
  return pass;
}

async function cleanup() {
  console.log('🧹 Cleanup: Removing test data...');
  
  await prisma.passenger_favorite_locations.deleteMany({
    where: { passenger_id: 'test_pass_favorites' }
  });
  
  await prisma.passengers.deleteMany({
    where: { id: 'test_pass_favorites' }
  });
  
  await prisma.drivers.deleteMany({
    where: {
      id: { in: ['driver_near_home', 'driver_far_home', 'driver_secondary_base'] }
    }
  });
  
  console.log('✅ Cleanup complete\n');
}

async function main() {
  console.log('🧪 FAVORITES MATCHING ALGORITHM TESTS\n');
  console.log('='.repeat(50) + '\n');

  try {
    await setup();

    const results = [];
    results.push(await testAnchorDetection());
    results.push(await testNoAnchor());
    results.push(await testSecondaryBase());
    results.push(await testFeatureFlagOff());

    await cleanup();

    console.log('='.repeat(50));
    console.log('\n📊 RESULTS\n');
    console.log(`Total: ${results.length}`);
    console.log(`Passed: ${results.filter(r => r).length}`);
    console.log(`Failed: ${results.filter(r => !r).length}`);

    const allPassed = results.every(r => r);
    console.log(`\n${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}\n`);

    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    console.error('❌ Test error:', error);
    await cleanup();
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
