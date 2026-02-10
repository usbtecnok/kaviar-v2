import { PrismaClient } from '@prisma/client';
import { resolveTerritory } from './territory-resolver.service';

const prisma = new PrismaClient();

interface MatchResult {
  matchType: 'LOCAL' | 'BAIRRO' | 'EXTERNO';
  platformPercent: number;
  platformFeeBrl: number;
  neighborhoodId?: string;
  neighborhoodName?: string;
  distance: number;
}

interface MatchConfig {
  match_local_percent: number;
  match_bairro_percent: number;
  match_externo_percent: number;
}

// Calcular distância entre dois pontos (Haversine)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Raio da Terra em km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Buscar configuração de match
async function getMatchConfig(): Promise<MatchConfig> {
  const config = await prisma.$queryRaw<MatchConfig[]>`
    SELECT match_local_percent, match_bairro_percent, match_externo_percent 
    FROM match_config WHERE id = 'default' LIMIT 1
  `;
  return config[0] || {
    match_local_percent: 7.00,
    match_bairro_percent: 12.00,
    match_externo_percent: 20.00
  };
}

// Lógica principal de match territorial
export async function calculateTerritorialMatch(
  driverId: string,
  pickupLat: number,
  pickupLng: number,
  tripValueBrl: number
): Promise<MatchResult> {
  const config = await getMatchConfig();

  // Buscar base do motorista
  const driver: any = await prisma.drivers.findUnique({
    where: { id: driverId }
  });

  if (!driver || !driver.base_lat || !driver.base_lng) {
    // Motorista sem base cadastrada = match externo
    return {
      matchType: 'EXTERNO',
      platformPercent: config.match_externo_percent,
      platformFeeBrl: (tripValueBrl * config.match_externo_percent) / 100,
      distance: 0
    };
  }

  const distance = calculateDistance(
    Number(driver.base_lat),
    Number(driver.base_lng),
    pickupLat,
    pickupLng
  );

  // 1. Match LOCAL: Motorista e passageiro na mesma célula (< 2km)
  if (distance <= 2.0 && driver.base_verified) {
    return {
      matchType: 'LOCAL',
      platformPercent: config.match_local_percent,
      platformFeeBrl: (tripValueBrl * config.match_local_percent) / 100,
      distance
    };
  }

  // 2. Match BAIRRO: Verificar se ambos estão no mesmo bairro oficial
  const driverTerritory = await resolveTerritory(
    Number(driver.base_lng),
    Number(driver.base_lat)
  );
  const pickupTerritory = await resolveTerritory(pickupLng, pickupLat);

  if (driverTerritory.neighborhood && pickupTerritory.neighborhood && 
      driverTerritory.neighborhood.id === pickupTerritory.neighborhood.id) {
    return {
      matchType: 'BAIRRO',
      platformPercent: config.match_bairro_percent,
      platformFeeBrl: (tripValueBrl * config.match_bairro_percent) / 100,
      neighborhoodId: driverTerritory.neighborhood.id,
      neighborhoodName: driverTerritory.neighborhood.name,
      distance
    };
  }

  // 3. Match EXTERNO: Nenhum match territorial
  return {
    matchType: 'EXTERNO',
    platformPercent: config.match_externo_percent,
    platformFeeBrl: (tripValueBrl * config.match_externo_percent) / 100,
    distance
  };
}

// Registrar log de match
export async function logMatch(
  tripId: string | null,
  driverId: string,
  passengerId: string,
  matchResult: MatchResult,
  driverBaseLat: number | null,
  driverBaseLng: number | null,
  pickupLat: number,
  pickupLng: number,
  tripValueBrl: number
) {
  await prisma.$executeRaw`
    INSERT INTO match_logs (
      trip_id, driver_id, passenger_id, match_type,
      driver_base_lat, driver_base_lng, pickup_lat, pickup_lng,
      neighborhood_id, platform_percent, platform_fee_brl, trip_value_brl
    ) VALUES (
      ${tripId}, ${driverId}, ${passengerId}, ${matchResult.matchType},
      ${driverBaseLat}, ${driverBaseLng}, ${pickupLat}, ${pickupLng},
      ${matchResult.neighborhoodId || null}, ${matchResult.platformPercent}, 
      ${matchResult.platformFeeBrl}, ${tripValueBrl}
    )
  `;
}

// Atualizar configuração de match
export async function updateMatchConfig(
  matchLocalPercent: number,
  matchBairroPercent: number,
  matchExternoPercent: number,
  updatedBy: string
) {
  await prisma.$executeRaw`
    UPDATE match_config 
    SET match_local_percent = ${matchLocalPercent},
        match_bairro_percent = ${matchBairroPercent},
        match_externo_percent = ${matchExternoPercent},
        updated_at = CURRENT_TIMESTAMP,
        updated_by = ${updatedBy}
    WHERE id = 'default'
  `;
}

// Obter estatísticas de match
export async function getMatchStats(startDate?: Date, endDate?: Date) {
  const whereClause = startDate && endDate 
    ? `WHERE created_at BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}'`
    : '';

  const stats = await prisma.$queryRaw<Array<{
    match_type: string;
    count: bigint;
    total_platform_fee: number;
    avg_platform_percent: number;
  }>>`
    SELECT 
      match_type,
      COUNT(*) as count,
      SUM(platform_fee_brl) as total_platform_fee,
      AVG(platform_percent) as avg_platform_percent
    FROM match_logs
    ${whereClause ? prisma.$queryRawUnsafe(whereClause) : prisma.$queryRawUnsafe('')}
    GROUP BY match_type
    ORDER BY count DESC
  `;

  return stats.map(s => ({
    matchType: s.match_type,
    count: Number(s.count),
    totalPlatformFee: Number(s.total_platform_fee),
    avgPlatformPercent: Number(s.avg_platform_percent)
  }));
}
