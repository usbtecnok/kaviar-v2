/**
 * Validation script for calculateCreditCost
 * READ-ONLY against the database (only SELECTs via resolveTerritory)
 *
 * Usage: cd backend && DATABASE_URL="postgresql://kaviar:kaviar_dev_local@localhost:5432/kaviar_db" npx tsx scripts/validate-credit-cost.ts
 */
import { prisma } from '../src/lib/prisma';
import { calculateCreditCost } from '../src/services/credit-cost.service';
import { resolveTerritory } from '../src/services/territory-resolver.service';

interface TestCase {
  label: string;
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
  expectedMatch: 'LOCAL' | 'EXTERNAL';
  expectedCost: number;
}

async function run() {
  // 1. Find a driver with neighborhood_id
  const driver = await prisma.drivers.findFirst({
    where: { neighborhood_id: { not: null } },
    select: { id: true, name: true, neighborhood_id: true }
  });

  if (!driver || !driver.neighborhood_id) {
    console.error('❌ No driver with neighborhood_id found');
    process.exit(1);
  }

  const neighborhood = await prisma.neighborhoods.findUnique({
    where: { id: driver.neighborhood_id },
    select: { id: true, name: true, center_lat: true, center_lng: true }
  });

  console.log('=== DRIVER ===');
  console.log(`  id:           ${driver.id}`);
  console.log(`  name:         ${driver.name}`);
  console.log(`  neighborhood: ${neighborhood?.name} (${driver.neighborhood_id})`);
  console.log(`  center:       [${neighborhood?.center_lat}, ${neighborhood?.center_lng}]`);
  console.log('');

  const centerLat = Number(neighborhood?.center_lat);
  const centerLng = Number(neighborhood?.center_lng);

  const tests: TestCase[] = [
    {
      label: 'LOCAL — origin & dest inside driver neighborhood (~200m from center)',
      originLat: centerLat + 0.001,
      originLng: centerLng + 0.001,
      destLat: centerLat - 0.001,
      destLng: centerLng - 0.001,
      expectedMatch: 'LOCAL',
      expectedCost: 1
    },
    {
      label: 'LOCAL — only origin inside driver neighborhood, dest far away',
      originLat: centerLat + 0.002,
      originLng: centerLng + 0.002,
      destLat: -23.5505,  // São Paulo (far away)
      destLng: -46.6333,
      expectedMatch: 'LOCAL',
      expectedCost: 1
    },
    {
      label: 'EXTERNAL — both origin and dest far from driver neighborhood',
      originLat: -23.5505,  // São Paulo
      originLng: -46.6333,
      destLat: -23.5600,
      destLng: -46.6500,
      expectedMatch: 'EXTERNAL',
      expectedCost: 2
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const t of tests) {
    console.log(`--- TEST: ${t.label} ---`);
    console.log(`  origin: [${t.originLat.toFixed(6)}, ${t.originLng.toFixed(6)}]`);
    console.log(`  dest:   [${t.destLat.toFixed(6)}, ${t.destLng.toFixed(6)}]`);

    const pickupTerritory = await resolveTerritory(t.originLng, t.originLat);
    const dropoffTerritory = await resolveTerritory(t.destLng, t.destLat);
    console.log(`  pickup  resolved: method=${pickupTerritory.method} neighborhood=${pickupTerritory.neighborhood?.name ?? 'none'}`);
    console.log(`  dropoff resolved: method=${dropoffTerritory.method} neighborhood=${dropoffTerritory.neighborhood?.name ?? 'none'}`);

    const result = await calculateCreditCost(driver.id, t.originLat, t.originLng, t.destLat, t.destLng);
    console.log(`  result: matchType=${result.matchType} cost=${result.cost} reason=${result.reason}`);

    const ok = result.matchType === t.expectedMatch && result.cost === t.expectedCost;
    console.log(`  ${ok ? '✅ PASS' : '❌ FAIL'} (expected ${t.expectedMatch}/${t.expectedCost})`);
    console.log('');

    ok ? passed++ : failed++;
  }

  console.log(`=== SUMMARY: ${passed} passed, ${failed} failed ===`);
  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error(e); process.exit(1); });
