/**
 * KAVIAR — Teste de validação dos tiers territoriais
 *
 * Cenários:
 *   A) COMMUNITY  — motorista da mesma comunidade priorizado
 *   B) NEIGHBORHOOD — motorista do mesmo bairro priorizado
 *   C) OUTSIDE — fallback sem quebrar
 *   D) HOMEBOUND + COMMUNITY — retorno para casa com prioridade residencial
 *
 * Uso: npx ts-node src/scripts/test-territory-tiers.ts
 * Requer: DATABASE_URL configurado, banco acessível
 */

import { prisma } from '../lib/prisma';
import { DispatcherService } from '../services/dispatcher.service';
import { Decimal } from '@prisma/client/runtime/library';

const TEST_PREFIX = 'TIER_TEST_';
const dispatcher = new DispatcherService();

// Coordenadas de teste (Rocinha / São Conrado / Leblon)
const COORDS = {
  rocinha:     { lat: -22.9880, lng: -43.2480 },
  saoConrado:  { lat: -22.9950, lng: -43.2650 },
  leblon:      { lat: -22.9830, lng: -43.2230 },
  centro:      { lat: -22.9068, lng: -43.1729 },
};

async function cleanup() {
  // Limpar dados de teste anteriores (ordem: ofertas → corridas → status → locations → drivers → passengers → communities → neighborhoods)
  await prisma.ride_offers.deleteMany({ where: { ride: { passenger_id: { startsWith: TEST_PREFIX } } } });
  await prisma.rides_v2.deleteMany({ where: { passenger_id: { startsWith: TEST_PREFIX } } });
  await prisma.driver_status.deleteMany({ where: { driver_id: { startsWith: TEST_PREFIX } } });
  await prisma.driver_locations.deleteMany({ where: { driver_id: { startsWith: TEST_PREFIX } } });
  await prisma.drivers.deleteMany({ where: { id: { startsWith: TEST_PREFIX } } });
  await prisma.passengers.deleteMany({ where: { id: { startsWith: TEST_PREFIX } } });
  await prisma.communities.deleteMany({ where: { id: { startsWith: TEST_PREFIX } } });
  await prisma.neighborhoods.deleteMany({ where: { id: { startsWith: TEST_PREFIX } } });
  console.log('[CLEANUP] Done');
}

async function seedTestData() {
  // Neighborhoods
  const nbRocinha = await prisma.neighborhoods.create({
    data: { id: `${TEST_PREFIX}NB_ROCINHA`, name: `${TEST_PREFIX}Rocinha`, city: 'Rio de Janeiro', is_active: true, center_lat: new Decimal(COORDS.rocinha.lat), center_lng: new Decimal(COORDS.rocinha.lng), updated_at: new Date() }
  });
  const nbLeblon = await prisma.neighborhoods.create({
    data: { id: `${TEST_PREFIX}NB_LEBLON`, name: `${TEST_PREFIX}Leblon`, city: 'Rio de Janeiro', is_active: true, center_lat: new Decimal(COORDS.leblon.lat), center_lng: new Decimal(COORDS.leblon.lng), updated_at: new Date() }
  });

  // Communities
  const comRocinha1 = await prisma.communities.create({
    data: { id: `${TEST_PREFIX}COM_ROC1`, name: `${TEST_PREFIX}Rocinha Alta`, is_active: true, updated_at: new Date() }
  });
  const comRocinha2 = await prisma.communities.create({
    data: { id: `${TEST_PREFIX}COM_ROC2`, name: `${TEST_PREFIX}Rocinha Baixa`, is_active: true, updated_at: new Date() }
  });

  // Passenger — mora na Rocinha, comunidade Rocinha Alta
  const passenger = await prisma.passengers.create({
    data: { id: `${TEST_PREFIX}PAX_1`, name: 'Passageiro Teste', email: `${TEST_PREFIX}pax@test.com`, neighborhood_id: nbRocinha.id, community_id: comRocinha1.id, status: 'ACTIVE', updated_at: new Date() }
  });

  // Driver 1 — mesma comunidade (Rocinha Alta), 3km de distância
  const d1 = await createDriver('D1', 'Motorista Comunidade', nbRocinha.id, comRocinha1.id, COORDS.saoConrado.lat, COORDS.saoConrado.lng);
  // Driver 2 — mesmo bairro, comunidade diferente (Rocinha Baixa), 1km de distância
  const d2 = await createDriver('D2', 'Motorista Bairro', nbRocinha.id, comRocinha2.id, COORDS.rocinha.lat + 0.005, COORDS.rocinha.lng + 0.005);
  // Driver 3 — bairro diferente (Leblon), 2km de distância
  const d3 = await createDriver('D3', 'Motorista Fora', nbLeblon.id, null, COORDS.leblon.lat, COORDS.leblon.lng);

  console.log('[SEED] Created: 2 neighborhoods, 2 communities, 1 passenger, 3 drivers');
  return { nbRocinha, nbLeblon, comRocinha1, comRocinha2, passenger, d1, d2, d3 };
}

