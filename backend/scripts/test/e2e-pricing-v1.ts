/**
 * E2E Pricing V1 — Validação estrutural
 * Roda contra banco staging local (porta 5433)
 * 
 * Testes: 1 (quote), 2 (refine), 3 (settle), 4 (retry complete), 5 (retry accept), 7 (fallback)
 */

import { Pool } from 'pg';
import * as pricingEngine from '../../src/services/pricing-engine';

const STAGING_URL = 'postgresql://kaviar:kaviar_staging@localhost:5433/kaviar_staging';
const pool = new Pool({ connectionString: STAGING_URL });

async function setup() {
  console.log('=== SETUP: criando dados de teste ===');

  // Neighborhood com geofence (Furnas)
  await pool.query(`
    INSERT INTO neighborhoods (id, name, city, is_active, center_lat, center_lng, created_at, updated_at)
    VALUES ('nb_furnas', 'Furnas', 'Rio de Janeiro', true, -22.970, -43.178, now(), now())
    ON CONFLICT (id) DO NOTHING
  `);

  // Segundo neighborhood (Botafogo)
  await pool.query(`
    INSERT INTO neighborhoods (id, name, city, is_active, center_lat, center_lng, created_at, updated_at)
    VALUES ('nb_botafogo', 'Botafogo', 'Rio de Janeiro', true, -22.951, -43.186, now(), now())
    ON CONFLICT (id) DO NOTHING
  `);

  // Passageiro
  await pool.query(`
    INSERT INTO passengers (id, name, email, phone, created_at, updated_at)
    VALUES ('pass_e2e', 'Passageiro E2E', 'pass_e2e@test.local', '21999990001', now(), now())
    ON CONFLICT (id) DO NOTHING
  `);

  // Motorista (com neighborhood = Furnas)
  await pool.query(`
    INSERT INTO drivers (id, name, email, phone, status, neighborhood_id, vehicle_color, vehicle_model, vehicle_plate, created_at, updated_at)
    VALUES ('drv_e2e', 'Motorista E2E', 'drv_e2e@test.local', '21999990002', 'approved', 'nb_furnas', 'Prata', 'Gol 2020', 'ABC-1234', now(), now())
    ON CONFLICT (id) DO NOTHING
  `);

  // Driver status online
  await pool.query(`
    INSERT INTO driver_status (driver_id, availability, updated_at)
    VALUES ('drv_e2e', 'online', now())
    ON CONFLICT (driver_id) DO UPDATE SET availability = 'online', updated_at = now()
  `);

  // Driver location (perto de Furnas)
  await pool.query(`
    INSERT INTO driver_locations (driver_id, lat, lng, updated_at)
    VALUES ('drv_e2e', -22.970, -43.178, now())
    ON CONFLICT (driver_id) DO UPDATE SET lat = -22.970, lng = -43.178, updated_at = now()
  `);

  console.log('Setup completo.\n');
}

async function test1_quote() {
  console.log('=== TESTE 1: Criar corrida → quoted_price ===');

  // Criar ride (origem e destino em Furnas = local)
  const ride = await pool.query(`
    INSERT INTO rides_v2 (id, passenger_id, status, origin_lat, origin_lng, origin_text,
      dest_lat, dest_lng, destination_text, ride_type, origin_neighborhood_id, dest_neighborhood_id, created_at, updated_at)
    VALUES ('ride_e2e_1', 'pass_e2e', 'requested', -22.970, -43.178, 'Furnas Origem',
      -22.971, -43.179, 'Furnas Destino', 'normal', 'nb_furnas', 'nb_furnas', now(), now())
    RETURNING id
  `);
  const rideId = ride.rows[0].id;

  // Chamar quote via SQL direto (simula o que o pricing-engine faz)
  // Importar e chamar o engine
  
  const result = await pricingEngine.quote(
    rideId, -22.970, -43.178, -22.971, -43.179, 'nb_furnas', 'nb_furnas'
  );

  console.log('Quote result:', result);

  // Validar ride_settlements
  const settlement = await pool.query('SELECT * FROM ride_settlements WHERE ride_id = $1', [rideId]);
  const s = settlement.rows[0];

  const checks = [
    ['quoted_price na API', result.quoted_price != null],
    ['route_territory', result.route_territory === 'local'],
    ['settlement criado', !!s],
    ['quoted = locked', Number(s.quoted_price) === Number(s.locked_price)],
    ['quoted_at preenchido', !!s.quoted_at],
    ['locked_at preenchido', !!s.locked_at],
    ['refined_at NULL', s.refined_at === null],
    ['settled_at NULL', s.settled_at === null],
    ['fee_percent = 7 (local)', Number(s.fee_percent) === 7],
    ['profile = rio-furnas', s.pricing_profile_slug === 'rio-furnas'],
    ['API = settlement', result.quoted_price === Number(s.quoted_price)],
  ];

  // Validar rides_v2 cache
  const rideRow = await pool.query('SELECT quoted_price, locked_price, territory_match FROM rides_v2 WHERE id = $1', [rideId]);
  const r = rideRow.rows[0];
  checks.push(['rides_v2 quoted_price', Number(r.quoted_price) === result.quoted_price]);
  checks.push(['rides_v2 locked_price', Number(r.locked_price) === result.quoted_price]);
  checks.push(['rides_v2 territory_match', r.territory_match === 'local']);

  printChecks('TESTE 1', checks);
  return rideId;
}

