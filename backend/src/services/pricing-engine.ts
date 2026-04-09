/**
 * Pricing Engine — ÚNICO writer da economia da corrida
 *
 * Responsabilidades:
 *   quote()   → calcula preço antes do dispatch
 *   refine()  → refina fee/earnings quando motorista aceita
 *   settle()  → fecha economia no complete
 *
 * Regras:
 *   - Nenhum outro módulo escreve campos econômicos em rides_v2 ou ride_settlements
 *   - ride_settlements = fonte de verdade
 *   - rides_v2 = cache operacional
 *   - Toda operação é idempotente por ride_id
 *   - Preço do passageiro (locked_price) NUNCA muda após quote
 */

import { pool } from '../db';
import { resolveTerritory, TerritoryResolution } from './territory-resolver.service';

// --- Types ---

interface PricingProfile {
  id: string;
  slug: string;
  base_fare: number;
  per_km: number;
  per_minute: number;
  minimum_fare: number;
  fee_local: number;
  fee_adjacent: number;
  fee_external: number;
  credit_cost_local: number;
  credit_cost_external: number;
  max_dispatch_km: number;
  center_lat: number | null;
  center_lng: number | null;
  radius_km: number | null;
}

type TerritoryType = 'local' | 'adjacent' | 'external';

export interface QuoteResult {
  quoted_price: number;
  route_territory: TerritoryType;
  fee_percent: number;
  fee_amount: number;
  driver_earnings: number;
  distance_km: number;
  pricing_profile_slug: string;
}

export interface SettlementResult {
  final_price: number;
  fee_percent: number;
  fee_amount: number;
  driver_earnings: number;
  credit_cost: number;
  credit_match_type: string;
  settlement_territory: TerritoryType;
}

// --- Helpers ---

const EARTH_RADIUS_KM = 6371;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function classifyRoute(
  originNeighborhoodId: string | null,
  destNeighborhoodId: string | null
): TerritoryType {
  if (!originNeighborhoodId || !destNeighborhoodId) return 'external';
  if (originNeighborhoodId === destNeighborhoodId) return 'local';
  return 'adjacent';
}

function classifyWithDriver(
  driverNeighborhoodId: string | null,
  originNeighborhoodId: string | null,
  destNeighborhoodId: string | null
): TerritoryType {
  if (!driverNeighborhoodId) return 'external';
  const originMatch = originNeighborhoodId === driverNeighborhoodId;
  const destMatch = destNeighborhoodId === driverNeighborhoodId;
  if (originMatch && destMatch) return 'local';
  if (originMatch || destMatch) return 'adjacent';
  return 'external';
}

function feeForTerritory(profile: PricingProfile, territory: TerritoryType): number {
  if (territory === 'local') return profile.fee_local;
  if (territory === 'adjacent') return profile.fee_adjacent;
  return profile.fee_external;
}