async function createDriver(suffix: string, name: string, neighborhoodId: string, communityId: string | null, lat: number, lng: number) {
  const id = `${TEST_PREFIX}${suffix}`;
  const driver = await prisma.drivers.create({
    data: { id, name, email: `${TEST_PREFIX}${suffix}@test.com`, status: 'active', neighborhood_id: neighborhoodId, community_id: communityId, updated_at: new Date() }
  });
  await prisma.driver_status.create({ data: { driver_id: id, availability: 'online' } });
  await prisma.driver_locations.create({ data: { driver_id: id, lat: new Decimal(lat), lng: new Decimal(lng) } });
  return driver;
}

async function createRide(passengerId: string, originLat: number, originLng: number, destLat: number, destLng: number, originNeighborhoodId: string | null, originCommunityId: string | null, destNeighborhoodId: string | null, isHomebound: boolean, label: string) {
  const ride = await prisma.rides_v2.create({
    data: {
      passenger_id: passengerId,
      origin_lat: new Decimal(originLat), origin_lng: new Decimal(originLng),
      origin_text: `Teste ${label} - Origem`,
      dest_lat: new Decimal(destLat), dest_lng: new Decimal(destLng),
      destination_text: `Teste ${label} - Destino`,
      origin_neighborhood_id: originNeighborhoodId,
      origin_community_id: originCommunityId,
      dest_neighborhood_id: destNeighborhoodId,
      is_homebound: isHomebound,
      status: 'requested',
    }
  });
  console.log(`[RIDE] Created ${label}: ${ride.id}`);
  return ride;
}

async function getOfferResult(rideId: string): Promise<{ driverId: string; tier: string } | null> {
  const offer = await prisma.ride_offers.findFirst({
    where: { ride_id: rideId },
    orderBy: { sent_at: 'desc' },
  });
  if (!offer) return null;
  return { driverId: offer.driver_id, tier: offer.territory_tier || 'UNKNOWN' };
}

async function resetDriversOnline(driverIds: string[]) {
  for (const id of driverIds) {
    await prisma.driver_status.update({ where: { driver_id: id }, data: { availability: 'online' } });
  }
  // Cancel all pending offers
  await prisma.ride_offers.updateMany({ where: { status: 'pending', driver_id: { in: driverIds } }, data: { status: 'canceled' } });
}

