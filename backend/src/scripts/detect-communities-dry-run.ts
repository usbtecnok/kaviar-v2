/**
 * KAVIAR — Detecção de comunidades (DRY-RUN / READ-ONLY)
 *
 * Mesma lógica de clustering do detect-communities.ts,
 * mas SEM nenhuma mutação no banco.
 *
 * Saída:
 *   - Resumo no terminal
 *   - JSON em reports/detect-communities-dry-run-YYYY-MM-DD.json
 *
 * Uso: npx ts-node src/scripts/detect-communities-dry-run.ts
 *
 * ⚠️  ZERO writes: nenhum prisma.create / update / upsert / delete / createMany / updateMany / deleteMany / $executeRaw
 */

import { prisma } from '../lib/prisma';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

// ── Parâmetros (idênticos ao detect-communities.ts) ──
const CLUSTER_RADIUS_M = 500;
const MIN_RIDES = 10;
const MIN_DRIVERS = 3;
const MIN_PASSENGERS = 3;
const MIN_DAYS = 5;
const LOOKBACK_DAYS = 30;
const MIN_RIDES_FOR_MEMBERSHIP = 2;
const MERGE_DISTANCE_M = 500;

// ── Concentração (thresholds para risco HIGH) ──
const HIGH_DRIVER_SHARE = 0.60;
const HIGH_PASSENGER_SHARE = 0.60;
const HIGH_PAIR_SHARE = 0.50;

// ── Bounding box operacional: município do Rio de Janeiro ──
const RIO_BOUNDS = { minLat: -23.08, maxLat: -22.74, minLng: -43.80, maxLng: -43.10 };
function isInsideRio(lat: number, lng: number): boolean {
  return lat >= RIO_BOUNDS.minLat && lat <= RIO_BOUNDS.maxLat &&
         lng >= RIO_BOUNDS.minLng && lng <= RIO_BOUNDS.maxLng;
}

// ── Haversine (metros) ──
function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Tipos ──
interface RidePoint {
  ride_id: string;
  driver_id: string;
  passenger_id: string;
  lat: number;
  lng: number;
  neighborhood_id: string | null;
  neighborhood_name: string | null;
  completed_day: string;
  point_type: string;
}

interface ClusterReport {
  cluster_id: string;
  center_lat: number;
  center_lng: number;
  radius_m: number;
  total_rides: number;
  unique_drivers: number;
  unique_passengers: number;
  unique_days: number;
  neighborhood_id: string | null;
  neighborhood_name: string | null;
  existing_community_nearby: { id: string; name: string; distance_m: number } | null;
  dominant_point_type: 'dest' | 'origin' | 'mixed';
  passes_thresholds: boolean;
  recommendation: 'CRIAR' | 'REVISAR' | 'IGNORAR';
  recommendation_reason: string;
  top_driver_share: number;
  top_passenger_share: number;
  top_pair_share: number;
  concentration_risk: 'HIGH' | 'LOW';
  outside_rio: boolean;
  top_drivers: { id: string; rides: number }[];
  top_passengers: { id: string; rides: number }[];
}

