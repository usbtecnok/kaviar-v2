import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Sistema de Cálculo de Taxa Kaviar
 * Baseado em matching territorial com geometrias oficiais
 * 
 * Taxas:
 * - 7%: Mesmo bairro (motorista e passageiro)
 * - 12%: Bairros adjacentes ou um dos pontos no bairro do motorista
 * - 12%: Fallback 800m (território virtual quando não há geofence oficial)
 * - 20%: Fora da cerca virtual
 */

// Configuração de taxas
const FEE_CONFIG = {
  SAME_NEIGHBORHOOD: 7,
  ADJACENT_NEIGHBORHOOD: 12,
  FALLBACK_800M: 12,
  OUTSIDE_FENCE: 20,
  FALLBACK_RADIUS_METERS: 800
};

export interface FeeCalculation {
  feePercentage: number;
  feeAmount: number;
  driverEarnings: number;
  matchType: 'SAME_NEIGHBORHOOD' | 'ADJACENT_NEIGHBORHOOD' | 'FALLBACK_800M' | 'OUTSIDE_FENCE';
  reason: string;
  pickupNeighborhood?: { id: string; name: string };
  dropoffNeighborhood?: { id: string; name: string };
  driverHomeNeighborhood?: { id: string; name: string };
}

/**
 * Busca o bairro de um ponto geográfico usando PostGIS
 */
async function getNeighborhoodFromPoint(
  lat: number,
  lng: number,
  city: string = 'São Paulo'
): Promise<{ id: string; name: string } | null> {
  try {
    const result = await prisma.$queryRaw<Array<{ id: string; name: string }>>`
      SELECT n.id, n.name
      FROM neighborhoods n
      JOIN neighborhood_geofences ng ON ng.neighborhood_id = n.id
      WHERE n.city = ${city}
        AND ST_Contains(ng.geom, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326))
      LIMIT 1
    `;
    
    return result[0] || null;
  } catch (error) {
    console.error('Erro ao buscar bairro:', error);
    return null;
  }
}

/**
 * Busca o bairro base do motorista
 */
async function getDriverHomeNeighborhood(
  driverId: string
): Promise<{ id: string; name: string } | null> {
  try {
    const driver: any = await prisma.drivers.findUnique({
      where: { id: driverId },
      select: { neighborhood_id: true }
    });

    if (!driver?.neighborhood_id) {
      return null;
    }

    const neighborhood: any = await prisma.neighborhoods.findUnique({
      where: { id: driver.neighborhood_id },
      select: { id: true, name: true }
    });

    return neighborhood;
  } catch (error) {
    console.error('Erro ao buscar bairro do motorista:', error);
    return null;
  }
}

/**
 * Calcula distância entre dois pontos em metros (Haversine)
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3; // Raio da Terra em metros
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Busca o centro geográfico do bairro base do motorista
 * Prioridade: 1) Centroide da geofence, 2) Centro virtual do driver
 */
async function getNeighborhoodCenter(
  neighborhoodId: string,
  driverId: string
): Promise<{ lat: number; lng: number } | null> {
  try {
    // Prioridade 1: Centroide da geofence oficial
    const geofenceCenter = await prisma.$queryRaw<Array<{ lat: number; lng: number }>>`
      SELECT 
        ST_Y(ST_Centroid(ng.geom)) as lat,
        ST_X(ST_Centroid(ng.geom)) as lng
      FROM neighborhood_geofences ng
      WHERE ng.neighborhood_id = ${neighborhoodId}
      LIMIT 1
    `;
    
    if (geofenceCenter[0]) {
      return geofenceCenter[0];
    }
    
    // Prioridade 2: Centro virtual do driver (para áreas sem geofence oficial)
    // DESABILITADO TEMPORARIAMENTE: aguardando migration
    // const driver: any = await prisma.drivers.findUnique({
    //   where: { id: driverId },
    //   select: { 
    //     virtual_fence_center_lat: true,
    //     virtual_fence_center_lng: true
    //   }
    // });
    
    // if (driver?.virtual_fence_center_lat && driver?.virtual_fence_center_lng) {
    //   return {
    //     lat: driver.virtual_fence_center_lat,
    //     lng: driver.virtual_fence_center_lng
    //   };
    // }
    
    return null;
  } catch (error) {
    console.error('Erro ao buscar centro do bairro:', error);
    return null;
  }
}

