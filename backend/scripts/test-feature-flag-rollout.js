const { PrismaClient } = require('@prisma/client');
const { isFeatureEnabled, getPassengerHash, clearFeatureFlagCache } = require('../dist/services/feature-flag.service');

const prisma = new PrismaClient();

async function testFeatureFlagRollout() {
  console.log('=== FEATURE FLAG ROLLOUT - TESTES DETERMINÍSTICOS ===\n');

  const KEY = 'passenger_favorites_matching';
  const TEST_PASSENGERS = [
    'test-pass-001',
    'test-pass-002',
    'test-pass-003',
    'test-pass-004',
    'test-pass-005',
  ];

  let allPassed = true;

  try {
    // Setup: Clear cache
    clearFeatureFlagCache();

    // Test 1: Allowlist sempre ON
    console.log('TEST 1: Allowlist Priority (sempre ON)');
    console.log('---------------------------------------');
    
    // Set flag to 0% rollout
    await prisma.feature_flags.upsert({
      where: { key: KEY },
      update: { enabled: true, rollout_percentage: 0 },
      create: { key: KEY, enabled: true, rollout_percentage: 0 },
    });
    clearFeatureFlagCache();

    // Add test-pass-001 to allowlist
    await prisma.feature_flag_allowlist.upsert({
      where: { key_passenger_id: { key: KEY, passenger_id: TEST_PASSENGERS[0] } },
      update: {},
      create: { key: KEY, passenger_id: TEST_PASSENGERS[0] },
    });

    const result1 = await isFeatureEnabled(KEY, TEST_PASSENGERS[0]);
    const result2 = await isFeatureEnabled(KEY, TEST_PASSENGERS[1]);

    console.log(`  Passenger ${TEST_PASSENGERS[0]} (in allowlist): ${result1 ? '✓ ON' : '✗ OFF'}`);
    console.log(`  Passenger ${TEST_PASSENGERS[1]} (not in allowlist): ${result2 ? '✗ ON' : '✓ OFF'}`);

    if (!result1 || result2) {
      console.log('  ❌ FAIL: Allowlist não funcionou corretamente');
      allPassed = false;
    } else {
      console.log('  ✅ PASS\n');
    }

    // Cleanup
    await prisma.feature_flag_allowlist.deleteMany({ where: { key: KEY } });

    // Test 2: Rollout determinístico (10%)
    console.log('TEST 2: Deterministic 10% Rollout');
    console.log('----------------------------------');
    
    await prisma.feature_flags.update({
      where: { key: KEY },
      data: { enabled: true, rollout_percentage: 10 },
    });
    clearFeatureFlagCache();

    const results10 = [];
    for (const passengerId of TEST_PASSENGERS) {
      const hash = getPassengerHash(passengerId);
      const enabled = await isFeatureEnabled(KEY, passengerId);
      const expected = hash < 10;
      results10.push({ passengerId, hash, enabled, expected });
      
      console.log(`  ${passengerId}: hash=${hash}, enabled=${enabled}, expected=${expected} ${enabled === expected ? '✓' : '✗'}`);
      
      if (enabled !== expected) {
        allPassed = false;
      }
    }

    const allMatch = results10.every(r => r.enabled === r.expected);
    console.log(allMatch ? '  ✅ PASS\n' : '  ❌ FAIL: Rollout não é determinístico\n');

    // Test 3: 0% sempre OFF
    console.log('TEST 3: 0% Rollout (sempre OFF)');
    console.log('--------------------------------');
    
    await prisma.feature_flags.update({
      where: { key: KEY },
      data: { enabled: true, rollout_percentage: 0 },
    });
    clearFeatureFlagCache();

    const results0 = await Promise.all(
      TEST_PASSENGERS.map(id => isFeatureEnabled(KEY, id))
    );

    const allOff = results0.every(r => !r);
    console.log(`  Todos OFF: ${allOff ? '✓' : '✗'}`);
    console.log(allOff ? '  ✅ PASS\n' : '  ❌ FAIL\n');
    
    if (!allOff) allPassed = false;

    // Test 4: 100% sempre ON
    console.log('TEST 4: 100% Rollout (sempre ON)');
    console.log('---------------------------------');
    
    await prisma.feature_flags.update({
      where: { key: KEY },
      data: { enabled: true, rollout_percentage: 100 },
    });
    clearFeatureFlagCache();

    const results100 = await Promise.all(
      TEST_PASSENGERS.map(id => isFeatureEnabled(KEY, id))
    );

    const allOn = results100.every(r => r);
    console.log(`  Todos ON: ${allOn ? '✓' : '✗'}`);
    console.log(allOn ? '  ✅ PASS\n' : '  ❌ FAIL\n');
    
    if (!allOn) allPassed = false;

    // Test 5: Master switch OFF (env var)
    console.log('TEST 5: Master Switch OFF (env var)');
    console.log('------------------------------------');
    
    process.env.FEATURE_PASSENGER_FAVORITES_MATCHING = 'false';
    clearFeatureFlagCache();

    const resultsMasterOff = await Promise.all(
      TEST_PASSENGERS.map(id => isFeatureEnabled(KEY, id))
    );

    const allOffMaster = resultsMasterOff.every(r => !r);
    console.log(`  Todos OFF (mesmo com 100% no DB): ${allOffMaster ? '✓' : '✗'}`);
    console.log(allOffMaster ? '  ✅ PASS\n' : '  ❌ FAIL\n');
    
    if (!allOffMaster) allPassed = false;

    // Cleanup
    delete process.env.FEATURE_PASSENGER_FAVORITES_MATCHING;

    // Final result
    console.log('==========================================');
    if (allPassed) {
      console.log('✅ TODOS OS TESTES PASSARAM');
      console.log('==========================================');
      process.exit(0);
    } else {
      console.log('❌ ALGUNS TESTES FALHARAM');
      console.log('==========================================');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Erro durante testes:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testFeatureFlagRollout();
