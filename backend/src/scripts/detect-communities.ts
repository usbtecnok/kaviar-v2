/**
 * KAVIAR — Detecção automática de comunidades
 *
 * Analisa corridas concluídas dos últimos 30 dias.
 * Prioriza destinos (área residencial) sobre origens.
 * Agrupa por bairro primeiro, depois por proximidade (500m).
 * Cria comunidades quando thresholds são atingidos.
 *
 * Uso: npx ts-node src/scripts/detect-communities.ts
 */

import { prisma } from '../lib/prisma';
import { randomUUID } from 'crypto';

const CLUSTER_RADIUS_M = 500;
const MIN_RIDES = 10;
const MIN_DRIVERS = 3;
const MIN_PASSENGERS = 3;
const MIN_DAYS = 5;
const LOOKBACK_DAYS = 30;
const MIN_RIDES_FOR_MEMBERSHIP = 2;
const MERGE_DISTANCE_M = 500;

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface RidePoint {
  ride_id: string;
  driver_id: string;
  passenger_id: string;
  lat: number;
  lng: number;
  neighborhood_id: string | null;
  neighborhood_name: string | null;
  completed_day: string;
}

interface Cluster {
  points: RidePoint[];
  centerLat: number;
  centerLng: number;
  radiusM: number;
  neighborhoodId: string;
  neighborhoodName: string;
  uniqueDrivers: Set<string>;
  uniquePassengers: Set<string>;
  uniqueDays: Set<string>;
}