/**
 * Calcula a taxa da corrida baseada no matching territorial
 * 
 * @param driverId - ID do motorista
 * @param pickupLat - Latitude do ponto de partida
 * @param pickupLng - Longitude do ponto de partida
 * @param dropoffLat - Latitude do destino
 * @param dropoffLng - Longitude do destino
 * @param fareAmount - Valor da corrida em reais
 * @param city - Cidade (padrão: São Paulo)
 * @returns Cálculo completo da taxa
 */
export async function calculateTripFee(
  driverId: string,
  pickupLat: number,
  pickupLng: number,
  dropoffLat: number,
  dropoffLng: number,
  fareAmount: number,
  city: string = 'São Paulo'
): Promise<FeeCalculation> {
  
  // 1. Buscar bairro base do motorista
  const driverHomeNeighborhood = await getDriverHomeNeighborhood(driverId);
  
  // 2. Buscar bairro do pickup
  const pickupNeighborhood = await getNeighborhoodFromPoint(pickupLat, pickupLng, city);
  
  // 3. Buscar bairro do dropoff
  const dropoffNeighborhood = await getNeighborhoodFromPoint(dropoffLat, dropoffLng, city);
  
  // 4. Aplicar lógica de taxa
  
  // CASO 1: Motorista sem bairro cadastrado = taxa máxima
  if (!driverHomeNeighborhood) {
    const feePercentage = FEE_CONFIG.OUTSIDE_FENCE;
    const feeAmount = (fareAmount * feePercentage) / 100;
    
    return {
      feePercentage,
      feeAmount,
      driverEarnings: fareAmount - feeAmount,
      matchType: 'OUTSIDE_FENCE',
      reason: 'Motorista sem bairro base cadastrado',
      pickupNeighborhood: pickupNeighborhood || undefined,
      dropoffNeighborhood: dropoffNeighborhood || undefined
    };
  }
  
  // CASO 2: Pickup e dropoff no mesmo bairro do motorista = taxa mínima (7%)
  if (
    pickupNeighborhood?.id === driverHomeNeighborhood.id &&
    dropoffNeighborhood?.id === driverHomeNeighborhood.id
  ) {
    const feePercentage = FEE_CONFIG.SAME_NEIGHBORHOOD;
    const feeAmount = (fareAmount * feePercentage) / 100;
    
    return {
      feePercentage,
      feeAmount,
      driverEarnings: fareAmount - feeAmount,
      matchType: 'SAME_NEIGHBORHOOD',
      reason: `Corrida completa em ${driverHomeNeighborhood.name}`,
      pickupNeighborhood,
      dropoffNeighborhood,
      driverHomeNeighborhood
    };
  }
  
  // CASO 3: Pickup OU dropoff no bairro do motorista = taxa média (12%)
  if (
    pickupNeighborhood?.id === driverHomeNeighborhood.id ||
    dropoffNeighborhood?.id === driverHomeNeighborhood.id
  ) {
    const feePercentage = FEE_CONFIG.ADJACENT_NEIGHBORHOOD;
    const feeAmount = (fareAmount * feePercentage) / 100;
    
    const inHomeNeighborhood = pickupNeighborhood?.id === driverHomeNeighborhood.id 
      ? 'pickup' 
      : 'dropoff';
    
    return {
      feePercentage,
      feeAmount,
      driverEarnings: fareAmount - feeAmount,
      matchType: 'ADJACENT_NEIGHBORHOOD',
      reason: `${inHomeNeighborhood === 'pickup' ? 'Partida' : 'Destino'} em ${driverHomeNeighborhood.name}`,
      pickupNeighborhood: pickupNeighborhood || undefined,
      dropoffNeighborhood: dropoffNeighborhood || undefined,
      driverHomeNeighborhood
    };
  }
  
  // CASO 4: Fallback 800m - território virtual quando não há geofence oficial
  // Se não encontrou geofence oficial, verifica se está dentro do raio de 800m do centro do bairro
  if (!pickupNeighborhood && !dropoffNeighborhood) {
    const neighborhoodCenter = await getNeighborhoodCenter(driverHomeNeighborhood.id, driverId);
    
    if (neighborhoodCenter) {
      const pickupDistance = calculateDistance(
        pickupLat,
        pickupLng,
        neighborhoodCenter.lat,
        neighborhoodCenter.lng
      );
      
      const dropoffDistance = calculateDistance(
        dropoffLat,
        dropoffLng,
        neighborhoodCenter.lat,
        neighborhoodCenter.lng
      );
      
      // Se ambos os pontos estão dentro do raio de 800m, aplica taxa de fallback
      if (
        pickupDistance <= FEE_CONFIG.FALLBACK_RADIUS_METERS &&
        dropoffDistance <= FEE_CONFIG.FALLBACK_RADIUS_METERS
      ) {
        const feePercentage = FEE_CONFIG.FALLBACK_800M;
        const feeAmount = (fareAmount * feePercentage) / 100;
        
        return {
          feePercentage,
          feeAmount,
          driverEarnings: fareAmount - feeAmount,
          matchType: 'FALLBACK_800M',
          reason: `Corrida dentro do raio de 800m de ${driverHomeNeighborhood.name}`,
          driverHomeNeighborhood
        };
      }
    }
  }
  
  // CASO 5: Fora da cerca virtual = taxa máxima (20%)
  const feePercentage = FEE_CONFIG.OUTSIDE_FENCE;
  const feeAmount = (fareAmount * feePercentage) / 100;
  
  return {
    feePercentage,
    feeAmount,
    driverEarnings: fareAmount - feeAmount,
    matchType: 'OUTSIDE_FENCE',
    reason: 'Corrida fora da cerca virtual',
    pickupNeighborhood: pickupNeighborhood || undefined,
    dropoffNeighborhood: dropoffNeighborhood || undefined,
    driverHomeNeighborhood
  };
}