async function test2_refine(rideId: string) {
  console.log('\n=== TESTE 2: Aceitar corrida → refine ===');

  

  // Guardar locked_price antes
  const before = await pool.query('SELECT locked_price FROM ride_settlements WHERE ride_id = $1', [rideId]);
  const lockedBefore = Number(before.rows[0].locked_price);

  // Refine com motorista de Furnas (mesmo bairro)
  await pricingEngine.refine(rideId, 'nb_furnas', 'Furnas');

  const settlement = await pool.query('SELECT * FROM ride_settlements WHERE ride_id = $1', [rideId]);
  const s = settlement.rows[0];

  const checks = [
    ['driver_territory preenchido', s.driver_territory === 'local'],
    ['driver_neighborhood_id', s.driver_neighborhood_id === 'nb_furnas'],
    ['refined_at preenchido', !!s.refined_at],
    ['locked_price inalterado', Number(s.locked_price) === lockedBefore],
    ['fee_percent = 7 (local)', Number(s.fee_percent) === 7],
  ];

  // Validar rides_v2 cache
  const rideRow = await pool.query('SELECT platform_fee, driver_earnings, territory_match FROM rides_v2 WHERE id = $1', [rideId]);
  const r = rideRow.rows[0];
  checks.push(['rides_v2 territory_match = local', r.territory_match === 'local']);
  checks.push(['rides_v2 platform_fee preenchido', Number(r.platform_fee) > 0]);
  checks.push(['rides_v2 driver_earnings preenchido', Number(r.driver_earnings) > 0]);

  printChecks('TESTE 2', checks);
}

async function test3_settle(rideId: string) {
  console.log('\n=== TESTE 3: Completar corrida → settle ===');

  
  const result = await pricingEngine.settle(rideId);

  console.log('Settle result:', result);

  const settlement = await pool.query('SELECT * FROM ride_settlements WHERE ride_id = $1', [rideId]);
  const s = settlement.rows[0];

  const checks = [
    ['final_price preenchido', result.final_price != null],
    ['final_price = locked_price', Number(s.final_price) === Number(s.locked_price)],
    ['settlement_territory preenchido', !!s.settlement_territory],
    ['credit_cost preenchido', s.credit_cost != null],
    ['credit_match_type preenchido', !!s.credit_match_type],
    ['settled_at preenchido', !!s.settled_at],
    ['credit_cost = 1 (local)', result.credit_cost === 1],
    ['credit_match_type = LOCAL', result.credit_match_type === 'LOCAL'],
  ];

  // rides_v2 cache
  const rideRow = await pool.query('SELECT final_price FROM rides_v2 WHERE id = $1', [rideId]);
  checks.push(['rides_v2 final_price', Number(rideRow.rows[0].final_price) === result.final_price]);

  printChecks('TESTE 3', checks);
}

async function test4_retry_settle(rideId: string) {
  console.log('\n=== TESTE 4: Retry settle (idempotência) ===');

  

  // Guardar estado antes
  const before = await pool.query('SELECT settled_at, final_price FROM ride_settlements WHERE ride_id = $1', [rideId]);
  const settledBefore = before.rows[0].settled_at;
  const priceBefore = Number(before.rows[0].final_price);

  // Chamar settle de novo
  const result = await pricingEngine.settle(rideId);

  // Verificar que nada mudou
  const after = await pool.query('SELECT settled_at, final_price FROM ride_settlements WHERE ride_id = $1', [rideId]);
  const settledAfter = after.rows[0].settled_at;

  const checks = [
    ['retorna resultado', result != null],
    ['final_price igual', result.final_price === priceBefore],
    ['settled_at não mudou', settledBefore.getTime() === settledAfter.getTime()],
    ['settlement count = 1', (await pool.query('SELECT count(*) FROM ride_settlements WHERE ride_id = $1', [rideId])).rows[0].count === '1'],
  ];

  printChecks('TESTE 4', checks);
}

