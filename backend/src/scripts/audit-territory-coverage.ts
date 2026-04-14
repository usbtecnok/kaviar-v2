/**
 * KAVIAR — Auditoria de cobertura territorial real
 * Uso: npx ts-node src/scripts/audit-territory-coverage.ts
 */
import { prisma } from '../lib/prisma';

async function audit() {
  console.log('\n========== AUDITORIA DE COBERTURA TERRITORIAL ==========\n');

  // 1. Motoristas com community_id
  const driversTotal = await prisma.drivers.count({ where: { status: 'active' } });
  const driversWithCommunity = await prisma.drivers.count({ where: { status: 'active', community_id: { not: null } } });
  const driversWithNeighborhood = await prisma.drivers.count({ where: { status: 'active', neighborhood_id: { not: null } } });
  console.log(`[MOTORISTAS ATIVOS] total=${driversTotal} com_community_id=${driversWithCommunity} com_neighborhood_id=${driversWithNeighborhood}`);

  // Detalhe por comunidade
  const driversByCommunity = await prisma.drivers.groupBy({
    by: ['community_id'],
    where: { status: 'active', community_id: { not: null } },
    _count: true,
    orderBy: { _count: { community_id: 'desc' } },
  });
  if (driversByCommunity.length > 0) {
    const communityIds = driversByCommunity.map(d => d.community_id!);
    const communities = await prisma.communities.findMany({ where: { id: { in: communityIds } }, select: { id: true, name: true } });
    const nameMap = Object.fromEntries(communities.map(c => [c.id, c.name]));
    console.log('\n  Motoristas por comunidade:');
    for (const row of driversByCommunity) {
      console.log(`    ${nameMap[row.community_id!] || row.community_id} → ${row._count} motoristas`);
    }
  }

  // 2. Passageiros com community_id
  const passengersTotal = await prisma.passengers.count({ where: { status: 'ACTIVE' } });
  const passengersWithCommunity = await prisma.passengers.count({ where: { status: 'ACTIVE', community_id: { not: null } } });
  const passengersWithNeighborhood = await prisma.passengers.count({ where: { status: 'ACTIVE', neighborhood_id: { not: null } } });
  console.log(`\n[PASSAGEIROS ATIVOS] total=${passengersTotal} com_community_id=${passengersWithCommunity} com_neighborhood_id=${passengersWithNeighborhood}`);

  // Detalhe por comunidade
  const passengersByCommunity = await prisma.passengers.groupBy({
    by: ['community_id'],
    where: { status: 'ACTIVE', community_id: { not: null } },
    _count: true,
    orderBy: { _count: { community_id: 'desc' } },
  });
  if (passengersByCommunity.length > 0) {
    const communityIds = passengersByCommunity.map(p => p.community_id!);
    const communities = await prisma.communities.findMany({ where: { id: { in: communityIds } }, select: { id: true, name: true } });
    const nameMap = Object.fromEntries(communities.map(c => [c.id, c.name]));
    console.log('\n  Passageiros por comunidade:');
    for (const row of passengersByCommunity) {
      console.log(`    ${nameMap[row.community_id!] || row.community_id} → ${row._count} passageiros`);
    }
  }

  // 3. Comunidades com geofence real
  const communitiesTotal = await prisma.communities.count({ where: { is_active: true } });
  const communitiesWithGeofence = await prisma.community_geofences.count();
  // Verificar quais têm geom NOT NULL via raw query
  const withGeom = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) as count FROM community_geofences WHERE geom IS NOT NULL
  `;
  const geomCount = Number(withGeom[0]?.count || 0);
  console.log(`\n[COMUNIDADES ATIVAS] total=${communitiesTotal} com_geofence_registro=${communitiesWithGeofence} com_geom_postgis=${geomCount}`);

  // Detalhe
  const geofenceDetails = await prisma.$queryRaw<Array<{ community_id: string; name: string; has_geom: boolean; source: string }>>`
    SELECT cg.community_id, c.name, (cg.geom IS NOT NULL) as has_geom, cg.source
    FROM community_geofences cg
    JOIN communities c ON c.id = cg.community_id
    WHERE c.is_active = true
  `;
  if (geofenceDetails.length > 0) {
    console.log('\n  Detalhe geofences:');
    for (const row of geofenceDetails) {
      console.log(`    ${row.name} → geom=${row.has_geom} source=${row.source}`);
    }
  }

  // 4. Bairros com geofence
  const neighborhoodsTotal = await prisma.neighborhoods.count({ where: { is_active: true } });
  const neighborhoodsWithGeofence = await prisma.neighborhood_geofences.count();
  const nbWithGeom = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) as count FROM neighborhood_geofences WHERE geom IS NOT NULL
  `;
  const nbGeomCount = Number(nbWithGeom[0]?.count || 0);
  console.log(`\n[BAIRROS ATIVOS] total=${neighborhoodsTotal} com_geofence_registro=${neighborhoodsWithGeofence} com_geom_postgis=${nbGeomCount}`);

  // 5. Potencial de match COMMUNITY
  // Contar pares (passageiro, motorista) que compartilham community_id
  const potentialMatches = await prisma.$queryRaw<[{ pairs: bigint }]>`
    SELECT COUNT(*) as pairs
    FROM passengers p
    JOIN drivers d ON d.community_id = p.community_id
    WHERE p.status = 'ACTIVE' AND d.status = 'active'
      AND p.community_id IS NOT NULL
  `;
  console.log(`\n[POTENCIAL COMMUNITY MATCH] pares_passageiro_motorista_mesma_comunidade=${Number(potentialMatches[0]?.pairs || 0)}`);

  // 6. Potencial de match NEIGHBORHOOD
  const nbMatches = await prisma.$queryRaw<[{ pairs: bigint }]>`
    SELECT COUNT(*) as pairs
    FROM passengers p
    JOIN drivers d ON d.neighborhood_id = p.neighborhood_id
    WHERE p.status = 'ACTIVE' AND d.status = 'active'
      AND p.neighborhood_id IS NOT NULL
  `;
  console.log(`[POTENCIAL NEIGHBORHOOD MATCH] pares_passageiro_motorista_mesmo_bairro=${Number(nbMatches[0]?.pairs || 0)}`);

  console.log('\n========== FIM DA AUDITORIA ==========\n');
  await prisma.$disconnect();
}

audit().catch(e => { console.error(e); process.exit(1); });