/**
 * Calcula apenas a taxa (sem detalhes) - útil para estimativas rápidas
 */
export async function calculateFeePercentage(
  driverId: string,
  pickupLat: number,
  pickupLng: number,
  dropoffLat: number,
  dropoffLng: number,
  city: string = 'São Paulo'
): Promise<{ feePercentage: number; matchType: string }> {
  const result = await calculateTripFee(
    driverId,
    pickupLat,
    pickupLng,
    dropoffLat,
    dropoffLng,
    100, // Valor dummy para cálculo de percentual
    city
  );
  
  return {
    feePercentage: result.feePercentage,
    matchType: result.matchType
  };
}

/**
 * Registra o cálculo de taxa no log para analytics
 */
export async function logFeeCalculation(
  tripId: string,
  driverId: string,
  calculation: FeeCalculation
): Promise<void> {
  try {
    await prisma.$executeRaw`
      INSERT INTO match_logs (
        trip_id,
        driver_id,
        match_type,
        platform_percent,
        platform_fee_brl,
        pickup_neighborhood_id,
        dropoff_neighborhood_id,
        driver_home_neighborhood_id,
        created_at
      ) VALUES (
        ${tripId},
        ${driverId},
        ${calculation.matchType},
        ${calculation.feePercentage},
        ${calculation.feeAmount},
        ${calculation.pickupNeighborhood?.id || null},
        ${calculation.dropoffNeighborhood?.id || null},
        ${calculation.driverHomeNeighborhood?.id || null},
        NOW()
      )
    `;
  } catch (error) {
    console.error('Erro ao registrar log de taxa:', error);
  }
}

/**
 * Obtém estatísticas de taxas do motorista
 */
export async function getDriverFeeStats(
  driverId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalTrips: number;
  averageFee: number;
  totalEarnings: number;
  totalFees: number;
  matchTypeBreakdown: Array<{
    matchType: string;
    count: number;
    percentage: number;
  }>;
}> {
  const dateFilter = startDate && endDate
    ? `AND ml.created_at BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}'`
    : '';

  const stats: any = await prisma.$queryRaw`
    SELECT 
      COUNT(*) as total_trips,
      AVG(platform_percent) as average_fee,
      SUM(trip_value_brl - platform_fee_brl) as total_earnings,
      SUM(platform_fee_brl) as total_fees
    FROM match_logs ml
    WHERE ml.driver_id = ${driverId}
    ${dateFilter ? prisma.$queryRawUnsafe(dateFilter) : prisma.$queryRawUnsafe('')}
  `;

  const breakdown: any = await prisma.$queryRaw`
    SELECT 
      match_type,
      COUNT(*) as count
    FROM match_logs
    WHERE driver_id = ${driverId}
    ${dateFilter ? prisma.$queryRawUnsafe(dateFilter) : prisma.$queryRawUnsafe('')}
    GROUP BY match_type
  `;

  const totalTrips = Number(stats[0]?.total_trips || 0);

  return {
    totalTrips,
    averageFee: Number(stats[0]?.average_fee || 0),
    totalEarnings: Number(stats[0]?.total_earnings || 0),
    totalFees: Number(stats[0]?.total_fees || 0),
    matchTypeBreakdown: breakdown.map((b: any) => ({
      matchType: b.match_type,
      count: Number(b.count),
      percentage: totalTrips > 0 ? (Number(b.count) / totalTrips) * 100 : 0
    }))
  };
}