async function runTests() {
  console.log('\n========== KAVIAR TERRITORY TIER TESTS ==========\n');

  await cleanup();
  const data = await seedTestData();
  const allDriverIds = [data.d1.id, data.d2.id, data.d3.id];

  let passed = 0;
  let failed = 0;

  // --- CASO A: COMMUNITY ---
  console.log('\n--- CASO A: COMMUNITY ---');
  console.log('Corrida na Rocinha. D1=mesma comunidade(3km), D2=mesmo bairro(1km), D3=fora(2km)');
  console.log('Esperado: D1 priorizado (mesma comunidade, mesmo estando mais longe)');

  await resetDriversOnline(allDriverIds);
  const rideA = await createRide(data.passenger.id, COORDS.rocinha.lat, COORDS.rocinha.lng, COORDS.saoConrado.lat, COORDS.saoConrado.lng, data.nbRocinha.id, data.comRocinha1.id, null, false, 'CASO_A');
  await dispatcher.dispatchRide(rideA.id);
  await new Promise(r => setTimeout(r, 500));
  const resultA = await getOfferResult(rideA.id);
  if (resultA?.driverId === data.d1.id && resultA?.tier === 'COMMUNITY') {
    console.log(`✅ PASS — Oferta para ${resultA.driverId} tier=${resultA.tier}`);
    passed++;
  } else {
    console.log(`❌ FAIL — Oferta para ${resultA?.driverId} tier=${resultA?.tier} (esperado D1/COMMUNITY)`);
    failed++;
  }

  // --- CASO B: NEIGHBORHOOD ---
  console.log('\n--- CASO B: NEIGHBORHOOD ---');
  console.log('D1 offline. D2=mesmo bairro(1km), D3=fora(2km)');
  console.log('Esperado: D2 priorizado (mesmo bairro)');

  await resetDriversOnline(allDriverIds);
  await prisma.driver_status.update({ where: { driver_id: data.d1.id }, data: { availability: 'offline' } });
  const rideB = await createRide(data.passenger.id, COORDS.rocinha.lat, COORDS.rocinha.lng, COORDS.saoConrado.lat, COORDS.saoConrado.lng, data.nbRocinha.id, data.comRocinha1.id, null, false, 'CASO_B');
  await dispatcher.dispatchRide(rideB.id);
  await new Promise(r => setTimeout(r, 500));
  const resultB = await getOfferResult(rideB.id);
  if (resultB?.driverId === data.d2.id && resultB?.tier === 'NEIGHBORHOOD') {
    console.log(`✅ PASS — Oferta para ${resultB.driverId} tier=${resultB.tier}`);
    passed++;
  } else {
    console.log(`❌ FAIL — Oferta para ${resultB?.driverId} tier=${resultB?.tier} (esperado D2/NEIGHBORHOOD)`);
    failed++;
  }

  // --- CASO C: OUTSIDE ---
  console.log('\n--- CASO C: OUTSIDE ---');
  console.log('D1 e D2 offline. Apenas D3 (Leblon) disponível');
  console.log('Esperado: D3 com tier OUTSIDE');

  await resetDriversOnline(allDriverIds);
  await prisma.driver_status.update({ where: { driver_id: data.d1.id }, data: { availability: 'offline' } });
  await prisma.driver_status.update({ where: { driver_id: data.d2.id }, data: { availability: 'offline' } });
  const rideC = await createRide(data.passenger.id, COORDS.rocinha.lat, COORDS.rocinha.lng, COORDS.saoConrado.lat, COORDS.saoConrado.lng, data.nbRocinha.id, data.comRocinha1.id, null, false, 'CASO_C');
  await dispatcher.dispatchRide(rideC.id);
  await new Promise(r => setTimeout(r, 500));
  const resultC = await getOfferResult(rideC.id);
  if (resultC?.driverId === data.d3.id && resultC?.tier === 'OUTSIDE') {
    console.log(`✅ PASS — Oferta para ${resultC.driverId} tier=${resultC.tier}`);
    passed++;
  } else {
    console.log(`❌ FAIL — Oferta para ${resultC?.driverId} tier=${resultC?.tier} (esperado D3/OUTSIDE)`);
    failed++;
  }

  // --- CASO D: HOMEBOUND + COMMUNITY ---
  console.log('\n--- CASO D: HOMEBOUND + COMMUNITY ---');
  console.log('Passageiro no Centro, destino = Rocinha (sua casa). is_homebound=true');
  console.log('Referência territorial = residência do passageiro (Rocinha/Rocinha Alta)');
  console.log('D1=mesma comunidade residencial, D2=mesmo bairro residencial, D3=fora');
  console.log('Esperado: D1 priorizado (mesma comunidade residencial)');

  await resetDriversOnline(allDriverIds);
  const rideD = await createRide(data.passenger.id, COORDS.centro.lat, COORDS.centro.lng, COORDS.rocinha.lat, COORDS.rocinha.lng, null, null, data.nbRocinha.id, true, 'CASO_D');
  await dispatcher.dispatchRide(rideD.id);
  await new Promise(r => setTimeout(r, 500));
  const resultD = await getOfferResult(rideD.id);
  const rideCheck = await prisma.rides_v2.findUnique({ where: { id: rideD.id }, select: { is_homebound: true } });
  if (resultD?.driverId === data.d1.id && resultD?.tier === 'COMMUNITY' && rideCheck?.is_homebound) {
    console.log(`✅ PASS — Oferta para ${resultD.driverId} tier=${resultD.tier} homebound=${rideCheck.is_homebound}`);
    passed++;
  } else {
    console.log(`❌ FAIL — Oferta para ${resultD?.driverId} tier=${resultD?.tier} homebound=${rideCheck?.is_homebound} (esperado D1/COMMUNITY/true)`);
    failed++;
  }

  // --- RESUMO ---
  console.log(`\n========== RESULTADO: ${passed}/${passed + failed} passed ==========\n`);

  // Cleanup
  await cleanup();
  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(e => { console.error(e); process.exit(1); });