async function main() {
  console.log('\n========== KAVIAR — DETECÇÃO DE COMUNIDADES (DRY-RUN) ==========');
  console.log('⚠️  Modo READ-ONLY — nenhuma alteração será feita no banco\n');

  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  // ── 1. Buscar pontos (SELECT only) ──
  const points = await prisma.$queryRaw<RidePoint[]>`
    SELECT DISTINCT ON (sub.ride_id, sub.point_type)
      sub.ride_id, sub.driver_id, sub.passenger_id,
      sub.lat, sub.lng,
      sub.neighborhood_id, sub.neighborhood_name,
      sub.completed_day, sub.point_type
    FROM (
      SELECT r.id as ride_id, r.driver_id, r.passenger_id,
             r.dest_lat::float as lat, r.dest_lng::float as lng,
             r.dest_neighborhood_id as neighborhood_id,
             n.name as neighborhood_name,
             r.completed_at::date::text as completed_day,
             'dest' as point_type
      FROM rides_v2 r
      LEFT JOIN neighborhoods n ON n.id = r.dest_neighborhood_id
      WHERE r.status = 'completed' AND r.completed_at >= ${since}
        AND r.dest_lat IS NOT NULL AND r.driver_id IS NOT NULL

      UNION ALL

      SELECT r.id as ride_id, r.driver_id, r.passenger_id,
             r.origin_lat::float as lat, r.origin_lng::float as lng,
             r.origin_neighborhood_id as neighborhood_id,
             n.name as neighborhood_name,
             r.completed_at::date::text as completed_day,
             'origin' as point_type
      FROM rides_v2 r
      LEFT JOIN neighborhoods n ON n.id = r.origin_neighborhood_id
      WHERE r.status = 'completed' AND r.completed_at >= ${since}
        AND r.origin_lat IS NOT NULL AND r.driver_id IS NOT NULL
    ) sub
  `;

  console.log(`[DATA] ${points.length} pontos de ${LOOKBACK_DAYS} dias (destinos + origens)`);

  if (points.length === 0) {
    console.log('[DONE] Sem dados para analisar');
    await prisma.$disconnect();
    return;
  }

  // ── 2. Agrupar por bairro ──
  const byNeighborhood = new Map<string, RidePoint[]>();
  const unresolved: RidePoint[] = [];

  for (const p of points) {
    if (p.neighborhood_id) {
      const key = p.neighborhood_id;
      if (!byNeighborhood.has(key)) byNeighborhood.set(key, []);
      byNeighborhood.get(key)!.push(p);
    } else {
      unresolved.push(p);
    }
  }

  console.log(`[GROUP] ${byNeighborhood.size} bairros com atividade, ${unresolved.length} pontos sem bairro`);

  // ── 3. Clustering greedy por centróide (idêntico ao original) ──
  interface InternalCluster {
    points: RidePoint[];
    centerLat: number;
    centerLng: number;
    radiusM: number;
    neighborhoodId: string | null;
    neighborhoodName: string | null;
    uniqueDrivers: Set<string>;
    uniquePassengers: Set<string>;
    uniqueDays: Set<string>;
  }

  const clusters: InternalCluster[] = [];

  for (const [nbId, nbPoints] of byNeighborhood) {
    const nbName = nbPoints[0].neighborhood_name || nbId;
    const assigned = new Set<number>();

    for (let i = 0; i < nbPoints.length; i++) {
      if (assigned.has(i)) continue;

      const clusterPoints: RidePoint[] = [nbPoints[i]];
      assigned.add(i);
      let cLat = nbPoints[i].lat;
      let cLng = nbPoints[i].lng;

      for (let j = i + 1; j < nbPoints.length; j++) {
        if (assigned.has(j)) continue;
        if (haversineM(cLat, cLng, nbPoints[j].lat, nbPoints[j].lng) <= CLUSTER_RADIUS_M) {
          clusterPoints.push(nbPoints[j]);
          assigned.add(j);
          const n = clusterPoints.length;
          cLat = clusterPoints.reduce((s, p) => s + p.lat, 0) / n;
          cLng = clusterPoints.reduce((s, p) => s + p.lng, 0) / n;
        }
      }

      clusters.push({
        points: clusterPoints,
        centerLat: cLat,
        centerLng: cLng,
        radiusM: Math.min(800, Math.max(
          ...clusterPoints.map(p => haversineM(cLat, cLng, p.lat, p.lng)), 100
        )),
        neighborhoodId: nbId,
        neighborhoodName: nbName,
        uniqueDrivers: new Set(clusterPoints.map(p => p.driver_id)),
        uniquePassengers: new Set(clusterPoints.map(p => p.passenger_id)),
        uniqueDays: new Set(clusterPoints.map(p => p.completed_day)),
      });
    }
  }

  // Cluster pontos sem bairro também
  if (unresolved.length > 0) {
    const assigned = new Set<number>();
    for (let i = 0; i < unresolved.length; i++) {
      if (assigned.has(i)) continue;
      const clusterPoints: RidePoint[] = [unresolved[i]];
      assigned.add(i);
      let cLat = unresolved[i].lat;
      let cLng = unresolved[i].lng;

      for (let j = i + 1; j < unresolved.length; j++) {
        if (assigned.has(j)) continue;
        if (haversineM(cLat, cLng, unresolved[j].lat, unresolved[j].lng) <= CLUSTER_RADIUS_M) {
          clusterPoints.push(unresolved[j]);
          assigned.add(j);
          const n = clusterPoints.length;
          cLat = clusterPoints.reduce((s, p) => s + p.lat, 0) / n;
          cLng = clusterPoints.reduce((s, p) => s + p.lng, 0) / n;
        }
      }

      clusters.push({
        points: clusterPoints,
        centerLat: cLat,
        centerLng: cLng,
        radiusM: Math.min(800, Math.max(
          ...clusterPoints.map(p => haversineM(cLat, cLng, p.lat, p.lng)), 100
        )),
        neighborhoodId: null,
        neighborhoodName: null,
        uniqueDrivers: new Set(clusterPoints.map(p => p.driver_id)),
        uniquePassengers: new Set(clusterPoints.map(p => p.passenger_id)),
        uniqueDays: new Set(clusterPoints.map(p => p.completed_day)),
      });
    }
  }

  console.log(`[CLUSTERS] ${clusters.length} clusters detectados`);

  // ── 4. Buscar comunidades existentes (SELECT only) ──
  const existing = await prisma.communities.findMany({
    where: { center_lat: { not: null }, center_lng: { not: null } },
    select: { id: true, name: true, center_lat: true, center_lng: true, is_active: true },
  });

  // ── 5. Gerar relatório ──
  const report: ClusterReport[] = [];
  let idx = 0;

  for (const c of clusters) {
    idx++;
    const passes = c.points.length >= MIN_RIDES &&
      c.uniqueDrivers.size >= MIN_DRIVERS &&
      c.uniquePassengers.size >= MIN_PASSENGERS &&
      c.uniqueDays.size >= MIN_DAYS;

    // Comunidade existente mais próxima
    let nearestExisting: ClusterReport['existing_community_nearby'] = null;
    for (const ex of existing) {
      const d = haversineM(c.centerLat, c.centerLng, Number(ex.center_lat), Number(ex.center_lng));
      if (!nearestExisting || d < nearestExisting.distance_m) {
        nearestExisting = { id: ex.id, name: ex.name, distance_m: Math.round(d) };
      }
    }
    const withinMerge = nearestExisting && nearestExisting.distance_m < MERGE_DISTANCE_M;

    // Tipo predominante (dest vs origin)
    const destCount = c.points.filter(p => p.point_type === 'dest').length;
    const originCount = c.points.length - destCount;
    const dominant: ClusterReport['dominant_point_type'] =
      destCount > originCount * 1.5 ? 'dest' :
      originCount > destCount * 1.5 ? 'origin' : 'mixed';

    // Concentração driver/passenger
    const driverCounts = new Map<string, number>();
    const paxCounts = new Map<string, number>();
    const pairCounts = new Map<string, number>();
    for (const p of c.points) {
      driverCounts.set(p.driver_id, (driverCounts.get(p.driver_id) || 0) + 1);
      paxCounts.set(p.passenger_id, (paxCounts.get(p.passenger_id) || 0) + 1);
      const pair = `${p.driver_id}::${p.passenger_id}`;
      pairCounts.set(pair, (pairCounts.get(pair) || 0) + 1);
    }

    const total = c.points.length;
    const topDriverShare = Math.max(...driverCounts.values()) / total;
    const topPassengerShare = Math.max(...paxCounts.values()) / total;
    const topPairShare = Math.max(...pairCounts.values()) / total;
    const concentrationHigh = topDriverShare > HIGH_DRIVER_SHARE ||
      topPassengerShare > HIGH_PASSENGER_SHARE ||
      topPairShare > HIGH_PAIR_SHARE;

    // Coordenadas fora do Rio
    const outsideRio = !isInsideRio(c.centerLat, c.centerLng);

    // Recomendação
    let recommendation: ClusterReport['recommendation'];
    let reason: string;
    if (!passes) {
      recommendation = 'IGNORAR';
      const missing: string[] = [];
      if (c.points.length < MIN_RIDES) missing.push(`rides=${c.points.length}<${MIN_RIDES}`);
      if (c.uniqueDrivers.size < MIN_DRIVERS) missing.push(`drivers=${c.uniqueDrivers.size}<${MIN_DRIVERS}`);
      if (c.uniquePassengers.size < MIN_PASSENGERS) missing.push(`passengers=${c.uniquePassengers.size}<${MIN_PASSENGERS}`);
      if (c.uniqueDays.size < MIN_DAYS) missing.push(`days=${c.uniqueDays.size}<${MIN_DAYS}`);
      reason = `Abaixo dos thresholds: ${missing.join(', ')}`;
    } else if (outsideRio) {
      recommendation = 'REVISAR';
      reason = `⚠️ Coordenadas fora da área operacional do Rio (${c.centerLat.toFixed(3)}, ${c.centerLng.toFixed(3)})`;
    } else if (withinMerge) {
      recommendation = 'REVISAR';
      reason = `Comunidade "${nearestExisting!.name}" já existe a ${nearestExisting!.distance_m}m (<${MERGE_DISTANCE_M}m)`;
    } else if (!c.neighborhoodId) {
      recommendation = 'REVISAR';
      reason = 'Sem bairro oficial — verificar se coordenadas são válidas e não são dados de teste';
    } else if (concentrationHigh) {
      recommendation = 'REVISAR';
      const flags: string[] = [];
      if (topDriverShare > HIGH_DRIVER_SHARE) flags.push(`top_driver=${(topDriverShare * 100).toFixed(0)}%`);
      if (topPassengerShare > HIGH_PASSENGER_SHARE) flags.push(`top_pax=${(topPassengerShare * 100).toFixed(0)}%`);
      if (topPairShare > HIGH_PAIR_SHARE) flags.push(`top_pair=${(topPairShare * 100).toFixed(0)}%`);
      reason = `Concentração alta: ${flags.join(', ')} — verificar se é demanda real ou poucos usuários`;
    } else {
      recommendation = 'CRIAR';
      reason = `Cluster qualificado em ${c.neighborhoodName}`;
    }

    report.push({
      cluster_id: `DRY-${String(idx).padStart(3, '0')}`,
      center_lat: Number(c.centerLat.toFixed(6)),
      center_lng: Number(c.centerLng.toFixed(6)),
      radius_m: Math.round(c.radiusM),
      total_rides: c.points.length,
      unique_drivers: c.uniqueDrivers.size,
      unique_passengers: c.uniquePassengers.size,
      unique_days: c.uniqueDays.size,
      neighborhood_id: c.neighborhoodId,
      neighborhood_name: c.neighborhoodName,
      existing_community_nearby: withinMerge ? nearestExisting : null,
      dominant_point_type: dominant,
      passes_thresholds: passes,
      recommendation,
      recommendation_reason: reason,
      top_driver_share: Number(topDriverShare.toFixed(2)),
      top_passenger_share: Number(topPassengerShare.toFixed(2)),
      top_pair_share: Number(topPairShare.toFixed(2)),
      concentration_risk: concentrationHigh ? 'HIGH' : 'LOW',
      outside_rio: outsideRio,
      top_drivers: [...driverCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id, rides]) => ({ id, rides })),
      top_passengers: [...paxCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id, rides]) => ({ id, rides })),
    });
  }

  // ── 6. Resumo no terminal ──
  const criar = report.filter(r => r.recommendation === 'CRIAR');
  const revisar = report.filter(r => r.recommendation === 'REVISAR');
  const ignorar = report.filter(r => r.recommendation === 'IGNORAR');

  console.log(`\n── RESUMO ──`);
  console.log(`  Total clusters:  ${report.length}`);
  console.log(`  ✅ CRIAR:        ${criar.length}`);
  console.log(`  ⚠️  REVISAR:      ${revisar.length}`);
  console.log(`  ❌ IGNORAR:      ${ignorar.length}`);
  console.log(`  Comunidades existentes no banco: ${existing.length}`);

  for (const r of report.filter(r => r.passes_thresholds)) {
    console.log(`\n  [${r.cluster_id}] ${r.neighborhood_name || 'SEM BAIRRO'} → ${r.recommendation}`);
    console.log(`    centro=(${r.center_lat}, ${r.center_lng}) raio=${r.radius_m}m`);
    console.log(`    rides=${r.total_rides} drivers=${r.unique_drivers} passengers=${r.unique_passengers} days=${r.unique_days}`);
    console.log(`    predominante=${r.dominant_point_type}`);
    console.log(`    concentração: driver=${(r.top_driver_share * 100).toFixed(0)}% pax=${(r.top_passenger_share * 100).toFixed(0)}% par=${(r.top_pair_share * 100).toFixed(0)}% → ${r.concentration_risk}`);
    console.log(`    ${r.recommendation_reason}`);
    if (r.existing_community_nearby) {
      console.log(`    ⚠️  Comunidade próxima: "${r.existing_community_nearby.name}" (${r.existing_community_nearby.distance_m}m)`);
    }
    if (r.outside_rio) {
      console.log(`    🚨 FORA DO RIO — possível dado de teste`);
    }
  }

  // Alertas de coordenadas fora do Rio
  const outsideRioClusters = report.filter(r => r.outside_rio);
  if (outsideRioClusters.length > 0) {
    console.log(`\n  🚨 ALERTA: ${outsideRioClusters.length} cluster(s) fora da área operacional do Rio de Janeiro:`);
    for (const r of outsideRioClusters) {
      console.log(`    [${r.cluster_id}] (${r.center_lat}, ${r.center_lng}) rides=${r.total_rides}`);
    }
  }

  if (unresolved.length > 0) {
    console.log(`\n  ⚠️  ALERTA: ${unresolved.length} pontos sem bairro oficial — possíveis dados de teste ou áreas sem geofence`);
  }

  // ── 7. Salvar JSON ──
  const date = new Date().toISOString().slice(0, 10);
  const reportsDir = resolve(__dirname, '../../reports');
  mkdirSync(reportsDir, { recursive: true });
  const filePath = resolve(reportsDir, `detect-communities-dry-run-${date}.json`);

  const output = {
    generated_at: new Date().toISOString(),
    mode: 'DRY-RUN (READ-ONLY)',
    parameters: { CLUSTER_RADIUS_M, MIN_RIDES, MIN_DRIVERS, MIN_PASSENGERS, MIN_DAYS, LOOKBACK_DAYS, MERGE_DISTANCE_M, HIGH_DRIVER_SHARE, HIGH_PASSENGER_SHARE, HIGH_PAIR_SHARE, RIO_BOUNDS },
    data_points: points.length,
    neighborhoods_with_activity: byNeighborhood.size,
    points_without_neighborhood: unresolved.length,
    existing_communities: existing.length,
    summary: { total: report.length, criar: criar.length, revisar: revisar.length, ignorar: ignorar.length },
    clusters: report,
  };

  writeFileSync(filePath, JSON.stringify(output, null, 2));
  console.log(`\n[SAVED] ${filePath}`);
  console.log('\n========== DRY-RUN COMPLETO — NENHUMA ALTERAÇÃO NO BANCO ==========\n');

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
