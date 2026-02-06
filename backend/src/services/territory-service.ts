import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Raio da Terra em metros
const EARTH_RADIUS_M = 6371000;

// Distância máxima para validação (20km)
const MAX_VALIDATION_DISTANCE_M = 20000;

// Raio do fallback 800m
const FALLBACK_RADIUS_M = 800;

/**
 * Calcula distância entre dois pontos usando fórmula de Haversine
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}

/**
 * Detecta território a partir de coordenadas GPS
 */
export async function detectTerritoryFromGPS(lat: number, lng: number) {
  // 1. Tentar encontrar bairro com geofence oficial via PostGIS
  const officialNeighborhood = await prisma.$queryRaw<
    Array<{ id: string; name: string; distance: number }>
  >`
    SELECT 
      n.id,
      n.name,
      ST_Distance(
        ng.geom::geography,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
      ) as distance
    FROM neighborhoods n
    INNER JOIN neighborhood_geofences ng ON ng.neighborhood_id = n.id
    WHERE n.is_active = true
      AND ST_Contains(
        ng.geom,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)
      )
    ORDER BY distance ASC
    LIMIT 1
  `;

  if (officialNeighborhood.length > 0) {
    return {
      type: 'OFFICIAL' as const,
      neighborhood: officialNeighborhood[0],
      hasGeofence: true,
      minFee: 7,
      maxFee: 20,
    };
  }

  // 2. Buscar bairros próximos (sem geofence)
  const nearbyNeighborhoods = await prisma.neighborhoods.findMany({
    where: {
      is_active: true,
      center_lat: { not: null },
      center_lng: { not: null },
    },
    select: {
      id: true,
      name: true,
      center_lat: true,
      center_lng: true,
      neighborhood_geofences: {
        select: { id: true },
      },
    },
  });

  const withDistance = nearbyNeighborhoods
    .map((n) => ({
      ...n,
      distance: calculateDistance(
        lat,
        lng,
        Number(n.center_lat),
        Number(n.center_lng)
      ),
      hasGeofence: !!n.neighborhood_geofences,
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 10);

  return {
    type: null,
    detected: null,
    nearby: withDistance.map((n) => ({
      id: n.id,
      name: n.name,
      distance: Math.round(n.distance),
      hasGeofence: n.hasGeofence,
      minFee: n.hasGeofence ? 7 : 12,
      maxFee: 20,
    })),
  };
}

/**
 * Valida se motorista está próximo do bairro escolhido
 */
export async function validateNeighborhoodDistance(
  neighborhoodId: string,
  driverLat: number,
  driverLng: number
) {
  const neighborhood = await prisma.neighborhoods.findUnique({
    where: { id: neighborhoodId },
    select: {
      id: true,
      name: true,
      center_lat: true,
      center_lng: true,
    },
  });

  if (!neighborhood || !neighborhood.center_lat || !neighborhood.center_lng) {
    return {
      valid: false,
      error: 'Bairro não encontrado ou sem coordenadas',
    };
  }

  const distance = calculateDistance(
    driverLat,
    driverLng,
    Number(neighborhood.center_lat),
    Number(neighborhood.center_lng)
  );

  if (distance > MAX_VALIDATION_DISTANCE_M) {
    return {
      valid: false,
      warning: true,
      distance: Math.round(distance),
      message: `Você está a ${(distance / 1000).toFixed(1)}km de ${neighborhood.name}. Tem certeza que este é seu bairro?`,
    };
  }

  return {
    valid: true,
    distance: Math.round(distance),
    neighborhood,
  };
}

/**
 * Determina tipo de território do bairro
 */
export async function getTerritoryType(neighborhoodId: string) {
  const geofence = await prisma.neighborhood_geofences.findUnique({
    where: { neighborhood_id: neighborhoodId },
  });

  return geofence ? 'OFFICIAL' : 'FALLBACK_800M';
}

/**
 * Lista bairros inteligente com detecção automática
 */
export async function getSmartNeighborhoodList(lat?: number, lng?: number) {
  let detected = null;
  let nearby: any[] = [];

  // Se GPS fornecido, detectar território
  if (lat && lng) {
    const detection = await detectTerritoryFromGPS(lat, lng);
    if (detection.type === 'OFFICIAL' && detection.neighborhood) {
      detected = {
        id: detection.neighborhood.id,
        name: detection.neighborhood.name,
        hasGeofence: true,
        minFee: 7,
        maxFee: 20,
      };
    } else {
      nearby = detection.nearby || [];
    }
  }

  // Lista completa de bairros ativos
  const allNeighborhoods = await prisma.neighborhoods.findMany({
    where: { is_active: true },
    select: {
      id: true,
      name: true,
      city: true,
      zone: true,
      neighborhood_geofences: {
        select: { id: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  const all = allNeighborhoods.map((n) => ({
    id: n.id,
    name: n.name,
    city: n.city,
    zone: n.zone,
    hasGeofence: !!n.neighborhood_geofences,
    minFee: n.neighborhood_geofences ? 7 : 12,
    maxFee: 20,
  }));

  return {
    detected,
    nearby,
    all,
  };
}

/**
 * Calcula se corrida está dentro do território do motorista
 */
export async function isRideInsideTerritory(
  driverId: string,
  pickupLat: number,
  pickupLng: number
): Promise<boolean> {
  const driver = await prisma.drivers.findUnique({
    where: { id: driverId },
    select: {
      territory_type: true,
      neighborhood_id: true,
      // DESABILITADO: aguardando migration
      // virtual_fence_center_lat: true,
      // virtual_fence_center_lng: true,
      neighborhoods: {
        select: {
          center_lat: true,
          center_lng: true,
          neighborhood_geofences: {
            select: { id: true },
          },
        },
      },
    },
  });

  if (!driver || !driver.neighborhood_id) {
    return false;
  }

  // OFFICIAL: verificar via PostGIS
  if (driver.territory_type === 'OFFICIAL' && driver.neighborhoods?.neighborhood_geofences) {
    const result = await prisma.$queryRaw<Array<{ inside: boolean }>>`
      SELECT ST_Contains(
        ng.geom,
        ST_SetSRID(ST_MakePoint(${pickupLng}, ${pickupLat}), 4326)
      ) as inside
      FROM neighborhood_geofences ng
      WHERE ng.neighborhood_id = ${driver.neighborhood_id}
    `;
    return result[0]?.inside || false;
  }

  // FALLBACK_800M: verificar distância do centro
  if (driver.territory_type === 'FALLBACK_800M') {
    // TEMPORÁRIO: usar apenas center do neighborhood até migration
    const centerLat = driver.neighborhoods?.center_lat;
    const centerLng = driver.neighborhoods?.center_lng;

    if (centerLat && centerLng) {
      const distance = calculateDistance(
        pickupLat,
        pickupLng,
        Number(centerLat),
        Number(centerLng)
      );
      return distance <= FALLBACK_RADIUS_M;
    }
  }

  return false;
}