async function test5_retry_refine(rideId: string) {
  console.log('\n=== TESTE 5: Retry refine (idempotência) ===');

  

  const before = await pool.query('SELECT refined_at, fee_percent, driver_earnings FROM ride_settlements WHERE ride_id = $1', [rideId]);
  const refinedBefore = before.rows[0].refined_at;
  const feeBefore = Number(before.rows[0].fee_percent);

  // Chamar refine de novo (com bairro diferente para provar que é noop)
  await pricingEngine.refine(rideId, 'nb_botafogo', 'Botafogo');

  const after = await pool.query('SELECT refined_at, fee_percent, driver_neighborhood_id FROM ride_settlements WHERE ride_id = $1', [rideId]);

  const checks = [
    ['refined_at não mudou', refinedBefore.getTime() === after.rows[0].refined_at.getTime()],
    ['fee_percent não mudou', feeBefore === Number(after.rows[0].fee_percent)],
    ['driver_neighborhood_id não mudou', after.rows[0].driver_neighborhood_id === 'nb_furnas'],
  ];

  printChecks('TESTE 5', checks);
}

async function test7_fallback_profile() {
  console.log('\n=== TESTE 7: Corrida fora da região → fallback default ===');

  // Criar ride com coordenadas de Brasília (fora de qualquer região)
  await pool.query(`
    INSERT INTO rides_v2 (id, passenger_id, status, origin_lat, origin_lng, origin_text,
      dest_lat, dest_lng, destination_text, ride_type, created_at, updated_at)
    VALUES ('ride_e2e_bsb', 'pass_e2e', 'requested', -15.780, -47.930, 'Brasília Origem',
      -15.790, -47.940, 'Brasília Destino', 'normal', now(), now())
    ON CONFLICT (id) DO NOTHING
  `);

  
  const result = await pricingEngine.quote(
    'ride_e2e_bsb', -15.780, -47.930, -15.790, -47.940, null, null
  );

  console.log('Fallback result:', result);

  const settlement = await pool.query('SELECT * FROM ride_settlements WHERE ride_id = $1', ['ride_e2e_bsb']);
  const s = settlement.rows[0];

  const checks = [
    ['usa perfil default', result.pricing_profile_slug === 'default'],
    ['quoted_price preenchido', result.quoted_price != null],
    ['route_territory = external', result.route_territory === 'external'],
    ['fee_percent = 18 (external default)', Number(s.fee_percent) === 18],
    ['minimum_fare_used = 8', Number(s.minimum_fare_used) === 8],
  ];

  printChecks('TESTE 7', checks);
}

function printChecks(testName: string, checks: [string, boolean][]) {
  let passed = 0;
  let failed = 0;
  for (const [label, ok] of checks) {
    if (ok) {
      console.log(`  ✅ ${label}`);
      passed++;
    } else {
      console.log(`  ❌ ${label}`);
      failed++;
    }
  }
  console.log(`\n${testName}: ${passed} passed, ${failed} failed`);
  if (failed > 0) console.log(`⚠️  ${testName} TEM FALHAS`);
}

async function cleanup() {
  await pool.query("DELETE FROM ride_settlements WHERE ride_id LIKE 'ride_e2e%'");
  await pool.query("DELETE FROM rides_v2 WHERE id LIKE 'ride_e2e%'");
  console.log('\nCleanup completo.');
}

async function main() {
  try {
    await setup();
    const rideId = await test1_quote();
    await test2_refine(rideId);
    await test3_settle(rideId);
    await test4_retry_settle(rideId);
    await test5_retry_refine(rideId);
    await test7_fallback_profile();
    console.log('\n========================================');
    console.log('VALIDAÇÃO ESTRUTURAL PRICING V1 COMPLETA');
    console.log('========================================');
  } catch (err) {
    console.error('ERRO:', err);
  } finally {
    await cleanup();
    await pool.end();
  }
}

main();