async function main() {
  console.log('\n========== KAVIAR — DETECÇÃO DE COMUNIDADES ==========\n');

  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  // 1. Buscar pontos residenciais: destinos de corridas concluídas + origens como complemento
  //    Destinos pesam mais porque representam a área residencial (retorno para casa)
  const points = await prisma.$queryRaw<RidePoint[]>`
    SELECT DISTINCT ON (sub.ride_id, sub.point_type)
      sub.ride_id, sub.driver_id, sub.passenger_id,
      sub.lat, sub.lng,
      sub.neighborhood_id, sub.neighborhood_name,
      sub.completed_day
    FROM (
      -- Destinos (peso principal: área residencial)
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

      -- Origens (complemento)
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

  // 2. Agrupar por bairro primeiro (respeitar fronteiras)
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

  // 3. Dentro de cada bairro, clusterizar por proximidade
  const clusters: Cluster[] = [];

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

      const drivers = new Set(clusterPoints.map(p => p.driver_id));
      const passengers = new Set(clusterPoints.map(p => p.passenger_id));
      const days = new Set(clusterPoints.map(p => p.completed_day));

      clusters.push({
        points: clusterPoints,
        centerLat: cLat,
        centerLng: cLng,
        radiusM: Math.min(800, Math.max(
          ...clusterPoints.map(p => haversineM(cLat, cLng, p.lat, p.lng)), 100
        )),
        neighborhoodId: nbId,
        neighborhoodName: nbName,
        uniqueDrivers: drivers,
        uniquePassengers: passengers,
        uniqueDays: days,
      });
    }
  }

  console.log(`[CLUSTERS] ${clusters.length} clusters detectados`);

  // 4. Filtrar por thresholds
  const valid = clusters.filter(c =>
    c.points.length >= MIN_RIDES &&
    c.uniqueDrivers.size >= MIN_DRIVERS &&
    c.uniquePassengers.size >= MIN_PASSENGERS &&
    c.uniqueDays.size >= MIN_DAYS
  );

  console.log(`[VALID] ${valid.length} passam nos thresholds`);

  for (const c of clusters) {
    const pass = c.points.length >= MIN_RIDES && c.uniqueDrivers.size >= MIN_DRIVERS &&
      c.uniquePassengers.size >= MIN_PASSENGERS && c.uniqueDays.size >= MIN_DAYS;
    console.log(`  ${c.neighborhoodName}: rides=${c.points.length} drivers=${c.uniqueDrivers.size} passengers=${c.uniquePassengers.size} days=${c.uniqueDays.size} → ${pass ? '✅' : '❌'}`);
  }

  if (valid.length === 0) {
    console.log('\n[DONE] Nenhum cluster qualificado');
    await prisma.$disconnect();
    return;
  }

  // 5. Verificar comunidades existentes (anti-duplicidade)
  const existing = await prisma.communities.findMany({
    where: { center_lat: { not: null }, center_lng: { not: null } },
    select: { id: true, name: true, center_lat: true, center_lng: true },
  });

  let created = 0;

  for (const cluster of valid) {
    const nearby = existing.find(c =>
      haversineM(cluster.centerLat, cluster.centerLng, Number(c.center_lat), Number(c.center_lng)) < MERGE_DISTANCE_M
    );

    if (nearby) {
      console.log(`\n[SKIP] ${cluster.neighborhoodName} — comunidade "${nearby.name}" já existe a <${MERGE_DISTANCE_M}m`);
      continue;
    }

    // 6. Criar comunidade
    const areaNum = existing.filter(c => c.name.includes(cluster.neighborhoodName)).length + 1;
    const name = `${cluster.neighborhoodName} - Área ${areaNum}`;
    const communityId = randomUUID();

    await prisma.communities.create({
      data: {
        id: communityId,
        name,
        description: `[auto] ${cluster.points.length} corridas, ${cluster.uniqueDrivers.size} motoristas, ${cluster.uniquePassengers.size} passageiros, ${cluster.uniqueDays.size} dias. Detectada em ${new Date().toISOString().slice(0, 10)}.`,
        is_active: true,
        auto_activation: true,
        center_lat: cluster.centerLat,
        center_lng: cluster.centerLng,
        radius_meters: Math.round(cluster.radiusM),
        min_active_drivers: MIN_DRIVERS,
        last_evaluated_at: new Date(),
        updated_at: new Date(),
      },
    });

    console.log(`\n[CREATED] "${name}"`);
    console.log(`  center=(${cluster.centerLat.toFixed(6)}, ${cluster.centerLng.toFixed(6)}) radius=${Math.round(cluster.radiusM)}m`);
    console.log(`  rides=${cluster.points.length} drivers=${cluster.uniqueDrivers.size} passengers=${cluster.uniquePassengers.size} days=${cluster.uniqueDays.size}`);
    console.log(`  source=auto_detected neighborhood=${cluster.neighborhoodName}`);

    // 7. Associar motoristas
    const driverCounts = new Map<string, number>();
    for (const p of cluster.points) driverCounts.set(p.driver_id, (driverCounts.get(p.driver_id) || 0) + 1);
    const qualDrivers = [...driverCounts.entries()].filter(([, n]) => n >= MIN_RIDES_FOR_MEMBERSHIP).map(([id]) => id);

    if (qualDrivers.length > 0) {
      const r = await prisma.drivers.updateMany({
        where: { id: { in: qualDrivers }, community_id: null },
        data: { community_id: communityId },
      });
      console.log(`  [DRIVERS] ${r.count} associados (${qualDrivers.length} qualificados)`);
      for (const [id, n] of driverCounts) {
        if (n >= MIN_RIDES_FOR_MEMBERSHIP) console.log(`    ${id.slice(0, 20)}... → ${n} corridas`);
      }
    }

    // 8. Associar passageiros
    const paxCounts = new Map<string, number>();
    for (const p of cluster.points) paxCounts.set(p.passenger_id, (paxCounts.get(p.passenger_id) || 0) + 1);
    const qualPax = [...paxCounts.entries()].filter(([, n]) => n >= MIN_RIDES_FOR_MEMBERSHIP).map(([id]) => id);

    if (qualPax.length > 0) {
      const r = await prisma.passengers.updateMany({
        where: { id: { in: qualPax }, community_id: null },
        data: { community_id: communityId },
      });
      console.log(`  [PASSENGERS] ${r.count} associados (${qualPax.length} qualificados)`);
    }

    // 9. Histórico
    await prisma.community_status_history.create({
      data: {
        id: randomUUID(),
        community_id: communityId,
        status: 'auto_created',
        to_is_active: true,
        driver_count: qualDrivers.length,
        changed_by: 'system:detect-communities',
        reason: `Cluster histórico: ${cluster.points.length} corridas (dest+origin), ${cluster.uniqueDrivers.size} motoristas, ${cluster.uniquePassengers.size} passageiros, ${cluster.uniqueDays.size} dias em ${LOOKBACK_DAYS}d. Bairro: ${cluster.neighborhoodName}.`,
      },
    });

    existing.push({ id: communityId, name, center_lat: cluster.centerLat as any, center_lng: cluster.centerLng as any });
    created++;
  }

  console.log(`\n========== RESULTADO: ${created} comunidades criadas ==========\n`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
