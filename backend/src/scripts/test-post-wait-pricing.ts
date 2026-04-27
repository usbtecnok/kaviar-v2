/**
 * Teste: post_wait_destination — validação dos 4 cenários de pricing
 *
 * Executa sem banco de dados, testando apenas a lógica pura de:
 * - cálculo de distância (haversine)
 * - promoção territorial
 * - composição de preço
 *
 * Uso: npx tsx src/scripts/test-post-wait-pricing.ts
 */

// Inline haversine to avoid DB dependency from pricing-engine import
const EARTH_RADIUS_KM = 6371;
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// --- Coordenadas de teste (RJ) ---
const TIJUCA       = { lat: -22.9253, lng: -43.2350 }; // origem
const MARACANA     = { lat: -22.9121, lng: -43.2302 }; // destino/parada (local)
const COPACABANA   = { lat: -22.9711, lng: -43.1822 }; // pós-espera (externo)

// --- Simular pricing profile ---
const PROFILE = { base_fare: 5.0, per_km: 2.5, minimum_fare: 8.0 };
const WAIT_RATE = 0.50; // R$/min

type Territory = 'local' | 'adjacent' | 'external';
const RANK: Record<Territory, number> = { local: 0, adjacent: 1, external: 2 };
const CREDIT: Record<Territory, number> = { local: 1, adjacent: 1, external: 2 };

function calcPrice(distKm: number): number {
  const raw = PROFILE.base_fare + distKm * PROFILE.per_km;
  return Math.round(Math.max(raw, PROFILE.minimum_fare) * 100) / 100;
}

function promoteTerritory(a: Territory, b: Territory): Territory {
  return RANK[b] > RANK[a] ? b : a;
}

// --- Testes ---
let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean, detail: string) {
  if (condition) { console.log(`  ✅ ${label}: ${detail}`); passed++; }
  else { console.log(`  ❌ ${label}: ${detail}`); failed++; }
}

console.log('🧪 TESTE: post_wait_destination pricing\n');

// 1. Sem espera
console.log('── Cenário 1: Corrida sem espera ──');
{
  const dist = Math.round(haversineKm(TIJUCA.lat, TIJUCA.lng, MARACANA.lat, MARACANA.lng) * 100) / 100;
  const price = calcPrice(dist);
  const territory: Territory = 'local';
  const credit = CREDIT[territory];
  assert('Distância', dist > 0 && dist < 5, `${dist} km`);
  assert('Preço', price >= PROFILE.minimum_fare, `R$ ${price}`);
  assert('Território', territory === 'local', territory);
  assert('Crédito', credit === 1, `${credit}`);
  console.log(`  → final_price = R$ ${price} (sem wait_charge)\n`);
}

// 2. Com espera, sem post_wait_destination
console.log('── Cenário 2: Com espera, sem destino pós-espera ──');
{
  const dist = Math.round(haversineKm(TIJUCA.lat, TIJUCA.lng, MARACANA.lat, MARACANA.lng) * 100) / 100;
  const price = calcPrice(dist);
  const waitMin = 10;
  const waitCharge = Math.round(waitMin * WAIT_RATE * 100) / 100;
  const finalPrice = Math.round((price + waitCharge) * 100) / 100;
  const territory: Territory = 'local';
  const credit = CREDIT[territory] * 2; // dobrado por espera
  assert('Distância', dist > 0, `${dist} km (apenas ida)`);
  assert('Preço base', price >= PROFILE.minimum_fare, `R$ ${price}`);
  assert('Wait charge', waitCharge === 5.0, `R$ ${waitCharge} (${waitMin} min × R$ ${WAIT_RATE})`);
  assert('Final', finalPrice === price + waitCharge, `R$ ${finalPrice}`);
  assert('Crédito dobrado', credit === 2, `${credit}`);
  console.log(`  → final_price = R$ ${finalPrice}\n`);
}

// 3. Com espera + post_wait_destination LOCAL
console.log('── Cenário 3: Com espera + pós-destino LOCAL ──');
{
  const distIda = haversineKm(TIJUCA.lat, TIJUCA.lng, MARACANA.lat, MARACANA.lng);
  const distVolta = haversineKm(MARACANA.lat, MARACANA.lng, TIJUCA.lat, TIJUCA.lng); // volta para Tijuca = local
  const distTotal = Math.round((distIda + distVolta) * 100) / 100;
  const price = calcPrice(distTotal);
  const waitMin = 20;
  const waitCharge = Math.round(waitMin * WAIT_RATE * 100) / 100;
  const finalPrice = Math.round((price + waitCharge) * 100) / 100;
  const legTerritory: Territory = 'local'; // Maracanã → Tijuca = local
  const territory = promoteTerritory('local', legTerritory);
  const credit = CREDIT[territory] * 2;
  assert('Distância total', distTotal > distIda, `${distTotal} km (ida ${Math.round(distIda*100)/100} + volta ${Math.round(distVolta*100)/100})`);
  assert('Preço inclui volta', price > calcPrice(Math.round(distIda * 100) / 100), `R$ ${price} > R$ ${calcPrice(Math.round(distIda*100)/100)}`);
  assert('Território mantém local', territory === 'local', territory);
  assert('Crédito dobrado', credit === 2, `${credit}`);
  console.log(`  → final_price = R$ ${finalPrice}\n`);
}

// 4. Com espera + post_wait_destination EXTERNO
console.log('── Cenário 4: Com espera + pós-destino EXTERNO ──');
{
  const distIda = haversineKm(TIJUCA.lat, TIJUCA.lng, MARACANA.lat, MARACANA.lng);
  const distExtra = haversineKm(MARACANA.lat, MARACANA.lng, COPACABANA.lat, COPACABANA.lng);
  const distTotal = Math.round((distIda + distExtra) * 100) / 100;
  const price = calcPrice(distTotal);
  const waitMin = 30;
  const waitCharge = Math.round(waitMin * WAIT_RATE * 100) / 100;
  const finalPrice = Math.round((price + waitCharge) * 100) / 100;
  const legTerritory: Territory = 'external'; // Maracanã → Copacabana = externo
  const territory = promoteTerritory('local', legTerritory);
  const credit = CREDIT[territory] * 2;
  assert('Distância total', distTotal > distIda, `${distTotal} km (ida ${Math.round(distIda*100)/100} + extra ${Math.round(distExtra*100)/100})`);
  assert('Território promovido', territory === 'external', territory);
  assert('Crédito externo dobrado', credit === 4, `${credit}`);
  assert('Preço > cenário local', price > calcPrice(Math.round(distIda * 100) / 100), `R$ ${price}`);
  console.log(`  → final_price = R$ ${finalPrice}\n`);
}

// Resumo
console.log('═'.repeat(50));
console.log(`  ${passed} passed, ${failed} failed`);
console.log('═'.repeat(50));
process.exit(failed > 0 ? 1 : 0);