function creditForTerritory(profile: PricingProfile, territory: TerritoryType): { cost: number; matchType: string } {
  if (territory === 'local' || territory === 'adjacent') {
    return { cost: profile.credit_cost_local, matchType: 'LOCAL' };
  }
  return { cost: profile.credit_cost_external, matchType: 'EXTERNAL' };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// --- Profile resolution ---

async function resolveProfile(lat: number, lng: number): Promise<PricingProfile> {
  // Try to find a regional profile by proximity
  const regional = await pool.query(
    `SELECT * FROM pricing_profiles
     WHERE is_active = true AND is_default = false
       AND center_lat IS NOT NULL AND center_lng IS NOT NULL AND radius_km IS NOT NULL
     ORDER BY (
       6371 * acos(
         cos(radians($1)) * cos(radians(center_lat)) *
         cos(radians(center_lng) - radians($2)) +
         sin(radians($1)) * sin(radians(center_lat))
       )
     ) ASC
     LIMIT 1`,
    [lat, lng]
  );

  if (regional.rows[0]) {
    const r = regional.rows[0];
    const dist = haversineKm(lat, lng, Number(r.center_lat), Number(r.center_lng));
    if (dist <= Number(r.radius_km)) {
      return toProfile(r);
    }
  }

  // Fallback to default
  const def = await pool.query(
    `SELECT * FROM pricing_profiles WHERE is_default = true AND is_active = true LIMIT 1`
  );
  if (!def.rows[0]) throw new Error('[pricing-engine] No default pricing profile found');
  return toProfile(def.rows[0]);
}

function toProfile(row: any): PricingProfile {
  return {
    id: row.id,
    slug: row.slug,
    base_fare: Number(row.base_fare),
    per_km: Number(row.per_km),
    per_minute: Number(row.per_minute),
    minimum_fare: Number(row.minimum_fare),
    fee_local: Number(row.fee_local),
    fee_adjacent: Number(row.fee_adjacent),
    fee_external: Number(row.fee_external),
    credit_cost_local: Number(row.credit_cost_local),
    credit_cost_external: Number(row.credit_cost_external),
    max_dispatch_km: Number(row.max_dispatch_km),
    center_lat: row.center_lat ? Number(row.center_lat) : null,
    center_lng: row.center_lng ? Number(row.center_lng) : null,
    radius_km: row.radius_km ? Number(row.radius_km) : null,
  };
}

// --- Public API ---

/**
 * quote() — Calcula preço antes do dispatch. Idempotente por ride_id.
 * V1: lock() é chamado automaticamente (confirmação implícita).
 */
export async function quote(rideId: string, originLat: number, originLng: number,
  destLat: number, destLng: number,
  originNeighborhoodId: string | null, destNeighborhoodId: string | null
): Promise<QuoteResult> {
  // Idempotência: se já existe settlement, retorna valores existentes
  const existing = await pool.query(
    'SELECT * FROM ride_settlements WHERE ride_id = $1', [rideId]
  );
  if (existing.rows[0]) {
    const s = existing.rows[0];
    return {
      quoted_price: Number(s.quoted_price),
      route_territory: s.route_territory,
      fee_percent: Number(s.fee_percent),
      fee_amount: Number(s.fee_amount),
      driver_earnings: Number(s.driver_earnings),
      distance_km: Number(s.distance_km),
      pricing_profile_slug: s.pricing_profile_slug,
    };
  }

  // Resolve profile
  const profile = await resolveProfile(originLat, originLng);

  // Resolve territories
  const [originRes, destRes] = await Promise.all([
    resolveTerritory(originLng, originLat),
    resolveTerritory(destLng, destLat),
  ]);

  const resolvedOriginId = originNeighborhoodId || originRes.neighborhood?.id || null;
  const resolvedDestId = destNeighborhoodId || destRes.neighborhood?.id || null;

  // Calculate
  const distance_km = round2(haversineKm(originLat, originLng, destLat, destLng));
  const raw = profile.base_fare + (distance_km * profile.per_km);
  // V1: per_minute não usado (sem duração estimada)
  const quoted_price = round2(Math.max(raw, profile.minimum_fare));

  const route_territory = classifyRoute(resolvedOriginId, resolvedDestId);
  const fee_percent = feeForTerritory(profile, route_territory);
  const fee_amount = round2(quoted_price * fee_percent / 100);
  const driver_earnings = round2(quoted_price - fee_amount);

  const now = new Date();

  // Insert settlement + update rides_v2 cache (single transaction)
  await pool.query('BEGIN');
  try {
    await pool.query(
      `INSERT INTO ride_settlements (
        ride_id, pricing_profile_id, pricing_profile_slug,
        origin_neighborhood_id, origin_neighborhood,
        dest_neighborhood_id, dest_neighborhood,
        route_territory, distance_km,
        base_fare_used, per_km_used, per_minute_used, minimum_fare_used,
        quoted_price, locked_price,
        fee_percent, fee_amount, driver_earnings,
        quoted_at, locked_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
      [
        rideId, profile.id, profile.slug,
        resolvedOriginId, originRes.neighborhood?.name || null,
        resolvedDestId, destRes.neighborhood?.name || null,
        route_territory, distance_km,
        profile.base_fare, profile.per_km, profile.per_minute, profile.minimum_fare,
        quoted_price, quoted_price, // V1: locked = quoted (confirmação implícita)
        fee_percent, fee_amount, driver_earnings,
        now, now, // V1: locked_at = quoted_at (confirmação implícita)
      ]
    );

    await pool.query(
      `UPDATE rides_v2 SET
        pricing_profile_id = $2, quoted_price = $3, locked_price = $4,
        platform_fee = $5, driver_earnings = $6, territory_match = $7
       WHERE id = $1`,
      [rideId, profile.id, quoted_price, quoted_price, fee_amount, driver_earnings, route_territory]
    );

    await pool.query('COMMIT');
  } catch (err) {
    await pool.query('ROLLBACK');
    throw err;
  }

  console.log(`[PRICING_QUOTE] ride=${rideId} profile=${profile.slug} dist=${distance_km}km price=${quoted_price} territory=${route_territory} fee=${fee_percent}%`);

  return { quoted_price, route_territory, fee_percent, fee_amount, driver_earnings, distance_km, pricing_profile_slug: profile.slug };
}

/**
 * refine() — Refina fee/earnings quando motorista aceita. Idempotente.
 * Preço do passageiro (locked_price) NÃO muda.
 */
export async function refine(rideId: string, driverNeighborhoodId: string | null,
  driverNeighborhoodName: string | null
): Promise<void> {
  const row = await pool.query(
    'SELECT * FROM ride_settlements WHERE ride_id = $1', [rideId]
  );
  if (!row.rows[0]) {
    console.error(`[PRICING_REFINE] No settlement for ride=${rideId}`);
    return;
  }

  const s = row.rows[0];

  // Idempotência: já refinado
  if (s.refined_at) return;

  // Resolve profile for fee lookup
  const profile = await pool.query('SELECT * FROM pricing_profiles WHERE id = $1', [s.pricing_profile_id]);
  if (!profile.rows[0]) return;
  const p = toProfile(profile.rows[0]);

  const driver_territory = classifyWithDriver(
    driverNeighborhoodId, s.origin_neighborhood_id, s.dest_neighborhood_id
  );
  const fee_percent = feeForTerritory(p, driver_territory);
  const locked = Number(s.locked_price);
  const fee_amount = round2(locked * fee_percent / 100);
  const driver_earnings = round2(locked - fee_amount);

  await pool.query('BEGIN');
  try {
    await pool.query(
      `UPDATE ride_settlements SET
        driver_neighborhood_id = $2, driver_neighborhood = $3,
        driver_territory = $4, fee_percent = $5, fee_amount = $6,
        driver_earnings = $7, refined_at = $8
       WHERE ride_id = $1 AND refined_at IS NULL`,
      [rideId, driverNeighborhoodId, driverNeighborhoodName,
       driver_territory, fee_percent, fee_amount, driver_earnings, new Date()]
    );

    await pool.query(
      `UPDATE rides_v2 SET platform_fee = $2, driver_earnings = $3, territory_match = $4
       WHERE id = $1`,
      [rideId, fee_amount, driver_earnings, driver_territory]
    );

    await pool.query('COMMIT');
  } catch (err) {
    await pool.query('ROLLBACK');
    throw err;
  }

  console.log(`[PRICING_REFINE] ride=${rideId} driver_territory=${driver_territory} fee=${fee_percent}% earnings=${driver_earnings}`);
}

/**
 * settle() — Fecha economia no complete. Idempotente.
 * Retorna dados para consumo de crédito e notificações.
 */
export async function settle(rideId: string): Promise<SettlementResult | null> {
  const row = await pool.query(
    'SELECT * FROM ride_settlements WHERE ride_id = $1', [rideId]
  );
  if (!row.rows[0]) {
    console.error(`[PRICING_SETTLE] No settlement for ride=${rideId}`);
    return null;
  }

  const s = row.rows[0];

  // Idempotência: já settled
  if (s.settled_at) {
    return {
      final_price: Number(s.final_price),
      fee_percent: Number(s.fee_percent),
      fee_amount: Number(s.fee_amount),
      driver_earnings: Number(s.driver_earnings),
      credit_cost: Number(s.credit_cost),
      credit_match_type: s.credit_match_type,
      settlement_territory: s.settlement_territory,
    };
  }

  const profile = await pool.query('SELECT * FROM pricing_profiles WHERE id = $1', [s.pricing_profile_id]);
  if (!profile.rows[0]) return null;
  const p = toProfile(profile.rows[0]);

  // settlement_territory = driver_territory se refinado, senão route_territory
  const settlement_territory: TerritoryType = s.driver_territory || s.route_territory;
  const final_price = Number(s.locked_price); // V1: final = locked
  const fee_percent = Number(s.fee_percent);
  const fee_amount = Number(s.fee_amount);
  const driver_earnings = Number(s.driver_earnings);
  const { cost: credit_cost, matchType: credit_match_type } = creditForTerritory(p, settlement_territory);

  await pool.query('BEGIN');
  try {
    await pool.query(
      `UPDATE ride_settlements SET
        final_price = $2, settlement_territory = $3,
        credit_cost = $4, credit_match_type = $5, settled_at = $6
       WHERE ride_id = $1 AND settled_at IS NULL`,
      [rideId, final_price, settlement_territory, credit_cost, credit_match_type, new Date()]
    );

    await pool.query(
      `UPDATE rides_v2 SET final_price = $2 WHERE id = $1`,
      [rideId, final_price]
    );

    await pool.query('COMMIT');
  } catch (err) {
    await pool.query('ROLLBACK');
    throw err;
  }

  console.log(`[PRICING_SETTLE] ride=${rideId} final=${final_price} territory=${settlement_territory} credit=${credit_cost}(${credit_match_type})`);

  return { final_price, fee_percent, fee_amount, driver_earnings, credit_cost, credit_match_type, settlement_territory };
}
